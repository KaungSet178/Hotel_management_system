import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import {
  BadgeCheck,
  CalendarPlus,
  Check,
  CircleAlert,
  Clock,
  Copy,
  Download,
  FileDown,
  KeyRound,
  MapPin,
  ShieldCheck,
} from 'lucide-react';
import { Container } from '@/components/ui/section';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button, buttonStyles } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { StepsBar } from '@/components/booking/StepsBar';
import { FolioGate } from '@/components/booking/FolioGate';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { PaymentStatusBadge, BookingStatusBadge } from '@/components/ui/status';
import { useToast } from '@/components/ui/toast';
import { useAsync } from '@/hooks/useAsync';
import { useFolioAccess } from '@/hooks/useFolioAccess';
import { bookings } from '@/services';
import { buildQrPayload } from '@/lib/refs';
import { formatMMK } from '@/lib/currency';
import { formatDate } from '@/lib/dates';

export function ConfirmationPage() {
  const { reference = '' } = useParams();
  const access = useFolioAccess(reference);
  const [gateGranted, setGateGranted] = useState(false);

  if (access === 'loading' && !gateGranted) {
    return (
      <Container className="py-16">
        <LoadingState label="Verifying your folio access…" />
      </Container>
    );
  }
  if (access === 'denied' && !gateGranted) {
    return <FolioGate reference={reference} onGranted={() => setGateGranted(true)} />;
  }
  return <PassView reference={reference} />;
}

