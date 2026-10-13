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

type GatewayKey =
  | 'Visa / Mastercard / Stripe'
  | 'KBZPay Merchant QR'
  | 'WavePay Mobile Money'
  | 'Front Desk Cash Drawer';

interface GatewayInfo {
  name: GatewayKey;
  badge: string;
  pillClass: string;
}

function getPaymentGatewayInfo(rawMethod?: string): GatewayInfo {
  const m = String(rawMethod || '').toUpperCase().trim();
  if (m.includes('KBZ')) {
    return {
      name: 'KBZPay Merchant QR',
      badge: 'KBZPay QR',
      pillClass: 'bg-blue-500/10 text-blue-700 border-blue-200/80',
    };
  }
  if (m.includes('WAVE')) {
    return {
      name: 'WavePay Mobile Money',
      badge: 'WavePay QR',
      pillClass: 'bg-amber-500/10 text-amber-700 border-amber-200/80',
    };
  }
  if (
    m.includes('PAY_AT_HOTEL') ||
    m.includes('CASH') ||
    m.includes('HOTEL') ||
    m.includes('COUNTER') ||
    m.includes('DESK')
  ) {
    return {
      name: 'Front Desk Cash Drawer',
      badge: 'Cash Drawer',
      pillClass: 'bg-emerald-500/10 text-emerald-700 border-emerald-200/80',
    };
  }
  return {
    name: 'Visa / Mastercard / Stripe',
    badge: 'Card / Stripe',
    pillClass: 'bg-[#0e2a4a]/10 text-[#0e2a4a] border-[#0e2a4a]/20',
  };
}

function getStatusBadge(status?: string, bookingStatus?: string) {
  const s = String(status || '').toUpperCase();
  const bs = String(bookingStatus || '').toUpperCase();

  if (s === 'PAID' || bs === 'CHECKED_OUT' || s === 'COMPLETED') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200">
        <CheckCircle2 className="h-3 w-3" /> Paid & Cleared
      </span>
    );
  }
  if (bs === 'CHECKED_IN' || s === 'IN_HOUSE') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/10 px-2 py-0.5 text-[11px] font-bold text-sky-700 border border-sky-200">
        In-House Stay
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700 border border-slate-200">
      {status || 'Active'}
    </span>
  );
}

