import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  DollarSign,
  Percent,
  Clock,
  ShieldAlert,
  Download,
  Compass,
  CheckCircle2,
  BedDouble,
  Globe,
  User,
  ArrowRight,
  ShieldCheck,
  CreditCard,
} from 'lucide-react';
import { useAdminStore } from '../context/AdminStore';
import { AdminHeader } from '../components/AdminHeader';
import { KpiCard } from '../components/KpiCard';
import { RevenueChart } from '../components/RevenueChart';
import { useToast } from '@/components/toast';
import { downloadCsv } from '@/lib/download';
import { cn } from '@/lib/cn';

export function AdminOverviewPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { metrics, selectedMonthRecords, runCancellationPolicySweep } = useAdminStore();

  const handleSweep = () => {
    const res = runCancellationPolicySweep();
    toast.success(res.message);
  };

  const handleExportQuick = () => {
    const headers = ['Ref', 'Guest Name', 'Channel', 'Room', 'Check-In', 'Check-Out', 'Amount (MMK)', 'Status'];
    const rows = selectedMonthRecords.map((r) => [
      r.ref,
      r.guestName,
      r.channel,
      r.roomNumber,
      r.checkIn,
      r.checkOut,
      r.totalAmount,
      r.paymentStatus,
    ]);
    downloadCsv(`Grand_Azure_Executive_Statement_${Date.now()}.csv`, headers, rows);
    toast.success('Executive monthly statement exported successfully.');
  };

  const recentStays = [...selectedMonthRecords]
    .sort((a, b) => {
      if (a.createdAt && b.createdAt) {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      return b.checkIn.localeCompare(a.checkIn);
    })
    .slice(0, 5);

  return (
    <div className="space-y-7">
      <AdminHeader
        title="Executive Overview"
        subtitle="Grand Azure Resort & Spa • Real-time hospitality yields, room rack status, and revenue telemetry"
        badge="General Manager Console"
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleSweep}
              className="flex items-center gap-2 rounded-xl border border-outline-variant/60 bg-surface-container-lowest px-3.5 py-2 text-label-sm font-semibold text-on-surface shadow-xs transition hover:bg-surface-container-low active:scale-[0.99] cursor-pointer"
            >
              <Clock className="h-4 w-4 text-secondary" />
              Run 24h Hold Sweep
            </button>
            <button
              type="button"
              onClick={handleExportQuick}
              className="flex items-center gap-2 rounded-xl bg-[#0e2a4a] px-4 py-2 text-label-sm font-semibold text-white shadow-xs transition hover:bg-[#18395f] active:scale-[0.99] cursor-pointer"
            >
              <Download className="h-4 w-4 text-[#89f5e7]" />
              Export Executive Statement
            </button>
          </div>
        }
      />

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Occupancy Rate"
          value={`${metrics.occupancyRate}%`}
          unit={`(${metrics.occupiedRooms}/${metrics.totalRooms} Rooms)`}
          progress={{
            current: metrics.occupiedRooms,
            target: metrics.totalRooms,
            label: `${metrics.occupiedRooms} of ${metrics.totalRooms} Suites Occupied`,
          }}
          icon={Percent}
          variant="accent"
        />
        <KpiCard
          title="Average Daily Rate (ADR)"
          value={metrics.adr.toLocaleString()}
          unit="MMK"
          subtext="Revenue per occupied room"
          trend={{ positive: true, text: '+12,000 MMK' }}
          icon={TrendingUp}
          variant="secondary"
        />
        <KpiCard
          title="RevPAR"
          value={metrics.revPar.toLocaleString()}
          unit="MMK"
          subtext="Revenue per available suite"
          trend={{ positive: true, text: '+8.2%' }}
          icon={Compass}
          variant="primary"
        />
        <KpiCard
          title="Gross MTD Revenue"
          value={(metrics.mtdRevenue / 1000000).toFixed(2)}
          unit="M MMK"
          subtext={`${selectedMonthRecords.length} verified stays in Oct`}
          trend={{ positive: true, text: 'On Track' }}
          icon={DollarSign}
          variant="neutral"
        />
      </div>

      {/* Interactive Demand Bar Chart */}
      <RevenueChart />

      {/* Executive Intelligence Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Room Rack Status */}
        <div className="flex flex-col justify-between rounded-2xl border border-outline-variant/50 bg-surface-container-lowest p-6 shadow-xs">
          <div>
            <div className="flex items-center justify-between border-b border-outline-variant/30 pb-4">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0e2a4a]/10 text-[#0e2a4a]">
                  <BedDouble className="h-4 w-4" />
                </span>
                <h3 className="text-title-sm font-bold text-on-surface">Room Rack Status</h3>
              </div>
              <button
                type="button"
                onClick={() => navigate('/admin/rooms')}
                className="flex items-center gap-1 text-label-xs font-bold text-secondary hover:underline cursor-pointer"
              >
                Rack Matrix <ArrowRight className="h-3 w-3" />
              </button>
            </div>

            <div className="mt-5 space-y-3">
              <div className="flex items-center justify-between rounded-xl border border-outline-variant/30 bg-surface-container-low/60 p-3">
                <div className="flex items-center gap-2.5">
                  <span className="h-3 w-3 rounded-full bg-emerald-500 shadow-xs" />
                  <span className="text-label-sm font-semibold text-on-surface">Available for Sale</span>
                </div>
                <span className="text-label-md font-bold text-emerald-700 dark:text-emerald-400">
                  {metrics.availableRooms} Suites
                </span>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-outline-variant/30 bg-surface-container-low/60 p-3">
                <div className="flex items-center gap-2.5">
                  <span className="h-3 w-3 rounded-full bg-[#0e2a4a] shadow-xs" />
                  <span className="text-label-sm font-semibold text-on-surface">Occupied In-House</span>
                </div>
                <span className="text-label-md font-bold text-[#0e2a4a]">
                  {metrics.occupiedRooms} Suites
                </span>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-outline-variant/30 bg-surface-container-low/60 p-3">
                <div className="flex items-center gap-2.5">
                  <span className="h-3 w-3 rounded-full bg-sky-500 shadow-xs" />
                  <span className="text-label-sm font-semibold text-on-surface">Customer Reserved</span>
                </div>
                <span className="text-label-md font-bold text-sky-700 dark:text-sky-400">
                  {metrics.reservedRooms} Suites
                </span>
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-secondary/20 bg-secondary-container/20 p-3 text-body-xs text-on-surface">
            💡 Dynamic weekend pricing is active. Friday and Saturday check-ins calculate automatic yield surges.
          </div>
        </div>

        {/* Channel Revenue Split */}
        <div className="flex flex-col justify-between rounded-2xl border border-outline-variant/50 bg-surface-container-lowest p-6 shadow-xs">
          <div>
            <div className="flex items-center justify-between border-b border-outline-variant/30 pb-4">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#89f5e7]/20 text-[#071322]">
                  <Globe className="h-4 w-4" />
                </span>
                <h3 className="text-title-sm font-bold text-on-surface">Channel Distribution</h3>
              </div>
              <button
                type="button"
                onClick={() => navigate('/admin/channels')}
                className="flex items-center gap-1 text-label-xs font-bold text-secondary hover:underline cursor-pointer"
              >
                Intelligence <ArrowRight className="h-3 w-3" />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <div className="flex justify-between text-label-sm font-semibold text-on-surface">
                  <span className="flex items-center gap-1.5">
                    <Globe className="h-3.5 w-3.5 text-[#0e2a4a]" /> Direct Online Web (StayFlow)
                  </span>
                  <span className="text-[#0e2a4a] font-bold">
                    {metrics.onlineRevenue > 0
                      ? Math.round(
                          (metrics.onlineRevenue / (metrics.onlineRevenue + metrics.walkInRevenue || 1)) * 100,
                        )
                      : 0}
                    %
                  </span>
                </div>
                <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-surface-container">
                  <div
                    className="h-full rounded-full bg-[#0e2a4a]"
                    style={{
                      width: `${
                        metrics.onlineRevenue > 0
                          ? Math.round(
                              (metrics.onlineRevenue / (metrics.onlineRevenue + metrics.walkInRevenue || 1)) * 100,
                            )
                          : 0
                      }%`,
                    }}
                  />
                </div>
                <p className="mt-1 text-label-xs text-on-surface-variant">
                  {metrics.onlineCount} Stays • {metrics.onlineRevenue.toLocaleString()} MMK (0% Commission)
                </p>
              </div>

              <div>
                <div className="flex justify-between text-label-sm font-semibold text-on-surface">
                  <span className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-secondary" /> Walk-In Front Desk Counter
                  </span>
                  <span className="text-secondary font-bold">
                    {metrics.walkInRevenue > 0
                      ? Math.round(
                          (metrics.walkInRevenue / (metrics.onlineRevenue + metrics.walkInRevenue || 1)) * 100,
                        )
                      : 0}
                    %
                  </span>
                </div>
                <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-surface-container">
                  <div
                    className="h-full rounded-full bg-[#89f5e7]"
                    style={{
                      width: `${
                        metrics.walkInRevenue > 0
                          ? Math.round(
                              (metrics.walkInRevenue / (metrics.onlineRevenue + metrics.walkInRevenue || 1)) * 100,
                            )
                          : 0
                      }%`,
                    }}
                  />
                </div>
                <p className="mt-1 text-label-xs text-on-surface-variant">
                  {metrics.walkInCount} Stays • {metrics.walkInRevenue.toLocaleString()} MMK (Instant Clearing)
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between border-t border-outline-variant/30 pt-4 text-label-sm">
            <span className="text-on-surface-variant">Total Gross Collections</span>
            <span className="text-title-sm font-extrabold text-on-surface">
              {metrics.mtdRevenue.toLocaleString()} MMK
            </span>
          </div>
        </div>

        {/* Policy & Security Health */}
        <div className="flex flex-col justify-between rounded-2xl border border-outline-variant/50 bg-surface-container-lowest p-6 shadow-xs">
          <div>
            <div className="flex items-center justify-between border-b border-outline-variant/30 pb-4">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-700">
                  <ShieldCheck className="h-4 w-4" />
                </span>
                <h3 className="text-title-sm font-bold text-on-surface">Policy & Auditing</h3>
              </div>
              <button
                type="button"
                onClick={() => navigate('/admin/audit')}
                className="flex items-center gap-1 text-label-xs font-bold text-secondary hover:underline cursor-pointer"
              >
                Audit Trail <ArrowRight className="h-3 w-3" />
              </button>
            </div>

            <div className="mt-5 space-y-3">
              <div className="flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-label-sm font-bold text-emerald-950 dark:text-emerald-300">
                    24h Unpaid Hold Policy Active
                  </p>
                  <p className="text-body-xs text-emerald-800/80 dark:text-emerald-300/80">
                    Pay-at-hotel holds without verified slips auto-release 24h prior to scheduled check-in.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-outline-variant/40 bg-surface-container-low/50 p-3">
                <ShieldAlert className="h-4 w-4 text-on-surface-variant shrink-0 mt-0.5" />
                <div>
                  <p className="text-label-sm font-bold text-on-surface">
                    Immutable Audit Logging
                  </p>
                  <p className="text-body-xs text-on-surface-variant">
                    Cryptographic audit events record every price yield adjustment and cashier reconciliation.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 border-t border-outline-variant/30 pt-4">
            <button
              type="button"
              onClick={() => navigate('/admin/finances')}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-surface-container-low py-2.5 text-center text-label-sm font-bold text-on-surface hover:bg-surface-container transition cursor-pointer"
            >
              <CreditCard className="h-4 w-4 text-secondary" />
              View IRD Tax & Financial Ledger
            </button>
          </div>
        </div>
      </div>

      {/* Recent Executive Bookings & Settlements Table */}
      <div className="rounded-2xl border border-outline-variant/50 bg-surface-container-lowest p-6 shadow-xs">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center border-b border-outline-variant/30 pb-4">
          <div>
            <h3 className="text-title-md font-bold text-on-surface">
              Recent Verified Stays & Settlements
            </h3>
            <p className="text-body-xs text-on-surface-variant">
              Latest counter walk-ins and direct web bookings across October 2026
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/admin/channels')}
            className="flex items-center gap-1.5 text-label-sm font-semibold text-secondary hover:underline cursor-pointer"
          >
            All Monthly Records ({selectedMonthRecords.length}) <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left border-collapse text-body-sm">
            <thead>
              <tr className="border-b border-outline-variant/40 text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
                <th className="py-3 px-3">Folio Ref</th>
                <th className="py-3 px-3">Guest Name</th>
                <th className="py-3 px-3">Channel</th>
                <th className="py-3 px-3">Room</th>
                <th className="py-3 px-3">Stay Dates</th>
                <th className="py-3 px-3 text-right">Total (MMK)</th>
                <th className="py-3 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20">
              {recentStays.map((record) => {
                const isWalkIn = record.channel === 'WALK_IN';
                return (
                  <tr key={record.id} className="transition hover:bg-surface-container-low/40">
                    <td className="py-3.5 px-3 font-mono text-label-xs font-semibold text-[#0e2a4a]">
                      {record.ref}
                    </td>
                    <td className="py-3.5 px-3 font-medium text-on-surface">
                      {record.guestName}
                    </td>
                    <td className="py-3.5 px-3">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold',
                          isWalkIn
                            ? 'bg-[#89f5e7]/20 text-secondary'
                            : 'bg-[#0e2a4a]/10 text-[#0e2a4a]',
                        )}
                      >
                        {isWalkIn ? <User className="h-3 w-3" /> : <Globe className="h-3 w-3" />}
                        {isWalkIn ? 'Walk-In Desk' : 'Online Web'}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 font-medium text-on-surface">
                      Room {record.roomNumber}
                    </td>
                    <td className="py-3.5 px-3 text-label-xs text-on-surface-variant">
                      {record.checkIn} → {record.checkOut} ({record.nights}n)
                    </td>
                    <td className="py-3.5 px-3 text-right font-bold text-on-surface">
                      {record.totalAmount.toLocaleString()} MMK
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-[11px] font-bold',
                          record.paymentStatus === 'PAID'
                            ? 'bg-emerald-500/10 text-emerald-700'
                            : 'bg-amber-500/10 text-amber-700',
                        )}
                      >
                        {record.paymentStatus}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
