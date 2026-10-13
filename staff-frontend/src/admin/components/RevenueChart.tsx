import { useState, useEffect, useMemo } from 'react';
import { TrendingUp, Sparkles, User, Globe, Clock } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useAdminStore } from '../context/AdminStore';
import {
  todayIso,
  addDays,
  getDayLabelAndNum,
  formatMyanmarDateTime,
  formatMyanmarFullDate,
} from '@/lib/format';

export interface DayDemand {
  date: string;
  dayLabel: string;
  dayNum: string;
  occupancy: number; // percentage
  walkInRevenue: number;
  onlineRevenue: number;
  totalRoomsSold: number;
}

// 14 baseline offsets relative to current Myanmar date:
// -9 days past to +4 days forecast (with index 9 being Today).
// Weekend dates (Friday/Saturday) reflect peak occupancy surges.
const BASELINE_DEMAND_OFFSETS: Record<
  number,
  { occ: number; walkIn: number; online: number; rooms: number }
> = {
  [-9]: { occ: 78, walkIn: 1850000, online: 3420000, rooms: 28 },
  [-8]: { occ: 82, walkIn: 1950000, online: 3600000, rooms: 30 },
  [-7]: { occ: 74, walkIn: 1500000, online: 3300000, rooms: 27 },
  [-6]: { occ: 70, walkIn: 1350000, online: 3250000, rooms: 25 },
  [-5]: { occ: 76, walkIn: 1600000, online: 3500000, rooms: 27 },
  [-4]: { occ: 88, walkIn: 2200000, online: 4300000, rooms: 32 }, // Fri peak
  [-3]: { occ: 95, walkIn: 2600000, online: 5100000, rooms: 34 }, // Sat peak
  [-2]: { occ: 86, walkIn: 1980000, online: 4200000, rooms: 31 },
  [-1]: { occ: 68, walkIn: 1200000, online: 3200000, rooms: 24 },
  [0]:  { occ: 75, walkIn: 1650000, online: 3550000, rooms: 27 }, // TODAY
  [1]:  { occ: 78, walkIn: 1750000, online: 3680000, rooms: 28 },
  [2]:  { occ: 82, walkIn: 1900000, online: 3850000, rooms: 30 },
  [3]:  { occ: 91, walkIn: 2400000, online: 4850000, rooms: 33 }, // Fri peak
  [4]:  { occ: 96, walkIn: 2650000, online: 5300000, rooms: 35 }, // Sat peak
};

