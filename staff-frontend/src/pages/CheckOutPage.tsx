import { useState } from 'react';
import {
  Banknote,
  CalendarDays,
  CheckCheck,
  Clock,
  CreditCard,
  KeyRound,
  Mail,
  Printer,
  ScrollText,
  Users,
} from 'lucide-react';
import { dateRange, mmk } from '@/lib/format';
import { downloadText } from '@/lib/download';
import { printFolioReceipt, printPaymentReceipt } from '@/lib/print';
import { useAppStore } from '@/store';
import { useToast } from '@/components/toast';
import {
  Avatar,
  Button,
  Field,
  Panel,
  SectionTitle,
  SelectInput,
  StatusChip,
  Toggle,
} from '@/components/ui';
import type { Folio } from '@/types';

function folioReceiptText(folio: Folio, total: number, outstanding: number): string {
  return [
    'StayFlow · Yangon Heritage — Check-out Folio',
    `Guest: ${folio.guestName}`,
    `Room: ${folio.room} · ${folio.roomCategory}`,
    `Stay: ${dateRange(folio.checkIn, folio.checkOut)} · ${folio.nights} night(s)`,
    `Room Charges: ${mmk(folio.roomCharges)}`,
    `Incidental Charges: ${mmk(folio.incidentals)}`,
    `Taxes & Service Charges: ${mmk(folio.taxes)}`,
    `Total: ${mmk(total)}`,
    `Balance outstanding: ${mmk(outstanding)}`,
    'Thank you for staying with StayFlow.',
  ].join('\n');
}

