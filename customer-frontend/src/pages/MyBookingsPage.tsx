import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CalendarDays,
  Check,
  KeyRound,
  Lock,
  MapPin,
  ShieldCheck,
  Sparkles,
  Ticket,
  UserRound,
  Users,
} from 'lucide-react';
import { Container, SectionHeading } from '@/components/ui/section';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button, buttonStyles } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/form';
import { Modal } from '@/components/ui/modal';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { BookingStatusBadge, PaymentStatusBadge } from '@/components/ui/status';
import { useToast } from '@/components/ui/toast';
import { useAsync } from '@/hooks/useAsync';
import { useMockDbVersion } from '@/hooks/useMockDbVersion';
import { useAuth } from '@/context/AuthContext';
import { bookings } from '@/services';
import { toUserMessage } from '@/services/errors';
import { loyaltyTierFor } from '@/lib/auth';
import { formatMMK } from '@/lib/currency';
import { formatDate, todayISO } from '@/lib/dates';
import { cn } from '@/lib/cn';
import type { Booking, UserProfile } from '@/types';

type Segment = 'upcoming' | 'active' | 'past' | 'cancelled';

const SEGMENTS: { id: Segment; label: string }[] = [
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'active', label: 'In-stay' },
  { id: 'past', label: 'Past' },
  { id: 'cancelled', label: 'Cancelled' },
];

function segmentOf(booking: Booking, today: string): Segment {
  if (booking.status === 'cancelled' || booking.status === 'no_show') return 'cancelled';
  if (booking.status === 'checked_in') return 'active';
  if (booking.status === 'checked_out') return 'past';
  if (booking.stay.checkOut < today) return 'past';
  return 'upcoming';
}

export function MyBookingsPage() {
  const { user } = useAuth();
  if (!user) return <MyBookingsSignInGate />;
  return <BookingsView user={user} />;
}

