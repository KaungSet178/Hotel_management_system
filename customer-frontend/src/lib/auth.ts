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
import { apiClient } from '@/services/apiClient';
import { isSupabaseConfigured, supabase } from './supabase';

const SESSION_KEY = 'stayease.session.v1';
const TOKEN_KEY = 'stayease.auth.token';
const SESSION_EVENT = 'stayease:session-changed';
const LAST_LOGIN_EMAIL_KEY = 'stayease.last_login_email';
const LAST_LOGIN_AT_KEY = 'stayease.last_login_at';
const LAST_LOGIN_NAME_KEY = 'stayease.last_login_name';

const isHttpMode =
  import.meta.env.VITE_SERVICE_MODE === 'http' && import.meta.env.MODE !== 'test';

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
    if (user) {
      window.localStorage.setItem(SESSION_KEY, JSON.stringify(user));
      if (user.email) {
        window.localStorage.setItem(LAST_LOGIN_EMAIL_KEY, user.email);
      }
      if (user.fullName) {
        window.localStorage.setItem(LAST_LOGIN_NAME_KEY, user.fullName);
      }
      window.localStorage.setItem(LAST_LOGIN_AT_KEY, new Date().toISOString());
    } else {
      window.localStorage.removeItem(SESSION_KEY);
      window.localStorage.removeItem(TOKEN_KEY);
      // NOTE: We intentionally keep LAST_LOGIN_EMAIL_KEY and LAST_LOGIN_NAME_KEY
      // so StayEase remembers the user identity for their next sign-in experience.
    }
  } catch {
    // Storage may be disabled — session still lives in memory for this tab.
  }
  window.dispatchEvent(new Event(SESSION_EVENT));
}

/** Get the last remembered login email */
export function getLastLoginEmail(): string {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(LAST_LOGIN_EMAIL_KEY) || '';
}

/** Get timestamp of last login */
export function getLastLoginAt(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(LAST_LOGIN_AT_KEY);
}

/** Get the last remembered full name */
export function getLastLoginName(): string {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(LAST_LOGIN_NAME_KEY) || '';
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

/** "Continue with Google" — triggers Supabase Google OAuth redirect or test fallback. */
export async function signInWithGoogle(): Promise<UserProfile | void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
      },
    });
    if (error) throw error;
    return;
  }
  await delay(650);
  const user = makeUser('google', DEMO_ACCOUNT);
  write(user);
  return user;
}

export function validateEmail(email: string): string | null {
  if (!email || !email.trim()) {
    return 'Please enter an email address.';
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) {
    return 'Please enter a valid email address.';
  }
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) {
    return 'Please enter a password.';
  }
  if (password.length < 8) {
    return 'Password must be at least 8 characters long.';
  }
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return 'Password must contain both letters and at least one number.';
  }
  return null;
}

/** Restores/syncs user profile when returning from Google OAuth redirect or refresh */
export async function syncOAuthSession(): Promise<UserProfile | null> {
  const current = read();
  if (!isSupabaseConfigured || !supabase) return current;

  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session?.user) {
      // If Supabase hasn't hydrated yet but localStorage has valid session, keep the stored session
      return current;
    }

    const sUser = session.user;
    const isVerified = Boolean(sUser.confirmed_at || sUser.email_confirmed_at);
    const userProfile: UserProfile = {
      id: sUser.id,
      fullName:
        sUser.user_metadata?.full_name ||
        sUser.user_metadata?.name ||
        current?.fullName ||
        sUser.email?.split('@')[0] ||
        'Guest',
      email: (sUser.email || current?.email || '').toLowerCase(),
      phoneCountryCode: current?.phoneCountryCode || '+95',
      phone: sUser.user_metadata?.phone || sUser.phone || current?.phone || '',
      avatarUrl: sUser.user_metadata?.avatar_url || sUser.user_metadata?.picture || current?.avatarUrl,
      provider: (sUser.app_metadata?.provider as AuthProvider) || current?.provider || 'email',
      createdAt: sUser.created_at || current?.createdAt || new Date().toISOString(),
      isEmailVerified: isVerified,
    };

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(TOKEN_KEY, session.access_token);
      // Clean OAuth hash/params from URL without reloading
      if (window.location.hash.includes('access_token=') || window.location.search.includes('code=')) {
        const cleanUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
      }
    }

    write(userProfile);
    return userProfile;
  } catch (err) {
    console.warn('OAuth session sync failed:', err);
    return read();
  }
}

