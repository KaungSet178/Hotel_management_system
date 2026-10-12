import { useMemo, useState } from 'react';
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
  Search,
  Users,
  X,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { dateRange, formatCurrency, mmk, shortDate, USD_RATE } from '@/lib/format';
import type { DisplayCurrency } from '@/lib/format';
import { downloadText } from '@/lib/download';
import { printFolioReceipt, printPaymentReceipt } from '@/lib/print';
import { useAppStore } from '@/store';
import { useToast } from '@/components/toast';
import {
  Avatar,
  Button,
  EmptyState,
  Field,
  Panel,
  SectionTitle,
  SelectInput,
  StatusChip,
  TextInput,
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

/** Amount owed at check-out = incidentials + taxes (room charge already settled). */
function folioBalance(f: Folio): number {
  return f.incidentals + f.taxes;
}

export function CheckOutPage() {
  const {
    folio,
    folioSettled,
    settleFolio,
    checkoutQueue,
    activeRoomId,
    selectCheckoutRoom,
    removeCheckoutEntry,
  } = useAppStore();
  const toast = useToast();

  const [currency, setCurrency] = useState<DisplayCurrency>('MMK');
  const [queueQuery, setQueueQuery] = useState('');

  const filteredQueue = useMemo(() => {
    const needle = queueQuery.trim().toLowerCase();
    if (!needle) return checkoutQueue;
    return checkoutQueue.filter((entry) =>
      `${entry.folio.room} ${entry.folio.guestName} ${entry.bookingRef}`
        .toLowerCase()
        .includes(needle),
    );
  }, [checkoutQueue, queueQuery]);

  const total = folio.roomCharges + folio.incidentals + folio.taxes;
  const outstanding = total - folio.roomCharges;

  const handlePrintFolio = (): void => {
    printFolioReceipt({ folio, total, outstanding, settled: folioSettled });
    toast.info('Opening folio print preview');
  };

  const handleCollect = (): void => {
    if (folioSettled) return;
    settleFolio();
    printPaymentReceipt({
      guestName: folio.guestName,
      room: folio.room,
      amount: outstanding,
      amountLabel: formatCurrency(outstanding, currency),
      method: currency,
      reference: `RCT-${folio.room}-${Date.now().toString().slice(-6)}`,
      timestamp: new Date().toLocaleString(),
    });
    toast.success(
      `Check-out complete · ${folio.guestName} · balance ${formatCurrency(outstanding, currency)} settled`,
    );
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

      {activeRoomId ? (
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
                    <StatusChip status={folioSettled ? 'PAID' : 'PENDING'} />
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
                    <StatusChip status={folioSettled ? 'PAID' : 'PENDING'} />
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
                {formatCurrency(outstanding, currency)}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Field label="Currency">
                  <SelectInput
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value as DisplayCurrency)}
                    className="h-9 w-28 border-white/20 bg-white/10 text-white [&>option]:text-on-surface"
                  >
                    <option value="MMK">MMK</option>
                    <option value="USD">USD</option>
                  </SelectInput>
                </Field>
                <p className="text-label-sm text-white/55">
                  {currency === 'USD'
                    ? `1 USD = ${USD_RATE.toLocaleString('en-US')} MMK`
                    : 'Rates updated 09:00 MMT'}
                </p>
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
                  className="bg-white! text-[#0e1c32]! shadow-md hover:bg-[#e6ecf7]!"
                  disabled={folioSettled}
                  onClick={handleCollect}
                  title="Charge the full outstanding balance, close the folio and issue a receipt"
                >
                  <CreditCard className="h-4 w-4" />
                  Collect Payment
                </Button>
              </div>
              <p className="mt-3 text-label-sm leading-relaxed text-white/60">
                Full settlement required at check-out — the guest must clear the entire{' '}
                {formatCurrency(outstanding, currency)} balance before the room is released.
              </p>
            </div>
          </Panel>
        </div>

        <div className="w-full shrink-0 space-y-4">
          <Panel
            title="Due for Check-out"
            subtitle={`${checkoutQueue.length} room${checkoutQueue.length === 1 ? '' : 's'} in house`}
            bodyClassName="p-0"
          >
            <div className="border-b border-outline-variant/40 p-3">
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-[#75777e]" />
                <TextInput
                  value={queueQuery}
                  onChange={(e) => setQueueQuery(e.target.value)}
                  placeholder="Search room, guest or booking ref…"
                  className="h-9 w-full rounded-full pl-9"
                />
              </div>
            </div>

            {filteredQueue.length === 0 ? (
              <p className="px-4 py-6 text-center text-body-sm text-on-surface-variant">
                {checkoutQueue.length === 0
                  ? 'All rooms are checked out.'
                  : 'No rooms match this search.'}
              </p>
            ) : (
              <ul className="divide-y divide-outline-variant/40">
                {filteredQueue.map((entry) => {
                  const isActive = entry.roomId === activeRoomId;
                  return (
                    <li
                      key={entry.roomId}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2.5',
                        isActive && 'bg-secondary-container/40',
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => selectCheckoutRoom(entry.roomId)}
                        className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-lg px-1.5 py-1 text-left transition hover:bg-surface-container-low"
                      >
                        <span
                          className={cn(
                            'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-label-sm font-bold',
                            isActive
                              ? 'bg-primary-container text-white'
                              : 'bg-surface-container text-on-surface-variant',
                          )}
                        >
                          {entry.folio.room.replace(/[^0-9]/g, '')}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-label-md font-semibold text-on-surface">
                            {entry.folio.guestName}
                          </p>
                          <p className="truncate text-label-sm text-on-surface-variant">
                            {entry.bookingRef} · {entry.folio.nights}N
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-label-sm font-semibold text-on-surface">
                            {mmk(folioBalance(entry.folio))}
                          </p>
                          {entry.settled ? (
                            <span className="text-label-xs font-semibold text-secondary">
                              Settled
                            </span>
                          ) : (
                            <span className="text-label-xs font-semibold text-[#b45309]">
                              Due
                            </span>
                          )}
                        </div>
                      </button>
                      {entry.settled && (
                        <button
                          type="button"
                          onClick={() => removeCheckoutEntry(entry.roomId)}
                          title="Remove from check-out list"
                          className="flex h-8 shrink-0 cursor-pointer items-center gap-1 rounded-lg border border-error/30 px-2 text-label-sm font-semibold text-error transition hover:bg-error-container/40"
                        >
                          <X className="h-3.5 w-3.5" />
                          Remove
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>

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
                <p className="font-semibold text-on-surface">{shortDate(folio.checkIn)}</p>
              </div>
              <div>
                <p className="text-label-sm text-on-surface-variant">Departs</p>
                <p className="font-semibold text-on-surface">{shortDate(folio.checkOut)}</p>
              </div>
            </div>
          </Panel>

          <div className="space-y-2">
            <Button size="lg" className="w-full" disabled={folioSettled} onClick={handleCollect}>
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
      ) : (
        <EmptyState
          title="All rooms are checked out"
          hint="No in-house rooms are awaiting settlement right now."
        />
      )}
    </div>
  );
}