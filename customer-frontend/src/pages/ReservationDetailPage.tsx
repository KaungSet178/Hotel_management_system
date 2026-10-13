import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Bell,
  CalendarPlus,
  CalendarDays,
  Check,
  Clock,
  Copy,
  Eye,
  EyeOff,
  Info,
  MapPin,
  Phone,
  Sparkles,
  Ticket,
  Users,
} from 'lucide-react';
import { Container } from '@/components/ui/section';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button, buttonStyles } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { FolioGate } from '@/components/booking/FolioGate';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { BookingStatusBadge, PaymentStatusBadge } from '@/components/ui/status';
import { useToast } from '@/components/ui/toast';
import { useAsync } from '@/hooks/useAsync';
import { bookings } from '@/services';
import { toUserMessage } from '@/services/errors';
import { formatMMK } from '@/lib/currency';
import { formatDate, todayISO } from '@/lib/dates';
import { refundPercent, refundLabel } from '@/lib/pricing';

export function ReservationDetailPage() {
  const { reference = '' } = useParams();
  const [gateGranted, setGateGranted] = useState(false);

  // Managing a reservation (cancel, amend, services) is sensitive, so the
  // folio PIN is always required on entry — no stored-access shortcut.
  if (!gateGranted) {
    return (
      <FolioGate
        reference={reference}
        onGranted={() => setGateGranted(true)}
        title="Reservation access"
      />
    );
  }
  return <ReservationView reference={reference} />;
}

