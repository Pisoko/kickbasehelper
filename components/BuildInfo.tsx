'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Button } from './ui/button';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/utils';

interface BuildInfo {
  buildNumber: number;
  version: string;
  timestamp: string;
  commitHash: string;
  commitMessage: string;
  branch: string;
}

interface ChangelogEntry {
  buildNumber: number;
  commitHash: string;
  commitMessage: string;
  timestamp: string;
  author: string;
}

const buildInfoVariants = cva(
  "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:pointer-events-none",
  {
    variants: {
      variant: {
        default: "bg-slate-800 text-slate-200 hover:bg-slate-700",
        outline: "border border-slate-600 bg-transparent hover:bg-slate-800 text-slate-300",
        ghost: "bg-transparent hover:bg-slate-800 text-slate-400"
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-9 px-4 text-sm",
        lg: "h-10 px-6 text-base"
      }
    },
    defaultVariants: {
      variant: "ghost",
      size: "sm"
    }
  }
);

interface BuildInfoProps extends VariantProps<typeof buildInfoVariants> {
  showFullInfo?: boolean;
  className?: string;
}

export default function BuildInfo({ 
  variant, 
  size, 
  showFullInfo = false, 
  className 
}: BuildInfoProps) {
  const [buildInfo, setBuildInfo] = useState<BuildInfo | null>(null);
  const [changelog, setChangelog] = useState<ChangelogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBuildInfo();
  }, []);

  const fetchBuildInfo = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Build-Info abrufen
      const buildResponse = await fetch('/api/build-info?action=info');
      const buildData = await buildResponse.json();

      if (buildData.success) {
        setBuildInfo(buildData.data);
      } else {
        throw new Error(buildData.error || 'Fehler beim Laden der Build-Info');
      }

      // Changelog abrufen
      const changelogResponse = await fetch('/api/build-info?action=changelog&limit=20');
      const changelogData = await changelogResponse.json();

      if (changelogData.success) {
        setChangelog(changelogData.data);
      }
    } catch (err) {
      console.error('Fehler beim Laden der Build-Informationen:', err);
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString('de-DE', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const formatCommitHash = (hash: string) => {
    return hash.substring(0, 7);
  };

  const getTimeSince = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMinutes = Math.floor(diffMs / (1000 * 60));

      if (diffDays > 0) return `vor ${diffDays} Tag${diffDays > 1 ? 'en' : ''}`;
      if (diffHours > 0) return `vor ${diffHours} Stunde${diffHours > 1 ? 'n' : ''}`;
      if (diffMinutes > 0) return `vor ${diffMinutes} Minute${diffMinutes > 1 ? 'n' : ''}`;
      return 'gerade eben';
    } catch {
      return '';
    }
  };

  if (isLoading) {
    return (
      <div className={cn(buildInfoVariants({ variant, size }), className)}>
        <span className="animate-pulse">Build lädt...</span>
      </div>
    );
  }

  if (error || !buildInfo) {
    return (
      <div className={cn(buildInfoVariants({ variant, size }), "text-red-400", className)}>
        <span>Build-Info nicht verfügbar</span>
      </div>
    );
  }

  const BuildInfoButton = () => (
    <div className={cn(buildInfoVariants({ variant, size }), className)}>
      {showFullInfo ? (
        <span>
          {buildInfo.version} (Build #{buildInfo.buildNumber})
        </span>
      ) : (
        <span>Build #{buildInfo.buildNumber}</span>
      )}
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <button className="focus:outline-none">
          <BuildInfoButton />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-100">
            Build-Informationen & Changelog
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 overflow-hidden">
          {/* Build-Informationen */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-200 border-b border-slate-700 pb-2">
              Aktuelle Build-Info
            </h3>
            
            <div className="bg-slate-800 rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Build-Nummer:</span>
                <span className="font-mono text-slate-200">#{buildInfo.buildNumber}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Version:</span>
                <span className="font-mono text-slate-200">{buildInfo.version}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Branch:</span>
                <span className="font-mono text-slate-200">{buildInfo.branch}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Commit:</span>
                <span className="font-mono text-slate-200">
                  {formatCommitHash(buildInfo.commitHash)}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Zeitstempel:</span>
                <span className="text-slate-200 text-sm">
                  {formatDate(buildInfo.timestamp)}
                </span>
              </div>
              
              <div className="pt-2 border-t border-slate-700">
                <span className="text-slate-400 text-sm">Letzter Commit:</span>
                <p className="text-slate-200 text-sm mt-1 break-words">
                  {buildInfo.commitMessage}
                </p>
              </div>
            </div>
          </div>

          {/* Changelog */}
          <div className="space-y-4 overflow-hidden">
            <h3 className="text-lg font-semibold text-slate-200 border-b border-slate-700 pb-2">
              Changelog (Letzte 20 Builds)
            </h3>
            
            <div className="overflow-y-auto max-h-96 space-y-2 pr-2">
              {changelog.length > 0 ? (
                changelog.map((entry) => (
                  <div 
                    key={entry.commitHash} 
                    className="bg-slate-800 rounded-lg p-3 hover:bg-slate-750 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-mono text-sm text-slate-300">
                        Build #{entry.buildNumber}
                      </span>
                      <span className="text-xs text-slate-500">
                        {getTimeSince(entry.timestamp)}
                      </span>
                    </div>
                    
                    <p className="text-slate-200 text-sm mb-2 break-words">
                      {entry.commitMessage}
                    </p>
                    
                    <div className="flex justify-between items-center text-xs text-slate-500">
                      <span>von {entry.author}</span>
                      <span className="font-mono">
                        {formatCommitHash(entry.commitHash)}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-slate-400 py-8">
                  <p>Kein Changelog verfügbar</p>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex justify-end pt-4 border-t border-slate-700">
          <Button 
            variant="outline" 
            onClick={() => setIsOpen(false)}
            className="bg-slate-800 border-slate-600 text-slate-200 hover:bg-slate-700"
          >
            Schließen
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}