import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  BadgeCheck,
  CalendarDays,
  Check,
  Lock,
  ShieldCheck,
  Sparkles,
  UserRound,
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
import { hotels } from '@/services';
import { computeBreakdown } from '@/lib/pricing';
import { formatRange } from '@/lib/dates';

const PERKS = [
  'Issue your folio and instant QR express check-in pass',
  'Trace your reservation status any time from your profile',
  'Manage payments, preferences and in-stay service requests',
];

/**
 * Shown instead of the checkout flow when an anonymous guest tries to book.
 * Browsing is open to everyone; an account is only needed to confirm a stay.
 * Once the guest signs in, `BookPage` re-renders into the live flow.
 */
export function BookingAuthGate() {
  const { roomId = '' } = useParams();
  const stay = useStayQuery();
  const { openSignIn } = useAuth();

  const roomQuery = useAsync(() => hotels.getRoom(roomId).then((r) => r.data), [roomId]);
  const room = roomQuery.data?.room ?? null;
  const hotel = roomQuery.data?.hotel ?? null;
  const ratePlan =
    roomQuery.data?.ratePlans.find((plan) => plan.recommended) ?? roomQuery.data?.ratePlans[0] ?? null;
  const breakdown = ratePlan
    ? computeBreakdown({ ratePlan, nights: stay.nights, rooms: stay.rooms })
    : null;

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
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-lavender-100 text-brand-700">
              <UserRound className="h-6 w-6" aria-hidden="true" />
            </span>
            <h1 className="mt-4 text-xl font-bold tracking-tight text-ink sm:text-2xl">
              Create an account to confirm your booking
            </h1>
            <p className="mt-2 text-sm text-ink-soft">
              You can explore rooms, compare rates and pick dates freely — no account required. To reserve this
              suite we just need a quick sign-in with Google, your phone number or email. We’ll then continue
              your booking and set up your folio.
            </p>

            <ul className="mt-5 space-y-2.5">
              {PERKS.map((perk) => (
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
                <Lock className="h-3.5 w-3.5" aria-hidden="true" /> Your details stay on this device
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
                  <Sparkles className="h-3.5 w-3.5 text-brand-500" aria-hidden="true" />
                  Sign in to add enhancements and choose how to pay.
                </p>
              }
            />
          ) : (
            <Card className="p-5">
              <p className="inline-flex items-center gap-1.5 text-sm text-ink-soft">
                <BadgeCheck className="h-4 w-4 text-brand-600" aria-hidden="true" />
                Sign in to see your full reservation summary.
              </p>
            </Card>
          )}
        </aside>
      </div>
    </Container>
  );
}
