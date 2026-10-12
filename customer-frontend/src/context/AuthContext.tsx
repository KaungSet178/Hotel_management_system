import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';
import type { UserProfile } from '@/types';
import * as auth from '@/lib/auth';

type AuthStatus = 'authenticated' | 'anonymous';

interface AuthContextValue {
  user: UserProfile | null;
  status: AuthStatus;
  /** Whether the global sign-in dialog is open. */
  signInOpen: boolean;
  openSignIn: () => void;
  closeSignIn: () => void;
  signInWithGoogle: () => Promise<UserProfile | void>;
  signInWithPhone: (input: {
    phoneCountryCode: string;
    phone: string;
    code: string;
  }) => Promise<UserProfile>;
  signInWithEmail: (input: {
    email: string;
    fullName?: string;
    phoneCountryCode?: string;
    phone?: string;
  }) => Promise<UserProfile>;
  signUpWithEmail: (input: {
    email: string;
    password: string;
    fullName?: string;
    phoneCountryCode?: string;
    phone?: string;
  }) => Promise<{ user: UserProfile; needsEmailVerification: boolean }>;
  signInWithPassword: (input: {
    email: string;
    password: string;
  }) => Promise<UserProfile>;
  resendVerificationEmail: (email: string) => Promise<void>;
  resetPasswordForEmail: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  refreshUser: () => Promise<UserProfile | null>;
  requestOtp: (phone: string) => Promise<{ sentTo: string }>;
  signOut: () => void;
  updateProfile: (patch: Partial<UserProfile>) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(() => auth.getSession());
  const [signInOpen, setSignInOpen] = useState(false);
  const navigate = useNavigate();

  // Keep state in sync with persisted session, other tabs, and Supabase OAuth
  useEffect(() => {
    void auth.syncOAuthSession().then((u) => {
      if (u) setUser(u);
    });

    const unsubSupabase = auth.initSupabaseAuthListener((u) => setUser(u));
    const unsubLocal = auth.subscribeSession(() => setUser(auth.getSession()));

    return () => {
      unsubSupabase();
      unsubLocal();
    };
  }, []);

  const openSignIn = useCallback(() => setSignInOpen(true), []);
  const closeSignIn = useCallback(() => setSignInOpen(false), []);

  const signOut = useCallback(() => {
    auth.signOut();
    setUser(null);
    setSignInOpen(false);
    navigate('/');
  }, [navigate]);

  const updateProfile = useCallback((patch: Partial<UserProfile>) => {
    auth.updateSession(patch);
  }, []);

  const refreshUser = useCallback(async () => {
    const u = await auth.refreshUser();
    setUser(u);
    return u;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      status: user ? 'authenticated' : 'anonymous',
      signInOpen,
      openSignIn,
      closeSignIn,
      signInWithGoogle: auth.signInWithGoogle,
      signInWithPhone: auth.signInWithPhone,
      signInWithEmail: auth.signInWithEmail,
      signUpWithEmail: auth.signUpWithEmail,
      signInWithPassword: auth.signInWithPassword,
      resendVerificationEmail: auth.resendVerificationEmail,
      resetPasswordForEmail: auth.resetPasswordForEmail,
      updatePassword: auth.updatePassword,
      refreshUser,
      requestOtp: auth.requestOtp,
      signOut,
      updateProfile,
    }),
    [user, signInOpen, openSignIn, closeSignIn, signOut, updateProfile, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
