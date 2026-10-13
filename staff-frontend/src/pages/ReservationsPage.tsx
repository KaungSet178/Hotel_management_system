import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  Banknote,
  CalendarDays,
  CheckCircle2,
  Clock,
  Plus,
  Printer,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCheck,
  Users,
  X,
  AlertTriangle,
  FileText,
  Maximize2,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { dateRange, mmk, shortDate, todayIso } from '@/lib/format';
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

export type ReservationCategory =
  | 'WAITING_APPROVAL'
  | 'TODAY_CHECK_IN'
  | 'TODAY_CHECKED_IN'
  | 'UPCOMING'
  | 'DUE';

export type Tab = 'ALL' | ReservationCategory;

function cleanRequestText(req?: string): string | null {
  if (!req) return null;
  const trimmed = req.trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed);
      const labels: Record<string, string> = {
        highFloor: 'High Floor',
        quietRoom: 'Quiet Room',
        lateCheckIn: 'Late Check-In',
        featherFreePillows: 'Feather-Free Pillows',
        celebrationNote: 'Celebration / Anniversary',
      };
      const active = Object.entries(labels)
        .filter(([k]) => parsed[k] === true || parsed[k] === 'true')
        .map(([, v]) => v);
      const note = parsed.conNotes || parsed.notes || parsed.specialNotes;
      if (typeof note === 'string' && note.trim()) active.push(note.trim());
      return active.length > 0 ? active.join(' • ') : null;
    } catch {
      return trimmed;
    }
  }
  return trimmed;
}

export const CATEGORY_CONFIG: Record<
  ReservationCategory,
  {
    label: string;
    tabLabel: string;
    subtitle: string;
    badgeClass: string;
    icon: string;
  }
> = {
  WAITING_APPROVAL: {
    label: 'Waiting for Approval',
    tabLabel: 'Waiting Approval',
    subtitle: 'Guest reservations requiring front desk payment verification and approval',
    badgeClass: 'bg-amber-500/15 text-amber-800 dark:text-amber-200 border-amber-500/40',
    icon: '⚡',
  },
  TODAY_CHECK_IN: {
    label: "Today's Check-Ins",
    tabLabel: 'Today Check-In',
    subtitle: 'Confirmed arrivals scheduled for check-in today',
    badgeClass: 'bg-blue-500/15 text-blue-800 dark:text-blue-200 border-blue-500/40',
    icon: '🛎️',
  },
  TODAY_CHECKED_IN: {
    label: 'Already Checked In for Today',
    tabLabel: 'Already Checked In',
    subtitle: 'In-house guests who have completed registration and room key handover',
    badgeClass: 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border-emerald-500/40',
    icon: '✅',
  },
  UPCOMING: {
    label: 'Upcoming Reservations',
    tabLabel: 'Upcoming',
    subtitle: 'Future reservations scheduled after today',
    badgeClass: 'bg-indigo-500/15 text-indigo-800 dark:text-indigo-200 border-indigo-500/40',
    icon: '📅',
  },
  DUE: {
    label: 'Due & Past Reservations',
    tabLabel: 'Due & Past',
    subtitle: 'Overdue arrivals, completed stays, and cancelled records',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-300',
    icon: '📋',
  },
};

const CATEGORY_PRIORITY: Record<ReservationCategory, number> = {
  WAITING_APPROVAL: 1,
  TODAY_CHECK_IN: 2,
  TODAY_CHECKED_IN: 3,
  UPCOMING: 4,
  DUE: 5,
};

