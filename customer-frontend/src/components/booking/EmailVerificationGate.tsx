import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Lock,
  Mail,
  RefreshCw,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { Container } from '@/components/ui/section';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ImageWithFallback } from '@/components/ui/image';
import { LoadingState } from '@/components/ui/states';
import { PriceSummary } from '@/components/booking/PriceSummary';
import { useAsync } from '@/hooks/useAsync';
import { useStayQuery } from '@/hooks/useStayQuery';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/toast';
import { hotels } from '@/services';
import { computeBreakdown } from '@/lib/pricing';
import { formatRange } from '@/lib/dates';

export function EmailVerificationGate() {
  const { roomId = '' } = useParams();
  const stay = useStayQuery();
  const { user, refreshUser, resendVerificationEmail, signOut } = useAuth();
  const toast = useToast();

  const [refreshing, setRefreshing] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  const roomQuery = useAsync(() => hotels.getRoom(roomId).then((r) => r.data), [roomId]);
  const room = roomQuery.data?.room ?? null;
  const hotel = roomQuery.data?.hotel ?? null;
  const ratePlan =
    roomQuery.data?.ratePlans.find((plan) => plan.recommended) ?? roomQuery.data?.ratePlans[0] ?? null;
  const breakdown = ratePlan
    ? computeBreakdown({ ratePlan, nights: stay.nights, rooms: stay.rooms })
    : null;

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const refreshed = await refreshUser();
      if (refreshed?.isEmailVerified) {
        toast.success('Email confirmed!', 'You can now proceed with your reservation.');
      } else {
        toast.info(
          'Email not verified yet',
          'Please click the confirmation link in the email we sent you.',
        );
      }
    } catch {
      toast.error('Could not check status', 'Please try again in a moment.');
    } finally {
      setRefreshing(false);
    }
  };

  const onResend = async () => {
    if (!user?.email) return;
    setResending(true);
    try {
      await resendVerificationEmail(user.email);
      setResendCooldown(60);
      toast.info('Verification link resent', `Please check your inbox at ${user.email}.`);
    } catch (err: unknown) {
      toast.error('Resend failed', err instanceof Error ? err.message : 'Please try again later.');
    } finally {
      setResending(false);
    }
  };

  return (
    <Container className="py-8">
      <Link
        to={`/rooms/${roomId}${stay.queryString}`}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to suite details
      </Link>

      <div className="mt-4 grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="min-w-0 space-y-6">
          {room && hotel ? (
            <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
              <div className="h-24 w-full shrink-0 overflow-hidden rounded-xl sm:w-32">
                <ImageWithFallback
                  src={room.images[0]?.src ?? hotel.heroImage}
                  alt={room.name}
                  seed={room.id}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="min-w-0">
                <Badge tone="lavender">{hotel.address.city}</Badge>
                <h2 className="mt-2 text-lg font-semibold text-ink">{room.name}</h2>
                <p className="text-sm text-ink-soft">{hotel.name}</p>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-mute">
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                    {formatRange(stay.checkIn, stay.checkOut)} · {stay.nights} night
                    {stay.nights === 1 ? '' : 's'}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" aria-hidden="true" />
                    {stay.adults} adult{stay.adults === 1 ? '' : 's'} · {stay.rooms} room
                    {stay.rooms === 1 ? '' : 's'}
                  </span>
                </div>
              </div>
            </Card>
          ) : roomQuery.loading ? (
            <Card className="p-5">
              <LoadingState label="Preparing your reservation…" />
            </Card>
          ) : null}

          <Card className="p-6">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
              <Mail className="h-6 w-6" aria-hidden="true" />
            </span>
            <h1 className="mt-4 text-xl font-bold tracking-tight text-ink sm:text-2xl">
              Verify your email to complete this booking
            </h1>
            <p className="mt-2 text-sm text-ink-soft">
              To protect your stay and ensure you receive booking confirmations, folios, and instant check-in
              passes, email verification is required before reserving rooms.
            </p>

            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-sm text-amber-900">
              <p>
                We have dispatched a verification link to <strong className="text-ink">{user?.email}</strong>.
                Please open your email client and click the verification link.
              </p>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button
                size="lg"
                loading={refreshing}
                onClick={onRefresh}
                leadingIcon={<RefreshCw className="h-4 w-4" aria-hidden="true" />}
              >
                I’ve clicked the link · Continue booking
              </Button>

              <Button
                variant="secondary"
                size="lg"
                disabled={resending || resendCooldown > 0}
                loading={resending}
                onClick={onResend}
              >
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend verification email'}
              </Button>
            </div>

            <div className="mt-6 border-t border-brand-900/10 pt-4 flex items-center justify-between text-xs text-ink-soft">
              <span>Signed in as {user?.email}</span>
              <button
                type="button"
                onClick={signOut}
                className="font-medium text-brand-700 hover:underline"
              >
                Sign out or switch account
              </button>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-ink-mute">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> Verified email required for all bookings
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5" aria-hidden="true" /> Supabase Auth protected
              </span>
            </div>
          </Card>
        </div>

        <aside className="lg:sticky lg:top-24 lg:h-fit">
          {ratePlan && breakdown ? (
            <PriceSummary
              ratePlan={ratePlan}
              stay={{ checkIn: stay.checkIn, checkOut: stay.checkOut }}
              breakdown={breakdown}
              footer={
                <p className="flex items-center gap-1.5 text-xs text-ink-mute">
                  <CheckCircle2 className="h-3.5 w-3.5 text-amber-600" aria-hidden="true" />
                  Verify your email to finalize payment and receive your folio.
                </p>
              }
            />
          ) : (
            <Card className="p-5">
              <p className="inline-flex items-center gap-1.5 text-sm text-ink-soft">
                Verify your email to see your complete stay itinerary.
              </p>
            </Card>
          )}
        </aside>
      </div>
    </Container>
  );
}
