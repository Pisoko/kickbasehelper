import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Kombiniert CSS-Klassen mit clsx und bereinigt sie mit tailwind-merge
 * um Konflikte zu vermeiden
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}