export function RevenueChart() {
  const { channelRecords } = useAdminStore();
  const today = todayIso(); // Dynamic current Myanmar date: '2026-10-13'

  // Live ticking clock in Myanmar Time (Asia/Yangon)
  const [liveMmtTime, setLiveMmtTime] = useState(() =>
    formatMyanmarDateTime(new Date(), true),
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setLiveMmtTime(formatMyanmarDateTime(new Date(), true));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Dynamically generate the 14-day demand dataset centered on Myanmar date
  const demandData14Days: DayDemand[] = useMemo(() => {
    const offsets = [-9, -8, -7, -6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4];
    return offsets.map((offset) => {
      const dateStr = addDays(today, offset);
      const { dayLabel, dayNum } = getDayLabelAndNum(dateStr);
      const baseline = BASELINE_DEMAND_OFFSETS[offset] || {
        occ: 75,
        walkIn: 1500000,
        online: 3500000,
        rooms: 27,
      };

      // Blend real Supabase / store records for this check-in date
      const matchedRecords = channelRecords.filter((r) => r.checkIn === dateStr);
      let walkInRev = baseline.walkIn;
      let onlineRev = baseline.online;
      let roomsSold = baseline.rooms;

      if (matchedRecords.length > 0) {
        const actualWalkIn = matchedRecords
          .filter((r) => r.channel === 'WALK_IN')
          .reduce((sum, r) => sum + r.totalAmount, 0);
        const actualOnline = matchedRecords
          .filter((r) => r.channel === 'ONLINE')
          .reduce((sum, r) => sum + r.totalAmount, 0);

        if (actualWalkIn > 0) walkInRev = actualWalkIn;
        if (actualOnline > 0) onlineRev = actualOnline;
        roomsSold = Math.max(roomsSold, matchedRecords.length);
      }

      const occupancy = Math.min(100, Math.round((roomsSold / 36) * 100));

      return {
        date: dateStr,
        dayLabel,
        dayNum,
        occupancy,
        walkInRevenue: walkInRev,
        onlineRevenue: onlineRev,
        totalRoomsSold: roomsSold,
      };
    });
  }, [today, channelRecords]);

  // Today item (index 9 in offsets [-9..+4])
  const todayItem = useMemo(() => {
    return demandData14Days.find((d) => d.date === today) || demandData14Days[9];
  }, [demandData14Days, today]);

  const [activeDay, setActiveDay] = useState<DayDemand>(todayItem);
  const [viewRange, setViewRange] = useState<'14D' | '7D'>('14D');

  // Keep active day in sync if today changes
  useEffect(() => {
    if (todayItem) {
      setActiveDay(todayItem);
    }
  }, [todayItem]);

  // 7-day focus displays the current operational week (offsets -2 to +4, items 7..13)
  const visibleData = viewRange === '7D' ? demandData14Days.slice(7) : demandData14Days;

  const maxTotalRevenue = Math.max(
    ...visibleData.map((d) => d.walkInRevenue + d.onlineRevenue),
    1,
  );

  const activeTotal = activeDay.walkInRevenue + activeDay.onlineRevenue;
  const activeWalkInPct = Math.round((activeDay.walkInRevenue / (activeTotal || 1)) * 100);
  const activeOnlinePct = 100 - activeWalkInPct;

  return (
    <div className="rounded-2xl border border-outline-variant/50 bg-surface-container-lowest p-6 shadow-xs">
      {/* Chart Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-on-surface">
              Daily Demand & Channel Yield Trajectory
            </h2>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-label-xs font-bold text-emerald-700">
              <Sparkles className="h-3 w-3" />
              Peak Weekend Tracked
            </span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-body-sm text-on-surface-variant">
            <span>
              Cross-channel daily occupancy tracking comparing Walk-In counter arrivals against StayEase direct web bookings
            </span>
            <span className="text-on-surface-variant/40">•</span>
            <span className="inline-flex items-center gap-1 font-mono text-xs font-medium text-secondary">
              <Clock className="h-3.5 w-3.5" />
              Myanmar Time: {liveMmtTime}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* 7D vs 14D Toggle */}
          <div className="flex rounded-xl border border-outline-variant/60 bg-surface-container-low p-1 text-label-xs font-semibold">
            <button
              type="button"
              onClick={() => setViewRange('14D')}
              className={cn(
                'rounded-lg px-2.5 py-1 transition cursor-pointer',
                viewRange === '14D'
                  ? 'bg-[#0e2a4a] text-white shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface',
              )}
            >
              14-Day View
            </button>
            <button
              type="button"
              onClick={() => setViewRange('7D')}
              className={cn(
                'rounded-lg px-2.5 py-1 transition cursor-pointer',
                viewRange === '7D'
                  ? 'bg-[#0e2a4a] text-white shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface',
              )}
            >
              7-Day Focus
            </button>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-3 rounded-xl border border-outline-variant/40 bg-surface-container-low/50 px-3 py-1.5 text-label-xs font-semibold">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-[#0e2a4a]" />
              <span className="text-on-surface">Direct Web</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-[#89f5e7]" />
              <span className="text-on-surface">Walk-In Counter</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bar Chart Visualizer */}
      <div className="mt-8">
        <div className="flex h-60 items-end gap-2 sm:gap-3">
          {visibleData.map((item) => {
            const isToday = item.date === today;
            const isWeekend = item.dayLabel === 'Sat' || item.dayLabel === 'Sun';
            const isSelected = activeDay.date === item.date;
            const totalDayRev = item.walkInRevenue + item.onlineRevenue;
            const heightPercent = Math.round((totalDayRev / maxTotalRevenue) * 100);
            const walkInPercent = Math.round((item.walkInRevenue / (totalDayRev || 1)) * 100);
            const onlinePercent = 100 - walkInPercent;

            return (
              <div
                key={item.date}
                onClick={() => setActiveDay(item)}
                onMouseEnter={() => setActiveDay(item)}
                className={cn(
                  'group relative flex flex-1 cursor-pointer flex-col items-center justify-end h-full rounded-xl p-1 transition-colors duration-150',
                  isWeekend ? 'bg-surface-container-low/40' : '',
                  isSelected
                    ? 'bg-surface-container-low ring-1 ring-[#0e2a4a]'
                    : 'hover:bg-surface-container-low/60',
                )}
              >
                {/* Bar Stack */}
                <div
                  className={cn(
                    'relative w-full overflow-hidden rounded-t-lg transition-all duration-200',
                    isSelected
                      ? 'shadow-sm ring-2 ring-[#0e2a4a]'
                      : 'opacity-90 group-hover:opacity-100',
                  )}
                  style={{ height: `${heightPercent}%` }}
                >
                  {/* Online segment */}
                  <div
                    className={cn(
                      'w-full transition',
                      isToday ? 'bg-[#0e2a4a]' : 'bg-[#18395f]',
                    )}
                    style={{ height: `${onlinePercent}%` }}
                    title={`Online: ${item.onlineRevenue.toLocaleString()} MMK`}
                  />
                  {/* Walk-in segment */}
                  <div
                    className="w-full bg-[#89f5e7]"
                    style={{ height: `${walkInPercent}%` }}
                    title={`Walk-in: ${item.walkInRevenue.toLocaleString()} MMK`}
                  />
                </div>

                {/* Day label */}
                <div className="mt-2.5 text-center">
                  <p
                    className={cn(
                      'text-label-xs font-semibold',
                      isSelected ? 'text-[#0e2a4a] font-bold' : 'text-on-surface-variant',
                    )}
                  >
                    {item.dayLabel}
                  </p>
                  <p
                    className={cn(
                      'text-label-xs',
                      isToday
                        ? 'rounded-full bg-[#0e2a4a] px-1.5 font-bold text-white shadow-xs'
                        : 'text-on-surface-variant/70 font-medium',
                    )}
                  >
                    {item.dayNum}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Day Telemetry Card */}
      <div className="mt-6 rounded-2xl border border-outline-variant/60 bg-gradient-to-r from-surface-container-low via-surface-container-lowest to-surface-container-low p-5 shadow-xs">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div className="flex items-center gap-3.5">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#0e2a4a] text-[#89f5e7] shadow-xs">
              <TrendingUp className="h-6 w-6" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-title-md font-bold text-on-surface">
                  {formatMyanmarFullDate(activeDay.date)}
                </p>
                {activeDay.date === today && (
                  <span className="rounded-full bg-[#0e2a4a] px-2.5 py-0.5 text-label-xs font-bold text-[#89f5e7]">
                    Today's Operations (Active)
                  </span>
                )}
              </div>
              <p className="text-body-sm text-on-surface-variant">
                Occupancy: <strong className="text-[#0e2a4a]">{activeDay.occupancy}%</strong> ({activeDay.totalRoomsSold} / 36 Suites Occupied)
                <span className="mx-2 text-on-surface-variant/40">•</span>
                <span className="font-mono text-xs">Date: {activeDay.date}</span>
              </p>
            </div>
          </div>

          {/* Revenue Breakdown Pills */}
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0e2a4a]/10 text-[#0e2a4a]">
                <Globe className="h-4 w-4" />
              </span>
              <div>
                <p className="text-[11px] font-semibold text-on-surface-variant uppercase">Online Web ({activeOnlinePct}%)</p>
                <p className="text-label-md font-bold text-[#0e2a4a]">
                  {activeDay.onlineRevenue.toLocaleString()} MMK
                </p>
              </div>
            </div>

            <div className="hidden h-9 w-px bg-outline-variant/40 sm:block" />

            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#89f5e7]/20 text-[#071322]">
                <User className="h-4 w-4" />
              </span>
              <div>
                <p className="text-[11px] font-semibold text-on-surface-variant uppercase">Walk-In Desk ({activeWalkInPct}%)</p>
                <p className="text-label-md font-bold text-secondary">
                  {activeDay.walkInRevenue.toLocaleString()} MMK
                </p>
              </div>
            </div>

            <div className="hidden h-9 w-px bg-outline-variant/40 sm:block" />

            <div>
              <p className="text-[11px] font-semibold text-on-surface-variant uppercase">Total Day Gross</p>
              <p className="text-xl font-extrabold tracking-tight text-on-surface">
                {activeTotal.toLocaleString()} MMK
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
