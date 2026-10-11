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
  signOut,
  updateSession,
} from './auth';

describe('auth session', () => {
  beforeEach(() => {
    signOut();
  });

  it('starts signed out', () => {
    expect(getSession()).toBeNull();
  });

  it('signs in with Google as the demo guest and persists', async () => {
    const user = await signInWithGoogle();
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
