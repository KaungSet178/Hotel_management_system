import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import type { StaffUser, UserRole } from '@/types';
import { supabase, supabaseUrl } from '@/lib/supabase';

export const DEMO_PRESETS = [
  {
    name: 'General Manager (Admin)',
    email: 'admin@hotel.com',
    role: 'ADMIN' as UserRole,
    password: 'Password123!',
    title: 'General Manager / Hotel Operations',
    station: 'Executive Management Suite',
  },
  {
    name: 'Senior Receptionist (Staff)',
    email: 'reception@hotel.com',
    role: 'RECEPTIONIST' as UserRole,
    password: 'Password123!',
    title: 'Senior Receptionist',
    station: 'Front Desk 01 • Morning Shift',
  },
];

interface AuthContextType {
  user: StaffUser | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isOffline: boolean;
  login: (email: string, password?: string) => Promise<StaffUser>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'stayease.staff.active_profile';

type DemoPreset = (typeof DEMO_PRESETS)[number];

function messageOf(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === 'object' && 'message' in err) {
    return String((err as { message: unknown }).message);
  }
  return typeof err === 'string' ? err : '';
}

function isNetworkError(err: unknown): boolean {
  const msg = messageOf(err).toLowerCase();
  return (
    msg.includes('failed to fetch') ||
    msg.includes('network') ||
    msg.includes('timeout') ||
    msg.includes('timed out') ||
    msg.includes('abort') ||
    msg.includes('offline')
  );
}

function buildDemoUser(preset: DemoPreset): StaffUser {
  const local = preset.email.split('@')[0] || 'staff';
  const name = local.charAt(0).toUpperCase() + local.slice(1);
  const idMap: Record<string, string> = {
    'admin@hotel.com': 'd7ac82d1-9c43-4525-906c-fa383406daba',
    'reception@hotel.com': '21f75765-2d96-40c0-9d9e-b63efead3945',
    'housekeeping@hotel.com': '00000000-0000-0000-0000-000000000003',
  };
  return {
    id: idMap[preset.email] || '21f75765-2d96-40c0-9d9e-b63efead3945',
    name,
    email: preset.email,
    role: preset.role,
    title: preset.title,
    station: preset.station,
    avatarText: name.charAt(0).toUpperCase(),
  };
}

