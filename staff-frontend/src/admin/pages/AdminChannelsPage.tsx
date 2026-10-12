import { useMemo, useState } from 'react';
import {
  Users,
  Globe,
  Search,
  Download,
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
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-label-md font-medium text-white shadow-xs transition hover:brightness-110 active:scale-[0.99]"
          >
            <Download className="h-4 w-4" />
            Export Channel CSV
          </button>
        }
      />

      {/* Top Split & Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Total Summary */}
        <div className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-5 shadow-xs">
          <p className="text-label-md font-medium text-on-surface-variant">Monthly Gross Revenue</p>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-headline-md font-bold text-on-surface">
              {metrics.mtdRevenue.toLocaleString()}
            </span>
            <span className="text-body-sm font-medium text-on-surface-variant">MMK</span>
          </div>
          <p className="mt-3 text-body-xs text-on-surface-variant">
            {selectedMonthRecords.length} verified guest stays recorded for {selectedMonth}
          </p>
        </div>

        {/* Walk-in Card */}
        <div className="rounded-2xl border border-[#89f5e7]/40 bg-[#89f5e7]/10 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-label-md font-medium text-[#004f62]">Walk-In Customers</p>
            <span className="rounded-full bg-white/70 px-2 py-0.5 text-label-xs font-bold text-[#004f62]">
              Direct Counter
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-headline-md font-bold text-[#003644]">
              {metrics.walkInRevenue.toLocaleString()}
            </span>
            <span className="text-body-sm font-medium text-[#004f62]">MMK</span>
          </div>
          <p className="mt-3 text-body-xs text-[#004f62]">
            {metrics.walkInCount} Walk-in stays (
            {metrics.mtdRevenue > 0
              ? Math.round((metrics.walkInRevenue / metrics.mtdRevenue) * 100)
              : 0}
            % of revenue)
          </p>
        </div>

        {/* Online Card */}
        <div className="rounded-2xl border border-primary/30 bg-primary/10 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-label-md font-medium text-primary">Online Direct Reservations</p>
            <span className="rounded-full bg-white/70 px-2 py-0.5 text-label-xs font-bold text-primary">
              StayFlow Web App
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-headline-md font-bold text-primary">
              {metrics.onlineRevenue.toLocaleString()}
            </span>
            <span className="text-body-sm font-medium text-primary">MMK</span>
          </div>
          <p className="mt-3 text-body-xs text-primary">
            {metrics.onlineCount} Online stays (
            {metrics.mtdRevenue > 0
              ? Math.round((metrics.onlineRevenue / metrics.mtdRevenue) * 100)
              : 0}
            % of revenue)
          </p>
        </div>
      </div>

      {/* Tabs & Controls */}
      <div className="flex flex-col gap-3 rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-4 shadow-sm md:flex-row md:items-center md:justify-between">
        {/* Channel Segment Tabs */}
        <div className="flex items-center rounded-xl border border-outline-variant/60 bg-surface-container-low p-1">
          <button
            type="button"
            onClick={() => setChannelFilter('ALL')}
            className={cn(
              'rounded-lg px-3 py-1.5 text-label-sm font-medium transition',
              channelFilter === 'ALL'
                ? 'bg-white text-primary shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface',
            )}
          >
            All Channels ({selectedMonthRecords.length})
          </button>
          <button
            type="button"
            onClick={() => setChannelFilter('WALK_IN')}
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-label-sm font-medium transition',
              channelFilter === 'WALK_IN'
                ? 'bg-white text-[#005a70] shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface',
            )}
          >
            <Users className="h-3.5 w-3.5" />
            Walk-In List ({metrics.walkInCount})
          </button>
          <button
            type="button"
            onClick={() => setChannelFilter('ONLINE')}
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-label-sm font-medium transition',
              channelFilter === 'ONLINE'
                ? 'bg-white text-primary shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface',
            )}
          >
            <Globe className="h-3.5 w-3.5" />
            Online Reservations ({metrics.onlineCount})
          </button>
        </div>

        {/* Search & Status Filter */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative min-w-[240px]">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
            <input
              type="text"
              placeholder="Search guest, NRC, folio, room..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9.5 w-full rounded-xl border border-outline-variant/60 bg-surface-container-low pl-9 pr-3 text-body-sm text-on-surface outline-none focus:border-primary focus:bg-white"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9.5 rounded-xl border border-outline-variant/60 bg-surface-container-low px-3 text-body-sm text-on-surface outline-none cursor-pointer"
          >
            <option value="ALL">All Payment Statuses</option>
            <option value="PAID">Paid / Settled</option>
            <option value="AWAITING_REVIEW">Awaiting Review</option>
            <option value="PENDING">Pending (Pay at Hotel)</option>
          </select>
        </div>
      </div>

      {/* Itemized Channel Table */}
      <div className="overflow-x-auto rounded-2xl border border-outline-variant/60 bg-surface-container-lowest shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-outline-variant/60 bg-surface-container-low text-label-xs font-semibold uppercase tracking-wider text-on-surface-variant">
              <th className="px-5 py-3">Folio Ref</th>
              <th className="px-5 py-3">Guest Name & ID</th>
              <th className="px-5 py-3">Channel</th>
              <th className="px-5 py-3">Room & Category</th>
              <th className="px-5 py-3">Stay Dates</th>
              <th className="px-5 py-3">Total (MMK)</th>
              <th className="px-5 py-3">Payment</th>
              <th className="px-5 py-3">Attendant / Desk</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/40 text-body-sm text-on-surface">
            {filteredRecords.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-5 py-8 text-center text-on-surface-variant">
                  No records match your filters for {selectedMonth}.
                </td>
              </tr>
            ) : (
              filteredRecords.map((record) => {
                const isWalkIn = record.channel === 'WALK_IN';
                return (
                  <tr key={record.id} className="hover:bg-surface-container-low/50 transition">
                    <td className="px-5 py-3.5 font-mono text-label-sm font-semibold text-primary">
                      {record.ref}
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-on-surface">{record.guestName}</p>
                      <p className="text-label-xs text-on-surface-variant">
                        {record.nrcOrPassport || record.phone}
                      </p>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-label-xs font-semibold',
                          isWalkIn
                            ? 'bg-[#89f5e7]/20 text-[#005a70]'
                            : 'bg-primary/10 text-primary',
                        )}
                      >
                        {isWalkIn ? <Users className="h-3 w-3" /> : <Globe className="h-3 w-3" />}
                        {isWalkIn ? 'Walk-In' : 'Online'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="font-bold text-on-surface">Room {record.roomNumber}</p>
                      <p className="text-label-xs text-on-surface-variant">{record.roomCategory}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-label-xs font-medium text-on-surface">
                        {record.checkIn} → {record.checkOut}
                      </p>
                      <p className="text-label-xs text-on-surface-variant">{record.nights} Nights</p>
                    </td>
                    <td className="px-5 py-3.5 font-bold text-on-surface">
                      {record.totalAmount.toLocaleString()} MMK
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-label-xs font-semibold text-on-surface">
                        {record.paymentMethod}
                      </p>
                      <span
                        className={cn(
                          'inline-block mt-0.5 rounded-sm px-1.5 py-0.2 text-[10px] font-bold uppercase',
                          record.paymentStatus === 'PAID'
                            ? 'bg-emerald-500/10 text-emerald-700'
                            : record.paymentStatus === 'AWAITING_REVIEW'
                            ? 'bg-amber-500/10 text-amber-700'
                            : 'bg-slate-500/10 text-slate-700',
                        )}
                      >
                        {record.paymentStatus}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-label-xs text-on-surface-variant">
                      {record.clerkOrSource}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