function PassView({ reference }: { reference: string }) {
  const query = useAsync(() => bookings.getBooking(reference).then((r) => r.data), [reference]);
  const toast = useToast();
  const qrRef = useRef<HTMLDivElement>(null);
  const [pinRevealed, setPinRevealed] = useState(true);
  const [pinCopied, setPinCopied] = useState(false);
  const [showReminder, setShowReminder] = useState(
    () => sessionStorage.getItem(`stayflow.pass-reminder.${reference}`) !== 'seen',
  );

  const dismissReminder = () => {
    sessionStorage.setItem(`stayflow.pass-reminder.${reference}`, 'seen');
    setShowReminder(false);
  };

  const qrPayload = useMemo(
    () => (query.data ? buildQrPayload(query.data.reference, query.data.stay.checkIn) : ''),
    [query.data],
  );

  // Instant real-time update: reload immediately when notification bus fires
  useEffect(() => {
    const handleUpdate = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      const cleanRef = reference.replace(/^#/, '');
      if (!detail?.reference || detail.reference.replace(/^#/, '') === cleanRef) {
        query.reload();
      }
    };
    window.addEventListener('stayflow:booking-updated', handleUpdate);
    return () => window.removeEventListener('stayflow:booking-updated', handleUpdate);
  }, [reference, query]);

  // Polling fallback while booking is awaiting staff approval
  useEffect(() => {
    if (!query.data || (query.data.status !== 'pending' && query.data.paymentStatus !== 'awaiting_review')) return;
    const timer = window.setInterval(() => {
      query.reload();
    }, 3000);
    return () => window.clearInterval(timer);
  }, [query.data?.status, query.data?.paymentStatus, query]);

  if (query.loading) {
    return (
      <Container className="py-16">
        <LoadingState label="Issuing your folio and QR pass…" />
      </Container>
    );
  }

  if (query.error || !query.data) {
    return (
      <Container className="py-16">
        <ErrorState
          title="We couldn't load your confirmation"
          description={query.error ?? 'The reservation could not be found.'}
          onRetry={query.reload}
        />
      </Container>
    );
  }

  const booking = query.data;
  const isPaid = booking.paymentStatus === 'paid' || booking.paymentStatus === 'settled';
  const isPending = booking.status === 'pending';
  const isAwaitingReview = booking.paymentStatus === 'awaiting_review';
  const firstName = booking.guest.fullName ? booking.guest.fullName.split(' ')[0] : '';

  const downloadQr = () => {
    const canvas = qrRef.current?.querySelector('canvas');
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `${booking.reference}-stayflow-pass.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

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

  const downloadPdf = async () => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
    const M = 14;
    const W = 210 - M * 2;
    const ascii = (value: string) => value.replace(/[^\x20-\x7E]/g, '');
    const BRAND: [number, number, number] = [15, 47, 44];
    const GRID: [number, number, number] = [225, 225, 225];
    const LABEL: [number, number, number] = [110, 110, 110];
    const INK: [number, number, number] = [30, 30, 30];
    const COL = 66;
    let y = 0;

    doc.setFillColor(...BRAND);
    doc.rect(0, 0, 210, 26, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('STAYFLOW', M, 17);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(ascii(`${booking.reference} · Folio ${booking.folioId}`), 210 - M, 17, { align: 'right' });

    y = 44;
    doc.setTextColor(...BRAND);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('Booking confirmation', M, y);

    y += 7;
    doc.setTextColor(...LABEL);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(ascii(`${booking.hotel.name} — ${booking.hotel.address.line1}, ${booking.hotel.address.city}`), M, y);
    y += 5;
    doc.text('Show this pass at the desk for 45-second express check-in.', M, y);

    y += 10;
    doc.setDrawColor(...GRID);
    doc.line(M, y, 210 - M, y);
    y += 8;
    doc.setTextColor(...BRAND);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Reservation details', M, y);
    y += 8;

    const isPaid = booking.paymentStatus === 'paid' || booking.paymentStatus === 'settled';
    const paymentLabel = isPaid
      ? `Paid via ${booking.paymentMethod.replace('_', ' ')}`
      : booking.paymentStatus === 'awaiting_review'
        ? 'Payment submitted — awaiting staff review'
        : 'Payment submitted — pending verification';

    const details: [string, string][] = [
      ['Booking reference', booking.reference],
      ['Room type', booking.room.name],
      ['Rate plan', booking.ratePlan.label],
      ['Check-in', `${formatDate(booking.stay.checkIn)} · ${booking.hotel.checkInTime}`],
      ['Check-out', `${formatDate(booking.stay.checkOut)} · ${booking.hotel.checkOutTime}`],
      ['Guests', `${booking.adults} adults · ${booking.rooms} room${booking.rooms === 1 ? '' : 's'}`],
      ['Nights', String(booking.nights)],
      ['Payment', paymentLabel],
    ];

    for (const [label, value] of details) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...LABEL);
      doc.text(ascii(label), M, y);
      doc.setTextColor(...INK);
      doc.setFont('helvetica', 'bold');
      doc.text(ascii(value), M + COL, y);
      y += 6;
    }

    y += 6;
    doc.setDrawColor(...GRID);
    doc.line(M, y, 210 - M, y);
    y += 8;
    doc.setTextColor(...BRAND);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Price breakdown', M, y);
    y += 8;

    const priceRow = (label: string, amount: number, bold = false, size = 9) => {
      doc.setFont('helvetica', bold ? 'bold' : 'normal');
      doc.setFontSize(size);
      doc.setTextColor(...(bold ? INK : LABEL));
      doc.text(ascii(label), M, y);
      doc.text(ascii(formatMMK(amount)), 210 - M, y, { align: 'right' });
      y += bold ? 8 : 5.5;
    };

    for (const line of booking.price.lines) {
      priceRow(line.note ? `${line.label} (${line.note})` : line.label, line.amount);
    }
    priceRow('Service charge (10%)', booking.price.serviceCharge);
    priceRow('Commercial tax (5%)', booking.price.tax);
    doc.setDrawColor(...GRID);
    doc.line(M, y, 210 - M, y);
    y += 6;
    priceRow('Total', booking.price.total, true, 12);

    y += 6;
    doc.setFillColor(255, 241, 224);
    doc.roundedRect(M, y, W, 24, 3, 3, 'F');
    doc.setTextColor(126, 66, 4);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Your folio access PIN', M + 6, y + 9);
    doc.setFont('courier', 'bold');
    doc.setFontSize(20);
    doc.text(booking.pin, M + 6, y + 19);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(ascii('Save this PIN — it is required to reopen your folio.'), M + 6, y + 24);
    y += 34;

    const qrCanvas = qrRef.current?.querySelector('canvas');
    const qrSize = 34;
    if (qrCanvas) {
      doc.addImage(qrCanvas.toDataURL('image/png'), 'PNG', M, y, qrSize, qrSize);
      const qx = M + qrSize + 6;
      doc.setTextColor(...BRAND);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('Express check-in pass', qx, y + 8);
      doc.setTextColor(...INK);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(booking.reference, qx, y + 16);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...LABEL);
      doc.text(ascii(`Stay at ${booking.hotel.name}`), qx, y + 22);
      doc.text(ascii(`${formatDate(booking.stay.checkIn)} ${'->'} ${formatDate(booking.stay.checkOut)}`), qx, y + 27);
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(140, 140, 140);
    doc.text('Issued by StayFlow. Demo build — no real payment was processed.', 105, 292, { align: 'center' });

    doc.save(`${booking.reference}-stayflow.pdf`);
  };

  const downloadPdfAndDismiss = () => {
    void downloadPdf().then(dismissReminder);
  };

  const downloadIcs = () => {
    const dt = (date: string, time: string) => `${date.replace(/-/g, '')}T${time}00`;
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//StayFlow//Reservation//EN',
      'BEGIN:VEVENT',
      `UID:${booking.reference}@stayflow`,
      `SUMMARY:Stay at ${booking.hotel.name} (${booking.room.name})`,
      `DTSTART:${dt(booking.stay.checkIn, '140000')}`,
      `DTEND:${dt(booking.stay.checkOut, '120000')}`,
      `LOCATION:${booking.hotel.address.line1}, ${booking.hotel.address.city}`,
      `DESCRIPTION:Booking ${booking.reference} · Folio ${booking.folioId} · PIN ${booking.pin}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${booking.reference}-stayflow.ics`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <Container className="py-8">
      <div className="mx-auto max-w-4xl">
        <div className="print:hidden">
          <StepsBar current={4} />
        </div>

        {isPending ? (
          <div className="mt-6 rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-lavender-100 p-6 text-center print:border-0 print:bg-white">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-700">
              <Clock className="h-7 w-7" aria-hidden="true" />
            </span>
            <h1 className="mt-4 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
              Reservation received{firstName ? `, ${firstName}` : ''}
            </h1>
            <p className="mt-1 text-sm text-ink-soft">
              {isAwaitingReview
                ? 'We’ve received your payment proof. Our team is verifying it now — your booking will be confirmed shortly.'
                : 'Your request has been submitted. Our team will confirm your booking shortly.'}
              {' '}This page updates automatically once it’s approved.
            </p>
          </div>
        ) : (
          <div className="mt-6 rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-lavender-100 p-6 text-center print:border-0 print:bg-white">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <BadgeCheck className="h-7 w-7" aria-hidden="true" />
            </span>
            <h1 className="mt-4 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
              You’re all set{firstName ? `, ${firstName}` : ''}!
            </h1>
            <p className="mt-1 text-sm text-ink-soft">
              Your reservation is confirmed and your folio has been issued. Show the QR pass at the desk for
              45-second express check-in.
            </p>
          </div>
        )}

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            <Card className="p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-ink">{booking.hotel.name}</h2>
                  <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-ink-soft">
                    <MapPin className="h-4 w-4 text-brand-500" aria-hidden="true" />
                    {booking.hotel.address.line1}, {booking.hotel.address.city}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <BookingStatusBadge status={booking.status} />
                  <PaymentStatusBadge status={booking.paymentStatus} />
                </div>
              </div>

              <dl className="mt-5 grid gap-4 sm:grid-cols-2">
                <Detail label="Booking reference" value={booking.reference} mono />
                <Detail label="Folio number" value={booking.folioId} mono />
                <Detail label="Room type" value={booking.room.name} />
                <Detail label="Room number" value={booking.roomNumber ?? 'Assigned at check-in'} />
                <Detail label="Check-in" value={`${formatDate(booking.stay.checkIn)} · ${booking.hotel.checkInTime}`} />
                <Detail label="Check-out" value={`${formatDate(booking.stay.checkOut)} · ${booking.hotel.checkOutTime}`} />
                <Detail label="Guests" value={`${booking.adults} adult${booking.adults === 1 ? '' : 's'} · ${booking.rooms} room${booking.rooms === 1 ? '' : 's'}`} />
                <Detail label="Nights" value={String(booking.nights)} />
              </dl>
            </Card>

            <Card className="p-6">
              <h2 className="text-lg font-semibold text-ink">Price breakdown</h2>
              <p className="mt-1 text-sm text-ink-soft">{booking.ratePlan.label}</p>
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
              <p className="mt-2 text-xs text-ink-mute">
                {isPaid
                  ? `Paid via ${booking.paymentMethod.replace('_', ' ')}${booking.transactionId ? ` · ${booking.transactionId}` : ''}.`
                  : isAwaitingReview
                    ? 'Payment proof submitted — awaiting verification by our team.'
                    : 'Payable at the hotel on arrival.'}
              </p>
            </Card>

            {isPending ? (
              <Card className="border-amber-200 bg-amber-50/60 p-6">
                <div className="flex items-start gap-3">
                  <Clock className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-hidden="true" />
                  <div>
                    <h2 className="text-base font-semibold text-amber-900">Awaiting staff confirmation</h2>
                    <p className="mt-1 text-sm text-amber-800">
                      Your suite is held while our reservations team reviews your booking
                      {isAwaitingReview ? ' and payment proof' : ''}. You’ll receive an update shortly — no
                      further action is needed.
                    </p>
                  </div>
                </div>
                {booking.paymentProof ? (
                  <div className="mt-4 rounded-2xl border border-amber-200 bg-white p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-ink-mute">
                      Payment proof
                    </p>
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
              <h2 className="text-lg font-semibold text-ink">Guest &amp; arrival</h2>
              <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                <Detail label="Guest name" value={booking.guest.fullName} />
                <Detail label="Email" value={booking.guest.email} />
                <Detail label="Mobile" value={`${booking.guest.phoneCountryCode} ${booking.guest.phone}`} />
                <Detail label="Estimated arrival" value={booking.guest.estimatedArrival} />
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

          {/* QR pass */}
          <aside className="lg:sticky lg:top-24 lg:h-fit">
            <Card className="overflow-hidden">
              <div className="bg-brand-800 p-5 text-center text-white">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/75">
                  Express Check-in Pass
                </p>
                <p className="mt-1 text-sm text-white/90">
                  {isPending ? 'Activates once your booking is confirmed' : 'Present this QR at the front desk'}
                </p>
              </div>
              <div className="p-6 text-center">
                <div ref={qrRef} className="mx-auto inline-flex rounded-2xl border border-brand-900/10 bg-white p-4">
                  <QRCodeCanvas value={qrPayload} size={196} level="M" marginSize={0} fgColor="#0f2f2c" />
                </div>
                <p className="mt-4 text-xs text-ink-mute">
                  Reference <span className="font-semibold text-ink">{booking.reference}</span>
                </p>

                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
                    Your folio access PIN
                  </p>
                  <div className="mt-2 flex items-center justify-center gap-3">
                    <span className="font-mono text-2xl font-extrabold tracking-[0.4em] text-ink">
                      {pinRevealed ? booking.pin : '••••'}
                    </span>
                    <button
                      type="button"
                      onClick={copyPin}
                      className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-amber-900 transition-colors hover:bg-amber-100"
                    >
                      {pinCopied ? (
                        <Check className="h-3.5 w-3.5" aria-hidden="true" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                      {pinCopied ? 'Copied!' : 'Copy'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPinRevealed((value) => !value)}
                      className="text-xs font-medium text-amber-800 underline-offset-2 hover:underline"
                    >
                      {pinRevealed ? 'Hide' : 'Reveal'}
                    </button>
                  </div>
                </div>
                <div className="mt-2 flex items-start gap-2 rounded-xl bg-amber-50/70 p-3 text-left text-xs text-amber-900">
                  <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden="true" />
                  <p>
                    <span className="font-semibold">Save this PIN now</span> — you need it to re-open this
                    folio. We’ll also email it to <span className="font-medium">{booking.guest.email}</span>.
                  </p>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 print:hidden">
                  <Button variant="outline" size="sm" onClick={downloadQr} leadingIcon={<Download className="h-4 w-4" aria-hidden="true" />}>
                    Save QR
                  </Button>
                  <Button variant="outline" size="sm" onClick={downloadPdf} leadingIcon={<FileDown className="h-4 w-4" aria-hidden="true" />}>
                    Download PDF
                  </Button>
                  <Button variant="outline" size="sm" className="col-span-2" onClick={downloadIcs} leadingIcon={<CalendarPlus className="h-4 w-4" aria-hidden="true" />}>
                    Add to calendar
                  </Button>
                </div>
              </div>
            </Card>

            <div className="mt-4 space-y-2 print:hidden">
              <Link to="/bookings" className={buttonStyles('outline', 'md', 'w-full')}>
                View all my bookings
              </Link>
            </div>

            <div className="mt-4 flex items-start gap-3 rounded-2xl border border-brand-900/10 bg-white p-4 text-xs text-ink-soft">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
              <p>
                Your QR pass contains no personal data. The PIN is shown here only to you and is required to
                re-open this folio later.
              </p>
            </div>
          </aside>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-ink-mute print:hidden">
          <span className="inline-flex items-center gap-1.5">
            <KeyRound className="h-3.5 w-3.5" aria-hidden="true" /> Zero-waiting-time smart hospitality
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CircleAlert className="h-3.5 w-3.5" aria-hidden="true" /> Need help? Call {booking.hotel.hotline}
          </span>
        </div>
      </div>

      {showReminder ? (
        <Modal
          open
          onClose={dismissReminder}
          title="Save your pass before you go"
          description={`Keep the QR code and folio PIN for ${booking.reference} — you'll need them at check-in and to re-open this folio.`}
          footer={
            <>
              <Button onClick={downloadPdfAndDismiss} leadingIcon={<FileDown className="h-4 w-4" aria-hidden="true" />}>
                Download PDF
              </Button>
              <Button variant="outline" onClick={dismissReminder}>
                I've saved it
              </Button>
            </>
          }
        >
          <div className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4">
            <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
            <p className="text-sm text-amber-900">
              If you leave without saving, you'll have to ask the hotel to resend your pass — which slows down
              check-in. Download it now as a PDF and it'll stay on your phone.
            </p>
          </div>

          <div className="mt-5 flex items-center gap-4 rounded-2xl border border-brand-900/10 bg-lavender-50 p-4">
            <div className="h-24 w-24 shrink-0 rounded-xl bg-white p-1.5 ring-1 ring-brand-900/10">
              <QRCodeCanvas value={qrPayload} size={96} level="M" marginSize={0} fgColor="#0f2f2c" className="h-full w-full" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Folio access PIN</p>
              <p className="mt-1 font-mono text-3xl font-extrabold tracking-[0.3em] text-brand-800">{booking.pin}</p>
              <button
                type="button"
                onClick={copyPin}
                className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-brand-900/10 bg-white px-2.5 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-lavender-100"
              >
                {pinCopied ? (
                  <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                ) : (
                  <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                {pinCopied ? 'PIN copied' : 'Copy PIN'}
              </button>
            </div>
          </div>
        </Modal>
      ) : null}
    </Container>
  );
}

function Detail({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-ink-mute">{label}</dt>
      <dd className={mono ? 'mt-1 font-mono text-sm font-semibold text-ink' : 'mt-1 text-sm font-medium text-ink'}>
        {value}
      </dd>
    </div>
  );
}