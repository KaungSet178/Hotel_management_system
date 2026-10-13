import { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Mail,
  ShieldCheck,
  Smartphone,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { GoogleIcon } from './GoogleIcon';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Field, Input, Select } from '@/components/ui/form';
import { useToast } from '@/components/ui/toast';
import { useAuth } from '@/context/AuthContext';
import { DEMO_ACCOUNT, validateEmail, validatePassword, getLastLoginEmail } from '@/lib/auth';
import type { UserProfile } from '@/types';

const COUNTRY_CODES = ['+95', '+66', '+65', '+60', '+61', '+91'];
type ViewMode =
  | 'options'
  | 'login'
  | 'register'
  | 'forgot_password'
  | 'awaiting_verification'
  | 'phone';

/**
 * Global authentication dialog supporting Email+Password, Registration with
 * verification notice, Password Reset, Google OAuth, and Phone OTP.
 */
export function SignInDialog() {
  const { signInOpen } = useAuth();
  if (!signInOpen) return null;
  return <SignInForm />;
}

function SignInForm() {
  const {
    closeSignIn,
    signInWithGoogle,
    signInWithPassword,
    signUpWithEmail,
    resendVerificationEmail,
    resetPasswordForEmail,
    signInWithPhone,
    requestOtp,
  } = useAuth();
  const toast = useToast();

  const [mode, setMode] = useState<ViewMode>('options');
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  // Form states
  const [email, setEmail] = useState(() => getLastLoginEmail());
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Phone states
  const [countryCode, setCountryCode] = useState<string>(DEMO_ACCOUNT.phoneCountryCode);
  const [phone, setPhone] = useState<string>(DEMO_ACCOUNT.phone);
  const [otpSent, setOtpSent] = useState(false);
  const [code, setCode] = useState('');

  // Verification state
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  // Timer for resend cooldown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  const finish = (user: UserProfile) => {
    toast.success(`Welcome, ${user.fullName.split(' ')[0]}`, 'You are now signed in.');
    closeSignIn();
  };

  const switchMode = (newMode: ViewMode) => {
    setMode(newMode);
    setError(null);
    setInfoMessage(null);
  };

  // Google OAuth
  const onGoogle = async () => {
    setGoogleBusy(true);
    setError(null);
    try {
      const user = await signInWithGoogle();
      if (user) finish(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed.');
      setGoogleBusy(false);
    }
  };

  // Email & Password Sign In
  const onLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const emailErr = validateEmail(email);
    if (emailErr) {
      setError(emailErr);
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const user = await signInWithPassword({ email, password });
      finish(user);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sign in failed.';
      setError(msg);
      // If error indicates unconfirmed email, allow direct resend
      if (msg.toLowerCase().includes('verify your email') || msg.toLowerCase().includes('email not confirmed')) {
        setRegisteredEmail(email.trim().toLowerCase());
      }
    } finally {
      setBusy(false);
    }
  };

  // User Registration
  const onRegister = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);

    const emailErr = validateEmail(email);
    if (emailErr) {
      setError(emailErr);
      return;
    }

    const pwdErr = validatePassword(password);
    if (pwdErr) {
      setError(pwdErr);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify your password confirmation.');
      return;
    }

    if (!fullName.trim()) {
      setError('Please enter your full name.');
      return;
    }

    setBusy(true);
    try {
      const res = await signUpWithEmail({
        email,
        password,
        fullName: fullName.trim(),
      });

      if (res.needsEmailVerification) {
        setRegisteredEmail(email.trim().toLowerCase());
        setMode('awaiting_verification');
        setResendCooldown(60);
      } else {
        finish(res.user);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed.');
    } finally {
      setBusy(false);
    }
  };

  // Forgot Password
  const onForgotPassword = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const emailErr = validateEmail(email);
    if (emailErr) {
      setError(emailErr);
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await resetPasswordForEmail(email);
      setInfoMessage(`If an account exists for ${email}, a password reset link has been sent to your inbox.`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send password reset link.');
    } finally {
      setBusy(false);
    }
  };

  // Resend Verification Email
  const onResend = async () => {
    const targetEmail = registeredEmail || email;
    if (!targetEmail) {
      setError('Please provide your email address to resend confirmation.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await resendVerificationEmail(targetEmail);
      setResendCooldown(60);
      toast.info('Verification email resent', `Check your inbox at ${targetEmail}.`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to resend confirmation email.');
    } finally {
      setBusy(false);
    }
  };

  // Phone OTP
  const sendPhoneOtp = async () => {
    if (phone.replace(/\D/g, '').length < 6) {
      setError('Enter a valid phone number.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await requestOtp(`${countryCode} ${phone}`);
      setOtpSent(true);
      toast.info('Verification code sent', `We sent a code to ${countryCode} ${phone}.`);
    } catch {
      setError('We could not send the code. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const verifyPhoneOtp = async () => {
    setBusy(true);
    setError(null);
    try {
      const user = await signInWithPhone({ phoneCountryCode: countryCode, phone, code });
      finish(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to verify phone code.');
    } finally {
      setBusy(false);
    }
  };

  const getTitle = () => {
    switch (mode) {
      case 'login':
        return 'Sign In to StayEase';
      case 'register':
        return 'Create an Account';
      case 'forgot_password':
        return 'Reset Password';
      case 'awaiting_verification':
        return 'Check Your Inbox';
      case 'phone':
        return 'Sign In with Phone';
      default:
        return 'Welcome to StayEase';
    }
  };

  const getDescription = () => {
    switch (mode) {
      case 'login':
        return 'Sign in with your email and password to manage bookings.';
      case 'register':
        return 'Register with your email to unlock room reservations and guest services.';
      case 'forgot_password':
        return 'We’ll email you instructions to reset your password.';
      case 'awaiting_verification':
        return 'A confirmation link has been sent to activate your account.';
      case 'phone':
        return 'Enter your mobile number to receive a verification code.';
      default:
        return 'Sign in to reserve rooms, trace your bookings, and view folios.';
    }
  };

  return (
    <Modal
      open
      onClose={busy ? () => undefined : closeSignIn}
      title={getTitle()}
      description={getDescription()}
      footer={
        mode !== 'options' ? (
          <button
            type="button"
            onClick={() => switchMode('options')}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:underline"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Other options
          </button>
        ) : (
          <p className="flex items-center gap-1.5 text-xs text-ink-mute">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            Protected by Supabase Auth with enterprise-grade encryption.
          </p>
        )
      }
    >
      {/* 1. OPTIONS VIEW */}
      {mode === 'options' && (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => void onGoogle()}
            disabled={googleBusy || busy}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-brand-900/15 bg-white px-4 py-3 text-sm font-medium text-ink transition-colors hover:bg-lavender-100 disabled:opacity-55"
          >
            <GoogleIcon />
            {googleBusy ? 'Redirecting to Google…' : 'Continue with Google'}
          </button>

          <button
            type="button"
            onClick={() => switchMode('login')}
            className="flex w-full items-center justify-center gap-3 rounded-xl bg-brand-700 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-brand-800"
          >
            <Mail className="h-5 w-5 text-white" aria-hidden="true" />
            Sign in with Email
          </button>

          <button
            type="button"
            onClick={() => switchMode('register')}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-brand-900/15 bg-white px-4 py-3 text-sm font-medium text-ink transition-colors hover:bg-lavender-100"
          >
            <Lock className="h-5 w-5 text-brand-700" aria-hidden="true" />
            Create New Account
          </button>

          <button
            type="button"
            onClick={() => switchMode('phone')}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-brand-900/15 bg-white px-4 py-3 text-sm font-medium text-ink transition-colors hover:bg-lavender-100"
          >
            <Smartphone className="h-5 w-5 text-brand-700" aria-hidden="true" />
            Continue with Phone Number
          </button>

          {error && (
            <p role="alert" className="text-sm font-medium text-rose-600">
              {error}
            </p>
          )}
        </div>
      )}

      {/* 2. LOGIN VIEW */}
      {mode === 'login' && (
        <form onSubmit={onLogin} className="space-y-4">
          <Field label="Email address" htmlFor="login-email" required>
            <Input
              id="login-email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              invalid={Boolean(error)}
              required
            />
          </Field>

          <Field
            label="Password"
            htmlFor="login-password"
            required
            hint={
              <button
                type="button"
                onClick={() => switchMode('forgot_password')}
                className="text-xs font-medium text-brand-700 hover:underline"
              >
                Forgot password?
              </button>
            }
          >
            <div className="relative">
              <Input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                invalid={Boolean(error)}
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

          <div className="flex items-center justify-between py-1 text-xs text-ink-soft">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-brand-900/20 text-brand-700 accent-brand-700"
              />
              <span>Keep me signed in on this device</span>
            </label>
          </div>

          {error && (
            <div role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">
              <p className="font-medium">{error}</p>
              {registeredEmail && (
                <button
                  type="button"
                  onClick={() => switchMode('awaiting_verification')}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline"
                >
                  <RefreshCw className="h-3 w-3" /> Resend verification email
                </button>
              )}
            </div>
          )}

          <Button type="submit" className="w-full" size="lg" loading={busy}>
            Sign In
          </Button>

          <p className="text-center text-xs text-ink-soft">
            Don’t have an account?{' '}
            <button
              type="button"
              onClick={() => switchMode('register')}
              className="font-medium text-brand-700 hover:underline"
            >
              Sign up
            </button>
          </p>
        </form>
      )}

      {/* 3. REGISTRATION VIEW */}
      {mode === 'register' && (
        <form onSubmit={onRegister} className="space-y-4">
          <Field label="Full name" htmlFor="register-name" required>
            <Input
              id="register-name"
              type="text"
              autoComplete="name"
              placeholder="e.g. John Doe"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </Field>

          <Field label="Email address" htmlFor="register-email" required>
            <Input
              id="register-email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </Field>

          <Field
            label="Password"
            htmlFor="register-password"
            required
            hint="Minimum 8 characters, containing both letters and numbers."
          >
            <div className="relative">
              <Input
                id="register-password"
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

          <Field label="Confirm password" htmlFor="register-confirm" required>
            <Input
              id="register-confirm"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </Field>

          {error && (
            <div role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" size="lg" loading={busy}>
            Create Account
          </Button>

          <p className="text-center text-xs text-ink-soft">
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => switchMode('login')}
              className="font-medium text-brand-700 hover:underline"
            >
              Sign in
            </button>
          </p>
        </form>
      )}

      {/* 4. AWAITING EMAIL VERIFICATION VIEW */}
      {mode === 'awaiting_verification' && (
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-700">
            <Mail className="h-7 w-7" />
          </div>

          <div className="space-y-2">
            <h4 className="font-serif text-lg font-bold text-ink">Check your inbox</h4>
            <p className="text-sm text-ink-soft">
              We have sent an activation link to{' '}
              <strong className="text-ink">{registeredEmail || email}</strong>.
            </p>
            <p className="text-xs text-ink-mute">
              Click the link in the email to activate your account and complete room reservations.
            </p>
          </div>

          {error && (
            <div role="alert" className="rounded-lg bg-rose-50 p-2 text-xs text-rose-700">
              {error}
            </div>
          )}

          <div className="pt-2">
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              disabled={busy || resendCooldown > 0}
              loading={busy}
              onClick={onResend}
            >
              {resendCooldown > 0
                ? `Resend available in ${resendCooldown}s`
                : 'Resend confirmation email'}
            </Button>
          </div>

          <div className="border-t border-brand-900/10 pt-3">
            <button
              type="button"
              onClick={() => switchMode('login')}
              className="text-xs font-semibold text-brand-700 hover:underline"
            >
              Back to Sign In
            </button>
          </div>
        </div>
      )}

      {/* 5. FORGOT PASSWORD VIEW */}
      {mode === 'forgot_password' && (
        <form onSubmit={onForgotPassword} className="space-y-4">
          <Field label="Email address" htmlFor="forgot-email" required>
            <Input
              id="forgot-email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </Field>

          {infoMessage ? (
            <div className="flex items-start gap-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <span>{infoMessage}</span>
            </div>
          ) : null}

          {error ? (
            <div role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          <Button type="submit" className="w-full" size="lg" loading={busy} disabled={Boolean(infoMessage)}>
            Send Reset Link
          </Button>

          <p className="text-center text-xs text-ink-soft">
            Remember your password?{' '}
            <button
              type="button"
              onClick={() => switchMode('login')}
              className="font-medium text-brand-700 hover:underline"
            >
              Sign in
            </button>
          </p>
        </form>
      )}

      {/* 6. PHONE VIEW */}
      {mode === 'phone' && (
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
              hint="Enter the 6-digit code sent to your phone."
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
              onClick={() => void verifyPhoneOtp()}
            >
              Verify &amp; continue
            </Button>
          ) : (
            <Button className="w-full" size="lg" loading={busy} onClick={() => void sendPhoneOtp()}>
              Send verification code
            </Button>
          )}

          {error && (
            <p role="alert" className="text-sm font-medium text-rose-600">
              {error}
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}
