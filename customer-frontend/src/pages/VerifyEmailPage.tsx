import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { CheckCircle2, AlertCircle, Mail, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/form';
import { useAuth } from '@/context/AuthContext';
import { validateEmail } from '@/lib/auth';

export function VerifyEmailPage() {
  const navigate = useNavigate();
  const { user, refreshUser, resendVerificationEmail } = useAuth();

  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Resend state
  const [resendEmail, setResendEmail] = useState(user?.email || '');
  const [resendBusy, setResendBusy] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  useEffect(() => {
    let isMounted = true;

    async function checkVerification() {
      // 1. Check if hash contains error
      if (typeof window !== 'undefined' && window.location.hash) {
        const hash = window.location.hash.replace(/^#/, '');
        const params = new URLSearchParams(hash);
        if (params.get('error')) {
          const desc = params.get('error_description') || 'This verification link is invalid or has expired.';
          if (isMounted) {
            setError(desc.replace(/\+/g, ' '));
            setLoading(false);
          }
          return;
        }
      }

      // 2. Allow Supabase auth client a moment to parse the hash and set the session
      try {
        const refreshed = await refreshUser();
        if (isMounted) {
          if (refreshed && refreshed.isEmailVerified) {
            setVerified(true);
          } else if (refreshed) {
            // Check once more after brief delay in case confirmed_at was just written
            setTimeout(async () => {
              const secondCheck = await refreshUser();
              if (isMounted) {
                if (secondCheck?.isEmailVerified) {
                  setVerified(true);
                } else {
                  setVerified(false);
                }
                setLoading(false);
              }
            }, 1000);
            return;
          } else {
            setVerified(false);
          }
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Unable to verify email.');
          setLoading(false);
        }
      }
    }

    void checkVerification();

    return () => {
      isMounted = false;
    };
  }, [refreshUser]);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    setResendMessage(null);

    const emailErr = validateEmail(resendEmail);
    if (emailErr) {
      setError(emailErr);
      return;
    }

    setResendBusy(true);
    try {
      await resendVerificationEmail(resendEmail);
      setResendCooldown(60);
      setResendMessage(`A new confirmation email has been dispatched to ${resendEmail}.`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to resend confirmation email.');
    } finally {
      setResendBusy(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col justify-center px-4 py-12">
      <div className="rounded-3xl border border-brand-900/10 bg-white p-8 shadow-card text-center">
        {loading ? (
          <div className="space-y-4 py-8">
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-brand-700" />
            <h2 className="font-serif text-xl font-bold text-ink">Verifying your email…</h2>
            <p className="text-sm text-ink-soft">
              Please wait while we confirm your account with Supabase Auth.
            </p>
          </div>
        ) : verified ? (
          <div className="space-y-6">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 className="h-10 w-10" />
            </div>

            <div className="space-y-2">
              <h1 className="font-serif text-2xl font-bold text-ink">Email Verified Successfully!</h1>
              <p className="text-sm text-ink-soft">
                Your email address is now confirmed. Your account is fully active and you can now complete room reservations at StayEase.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center pt-2">
              <Button size="lg" onClick={() => navigate('/search')}>
                Browse Available Rooms <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button variant="secondary" size="lg" onClick={() => navigate('/')}>
                Go to Home
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-700">
              <Mail className="h-8 w-8" />
            </div>

            <div className="space-y-2">
              <h1 className="font-serif text-2xl font-bold text-ink">Email Verification Required</h1>
              <p className="text-sm text-ink-soft">
                {error ||
                  'Your email could not be verified automatically. The verification link may have expired or already been used.'}
              </p>
            </div>

            {error && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-xl bg-rose-50 p-4 text-left text-sm text-rose-700"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                <p>{error}</p>
              </div>
            )}

            {resendMessage && (
              <div className="flex items-start gap-2.5 rounded-xl bg-emerald-50 p-4 text-left text-sm text-emerald-800">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <p>{resendMessage}</p>
              </div>
            )}

            <form onSubmit={handleResend} className="space-y-4 text-left border-t border-brand-900/10 pt-5">
              <Field label="Need a new confirmation link?" htmlFor="resend-email" hint="Enter your registration email.">
                <Input
                  id="resend-email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  required
                />
              </Field>

              <Button
                type="submit"
                variant="secondary"
                className="w-full"
                loading={resendBusy}
                disabled={resendBusy || resendCooldown > 0}
              >
                {resendCooldown > 0
                  ? `Wait ${resendCooldown}s before resending`
                  : 'Resend Confirmation Email'}
              </Button>
            </form>

            <div className="pt-2">
              <Link to="/" className="text-xs font-semibold text-brand-700 hover:underline">
                Return to StayEase Home
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
