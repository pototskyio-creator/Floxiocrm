import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Tiny utility used by every component. Combines `clsx` (conditional class
// strings) with `tailwind-merge` (dedupe conflicting Tailwind classes).
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
