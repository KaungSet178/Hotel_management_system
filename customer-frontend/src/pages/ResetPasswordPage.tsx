import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/form';
import { useAuth } from '@/context/AuthContext';
import { validatePassword } from '@/lib/auth';

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const { updatePassword } = useAuth();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    const hash = window.location.hash;
    if (!hash.includes('error=')) return null;
    const params = new URLSearchParams(hash.replace(/^#/, ''));
    const desc =
      params.get('error_description') || 'This password reset link is invalid or has expired.';
    return desc.replace(/\+/g, ' ');
  });
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const pwdErr = validatePassword(password);
    if (pwdErr) {
      setError(pwdErr);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify your password confirmation.');
      return;
    }

    setBusy(true);
    try {
      await updatePassword(password);
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update password. Your reset link may have expired.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center px-4 py-12">
      <div className="rounded-3xl border border-brand-900/10 bg-white p-8 shadow-card">
        {success ? (
          <div className="space-y-6 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <div className="space-y-2">
              <h1 className="font-serif text-2xl font-bold text-ink">Password Reset Complete</h1>
              <p className="text-sm text-ink-soft">
                Your password has been changed successfully. You can now use your new password to sign in to StayEase.
              </p>
            </div>
            <Button
              className="w-full"
              size="lg"
              onClick={() => navigate('/')}
            >
              Continue to Home <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-2 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                <Lock className="h-6 w-6" />
              </div>
              <h1 className="font-serif text-2xl font-bold text-ink">Set New Password</h1>
              <p className="text-sm text-ink-soft">
                Please enter a secure new password for your account.
              </p>
            </div>

            {error && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-xl bg-rose-50 p-4 text-sm text-rose-700"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                <div className="space-y-1">
                  <p className="font-medium">{error}</p>
                  <p className="text-xs text-rose-600">
                    If this link expired, you can{' '}
                    <Link to="/" className="underline hover:text-rose-800">
                      request a new reset link from the Sign In dialog
                    </Link>
                    .
                  </p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <Field
                label="New password"
                htmlFor="new-password"
                required
                hint="Minimum 8 characters, containing letters and numbers."
              >
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-mute hover:text-ink"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </Field>

              <Field label="Confirm new password" htmlFor="confirm-new-password" required>
                <Input
                  id="confirm-new-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </Field>

              <Button type="submit" className="w-full" size="lg" loading={busy}>
                Update Password
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