async function isSupabaseReachable(): Promise<boolean> {
  if (!supabase || !supabaseUrl) return false;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);
  try {
    await fetch(`${supabaseUrl}/auth/v1/health`, { method: 'GET', signal: controller.signal });
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<StaffUser | null>(() => {
    try {
      const saved = localStorage.getItem(AUTH_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved) as StaffUser;
      }
    } catch {
      // Fallback
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);

  // Helper to resolve staff user from Supabase auth session
  const resolveStaffUser = async (authUserId: string, authEmail: string): Promise<StaffUser | null> => {
    if (!supabase) return null;

    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUserId)
        .maybeSingle();

      if (error) {
        console.warn('Error fetching profile from Supabase:', error.message);
      }

      const role = (profile?.role || 'GUEST') as string;

      // Reject GUEST accounts from staff/admin portal
      if (role === 'GUEST') {
        throw new Error('Access Denied: This account is registered as a GUEST and cannot access the staff operations or management portal.');
      }

      const validatedRole: UserRole =
        role === 'ADMIN' ? 'ADMIN' : role === 'HOUSEKEEPING' ? 'HOUSEKEEPING' : 'RECEPTIONIST';

      const staffUser: StaffUser = {
        id: authUserId,
        email: authEmail,
        name: profile?.full_name || authEmail.split('@')[0],
        role: validatedRole,
        title:
          validatedRole === 'ADMIN'
            ? 'General Manager / Hotel Operations'
            : validatedRole === 'HOUSEKEEPING'
            ? 'Housekeeping Lead'
            : 'Senior Receptionist',
        station:
          validatedRole === 'ADMIN'
            ? 'Executive Management Suite'
            : validatedRole === 'HOUSEKEEPING'
            ? 'Housekeeping Hub • Floor 2'
            : 'Front Desk 01 • Morning Shift',
        avatarText: ((profile?.full_name || authEmail)[0] || 'S').toUpperCase(),
      };

      return staffUser;
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes('Access Denied')) {
        throw err;
      }
      return null;
    }
  };

  // Sync session on mount
  useEffect(() => {
    let mounted = true;

    async function initSession() {
      if (!supabase) {
        setIsOffline(true);
        setIsLoading(false);
        return;
      }

      const reachable = await isSupabaseReachable();
      if (!reachable) {
        setIsOffline(true);
        setIsLoading(false);
        return;
      }

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user && mounted) {
          try {
            const staff = await resolveStaffUser(session.user.id, session.user.email || '');
            if (staff && mounted) {
              setUser(staff);
              localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(staff));
            } else if (mounted) {
              setUser(null);
              localStorage.removeItem(AUTH_STORAGE_KEY);
            }
          } catch (err) {
            console.error('Session user resolution rejected:', err);
            await supabase.auth.signOut();
            setUser(null);
            localStorage.removeItem(AUTH_STORAGE_KEY);
          }
        }
      } catch (err) {
        console.error('Failed to get Supabase session:', err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    void initSession();

    // Listen to real-time auth changes (sign in, sign out, token refresh)
    const {
      data: { subscription },
    } = supabase
      ? supabase.auth.onAuthStateChange(async (event, session) => {
          if (event === 'SIGNED_OUT') {
            setUser(null);
            localStorage.removeItem(AUTH_STORAGE_KEY);
          } else if (event === 'SIGNED_IN' && session?.user) {
            try {
              const staff = await resolveStaffUser(session.user.id, session.user.email || '');
              if (staff) {
                setUser(staff);
                localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(staff));
              }
            } catch {
              setUser(null);
              localStorage.removeItem(AUTH_STORAGE_KEY);
            }
          }
        })
      : { data: { subscription: { unsubscribe: () => {} } } };

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password = 'Password123!'): Promise<StaffUser> => {
    const cleanEmail = email.trim().toLowerCase();
    const preset = DEMO_PRESETS.find((p) => p.email.toLowerCase() === cleanEmail);

    const signInOffline = (): StaffUser => {
      if (!preset || password !== preset.password) {
        throw new Error(
          'Offline demo mode: sign in with admin@hotel.com or reception@hotel.com using password "Password123!".',
        );
      }
      const staffUser = buildDemoUser(preset);
      setUser(staffUser);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(staffUser));
      return staffUser;
    };

    if (!supabase || isOffline) {
      return signInOffline();
    }

    try {
      // 1. Authenticate with Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error || !data.user) {
        if (isNetworkError(error)) {
          setIsOffline(true);
          return signInOffline();
        }
        throw new Error(error?.message || 'Invalid email or password.');
      }

      // 2. Fetch profile from public.profiles and verify staff role
      const staff = await resolveStaffUser(data.user.id, data.user.email || cleanEmail);

      if (!staff) {
        await supabase.auth.signOut();
        throw new Error(
          'Access Denied: No staff profile found for this account. Accounts must be provisioned by the administrator in Supabase.',
        );
      }

      setUser(staff);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(staff));
      return staff;
    } catch (err) {
      if (isNetworkError(err)) {
        setIsOffline(true);
        return signInOffline();
      }
      throw err;
    }
  };

  const logout = async () => {
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn('Supabase sign out error:', err);
      }
    }
    setUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role ?? null,
        isAuthenticated: !!user,
        isLoading,
        isOffline,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function ProtectedRoute({
  children,
  requiredRole,
}: {
  children: ReactNode;
  requiredRole?: 'ADMIN' | 'STAFF' | UserRole;
}) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#070e1b] text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#89f5e7] border-t-transparent" />
          <p className="text-label-md text-white/60">Authenticating with Grand Azure Systems…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Strict role isolation: Admin cannot access staff pages, Staff cannot access admin pages
  if (requiredRole === 'ADMIN' && user.role !== 'ADMIN') {
    return <Navigate to="/reservations" replace />;
  }

  if ((requiredRole === 'STAFF' || requiredRole === 'RECEPTIONIST') && user.role === 'ADMIN') {
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
}
