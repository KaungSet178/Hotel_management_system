import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Bath,
  BedDouble,
  CalendarDays,
  Check,
  Clock,
  Expand,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { Container } from '@/components/ui/section';
import { Badge } from '@/components/ui/badge';
import { Rating } from '@/components/ui/rating';
import { Card } from '@/components/ui/card';
import { Button, buttonStyles } from '@/components/ui/button';
import { Input } from '@/components/ui/form';
import { Gallery } from '@/components/hotel/Gallery';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { useAsync } from '@/hooks/useAsync';
import { useStayQuery } from '@/hooks/useStayQuery';
import { hotels } from '@/services';
import { computeBreakdown } from '@/lib/pricing';
import { formatMMK } from '@/lib/currency';
import { addDaysISO, formatRange, todayPlus } from '@/lib/dates';

const HIGHLIGHTS: Record<string, { title: string; body: string; icon: typeof Sparkles }[]> = {
  default: [
    {
      title: 'Acoustically Calibrated',
      body: 'Sound-dampening architectural glazing ensures zero street intrusion for unhindered focus.',
      icon: ShieldCheck,
    },
    {
      title: 'Southern Exposure',
      body: 'Breathtaking natural light from dawn to sunset with automated sun louvers.',
      icon: Sparkles,
    },
    {
      title: 'Private Hydro-Lounge',
      body: 'Deep-soaking composite stone tub framed against a private frosted lightwell.',
      icon: Bath,
    },
  ],
};

