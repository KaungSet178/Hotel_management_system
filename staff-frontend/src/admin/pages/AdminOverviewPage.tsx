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
} from 'lucide-react';
import { useAdminStore } from '../context/AdminStore';
import { AdminHeader } from '../components/AdminHeader';
import { KpiCard } from '../components/KpiCard';
import { RevenueChart } from '../components/RevenueChart';
import { useToast } from '@/components/toast';
import { downloadCsv } from '@/lib/download';

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
    downloadCsv(`Grand_Azure_Overview_${Date.now()}.csv`, headers, rows);
    toast.success('Executive monthly statement exported.');
  };

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Executive Overview"
        subtitle="Grand Azure Resort & Spa • Hospitality Performance & Yield Management"
        badge="General Manager Console"
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleSweep}
              className="flex items-center gap-2 rounded-xl border border-outline-variant/60 bg-surface-container-low px-3.5 py-2 text-label-md font-medium text-on-surface transition hover:bg-surface-container active:scale-[0.99]"
            >
              <Clock className="h-4 w-4 text-secondary" />
              Run 24h Hold Sweep
            </button>
            <button
              type="button"
              onClick={handleExportQuick}
              className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-label-md font-medium text-white shadow-xs transition hover:brightness-110 active:scale-[0.99]"
            >
              <Download className="h-4 w-4" />
              Export Statement
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
          subtext="Target: 80% • +4.6% vs last week"
          trend={{ positive: true, text: '+4.6%' }}
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
          subtext="Revenue per available room"
          trend={{ positive: true, text: '+8.2%' }}
          icon={Compass}
          variant="primary"
        />
        <KpiCard
          title="Gross MTD Revenue"
          value={(metrics.mtdRevenue / 1000000).toFixed(2)}
          unit="M MMK"
          subtext={`${selectedMonthRecords.length} confirmed stays this month`}
          trend={{ positive: true, text: 'On Track' }}
          icon={DollarSign}
          variant="neutral"
        />
      </div>

      {/* Interactive Demand Bar Chart */}
      <RevenueChart />

      {/* Quick Rack & Inventory Summary */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Room Status Breakdown */}
        <div className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-title-md font-semibold text-on-surface">Room Rack Status</h3>
            <button
              type="button"
              onClick={() => navigate('/admin/rooms')}
              className="text-label-sm font-semibold text-secondary hover:underline"
            >
              Manage Inventory →
            </button>
          </div>

          <div className="mt-5 space-y-3.5">
            <div className="flex items-center justify-between rounded-xl bg-surface-container-low p-3">
              <div className="flex items-center gap-2.5">
                <span className="h-3 w-3 rounded-full bg-emerald-500" />
                <span className="text-body-sm font-medium text-on-surface">Available for Sale</span>
              </div>
              <span className="text-label-md font-bold text-emerald-600">
                {metrics.availableRooms} Suites
              </span>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-surface-container-low p-3">
              <div className="flex items-center gap-2.5">
                <span className="h-3 w-3 rounded-full bg-primary" />
                <span className="text-body-sm font-medium text-on-surface">Occupied Guests</span>
              </div>
              <span className="text-label-md font-bold text-primary">
                {metrics.occupiedRooms} Suites
              </span>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-surface-container-low p-3">
              <div className="flex items-center gap-2.5">
                <span className="h-3 w-3 rounded-full bg-amber-500" />
                <span className="text-body-sm font-medium text-on-surface">Maintenance Lockout</span>
              </div>
              <span className="text-label-md font-bold text-amber-600">
                {metrics.maintenanceRooms} Suites
              </span>
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-outline-variant/40 bg-surface-container-low/50 p-3.5 text-body-xs text-on-surface-variant">
            💡 Dynamic pricing enabled. Weekend rates apply automatically on Friday and Saturday arrivals.
          </div>
        </div>

        {/* Channel Revenue Split */}
        <div className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-title-md font-semibold text-on-surface">Channel Distribution</h3>
            <button
              type="button"
              onClick={() => navigate('/admin/channels')}
              className="text-label-sm font-semibold text-secondary hover:underline"
            >
              View Channels →
            </button>
          </div>

          <div className="mt-5 space-y-4">
            <div>
              <div className="flex justify-between text-label-sm font-medium text-on-surface">
                <span>Direct Online Web (StayFlow)</span>
                <span>
                  {metrics.onlineRevenue > 0
                    ? Math.round(
                        (metrics.onlineRevenue / (metrics.onlineRevenue + metrics.walkInRevenue || 1)) * 100,
                      )
                    : 0}
                  %
                </span>
              </div>
              <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-surface-container">
                <div
                  className="h-full bg-[#0e2a4a]"
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
                {metrics.onlineCount} Stays • {metrics.onlineRevenue.toLocaleString()} MMK
              </p>
            </div>

            <div>
              <div className="flex justify-between text-label-sm font-medium text-on-surface">
                <span>Walk-In Front Desk Counter</span>
                <span>
                  {metrics.walkInRevenue > 0
                    ? Math.round(
                        (metrics.walkInRevenue / (metrics.onlineRevenue + metrics.walkInRevenue || 1)) * 100,
                      )
                    : 0}
                  %
                </span>
              </div>
              <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-surface-container">
                <div
                  className="h-full bg-[#89f5e7]"
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
                {metrics.walkInCount} Stays • {metrics.walkInRevenue.toLocaleString()} MMK
              </p>
            </div>
          </div>

          <div className="mt-5 border-t border-outline-variant/40 pt-4 flex items-center justify-between text-body-sm">
            <span className="text-on-surface-variant">Total Gross Collections</span>
            <span className="font-bold text-on-surface">
              {metrics.mtdRevenue.toLocaleString()} MMK
            </span>
          </div>
        </div>

        {/* Security & Policy Health */}
        <div className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-title-md font-semibold text-on-surface">Policy & Auditing</h3>
            <button
              type="button"
              onClick={() => navigate('/admin/audit')}
              className="text-label-sm font-semibold text-secondary hover:underline"
            >
              View Audit Log →
            </button>
          </div>

          <div className="mt-5 space-y-3">
            <div className="flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-label-sm font-semibold text-emerald-900 dark:text-emerald-300">
                  24h Hold Policy Active
                </p>
                <p className="text-body-xs text-emerald-800/80 dark:text-emerald-300/80">
                  Unpaid Pay-at-Hotel holds are auto-released 24h prior to check-in if unconfirmed.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl border border-outline-variant/50 bg-surface-container-low p-3">
              <ShieldAlert className="h-5 w-5 text-on-surface-variant shrink-0 mt-0.5" />
              <div>
                <p className="text-label-sm font-semibold text-on-surface">
                  Immutable Audit Logging
                </p>
                <p className="text-body-xs text-on-surface-variant">
                  Every price override, room lock, and cashier transaction is cryptographically logged.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5 border-t border-outline-variant/40 pt-4">
            <button
              type="button"
              onClick={() => navigate('/admin/finances')}
              className="w-full rounded-xl bg-surface-container-low py-2.5 text-center text-label-md font-semibold text-on-surface hover:bg-surface-container transition"
            >
              Open Tax & Financial Reconciliation Ledger
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