function BookingsView({ user }: { user: UserProfile }) {
  const navigate = useNavigate();
  const toast = useToast();
  const dbVersion = useMockDbVersion();
  const [segment, setSegment] = useState<Segment>('upcoming');
  const [lookupRef, setLookupRef] = useState('');
  const [lookupPin, setLookupPin] = useState('');
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookupBusy, setLookupBusy] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<Booking | null>(null);
  const [cancelBusy, setCancelBusy] = useState(false);

  const listQuery = useAsync(() => bookings.listMyBookings().then((r) => r.data), [dbVersion, user?.id]);

  const completedStays = (listQuery.data ?? []).filter((b) => b.status === 'checked_out').length;
  const stays = listQuery.data?.length ?? 0;

  const today = todayISO();
  const grouped = useMemo(() => {
    const map: Record<Segment, Booking[]> = { upcoming: [], active: [], past: [], cancelled: [] };
    for (const booking of listQuery.data ?? []) {
      map[segmentOf(booking, today)].push(booking);
    }
    for (const key of Object.keys(map) as Segment[]) {
      map[key].sort((a, b) => (a.stay.checkIn < b.stay.checkIn ? 1 : -1));
    }
    return map;
  }, [listQuery.data, today]);

  const doLookup = async () => {
    setLookupBusy(true);
    setLookupError(null);
    try {
      await bookings.lookupBooking(lookupRef.trim().toUpperCase(), lookupPin.trim());
      navigate(`/reservations/${lookupRef.trim().toUpperCase()}`);
    } catch (error) {
      setLookupError(toUserMessage(error));
    } finally {
      setLookupBusy(false);
    }
  };

  const confirmCancel = async () => {
    if (!cancelTarget) return;
    setCancelBusy(true);
    try {
      await bookings.cancelBooking(cancelTarget.reference, cancelTarget.pin);
      toast.success('Reservation cancelled', `${cancelTarget.reference} has been cancelled.`);
      setCancelTarget(null);
      listQuery.reload();
    } catch (error) {
      toast.error('We could not cancel this reservation', toUserMessage(error));
    } finally {
      setCancelBusy(false);
    }
  };

  return (
    <Container className="py-8">
      <SectionHeading
        eyebrow="My Account"
        title="My Bookings"
        description={`Welcome back, ${user.fullName.split(' ')[0]}. Manage your reservations, access folios and start your check-in.`}
        action={
          <Badge tone="lavender" className="h-7">
            {loyaltyTierFor(completedStays)} · {stays} stay{stays === 1 ? '' : 's'}
          </Badge>
        }
      />

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2">
            {SEGMENTS.map((item) => {
              const active = segment === item.id;
              const count = grouped[item.id].length;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSegment(item.id)}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors',
                    active ? 'bg-brand-700 text-white' : 'bg-lavender-100 text-ink-soft hover:bg-lavender-200',
                  )}
                >
                  {item.label}
                  <span
                    className={cn(
                      'rounded-full px-1.5 text-xs',
                      active ? 'bg-white/20 text-white' : 'bg-white text-ink-mute',
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-5">
            {listQuery.loading ? (
              <LoadingState label="Loading your reservations…" />
            ) : listQuery.error ? (
              <ErrorState description={listQuery.error} onRetry={listQuery.reload} />
            ) : grouped[segment].length === 0 ? (
              <EmptyState
                title={`No ${SEGMENTS.find((s) => s.id === segment)?.label.toLowerCase()} reservations`}
                description="When you book a stay it will appear here, complete with your QR check-in pass and folio."
                action={
                  <Link to="/search" className={buttonStyles('primary')}>
                    Find a room
                  </Link>
                }
              />
            ) : (
              <div className="space-y-4">
                {grouped[segment].map((booking) => (
                  <BookingRow
                    key={booking.reference}
                    booking={booking}
                    onCancel={() => setCancelTarget(booking)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        <aside className="lg:sticky lg:top-24 lg:h-fit">
          <Card className="p-5">
            <h2 className="inline-flex items-center gap-2 text-sm font-semibold text-ink">
              <KeyRound className="h-4 w-4 text-brand-600" aria-hidden="true" /> Open a reservation
            </h2>
            <p className="mt-1 text-xs text-ink-soft">
              Have a booking reference and PIN? Open the folio directly.
            </p>
            <form
              className="mt-4 space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                void doLookup();
              }}
            >
              <Field label="Booking reference" htmlFor="lookup-ref">
                <Input
                  id="lookup-ref"
                  placeholder="SF-89241-K7"
                  value={lookupRef}
                  onChange={(event) => setLookupRef(event.target.value.toUpperCase())}
                />
              </Field>
              <Field label="Booking PIN" htmlFor="lookup-pin" error={lookupError ?? undefined}>
                <Input
                  id="lookup-pin"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="••••"
                  value={lookupPin}
                  onChange={(event) => setLookupPin(event.target.value.replace(/\D/g, '').slice(0, 4))}
                  invalid={Boolean(lookupError)}
                />
              </Field>
              <Button type="submit" className="w-full" loading={lookupBusy} disabled={!lookupRef || lookupPin.length !== 4}>
                Open folio
              </Button>
            </form>
            <p className="mt-3 text-xs text-ink-mute">
              Tip: after confirming a booking, your reference and PIN appear on the QR pass screen.
            </p>
          </Card>
        </aside>
      </div>

      <Modal
        open={Boolean(cancelTarget)}
        onClose={() => (cancelBusy ? undefined : setCancelTarget(null))}
        title="Cancel this reservation?"
        description={
          cancelTarget
            ? `${cancelTarget.hotel.name} · ${cancelTarget.room.name} · ${formatDate(cancelTarget.stay.checkIn)}`
            : undefined
        }
        footer={
          <>
            <Button variant="ghost" onClick={() => setCancelTarget(null)} disabled={cancelBusy}>
              Keep reservation
            </Button>
            <Button variant="danger" loading={cancelBusy} onClick={confirmCancel}>
              Cancel reservation
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-soft">
          Refunds follow the cancellation matrix: free until 48 hours before check-in, 50% between 24–48 hours,
          and no refund within 24 hours. The final refund amount is calculated when you confirm.
        </p>
      </Modal>
    </Container>
  );
}

function MyBookingsSignInGate() {
  const { openSignIn } = useAuth();
  return (
    <Container className="py-8">
      <SectionHeading
        eyebrow="My Account"
        title="My Bookings"
        description="Sign in to see every reservation tied to your profile — upcoming, in-stay, past and cancelled."
        action={<Button onClick={openSignIn}>Sign in</Button>}
      />

      <Card className="mt-8 p-6 sm:p-8">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-lavender-100 text-brand-700">
          <UserRound className="h-6 w-6" aria-hidden="true" />
        </span>
        <h2 className="mt-4 text-xl font-bold tracking-tight text-ink sm:text-2xl">
          Sign in to view your bookings
        </h2>
        <p className="mt-2 max-w-xl text-sm text-ink-soft">
          Your reservations are tied to your account so we can keep your folio, QR check-in pass and stay
          history private. Sign in with Google, your phone number or email to continue.
        </p>

        <ul className="mt-5 max-w-xl space-y-2.5">
          {[
            'See upcoming, in-stay, past and cancelled reservations',
            'Open your folio and QR express check-in pass',
            'Request in-stay services and manage your stay',
          ].map((perk) => (
            <li key={perk} className="flex items-start gap-2.5 text-sm text-ink-soft">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                <Check className="h-3 w-3" aria-hidden="true" />
              </span>
              {perk}
            </li>
          ))}
        </ul>

        <Button
          size="lg"
          className="mt-6 w-full sm:w-auto"
          onClick={openSignIn}
          leadingIcon={<UserRound className="h-4 w-4" aria-hidden="true" />}
        >
          Sign in or create an account
        </Button>

        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-ink-mute">
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> Demo sign-in, no real credentials
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5" aria-hidden="true" /> Your bookings stay on this device
          </span>
        </div>
      </Card>
    </Container>
  );
}

function BookingRow({ booking, onCancel }: { booking: Booking; onCancel: () => void }) {
  const cancellable = booking.status === 'confirmed' || booking.status === 'pending';
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-ink">{booking.hotel.name}</h3>
            <BookingStatusBadge status={booking.status} />
            <PaymentStatusBadge status={booking.paymentStatus} />
          </div>
          <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-ink-soft">
            <MapPin className="h-3.5 w-3.5 text-brand-500" aria-hidden="true" />
            {booking.hotel.address.city} · {booking.room.name}
          </p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-brand-800">{formatMMK(booking.price.total)}</p>
          <p className="font-mono text-xs text-ink-mute">{booking.reference}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-ink-mute">
        <span className="inline-flex items-center gap-1.5">
          <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
          {formatDate(booking.stay.checkIn)} → {formatDate(booking.stay.checkOut)} ({booking.nights} night
          {booking.nights === 1 ? '' : 's'})
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5" aria-hidden="true" />
          {booking.adults} adult{booking.adults === 1 ? '' : 's'}
        </span>
        {booking.roomNumber ? (
          <span className="inline-flex items-center gap-1.5">
            <Ticket className="h-3.5 w-3.5" aria-hidden="true" /> Room {booking.roomNumber}
          </span>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link to={`/reservations/${booking.reference}`} className={buttonStyles('primary', 'sm')}>
          View details <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
        <Link to={`/confirmation/${booking.reference}`} className={buttonStyles('outline', 'sm')}>
          <Ticket className="h-3.5 w-3.5" aria-hidden="true" /> Check-in pass
        </Link>
        {booking.status === 'checked_in' ? (
          <Link to={`/reservations/${booking.reference}/services`} className={buttonStyles('outline', 'sm')}>
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> Guest services
          </Link>
        ) : null}
        {cancellable ? (
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
      </div>
    </Card>
  );
}