import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Coffee,
  ConciergeBell,
  Droplets,
  KeyRound,
  Send,
  Sparkles,
  UtensilsCrossed,
  Wrench,
} from 'lucide-react';
import { Container, SectionHeading } from '@/components/ui/section';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button, buttonStyles } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/form';
import { EmptyState, LoadingState } from '@/components/ui/states';
import { useAsync } from '@/hooks/useAsync';
import { useMockDbVersion } from '@/hooks/useMockDbVersion';
import { bookings } from '@/services';
import { toUserMessage } from '@/services/errors';
import { formatDate } from '@/lib/dates';

const FEATURES = [
  { icon: Droplets, title: 'Amenities & towels', body: 'Fresh linens, towels, pillows and bath amenities to your door.' },
  { icon: UtensilsCrossed, title: 'In-room dining', body: 'Order from the all-day menu with live delivery tracking.' },
  { icon: Sparkles, title: 'Housekeeping', body: 'Turndown, extra cleaning or quiet-arrival preparation.' },
  { icon: Wrench, title: 'Maintenance', body: 'AC, lighting or connectivity — engineering on standby.' },
  { icon: Coffee, title: 'Refreshments', body: 'Minibar restock, tea, coffee and water on demand.' },
  { icon: ConciergeBell, title: 'Anything else', body: 'Tours, transport, celebrations — just ask the concierge.' },
];

export function GuestServicesEntryPage() {
  const navigate = useNavigate();
  const dbVersion = useMockDbVersion();
  const listQuery = useAsync(() => bookings.listMyBookings().then((r) => r.data), [dbVersion]);
  const [ref, setRef] = useState('');
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const eligible = (listQuery.data ?? []).filter(
    (booking) => booking.status === 'checked_in' || booking.status === 'confirmed',
  );

  const open = async () => {
    setBusy(true);
    setError(null);
    try {
      await bookings.lookupBooking(ref.trim().toUpperCase(), pin.trim());
      navigate(`/reservations/${ref.trim().toUpperCase()}/services`);
    } catch (err) {
      setError(toUserMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Container className="py-8">
      <div className="rounded-3xl border border-brand-900/5 bg-gradient-to-br from-brand-50 via-white to-lavender-100 p-6 sm:p-10">
        <Badge tone="brand">24/7 In-stay services</Badge>
        <h1 className="mt-4 max-w-2xl text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          Everything you need, delivered to your suite
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-ink-soft sm:text-base">
          Tap once to request towels, dining, housekeeping or maintenance. Track each request live from your tap
          to the knock at your door — part of StayEase’s zero-waiting-time smart hospitality.
        </p>
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0">
          <SectionHeading
            title="Your active stays"
            description="Guest services are available for reservations that are currently checked in."
          />

          <div className="mt-5">
            {listQuery.loading ? (
              <LoadingState label="Checking your stays…" />
            ) : eligible.length === 0 ? (
              <EmptyState
                title="No in-house stay right now"
                description="Once you check in, your active reservation appears here so you can start requesting services. You can also open a stay with your reference and PIN."
                icon={<ConciergeBell className="h-6 w-6" aria-hidden="true" />}
                action={
                  <Link to="/bookings" className={buttonStyles('primary')}>
                    View my bookings
                  </Link>
                }
              />
            ) : (
              <div className="space-y-4">
                {eligible.map((booking) => (
                  <Card key={booking.reference} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-semibold text-ink">{booking.hotel.name}</h3>
                        <Badge tone={booking.status === 'checked_in' ? 'green' : 'brand'}>
                          {booking.status === 'checked_in' ? 'Checked in' : 'Confirmed'}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-ink-soft">
                        {booking.room.name} · {formatDate(booking.stay.checkIn)} – {formatDate(booking.stay.checkOut)}
                        {booking.roomNumber ? ` · Room ${booking.roomNumber}` : ''}
                      </p>
                      <p className="mt-0.5 font-mono text-xs text-ink-mute">{booking.reference}</p>
                    </div>
                    <Link to={`/reservations/${booking.reference}/services`} className={buttonStyles('primary', 'md')}>
                      Open services <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <Card key={feature.title} className="p-5">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                  <feature.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="mt-3 text-sm font-semibold text-ink">{feature.title}</h3>
                <p className="mt-1 text-xs text-ink-soft">{feature.body}</p>
              </Card>
            ))}
          </div>
        </div>

        <aside className="lg:sticky lg:top-24 lg:h-fit">
          <Card className="p-5">
            <h2 className="inline-flex items-center gap-2 text-sm font-semibold text-ink">
              <KeyRound className="h-4 w-4 text-brand-600" aria-hidden="true" /> Open a stay
            </h2>
            <p className="mt-1 text-xs text-ink-soft">
              Enter your booking reference and PIN to access services for that stay.
            </p>
            <form
              className="mt-4 space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                void open();
              }}
            >
              <Field label="Booking reference" htmlFor="gs-ref">
                <Input
                  id="gs-ref"
                  placeholder="SF-89241-K7"
                  value={ref}
                  onChange={(event) => setRef(event.target.value.toUpperCase())}
                />
              </Field>
              <Field label="Booking PIN" htmlFor="gs-pin" error={error ?? undefined}>
                <Input
                  id="gs-pin"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="••••"
                  value={pin}
                  onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 4))}
                  invalid={Boolean(error)}
                />
              </Field>
              <Button type="submit" className="w-full" loading={busy} disabled={!ref || pin.length !== 4} leadingIcon={<Send className="h-4 w-4" aria-hidden="true" />}>
                Open services
              </Button>
            </form>
            <p className="mt-3 text-xs text-ink-mute">
              Demo tip: reservation <span className="font-mono text-ink">SF-2026-8812</span> is checked in and
              ready for service requests.
            </p>
          </Card>
        </aside>
      </div>
    </Container>
  );
}