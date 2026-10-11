import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Briefcase,
  Coffee,
  ConciergeBell,
  Droplets,
  Send,
  Sparkles,
  UtensilsCrossed,
  Wrench,
} from 'lucide-react';
import { Container } from '@/components/ui/section';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button, buttonStyles } from '@/components/ui/button';
import { Field, Select, Textarea } from '@/components/ui/form';
import { FolioGate } from '@/components/booking/FolioGate';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { ServiceStatusBadge } from '@/components/ui/status';
import { useToast } from '@/components/ui/toast';
import { useAsync } from '@/hooks/useAsync';
import { useFolioAccess } from '@/hooks/useFolioAccess';
import { useMockDbVersion } from '@/hooks/useMockDbVersion';
import { bookings, serviceRequests } from '@/services';
import { toUserMessage } from '@/services/errors';
import { formatDate } from '@/lib/dates';
import { cn } from '@/lib/cn';
import type { ServiceRequest, ServiceRequestCategory, ServiceRequestStatus } from '@/types';

const CATEGORIES: { id: ServiceRequestCategory; label: string; icon: typeof Droplets }[] = [
  { id: 'extra_towels', label: 'Extra Towels & Amenities', icon: Droplets },
  { id: 'housekeeping', label: 'Housekeeping & Turndown', icon: Sparkles },
  { id: 'minibar', label: 'Minibar & Refreshments', icon: Coffee },
  { id: 'dining', label: 'In-Room Dining', icon: UtensilsCrossed },
  { id: 'maintenance', label: 'Maintenance & Engineering', icon: Wrench },
  { id: 'airport', label: 'Airport & Transport', icon: Briefcase },
  { id: 'other', label: 'Other Request', icon: ConciergeBell },
];

const DELIVERY = ['Immediate', 'Next 10–15 mins', 'This Evening', 'Tomorrow Morning'];

const STATUS_ORDER: ServiceRequestStatus[] = ['pending', 'assigned', 'in_transit', 'completed'];

function statusIndex(status: ServiceRequestStatus): number {
  if (status === 'in_progress') return 1;
  return Math.max(0, STATUS_ORDER.indexOf(status));
}

export function GuestServicesPage() {
  const { reference = '' } = useParams();
  const access = useFolioAccess(reference);
  const [gateGranted, setGateGranted] = useState(false);

  if (access === 'loading' && !gateGranted) {
    return (
      <Container className="py-16">
        <LoadingState label="Verifying your reservation access…" />
      </Container>
    );
  }
  if (access === 'denied' && !gateGranted) {
    return (
      <FolioGate
        reference={reference}
        onGranted={() => setGateGranted(true)}
        title="Guest services access"
      />
    );
  }
  return <ServicesView reference={reference} />;
}

