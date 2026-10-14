import { useMemo, useState } from 'react';
import {
  BedDouble,
  CheckCircle2,
  RefreshCw,
  Search,
  Soup,
  Sparkles,
  Tag,
  Users,
  X,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { addDays, mmk, todayIso } from '@/lib/format';
import { LOCALE } from '@/data/seed';
import { useAppStore } from '@/store';
import { useToast } from '@/components/toast';
import {
  Button,
  Field,
  Panel,
  SectionTitle,
  SelectInput,
  StatusChip,
  TextArea,
  TextInput,
  Toggle,
} from '@/components/ui';
import type { Room } from '@/types';

function RoomCard({
  room,
  selected,
  onSelect,
}: {
  room: Room;
  selected: boolean;
  onSelect: (number: string) => void;
}) {
  return (
    <div
      className={cn(
        'flex flex-col rounded-xl border bg-surface-container-lowest p-4 shadow-[0_1px_2px_rgba(17,28,45,0.05)] transition',
        selected
          ? 'border-secondary ring-2 ring-secondary/25'
          : 'border-outline-variant/50 hover:border-outline-variant',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <BedDouble className={cn('h-4 w-4', selected ? 'text-secondary' : 'text-on-surface-variant')} />
          <span className="text-title-sm font-semibold tracking-tight text-on-surface">
            Room {room.number}
          </span>
        </div>
        <StatusChip status={room.status} />
      </div>

      <p className="mt-1 text-label-md font-medium text-on-surface-variant">
        {room.category} · {room.wing}
      </p>

      <div className="mt-3 flex items-center gap-3 text-label-sm text-on-surface-variant">
        <span className="flex items-center gap-1">
          <BedDouble className="h-3.5 w-3.5" />
          {room.beds}
        </span>
        <span className="flex items-center gap-1">
          <Users className="h-3.5 w-3.5" />
          {room.maxGuests}
        </span>
        <span className="flex items-center gap-1">
          <Tag className="h-3.5 w-3.5" />
          {room.size} m²
        </span>
      </div>

      <div className="mt-2.5 flex flex-wrap gap-1">
        {room.amenities.slice(0, 3).map((a) => (
          <span
            key={a}
            className="rounded-full bg-surface-container px-2 py-0.5 text-label-sm text-on-surface-variant"
          >
            {a}
          </span>
        ))}
      </div>

      <div className="mt-3 flex items-end justify-between gap-2 border-t border-outline-variant/40 pt-3">
        <div>
          <p className="text-label-md font-bold text-on-surface">{mmk(room.pricePerNight)}</p>
          <p className="text-label-sm text-on-surface-variant">per night</p>
        </div>
        <Button
          variant={selected ? 'secondary' : 'outline'}
          size="sm"
          onClick={() => onSelect(room.number)}
          disabled={room.status !== 'AVAILABLE'}
        >
          {selected ? 'Selected' : 'Select'}
        </Button>
      </div>

      {room.status === 'OCCUPIED' && room.guestName && (
        <div className="mt-3 rounded-lg bg-secondary-container/40 px-3 py-2">
          <p className="flex items-center gap-1.5 text-label-md font-medium text-on-secondary-container">
            <span className="h-1.5 w-1.5 rounded-full bg-secondary" />
            {room.guestName}
          </p>
          {room.departsAt && (
            <p className="mt-0.5 text-label-sm text-on-secondary-container/80">
              Departs {room.departsAt}
            </p>
          )}
        </div>
      )}

      {room.status === 'RESERVED' && room.guestName && (
        <div className="mt-3 rounded-lg bg-primary-container px-3 py-2 text-[#ecf1ff]">
          <p className="flex items-center gap-1.5 text-label-md font-medium">
            <Sparkles className="h-3.5 w-3.5 text-[#89f5e7]" />
            {room.guestName}
          </p>
          {room.bookingRef && (
            <p className="mt-0.5 text-label-sm text-white/70">{room.bookingRef}</p>
          )}
        </div>
      )}

      {room.status === 'RESERVED' && (
        <div className="mt-3 rounded-lg bg-sky-500/10 border border-sky-500/20 px-3 py-2 text-sky-800 dark:text-sky-300">
          <p className="text-label-sm font-medium">Customer Reservation Confirmed</p>
          {room.departsAt && (
            <p className="mt-0.5 text-label-xs text-sky-700/80">{room.departsAt}</p>
          )}
        </div>
      )}

      {room.status === 'AVAILABLE' && room.upcomingBooking && (
        <div className="mt-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 text-emerald-800 dark:text-emerald-300">
          <p className="text-label-xs font-semibold flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Available until {room.upcomingBooking.checkIn}
          </p>
          <p className="mt-0.5 text-[11px] text-emerald-700/80">
            Upcoming: {room.upcomingBooking.guestName} (#{room.upcomingBooking.bookingRef})
          </p>
        </div>
      )}
    </div>
  );
}

type StatusFilter = 'ALL' | 'AVAILABLE' | 'OCCUPIED' | 'RESERVED';

export function RoomAvailabilityPage() {
  const { rooms, addWalkInBooking, walkIn, refresh } = useAppStore();
  const toast = useToast();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selected, setSelected] = useState<string | undefined>();
  const [guestName, setGuestName] = useState('');
  const [adults, setAdults] = useState('2');
  const [nights, setNights] = useState('2');
  const [payment, setPayment] = useState('KBZPay · Instant Verified');
  const [notes, setNotes] = useState('');
  const [breakfast, setBreakfast] = useState(true);

  const counts = useMemo(
    () => ({
      available: rooms.filter((r) => r.status === 'AVAILABLE').length,
      occupied: rooms.filter((r) => r.status === 'OCCUPIED').length,
      reserved: rooms.filter((r) => r.status === 'RESERVED').length,
    }),
    [rooms],
  );

  // Filter and sort: AVAILABLE rooms displayed at the FIRST!
  const filteredAndSortedRooms = useMemo(() => {
    // 1. Filter by status & search
    const filtered = rooms.filter((room) => {
      if (statusFilter !== 'ALL' && room.status !== statusFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchNum = room.number.toLowerCase().includes(q);
        const matchCat = room.category.toLowerCase().includes(q);
        const matchGuest = room.guestName?.toLowerCase().includes(q) ?? false;
        if (!matchNum && !matchCat && !matchGuest) return false;
      }
      return true;
    });

    // 2. Sort: AVAILABLE rooms ALWAYS FIRST, followed by RESERVED, OCCUPIED
    const statusPriority: Record<string, number> = {
      AVAILABLE: 0,
      RESERVED: 1,
      OCCUPIED: 2,
    };

    return [...filtered].sort((a, b) => {
      const priorityDiff = (statusPriority[a.status] ?? 99) - (statusPriority[b.status] ?? 99);
      if (priorityDiff !== 0) return priorityDiff;
      return a.number.localeCompare(b.number, undefined, { numeric: true });
    });
  }, [rooms, statusFilter, searchQuery]);

  const chosen =
    rooms.find((r) => r.number === selected && r.status === 'AVAILABLE') ??
    filteredAndSortedRooms.find((r) => r.status === 'AVAILABLE') ??
    rooms.find((r) => r.status === 'AVAILABLE');

  const nightCount = Math.max(1, Number(nights) || 1);
  const total = chosen ? chosen.pricePerNight * nightCount : 0;

  const confirmWalkIn = (): void => {
    const name = guestName.trim();
    if (!name) {
      toast.warning('Enter the guest full name to confirm the walk-in.');
      return;
    }
    const chosenMethod = payment.toLowerCase().includes('card') ? 'CARD' : 'KBZPAY';
    const ok = addWalkInBooking(name, chosen?.number, {
      nights: nightCount,
      adults: Number(adults) || 2,
      notes: notes.trim() || undefined,
      paymentMethod: chosenMethod,
    });
    if (!ok) {
      toast.warning('No available rooms to assign — check the floor inventory.');
      return;
    }
    toast.success(
      `Walk-in confirmed · ${guestName.trim()} · Room ${chosen?.number} · ${mmk(total)}`,
    );
    setGuestName('');
    setNotes('');
    setSelected(undefined);
  };

  return (
    <div className="space-y-6">
      <SectionTitle
        eyebrow="StayEase · Front Desk"
        title="Room Availability & Walk-in Booking"
        description="Live inventory for Yangon Heritage with direct desk booking. Available suites are displayed first. Use status filters to inspect live occupancy and turnover."
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              await refresh();
              toast.info(`Inventory synced with Supabase · ${rooms.length} rooms live`);
            }}
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        }
      />

      {/* Interactive Status Filter Tabs & Search Toolbar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-outline-variant/50 bg-surface-container-lowest p-3.5 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-1.5 text-label-sm font-semibold">
          {[
            { id: 'ALL' as const, label: 'All Rooms', count: rooms.length, dot: undefined },
            { id: 'AVAILABLE' as const, label: 'Available', count: counts.available, dot: 'bg-emerald-500' },
            { id: 'OCCUPIED' as const, label: 'Occupied', count: counts.occupied, dot: 'bg-[#0e2a4a]' },
            { id: 'RESERVED' as const, label: 'Reserved', count: counts.reserved, dot: 'bg-sky-500' },
          ].map((tab) => {
            const isActive = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={cn(
                  'flex items-center gap-1.5 rounded-xl px-3 py-1.5 transition cursor-pointer',
                  isActive
                    ? 'bg-[#0e2a4a] text-white shadow-xs'
                    : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface hover:bg-surface-container',
                )}
              >
                {tab.dot && <span className={cn('h-2 w-2 rounded-full', tab.dot)} />}
                <span>{tab.label}</span>
                <span
                  className={cn(
                    'rounded-full px-1.5 py-0.2 text-[11px] font-bold',
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-surface-container-highest text-on-surface-variant',
                  )}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative min-w-[200px] flex-1 sm:w-56">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-on-surface-variant" />
            <TextInput
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search suite # or type…"
              className="h-8.5 rounded-xl pl-9 text-body-sm"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-on-surface-variant hover:text-on-surface"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <span className="hidden text-label-sm font-medium text-on-surface-variant xl:block whitespace-nowrap">
            {LOCALE.property} · {LOCALE.deskNumber}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1 space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {filteredAndSortedRooms.map((room) => (
              <RoomCard
                key={room.id}
                room={room}
                selected={selected === room.number}
                onSelect={(n) => setSelected((prev) => (prev === n ? undefined : n))}
              />
            ))}

            {filteredAndSortedRooms.length === 0 && (
              <div className="col-span-full rounded-2xl border border-dashed border-outline-variant/60 bg-surface-container-low p-8 text-center">
                <BedDouble className="mx-auto h-8 w-8 text-on-surface-variant/40" />
                <p className="mt-2 text-label-md font-semibold text-on-surface">No suites matching this filter</p>
                <p className="mt-1 text-body-sm text-on-surface-variant">Try selecting "All Rooms" or clearing your search query.</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => {
                    setStatusFilter('ALL');
                    setSearchQuery('');
                  }}
                >
                  Reset Filter
                </Button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-secondary/20 bg-secondary-container/30 px-4 py-3">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-secondary" />
            <div className="min-w-0 flex-1">
              <p className="text-label-sm font-medium text-on-surface">Latest walk-in confirmed</p>
              <p className="truncate text-body-sm text-on-surface-variant">
                {walkIn.folio} · {walkIn.guestName} · {walkIn.room}
              </p>
            </div>
            <StatusChip status="PREPAID" />
          </div>
        </div>

        <Panel
          className="shrink-0 lg:w-[360px]"
          title="Walk-in Booking"
          subtitle="New direct booking at the desk"
          bodyClassName="space-y-4"
        >
          <Field label="Guest Full Name">
            <TextInput
              placeholder="e.g. Thant Zin Oo"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Adults">
              <SelectInput value={adults} onChange={(e) => setAdults(e.target.value)}>
                {['1', '2', '3', '4'].map((n) => (
                  <option key={n} value={n}>
                    {n} {n === '1' ? 'guest' : 'guests'}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Nights">
              <SelectInput value={nights} onChange={(e) => setNights(e.target.value)}>
                {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                  <option key={n} value={String(n)}>
                    {n} {n === 1 ? 'night' : 'nights'}
                  </option>
                ))}
              </SelectInput>
            </Field>
          </div>

          <div className="rounded-lg border border-outline-variant/60 bg-surface-container-low px-3 py-2.5">
            <p className="text-label-sm font-medium text-on-surface">Room preference</p>
            {chosen ? (
              <>
                <p className="mt-0.5 text-body-md font-semibold text-on-surface">
                  Room {chosen.number} · {chosen.category}
                </p>
                <p className="text-body-sm text-on-surface-variant">
                  {chosen.wing} · {chosen.beds} · {mmk(chosen.pricePerNight)}/night
                </p>
              </>
            ) : (
              <p className="mt-0.5 text-body-sm text-on-surface-variant">
                Waiting for an available room — first open room will be auto-assigned.
              </p>
            )}
          </div>

          <div>
            <Field label="Stay dates">
              <div className="flex items-center gap-2">
                <TextInput
                  type="date"
                  defaultValue={todayIso()}
                  className="flex-1"
                  aria-label="Check-in date"
                />
                <span className="text-on-surface-variant">→</span>
                <TextInput
                  type="date"
                  defaultValue={addDays(todayIso(), nightCount)}
                  className="flex-1"
                  aria-label="Check-out date"
                />
              </div>
            </Field>
            <p className="mt-1 text-body-sm text-on-surface-variant">
              {nightCount} {nightCount === 1 ? 'night' : 'nights'} · taxes included
            </p>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-outline-variant/60 px-3 py-2.5">
            <Toggle checked={breakfast} onChange={setBreakfast} label="Include breakfast" />
            <span className="flex items-center gap-1 text-label-sm text-on-surface-variant">
              <Soup className="h-3.5 w-3.5" />
              inc.
            </span>
          </div>

          <Field label="Payment preference">
            <SelectInput value={payment} onChange={(e) => setPayment(e.target.value)}>
              <option>KBZPay · Instant Verified</option>
              <option>WavePay · Instant</option>
              <option>Cash at Property</option>
              <option>Card at Check-in</option>
            </SelectInput>
          </Field>

          <Field label="Notes (optional)">
            <TextArea
              placeholder="Arrival time, requests, transfer…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </Field>

          <div className="rounded-xl bg-tertiary-fixed px-4 py-3">
            <div className="flex items-center justify-between">
              <span className="text-label-md font-medium text-on-tertiary-fixed-variant">
                {nightCount} nights
              </span>
              <span className="text-label-md font-medium text-on-tertiary-fixed-variant">
                inc. breakfast
              </span>
            </div>
            <p className="mt-1 text-headline-md font-bold text-on-tertiary-fixed-variant">
              {mmk(total)}
            </p>
          </div>

          <Button size="lg" className="w-full" onClick={confirmWalkIn}>
            Confirm Walk-in Booking
          </Button>
        </Panel>
      </div>
    </div>
  );
}