import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  Banknote,
  BedDouble,
  CalendarDays,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  History,
  LogIn,
  Maximize2,
  Plus,
  Printer,
  RefreshCw,
  Search,
  UserCheck,
  Users,
  X,
  AlertTriangle,
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
    pillClass: string;
    icon: React.ComponentType<{ className?: string }>;
    accentColor: string;
    bgTint: string;
  }
> = {
  WAITING_APPROVAL: {
    label: 'Waiting for Approval',
    tabLabel: 'Waiting Approval',
    subtitle: 'Guest reservations requiring front desk payment verification and approval',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-700/60',
    pillClass: 'bg-amber-500/15 text-amber-800 border-amber-500/30',
    icon: Clock,
    accentColor: 'text-amber-600',
    bgTint: 'from-amber-500/10 to-amber-500/5 border-amber-500/20',
  },
  TODAY_CHECK_IN: {
    label: "Today's Check-Ins",
    tabLabel: 'Today Check-In',
    subtitle: 'Confirmed arrivals scheduled for check-in today',
    badgeClass: 'bg-sky-50 text-sky-800 border-sky-300 dark:bg-sky-950/40 dark:text-sky-200 dark:border-sky-700/60',
    pillClass: 'bg-sky-500/15 text-sky-800 border-sky-500/30',
    icon: LogIn,
    accentColor: 'text-sky-600',
    bgTint: 'from-sky-500/10 to-sky-500/5 border-sky-500/20',
  },
  TODAY_CHECKED_IN: {
    label: 'Already Checked In for Today',
    tabLabel: 'Already Checked In',
    subtitle: 'In-house guests who have completed registration and room key handover',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-700/60',
    pillClass: 'bg-emerald-500/15 text-emerald-800 border-emerald-500/30',
    icon: UserCheck,
    accentColor: 'text-emerald-600',
    bgTint: 'from-emerald-500/10 to-emerald-500/5 border-emerald-500/20',
  },
  UPCOMING: {
    label: 'Upcoming Reservations',
    tabLabel: 'Upcoming',
    subtitle: 'Future reservations scheduled after today',
    badgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-300 dark:bg-indigo-950/40 dark:text-indigo-200 dark:border-indigo-700/60',
    pillClass: 'bg-indigo-500/15 text-indigo-800 border-indigo-500/30',
    icon: CalendarDays,
    accentColor: 'text-indigo-600',
    bgTint: 'from-indigo-500/10 to-indigo-500/5 border-indigo-500/20',
  },
  DUE: {
    label: 'Due & Past Reservations',
    tabLabel: 'Due & Past',
    subtitle: 'Overdue arrivals, completed stays, and archived records',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700',
    pillClass: 'bg-slate-200/60 text-slate-700 border-slate-300',
    icon: History,
    accentColor: 'text-slate-500',
    bgTint: 'from-slate-500/10 to-slate-500/5 border-slate-500/20',
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
  const CategoryIcon = CATEGORY_CONFIG[category].icon;

  return (
    <Modal open={booking !== null} onClose={onClose} title={`Folio Registry · ${booking.ref}`}>
      <div className="space-y-4">
        {/* Status bar */}
        <div className="flex flex-wrap items-center gap-2">
          <StatusChip status={booking.status} />
          <StatusChip status={booking.payment} />
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-label-xs font-bold',
              CATEGORY_CONFIG[category].pillClass,
            )}
          >
            <CategoryIcon className="h-3 w-3" />
            <span>{CATEGORY_CONFIG[category].label}</span>
          </span>
          {isWaitingApproval && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/40 px-2.5 py-0.5 text-label-xs font-bold text-amber-800 dark:text-amber-200">
              <Clock className="h-3 w-3" /> Paid · Pending Approval
            </span>
          )}
        </div>

        {/* Guest profile strip */}
        <div className="flex items-center gap-3.5 rounded-xl border border-outline-variant/40 bg-surface-container-low/60 p-4">
          <Avatar name={booking.guestName} className="h-12 w-12 text-title-sm ring-2 ring-white shadow-sm" />
          <div className="min-w-0 flex-1">
            <p className="text-body-md font-bold text-on-surface">{booking.guestName}</p>
            <p className="text-label-sm text-on-surface-variant flex items-center gap-1.5">
              {booking.phone && (
                <>
                  <span className="font-mono">{booking.phone}</span>
                  <span>·</span>
                </>
              )}
              <span>{booking.adults} {booking.adults === 1 ? 'registered guest' : 'registered guests'}</span>
            </p>
          </div>
        </div>

        {/* 4-cell info grid */}
        <div className="grid grid-cols-2 gap-3 rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-3.5 text-body-sm sm:grid-cols-2">
          <div className="rounded-lg bg-surface-container-low/40 p-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">Room &amp; Tier</p>
            <p className="mt-1 font-bold text-on-surface flex items-center gap-1">
              <BedDouble className="h-3.5 w-3.5 text-secondary" />
              <span>{booking.room}</span>
            </p>
            <p className="text-xs text-on-surface-variant">{booking.roomCategory}</p>
          </div>
          <div className="rounded-lg bg-surface-container-low/40 p-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">Stay Duration</p>
            <p className="mt-1 font-bold text-on-surface">{booking.nights} {booking.nights === 1 ? 'Night' : 'Nights'}</p>
            <p className="text-xs text-on-surface-variant font-mono">{dateRange(booking.checkIn, booking.checkOut)}</p>
          </div>
          <div className="rounded-lg bg-surface-container-low/40 p-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">Total Folio</p>
            <p className="mt-1 font-mono font-bold text-on-surface text-base">{mmk(booking.amount)}</p>
            <p className="text-xs text-on-surface-variant">{booking.payment}</p>
          </div>
          <div className="rounded-lg bg-surface-container-low/40 p-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">Category State</p>
            <p className="mt-1 font-bold text-on-surface text-xs">{CATEGORY_CONFIG[category].label}</p>
            <p className="text-xs text-on-surface-variant">Status: {booking.status}</p>
          </div>
        </div>

        {/* Special requests callout */}
        {cleanRequestText(booking.request) && (
          <div className="rounded-xl border border-amber-200/80 bg-amber-50/70 p-3 text-body-sm text-amber-950">
            <p className="text-label-xs font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-amber-600" />
              Special Guest Note / Preferences
            </p>
            <p className="mt-1 text-xs text-amber-900 leading-relaxed font-medium">
              {cleanRequestText(booking.request)}
            </p>
          </div>
        )}

        {/* Uploaded Payment Slip Card */}
        {booking.slip && (booking.slip.image || booking.slip.receiptUrl || booking.slip.dataUrl) && (
          <div className="rounded-xl border border-outline-variant/60 bg-surface-container-low p-3.5 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-label-sm font-semibold text-on-surface flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-primary" />
                Uploaded Payment Screenshot
              </p>
              <span className="text-label-xs font-mono font-bold text-on-surface-variant bg-surface-container px-2 py-0.5 rounded">
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
                className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-label-sm font-medium gap-1.5 cursor-pointer"
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

        {/* Modal actions */}
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-outline-variant/40 pt-4">
          <Button variant="outline" size="sm" onClick={() => printBookingConfirmation(booking)}>
            <Printer className="h-3.5 w-3.5" />
            Print Confirmation
          </Button>
          {isWaitingApproval && (
            <Link to="/requests">
              <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white border-none shadow-sm">
                <FileText className="h-3.5 w-3.5 mr-1" />
                Review Slip &amp; Approve
              </Button>
            </Link>
          )}
          {ready && (
            <Button variant="secondary" size="sm" onClick={() => onCheckIn(booking)}>
              Check in
              <ArrowRight className="h-3.5 w-3.5 ml-1" />
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
      {/* Executive Page Title */}
      <SectionTitle
        eyebrow="StayEase · Front Desk Operations"
        title="Reservations Dashboard"
        description={
          <span className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-label-xs font-semibold text-emerald-800 dark:text-emerald-300 border border-emerald-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Folio Registry
            </span>
            <span>Yangon Heritage</span>
            <span>•</span>
            <span>System Date: {shortDate(today, true)}</span>
          </span>
        }
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleManualRefresh}
              className="border-outline-variant/70 shadow-sm"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Sync Live
            </Button>
            <Link to="/availability">
              <Button size="sm" className="shadow-sm">
                <Plus className="h-3.5 w-3.5" />
                New Walk-in
              </Button>
            </Link>
          </div>
        }
      />

      {/* 5 Ordered Executive KPI Metric Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {(
          [
            {
              id: 'WAITING_APPROVAL' as const,
              label: 'Waiting Approval',
              value: categoryCounts.WAITING_APPROVAL,
              subtext: 'Action required',
              icon: Clock,
              iconColor: 'text-amber-600 dark:text-amber-400',
              iconBg: 'bg-amber-500/10',
              borderHover: 'hover:border-amber-400',
            },
            {
              id: 'TODAY_CHECK_IN' as const,
              label: "Today's Check-Ins",
              value: categoryCounts.TODAY_CHECK_IN,
              subtext: 'Scheduled arrivals',
              icon: LogIn,
              iconColor: 'text-sky-600 dark:text-sky-400',
              iconBg: 'bg-sky-500/10',
              borderHover: 'hover:border-sky-400',
            },
            {
              id: 'TODAY_CHECKED_IN' as const,
              label: 'Already Checked In',
              value: categoryCounts.TODAY_CHECKED_IN,
              subtext: `${totalInHouseGuests} in-house ${totalInHouseGuests === 1 ? 'room' : 'rooms'}`,
              icon: UserCheck,
              iconColor: 'text-emerald-600 dark:text-emerald-400',
              iconBg: 'bg-emerald-500/10',
              borderHover: 'hover:border-emerald-400',
            },
            {
              id: 'UPCOMING' as const,
              label: 'Upcoming Stays',
              value: categoryCounts.UPCOMING,
              subtext: `${totalConfirmedReservations} confirmed total`,
              icon: CalendarDays,
              iconColor: 'text-indigo-600 dark:text-indigo-400',
              iconBg: 'bg-indigo-500/10',
              borderHover: 'hover:border-indigo-400',
            },
            {
              id: 'DUE' as const,
              label: 'Due & Past Stays',
              value: categoryCounts.DUE,
              subtext:
                overdueArrivalsCount > 0
                  ? `${overdueArrivalsCount} overdue arrival`
                  : 'Archived & departures',
              icon: History,
              iconColor: 'text-slate-500 dark:text-slate-400',
              iconBg: 'bg-slate-500/10',
              borderHover: 'hover:border-slate-400',
            },
          ] as const
        ).map((item) => {
          const Icon = item.icon;
          const isSelected = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab((curr) => (curr === item.id ? 'ALL' : item.id))}
              className={cn(
                'group relative flex flex-col justify-between rounded-xl border bg-white p-3.5 text-left transition-all duration-200 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-md cursor-pointer',
                isSelected
                  ? 'border-primary ring-2 ring-primary/20 bg-surface-container-low/30'
                  : 'border-outline-variant/50 hover:bg-surface-container-lowest',
                item.borderHover,
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-105',
                    item.iconBg,
                    item.iconColor,
                  )}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span className="font-mono text-2xl font-bold tracking-tight text-on-surface">
                  {item.value}
                </span>
              </div>
              <div className="mt-3">
                <p className="text-label-sm font-semibold tracking-wide text-on-surface">
                  {item.label}
                </p>
                <p className="mt-0.5 text-[11px] text-on-surface-variant/80 truncate">
                  {item.subtext}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Main Registry Panel */}
      <Panel
        title={
          tab === 'ALL'
            ? 'Ordered Reservations Registry'
            : CATEGORY_CONFIG[tab]?.label || 'Reservations'
        }
        subtitle={`${rows.length} reservation${rows.length === 1 ? '' : 's'} displayed`}
        action={
          <div className="flex flex-col items-stretch gap-2.5 sm:w-auto lg:flex-row lg:items-center">
            {q && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setTab('ALL');
                }}
                className="flex items-center gap-1.5 rounded-full bg-secondary-container/80 px-3 py-1.5 text-label-sm font-semibold text-on-secondary-container hover:bg-secondary-container transition cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
                <span>Clear &ldquo;{q}&rdquo;</span>
              </button>
            )}
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-on-surface-variant/60" />
              <TextInput
                value={q}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search guest, ref, room, phone…"
                className="h-9 w-full rounded-lg pl-9 pr-4 text-body-sm sm:w-60 border-outline-variant/60 bg-surface-container-lowest/90 shadow-sm focus:border-primary focus:ring-1 focus:ring-primary/20"
              />
            </div>
            <div className="flex flex-wrap items-center gap-1 rounded-xl border border-outline-variant/60 bg-surface-container-low/70 p-1">
              {tabsList.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={cn(
                    'flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-label-sm font-medium transition cursor-pointer',
                    tab === t.id
                      ? 'bg-primary-container text-white shadow-sm'
                      : 'text-on-surface-variant hover:text-on-surface hover:bg-white/60',
                  )}
                >
                  <span>{t.label}</span>
                  {t.count > 0 && (
                    <span
                      className={cn(
                        'rounded-full px-1.5 py-0.2 text-[10px] font-bold font-mono',
                        tab === t.id
                          ? 'bg-white/20 text-white'
                          : t.id === 'WAITING_APPROVAL'
                          ? 'bg-amber-500/20 text-amber-900 dark:text-amber-300'
                          : t.id === 'TODAY_CHECK_IN'
                          ? 'bg-sky-500/20 text-sky-900 dark:text-sky-300'
                          : t.id === 'TODAY_CHECKED_IN'
                          ? 'bg-emerald-500/20 text-emerald-900 dark:text-emerald-300'
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
            const CategoryIcon = meta.icon;

            return (
              <li key={booking.ref}>
                {showCategoryHeader && (
                  <div className="flex flex-wrap items-center justify-between gap-2 border-y border-outline-variant/40 bg-surface-container-low/80 px-5 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <span className={cn('flex h-6 w-6 items-center justify-center rounded-md border', meta.badgeClass)}>
                        <CategoryIcon className="h-3.5 w-3.5" />
                      </span>
                      <span className="text-label-md font-bold tracking-tight text-on-surface uppercase">
                        {meta.label}
                      </span>
                      <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-bold font-mono border', meta.pillClass)}>
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
                    'grid grid-cols-1 items-start gap-4 px-5 py-4 transition-all duration-150 md:grid-cols-[1.4fr_1fr_1fr_auto]',
                    paidPending
                      ? 'bg-amber-500/[0.04] hover:bg-amber-500/[0.08] border-l-[3px] border-l-amber-500'
                      : category === 'TODAY_CHECK_IN'
                      ? 'bg-sky-500/[0.04] hover:bg-sky-500/[0.08] border-l-[3px] border-l-sky-600'
                      : category === 'TODAY_CHECKED_IN'
                      ? 'hover:bg-surface-container-low/40 border-l-[3px] border-l-emerald-600'
                      : 'hover:bg-surface-container-low/40 border-l-[3px] border-l-transparent',
                  )}
                >
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-label-xs font-bold tracking-wider text-slate-800 bg-slate-100 border border-slate-200/80 px-2 py-0.5 rounded shadow-[0_1px_1px_rgba(0,0,0,0.03)]">
                        {booking.ref}
                      </span>
                      <StatusChip status={booking.status} />
                      <StatusChip status={booking.payment} />

                      {/* Explicit Category Badge with Clean Lucide Icon */}
                      {category === 'WAITING_APPROVAL' && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-300 px-2 py-0.5 text-[11px] font-bold text-amber-800 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-700/60">
                          <Clock className="h-3 w-3 text-amber-600" />
                          Waiting for Approval
                        </span>
                      )}
                      {category === 'TODAY_CHECK_IN' && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 border border-sky-300 px-2 py-0.5 text-[11px] font-bold text-sky-800 dark:bg-sky-950/40 dark:text-sky-200 dark:border-sky-700/60">
                          <LogIn className="h-3 w-3 text-sky-600" />
                          Today Check-In
                        </span>
                      )}
                      {category === 'TODAY_CHECKED_IN' && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-300 px-2 py-0.5 text-[11px] font-bold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-700/60">
                          <UserCheck className="h-3 w-3 text-emerald-600" />
                          {booking.checkIn === today ? 'Checked In Today' : 'In-House Stay'}
                        </span>
                      )}
                      {category === 'UPCOMING' && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 border border-indigo-300 px-2 py-0.5 text-[11px] font-bold text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-200 dark:border-indigo-700/60">
                          <CalendarDays className="h-3 w-3 text-indigo-600" />
                          Upcoming · {shortDate(booking.checkIn)}
                        </span>
                      )}
                      {category === 'DUE' && (
                        overdueIn ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 border border-rose-300 px-2 py-0.5 text-[11px] font-bold text-rose-800 dark:bg-rose-950/40 dark:text-rose-200 dark:border-rose-700/60">
                            <AlertTriangle className="h-3 w-3 text-rose-600" /> Overdue Arrival
                          </span>
                        ) : overdueOut ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 border border-rose-300 px-2 py-0.5 text-[11px] font-bold text-rose-800 dark:bg-rose-950/40 dark:text-rose-200 dark:border-rose-700/60">
                            <AlertTriangle className="h-3 w-3 text-rose-600" /> Overdue Departure
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

                      {/* Slip attached micro-indicator */}
                      {booking.slip && (booking.slip.image || booking.slip.receiptUrl || booking.slip.dataUrl) && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary-container/10 border border-primary-container/20 px-2 py-0.5 text-[11px] font-semibold text-primary-container">
                          <FileText className="h-3 w-3" />
                          Slip Attached
                        </span>
                      )}
                    </div>

                    <p className="text-body-md font-semibold text-on-surface tracking-tight">
                      {booking.guestName}
                    </p>
                    <p className="text-body-sm text-on-surface-variant flex items-center gap-1.5">
                      <BedDouble className="h-3.5 w-3.5 text-secondary shrink-0" />
                      <span className="font-medium text-on-surface">{booking.room}</span>
                      <span>·</span>
                      <span>{booking.roomCategory}</span>
                      {booking.phone && (
                        <>
                          <span>·</span>
                          <span className="font-mono text-xs">{booking.phone}</span>
                        </>
                      )}
                    </p>
                    {cleanRequestText(booking.request) && (
                      <p className="flex items-start gap-1.5 rounded-md bg-amber-50/80 border border-amber-200/60 px-2.5 py-1 text-label-xs text-amber-900 dark:bg-amber-950/30 dark:text-amber-200 dark:border-amber-800/40">
                        <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-amber-700" />
                        <span>{cleanRequestText(booking.request)}</span>
                      </p>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-1.5 text-label-sm text-on-surface-variant">
                      <CalendarDays className="h-3.5 w-3.5 text-secondary shrink-0" />
                      <span className="font-medium text-on-surface">
                        {dateRange(booking.checkIn, booking.checkOut)}
                      </span>
                    </div>
                    <p className="mt-1 flex items-center gap-1.5 text-label-xs text-on-surface-variant font-mono">
                      <span className="rounded bg-surface-container px-1.5 py-0.5 font-bold text-on-surface">
                        {booking.nights} {booking.nights === 1 ? 'NIGHT' : 'NIGHTS'}
                      </span>
                    </p>
                    <div className="mt-2 flex items-center gap-1">
                      {guests.map((_, i) => (
                        <Avatar key={i} name="Guest" className="h-5 w-5 text-label-xs" />
                      ))}
                      <span className="ml-1 flex items-center gap-1 text-label-sm text-on-surface-variant">
                        <Users className="h-3 w-3" />
                        {booking.adults} {booking.adults === 1 ? 'guest' : 'guests'}
                      </span>
                    </div>
                  </div>

                  <div className="md:text-right">
                    <p className="font-mono text-label-md font-bold text-on-surface">
                      {mmk(booking.amount)}
                    </p>
                    <p className="mt-0.5 text-label-xs font-medium uppercase tracking-wider text-on-surface-variant/80">
                      {booking.status === 'CHECKED_IN' ? 'Open Folio' : 'Total Stay'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 md:justify-end">
                    <Button variant="ghost" size="sm" onClick={() => setViewRef(booking.ref)} className="h-8 px-2.5 text-label-sm">
                      <Eye className="h-3.5 w-3.5 mr-1" />
                      View
                    </Button>
                    {category === 'WAITING_APPROVAL' ? (
                      <Link to="/requests">
                        <Button variant="secondary" size="sm" className="h-8 bg-amber-600 hover:bg-amber-700 text-white border-none shadow-sm text-label-sm font-semibold">
                          <FileText className="h-3.5 w-3.5 mr-1" />
                          Review Slip
                        </Button>
                      </Link>
                    ) : (
                      (category === 'TODAY_CHECK_IN' ||
                        (booking.status === 'CONFIRMED' &&
                          category !== 'TODAY_CHECKED_IN' &&
                          category !== 'DUE')) && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleCheckIn(booking)}
                          className="h-8 text-label-sm font-semibold"
                        >
                          Check in
                          <ArrowRight className="h-3.5 w-3.5 ml-1" />
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
          <div className="space-y-3 px-6 py-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-surface-container-low text-on-surface-variant/60">
              <Banknote className="h-6 w-6" />
            </div>
            <p className="text-body-md font-medium text-on-surface">No reservations match this category view.</p>
            <p className="text-body-sm text-on-surface-variant">Try selecting another filter tab or clearing your search term.</p>
            {q && (
              <Button variant="outline" size="sm" onClick={() => setQuery('')} className="mt-2">
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