export function initSupabaseAuthListener(onUserChanged: (user: UserProfile | null) => void): () => void {
  if (!isSupabaseConfigured || !supabase) return () => {};

  const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
    if (
      (event === 'SIGNED_IN' ||
        event === 'TOKEN_REFRESHED' ||
        event === 'USER_UPDATED' ||
        event === 'INITIAL_SESSION') &&
      session?.user
    ) {
      const sUser = session.user;
      const isVerified = Boolean(sUser.confirmed_at || sUser.email_confirmed_at);
      const current = read();
      const userProfile: UserProfile = {
        id: sUser.id,
        fullName:
          sUser.user_metadata?.full_name ||
          sUser.user_metadata?.name ||
          current?.fullName ||
          sUser.email?.split('@')[0] ||
          'Guest',
        email: (sUser.email || current?.email || '').toLowerCase(),
        phoneCountryCode: current?.phoneCountryCode || '+95',
        phone: sUser.user_metadata?.phone || sUser.phone || current?.phone || '',
        avatarUrl: sUser.user_metadata?.avatar_url || sUser.user_metadata?.picture || current?.avatarUrl,
        provider: (sUser.app_metadata?.provider as AuthProvider) || current?.provider || 'email',
        createdAt: sUser.created_at || current?.createdAt || new Date().toISOString(),
        isEmailVerified: isVerified,
      };
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(TOKEN_KEY, session.access_token);
      }
      write(userProfile);
      onUserChanged(userProfile);
    } else if (event === 'SIGNED_OUT') {
      const current = read();
      if (current && (current.provider === 'google' || current.provider === 'email')) {
        write(null);
        onUserChanged(null);
      }
    }
  });

  return () => {
    subscription.unsubscribe();
  };
}

/** Register a new user with email and password via Supabase Auth */
export async function signUpWithEmail(input: {
  email: string;
  password: string;
  fullName?: string;
  phone?: string;
  phoneCountryCode?: string;
}): Promise<{ user: UserProfile; needsEmailVerification: boolean }> {
  const emailErr = validateEmail(input.email);
  if (emailErr) throw new Error(emailErr);

  const pwdErr = validatePassword(input.password);
  if (pwdErr) throw new Error(pwdErr);

  const cleanName = input.fullName?.trim() || input.email.split('@')[0] || 'Guest';

  if (isSupabaseConfigured && supabase) {
    const cleanEmail = input.email.trim().toLowerCase();
    const cleanPhone = input.phone ? `${input.phoneCountryCode || '+95'} ${input.phone.trim()}` : '';

    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password: input.password,
      options: {
        data: {
          full_name: cleanName,
          phone: cleanPhone,
        },
        emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/verify-email` : undefined,
      },
    });

    if (error) {
      if (error.message.includes('already registered')) {
        throw new Error('An account with this email already exists. Please sign in instead.');
      }
      throw new Error(error.message);
    }

    const isVerified = Boolean(data.user?.confirmed_at || data.user?.email_confirmed_at);
    const user: UserProfile = {
      id: data.user?.id || newId('usr'),
      fullName: cleanName,
      email: cleanEmail,
      phoneCountryCode: input.phoneCountryCode || '+95',
      phone: input.phone?.trim() || '',
      provider: 'email',
      createdAt: data.user?.created_at || new Date().toISOString(),
      isEmailVerified: isVerified,
    };

    if (data.session && typeof window !== 'undefined') {
      window.localStorage.setItem(TOKEN_KEY, data.session.access_token);
      write(user);
    } else if (data.user) {
      write(user);
    }

    return { user, needsEmailVerification: !isVerified };
  }

  // Fallback for isolated unit tests
  await delay(500);
  const user = makeUser('email', input);
  user.isEmailVerified = true;
  write(user);
  return { user, needsEmailVerification: false };
}

/** Authenticate using email and password via Supabase Auth */
export async function signInWithPassword(input: {
  email: string;
  password: string;
}): Promise<UserProfile> {
  const emailErr = validateEmail(input.email);
  if (emailErr) throw new Error(emailErr);

  if (!input.password) {
    throw new Error('Please enter your password.');
  }

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: input.email.trim().toLowerCase(),
      password: input.password,
    });

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        throw new Error('Incorrect email address or password. Please try again.');
      }
      if (error.message.includes('Email not confirmed')) {
        const unconfirmedUser: UserProfile = {
          id: newId('usr'),
          fullName: 'Guest',
          email: input.email.trim().toLowerCase(),
          phoneCountryCode: '+95',
          phone: '',
          provider: 'email',
          createdAt: new Date().toISOString(),
          isEmailVerified: false,
        };
        write(unconfirmedUser);
        throw new Error('Please verify your email address before signing in. Check your inbox for the confirmation link.');
      }
      throw new Error(error.message);
    }

    if (!data.user) {
      throw new Error('Sign in failed: no user returned.');
    }

    const sUser = data.user;
    const isVerified = Boolean(sUser.confirmed_at || sUser.email_confirmed_at);
    const user: UserProfile = {
      id: sUser.id,
      fullName:
        sUser.user_metadata?.full_name ||
        sUser.user_metadata?.name ||
        sUser.email?.split('@')[0] ||
        'Guest',
      email: (sUser.email || '').toLowerCase(),
      phoneCountryCode: '+95',
      phone: sUser.user_metadata?.phone || sUser.phone || '',
      avatarUrl: sUser.user_metadata?.avatar_url || sUser.user_metadata?.picture,
      provider: 'email',
      createdAt: sUser.created_at || new Date().toISOString(),
      isEmailVerified: isVerified,
    };

    if (data.session && typeof window !== 'undefined') {
      window.localStorage.setItem(TOKEN_KEY, data.session.access_token);
    }
    write(user);
    return user;
  }

  // Fallback for tests
  await delay(500);
  const user = makeUser('email', input);
  user.isEmailVerified = true;
  write(user);
  return user;
}

/** Resend verification email to user */
export async function resendVerificationEmail(email: string): Promise<void> {
  const emailErr = validateEmail(email);
  if (emailErr) throw new Error(emailErr);

  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/verify-email` : undefined,
      },
    });
    if (error) {
      if (error.message.includes('rate limit') || error.status === 429) {
        throw new Error('For security, please wait a minute before requesting another confirmation email.');
      }
      throw new Error(error.message);
    }
    return;
  }
  await delay(500);
}

