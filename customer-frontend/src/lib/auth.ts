/**
 * Mock authentication + session.
 *
 * A framework-free module (like `lib/access.ts`) that persists the signed-in
 * guest profile in localStorage and exposes small async "providers" for Google,
 * phone (OTP) and email sign-in. No real credentials are exchanged — this is the
 * seam where a real identity provider (OAuth / SMS gateway) is dropped in.
 *
 * The session's identity (email + phone) is what lets the service layer trace a
 * guest's reservations. Swap this module for real auth during integration.
 */

import type { AuthProvider, UserProfile } from '@/types';

const SESSION_KEY = 'stayflow.session.v1';
const SESSION_EVENT = 'stayflow:session-changed';

/** Demo persona whose seeded reservations populate the account. */
export const DEMO_ACCOUNT = {
  fullName: 'Thant Zin',
  email: 'thant.zin@example.com',
  phoneCountryCode: '+95',
  phone: '9 798 123 456',
} as const;

/** Digits-only normaliser so `+95 9 798…` and `09798123…` compare equal. */
export function phoneDigits(value: string): string {
  return value.replace(/\D/g, '');
}

function newId(prefix: string): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
  }
  return `${prefix}_${Date.now().toString(36)}`;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function read(): UserProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as UserProfile;
    return parsed && typeof parsed.email === 'string' ? parsed : null;
  } catch {
    return null;
  }
}

function write(user: UserProfile | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (user) window.localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    else window.localStorage.removeItem(SESSION_KEY);
  } catch {
    // Storage may be disabled — session still lives in memory for this tab.
  }
  window.dispatchEvent(new Event(SESSION_EVENT));
}

export function getSession(): UserProfile | null {
  return read();
}

export function subscribeSession(listener: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = () => listener();
  window.addEventListener(SESSION_EVENT, handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener(SESSION_EVENT, handler);
    window.removeEventListener('storage', handler);
  };
}

function makeUser(provider: AuthProvider, input: Partial<UserProfile>): UserProfile {
  return {
    id: newId('usr'),
    fullName: input.fullName?.trim() || DEMO_ACCOUNT.fullName,
    email: (input.email?.trim() || DEMO_ACCOUNT.email).toLowerCase(),
    phoneCountryCode: input.phoneCountryCode || DEMO_ACCOUNT.phoneCountryCode,
    phone: input.phone?.trim() || DEMO_ACCOUNT.phone,
    avatarUrl: input.avatarUrl,
    provider,
    createdAt: new Date().toISOString(),
  };
}

/** Simulated "Continue with Google" — returns the demo guest identity. */
export async function signInWithGoogle(): Promise<UserProfile> {
  await delay(650);
  const user = makeUser('google', DEMO_ACCOUNT);
  write(user);
  return user;
}

export async function signInWithEmail(input: {
  email: string;
  fullName?: string;
  phoneCountryCode?: string;
  phone?: string;
}): Promise<UserProfile> {
  await delay(500);
  const user = makeUser('email', input);
  write(user);
  return user;
}

/** Simulated SMS dispatch. Any 6-digit code is accepted on verification. */
export async function requestOtp(phone: string): Promise<{ sentTo: string }> {
  await delay(500);
  return { sentTo: phone };
}

export async function signInWithPhone(input: {
  phoneCountryCode: string;
  phone: string;
  code: string;
}): Promise<UserProfile> {
  await delay(550);
  if (!/^\d{4,6}$/.test(input.code.trim())) {
    throw new Error('Enter the 6-digit code we sent to your phone.');
  }
  const user = makeUser('phone', {
    phoneCountryCode: input.phoneCountryCode,
    phone: input.phone,
    fullName: DEMO_ACCOUNT.fullName,
    email: DEMO_ACCOUNT.email,
  });
  write(user);
  return user;
}

export function updateSession(patch: Partial<UserProfile>): UserProfile | null {
  const current = read();
  if (!current) return null;
  const next: UserProfile = {
    ...current,
    ...patch,
    fullName: patch.fullName?.trim() || current.fullName,
    email: patch.email?.trim().toLowerCase() || current.email,
  };
  write(next);
  return next;
}

export function signOut(): void {
  write(null);
}

/**
 * True when a reservation's guest details belong to `user`. Matches on email or
 * a shared phone suffix so guests are recognised regardless of formatting.
 */
export function matchesProfile(
  guest: { email: string; phone: string },
  user: Pick<UserProfile, 'email' | 'phone'>,
): boolean {
  const emailMatch = guest.email.trim().toLowerCase() === user.email.trim().toLowerCase();
  const guestDigits = phoneDigits(guest.phone);
  const userDigits = phoneDigits(user.phone);
  const phoneMatch =
    guestDigits.length >= 6 &&
    userDigits.length >= 6 &&
    (guestDigits.endsWith(userDigits) || userDigits.endsWith(guestDigits));
  return emailMatch || phoneMatch;
}

/** Loyalty tier derived from completed stay count. */
export function loyaltyTierFor(stays: number): string {
  if (stays >= 5) return 'Azure Prestige';
  if (stays >= 2) return 'Azure Elite';
  if (stays >= 1) return 'Azure Explorer';
  return 'New Member';
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'SF';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}