function ReservationView({ reference }: { reference: string }) {
  const toast = useToast();
  const query = useAsync(() => bookings.getBooking(reference).then((r) => r.data), [reference]);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [pinVisible, setPinVisible] = useState(false);
  const [pinCopied, setPinCopied] = useState(false);

  // Real-time booking reload: listen to window event & subscribe to live broadcast
  useEffect(() => {
    const handleUpdate = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      const cleanRef = reference.replace(/^#/, '');
      if (!detail?.reference || detail.reference.replace(/^#/, '') === cleanRef) {
        query.reload();
      }
    };
    window.addEventListener('stayease:booking-updated', handleUpdate);
    return () => window.removeEventListener('stayease:booking-updated', handleUpdate);
  }, [reference, query]);

  // Polling fallback while booking is pending approval
  useEffect(() => {
    if (!query.data || query.data.status !== 'pending') return;
    const timer = window.setInterval(() => {
      query.reload();
    }, 3000);
    return () => window.clearInterval(timer);
  }, [query.data?.status, query]);

  if (query.loading) {
    return (
      <Container className="py-16">
        <LoadingState label="Loading reservation…" />
      </Container>
    );
  }

  if (query.error || !query.data) {
    return (
      <Container className="py-16">
        <ErrorState
          title="Reservation not found"
          description={query.error ?? 'We could not find that reservation.'}
          onRetry={query.reload}
        />
      </Container>
    );
  }

  const booking = query.data;
  const today = todayISO();
  const refund = refundPercent(booking.stay.checkIn, today);
  const refundAmount = Math.round((booking.price.total * refund) / 100);
  const cancellable = booking.status === 'confirmed' || booking.status === 'pending';

  const copyPin = async () => {
    try {
      await navigator.clipboard.writeText(booking.pin);
      setPinCopied(true);
      toast.success('Folio PIN copied', `Keep ${booking.pin} safe — you'll need it to reopen this folio.`);
      window.setTimeout(() => setPinCopied(false), 1800);
    } catch {
      toast.error('Copy failed', 'Please write the PIN down manually.');
    }
  };

  const downloadIcs = () => {
    const dt = (date: string, time: string) => `${date.replace(/-/g, '')}T${time}`;
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//StayEase//Reservation//EN',
      'BEGIN:VEVENT',
      `UID:${booking.reference}@stayease`,
      `SUMMARY:Stay at ${booking.hotel.name} (${booking.room.name})`,
      `DTSTART:${dt(booking.stay.checkIn, '140000')}`,
      `DTEND:${dt(booking.stay.checkOut, '120000')}`,
      `LOCATION:${booking.hotel.address.line1}, ${booking.hotel.address.city}`,
      `DESCRIPTION:Booking ${booking.reference} · Folio ${booking.folioId}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${booking.reference}-stayease.ics`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const confirmCancel = async () => {
    setCancelBusy(true);
    try {
      const result = await bookings.cancelBooking(booking.reference, booking.pin);
      toast.success(
        'Reservation cancelled',
        result.data.cancelRefundAmount
          ? `Refund of ${formatMMK(result.data.cancelRefundAmount)} will be processed.`
          : 'No refund is due under the cancellation policy.',
      );
      setCancelOpen(false);
      query.reload();
    } catch (error) {
      toast.error('We could not cancel this reservation', toUserMessage(error));
    } finally {
      setCancelBusy(false);
    }
  };

  return (
    <Container className="py-8">
      <Link
        to="/bookings"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to my bookings
      </Link>

      <div className="mt-4 grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-6">
          <Card className="p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-bold text-ink">{booking.hotel.name}</h1>
                  <BookingStatusBadge status={booking.status} />
                  <PaymentStatusBadge status={booking.paymentStatus} />
                </div>
                <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-ink-soft">
                  <MapPin className="h-4 w-4 text-brand-500" aria-hidden="true" />
                  {booking.hotel.address.line1}, {booking.hotel.address.city}
                </p>
                <p className="mt-1 font-mono text-xs text-ink-mute">
                  Ref {booking.reference} · Folio {booking.folioId}
                </p>
              </div>
              {booking.paymentStatus === 'paid' || booking.paymentStatus === 'settled' ? (
                <Badge tone="green">Paid in full</Badge>
              ) : null}
            </div>

            <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Info2 label="Room type" value={booking.room.name} />
              <Info2 label="Room number" value={booking.roomNumber ?? 'Assigned at check-in'} />
              <Info2 label="Rate plan" value={booking.ratePlan.label} />
              <Info2
                label="Check-in"
                value={`${formatDate(booking.stay.checkIn)} · ${booking.hotel.checkInTime}`}
              />
              <Info2
                label="Check-out"
                value={`${formatDate(booking.stay.checkOut)} · ${booking.hotel.checkOutTime}`}
              />
              <Info2
                label="Guests"
                value={`${booking.adults} adult${booking.adults === 1 ? '' : 's'} · ${booking.rooms} room${booking.rooms === 1 ? '' : 's'}`}
              />
            </dl>
          </Card>

          {booking.status === 'pending' ? (
            <Card className="border-amber-200 bg-amber-50/60 p-6">
              <div className="flex items-start gap-3">
                <Clock className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-hidden="true" />
                <div>
                  <h2 className="text-base font-semibold text-amber-900">Awaiting staff confirmation</h2>
                  <p className="mt-1 text-sm text-amber-800">
                    {booking.paymentStatus === 'awaiting_review'
                      ? 'Our team is verifying your payment proof. Your suite is held — we’ll confirm shortly.'
                      : 'Our team is reviewing your request. Your suite is held — we’ll confirm shortly.'}
                  </p>
                </div>
              </div>
              {booking.paymentProof ? (
                <div className="mt-4 rounded-2xl border border-amber-200 bg-white p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-ink-mute">Payment proof</p>
                  <div className="mt-2 flex items-center gap-4">
                    <img
                      src={booking.paymentProof.dataUrl}
                      alt="Uploaded payment proof"
                      className="h-24 w-24 rounded-xl border border-brand-900/10 object-cover"
                    />
                    <div className="text-sm text-ink-soft">
                      <p className="font-medium text-ink">{booking.paymentProof.fileName}</p>
                      <p className="mt-1 text-xs text-ink-mute">
                        Uploaded {formatDate(booking.paymentProof.uploadedAt.slice(0, 10))}
                      </p>
                      <Badge tone="amber" className="mt-2">
                        Under review
                      </Badge>
                    </div>
                  </div>
                </div>
              ) : null}
            </Card>
          ) : null}

          <Card className="p-6">
            <h2 className="text-lg font-semibold text-ink">Price breakdown</h2>
            <dl className="mt-4 space-y-2 text-sm">
              {booking.price.lines.map((line, index) => (
                <div key={`${line.label}-${index}`} className="flex items-start justify-between gap-3">
                  <dt className="text-ink-soft">
                    {line.label}
                    {line.note ? <span className="ml-1 text-xs text-ink-mute">({line.note})</span> : null}
                  </dt>
                  <dd className="font-medium text-ink">{formatMMK(line.amount)}</dd>
                </div>
              ))}
              <div className="flex items-center justify-between gap-3">
                <dt className="text-ink-soft">Service charge (10%)</dt>
                <dd className="font-medium text-ink">{formatMMK(booking.price.serviceCharge)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-ink-soft">Commercial tax (5%)</dt>
                <dd className="font-medium text-ink">{formatMMK(booking.price.tax)}</dd>
              </div>
            </dl>
            <div className="mt-4 flex items-center justify-between border-t border-brand-900/12 pt-4">
              <span className="font-semibold text-ink">Total</span>
              <span className="text-xl font-bold text-brand-800">{formatMMK(booking.price.total)}</span>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-lg font-semibold text-ink">Guest details</h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <Info2 label="Guest name" value={booking.guest.fullName} />
              <Info2 label="Email" value={booking.guest.email} />
              <Info2 label="Mobile" value={`${booking.guest.phoneCountryCode} ${booking.guest.phone}`} />
              <Info2 label="Estimated arrival" value={booking.guest.estimatedArrival} />
            </dl>
            {booking.addOns.length > 0 ? (
              <div className="mt-4">
                <p className="text-sm font-medium text-ink">Enhancements</p>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {booking.addOns.map((addOn) => (
                    <li key={addOn.id}>
                      <Badge tone="lavender">{addOn.label}</Badge>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {booking.guest.conNotes ? (
              <p className="mt-4 rounded-xl bg-lavender-100 p-3 text-sm text-ink-soft">
                <span className="font-medium text-ink">Concierge note: </span>
                {booking.guest.conNotes}
              </p>
            ) : null}
          </Card>
        </div>

        {/* Actions rail */}
        <aside className="space-y-4 lg:sticky lg:top-24 lg:h-fit">
          <Card className="p-5">
            <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-ink-mute">Manage</h2>
            <div className="mt-4 space-y-2">
              <Link to={`/confirmation/${booking.reference}`} className={buttonStyles('primary', 'md', 'w-full')}>
                <Ticket className="h-4 w-4" aria-hidden="true" /> View check-in pass
              </Link>
              {booking.status === 'checked_in' ? (
                <Link
                  to={`/reservations/${booking.reference}/services`}
                  className={buttonStyles('outline', 'md', 'w-full')}
                >
                  <Sparkles className="h-4 w-4" aria-hidden="true" /> Guest services
                </Link>
              ) : null}
              <Button variant="outline" className="w-full" onClick={downloadIcs} leadingIcon={<CalendarPlus className="h-4 w-4" aria-hidden="true" />}>
                Add to calendar
              </Button>
              <a href={`tel:${booking.hotel.hotline.replace(/\s/g, '')}`} className={buttonStyles('ghost', 'md', 'w-full')}>
                <Phone className="h-4 w-4" aria-hidden="true" /> Call the hotel
              </a>
              {cancellable ? (
                <Button variant="danger" className="w-full" onClick={() => setCancelOpen(true)}>
                  Cancel reservation
                </Button>
              ) : null}
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="inline-flex items-center gap-2 text-sm font-semibold text-ink">
              <Bell className="h-4 w-4 text-brand-600" aria-hidden="true" /> Folio PIN
            </h2>
            <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <span className="font-mono text-xl font-bold tracking-[0.35em] text-ink">
                {pinVisible ? booking.pin : '••••'}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={copyPin}
                  aria-label="Copy folio PIN"
                  className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-white px-2 py-1 text-xs font-medium text-amber-900 transition-colors hover:bg-amber-100"
                >
                  {pinCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {pinCopied ? 'Copied' : 'Copy'}
                </button>
                <button
                  type="button"
                  onClick={() => setPinVisible((value) => !value)}
                  aria-label={pinVisible ? 'Hide PIN' : 'Reveal PIN'}
                  className="text-brand-700 hover:text-brand-900"
                >
                  {pinVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <p className="mt-2 text-xs text-ink-mute">
              Keep this PIN private — it is required to re-open this folio on any device. Save a copy now so
              you don’t lose access later.
            </p>
          </Card>

          {cancellable ? (
            <Card className="p-5">
              <h2 className="inline-flex items-center gap-2 text-sm font-semibold text-ink">
                <Info className="h-4 w-4 text-brand-600" aria-hidden="true" /> Cancellation policy
              </h2>
              <p className="mt-2 text-sm text-ink-soft">{refundLabel(booking.stay.checkIn, today)}</p>
              <div className="mt-3 flex items-center justify-between rounded-xl bg-lavender-100/70 px-4 py-3">
                <span className="text-sm text-ink-soft">Estimated refund now</span>
                <span className="text-base font-bold text-brand-800">{formatMMK(refundAmount)}</span>
              </div>
              <ul className="mt-3 space-y-1 text-xs text-ink-mute">
                <li className="inline-flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" /> ≥48h before arrival — 100% refund
                </li>
                <li className="inline-flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" /> 24–48h — 50% refund
                </li>
                <li className="inline-flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" /> &lt;24h — no refund
                </li>
              </ul>
            </Card>
          ) : null}
        </aside>
      </div>

      <Modal
        open={cancelOpen}
        onClose={() => (cancelBusy ? undefined : setCancelOpen(false))}
        title="Cancel this reservation?"
        description={`${booking.hotel.name} · ${booking.room.name}`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setCancelOpen(false)} disabled={cancelBusy}>
              Keep reservation
            </Button>
            <Button variant="danger" loading={cancelBusy} onClick={confirmCancel}>
              Cancel &amp; refund {formatMMK(refundAmount)}
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-soft">
          {refundLabel(booking.stay.checkIn, today)}. Your estimated refund is{' '}
          <span className="font-semibold text-ink">{formatMMK(refundAmount)}</span>
          {booking.paymentStatus === 'pay_at_hotel' ? ' (nothing was charged yet).' : '.'}
        </p>
      </Modal>

      <p className="mt-6 flex items-center justify-center gap-2 text-xs text-ink-mute">
        <Users className="h-3.5 w-3.5" aria-hidden="true" /> Need something during your stay? The guest services
        desk is available 24/7.
      </p>
    </Container>
  );
}

function Info2({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-ink-mute">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-ink">{value}</dd>
    </div>
  );
}