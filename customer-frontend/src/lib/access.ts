/**
 * Mock folio access control.
 *
 * Until a real auth/backend lookup exists, "owning" a reservation means either:
 *  1. you created it in this browser (the reference + PIN are stored locally), or
 *  2. you know BOTH the booking reference and its 4-digit PIN.
 *
 * Knowing only a booking reference is never enough to open a folio. This mirrors
 * the eventual backend rule where access requires an authenticated session or a
 * signed lookup token. Swap this module for real auth during integration.
 */

const ACCESS_KEY = 'stayease.folio-access.v1';

export interface AccessEntry {
  reference: string;
  pin: string;
  grantedAt: string;
}

function read(): AccessEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(ACCESS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AccessEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(entries: AccessEntry[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(ACCESS_KEY, JSON.stringify(entries));
  } catch {
    // ignore
  }
}

export function grantAccess(reference: string, pin: string): void {
  const entries = read().filter((entry) => entry.reference !== reference);
  entries.push({ reference, pin, grantedAt: new Date().toISOString() });
  write(entries);
}

export function getAccess(reference: string): AccessEntry | undefined {
  return read().find((entry) => entry.reference === reference);
}

export function hasAccess(reference: string): boolean {
  return Boolean(getAccess(reference));
}

export function listGrantedReferences(): string[] {
  return read().map((entry) => entry.reference);
}