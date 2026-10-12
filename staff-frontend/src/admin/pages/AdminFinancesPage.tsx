import { useMemo } from 'react';
import {
  DollarSign,
  Download,
  Receipt,
  Building2,
  Percent,
  CreditCard,
  Banknote,
  Smartphone,
  CheckCircle2,
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
      // Net base calculation: gross = base * 1.15
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
    const map: Record<string, { count: number; total: number; icon: typeof CreditCard; color: string; dot: string }> = {
      'Visa / Mastercard / Stripe': {
        count: 0,
        total: 0,
        icon: CreditCard,
        color: 'from-[#0e2a4a] to-[#18395f]',
        dot: 'bg-[#0e2a4a]',
      },
      'KBZPay Merchant QR': {
        count: 0,
        total: 0,
        icon: Smartphone,
        color: 'from-blue-600 to-indigo-700',
        dot: 'bg-blue-600',
      },
      'WavePay Mobile Money': {
        count: 0,
        total: 0,
        icon: Smartphone,
        color: 'from-amber-500 to-yellow-600',
        dot: 'bg-amber-500',
      },
      'Front Desk Cash Drawer': {
        count: 0,
        total: 0,
        icon: Banknote,
        color: 'from-emerald-600 to-teal-700',
        dot: 'bg-emerald-600',
      },
    };

    selectedMonthRecords.forEach((r) => {
      let key = 'Visa / Mastercard / Stripe';
      if (r.paymentMethod.includes('KBZPay')) key = 'KBZPay Merchant QR';
      else if (r.paymentMethod.includes('WavePay')) key = 'WavePay Mobile Money';
      else if (r.paymentMethod.includes('Cash')) key = 'Front Desk Cash Drawer';

      map[key].count += 1;
      map[key].total += r.totalAmount;
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
            className="flex items-center gap-2 rounded-xl bg-[#0e2a4a] px-4 py-2 text-label-sm font-semibold text-white shadow-xs transition hover:bg-[#18395f] active:scale-[0.99] cursor-pointer"
          >
            <Download className="h-4 w-4 text-[#89f5e7]" />
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
          subtext="Includes room revenue & taxes"
          icon={DollarSign}
          variant="primary"
        />
        <KpiCard
          title="Net Base Room Revenue"
          value={metrics.netRoomRevenue.toLocaleString()}
          unit="MMK"
          subtext="Base hospitality room charges"
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
          subtext="Myanmar Gov statutory accrual"
          icon={Building2}
          variant="secondary"
        />
      </div>

      {/* Gateway Settlement Distribution */}
      <div className="rounded-2xl border border-outline-variant/50 bg-surface-container-lowest p-6 shadow-xs">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center border-b border-outline-variant/30 pb-4">
          <div>
            <h3 className="text-title-md font-bold text-on-surface">
              Payment Gateway Settlements & Clearing
            </h3>
            <p className="text-body-xs text-on-surface-variant">
              Reconciled merchant settlements by digital payment gateway and front desk cash collection
            </p>
          </div>
          <span className="flex items-center gap-1 text-label-xs font-bold text-emerald-700 bg-emerald-500/10 px-2.5 py-1 rounded-full">
            <CheckCircle2 className="h-3.5 w-3.5" /> 100% Reconciled
          </span>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {paymentGateways.map((gw) => {
            const Icon = gw.icon;
            return (
              <div
                key={gw.name}
                className="flex flex-col justify-between rounded-xl border border-outline-variant/40 bg-surface-container-low/60 p-4 shadow-2xs hover:bg-surface-container-low transition"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-label-sm font-bold text-on-surface">
                      <Icon className="h-4 w-4 text-[#0e2a4a]" />
                      {gw.name}
                    </span>
                    <span className="rounded-full bg-[#0e2a4a]/10 px-2 py-0.5 text-label-xs font-bold text-[#0e2a4a]">
                      {gw.pct}%
                    </span>
                  </div>

                  <p className="mt-3 text-xl font-extrabold text-on-surface">
                    {gw.total.toLocaleString()}{' '}
                    <span className="text-label-xs font-medium text-on-surface-variant">MMK</span>
                  </p>
                </div>

                <div className="mt-3">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-container">
                    <div
                      className="h-full rounded-full bg-[#0e2a4a]"
                      style={{ width: `${gw.pct}%` }}
                    />
                  </div>
                  <p className="mt-2 text-[11px] font-medium text-on-surface-variant">
                    {gw.count} transactions cleared & deposited
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Itemized Tax & Revenue Journal */}
      <div className="overflow-hidden rounded-2xl border border-outline-variant/50 bg-surface-container-lowest shadow-xs">
        <div className="flex items-center justify-between border-b border-outline-variant/40 bg-surface-container-low/50 px-5 py-3.5">
          <div>
            <h4 className="text-label-md font-bold text-on-surface">
              Monthly Itemized Tax & Reconciliation Ledger
            </h4>
            <p className="text-body-xs text-on-surface-variant">
              Every stay breakdown: Net Base (85%) + 10% Service Charge + 5% Commercial Tax
            </p>
          </div>
          <span className="rounded-full bg-white px-3 py-1 text-label-xs font-bold text-[#0e2a4a] shadow-xs">
            {ledgerRows.length} Ledger Entries
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-body-sm">
            <thead>
              <tr className="border-b border-outline-variant/40 bg-surface-container-low/40 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                <th className="px-4 py-3">Folio Ref</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Guest & Channel</th>
                <th className="px-4 py-3 text-right">Net Base (MMK)</th>
                <th className="px-4 py-3 text-right">10% Service</th>
                <th className="px-4 py-3 text-right">5% Comm. Tax</th>
                <th className="px-4 py-3 text-right">Gross Total</th>
                <th className="px-4 py-3">Gateway</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20 text-on-surface">
              {ledgerRows.map((row) => (
                <tr key={row.id} className="hover:bg-surface-container-low/40 transition">
                  <td className="px-4 py-3.5 font-mono text-label-xs font-bold text-[#0e2a4a]">
                    {row.ref}
                  </td>
                  <td className="px-4 py-3.5 text-label-xs text-on-surface-variant">{row.date}</td>
                  <td className="px-4 py-3.5">
                    <p className="font-semibold text-on-surface">{row.guest}</p>
                    <span className="text-[11px] text-on-surface-variant">
                      {row.channel === 'WALK_IN' ? 'Walk-In Desk' : 'Online StayFlow'}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right font-medium text-on-surface">
                    {row.base.toLocaleString()}
                  </td>
                  <td className="px-4 py-3.5 text-right font-medium text-[#00677f]">
                    {row.service.toLocaleString()}
                  </td>
                  <td className="px-4 py-3.5 text-right font-medium text-rose-600">
                    {row.tax.toLocaleString()}
                  </td>
                  <td className="px-4 py-3.5 text-right font-black text-on-surface">
                    {row.gross.toLocaleString()} MMK
                  </td>
                  <td className="px-4 py-3.5 text-label-xs font-semibold text-on-surface-variant">
                    {row.gateway}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-outline-variant/60 bg-surface-container-low/70 font-bold text-on-surface">
                <td colSpan={3} className="px-4 py-4 text-label-sm uppercase tracking-wide">
                  Totals ({selectedMonth})
                </td>
                <td className="px-4 py-4 text-right text-label-md font-extrabold text-on-surface">
                  {metrics.netRoomRevenue.toLocaleString()}
                </td>
                <td className="px-4 py-4 text-right text-label-md font-extrabold text-[#00677f]">
                  {metrics.serviceCharge10.toLocaleString()}
                </td>
                <td className="px-4 py-4 text-right text-label-md font-extrabold text-rose-600">
                  {metrics.commercialTax5.toLocaleString()}
                </td>
                <td className="px-4 py-4 text-right text-label-md font-black text-[#0e2a4a]">
                  {metrics.mtdRevenue.toLocaleString()} MMK
                </td>
                <td className="px-4 py-4" />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
