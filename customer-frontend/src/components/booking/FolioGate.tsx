import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, KeyRound, Lock, Mail, Phone, ShieldQuestion, UserRound } from 'lucide-react';
import { Container } from '@/components/ui/section';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/form';
import { useAuth } from '@/context/AuthContext';
import { bookings } from '@/services';
import { toUserMessage } from '@/services/errors';
import { grantAccess } from '@/lib/access';
import { matchesProfile } from '@/lib/auth';
import { useAsync } from '@/hooks/useAsync';

/**
 * Access gate shown when a folio cannot be opened automatically.
 *
 * Reserved folios are PIN-protected: enter the 4-digit PIN issued at booking.
 * For guests who forgot it there is a recovery panel — open with the matching
 * account or verify with a one-time code sent to the booking's contact details.
 */
export function FolioGate({
  reference,
  onGranted,
  title = 'Folio protection',
}: {
  reference: string;
  onGranted: () => void;
  title?: string;
}) {
  const { user, openSignIn } = useAuth();
  const navigate = useNavigate();
  const bookingQuery = useAsync(() => bookings.getBooking(reference).then((r) => r.data), [reference]);
  const booking = bookingQuery.data ?? null;

  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [recoveryBusy, setRecoveryBusy] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [demoCode, setDemoCode] = useState('');
  const [enteredCode, setEnteredCode] = useState('');

  const openViaPin = async () => {
    setBusy(true);
    setError(null);
    try {
      await bookings.lookupBooking(reference, pin.trim());
      grantAccess(reference, pin.trim());
      onGranted();
    } catch (err) {
      setError(toUserMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const openViaAccount = () => {
    if (!booking || !user) return;
    setRecoveryBusy(true);
    setRecoveryError(null);
    try {
      if (!matchesProfile(booking.guest, user)) {
        setRecoveryError(
          'This folio is linked to a different guest email or phone. Sign in with the account used to book, or verify with a one-time code.',
        );
        return;
      }
      grantAccess(booking.reference, booking.pin);
      onGranted();
    } finally {
      setRecoveryBusy(false);
    }
  };

  const sendCode = () => {
    if (!booking) return;
    setRecoveryError(null);
    setCodeSent(true);
    setEnteredCode('');
    setDemoCode(String(Math.floor(100000 + Math.random() * 900000)));
  };

  const openViaCode = () => {
    if (!booking) return;
    setRecoveryBusy(true);
    setRecoveryError(null);
    try {
      if (enteredCode !== demoCode) {
        setRecoveryError('That code did not match. Double-check it and try again.');
        return;
      }
      grantAccess(booking.reference, booking.pin);
      onGranted();
    } finally {
      setRecoveryBusy(false);
    }
  };

  const email = booking?.guest.email ?? '';
  const phone = booking ? `${booking.guest.phoneCountryCode ?? ''} ${booking.guest.phone}`.trim() : '';
  const maskedEmail = maskEmail(email);
  const maskedPhone = maskPhone(phone);
  const contact = maskedEmail || maskedPhone || 'the booking contact';

  return (
    <Container className="py-8">
      <div className="mx-auto max-w-md">
        <button
          type="button"
          onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/bookings'))}
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Go back
        </button>
        <Card className="p-6">
        <div className="text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-lavender-100 text-brand-700">
            <Lock className="h-6 w-6" aria-hidden="true" />
          </span>
          <h1 className="mt-4 text-xl font-semibold text-ink">{title}</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Enter the 4-digit PIN issued with this booking to open folio{' '}
            <span className="font-medium text-ink">{reference}</span>.
          </p>
        </div>

        <form
          className="mt-5 space-y-4 text-left"
          onSubmit={(event) => {
            event.preventDefault();
            void openViaPin();
          }}
        >
          <Field label="Booking PIN" htmlFor="gate-pin" error={error ?? undefined}>
            <Input
              id="gate-pin"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={4}
              placeholder="••••"
              value={pin}
              onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 4))}
              invalid={Boolean(error)}
            />
          </Field>
          <Button type="submit" className="w-full" loading={busy} disabled={pin.length !== 4}>
            Open my folio
          </Button>
        </form>

        {!recoveryOpen ? (
          <button
            type="button"
            onClick={() => setRecoveryOpen(true)}
            className="mt-4 flex w-full items-center justify-center gap-1.5 text-sm font-medium text-brand-700 hover:underline"
          >
            <ShieldQuestion className="h-4 w-4" aria-hidden="true" /> I forgot my PIN
          </button>
        ) : (
          <div className="mt-5 rounded-2xl border border-brand-900/10 bg-lavender-100/40 p-4">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-ink">
              <KeyRound className="h-4 w-4 text-brand-600" aria-hidden="true" /> Forgot your PIN? Get another way in
            </p>

            {user ? (
              <button
                type="button"
                onClick={openViaAccount}
                disabled={!booking || recoveryBusy}
                className="mt-3 flex w-full items-center gap-3 rounded-xl border border-brand-900/10 bg-white px-3 py-2.5 text-left text-sm transition-colors hover:border-brand-400 disabled:cursor-not-allowed disabled:opacity-55"
              >
                <UserRound className="h-5 w-5 shrink-0 text-brand-600" aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block font-medium text-ink">Open with my account</span>
                  <span className="block text-xs text-ink-soft">Signed in as {user.fullName}</span>
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={openSignIn}
                className="mt-3 flex w-full items-center gap-3 rounded-xl border border-brand-900/10 bg-white px-3 py-2.5 text-left text-sm transition-colors hover:border-brand-400"
              >
                <UserRound className="h-5 w-5 shrink-0 text-brand-600" aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block font-medium text-ink">Sign in to try your account</span>
                  <span className="block text-xs text-ink-soft">
                    Bookings made while signed in can be opened without the PIN.
                  </span>
                </span>
              </button>
            )}

            <div className="my-3 flex items-center gap-3 text-xs text-ink-mute" aria-hidden="true">
              <span className="h-px flex-1 bg-brand-900/10" /> or <span className="h-px flex-1 bg-brand-900/10" />
            </div>

            {!codeSent ? (
              <button
                type="button"
                onClick={sendCode}
                disabled={!booking || recoveryBusy}
                className="flex w-full items-center gap-3 rounded-xl border border-brand-900/10 bg-white px-3 py-2.5 text-left text-sm transition-colors hover:border-brand-400 disabled:cursor-not-allowed disabled:opacity-55"
              >
                <Mail className="h-5 w-5 shrink-0 text-brand-600" aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block font-medium text-ink">Send me a one-time code</span>
                  <span className="block text-xs text-ink-soft">We’ll verify you at {contact}</span>
                </span>
              </button>
            ) : (
              <form
                className="space-y-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  openViaCode();
                }}
              >
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                  Demo mode — a verification link would be emailed to {contact}. Your demo code is{' '}
                  <span className="font-mono font-bold">{demoCode}</span>
                </div>
                <Field label="Confirmation code" htmlFor="recovery-code">
                  <Input
                    id="recovery-code"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="••••••"
                    value={enteredCode}
                    onChange={(event) => setEnteredCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                  />
                </Field>
                <Button type="submit" className="w-full" loading={recoveryBusy} disabled={enteredCode.length !== 6}>
                  Verify and open
                </Button>
              </form>
            )}

            {booking?.hotel?.hotline ? (
              <p className="mt-3 inline-flex items-start gap-1.5 text-xs text-ink-soft">
                <Phone className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-600" aria-hidden="true" />
                Still stuck? Call <a href={`tel:${booking.hotel.hotline.replace(/\s/g, '')}`} className="font-medium text-brand-700 hover:underline">{booking.hotel.hotline}</a> — our team can restore your PIN after verifying your identity.
              </p>
            ) : null}

            {recoveryError ? (
              <p role="alert" className="mt-2 text-xs font-medium text-rose-600">
                {recoveryError}
              </p>
            ) : null}
          </div>
        )}

        <Link to="/bookings" className="mt-5 inline-block w-full text-center text-sm font-medium text-brand-700 hover:underline">
          Find a reservation instead
        </Link>
      </Card>
      </div>
    </Container>
  );
}

function maskEmail(email: string): string {
  if (!email) return '';
  const at = email.indexOf('@');
  if (at <= 0) return email;
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  const visible = local.length <= 2 ? local[0] ?? '' : `${local.slice(0, 2)}${'•'.repeat(Math.max(2, local.length - 2))}`;
  return `${visible}@${domain}`;
}

function maskPhone(phone: string): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return '••••';
  return `${phone.slice(0, 3).trim()} •• ${digits.slice(-2)}`;
}