import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  KeyRound,
  Mail,
  ShieldCheck,
  UserCheck,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  Lock,
} from 'lucide-react';
import { DEMO_PRESETS, useAuth } from '@/auth';
import { useToast } from '@/components/toast';

export function LoginPage() {
  const { login, isOffline } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [email, setEmail] = useState('admin@hotel.com');
  const [password, setPassword] = useState('Password123!');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSignIn = async (targetEmail: string, targetPass: string) => {
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const user = await login(targetEmail, targetPass);
      toast.success(`Authenticated as ${user.name} (${user.role})`);
      if (user.role === 'ADMIN') {
        navigate('/admin', { replace: true });
      } else {
        navigate('/reservations', { replace: true });
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Failed to authenticate with Supabase. Please verify your credentials.';
      setErrorMessage(message);
      toast.warning(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    void handleSignIn(email, password);
  };

  const applyPreset = (preset: (typeof DEMO_PRESETS)[0]) => {
    setEmail(preset.email);
    setPassword(preset.password);
    setErrorMessage(null);
  };

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-[#070e1b] px-4 py-12 text-[#ecf1ff]">
      {/* Background aesthetics */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_15%,rgba(14,48,84,0.5)_0%,rgba(7,14,27,0.95)_75%)]" />
      <div
        className="pointer-events-none absolute inset-0 opacity-10"
        style={{
          backgroundImage: `radial-gradient(rgba(137,245,231,0.2) 1px, transparent 0)`,
          backgroundSize: '24px 24px',
        }}
      />

      <div className="relative z-10 w-full max-w-md">
        {/* Brand header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0e2a4a] to-[#041a31] p-0.5 shadow-xl ring-1 ring-white/15">
            <span className="flex h-full w-full items-center justify-center rounded-[14px] bg-[#0e1c32]">
              <Building2 className="h-7 w-7 text-[#89f5e7]" />
            </span>
          </div>
          <h1 className="text-headline-md font-serif font-semibold tracking-tight text-white">
            Grand Azure Resort & Spa
          </h1>
          <p className="mt-1 text-label-md text-white/60">
            StayEase Unified Staff & Executive Portal
          </p>
        </div>

        {/* Login Box */}
        <div className="rounded-2xl border border-white/12 bg-white/[0.04] p-6 shadow-2xl backdrop-blur-xl sm:p-8">
          <div className="mb-5 border-b border-white/10 pb-4">
            <h2 className="text-title-lg font-semibold text-white">Sign In to Your Station</h2>
            <p className="mt-0.5 text-body-sm text-white/65">
              {isOffline
                ? 'Offline demo mode — Supabase is unreachable, using local accounts.'
                : 'Secure authentication powered directly by Supabase Cloud.'}
            </p>
          </div>

          {/* Offline demo banner */}
          {isOffline && (
            <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-[#89f5e7]/30 bg-[#89f5e7]/10 p-3.5 text-[#bff7ef]">
              <AlertCircle className="h-5 w-5 shrink-0 text-[#89f5e7] mt-0.5" />
              <p className="text-body-sm font-medium leading-tight">
                Supabase Cloud could not be reached. Running in offline demo mode — use one of the
                pre-provisioned accounts below and press Sign In.
              </p>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-rose-200">
              <AlertCircle className="h-5 w-5 shrink-0 text-rose-400 mt-0.5" />
              <p className="text-body-sm font-medium leading-tight">{errorMessage}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-label-sm font-medium text-white/80">
                Work Email Address
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-white/40" />
                <input
                  type="email"
                  required
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@hotel.com"
                  className="h-11 w-full rounded-xl border border-white/15 bg-white/5 pl-9 pr-4 text-body-md text-white placeholder:text-white/30 outline-none transition focus:border-[#89f5e7] focus:ring-2 focus:ring-[#89f5e7]/20"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-label-sm font-medium text-white/80">
                Password
              </label>
              <div className="relative">
                <KeyRound className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-white/40" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 w-full rounded-xl border border-white/15 bg-white/5 pl-9 pr-10 text-body-md text-white placeholder:text-white/30 outline-none transition focus:border-[#89f5e7] focus:ring-2 focus:ring-[#89f5e7]/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute top-1/2 right-3 -translate-y-1/2 text-white/40 hover:text-white"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#89f5e7] to-[#40d2bf] font-semibold text-[#07172b] shadow-lg shadow-[#89f5e7]/20 transition hover:brightness-105 active:scale-[0.99] disabled:opacity-60 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Verifying Credentials…
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4" />
                  Sign In
                </>
              )}
            </button>
          </form>

          {/* Quick-fill helpers for provisioned Supabase accounts */}
          <div className="mt-6 border-t border-white/10 pt-5">
            <p className="text-label-xs font-semibold uppercase tracking-wider text-[#89f5e7]/80">
              Pre-Provisioned Supabase Accounts
            </p>
            <div className="mt-2.5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => applyPreset(DEMO_PRESETS[0])}
                className="flex flex-col items-start rounded-xl border border-white/10 bg-white/5 p-2.5 text-left transition hover:border-[#89f5e7]/50 hover:bg-white/10"
              >
                <span className="flex items-center gap-1 text-[11px] font-semibold text-[#89f5e7]">
                  <ShieldCheck className="h-3 w-3" />
                  Admin
                </span>
                <span className="mt-1 truncate text-label-xs font-medium text-white">
                  admin@hotel.com
                </span>
              </button>

              <button
                type="button"
                onClick={() => applyPreset(DEMO_PRESETS[1])}
                className="flex flex-col items-start rounded-xl border border-white/10 bg-white/5 p-2.5 text-left transition hover:border-white/25 hover:bg-white/10"
              >
                <span className="flex items-center gap-1 text-[11px] font-semibold text-white/80">
                  <UserCheck className="h-3 w-3" />
                  Staff
                </span>
                <span className="mt-1 truncate text-label-xs font-medium text-white">
                  reception@hotel.com
                </span>
              </button>
            </div>
          </div>

          {/* Access Policy Notice */}
          <div className="mt-5 rounded-xl border border-white/8 bg-white/[0.02] p-3 text-body-xs text-white/45">
            🔒 <strong>Staff Policy:</strong> Account self-registration is disabled. All admin and staff accounts are provisioned directly in the Supabase Management Console by the resort administrator.
          </div>
        </div>

        <p className="mt-6 text-center text-label-xs text-white/35">
          Grand Azure Resort & Spa • StayEase v2.6 • Connected to Supabase
        </p>
      </div>
    </div>
  );
}
