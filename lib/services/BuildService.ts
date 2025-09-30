import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

export interface BuildInfo {
  buildNumber: number;
  version: string;
  timestamp: string;
  commitHash: string;
  commitMessage: string;
  branch: string;
}

export interface ChangelogEntry {
  buildNumber: number;
  commitHash: string;
  commitMessage: string;
  timestamp: string;
  author: string;
}

export class BuildService {
  private static readonly BUILD_FILE_PATH = path.join(process.cwd(), 'data', 'build-info.json');
  private static readonly CHANGELOG_FILE_PATH = path.join(process.cwd(), 'data', 'changelog.json');

  /**
   * Holt die aktuelle Build-Information
   */
  static getCurrentBuildInfo(): BuildInfo {
    try {
      if (fs.existsSync(this.BUILD_FILE_PATH)) {
        const buildData = JSON.parse(fs.readFileSync(this.BUILD_FILE_PATH, 'utf-8'));
        return buildData;
      }
    } catch (error) {
      console.warn('Fehler beim Lesen der Build-Info:', error);
    }

    // Fallback: Erstelle initiale Build-Info
    return this.generateInitialBuildInfo();
  }

  /**
   * Generiert eine neue Build-Nummer basierend auf Git-Commits
   */
  static generateNewBuildNumber(): number {
    try {
      // Zähle alle Commits im aktuellen Branch
      const commitCount = execSync('git rev-list --count HEAD', { encoding: 'utf-8' }).trim();
      return parseInt(commitCount, 10);
    } catch (error) {
      console.warn('Fehler beim Zählen der Git-Commits:', error);
      // Fallback: Verwende aktuelle Build-Nummer + 1
      const currentBuild = this.getCurrentBuildInfo();
      return currentBuild.buildNumber + 1;
    }
  }

  /**
   * Aktualisiert die Build-Information
   */
  static updateBuildInfo(): BuildInfo {
    const buildNumber = this.generateNewBuildNumber();
    const timestamp = new Date().toISOString();
    
    let commitHash = 'unknown';
    let commitMessage = 'No commit information available';
    let branch = 'unknown';

    try {
      commitHash = execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
      commitMessage = execSync('git log -1 --pretty=%B', { encoding: 'utf-8' }).trim();
      branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
    } catch (error) {
      console.warn('Fehler beim Abrufen der Git-Informationen:', error);
    }

    const buildInfo: BuildInfo = {
      buildNumber,
      version: `1.0.${buildNumber}`,
      timestamp,
      commitHash,
      commitMessage,
      branch
    };

    // Speichere Build-Info
    this.ensureDataDirectory();
    fs.writeFileSync(this.BUILD_FILE_PATH, JSON.stringify(buildInfo, null, 2));

    // Aktualisiere Changelog
    this.updateChangelog(buildInfo);

    return buildInfo;
  }

  /**
   * Generiert das Changelog aus Git-Commits
   */
  static generateChangelog(limit: number = 50): ChangelogEntry[] {
    try {
      // Hole die letzten N Commits mit Details
      const gitLog = execSync(
        `git log -${limit} --pretty=format:"%H|%s|%ai|%an"`,
        { encoding: 'utf-8' }
      ).trim();

      if (!gitLog) return [];

      const commits = gitLog.split('\n');
      const changelog: ChangelogEntry[] = [];

      commits.forEach((commit, index) => {
        const [hash, message, timestamp, author] = commit.split('|');
        if (hash && message) {
          changelog.push({
            buildNumber: this.generateNewBuildNumber() - index,
            commitHash: hash,
            commitMessage: message,
            timestamp,
            author
          });
        }
      });

      return changelog.reverse(); // Älteste zuerst
    } catch (error) {
      console.warn('Fehler beim Generieren des Changelogs:', error);
      return [];
    }
  }

  /**
   * Aktualisiert das Changelog mit einem neuen Eintrag
   */
  private static updateChangelog(buildInfo: BuildInfo): void {
    try {
      let changelog: ChangelogEntry[] = [];
      
      // Lade existierendes Changelog
      if (fs.existsSync(this.CHANGELOG_FILE_PATH)) {
        changelog = JSON.parse(fs.readFileSync(this.CHANGELOG_FILE_PATH, 'utf-8'));
      }

      // Füge neuen Eintrag hinzu (falls noch nicht vorhanden)
      const existingEntry = changelog.find(entry => entry.commitHash === buildInfo.commitHash);
      if (!existingEntry) {
        const newEntry: ChangelogEntry = {
          buildNumber: buildInfo.buildNumber,
          commitHash: buildInfo.commitHash,
          commitMessage: buildInfo.commitMessage,
          timestamp: buildInfo.timestamp,
          author: this.getCommitAuthor(buildInfo.commitHash)
        };

        changelog.push(newEntry);
        
        // Sortiere nach Build-Nummer (neueste zuerst)
        changelog.sort((a, b) => b.buildNumber - a.buildNumber);
        
        // Begrenze auf die letzten 100 Einträge
        changelog = changelog.slice(0, 100);
      }

      // Speichere aktualisiertes Changelog
      fs.writeFileSync(this.CHANGELOG_FILE_PATH, JSON.stringify(changelog, null, 2));
    } catch (error) {
      console.warn('Fehler beim Aktualisieren des Changelogs:', error);
    }
  }

  /**
   * Holt den Autor eines Commits
   */
  private static getCommitAuthor(commitHash: string): string {
    try {
      return execSync(`git log -1 --pretty=format:"%an" ${commitHash}`, { encoding: 'utf-8' }).trim();
    } catch (error) {
      return 'Unknown';
    }
  }

  /**
   * Lädt das Changelog
   */
  static getChangelog(): ChangelogEntry[] {
    try {
      if (fs.existsSync(this.CHANGELOG_FILE_PATH)) {
        return JSON.parse(fs.readFileSync(this.CHANGELOG_FILE_PATH, 'utf-8'));
      }
    } catch (error) {
      console.warn('Fehler beim Laden des Changelogs:', error);
    }

    // Fallback: Generiere Changelog aus Git
    return this.generateChangelog();
  }

  /**
   * Erstellt initiale Build-Information
   */
  private static generateInitialBuildInfo(): BuildInfo {
    const buildNumber = this.generateNewBuildNumber();
    return {
      buildNumber,
      version: `1.0.${buildNumber}`,
      timestamp: new Date().toISOString(),
      commitHash: 'unknown',
      commitMessage: 'Initial build',
      branch: 'main'
    };
  }

  /**
   * Stellt sicher, dass das data-Verzeichnis existiert
   */
  private static ensureDataDirectory(): void {
    const dataDir = path.dirname(this.BUILD_FILE_PATH);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
  }

  /**
   * Formatiert eine Build-Nummer für die Anzeige
   */
  static formatBuildNumber(buildNumber: number): string {
    return `Build #${buildNumber}`;
  }

  /**
   * Formatiert eine Version für die Anzeige
   */
  static formatVersion(version: string): string {
    return `v${version}`;
  }

  /**
   * Prüft, ob ein neuer Build verfügbar ist (basierend auf Git-Commits)
   */
  static isNewBuildAvailable(): boolean {
    const currentBuild = this.getCurrentBuildInfo();
    const latestBuildNumber = this.generateNewBuildNumber();
    return latestBuildNumber > currentBuild.buildNumber;
  }
}