/** Request password reset email */
export async function resetPasswordForEmail(email: string): Promise<void> {
  const emailErr = validateEmail(email);
  if (emailErr) throw new Error(emailErr);

  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/reset-password` : undefined,
    });
    if (error) {
      if (error.message.includes('rate limit') || error.status === 429) {
        throw new Error('Please wait a moment before requesting another reset link.');
      }
      throw new Error(error.message);
    }
    return;
  }
  await delay(500);
}

/** Update user's password using the active session (after following reset link) */
export async function updatePassword(newPassword: string): Promise<void> {
  const pwdErr = validatePassword(newPassword);
  if (pwdErr) throw new Error(pwdErr);

  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    if (error) throw new Error(error.message);
    return;
  }
  await delay(500);
}

/** Check and refresh latest user verification status from Supabase */
export async function refreshUser(): Promise<UserProfile | null> {
  if (!isSupabaseConfigured || !supabase) return read();

  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return read();

    const current = read();
    const isVerified = Boolean(user.confirmed_at || user.email_confirmed_at);
    const updated: UserProfile = {
      id: user.id,
      fullName:
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        current?.fullName ||
        user.email?.split('@')[0] ||
        'Guest',
      email: (user.email || current?.email || '').toLowerCase(),
      phoneCountryCode: current?.phoneCountryCode || '+95',
      phone: user.user_metadata?.phone || user.phone || current?.phone || '',
      avatarUrl: user.user_metadata?.avatar_url || current?.avatarUrl,
      provider: (user.app_metadata?.provider as AuthProvider) || current?.provider || 'email',
      createdAt: user.created_at || current?.createdAt || new Date().toISOString(),
      isEmailVerified: isVerified,
    };

    write(updated);
    return updated;
  } catch (err) {
    console.warn('Failed to refresh user:', err);
    return read();
  }
}

export async function signInWithEmail(input: {
  email: string;
  fullName?: string;
  phoneCountryCode?: string;
  phone?: string;
}): Promise<UserProfile> {
  if (isHttpMode) {
    const res = await apiClient.request<{ token: string; user: UserProfile }>('/auth/email', {
      method: 'POST',
      body: input,
    });
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(TOKEN_KEY, res.token);
    }
    write(res.user);
    return res.user;
  }
  await delay(500);
  const user = makeUser('email', input);
  write(user);
  return user;
}

/** SMS OTP dispatch. In dev mode accepts '123456'. */
export async function requestOtp(phone: string): Promise<{ sentTo: string }> {
  if (isHttpMode) {
    const res = await apiClient.request<{ sentTo: string }>('/auth/phone/request', {
      method: 'POST',
      body: { phone },
    });
    return { sentTo: res.sentTo };
  }
  await delay(500);
  return { sentTo: phone };
}

export async function signInWithPhone(input: {
  phoneCountryCode: string;
  phone: string;
  code: string;
}): Promise<UserProfile> {
  if (isHttpMode) {
    if (!/^\d{4,6}$/.test(input.code.trim())) {
      throw new Error('Enter the 6-digit code we sent to your phone.');
    }
    const res = await apiClient.request<{ token: string; user: UserProfile }>('/auth/phone/verify', {
      method: 'POST',
      body: input,
    });
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(TOKEN_KEY, res.token);
    }
    write(res.user);
    return res.user;
  }
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
  if (isHttpMode) {
    apiClient
      .request<{ user: UserProfile }>('/auth/me', {
        method: 'PATCH',
        body: {
          fullName: next.fullName,
          phone: next.phone,
        },
      })
      .catch((err) => {
        console.warn('Failed to sync profile update to backend:', err);
      });
  }
  return next;
}

export function signOut(): void {
  if (isSupabaseConfigured && supabase) {
    void supabase.auth.signOut().catch(() => {});
  }
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignore storage errors (private mode / quota) */
    }
  }
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