export function getReservationCategory(b: Booking, today: string): ReservationCategory {
  // 1. Waiting for approval: any pending reservation awaiting payment verification & staff approval
  if (b.status === 'PENDING') {
    return 'WAITING_APPROVAL';
  }

  // 2. Today check in: strictly confirmed arrivals scheduled for check-in today
  if (b.checkIn === today && b.status === 'CONFIRMED') {
    return 'TODAY_CHECK_IN';
  }

  // 3. Already checked in for today (or currently in-house)
  if (b.status === 'CHECKED_IN') {
    return 'TODAY_CHECKED_IN';
  }

  // 4. Upcoming: future confirmed reservations (strictly checkIn > today)
  if (b.checkIn > today && b.status === 'CONFIRMED') {
    return 'UPCOMING';
  }

  // 5. Due reservations at the last in order: overdue arrivals/departures, past checked out, cancelled
  return 'DUE';
}

function DetailModal({
  booking,
  onClose,
  onCheckIn,
  today,
}: {
  booking: Booking | null;
  onClose: () => void;
  onCheckIn: (booking: Booking) => void;
  today: string;
}) {
  if (!booking) return null;
  const category = getReservationCategory(booking, today);
  const ready = booking.status === 'CONFIRMED' && booking.checkIn <= today;
  const isWaitingApproval = booking.status === 'PENDING';

  return (
    <Modal open={booking !== null} onClose={onClose} title={`Reservation ${booking.ref}`}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <StatusChip status={booking.status} />
          <StatusChip status={booking.payment} />
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-label-xs font-bold',
              CATEGORY_CONFIG[category].badgeClass,
            )}
          >
            <span>{CATEGORY_CONFIG[category].icon}</span>
            <span>{CATEGORY_CONFIG[category].label}</span>
          </span>
          {isWaitingApproval && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/40 px-2.5 py-0.5 text-label-sm font-semibold text-amber-800 dark:text-amber-200">
              ⚡ Paid · Pending Approval
            </span>
          )}
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
            <p className="text-label-sm text-on-surface-variant">Stay Dates</p>
            <p className="mt-0.5 font-medium text-on-surface">
              {dateRange(booking.checkIn, booking.checkOut)} · {booking.nights}{' '}
              {booking.nights === 1 ? 'night' : 'nights'}
            </p>
          </div>
          <div>
            <p className="text-label-sm text-on-surface-variant">Amount</p>
            <p className="mt-0.5 font-bold text-on-surface">{mmk(booking.amount)}</p>
          </div>
          <div>
            <p className="text-label-sm text-on-surface-variant">Category Status</p>
            <p className="mt-0.5 font-semibold text-on-surface">
              {CATEGORY_CONFIG[category].label}
            </p>
          </div>
        </div>

        {cleanRequestText(booking.request) && (
          <p className="rounded-lg bg-tertiary-fixed/60 px-3 py-2 text-body-sm text-on-tertiary-fixed-variant">
            {cleanRequestText(booking.request)}
          </p>
        )}

        {booking.slip && (booking.slip.image || booking.slip.receiptUrl || booking.slip.dataUrl) && (
          <div className="rounded-xl border border-outline-variant/60 bg-surface-container-low p-3.5 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-label-sm font-semibold text-on-surface flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-primary" />
                Uploaded Payment Screenshot
              </p>
              <span className="text-label-xs font-mono text-on-surface-variant">
                {booking.slip.txnRef}
              </span>
            </div>
            <div className="relative group overflow-hidden rounded-lg border border-outline-variant/40 bg-surface-container max-h-56 flex items-center justify-center">
              <img
                src={booking.slip.image || booking.slip.receiptUrl || booking.slip.dataUrl}
                alt="Bank transaction receipt"
                className="w-full max-h-56 object-contain bg-black/5"
              />
              <button
                type="button"
                onClick={() => window.open(booking.slip?.image || booking.slip?.receiptUrl || booking.slip?.dataUrl, '_blank', 'noopener,noreferrer')}
                className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-label-sm font-medium gap-1.5"
              >
                <Maximize2 className="h-4 w-4" /> Tap to view full size
              </button>
            </div>
            {booking.slip.fileName && (
              <p className="text-label-xs text-on-surface-variant truncate">
                File: {booking.slip.fileName}
              </p>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-outline-variant/40 pt-4">
          <Button variant="outline" size="sm" onClick={() => printBookingConfirmation(booking)}>
            <Printer className="h-3.5 w-3.5" />
            Print confirmation
          </Button>
          {isWaitingApproval && (
            <Link to="/requests">
              <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white border-none shadow-sm">
                Review Slip & Approve
              </Button>
            </Link>
          )}
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
  const { bookings, checkInBooking, refresh } = useAppStore();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('ALL');
  const [viewRef, setViewRef] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get('q') ?? '';

  const today = todayIso();

  const isPaidPendingApproval = (b: Booking): boolean => {
    return (
      b.status === 'PENDING' &&
      (b.payment === 'PAID' || b.payment === 'PREPAID' || b.payment.startsWith('PREPAID'))
    );
  };

  const isOverdueArrival = (b: Booking): boolean => {
    return (b.status === 'CONFIRMED' || b.status === 'PENDING') && b.checkIn < today;
  };

  const isOverdueDeparture = (b: Booking): boolean => {
    return b.status === 'CHECKED_IN' && b.checkOut < today;
  };

  // Group counts across all 5 ordered categories
  const categoryCounts = useMemo(() => {
    const counts: Record<ReservationCategory, number> = {
      WAITING_APPROVAL: 0,
      TODAY_CHECK_IN: 0,
      TODAY_CHECKED_IN: 0,
      UPCOMING: 0,
      DUE: 0,
    };

    bookings.forEach((b) => {
      const cat = getReservationCategory(b, today);
      counts[cat] += 1;
    });

    return counts;
  }, [bookings, today]);

  const setQuery = (next: string): void => {
    if (next) setSearchParams({ q: next });
    else setSearchParams({});
  };

  // Filtered and sorted rows in the exact 5-category order:
  // 1. Waiting for approval
  // 2. Today check in (only reservations with today date)
  // 3. Already checked in for today
  // 4. Upcoming
  // 5. Due reservations (at the last)
  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();

    const matchesTab = (b: Booking): boolean => {
      const cat = getReservationCategory(b, today);
      if (tab === 'ALL') return true;
      return cat === tab;
    };

    const filtered = bookings.filter((b) => {
      if (!matchesTab(b)) return false;
      if (!needle) return true;
      return `${b.guestName} ${b.ref} ${b.room} ${b.phone ?? ''}`.toLowerCase().includes(needle);
    });

    return [...filtered].sort((a, b) => {
      const catA = getReservationCategory(a, today);
      const catB = getReservationCategory(b, today);

      if (CATEGORY_PRIORITY[catA] !== CATEGORY_PRIORITY[catB]) {
        return CATEGORY_PRIORITY[catA] - CATEGORY_PRIORITY[catB];
      }

      // Sub-sorting within each category:
      switch (catA) {
        case 'WAITING_APPROVAL': {
          // Paid with slip first, then by check-in date
          const paidA = isPaidPendingApproval(a) ? 0 : 1;
          const paidB = isPaidPendingApproval(b) ? 0 : 1;
          if (paidA !== paidB) return paidA - paidB;
          return a.checkIn.localeCompare(b.checkIn);
        }
        case 'TODAY_CHECK_IN': {
          // Strictly checkIn === today! Confirmed first, then sort by room or ref
          const confA = a.status === 'CONFIRMED' ? 0 : 1;
          const confB = b.status === 'CONFIRMED' ? 0 : 1;
          if (confA !== confB) return confA - confB;
          return (a.room || '').localeCompare(b.room || '') || a.ref.localeCompare(b.ref);
        }
        case 'TODAY_CHECKED_IN': {
          // Check-in today first, then earlier in-house
          const todayA = a.checkIn === today ? 0 : 1;
          const todayB = b.checkIn === today ? 0 : 1;
          if (todayA !== todayB) return todayA - todayB;
          return a.checkOut.localeCompare(b.checkOut);
        }
        case 'UPCOMING': {
          // Earliest upcoming stay first
          return a.checkIn.localeCompare(b.checkIn);
        }
        case 'DUE': {
          // Overdue arrivals first, then overdue departures, then checked out, then cancelled
          const getDueRank = (x: Booking): number => {
            if (x.status === 'CONFIRMED' && x.checkIn < today) return 0;
            if (x.status === 'CHECKED_IN' && x.checkOut < today) return 1;
            if (x.status === 'CHECKED_OUT') return 2;
            return 3;
          };
          const rA = getDueRank(a);
          const rB = getDueRank(b);
          if (rA !== rB) return rA - rB;
          return b.checkIn.localeCompare(a.checkIn);
        }
      }
    });
  }, [bookings, tab, q, today]);

  const viewed = bookings.find((b) => b.ref === viewRef) ?? null;

  const handleCheckIn = (booking: Booking): void => {
    if (checkInBooking(booking.ref)) {
      toast.success(`${booking.guestName} checked in · ${booking.ref}`);
      setViewRef(null);
    } else {
      toast.warning(`${booking.ref} is not ready to check in`);
    }
  };

  const handleManualRefresh = () => {
    refresh();
    toast.info(`Synced · ${bookings.length} reservations current`);
  };

  const tabsList: { id: Tab; label: string; count: number }[] = [
    { id: 'ALL', label: 'All Stays', count: bookings.length },
    { id: 'WAITING_APPROVAL', label: 'Waiting Approval', count: categoryCounts.WAITING_APPROVAL },
    { id: 'TODAY_CHECK_IN', label: "Today's Check-In", count: categoryCounts.TODAY_CHECK_IN },
    { id: 'TODAY_CHECKED_IN', label: 'Already Checked In', count: categoryCounts.TODAY_CHECKED_IN },
    { id: 'UPCOMING', label: 'Upcoming', count: categoryCounts.UPCOMING },
    { id: 'DUE', label: 'Due / Past', count: categoryCounts.DUE },
  ];

  const totalConfirmedReservations = useMemo(
    () => bookings.filter((b) => b.status === 'CONFIRMED').length,
    [bookings],
  );

  const totalInHouseGuests = useMemo(
    () => bookings.filter((b) => b.status === 'CHECKED_IN').length,
    [bookings],
  );

  const overdueArrivalsCount = useMemo(
    () => bookings.filter((b) => b.status === 'CONFIRMED' && b.checkIn < today).length,
    [bookings, today],
  );

  return (
    <div className="space-y-6">
      <SectionTitle
        eyebrow="StayEase · Front Desk Operations"
        title="Reservations Dashboard"
        description={`Live guest folio registry for Yangon Heritage • System date: ${shortDate(today, true)}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleManualRefresh}
            >
              <RefreshCw className="h-4 w-4" />
              Sync Live
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

      {/* 5 Ordered Category Stat Chips */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatChip
          label="Waiting Approval"
          value={String(categoryCounts.WAITING_APPROVAL)}
          accent="amber"
          icon={<ShieldCheck className="h-4 w-4" />}
        />
        <StatChip
          label="Today's Check-Ins"
          value={String(categoryCounts.TODAY_CHECK_IN)}
          accent="primary"
          icon={<CalendarDays className="h-4 w-4" />}
        />
        <StatChip
          label="Already Checked In"
          value={String(categoryCounts.TODAY_CHECKED_IN)}
          subtext={`${totalInHouseGuests} occupied ${totalInHouseGuests === 1 ? 'room' : 'rooms'}`}
          accent="secondary"
          icon={<UserCheck className="h-4 w-4" />}
        />
        <StatChip
          label="Upcoming Stays"
          value={String(categoryCounts.UPCOMING)}
          subtext={`${totalConfirmedReservations} reserved ${totalConfirmedReservations === 1 ? 'room' : 'rooms'} total`}
          accent="primary"
          icon={<Clock className="h-4 w-4" />}
        />
        <StatChip
          label="Due & Past Stays"
          value={String(categoryCounts.DUE)}
          subtext={overdueArrivalsCount > 0 ? `${overdueArrivalsCount} overdue arrival held` : undefined}
          accent="secondary"
          icon={<Banknote className="h-4 w-4" />}
        />
      </div>

      <Panel
        title={
          tab === 'ALL'
            ? 'Ordered Reservations Registry'
            : CATEGORY_CONFIG[tab]?.label || 'Reservations'
        }
        subtitle={`${rows.length} reservation${rows.length === 1 ? '' : 's'} displayed`}
        action={
          <div className="flex flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:items-center">
            {q && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setTab('ALL');
                }}
                className="flex items-center gap-1 rounded-full bg-secondary-container px-3 py-1.5 text-label-sm font-medium text-on-secondary-container cursor-pointer"
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
                placeholder="Search guest, ref, room…"
                className="h-9 w-full rounded-full pl-9 sm:w-52"
              />
            </div>
            <div className="flex flex-wrap items-center gap-1 rounded-full border border-outline-variant/60 bg-surface-container-low p-1">
              {tabsList.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={cn(
                    'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-label-sm font-medium transition cursor-pointer',
                    tab === t.id
                      ? 'bg-primary-container text-white shadow-sm'
                      : 'text-on-surface-variant hover:text-on-surface',
                  )}
                >
                  <span>{t.label}</span>
                  {t.count > 0 && (
                    <span
                      className={cn(
                        'rounded-full px-1.5 py-0.2 text-[10px] font-bold',
                        tab === t.id
                          ? 'bg-white/20 text-white'
                          : t.id === 'WAITING_APPROVAL'
                          ? 'bg-amber-500/20 text-amber-800 dark:text-amber-300'
                          : t.id === 'TODAY_CHECK_IN'
                          ? 'bg-blue-500/20 text-blue-800 dark:text-blue-300'
                          : 'bg-surface-container-high text-on-surface-variant',
                      )}
                    >
                      {t.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        }
        bodyClassName="p-0"
      >
        <ul className="divide-y divide-outline-variant/30">
          {rows.map((booking, index) => {
            const guests = Array.from({ length: Math.min(booking.adults, 3) });
            const category = getReservationCategory(booking, today);
            const paidPending = isPaidPendingApproval(booking);
            const overdueIn = isOverdueArrival(booking);
            const overdueOut = isOverdueDeparture(booking);

            // Determine if we need to show a category section header when viewing ALL
            const prevCategory = index > 0 ? getReservationCategory(rows[index - 1], today) : null;
            const showCategoryHeader = tab === 'ALL' && category !== prevCategory;
            const meta = CATEGORY_CONFIG[category];

            return (
              <li key={booking.ref}>
                {showCategoryHeader && (
                  <div className="flex flex-wrap items-center justify-between gap-2 border-y border-outline-variant/40 bg-surface-container-low/70 px-5 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{meta.icon}</span>
                      <span className="text-label-md font-bold text-on-surface">
                        {meta.label}
                      </span>
                      <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-bold border', meta.badgeClass)}>
                        {categoryCounts[category]}
                      </span>
                    </div>
                    <span className="text-label-xs text-on-surface-variant hidden md:inline">
                      {meta.subtitle}
                    </span>
                  </div>
                )}

                <div
                  className={cn(
                    'grid grid-cols-1 items-start gap-4 px-5 py-4 transition md:grid-cols-[1.4fr_1fr_1fr_auto]',
                    paidPending
                      ? 'bg-amber-500/5 hover:bg-amber-500/10 border-l-4 border-l-amber-500'
                      : category === 'TODAY_CHECK_IN'
                      ? 'bg-blue-500/5 hover:bg-blue-500/10 border-l-4 border-l-blue-600'
                      : category === 'TODAY_CHECKED_IN'
                      ? 'hover:bg-surface-container-low/40 border-l-4 border-l-emerald-600'
                      : 'hover:bg-surface-container-low/40',
                  )}
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-label-md font-semibold text-[#0e1c32]">
                        {booking.ref}
                      </span>
                      <StatusChip status={booking.status} />
                      <StatusChip status={booking.payment} />

                      {/* Explicit Category Badge */}
                      {category === 'WAITING_APPROVAL' && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/40 px-2 py-0.5 text-[11px] font-bold text-amber-800 dark:text-amber-200">
                          ⚡ Waiting for Approval
                        </span>
                      )}
                      {category === 'TODAY_CHECK_IN' && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/15 border border-blue-500/40 px-2 py-0.5 text-[11px] font-bold text-blue-800 dark:text-blue-200">
                          🛎️ Today Check-In
                        </span>
                      )}
                      {category === 'TODAY_CHECKED_IN' && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/40 px-2 py-0.5 text-[11px] font-bold text-emerald-800 dark:text-emerald-200">
                          {booking.checkIn === today ? '✅ Checked In Today' : 'In-House Stay'}
                        </span>
                      )}
                      {category === 'UPCOMING' && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/15 border border-indigo-500/40 px-2 py-0.5 text-[11px] font-bold text-indigo-800 dark:text-indigo-200">
                          📅 Upcoming · {shortDate(booking.checkIn)}
                        </span>
                      )}
                      {category === 'DUE' && (
                        overdueIn ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 border border-rose-500/40 px-2 py-0.5 text-[11px] font-bold text-rose-800">
                            <AlertTriangle className="h-3 w-3" /> Overdue Arrival
                          </span>
                        ) : overdueOut ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 border border-rose-500/40 px-2 py-0.5 text-[11px] font-bold text-rose-800">
                            <AlertTriangle className="h-3 w-3" /> Overdue Departure
                          </span>
                        ) : booking.status === 'CHECKED_OUT' ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 border border-slate-300 px-2 py-0.5 text-[11px] font-bold text-slate-700">
                            Checked Out
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 border border-slate-300 px-2 py-0.5 text-[11px] font-bold text-slate-500">
                            Cancelled
                          </span>
                        )
                      )}
                    </div>

                    <p className="mt-1.5 text-body-md font-semibold text-on-surface">
                      {booking.guestName}
                    </p>
                    <p className="mt-0.5 text-body-sm text-on-surface-variant">
                      {booking.room} · {booking.roomCategory}
                      {booking.phone ? ` · ${booking.phone}` : ''}
                    </p>
                    {cleanRequestText(booking.request) && (
                      <p className="mt-1.5 flex items-start gap-1.5 text-body-sm text-[#6a5b17]">
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        {cleanRequestText(booking.request)}
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
                    {category === 'WAITING_APPROVAL' ? (
                      <Link to="/requests">
                        <Button variant="secondary" size="sm" className="bg-amber-600 hover:bg-amber-700 text-white border-none shadow-sm">
                          Review Slip
                        </Button>
                      </Link>
                    ) : (
                      (category === 'TODAY_CHECK_IN' || (booking.status === 'CONFIRMED' && category !== 'TODAY_CHECKED_IN' && category !== 'DUE')) && (
                        <Button variant="secondary" size="sm" onClick={() => handleCheckIn(booking)}>
                          Check in
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                      )
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        {rows.length === 0 && (
          <div className="space-y-3 px-6 py-10 text-center">
            <Banknote className="mx-auto h-8 w-8 text-on-surface-variant/40" />
            <p className="text-body-md text-on-surface">No reservations match this category view.</p>
            {q && (
              <Button variant="outline" size="sm" onClick={() => setQuery('')}>
                Clear search
              </Button>
            )}
          </div>
        )}
      </Panel>

      <DetailModal
        booking={viewed}
        onClose={() => setViewRef(null)}
        onCheckIn={handleCheckIn}
        today={today}
      />
    </div>
  );
}