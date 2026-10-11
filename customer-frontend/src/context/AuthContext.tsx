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
  signInWithGoogle: () => Promise<UserProfile>;
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
  requestOtp: (phone: string) => Promise<{ sentTo: string }>;
  signOut: () => void;
  updateProfile: (patch: Partial<UserProfile>) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(() => auth.getSession());
  const [signInOpen, setSignInOpen] = useState(false);
  const navigate = useNavigate();

  // Keep state in sync with the persisted session (and other tabs).
  useEffect(() => auth.subscribeSession(() => setUser(auth.getSession())), []);

  const openSignIn = useCallback(() => setSignInOpen(true), []);
  const closeSignIn = useCallback(() => setSignInOpen(false), []);

  const signOut = useCallback(() => {
    auth.signOut();
    setSignInOpen(false);
    navigate('/');
  }, [navigate]);

  const updateProfile = useCallback((patch: Partial<UserProfile>) => {
    auth.updateSession(patch);
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
      requestOtp: auth.requestOtp,
      signOut,
      updateProfile,
    }),
    [user, signInOpen, openSignIn, closeSignIn, signOut, updateProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
