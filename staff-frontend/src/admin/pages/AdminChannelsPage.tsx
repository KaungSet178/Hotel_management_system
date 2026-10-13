import { useMemo, useState } from 'react';
import {
  Globe,
  Search,
  Download,
  Building,
  X,
  User,
} from 'lucide-react';
import { useAdminStore } from '../context/AdminStore';
import { AdminHeader } from '../components/AdminHeader';
import type { BookingChannel } from '@/types';
import { cn } from '@/lib/cn';
import { downloadCsv } from '@/lib/download';
import { useToast } from '@/components/toast';

export function AdminChannelsPage() {
  const toast = useToast();
  const {
    selectedMonth,
    setSelectedMonth,
    selectedMonthRecords,
    metrics,
  } = useAdminStore();

  const [channelFilter, setChannelFilter] = useState<'ALL' | BookingChannel>('ALL');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const filteredRecords = useMemo(() => {
    return selectedMonthRecords.filter((rec) => {
      const matchChannel = channelFilter === 'ALL' || rec.channel === channelFilter;
      const matchStatus = statusFilter === 'ALL' || rec.paymentStatus === statusFilter;
      const matchSearch =
        rec.guestName.toLowerCase().includes(search.toLowerCase()) ||
        rec.ref.toLowerCase().includes(search.toLowerCase()) ||
        rec.roomNumber.includes(search) ||
        (rec.nrcOrPassport && rec.nrcOrPassport.toLowerCase().includes(search.toLowerCase())) ||
        rec.phone.includes(search);

      return matchChannel && matchStatus && matchSearch;
    });
  }, [selectedMonthRecords, channelFilter, statusFilter, search]);

  const handleExportCsv = () => {
    const headers = [
      'Folio Ref',
      'Guest Name',
      'NRC / Passport',
      'Phone',
      'Channel',
      'Room No',
      'Category',
      'Check-In',
      'Check-Out',
      'Nights',
      'Rate Plan',
      'Total Amount (MMK)',
      'Payment Method',
      'Payment Status',
      'Front Desk Clerk / Source',
    ];

    const rows = filteredRecords.map((r) => [
      r.ref,
      r.guestName,
      r.nrcOrPassport || '—',
      r.phone,
      r.channel,
      r.roomNumber,
      r.roomCategory,
      r.checkIn,
      r.checkOut,
      r.nights,
      r.ratePlan,
      r.totalAmount,
      r.paymentMethod,
      r.paymentStatus,
      r.clerkOrSource,
    ]);

    const filename = `Grand_Azure_${channelFilter}_${selectedMonth}_Report.csv`;
    downloadCsv(filename, headers, rows);
    toast.success(`Exported ${filteredRecords.length} records to ${filename}`);
  };

  const walkInPct = metrics.mtdRevenue > 0
    ? Math.round((metrics.walkInRevenue / metrics.mtdRevenue) * 100)
    : 0;
  const onlinePct = 100 - walkInPct;

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Channel Intelligence & Customer Lists"
        subtitle="Dedicated monthly segmentation of Walk-In counter arrivals vs. Online direct web reservations"
        badge="Revenue Channels"
        monthSelector={{
          value: selectedMonth,
          onChange: setSelectedMonth,
        }}
        actions={
          <button
            type="button"
            onClick={handleExportCsv}
            className="flex items-center gap-2 rounded-xl bg-[#0e2a4a] px-4 py-2 text-label-sm font-semibold text-white shadow-xs transition hover:bg-[#18395f] active:scale-[0.99] cursor-pointer"
          >
            <Download className="h-4 w-4 text-[#89f5e7]" />
            Export Channel CSV
          </button>
        }
      />

      {/* Top 3 Balanced KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Total Summary */}
        <div className="flex flex-col justify-between rounded-2xl border border-outline-variant/50 border-l-4 border-l-slate-400 bg-surface-container-lowest p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-label-sm font-semibold tracking-wide text-on-surface-variant uppercase">
              Total Monthly Gross
            </p>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface-container text-[#0e2a4a]">
              <Building className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-3xl font-black tracking-tight text-on-surface">
              {metrics.mtdRevenue.toLocaleString()}
            </span>
            <span className="text-label-sm font-bold text-on-surface-variant">MMK</span>
          </div>
          <p className="mt-3 text-body-xs text-on-surface-variant">
            <strong>{selectedMonthRecords.length}</strong> verified guest stays recorded for {selectedMonth}
          </p>
        </div>

        {/* Walk-in Card */}
        <div className="flex flex-col justify-between rounded-2xl border border-outline-variant/50 border-l-4 border-l-[#89f5e7] bg-surface-container-lowest p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-label-sm font-semibold tracking-wide text-secondary uppercase">
              Walk-In Customers (Desk)
            </p>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#89f5e7]/20 text-[#071322]">
              <User className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-3xl font-black tracking-tight text-secondary">
              {metrics.walkInRevenue.toLocaleString()}
            </span>
            <span className="text-label-sm font-bold text-on-surface-variant">MMK</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-body-xs">
            <span className="font-semibold text-on-surface">
              {metrics.walkInCount} Walk-in stays
            </span>
            <span className="rounded-full bg-secondary-container/50 px-2 py-0.5 text-label-xs font-bold text-on-secondary-container">
              {walkInPct}% Revenue Share
            </span>
          </div>
        </div>

        {/* Online Card */}
        <div className="flex flex-col justify-between rounded-2xl border border-outline-variant/50 border-l-4 border-l-[#0e2a4a] bg-surface-container-lowest p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-label-sm font-semibold tracking-wide text-[#0e2a4a] uppercase">
              StayFlow Direct Web App
            </p>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0e2a4a] text-[#89f5e7]">
              <Globe className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-3xl font-black tracking-tight text-[#0e2a4a]">
              {metrics.onlineRevenue.toLocaleString()}
            </span>
            <span className="text-label-sm font-bold text-on-surface-variant">MMK</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-body-xs">
            <span className="font-semibold text-on-surface">
              {metrics.onlineCount} Online bookings
            </span>
            <span className="rounded-full bg-[#0e2a4a]/10 px-2 py-0.5 text-label-xs font-bold text-[#0e2a4a]">
              {onlinePct}% Share • 0% Comm.
            </span>
          </div>
        </div>
      </div>

      {/* Tabs & Controls */}
      <div className="rounded-2xl border border-outline-variant/50 bg-surface-container-lowest p-4 shadow-xs space-y-4">
        {/* Channel Segment Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant/30 pb-3">
          <div className="flex flex-wrap items-center gap-1.5 text-label-xs font-semibold">
            <button
              type="button"
              onClick={() => setChannelFilter('ALL')}
              className={cn(
                'flex items-center gap-1.5 rounded-xl px-3 py-1.5 transition cursor-pointer',
                channelFilter === 'ALL'
                  ? 'bg-[#0e2a4a] text-white shadow-xs'
                  : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface hover:bg-surface-container',
              )}
            >
              <span>All Channels</span>
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.2 text-[10px] font-bold',
                  channelFilter === 'ALL' ? 'bg-white/20 text-white' : 'bg-surface-container-highest text-on-surface-variant',
                )}
              >
                {selectedMonthRecords.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setChannelFilter('WALK_IN')}
              className={cn(
                'flex items-center gap-1.5 rounded-xl px-3 py-1.5 transition cursor-pointer',
                channelFilter === 'WALK_IN'
                  ? 'bg-[#0e2a4a] text-white shadow-xs'
                  : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface hover:bg-surface-container',
              )}
            >
              <User className="h-3 w-3 text-[#89f5e7]" />
              <span>Walk-In Front Desk</span>
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.2 text-[10px] font-bold',
                  channelFilter === 'WALK_IN' ? 'bg-white/20 text-white' : 'bg-surface-container-highest text-on-surface-variant',
                )}
              >
                {metrics.walkInCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setChannelFilter('ONLINE')}
              className={cn(
                'flex items-center gap-1.5 rounded-xl px-3 py-1.5 transition cursor-pointer',
                channelFilter === 'ONLINE'
                  ? 'bg-[#0e2a4a] text-white shadow-xs'
                  : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface hover:bg-surface-container',
              )}
            >
              <Globe className="h-3 w-3 text-[#89f5e7]" />
              <span>StayFlow Online Direct</span>
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.2 text-[10px] font-bold',
                  channelFilter === 'ONLINE' ? 'bg-white/20 text-white' : 'bg-surface-container-highest text-on-surface-variant',
                )}
              >
                {metrics.onlineCount}
              </span>
            </button>
          </div>

          <div className="text-label-xs text-on-surface-variant font-medium">
            Showing <strong className="text-on-surface">{filteredRecords.length}</strong> of {selectedMonthRecords.length} Stays
          </div>
        </div>

        {/* Search & Status Filter */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
            <input
              type="text"
              placeholder="Search guest name, NRC/passport, folio ref, room..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9.5 w-full rounded-xl border border-outline-variant/50 bg-surface-container-low pl-9 pr-8 text-body-sm text-on-surface placeholder:text-on-surface-variant/60 outline-none transition focus:border-primary focus:bg-white"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute top-1/2 right-2.5 -translate-y-1/2 text-on-surface-variant hover:text-on-surface cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-label-xs font-semibold text-on-surface-variant">Payment:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9.5 rounded-xl border border-outline-variant/60 bg-surface-container-low px-3 text-label-sm font-semibold text-on-surface outline-none cursor-pointer"
            >
              <option value="ALL">All Payment Statuses</option>
              <option value="PAID">Paid / Cleared</option>
              <option value="AWAITING_REVIEW">Awaiting Review</option>
              <option value="PENDING">Pending Review</option>
            </select>
          </div>
        </div>
      </div>

      {/* Itemized Channel Table */}
      <div className="overflow-hidden rounded-2xl border border-outline-variant/50 bg-surface-container-lowest shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-body-sm">
            <thead>
              <tr className="border-b border-outline-variant/40 bg-surface-container-low/50 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                <th className="px-4 py-3">Folio Ref</th>
                <th className="px-4 py-3">Guest Name & ID</th>
                <th className="px-4 py-3">Channel</th>
                <th className="px-4 py-3">Room & Category</th>
                <th className="px-4 py-3">Stay Dates</th>
                <th className="px-4 py-3 text-right">Total (MMK)</th>
                <th className="px-4 py-3">Payment Method</th>
                <th className="px-4 py-3">Attendant / Desk</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20">
              {filteredRecords.map((r) => {
                const isWalkIn = r.channel === 'WALK_IN';
                return (
                  <tr key={r.id} className="transition hover:bg-surface-container-low/40">
                    <td className="px-4 py-3.5 font-mono text-label-xs font-bold text-[#0e2a4a]">
                      {r.ref}
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-container text-label-xs font-bold text-on-surface">
                          {r.guestName.charAt(0)}
                        </span>
                        <div>
                          <p className="font-semibold text-on-surface">{r.guestName}</p>
                          <p className="text-[11px] text-on-surface-variant">
                            {r.nrcOrPassport || 'NRC on File'} • {r.phone}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold',
                          isWalkIn
                            ? 'bg-[#89f5e7]/20 text-secondary'
                            : 'bg-[#0e2a4a]/10 text-[#0e2a4a]',
                        )}
                      >
                        {isWalkIn ? <User className="h-3 w-3" /> : <Globe className="h-3 w-3" />}
                        {isWalkIn ? 'Walk-In Desk' : 'Online Web'}
                      </span>
                    </td>

                    <td className="px-4 py-3.5">
                      <p className="font-bold text-on-surface">Room {r.roomNumber}</p>
                      <p className="text-[11px] text-on-surface-variant">{r.roomCategory}</p>
                    </td>

                    <td className="px-4 py-3.5">
                      <p className="font-medium text-on-surface">
                        {r.checkIn} → {r.checkOut}
                      </p>
                      <p className="text-[11px] text-on-surface-variant">
                        {r.nights} {r.nights === 1 ? 'night' : 'nights'} • {r.ratePlan}
                      </p>
                    </td>

                    <td className="px-4 py-3.5 text-right font-extrabold text-on-surface">
                      {r.totalAmount.toLocaleString()} MMK
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={cn(
                            'h-1.5 w-1.5 rounded-full',
                            r.paymentStatus === 'PAID'
                              ? 'bg-emerald-500'
                              : 'bg-amber-500',
                          )}
                        />
                        <span className="font-semibold text-on-surface text-label-xs">
                          {r.paymentMethod}
                        </span>
                      </div>
                      <span
                        className={cn(
                          'text-[10px] font-bold uppercase tracking-wider',
                          r.paymentStatus === 'PAID' ? 'text-emerald-700' : 'text-amber-700',
                        )}
                      >
                        {r.paymentStatus}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-label-xs text-on-surface-variant">
                      <span className="font-semibold text-on-surface">{r.clerkOrSource}</span>
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
