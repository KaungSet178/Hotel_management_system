import { useState } from 'react';
import { ArrowLeft, Mail, ShieldCheck, Smartphone } from 'lucide-react';
import { GoogleIcon } from './GoogleIcon';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Field, Input, Select } from '@/components/ui/form';
import { useToast } from '@/components/ui/toast';
import { useAuth } from '@/context/AuthContext';
import { DEMO_ACCOUNT } from '@/lib/auth';
import type { UserProfile } from '@/types';

const COUNTRY_CODES = ['+95', '+66', '+65', '+60', '+61', '+91'];
type Method = 'phone' | 'email';

/**
 * Global sign-in dialog. Rendered only while open (see `Layout`), so the
 * `SignInForm` below mounts fresh on each open — no state reset effect needed.
 */
export function SignInDialog() {
  const { signInOpen } = useAuth();
  if (!signInOpen) return null;
  return <SignInForm />;
}

function SignInForm() {
  const { closeSignIn, signInWithGoogle, signInWithPhone, signInWithEmail, requestOtp } = useAuth();
  const toast = useToast();

  const [method, setMethod] = useState<Method | null>(null);
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [countryCode, setCountryCode] = useState<string>(DEMO_ACCOUNT.phoneCountryCode);
  const [phone, setPhone] = useState<string>(DEMO_ACCOUNT.phone);
  const [otpSent, setOtpSent] = useState(false);
  const [code, setCode] = useState('');

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');

  const finish = (user: UserProfile) => {
    toast.success(`Welcome, ${user.fullName.split(' ')[0]}`, 'You are now signed in.');
    closeSignIn();
  };

  const run = async (fn: () => Promise<UserProfile>) => {
    setBusy(true);
    setError(null);
    try {
      finish(await fn());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const onGoogle = async () => {
    setGoogleBusy(true);
    setError(null);
    try {
      finish(await signInWithGoogle());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed.');
    } finally {
      setGoogleBusy(false);
    }
  };

  const sendOtp = async () => {
    if (phone.replace(/\D/g, '').length < 6) {
      setError('Enter a valid phone number.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await requestOtp(`${countryCode} ${phone}`);
      setOtpSent(true);
      toast.info('Verification code sent', `We sent a demo code to ${countryCode} ${phone}.`);
    } catch {
      setError('We could not send the code. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const onEmail = () => {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) {
      setError('Enter a valid email address.');
      return;
    }
    void run(() =>
      signInWithEmail({
        email,
        fullName: fullName.trim() || undefined,
        phoneCountryCode: countryCode,
        phone: DEMO_ACCOUNT.phone,
      }),
    );
  };

  return (
    <Modal
      open
      onClose={busy ? () => undefined : closeSignIn}
      title={method ? 'Sign in' : 'Welcome to StayFlow'}
      description={
        method
          ? 'Choose how you’d like to continue.'
          : 'Sign in to trace your bookings, view folios and request in-stay services.'
      }
      footer={
        method ? (
          <button
            type="button"
            onClick={() => {
              setMethod(null);
              setError(null);
              setOtpSent(false);
            }}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:underline"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Other sign-in options
          </button>
        ) : (
          <p className="flex items-center gap-1.5 text-xs text-ink-mute">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            Demo mode — no real credentials are collected or stored.
          </p>
        )
      }
    >
      {method === null ? (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => void onGoogle()}
            disabled={googleBusy || busy}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-brand-900/15 bg-white px-4 py-3 text-sm font-medium text-ink transition-colors hover:bg-lavender-100 disabled:opacity-55"
          >
            <GoogleIcon />
            {googleBusy ? 'Connecting to Google…' : 'Continue with Google'}
          </button>

          <button
            type="button"
            onClick={() => {
              setMethod('phone');
              setError(null);
            }}
            disabled={googleBusy}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-brand-900/15 bg-white px-4 py-3 text-sm font-medium text-ink transition-colors hover:bg-lavender-100 disabled:opacity-55"
          >
            <Smartphone className="h-5 w-5 text-brand-700" aria-hidden="true" />
            Continue with phone number
          </button>

          <button
            type="button"
            onClick={() => {
              setMethod('email');
              setError(null);
            }}
            disabled={googleBusy}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-brand-900/15 bg-white px-4 py-3 text-sm font-medium text-ink transition-colors hover:bg-lavender-100 disabled:opacity-55"
          >
            <Mail className="h-5 w-5 text-brand-700" aria-hidden="true" />
            Continue with email
          </button>

          {error ? (
            <p role="alert" className="text-sm font-medium text-rose-600">
              {error}
            </p>
          ) : null}

          <p className="rounded-xl bg-lavender-100 px-3 py-2 text-xs text-ink-soft">
            Demo tip: any option signs you in as the sample guest{' '}
            <span className="font-medium text-ink">{DEMO_ACCOUNT.fullName}</span> so you can explore bookings
            immediately.
          </p>
        </div>
      ) : null}

      {method === 'phone' ? (
        <div className="space-y-4">
          <div className="grid grid-cols-[7rem_1fr] gap-3">
            <Field label="Code" htmlFor="signin-cc">
              <Select
                id="signin-cc"
                aria-label="Country calling code"
                value={countryCode}
                onChange={(event) => setCountryCode(event.target.value)}
                disabled={otpSent}
              >
                {COUNTRY_CODES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Mobile number" htmlFor="signin-phone">
              <Input
                id="signin-phone"
                type="tel"
                autoComplete="tel"
                placeholder="9 798 123 456"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                disabled={otpSent}
              />
            </Field>
          </div>

          {otpSent ? (
            <Field
              label="Verification code"
              htmlFor="signin-otp"
              hint="Demo: enter any 6 digits (e.g. 000000)."
              error={error ?? undefined}
            >
              <Input
                id="signin-otp"
                inputMode="numeric"
                maxLength={6}
                placeholder="••••••"
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                invalid={Boolean(error)}
              />
            </Field>
          ) : null}

          {otpSent ? (
            <Button
              className="w-full"
              size="lg"
              loading={busy}
              disabled={code.length < 4}
              onClick={() => void run(() => signInWithPhone({ phoneCountryCode: countryCode, phone, code }))}
            >
              Verify &amp; continue
            </Button>
          ) : (
            <Button className="w-full" size="lg" loading={busy} onClick={() => void sendOtp()}>
              Send verification code
            </Button>
          )}
        </div>
      ) : null}

      {method === 'email' ? (
        <div className="space-y-4">
          <Field label="Full name" htmlFor="signin-name" hint="Optional — used on your folio.">
            <Input
              id="signin-name"
              autoComplete="name"
              placeholder="e.g. Thant Zin"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
            />
          </Field>
          <Field label="Email address" htmlFor="signin-email" required error={error ?? undefined}>
            <Input
              id="signin-email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              invalid={Boolean(error)}
            />
          </Field>
          <Button className="w-full" size="lg" loading={busy} onClick={onEmail}>
            Continue with email
          </Button>
        </div>
      ) : null}
    </Modal>
  );
}