function ServicesView({ reference }: { reference: string }) {
  const toast = useToast();
  const dbVersion = useMockDbVersion();
  const bookingQuery = useAsync(() => bookings.getBooking(reference).then((r) => r.data), [reference]);
  const requestsQuery = useAsync(
    () => serviceRequests.listForReservation(reference).then((r) => r.data),
    [reference, dbVersion],
  );

  const [category, setCategory] = useState<ServiceRequestCategory>('extra_towels');
  const [details, setDetails] = useState('');
  const [deliveryTime, setDeliveryTime] = useState(DELIVERY[0]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  if (bookingQuery.loading) {
    return (
      <Container className="py-16">
        <LoadingState label="Preparing guest services…" />
      </Container>
    );
  }

  if (bookingQuery.error || !bookingQuery.data) {
    return (
      <Container className="py-16">
        <ErrorState
          title="Reservation not found"
          description={bookingQuery.error ?? 'We could not find that reservation.'}
          onRetry={bookingQuery.reload}
        />
      </Container>
    );
  }

  const booking = bookingQuery.data;
  const eligible = booking.status === 'checked_in';

  const submit = async () => {
    if (!details.trim()) {
      setFormError('Please describe what you need.');
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      const label = CATEGORIES.find((item) => item.id === category)?.label ?? 'Service request';
      await serviceRequests.create(reference, {
        category,
        categoryLabel: label,
        details: details.trim(),
        deliveryTime,
      });
      setDetails('');
      setDeliveryTime(DELIVERY[0]);
      toast.success('Request received', 'Our team has been notified and will be with you shortly.');
      requestsQuery.reload();
    } catch (error) {
      const message = toUserMessage(error);
      setFormError(message);
      toast.error('We could not submit your request', message);
    } finally {
      setSubmitting(false);
    }
  };

  const requests = requestsQuery.data ?? [];

  return (
    <Container className="py-8">
      <Link
        to={`/reservations/${reference}`}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to reservation
      </Link>

      <div className="mt-4">
        <Badge tone="lavender">In-stay services</Badge>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-ink sm:text-3xl">Guest Services Desk</h1>
        <p className="mt-1 text-sm text-ink-soft">
          {booking.room.name} · {booking.hotel.name} · {formatDate(booking.stay.checkIn)} –{' '}
          {formatDate(booking.stay.checkOut)}
          {booking.roomNumber ? ` · Room ${booking.roomNumber}` : ''}
        </p>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="min-w-0 space-y-6">
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-ink">Live request status</h2>
            <p className="mt-1 text-sm text-ink-soft">
              Track every request in real time — from your tap to the knock at your door.
            </p>

            <div className="mt-5">
              {requestsQuery.loading ? (
                <LoadingState label="Loading your requests…" />
              ) : requestsQuery.error ? (
                <ErrorState description={requestsQuery.error} onRetry={requestsQuery.reload} />
              ) : requests.length === 0 ? (
                <EmptyState
                  title="No active requests"
                  description="Use the form to request towels, dining, housekeeping or anything else — you’ll see live progress here."
                  icon={<ConciergeBell className="h-6 w-6" aria-hidden="true" />}
                />
              ) : (
                <ul className="space-y-4">
                  {requests.map((request) => (
                    <RequestCard key={request.id} request={request} />
                  ))}
                </ul>
              )}
            </div>
          </Card>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:h-fit">
          <Card className="p-5">
            <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-ink-mute">New request</h2>

            {!eligible ? (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                In-stay services unlock once you have checked in. Check-in opens at{' '}
                {booking.hotel.checkInTime}.
              </div>
            ) : (
              <form
                className="mt-4 space-y-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  void submit();
                }}
              >
                <Field label="What do you need?" htmlFor="svc-category">
                  <Select
                    id="svc-category"
                    value={category}
                    onChange={(event) => setCategory(event.target.value as ServiceRequestCategory)}
                  >
                    {CATEGORIES.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.label}
                      </option>
                    ))}
                  </Select>
                </Field>

                <Field label="Details" htmlFor="svc-details" error={formError ?? undefined} required>
                  <Textarea
                    id="svc-details"
                    rows={3}
                    placeholder="e.g. 2 extra bath towels and a set of amenities, please."
                    value={details}
                    onChange={(event) => setDetails(event.target.value)}
                    invalid={Boolean(formError)}
                  />
                </Field>

                <Field label="When do you need it?" htmlFor="svc-time">
                  <Select
                    id="svc-time"
                    value={deliveryTime}
                    onChange={(event) => setDeliveryTime(event.target.value)}
                  >
                    {DELIVERY.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </Select>
                </Field>

                <Button type="submit" className="w-full" loading={submitting} leadingIcon={<Send className="h-4 w-4" aria-hidden="true" />}>
                  Send request
                </Button>
              </form>
            )}

            <div className="mt-4 flex items-center justify-between text-xs text-ink-mute">
              <span>Average response</span>
              <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> ~12 minutes
              </span>
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="text-sm font-semibold text-ink">How it works</h3>
            <ol className="mt-3 space-y-2 text-xs text-ink-soft">
              <li>1. You send a request from this screen.</li>
              <li>2. Our team is assigned instantly.</li>
              <li>3. A runner is dispatched to your suite.</li>
              <li>4. You confirm once it arrives.</li>
            </ol>
            <Link to={`/reservations/${reference}`} className={buttonStyles('outline', 'sm', 'mt-4 w-full')}>
              Back to reservation
            </Link>
          </Card>
        </aside>
      </div>
    </Container>
  );
}

function RequestCard({ request }: { request: ServiceRequest }) {
  const index = statusIndex(request.status);
  const meta = CATEGORIES.find((item) => item.id === request.category);
  const Icon = meta?.icon ?? ConciergeBell;
  const created = new Date(request.createdAt);

  return (
    <li className="rounded-2xl border border-brand-900/10 bg-white p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-lavender-100 text-brand-700">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-semibold text-ink">{request.categoryLabel}</span>
            <ServiceStatusBadge status={request.status} />
          </div>
          <p className="mt-1 text-sm text-ink-soft">{request.details}</p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-mute">
            <span className="font-mono">{request.id}</span>
            <span>Requested {created.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
            <span>Window: {request.deliveryTime}</span>
            {request.expectedArrival ? <span>ETA {request.expectedArrival}</span> : null}
          </div>
          {request.staffName ? (
            <p className="mt-1 text-xs text-ink-soft">
              Handled by <span className="font-medium text-ink">{request.staffName}</span>
            </p>
          ) : null}

          <div className="mt-3 flex items-center gap-1">
            {STATUS_ORDER.map((status, step) => (
              <div key={status} className="flex flex-1 items-center gap-1 last:flex-none">
                <span
                  className={cn(
                    'h-2 w-2 shrink-0 rounded-full',
                    step <= index ? 'bg-brand-600' : 'bg-brand-900/15',
                  )}
                  aria-hidden="true"
                />
                {step < STATUS_ORDER.length - 1 ? (
                  <span
                    className={cn('h-0.5 flex-1 rounded', step < index ? 'bg-brand-600' : 'bg-brand-900/15')}
                    aria-hidden="true"
                  />
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </div>
    </li>
  );
}