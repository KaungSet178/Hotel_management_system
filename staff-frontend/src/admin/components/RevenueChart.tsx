import { useState } from 'react';
import { TrendingUp } from 'lucide-react';
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

  const maxTotalRevenue = Math.max(
    ...DEMAND_DATA_14_DAYS.map((d) => d.walkInRevenue + d.onlineRevenue),
  );

  return (
    <div className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-6 shadow-sm">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-title-lg font-semibold text-on-surface">
              14-Day Demand & Channel Split
            </h2>
            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-label-xs font-semibold text-emerald-600">
              Peak Weekend Tracked
            </span>
          </div>
          <p className="mt-0.5 text-body-sm text-on-surface-variant">
            Daily occupancy % with Walk-in (Desk) vs. Online Direct Web reservation mix
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-label-sm">
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-xs bg-[#0e2a4a]" />
            <span className="text-on-surface-variant">Online Web</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-xs bg-[#89f5e7]" />
            <span className="text-on-surface-variant">Walk-In Counter</span>
          </div>
        </div>
      </div>

      {/* Bar Chart Visualizer */}
      <div className="mt-8">
        <div className="flex h-56 items-end gap-1.5 sm:gap-2.5">
          {DEMAND_DATA_14_DAYS.map((item) => {
            const isToday = item.date === '2026-10-18';
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
                className="group relative flex flex-1 cursor-pointer flex-col items-center justify-end h-full"
              >
                {/* Bar Stack */}
                <div
                  className={cn(
                    'relative w-full overflow-hidden rounded-t-lg transition-all duration-200',
                    isSelected
                      ? 'ring-2 ring-[#0e2a4a] ring-offset-2'
                      : 'hover:opacity-90',
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
                  />
                  {/* Walk-in segment */}
                  <div
                    className="w-full bg-[#89f5e7]"
                    style={{ height: `${walkInPercent}%` }}
                  />
                </div>

                {/* Day label */}
                <div className="mt-2.5 text-center">
                  <p
                    className={cn(
                      'text-label-xs font-semibold',
                      isSelected ? 'text-primary font-bold' : 'text-on-surface-variant',
                    )}
                  >
                    {item.dayLabel}
                  </p>
                  <p
                    className={cn(
                      'text-label-xs',
                      isToday ? 'rounded-full bg-primary px-1 font-bold text-white' : 'text-on-surface-variant/70',
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

      {/* Selected Day Breakdown Card */}
      <div className="mt-6 rounded-xl border border-outline-variant/40 bg-surface-container-low p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white">
              <TrendingUp className="h-5 w-5" />
            </span>
            <div>
              <p className="text-label-md font-semibold text-on-surface">
                {activeDay.dayLabel}, {activeDay.date} {activeDay.date === '2026-10-18' ? '(Today)' : ''}
              </p>
              <p className="text-body-sm text-on-surface-variant">
                Occupancy Rate: <strong className="text-primary">{activeDay.occupancy}%</strong> ({activeDay.totalRoomsSold} / 36 Rooms Sold)
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <div>
              <p className="text-label-xs text-on-surface-variant">Online Web Booking</p>
              <p className="text-label-md font-bold text-primary">
                {activeDay.onlineRevenue.toLocaleString()} MMK
              </p>
            </div>
            <div className="h-8 w-px bg-outline-variant/40" />
            <div>
              <p className="text-label-xs text-on-surface-variant">Walk-In Counter</p>
              <p className="text-label-md font-bold text-[#00677f]">
                {activeDay.walkInRevenue.toLocaleString()} MMK
              </p>
            </div>
            <div className="h-8 w-px bg-outline-variant/40" />
            <div>
              <p className="text-label-xs text-on-surface-variant">Total Day Gross</p>
              <p className="text-title-sm font-bold text-on-surface">
                {(activeDay.walkInRevenue + activeDay.onlineRevenue).toLocaleString()} MMK
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
