import { useMemo } from 'react';
import {
  DollarSign,
  Download,
  Receipt,
  Building2,
  Percent,
} from 'lucide-react';
import { useAdminStore } from '../context/AdminStore';
import { AdminHeader } from '../components/AdminHeader';
import { KpiCard } from '../components/KpiCard';
import { downloadCsv } from '@/lib/download';
import { useToast } from '@/components/toast';

export function AdminFinancesPage() {
  const toast = useToast();
  const {
    selectedMonth,
    setSelectedMonth,
    selectedMonthRecords,
    metrics,
  } = useAdminStore();

  // Itemized financial ledger rows
  const ledgerRows = useMemo(() => {
    return selectedMonthRecords.map((r) => {
      // Net base calculation: total = base * 1.15
      const baseRoom = Math.round(r.totalAmount / 1.15);
      const service10 = Math.round(baseRoom * 0.1);
      const tax5 = Math.round(baseRoom * 0.05);

      return {
        id: r.id,
        ref: r.ref,
        date: r.checkIn,
        guest: r.guestName,
        channel: r.channel,
        gross: r.totalAmount,
        base: baseRoom,
        service: service10,
        tax: tax5,
        gateway: r.paymentMethod,
        status: r.paymentStatus,
      };
    });
  }, [selectedMonthRecords]);

  // Payment method totals
  const paymentGateways = useMemo(() => {
    const map: Record<string, { count: number; total: number }> = {};
    selectedMonthRecords.forEach((r) => {
      const g = r.paymentMethod.includes('KBZPay')
        ? 'KBZPay Merchant'
        : r.paymentMethod.includes('WavePay')
        ? 'WavePay Mobile'
        : r.paymentMethod.includes('Cash')
        ? 'Cash at Front Desk'
        : 'Visa / Mastercard / Stripe';

      if (!map[g]) map[g] = { count: 0, total: 0 };
      map[g].count += 1;
      map[g].total += r.totalAmount;
    });

    return Object.entries(map).map(([name, data]) => ({
      name,
      ...data,
      pct: metrics.mtdRevenue > 0 ? Math.round((data.total / metrics.mtdRevenue) * 100) : 0,
    }));
  }, [selectedMonthRecords, metrics.mtdRevenue]);

  const handleExportLedger = () => {
    const headers = [
      'Folio Reference',
      'Transaction Date',
      'Guest Name',
      'Channel',
      'Gross Total (MMK)',
      'Net Base Room (MMK)',
      '10% Service Charge (MMK)',
      '5% Commercial Tax (MMK)',
      'Settlement Gateway',
      'Status',
    ];

    const rows = ledgerRows.map((r) => [
      r.ref,
      r.date,
      r.guest,
      r.channel,
      r.gross,
      r.base,
      r.service,
      r.tax,
      r.gateway,
      r.status,
    ]);

    const filename = `Grand_Azure_Tax_Ledger_${selectedMonth}.csv`;
    downloadCsv(filename, headers, rows);
    toast.success(`Tax & Financial reconciliation exported to ${filename}`);
  };

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Financial Reconciliation & Tax Ledger"
        subtitle="Myanmar IRD regulatory tax compliance, 10% hospitality service charge pool, and gateway settlements"
        badge="Audited Financials"
        monthSelector={{
          value: selectedMonth,
          onChange: setSelectedMonth,
        }}
        actions={
          <button
            type="button"
            onClick={handleExportLedger}
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-label-md font-medium text-white shadow-xs transition hover:brightness-110 active:scale-[0.99]"
          >
            <Download className="h-4 w-4" />
            Download Tax Ledger CSV
          </button>
        }
      />

      {/* Tax & Financial KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Gross Collections (MTD)"
          value={metrics.mtdRevenue.toLocaleString()}
          unit="MMK"
          subtext="Includes room revenue and all taxes"
          icon={DollarSign}
          variant="primary"
        />
        <KpiCard
          title="Net Room Revenue"
          value={metrics.netRoomRevenue.toLocaleString()}
          unit="MMK"
          subtext="Base hospitality revenue before tax"
          icon={Receipt}
          variant="neutral"
        />
        <KpiCard
          title="10% Service Charge Pool"
          value={metrics.serviceCharge10.toLocaleString()}
          unit="MMK"
          subtext="Distributed to operational staff pool"
          icon={Percent}
          variant="accent"
        />
        <KpiCard
          title="5% Commercial Tax (IRD)"
          value={metrics.commercialTax5.toLocaleString()}
          unit="MMK"
          subtext="Myanmar Government Tax Accrual"
          icon={Building2}
          variant="secondary"
        />
      </div>

      {/* Gateway Settlement Distribution */}
      <div className="rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-6 shadow-sm">
        <h3 className="text-title-md font-semibold text-on-surface">
          Payment Gateway Settlements & Clearing
        </h3>
        <p className="mt-0.5 text-body-sm text-on-surface-variant">
          Breakdown of reconciled merchant settlements by digital gateway and physical cash
        </p>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {paymentGateways.map((gw) => (
            <div
              key={gw.name}
              className="rounded-xl border border-outline-variant/60 bg-surface-container-low p-4"
            >
              <div className="flex items-center justify-between">
                <span className="text-label-md font-semibold text-on-surface">{gw.name}</span>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-label-xs font-bold text-primary">
                  {gw.pct}%
                </span>
              </div>
              <p className="mt-3 text-headline-xs font-bold text-on-surface">
                {gw.total.toLocaleString()}{' '}
                <span className="text-label-xs font-normal text-on-surface-variant">MMK</span>
              </p>
              <p className="mt-1 text-label-xs text-on-surface-variant">
                {gw.count} transactions cleared
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Itemized Tax & Revenue Journal */}
      <div className="overflow-x-auto rounded-2xl border border-outline-variant/60 bg-surface-container-lowest shadow-sm">
        <div className="flex items-center justify-between border-b border-outline-variant/60 bg-surface-container-low px-5 py-3.5">
          <div>
            <h4 className="text-label-md font-semibold text-on-surface">
              Monthly Itemized Tax & Reconciliation Ledger
            </h4>
            <p className="text-label-xs text-on-surface-variant">
              Every stay breakdown: Base (85%) + 10% Service + 5% Commercial Tax
            </p>
          </div>
          <span className="rounded-md bg-white px-2.5 py-1 text-label-xs font-semibold text-primary shadow-xs">
            {ledgerRows.length} Ledger Entries
          </span>
        </div>

        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-outline-variant/60 bg-surface-container-low text-label-xs font-semibold uppercase tracking-wider text-on-surface-variant">
              <th className="px-5 py-3">Folio Ref</th>
              <th className="px-5 py-3">Date</th>
              <th className="px-5 py-3">Guest & Channel</th>
              <th className="px-5 py-3 text-right">Net Base (MMK)</th>
              <th className="px-5 py-3 text-right">10% Service</th>
              <th className="px-5 py-3 text-right">5% Comm. Tax</th>
              <th className="px-5 py-3 text-right">Gross Total</th>
              <th className="px-5 py-3">Gateway</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/40 text-body-sm text-on-surface">
            {ledgerRows.map((row) => (
              <tr key={row.id} className="hover:bg-surface-container-low/50 transition">
                <td className="px-5 py-3 font-mono text-label-sm font-semibold text-primary">
                  {row.ref}
                </td>
                <td className="px-5 py-3 text-label-sm text-on-surface-variant">{row.date}</td>
                <td className="px-5 py-3">
                  <p className="font-semibold text-on-surface">{row.guest}</p>
                  <span className="text-[11px] font-medium text-on-surface-variant">
                    {row.channel === 'WALK_IN' ? 'Walk-In Counter' : 'Online StayFlow'}
                  </span>
                </td>
                <td className="px-5 py-3 text-right font-medium text-on-surface">
                  {row.base.toLocaleString()}
                </td>
                <td className="px-5 py-3 text-right text-[#00677f]">
                  {row.service.toLocaleString()}
                </td>
                <td className="px-5 py-3 text-right text-rose-600">
                  {row.tax.toLocaleString()}
                </td>
                <td className="px-5 py-3 text-right font-bold text-on-surface">
                  {row.gross.toLocaleString()} MMK
                </td>
                <td className="px-5 py-3 text-label-xs font-medium text-on-surface-variant">
                  {row.gateway}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-outline-variant/80 bg-surface-container-low font-bold text-on-surface">
              <td colSpan={3} className="px-5 py-4 text-label-md uppercase">
                Totals ({selectedMonth})
              </td>
              <td className="px-5 py-4 text-right text-label-md">
                {metrics.netRoomRevenue.toLocaleString()}
              </td>
              <td className="px-5 py-4 text-right text-label-md text-[#00677f]">
                {metrics.serviceCharge10.toLocaleString()}
              </td>
              <td className="px-5 py-4 text-right text-label-md text-rose-600">
                {metrics.commercialTax5.toLocaleString()}
              </td>
              <td className="px-5 py-4 text-right text-label-md text-primary">
                {metrics.mtdRevenue.toLocaleString()} MMK
              </td>
              <td className="px-5 py-4" />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
