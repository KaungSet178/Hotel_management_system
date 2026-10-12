import { useState } from 'react';
import { TrendingUp, Sparkles, User, Globe } from 'lucide-react';
import { cn } from '@/lib/cn';

interface DayDemand {
  date: string;
  dayLabel: string;
  dayNum: string;
  occupancy: number; // percentage
  walkInRevenue: number;
  onlineRevenue: number;
  totalRoomsSold: number;
}

const DEMAND_DATA_14_DAYS: DayDemand[] = [
  { date: '2026-10-09', dayLabel: 'Fri', dayNum: '09', occupancy: 78, walkInRevenue: 1850000, onlineRevenue: 3420000, totalRoomsSold: 28 },
  { date: '2026-10-10', dayLabel: 'Sat', dayNum: '10', occupancy: 92, walkInRevenue: 2450000, onlineRevenue: 4980000, totalRoomsSold: 33 },
  { date: '2026-10-11', dayLabel: 'Sun', dayNum: '11', occupancy: 85, walkInRevenue: 1950000, onlineRevenue: 4120000, totalRoomsSold: 30 },
  { date: '2026-10-12', dayLabel: 'Mon', dayNum: '12', occupancy: 68, walkInRevenue: 1200000, onlineRevenue: 3200000, totalRoomsSold: 24 },
  { date: '2026-10-13', dayLabel: 'Tue', dayNum: '13', occupancy: 72, walkInRevenue: 1400000, onlineRevenue: 3350000, totalRoomsSold: 26 },
  { date: '2026-10-14', dayLabel: 'Wed', dayNum: '14', occupancy: 75, walkInRevenue: 1650000, onlineRevenue: 3480000, totalRoomsSold: 27 },
  { date: '2026-10-15', dayLabel: 'Thu', dayNum: '15', occupancy: 80, walkInRevenue: 1890000, onlineRevenue: 3790000, totalRoomsSold: 29 },
  { date: '2026-10-16', dayLabel: 'Fri', dayNum: '16', occupancy: 88, walkInRevenue: 2200000, onlineRevenue: 4450000, totalRoomsSold: 32 },
  { date: '2026-10-17', dayLabel: 'Sat', dayNum: '17', occupancy: 95, walkInRevenue: 2600000, onlineRevenue: 5200000, totalRoomsSold: 34 },
  { date: '2026-10-18', dayLabel: 'Sun', dayNum: '18', occupancy: 94, walkInRevenue: 2550000, onlineRevenue: 5120000, totalRoomsSold: 34 }, // Today
  { date: '2026-10-19', dayLabel: 'Mon', dayNum: '19', occupancy: 70, walkInRevenue: 1300000, onlineRevenue: 3300000, totalRoomsSold: 25 },
  { date: '2026-10-20', dayLabel: 'Tue', dayNum: '20', occupancy: 65, walkInRevenue: 1100000, onlineRevenue: 3100000, totalRoomsSold: 23 },
  { date: '2026-10-21', dayLabel: 'Wed', dayNum: '21', occupancy: 73, walkInRevenue: 1450000, onlineRevenue: 3400000, totalRoomsSold: 26 },
  { date: '2026-10-22', dayLabel: 'Thu', dayNum: '22', occupancy: 82, walkInRevenue: 1900000, onlineRevenue: 3950000, totalRoomsSold: 30 },
];

export function RevenueChart() {
  const [activeDay, setActiveDay] = useState<DayDemand>(DEMAND_DATA_14_DAYS[9]); // 18 Oct (Today)
  const [viewRange, setViewRange] = useState<'14D' | '7D'>('14D');

  const visibleData = viewRange === '7D' ? DEMAND_DATA_14_DAYS.slice(7) : DEMAND_DATA_14_DAYS;

  const maxTotalRevenue = Math.max(
    ...visibleData.map((d) => d.walkInRevenue + d.onlineRevenue),
  );

  const activeTotal = activeDay.walkInRevenue + activeDay.onlineRevenue;
  const activeWalkInPct = Math.round((activeDay.walkInRevenue / activeTotal) * 100);
  const activeOnlinePct = 100 - activeWalkInPct;

  return (
    <div className="rounded-2xl border border-outline-variant/50 bg-surface-container-lowest p-6 shadow-xs">
      {/* Chart Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-on-surface">
              Daily Demand & Channel Yield Trajectory
            </h2>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-label-xs font-bold text-emerald-700">
              <Sparkles className="h-3 w-3" />
              Peak Weekend Tracked
            </span>
          </div>
          <p className="mt-1 text-body-sm text-on-surface-variant">
            Cross-channel daily occupancy tracking comparing Walk-In counter arrivals against StayFlow direct web bookings
          </p>
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
            const isToday = item.date === '2026-10-18';
            const isWeekend = item.dayLabel === 'Sat' || item.dayLabel === 'Sun';
            const isSelected = activeDay.date === item.date;
            const totalDayRev = item.walkInRevenue + item.onlineRevenue;
            const heightPercent = Math.round((totalDayRev / maxTotalRevenue) * 100);
            const walkInPercent = Math.round((item.walkInRevenue / totalDayRev) * 100);
            const onlinePercent = 100 - walkInPercent;

            return (
              <div
                key={item.date}
                onClick={() => setActiveDay(item)}
                onMouseEnter={() => setActiveDay(item)}
                className={cn(
                  'group relative flex flex-1 cursor-pointer flex-col items-center justify-end h-full rounded-xl p-1 transition-colors duration-150',
                  isWeekend ? 'bg-surface-container-low/40' : '',
                  isSelected ? 'bg-surface-container-low ring-1 ring-[#0e2a4a]' : 'hover:bg-surface-container-low/60',
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
                        ? 'rounded-full bg-[#0e2a4a] px-1 font-bold text-white'
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
              <div className="flex items-center gap-2">
                <p className="text-title-md font-bold text-on-surface">
                  {activeDay.dayLabel}, {activeDay.date}
                </p>
                {activeDay.date === '2026-10-18' && (
                  <span className="rounded-full bg-[#0e2a4a] px-2.5 py-0.5 text-label-xs font-bold text-[#89f5e7]">
                    Today's Operations
                  </span>
                )}
              </div>
              <p className="text-body-sm text-on-surface-variant">
                Occupancy: <strong className="text-[#0e2a4a]">{activeDay.occupancy}%</strong> ({activeDay.totalRoomsSold} / 36 Suites Occupied)
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