export function RoomDetailPage() {
  const { roomId = '' } = useParams();
  const stay = useStayQuery();
  const [, setSearchParams] = useSearchParams();
  const [isChangingDates, setIsChangingDates] = useState(false);

  const roomQuery = useAsync(() => hotels.getRoom(roomId).then((r) => r.data), [roomId]);
  const availabilityQuery = useAsync(
    () =>
      hotels
        .checkAvailability(roomId, { checkIn: stay.checkIn, checkOut: stay.checkOut })
        .then((r) => r.data),
    [roomId, stay.checkIn, stay.checkOut],
  );

  if (roomQuery.loading) {
    return (
      <Container className="py-16">
        <LoadingState label="Loading suite details…" />
      </Container>
    );
  }

  if (roomQuery.error || !roomQuery.data) {
    return (
      <Container className="py-16">
        <ErrorState
          title="We couldn't load this suite"
          description={roomQuery.error ?? 'This room is no longer available.'}
          onRetry={roomQuery.reload}
        />
      </Container>
    );
  }

  const { room, hotel, ratePlans } = roomQuery.data;
  const flexible = ratePlans.find((plan) => plan.id === 'flexible') ?? ratePlans[0];
  const breakdown = computeBreakdown({ ratePlan: flexible, nights: stay.nights });
  const available = availabilityQuery.data?.available ?? true;
  const roomsLeft = availabilityQuery.data?.roomsLeft ?? room.inventory;
  const highlights = HIGHLIGHTS.default;

  return (
    <Container className="py-8">
      <nav className="flex flex-wrap items-center gap-1.5 text-sm text-ink-mute" aria-label="Breadcrumb">
        <Link to="/" className="hover:text-brand-700">
          Home
        </Link>
        <span aria-hidden="true">/</span>
        <Link to={`/search${stay.queryString}`} className="hover:text-brand-700">
          Find Rooms
        </Link>
        <span aria-hidden="true">/</span>
        <span className="font-medium text-ink">{room.name}</span>
      </nav>

      <div className="mt-4 grid gap-8 lg:grid-cols-[1.5fr_1fr]">
        <div>
          <Gallery images={room.images} />

          <div className="mt-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">
              {room.wing} · {room.floorRange}
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink">{room.name}</h1>
            <p className="mt-1 text-sm text-ink-mute">{hotel.name}</p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <Rating value={room.rating} count={room.reviewCount} size="md" />
              {room.tags.map((tag) => (
                <Badge key={tag} tone="lavender">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-soft">
            <span className="inline-flex items-center gap-2">
              <Users className="h-4 w-4 text-brand-500" aria-hidden="true" /> Max {room.maxGuests} guests
            </span>
            <span className="inline-flex items-center gap-2">
              <BedDouble className="h-4 w-4 text-brand-500" aria-hidden="true" /> {room.bedConfiguration}
            </span>
            <span className="inline-flex items-center gap-2">
              <Expand className="h-4 w-4 text-brand-500" aria-hidden="true" /> {room.areaSqm} m² (
              {Math.round(room.areaSqm * 10.7639)} sq ft)
            </span>
          </div>

          <section className="mt-8">
            <h2 className="text-lg font-semibold text-ink">Suite architecture &amp; character</h2>
            <p className="mt-3 text-sm leading-relaxed text-ink-soft">
              {room.longDescription ?? room.description} Perched within {hotel.name}, every material choice
              reflects natural warmth — quarter-sawn teak millwork, brushed nickel trim and locally sourced
              woven silk textiles. Double-glazed floor-to-ceiling glass isolates your quarters while
              revealing uninterrupted views across the water.
            </p>
          </section>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {highlights.map((highlight) => (
              <Card key={highlight.title} className="p-5">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                  <highlight.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="mt-3 text-sm font-semibold text-ink">{highlight.title}</h3>
                <p className="mt-1 text-xs text-ink-soft">{highlight.body}</p>
              </Card>
            ))}
          </div>

          <section className="mt-8">
            <h2 className="text-lg font-semibold text-ink">Included amenities &amp; services</h2>
            <ul className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {room.amenities.map((amenity) => (
                <li key={amenity} className="flex items-center gap-2 text-sm text-ink-soft">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                    <Check className="h-3 w-3" aria-hidden="true" />
                  </span>
                  {amenity}
                </li>
              ))}
            </ul>
          </section>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <Card className="p-5">
              <h3 className="inline-flex items-center gap-2 text-sm font-semibold text-ink">
                <Clock className="h-4 w-4 text-brand-600" aria-hidden="true" /> Check-in &amp; check-out
              </h3>
              <ul className="mt-2 space-y-1 text-sm text-ink-soft">
                <li>Standard check-in: {hotel.checkInTime}</li>
                <li>Standard check-out: {hotel.checkOutTime}</li>
                <li>Contactless mobile key &amp; QR express check-in enabled</li>
              </ul>
            </Card>
            <Card className="p-5">
              <h3 className="inline-flex items-center gap-2 text-sm font-semibold text-ink">
                <ShieldCheck className="h-4 w-4 text-brand-600" aria-hidden="true" /> Cancellation policy
              </h3>
              <ul className="mt-2 space-y-1 text-sm text-ink-soft">
                <li>Free cancellation until 48 hours before check-in</li>
                <li>100% refundable on flexible rates prior to arrival window</li>
                <li>Non-refundable saver rate available at a 15% discount</li>
              </ul>
            </Card>
          </div>
        </div>

        {/* Sticky booking rail */}
        <aside className="lg:sticky lg:top-24 lg:h-fit">
          <Card className="p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-ink-mute">
                Booking Details
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsChangingDates((v) => !v)}
                className="h-7 px-2 text-xs text-brand-700 hover:text-brand-900"
                aria-expanded={isChangingDates}
              >
                <CalendarDays className="mr-1 h-3.5 w-3.5 text-brand-600" aria-hidden="true" />
                {isChangingDates ? 'Done' : 'Change dates'}
              </Button>
            </div>

            {isChangingDates && (
              <div className="mt-3 rounded-xl border border-brand-900/10 bg-lavender-50/70 p-3 text-xs">
                <p className="mb-2 font-semibold text-ink">Adjust dates for live availability &amp; pricing</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label htmlFor="rail-checkin" className="mb-1 block text-[11px] font-medium text-ink-soft">
                      Check-in
                    </label>
                    <Input
                      id="rail-checkin"
                      type="date"
                      value={stay.checkIn}
                      min={todayPlus(0)}
                      onChange={(e) => {
                        const newIn = e.target.value;
                        const minOut = addDaysISO(newIn, 1);
                        const newOut = stay.checkOut <= newIn ? minOut : stay.checkOut;
                        setSearchParams((prev) => {
                          const n = new URLSearchParams(prev);
                          n.set('in', newIn);
                          n.set('out', newOut);
                          return n;
                        });
                      }}
                      className="h-8 bg-white px-2 py-1 text-xs"
                    />
                  </div>
                  <div>
                    <label htmlFor="rail-checkout" className="mb-1 block text-[11px] font-medium text-ink-soft">
                      Check-out
                    </label>
                    <Input
                      id="rail-checkout"
                      type="date"
                      value={stay.checkOut}
                      min={addDaysISO(stay.checkIn, 1)}
                      onChange={(e) => {
                        const newOut = e.target.value;
                        setSearchParams((prev) => {
                          const n = new URLSearchParams(prev);
                          n.set('out', newOut);
                          return n;
                        });
                      }}
                      className="h-8 bg-white px-2 py-1 text-xs"
                    />
                  </div>
                </div>
              </div>
            )}

            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-ink-soft">Dates of stay</dt>
                <dd className="font-medium text-ink">
                  {formatRange(stay.checkIn, stay.checkOut)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-ink-soft">Duration</dt>
                <dd className="font-medium text-ink">
                  {stay.nights} night{stay.nights === 1 ? '' : 's'}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-ink-soft">Occupancy</dt>
                <dd className="font-medium text-ink">
                  {stay.adults} adult{stay.adults === 1 ? '' : 's'} · {stay.rooms} room
                  {stay.rooms === 1 ? '' : 's'}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-ink-soft">Room numbers</dt>
                <dd className="font-medium text-ink">{room.roomNumbers}</dd>
              </div>
            </dl>

            <div className="my-4 border-t border-dashed border-brand-900/12" />

            <h3 className="text-sm font-semibold text-ink">Transparent pricing breakdown</h3>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-ink-soft">
                  {formatMMK(flexible.nightlyRate)} × {stay.nights} night
                  {stay.nights === 1 ? '' : 's'}
                </dt>
                <dd className="font-medium text-ink">{formatMMK(breakdown.subtotal)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-ink-soft">Service charge (10%)</dt>
                <dd className="font-medium text-ink">{formatMMK(breakdown.serviceCharge)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-ink-soft">Commercial tax (5%)</dt>
                <dd className="font-medium text-ink">{formatMMK(breakdown.tax)}</dd>
              </div>
            </dl>
            <div className="mt-4 flex items-center justify-between gap-3 border-t border-brand-900/12 pt-4">
              <span className="text-sm font-semibold text-ink">Total estimated price</span>
              <span className="text-lg font-bold text-brand-800">{formatMMK(breakdown.total)}</span>
            </div>
            <p className="mt-1 text-xs text-ink-mute">Taxes &amp; resort fees included</p>

            {availabilityQuery.loading ? (
              <p className="mt-4 text-xs text-ink-mute">Checking availability…</p>
            ) : available ? (
              <p className="mt-4 text-xs font-medium text-emerald-700">
                {roomsLeft <= 3
                  ? `Only ${roomsLeft} room${roomsLeft === 1 ? '' : 's'} left for these dates`
                  : 'Available for your selected dates'}
              </p>
            ) : (
              <p className="mt-4 text-xs font-medium text-rose-600">
                Fully booked for {formatRange(stay.checkIn, stay.checkOut)}. Try different dates.
              </p>
            )}

            {available ? (
              <Link
                to={`/book/${room.id}${stay.queryString}`}
                className={buttonStyles('primary', 'lg', 'mt-4 w-full')}
              >
                Continue to Booking
              </Link>
            ) : (
              <Button variant="secondary" size="lg" className="mt-4 w-full" disabled>
                <X className="h-4 w-4" aria-hidden="true" /> Unavailable for selected dates
              </Button>
            )}

            <ul className="mt-4 space-y-2 text-xs text-ink-soft">
              <li className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 text-brand-500" aria-hidden="true" /> Instant confirmation —
                folio issued in seconds
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 text-brand-500" aria-hidden="true" /> Flexible options — pay
                at hotel or prepaid
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 text-brand-500" aria-hidden="true" /> Best rate guarantee —
                official direct portal
              </li>
            </ul>
          </Card>

          <Link
            to={`/search${stay.queryString}`}
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:underline"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to available rooms
          </Link>
        </aside>
      </div>
    </Container>
  );
}