export function CheckOutPage() {
  const { folio, folioSettled, settleFolio } = useAppStore();
  const toast = useToast();

  const [lateCheckout, setLateCheckout] = useState(false);
  const [earlyCheckin, setEarlyCheckin] = useState(false);
  const [currency, setCurrency] = useState('MMK');

  const total = folio.roomCharges + folio.incidentals + folio.taxes;
  const outstanding = total - folio.roomCharges;

  const settle = (partial: boolean): void => {
    if (folioSettled) return;
    settleFolio();
    toast.success(
      partial
        ? `Partial payment collected · Room ${folio.room} · ${mmk(outstanding)}`
        : `Check-out complete · ${folio.guestName} · balance ${mmk(outstanding)} settled`,
    );
  };

  const handlePrintFolio = (): void => {
    printFolioReceipt({ folio, total, outstanding, settled: folioSettled });
    toast.info('Opening folio print preview');
  };

  const handleCollect = (): void => {
    if (folioSettled) return;
    settle(false);
    printPaymentReceipt({
      guestName: folio.guestName,
      room: folio.room,
      amount: outstanding,
      method: currency,
      reference: `RCT-${folio.room}-${Date.now().toString().slice(-6)}`,
      timestamp: new Date().toLocaleString(),
    });
  };

  const handleEmailReceipt = (): void => {
    downloadText(
      `${folio.guestName.replace(/\s+/g, '-')}-folio-receipt.txt`,
      folioReceiptText(folio, total, outstanding),
    );
    toast.success(`Folio receipt e-mailed to ${folio.guestName}`);
  };

  return (
    <div className="space-y-6">
      <SectionTitle
        eyebrow="StayFlow · Front Desk"
        title="Check-out"
        description="Settle the folio, reconcile incidentals and release the key card for Yangon Heritage."
        action={
          <Button variant="outline" size="sm" onClick={handlePrintFolio}>
            <Printer className="h-4 w-4" />
            Print
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_380px]">
        <div className="min-w-0 space-y-4">
          <Panel
            title={`Check-out Folio · ${folio.room}`}
            subtitle={`${folio.roomCategory} · ${dateRange(folio.checkIn, folio.checkOut)} · ${folio.nights} night${folio.nights === 1 ? '' : 's'}`}
            bodyClassName="p-0"
          >
            <table className="w-full text-left text-body-md">
              <tbody className="divide-y divide-outline-variant/30">
                <tr>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary-container">
                        <ScrollText className="h-4 w-4 text-on-secondary-container" />
                      </span>
                      <div>
                        <p className="font-semibold text-on-surface">Room Charges</p>
                        <p className="text-label-sm text-on-surface-variant">
                          {folio.roomCategory} · {folio.nights} nights
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3.5 text-right font-semibold text-on-surface">
                    {mmk(folio.roomCharges)}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <StatusChip status={folio.roomChargesPaid ? 'PAID' : 'PENDING'} />
                  </td>
                </tr>
                <tr>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-tertiary-fixed">
                        <Banknote className="h-4 w-4 text-on-tertiary-fixed-variant" />
                      </span>
                      <div>
                        <p className="font-semibold text-on-surface">Incidental Charges</p>
                        <p className="text-label-sm text-on-surface-variant">
                          Mini-bar · Laundry · Room service
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3.5 text-right font-semibold text-on-surface">
                    {mmk(folio.incidentals)}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <StatusChip status="PENDING" />
                  </td>
                </tr>
                <tr>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#e7eeff]">
                        <Clock className="h-4 w-4 text-[#3a475f]" />
                      </span>
                      <div>
                        <p className="font-semibold text-on-surface">Taxes & Service Charges</p>
                        <p className="text-label-sm text-on-surface-variant">
                          5% AHB + 10% Service
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3.5 text-right font-semibold text-on-surface">
                    {mmk(folio.taxes)}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <StatusChip status="PENDING" />
                  </td>
                </tr>
                <tr className="bg-surface-container-low/60">
                  <td className="px-5 py-4">
                    <p className="text-label-md font-bold text-on-surface">TOTAL</p>
                    <p className="text-label-sm text-on-surface-variant">Incl. all taxes</p>
                  </td>
                  <td className="px-3 py-4 text-right text-title-sm font-bold text-on-surface">
                    {mmk(total)}
                  </td>
                  <td className="px-5 py-4 text-right" />
                </tr>
              </tbody>
            </table>

            <div className="mx-5 mb-5 flex items-center justify-between rounded-xl bg-tertiary-fixed px-4 py-3">
              <div>
                <p className="text-label-sm font-medium text-on-tertiary-fixed-variant">
                  Balance outstanding
                </p>
                <p className="text-headline-md font-bold text-on-tertiary-fixed-variant">
                  {mmk(outstanding)}
                </p>
              </div>
              {folioSettled && (
                <span className="flex items-center gap-1.5 rounded-full bg-on-tertiary-fixed px-3 py-1.5 text-label-sm font-semibold text-white">
                  <CheckCheck className="h-4 w-4" />
                  Settled
                </span>
              )}
            </div>
          </Panel>

          <Panel
            title="Collect Payment"
            subtitle="Due at check-out"
            bodyClassName="space-y-4"
          >
            <div className="rounded-2xl bg-primary-container p-5 text-[#ecf1ff] shadow-[0_18px_50px_-24px_rgba(14,28,50,0.8)]">
              <p className="text-label-sm font-semibold tracking-widest text-[#89f5e7] uppercase">
                Amount due
              </p>
              <p className="mt-1 text-headline-xl font-bold tracking-tight">
                {mmk(outstanding)}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Field label="Currency">
                  <SelectInput
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="h-9 w-28 border-white/20 bg-white/10 text-white [&>option]:text-on-surface"
                  >
                    <option>MMK</option>
                    <option>USD</option>
                    <option>THB</option>
                  </SelectInput>
                </Field>
                <p className="text-label-sm text-white/55">Rates updated 09:00 MMT</p>
              </div>
              <div className="mt-4">
                <Toggle
                  checked={true}
                  onChange={() => undefined}
                  label="Hold deposit refund to card"
                />
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <Button
                  variant="primary"
                  className="bg-white text-[#0e1c32] hover:bg-white/90"
                  disabled={folioSettled}
                  onClick={handleCollect}
                >
                  <CreditCard className="h-4 w-4" />
                  Collect Payment
                </Button>
                <Button
                  variant="outline"
                  className="border-white/25 bg-transparent text-white hover:bg-white/10"
                  disabled={folioSettled}
                  onClick={() => settle(true)}
                >
                  <Banknote className="h-4 w-4" />
                  Partial Payment
                </Button>
              </div>
            </div>
          </Panel>
        </div>

        <div className="w-full shrink-0 space-y-4">
          <Panel title="Guest" bodyClassName="space-y-4">
            <div className="flex items-center gap-3">
              <Avatar name={folio.guestName} className="h-12 w-12 text-title-sm" />
              <div>
                <p className="text-body-md font-semibold text-on-surface">{folio.guestName}</p>
                <p className="text-label-sm text-on-surface-variant">
                  +95 9 798 123 456 · Elite VIP
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 rounded-xl bg-surface-container-low px-3 py-2.5 text-body-sm">
              <div>
                <p className="text-label-sm text-on-surface-variant">Room</p>
                <p className="font-semibold text-on-surface">{folio.room}</p>
              </div>
              <div>
                <p className="text-label-sm text-on-surface-variant">Category</p>
                <p className="font-semibold text-on-surface">{folio.roomCategory}</p>
              </div>
              <div>
                <p className="text-label-sm text-on-surface-variant">Arrived</p>
                <p className="font-semibold text-on-surface">15 Oct</p>
              </div>
              <div>
                <p className="text-label-sm text-on-surface-variant">Departs</p>
                <p className="font-semibold text-on-surface">18 Oct</p>
              </div>
            </div>
          </Panel>

          <Panel title="Stay Adjustments" bodyClassName="space-y-3">
            <div className="flex items-center justify-between rounded-lg border border-outline-variant/50 px-3 py-2.5">
              <div>
                <p className="text-label-md font-medium text-on-surface">Late check-out</p>
                <p className="text-label-sm text-on-surface-variant">-10% of nightly rate until 15:00</p>
              </div>
              <Toggle checked={lateCheckout} onChange={setLateCheckout} label="" />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-outline-variant/50 px-3 py-2.5">
              <div>
                <p className="text-label-md font-medium text-on-surface">Early check-in</p>
                <p className="text-label-sm text-on-surface-variant">-30% applied if room ready</p>
              </div>
              <Toggle checked={earlyCheckin} onChange={setEarlyCheckin} label="" />
            </div>
            <div>
              <Field label="Room upgrade during stay">
                <SelectInput defaultValue="none" className="h-10">
                  <option value="none">No change</option>
                  <option value="411">Suite 411 · +180,000 MMK</option>
                  <option value="308">Room 308 · +20,000 MMK</option>
                </SelectInput>
              </Field>
            </div>
          </Panel>

          <div className="space-y-2">
            <Button size="lg" className="w-full" disabled={folioSettled} onClick={() => settle(false)}>
              <KeyRound className="h-4 w-4" />
              {folioSettled ? 'Folio Settled' : 'Check-out'}
            </Button>
            <Button variant="outline" className="w-full" size="lg" onClick={handleEmailReceipt}>
              <Mail className="h-4 w-4" />
              Send receipt by email
            </Button>
          </div>

          <div className="flex items-start gap-2 rounded-xl border border-outline-variant/50 px-4 py-3">
            <Users className="mt-0.5 h-4 w-4 shrink-0 text-secondary" />
            <p className="text-body-sm text-on-surface-variant">
              <span className="font-semibold text-on-surface">{folio.nights}</span> nights ·{' '}
              <CalendarDays className="mr-0.5 inline h-3 w-3" />
              {dateRange(folio.checkIn, folio.checkOut)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}