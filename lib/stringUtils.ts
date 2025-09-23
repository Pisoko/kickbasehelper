/**
 * String utility functions for name normalization and matching
 */

/**
 * Normalize a string by removing accents and converting to lowercase
 * This helps with matching names that may have different accent representations
 * 
 * @param str - The string to normalize
 * @returns Normalized string without accents and in lowercase
 */
export function normalizeString(str: string): string {
  if (!str) return '';
  
  return str
    .normalize('NFD') // Decompose accented characters
    .replace(/[\u0300-\u036f]/g, '') // Remove accent marks
    .toLowerCase()
    .trim();
}

/**
 * Normalize a player name for consistent matching
 * Handles both "First Last" and "Last, First" formats
 * 
 * @param name - The player name to normalize
 * @param firstName - Optional first name (if available separately)
 * @returns Normalized full name
 */
export function normalizePlayerName(name: string, firstName?: string): string {
  if (!name) return '';
  
  let fullName = '';
  
  if (firstName) {
    // If we have separate first and last names, combine them
    fullName = `${firstName} ${name}`.trim();
  } else {
    // Handle "Last, First" format by converting to "First Last"
    if (name.includes(',')) {
      const parts = name.split(',').map(part => part.trim());
      if (parts.length === 2) {
        fullName = `${parts[1]} ${parts[0]}`.trim();
      } else {
        fullName = name;
      }
    } else {
      fullName = name;
    }
  }
  
  return normalizeString(fullName);
}

/**
 * Check if two player names match after normalization
 * This handles variations in accents, spacing, and name order
 * 
 * @param name1 - First name to compare
 * @param name2 - Second name to compare
 * @param firstName1 - Optional first name for name1
 * @param firstName2 - Optional first name for name2
 * @returns True if names match after normalization
 */
export function playerNamesMatch(
  name1: string, 
  name2: string, 
  firstName1?: string, 
  firstName2?: string
): boolean {
  const normalized1 = normalizePlayerName(name1, firstName1);
  const normalized2 = normalizePlayerName(name2, firstName2);
  
  if (normalized1 === normalized2) {
    return true;
  }
  
  // Also check if one name is contained in the other (for partial matches)
  const words1 = normalized1.split(' ').filter(w => w.length > 1);
  const words2 = normalized2.split(' ').filter(w => w.length > 1);
  
  // Check if all words from the shorter name are in the longer name
  if (words1.length !== words2.length) {
    const [shorter, longer] = words1.length < words2.length ? [words1, words2] : [words2, words1];
    return shorter.every(word => longer.includes(word));
  }
  
  return false;
}

/**
 * Find the best matching player name from a list of candidates
 * 
 * @param targetName - The name to find a match for
 * @param candidates - Array of candidate names to match against
 * @param targetFirstName - Optional first name for target
 * @returns The best matching candidate name or null if no match found
 */
export function findBestPlayerNameMatch(
  targetName: string,
  candidates: Array<{name: string, firstName?: string}>,
  targetFirstName?: string
): {name: string, firstName?: string} | null {
  const normalizedTarget = normalizePlayerName(targetName, targetFirstName);
  
  // First, try exact matches
  for (const candidate of candidates) {
    if (playerNamesMatch(targetName, candidate.name, targetFirstName, candidate.firstName)) {
      return candidate;
    }
  }
  
  // If no exact match, try partial matches
  const targetWords = normalizedTarget.split(' ').filter(w => w.length > 1);
  
  let bestMatch: {name: string, firstName?: string} | null = null;
  let bestScore = 0;
  
  for (const candidate of candidates) {
    const candidateNormalized = normalizePlayerName(candidate.name, candidate.firstName);
    const candidateWords = candidateNormalized.split(' ').filter(w => w.length > 1);
    
    // Calculate match score based on common words
    const commonWords = targetWords.filter(word => candidateWords.includes(word));
    const score = commonWords.length / Math.max(targetWords.length, candidateWords.length);
    
    if (score > bestScore && score > 0.5) { // At least 50% match
      bestScore = score;
      bestMatch = candidate;
    }
  }
  
  return bestMatch;
}

/**
 * Create a search-friendly version of a name for fuzzy matching
 * 
 * @param name - The name to make searchable
 * @param firstName - Optional first name
 * @returns Search-friendly string
 */
export function createSearchableName(name: string, firstName?: string): string {
  const normalized = normalizePlayerName(name, firstName);
  return normalized.replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}