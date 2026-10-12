import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  Banknote,
  CalendarDays,
  CheckCircle2,
  Plus,
  Printer,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { dateRange, mmk } from '@/lib/format';
import { printBookingConfirmation } from '@/lib/print';
import { useAppStore } from '@/store';
import { useToast } from '@/components/toast';
import {
  Avatar,
  Button,
  Modal,
  Panel,
  SectionTitle,
  StatChip,
  StatusChip,
  TextInput,
} from '@/components/ui';
import type { Booking } from '@/types';

type Tab = 'ALL' | 'PENDING' | 'TODAY' | 'UPCOMING' | 'IN HOUSE';

const TABS: Tab[] = ['ALL', 'PENDING', 'TODAY', 'UPCOMING', 'IN HOUSE'];

function DetailModal({
  booking,
  onClose,
  onCheckIn,
}: {
  booking: Booking | null;
  onClose: () => void;
  onCheckIn: (booking: Booking) => void;
}) {
  if (!booking) return null;
  const ready = booking.status === 'CONFIRMED' || booking.status === 'PENDING';
  return (
    <Modal open={booking !== null} onClose={onClose} title={`Reservation ${booking.ref}`}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <StatusChip status={booking.status} />
          <StatusChip status={booking.payment} />
        </div>

        <div className="flex items-center gap-3 rounded-xl bg-surface-container-low p-4">
          <Avatar name={booking.guestName} className="h-11 w-11 text-title-sm" />
          <div>
            <p className="text-body-md font-semibold text-on-surface">{booking.guestName}</p>
            <p className="text-label-sm text-on-surface-variant">
              {booking.phone ? `${booking.phone} · ` : ''}
              {booking.adults} {booking.adults === 1 ? 'guest' : 'guests'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 text-body-sm sm:grid-cols-2">
          <div>
            <p className="text-label-sm text-on-surface-variant">Room</p>
            <p className="mt-0.5 font-medium text-on-surface">
              {booking.room} · {booking.roomCategory}
            </p>
          </div>
          <div>
            <p className="text-label-sm text-on-surface-variant">Stay</p>
            <p className="mt-0.5 font-medium text-on-surface">
              {dateRange(booking.checkIn, booking.checkOut)} · {booking.nights}{' '}
              {booking.nights === 1 ? 'night' : 'nights'}
            </p>
          </div>
          <div>
            <p className="text-label-sm text-on-surface-variant">Amount</p>
            <p className="mt-0.5 font-bold text-on-surface">{mmk(booking.amount)}</p>
          </div>
          {booking.ref === '#SF-9481' && (
            <div>
              <p className="text-label-sm text-on-surface-variant">Security deposit</p>
              <p className="mt-0.5 flex items-center gap-1 font-medium text-on-surface">
                <ShieldCheck className="h-3.5 w-3.5 text-secondary" />
                Card hold 100,000 MMK
              </p>
            </div>
          )}
        </div>

        {booking.request && (
          <p className="rounded-lg bg-tertiary-fixed/60 px-3 py-2 text-body-sm text-on-tertiary-fixed-variant">
            {booking.request}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-outline-variant/40 pt-4">
          <Button variant="outline" size="sm" onClick={() => printBookingConfirmation(booking)}>
            <Printer className="h-3.5 w-3.5" />
            Print confirmation
          </Button>
          {ready && (
            <Button variant="secondary" onClick={() => onCheckIn(booking)}>
              Check in
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}

export function ReservationsPage() {
  const { bookings, checkInBooking } = useAppStore();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('ALL');
  const [viewRef, setViewRef] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get('q') ?? '';

  const active = bookings.filter(
    (b) => b.status !== 'CHECKED_OUT' && b.status !== 'CANCELLED',
  );

  const stats = useMemo(
    () => ({
      today: bookings.filter((b) => b.checkIn === '2025-10-18').length,
      inHouse: bookings.filter((b) => b.status === 'CHECKED_IN').length,
      prepaid: bookings.filter((b) => b.payment === 'PREPAID' || b.payment.startsWith('PREPAID')).length,
      nights: active.reduce((sum, b) => sum + b.nights, 0),
    }),
    [bookings, active],
  );

  const setQuery = (next: string): void => {
    if (next) setSearchParams({ q: next });
    else setSearchParams({});
  };

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const matchesTab = (b: Booking): boolean => {
      switch (tab) {
        case 'PENDING':
          return b.status === 'PENDING';
        case 'TODAY':
          return b.checkIn === '2025-10-18';
        case 'UPCOMING':
          return b.status === 'CONFIRMED';
        case 'IN HOUSE':
          return b.status === 'CHECKED_IN';
        default:
          return true;
      }
    };
    return bookings.filter((b) => {
      if (!matchesTab(b)) return false;
      if (!needle) return true;
      return `${b.guestName} ${b.ref} ${b.room} ${b.phone ?? ''}`.toLowerCase().includes(needle);
    });
  }, [bookings, tab, q]);

  const viewed = bookings.find((b) => b.ref === viewRef) ?? null;

  const handleCheckIn = (booking: Booking): void => {
    if (checkInBooking(booking.ref)) {
      toast.success(`${booking.guestName} checked in · ${booking.ref}`);
      setViewRef(null);
    } else {
      toast.warning(`${booking.ref} is not ready to check in`);
    }
  };

  return (
    <div className="space-y-6">
      <SectionTitle
        eyebrow="StayFlow · Front Desk"
        title="Reservations"
        description="Registry of all confirmed, pending and in-house stays for Yangon Heritage."
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => toast.info(`Synced · ${bookings.length} reservations current`)}
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            <Link to="/availability">
              <Button size="sm">
                <Plus className="h-4 w-4" />
                New Walk-in
              </Button>
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatChip
          label="Today's Arrivals"
          value={String(stats.today)}
          accent="primary"
          icon={<CalendarDays className="h-4 w-4" />}
        />
        <StatChip
          label="Checked In"
          value={String(stats.inHouse)}
          accent="secondary"
          icon={<UserCheck className="h-4 w-4" />}
        />
        <StatChip
          label="Deposit Verified"
          value={String(stats.prepaid)}
          accent="amber"
          icon={<ShieldCheck className="h-4 w-4" />}
        />
        <StatChip
          label="Nights Lined Up"
          value={String(stats.nights)}
          accent="primary"
          icon={<CalendarDays className="h-4 w-4" />}
        />
      </div>

      <Panel
        title="Today's Reservations"
        subtitle={`${rows.length} reservation${rows.length === 1 ? '' : 's'}`}
        action={
          <div className="flex flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:items-center">
            {q && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setTab('ALL');
                }}
                className="flex items-center gap-1 rounded-full bg-secondary-container px-3 py-1.5 text-label-sm font-medium text-on-secondary-container"
              >
                <X className="h-3 w-3" />
                “{q}” · clear
              </button>
            )}
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-[#75777e]" />
              <TextInput
                value={q}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search…"
                className="h-9 w-full rounded-full pl-9 sm:w-44"
              />
            </div>
            <div className="flex flex-wrap items-center gap-1 rounded-full border border-outline-variant/60 bg-surface-container-low p-1">
              {TABS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={cn(
                    'rounded-full px-3 py-1.5 text-label-sm font-medium transition',
                    tab === t
                      ? 'bg-primary-container text-white shadow-sm'
                      : 'text-on-surface-variant hover:text-on-surface',
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        }
        bodyClassName="p-0"
      >
        <ul className="divide-y divide-outline-variant/40">
          {rows.map((booking) => {
            const guests = Array.from({ length: Math.min(booking.adults, 3) });
            return (
              <li
                key={booking.ref}
                className="grid grid-cols-1 items-start gap-4 px-5 py-4 transition hover:bg-surface-container-low/40 md:grid-cols-[1.4fr_1fr_1fr_auto]"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-label-md font-semibold text-[#0e1c32]">
                      {booking.ref}
                    </span>
                    <StatusChip status={booking.status} />
                    <StatusChip status={booking.payment} />
                  </div>
                  <p className="mt-1.5 text-body-md font-semibold text-on-surface">
                    {booking.guestName}
                  </p>
                  <p className="mt-0.5 text-body-sm text-on-surface-variant">
                    {booking.room} · {booking.roomCategory}
                    {booking.phone ? ` · ${booking.phone}` : ''}
                  </p>
                  {booking.request && (
                    <p className="mt-1.5 flex items-start gap-1.5 text-body-sm text-[#6a5b17]">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      {booking.request}
                    </p>
                  )}
                  {booking.ref === '#SF-9481' && (
                    <p className="mt-1 flex items-center gap-1.5 text-body-sm text-[#6a5b17]">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Security Deposit · Card Hold 100,000 MMK
                    </p>
                  )}
                </div>

                <div>
                  <p className="flex items-center gap-1.5 text-label-sm text-on-surface-variant">
                    <CalendarDays className="h-3.5 w-3.5 text-secondary" />
                    <span className="font-medium text-on-surface">{dateRange(booking.checkIn, booking.checkOut)}</span>
                  </p>
                  <p className="mt-1 text-label-md font-semibold text-on-surface">
                    {booking.nights} {booking.nights === 1 ? 'night' : 'nights'}
                  </p>
                  <div className="mt-1.5 flex items-center gap-1">
                    {guests.map((_, i) => (
                      <Avatar key={i} name="Guest" className="h-5 w-5 text-label-sm" />
                    ))}
                    <span className="ml-1 flex items-center gap-1 text-body-sm text-on-surface-variant">
                      <Users className="h-3 w-3" />
                      {booking.adults} {booking.adults === 1 ? 'guest' : 'guests'}
                    </span>
                  </div>
                </div>

                <div className="md:text-right">
                  <p className="text-label-md font-semibold text-on-surface">{mmk(booking.amount)}</p>
                  <p className="mt-0.5 text-label-sm text-on-surface-variant">
                    {booking.status === 'CHECKED_IN' ? 'Open folio' : 'Total stay'}
                  </p>
                </div>

                <div className="flex items-center gap-2 md:justify-end">
                  <Button variant="ghost" size="sm" onClick={() => setViewRef(booking.ref)}>
                    View
                  </Button>
                  {(booking.status === 'CONFIRMED' || booking.status === 'PENDING') && (
                    <Button variant="secondary" size="sm" onClick={() => handleCheckIn(booking)}>
                      Check in
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        {rows.length === 0 && (
          <div className="space-y-3 px-6 py-10 text-center">
            <Banknote className="mx-auto h-8 w-8 text-on-surface-variant/40" />
            <p className="text-body-md text-on-surface">No reservations match this view.</p>
            {q && (
              <Button variant="outline" size="sm" onClick={() => setQuery('')}>
                Clear search
              </Button>
            )}
          </div>
        )}
      </Panel>

      <DetailModal booking={viewed} onClose={() => setViewRef(null)} onCheckIn={handleCheckIn} />
    </div>
  );
}