import { beforeEach, describe, expect, it } from 'vitest';
import {
  DEMO_ACCOUNT,
  getSession,
  initialsOf,
  loyaltyTierFor,
  matchesProfile,
  phoneDigits,
  signInWithEmail,
  signInWithGoogle,
  signInWithPassword,
  signUpWithEmail,
  signOut,
  updateSession,
  validateEmail,
  validatePassword,
  getLastLoginEmail,
  getLastLoginAt,
  getLastLoginName,
} from './auth';

describe('auth session', () => {
  beforeEach(() => {
    signOut();
  });

  it('starts signed out', () => {
    expect(getSession()).toBeNull();
  });

  it('signs in with Google as the demo guest and persists', async () => {
    const user = (await signInWithGoogle()) as import('@/types').UserProfile;
    expect(user.provider).toBe('google');
    expect(user.email).toBe(DEMO_ACCOUNT.email);
    expect(getSession()?.id).toBe(user.id);
  });

  it('signs in with email and updates the profile', async () => {
    await signInWithEmail({ email: 'Aye.Chan@Example.com', fullName: 'Aye Chan' });
    const session = getSession();
    expect(session?.email).toBe('aye.chan@example.com');
    expect(session?.fullName).toBe('Aye Chan');

    updateSession({ phone: '9 111 222 333' });
    expect(getSession()?.phone).toBe('9 111 222 333');
  });

  it('clears the session on sign out', async () => {
    await signInWithEmail({ email: 'someone@example.com' });
    signOut();
    expect(getSession()).toBeNull();
  });
});

describe('profile identity matching', () => {
  it('matches on email case-insensitively', () => {
    expect(
      matchesProfile({ email: 'THANT.ZIN@example.com', phone: '' }, { email: 'thant.zin@example.com', phone: '' }),
    ).toBe(true);
  });

  it('matches on a shared phone suffix despite formatting', () => {
    expect(
      matchesProfile({ email: 'x@y.com', phone: '9 798 123 456' }, { email: 'z@y.com', phone: '+95 9798123456' }),
    ).toBe(true);
  });

  it('does not match unrelated guests', () => {
    expect(
      matchesProfile({ email: 'a@b.com', phone: '9111111' }, { email: 'c@d.com', phone: '9222222' }),
    ).toBe(false);
  });

  it('normalises phone digits', () => {
    expect(phoneDigits('+95 (9) 798-123-456')).toBe('959798123456');
  });
});

describe('loyalty + initials helpers', () => {
  it('derives loyalty tiers from completed stays', () => {
    expect(loyaltyTierFor(0)).toBe('New Member');
    expect(loyaltyTierFor(1)).toBe('Azure Explorer');
    expect(loyaltyTierFor(3)).toBe('Azure Elite');
    expect(loyaltyTierFor(6)).toBe('Azure Prestige');
  });

  it('builds initials from a name', () => {
    expect(initialsOf('Thant Zin')).toBe('TZ');
    expect(initialsOf('Cher')).toBe('CH');
    expect(initialsOf('  ')).toBe('SF');
  });
});

describe('email and password validation', () => {
  it('validates email format correctly', () => {
    expect(validateEmail('')).toBe('Please enter an email address.');
    expect(validateEmail('invalid-email')).toBe('Please enter a valid email address.');
    expect(validateEmail('missing@domain')).toBe('Please enter a valid email address.');
    expect(validateEmail('@missinguser.com')).toBe('Please enter a valid email address.');
    expect(validateEmail('valid.user@example.com')).toBeNull();
  });

  it('enforces password complexity and length', () => {
    expect(validatePassword('')).toBe('Please enter a password.');
    expect(validatePassword('short1')).toBe('Password must be at least 8 characters long.');
    expect(validatePassword('nouppernumber')).toBe('Password must contain both letters and at least one number.');
    expect(validatePassword('123456789')).toBe('Password must contain both letters and at least one number.');
    expect(validatePassword('SecretPass123')).toBeNull();
  });
});

describe('email registration and authentication', () => {
  beforeEach(() => {
    signOut();
  });

  it('rejects registration with invalid email or weak password', async () => {
    await expect(
      signUpWithEmail({ email: 'bademail', password: 'ValidPass1', fullName: 'Tester' }),
    ).rejects.toThrow('valid email address');

    await expect(
      signUpWithEmail({ email: 'good@example.com', password: 'weak', fullName: 'Tester' }),
    ).rejects.toThrow('at least 8 characters');
  });

  it('registers and signs in user with email', async () => {
    const res = await signUpWithEmail({
      email: 'guest.new@stayease.com',
      password: 'SecurePassword1',
      fullName: 'New Guest',
    });

    expect(res.user.email).toBe('guest.new@stayease.com');
    expect(res.user.fullName).toBe('New Guest');
    expect(getSession()?.email).toBe('guest.new@stayease.com');
  });

  it('authenticates with signInWithPassword', async () => {
    const user = await signInWithPassword({
      email: 'returning.guest@stayease.com',
      password: 'SecurePassword1',
    });

    expect(user.email).toBe('returning.guest@stayease.com');
    expect(getSession()?.email).toBe('returning.guest@stayease.com');
  });

  it('remembers the last login email and timestamp even after sign out', async () => {
    await signInWithPassword({
      email: 'remembered.guest@stayease.com',
      password: 'SecurePassword1',
    });

    expect(getLastLoginEmail()).toBe('remembered.guest@stayease.com');
    expect(getLastLoginAt()).toBeTruthy();
    expect(getLastLoginName()).toBeTruthy();

    signOut();

    expect(getSession()).toBeNull();
    // Email remains remembered for returning guest convenience
    expect(getLastLoginEmail()).toBe('remembered.guest@stayease.com');
    expect(getLastLoginName()).toBeTruthy();
  });
});