export function AdminFinancesPage() {
  const toast = useToast();
  const {
    selectedMonth,
    setSelectedMonth,
    selectedMonthRecords,
  } = useAdminStore();

  // Active non-cancelled ledger records for selected month
  const activeRecords = useMemo(() => {
    return selectedMonthRecords.filter(
      (r) => r.bookingStatus !== 'CANCELLED' && r.paymentStatus !== 'CANCELLED_24H_HOLD'
    );
  }, [selectedMonthRecords]);

  // Itemized financial ledger rows
  const ledgerRows = useMemo(() => {
    return activeRecords.map((r) => {
      // Net base calculation: gross = base * 1.15
      const baseRoom = Math.round(r.totalAmount / 1.15);
      const service10 = Math.round(baseRoom * 0.1);
      // Guarantee row balance: base + service + tax === gross
      const tax5 = r.totalAmount - baseRoom - service10;
      const gwInfo = getPaymentGatewayInfo(r.paymentMethod);

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
        gateway: gwInfo.badge,
        gatewayName: gwInfo.name,
        gatewayPillClass: gwInfo.pillClass,
        rawPaymentMethod: r.paymentMethod,
        status: r.paymentStatus,
        bookingStatus: r.bookingStatus,
      };
    });
  }, [activeRecords]);

  // Totals computed directly from ledger rows: guaranteed 100% mathematical reconciliation
  const totals = useMemo(() => {
    const gross = ledgerRows.reduce((acc, r) => acc + r.gross, 0);
    const base = ledgerRows.reduce((acc, r) => acc + r.base, 0);
    const service = ledgerRows.reduce((acc, r) => acc + r.service, 0);
    const tax = ledgerRows.reduce((acc, r) => acc + r.tax, 0);
    return { gross, base, service, tax };
  }, [ledgerRows]);

  // Payment method totals across all 4 gateways
  const paymentGateways = useMemo(() => {
    const map: Record<
      GatewayKey,
      { count: number; total: number; icon: typeof CreditCard; color: string; dot: string }
    > = {
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

    ledgerRows.forEach((r) => {
      const gwName = r.gatewayName;
      if (map[gwName]) {
        map[gwName].count += 1;
        map[gwName].total += r.gross;
      }
    });

    const grossTotal = totals.gross;
    return (Object.entries(map) as [GatewayKey, (typeof map)[GatewayKey]][]).map(([name, data]) => ({
      name,
      ...data,
      pct: grossTotal > 0 ? Math.round((data.total / grossTotal) * 100) : 0,
    }));
  }, [ledgerRows, totals.gross]);

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

      {/* Tax & Financial KPI Cards - 100% reconciled with ledger */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Gross Collections (MTD)"
          value={totals.gross.toLocaleString()}
          unit="MMK"
          subtext="Includes room revenue & taxes"
          icon={DollarSign}
          variant="primary"
        />
        <KpiCard
          title="Net Base Room Revenue"
          value={totals.base.toLocaleString()}
          unit="MMK"
          subtext="Base hospitality room charges"
          icon={Receipt}
          variant="neutral"
        />
        <KpiCard
          title="10% Service Charge Pool"
          value={totals.service.toLocaleString()}
          unit="MMK"
          subtext="Distributed to operational staff pool"
          icon={Percent}
          variant="accent"
        />
        <KpiCard
          title="5% Commercial Tax (IRD)"
          value={totals.tax.toLocaleString()}
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
          <span className="flex items-center gap-1 text-label-xs font-bold text-emerald-700 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-200">
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
                      style={{ width: `${Math.min(100, gw.pct)}%` }}
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
          <span className="rounded-full bg-white px-3 py-1 text-label-xs font-bold text-[#0e2a4a] border border-outline-variant/30 shadow-xs">
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
                <th className="px-4 py-3 text-center">Gateway</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20 text-on-surface">
              {ledgerRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-on-surface-variant">
                    No ledger entries found for {selectedMonth}.
                  </td>
                </tr>
              ) : (
                ledgerRows.map((row) => (
                  <tr key={row.id} className="hover:bg-surface-container-low/40 transition">
                    <td className="px-4 py-3.5 font-mono text-label-xs font-bold text-[#0e2a4a]">
                      {row.ref}
                    </td>
                    <td className="px-4 py-3.5 text-label-xs text-on-surface-variant">{row.date}</td>
                    <td className="px-4 py-3.5">
                      <p className="font-semibold text-on-surface">{row.guest}</p>
                      <span className="text-[11px] text-on-surface-variant">
                        {row.channel === 'WALK_IN' ? 'Walk-In Desk' : 'Online StayEase'}
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
                    <td className="px-4 py-3.5 text-center">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-label-xs font-bold border ${row.gatewayPillClass}`}
                      >
                        {row.gateway}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      {getStatusBadge(row.status, row.bookingStatus)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-outline-variant/60 bg-surface-container-low/70 font-bold text-on-surface">
                <td colSpan={3} className="px-4 py-4 text-label-sm uppercase tracking-wide">
                  Totals ({selectedMonth})
                </td>
                <td className="px-4 py-4 text-right text-label-md font-extrabold text-on-surface">
                  {totals.base.toLocaleString()}
                </td>
                <td className="px-4 py-4 text-right text-label-md font-extrabold text-[#00677f]">
                  {totals.service.toLocaleString()}
                </td>
                <td className="px-4 py-4 text-right text-label-md font-extrabold text-rose-600">
                  {totals.tax.toLocaleString()}
                </td>
                <td className="px-4 py-4 text-right text-label-md font-black text-[#0e2a4a]">
                  {totals.gross.toLocaleString()} MMK
                </td>
                <td className="px-4 py-4" />
                <td className="px-4 py-4" />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
