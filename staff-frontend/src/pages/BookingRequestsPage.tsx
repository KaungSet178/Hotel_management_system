import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  BadgeCheck,
  CheckCheck,
  ChevronRight,
  Clock,
  Download,
  FileText,
  KeyRound,
  Link2,
  Maximize2,
  Printer,
  RefreshCw,
  SendHorizontal,
  ShieldCheck,
  UserCheck,
  UserX,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { mmk } from '@/lib/format';
import { downloadCsv, downloadImage } from '@/lib/download';
import { printSlip } from '@/lib/print';
import { useAppStore } from '@/store';
import { useToast } from '@/components/toast';
import {
  Button,
  CountBadge,
  Field,
  Modal,
  Panel,
  SectionTitle,
  SelectInput,
  StatusChip,
  TextArea,
  TextInput,
} from '@/components/ui';
import type { BookingRequest } from '@/types';

function TierChip({ tier }: { tier: BookingRequest['tier'] }) {
  const styles =
    tier === 'Elite VIP'
      ? 'bg-tertiary-fixed text-on-tertiary-fixed-variant'
      : tier === 'VIP'
        ? 'bg-secondary-container text-on-secondary-container'
        : 'bg-[#e7eeff] text-[#3a475f]';
  return (
    <span className={cn('rounded-full px-2 py-0.5 text-label-sm font-semibold', styles)}>{tier}</span>
  );
}

function SlipBlock({ req }: { req: BookingRequest }) {
  return (
    <div className="rounded-xl border border-[#0e1c32]/15 bg-primary-container px-4 py-3 text-[#ecf1ff]">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link2 className="h-4 w-4 text-[#89f5e7]" />
          <span className="text-label-md font-semibold">KBZPAY</span>
          <span className="text-label-sm text-white/60">{req.slip?.txnRef}</span>
        </div>
        <span className="text-label-md font-bold">{mmk(req.amount)}</span>
      </div>
    </div>
  );
}

function QueueRow({
  req,
  active,
  onToggle,
  onVerify,
  onConfirm,
  onResolve,
  onRejectInfo,
  onViewSlip,
  onRequestProof,
}: {
  req: BookingRequest;
  active: boolean;
  onToggle: () => void;
  onVerify: () => void;
  onConfirm: () => void;
  onResolve: () => void;
  onRejectInfo: () => void;
  onViewSlip: () => void;
  onRequestProof: () => void;
}) {
  const actionsVisible = active;
  return (
    <li
      className={cn(
        'rounded-xl border transition',
        active ? 'border-[#0e1c32]/20 bg-white shadow-sm' : 'border-outline-variant/40 bg-surface-container-lowest',
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <ShieldCheck className="h-5 w-5 shrink-0 text-secondary" />
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2">
            <span className="text-label-md font-semibold text-[#0e1c32]">{req.ref}</span>
            <TierChip tier={req.tier ?? 'Standard'} />
            <span className="flex items-center gap-1 text-label-sm text-on-surface-variant">
              <Clock className="h-3 w-3" />
              {req.ago}
            </span>
          </p>
          <h3 className="mt-0.5 truncate text-body-md font-semibold text-on-surface">
            {req.guestName}
          </h3>
          <p className="truncate text-body-sm text-on-surface-variant">
            {req.room} · {req.stay} · {req.channel}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <StatusChip status={req.state} />
          <ChevronRight className={cn('h-4 w-4 text-on-surface-variant transition-transform', active && 'rotate-90')} />
        </div>
      </button>

      {actionsVisible && (
        <div className="border-t border-outline-variant/40 px-4 pt-3 pb-4">
          <div className="grid grid-cols-2 gap-3 text-body-sm">
            <div>
              <p className="text-label-sm text-on-surface-variant">Phone</p>
              <p className="mt-0.5 font-medium text-on-surface">{req.phone}</p>
            </div>
            {req.nrc && (
              <div>
                <p className="text-label-sm text-on-surface-variant">NRC</p>
                <p className="mt-0.5 font-medium text-on-surface">{req.nrc}</p>
              </div>
            )}
            <div>
              <p className="text-label-sm text-on-surface-variant">Stay</p>
              <p className="mt-0.5 font-medium text-on-surface">
                {req.stay} · {req.nights}N
              </p>
            </div>
            <div>
              <p className="text-label-sm text-on-surface-variant">Amount</p>
              <p className="mt-0.5 font-bold text-on-surface">{mmk(req.amount)}</p>
            </div>
          </div>

          <p className="mt-3 rounded-lg bg-surface-container px-3 py-2 text-body-sm text-on-surface-variant">
            {req.note}
          </p>

          {req.state === 'PROOF_UPLOADED' && req.slip && (
            <button type="button" onClick={onViewSlip} className="mt-3 block w-full">
              <SlipBlock req={req} />
            </button>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {req.state === 'PROOF_UPLOADED' && (
              <>
                <Button variant="ghost" size="sm" onClick={onRequestProof}>
                  <SendHorizontal className="h-3.5 w-3.5" />
                  Request Proof
                </Button>
                <Button variant="outline" size="sm" onClick={onViewSlip}>
                  <FileText className="h-3.5 w-3.5" />
                  View Bank Slip
                </Button>
                <Button size="sm" className="ml-auto" onClick={onVerify}>
                  <BadgeCheck className="h-3.5 w-3.5" />
                  Mark as Verified
                </Button>
              </>
            )}

            {req.state === 'AWAITING_GATEWAY' && (
              <Button size="sm" className="ml-auto" onClick={onVerify}>
                <BadgeCheck className="h-3.5 w-3.5" />
                Re-verify Payment
              </Button>
            )}

            {req.state === 'PAY_AT_HOTEL' && (
              <Button size="sm" className="ml-auto" onClick={onConfirm}>
                <UserCheck className="h-3.5 w-3.5" />
                Confirm & Auto Check-in
              </Button>
            )}

            {req.state === 'ROOM_CONFLICT' && (
              <Button size="sm" className="ml-auto" onClick={onResolve}>
                Resolve Conflict
              </Button>
            )}

            {req.state === 'REJECTED' && (
              <Button variant="danger" size="sm" className="ml-auto" onClick={onRejectInfo}>
                <UserX className="h-3.5 w-3.5" />
                View Rejection Record
              </Button>
            )}
          </div>
        </div>
      )}
    </li>
  );
}

function SlipModal({ req, onClose }: { req: BookingRequest | null; onClose: () => void }) {
  const toast = useToast();
  const slip = req?.slip;

  if (!req || !slip) {
    return null;
  }

  const imageSrc = slip.image || slip.receiptUrl;
  const safeTxnRef = slip.txnRef.replace(/[^a-zA-Z0-9_-]+/g, '-');
  const extension = imageSrc?.startsWith('data:image/png') ? 'png' : 'jpg';

  const handleDownload = (): void => {
    if (!imageSrc) return;
    downloadImage(`${safeTxnRef}.${extension}`, imageSrc);
    toast.success(`Slip ${slip.txnRef} image downloaded`);
  };

  const handleOpenFullSize = (): void => {
    if (!imageSrc) return;
    window.open(imageSrc, '_blank', 'noopener,noreferrer');
  };

  const handlePrint = (): void => {
    printSlip(slip, req.amount, imageSrc);
    toast.info('Opening print preview for the bank slip');
  };

  return (
    <Modal open onClose={onClose} title={`Bank Slip · ${slip.txnRef}`}>
      <div className="space-y-4">
        {imageSrc ? (
          <>
            <figure className="overflow-hidden rounded-xl border border-outline-variant/60 bg-surface-container">
              <button
                type="button"
                onClick={handleOpenFullSize}
                className="block w-full cursor-zoom-in"
                title="Open the uploaded slip full size"
              >
                <img
                  src={imageSrc}
                  alt={`Bank slip uploaded by ${slip.payer}`}
                  className="max-h-[440px] w-full bg-white object-contain"
                />
              </button>
            </figure>
            <p className="flex items-center gap-1.5 text-label-sm text-on-surface-variant">
              <Maximize2 className="h-3.5 w-3.5" />
              Screenshot uploaded by the guest · tap the image to open it full size
            </p>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-outline-variant bg-surface-container px-4 py-10 text-center">
            <FileText className="h-8 w-8 text-on-surface-variant" />
            <p className="text-label-md font-semibold text-on-surface">
              No uploaded screenshot on file
            </p>
            <p className="max-w-xs text-body-sm text-on-surface-variant">
              This request has no payment image attached. Ask the guest to upload their transfer
              screenshot from the booking app.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-2 text-body-sm sm:grid-cols-2">
          <div>
            <p className="text-label-sm text-on-surface-variant">Transaction Ref</p>
            <p className="mt-0.5 font-medium text-on-surface">{slip.txnRef}</p>
          </div>
          <div>
            <p className="text-label-sm text-on-surface-variant">Amount</p>
            <p className="mt-0.5 font-medium text-on-surface">{mmk(slip.amount)}</p>
          </div>
          <div>
            <p className="text-label-sm text-on-surface-variant">Payer</p>
            <p className="mt-0.5 font-medium text-on-surface">{slip.payer}</p>
          </div>
          <div>
            <p className="text-label-sm text-on-surface-variant">Recipient</p>
            <p className="mt-0.5 font-medium text-on-surface">{slip.recipient}</p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-label-sm text-on-surface-variant">Timestamp</p>
            <p className="mt-0.5 font-medium text-on-surface">{slip.timestamp}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {imageSrc && (
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="h-3.5 w-3.5" />
              Download Image
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="h-3.5 w-3.5" />
            Print
          </Button>
        </div>

        <div className="rounded-xl bg-gradient-to-r from-tertiary-fixed to-secondary-container px-4 py-3">
          <p className="text-label-sm font-semibold text-on-tertiary-fixed-variant">
            Optimistic Payment Status
          </p>
          <p className="mt-0.5 flex items-center gap-1.5 text-label-md font-semibold text-on-secondary-container">
            <BadgeCheck className="h-4 w-4" />
            Verified
          </p>
        </div>
      </div>
    </Modal>
  );
}

function VerifyModal({
  req,
  onClose,
  onConfirm,
}: {
  req: BookingRequest | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const [mode, setMode] = useState<'trusted' | 'gateway'>('trusted');
  const [note, setNote] = useState('');

  if (!req) return null;

  return (
    <Modal open={req !== null} onClose={onClose} title="Verify Payment">
      <div className="space-y-4">
        <div className="flex items-end justify-between rounded-xl bg-tertiary-fixed px-4 py-3">
          <div>
            <p className="text-label-sm font-medium text-on-tertiary-fixed-variant">
              Amount to verify
            </p>
            <p className="text-headline-lg font-bold text-on-tertiary-fixed-variant">
              {mmk(req.amount)}
            </p>
          </div>
          <StatusChip status={req.state} />
        </div>

        <p className="text-label-md font-medium text-on-surface">Verify by</p>
        <div className="space-y-2">
          {(
            [
              { id: 'trusted', title: 'Trusted source review', desc: 'Senior desk verification of the KBZPay callback' },
              { id: 'gateway', title: 'Raw gateway data', desc: 'Match txn_ref cross-checked against the KBZPay payload' },
            ] as const
          ).map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setMode(opt.id)}
              className={cn(
                'flex w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition',
                mode === opt.id
                  ? 'border-[#0e1c32] bg-surface-container-low'
                  : 'border-outline-variant/60 bg-surface-container-lowest',
              )}
            >
              <span
                className={cn(
                  'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border',
                  mode === opt.id ? 'border-[#0e1c32]' : 'border-outline',
                )}
              >
                {mode === opt.id && <span className="h-2 w-2 rounded-full bg-[#0e1c32]" />}
              </span>
              <span>
                <span className="block text-label-md font-medium text-on-surface">{opt.title}</span>
                <span className="block text-body-sm text-on-surface-variant">{opt.desc}</span>
              </span>
            </button>
          ))}
        </div>

        <Field label="Internal note (optional)">
          <TextArea
            rows={2}
            placeholder="e.g. Callback received, KBZ reference confirmed"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </Field>

        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onConfirm}>
            <BadgeCheck className="h-4 w-4" />
            Confirm Verification
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function ConfirmStayModal({
  req,
  onClose,
  onConfirm,
}: {
  req: BookingRequest | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!req) return null;
  return (
    <Modal open={req !== null} onClose={onClose} title="Confirm & Auto Check-in">
      <div className="space-y-4">
        <div className="rounded-xl bg-secondary-container/50 px-4 py-3">
          <p className="flex items-center gap-2 text-body-md font-semibold text-on-secondary-container">
            <UserCheck className="h-4 w-4" />
            {req.guestName}
          </p>
          <p className="mt-1 text-body-sm text-on-secondary-container/80">
            {req.room} · {req.stay} · {mmk(req.amount)}
          </p>
        </div>
        <p className="text-body-md text-on-surface-variant">
          Guest will be auto checked-in on arrival and the room released from the reservation queue.
        </p>
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="secondary" onClick={onConfirm}>
            Confirm & Auto Check-in
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function ResolveModal({
  req,
  onClose,
  onResolve,
}: {
  req: BookingRequest | null;
  onClose: () => void;
  onResolve: (choice: string) => void;
}) {
  const [choice, setChoice] = useState('414');
  if (!req) return null;
  return (
    <Modal open={req !== null} onClose={onClose} title="Resolve Room Conflict">
      <div className="space-y-4">
        <div className="flex items-start gap-2 rounded-xl bg-tertiary-fixed px-4 py-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-on-tertiary-fixed-variant" />
          <p className="text-body-md text-on-tertiary-fixed-variant">
            {req.room} is occupied for overlapping dates ({req.stay}).
          </p>
        </div>
        {(
          [
            { id: '414', title: 'Upgrade to Suite 414', desc: 'Executive Ocean Panorama · +180,000 MMK (guest approved)' },
            { id: '304', title: 'Move to Room 304', desc: 'Deluxe Azure Suite · respect original room type' },
          ] as const
        ).map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setChoice(opt.id)}
            className={cn(
              'flex w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition',
              choice === opt.id
                ? 'border-[#0e1c32] bg-surface-container-low'
                : 'border-outline-variant/60 bg-surface-container-lowest',
            )}
          >
            <span
              className={cn(
                'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border',
                choice === opt.id ? 'border-[#0e1c32]' : 'border-outline',
              )}
            >
              {choice === opt.id && <span className="h-2 w-2 rounded-full bg-[#0e1c32]" />}
            </span>
            <span>
              <span className="block text-label-md font-medium text-on-surface">{opt.title}</span>
              <span className="block text-body-sm text-on-surface-variant">{opt.desc}</span>
            </span>
          </button>
        ))}
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => onResolve(choice)}>
            <KeyRound className="h-4 w-4" />
            Assign Room {choice}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function RejectModal({ req, onClose }: { req: BookingRequest | null; onClose: () => void }) {
  if (!req) return null;
  return (
    <Modal open={req !== null} onClose={onClose} title="Rejection Record" tone="danger">
      <div className="space-y-4">
        <div className="flex items-start gap-2 rounded-xl bg-error-container px-4 py-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-on-error-container" />
          <div>
            <p className="text-label-md font-semibold text-on-error-container">Policy breach</p>
            <p className="mt-0.5 text-body-sm text-on-error-container">
              Pay-at-hotel is not eligible more than 24h before arrival.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-2 text-body-sm sm:grid-cols-2">
          <div>
            <p className="text-label-sm text-on-surface-variant">Ticket</p>
            <p className="mt-0.5 font-medium text-on-surface">{req.ref}</p>
          </div>
          <div>
            <p className="text-label-sm text-on-surface-variant">Rejected at</p>
            <p className="mt-0.5 font-medium text-on-surface">18 Oct 2025, 13:41 MMT</p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-label-sm text-on-surface-variant">Reason</p>
            <p className="mt-0.5 font-medium text-on-surface">{req.note}</p>
          </div>
        </div>
      </div>
    </Modal>
  );
}

const AUDIT_ROWS = [
  { txn: 'KBZ:Bank_QR.Deposit_Payment', amount: 759000, status: 'Amount matched' },
  { txn: 'KBZ:Bank_QR.Deposit_Payment', amount: 185000, status: 'Amount matched' },
  { txn: 'KBZ:Wallet.SelfService', amount: 1020000, status: 'Awaiting settlement' },
  { txn: 'KBZ:Bank_QR.Deposit_Payment', amount: 655000, status: 'Amount matched' },
] as const;

export function BookingRequestsPage() {
  const { requests, confirmRequest, setRequestState, refresh } = useAppStore();
  const toast = useToast();

  const [activeRef, setActiveRef] = useState<string | null>('#SF-2025-9510');
  const [filter, setFilter] = useState('PROOF over');
  const [query, setQuery] = useState('');
  const [slipRef, setSlipRef] = useState<string | null>(null);
  const [verifyRef, setVerifyRef] = useState<string | null>(null);
  const [confirmRef, setConfirmRef] = useState<string | null>(null);
  const [conflictRef, setConflictRef] = useState<string | null>(null);
  const [rejectRef, setRejectRef] = useState<string | null>(null);

  const byRef = (ref: string | null): BookingRequest | null =>
    requests.find((r) => r.ref === ref) ?? null;

  const queue = useMemo(() => {
    const q = query.trim().toLowerCase();
    return requests.filter((r) => {
      if (q && !`${r.guestName} ${r.ref} ${r.room}`.toLowerCase().includes(q)) return false;
      switch (filter) {
        case 'PROOF over':
          return r.state !== 'CONFIRMED';
        case 'Proof Uploaded':
          return r.state === 'PROOF_UPLOADED';
        case 'Pay at Hotel':
          return r.state === 'PAY_AT_HOTEL';
        case 'Conflicts':
          return r.state === 'ROOM_CONFLICT';
        case 'Rejected':
          return r.state === 'REJECTED';
        default:
          return true;
      }
    });
  }, [requests, filter, query]);

  const verified = requests.filter((r) => r.state === 'CONFIRMED');

  const handleVerify = (): void => {
    if (verifyRef) {
      confirmRequest(verifyRef);
      toast.success(`Payment verified · ${byRef(verifyRef)?.guestName} · ${byRef(verifyRef)?.ref}`);
      setVerifyRef(null);
    }
  };

  const handleConfirmStay = (): void => {
    if (confirmRef) {
      confirmRequest(confirmRef);
      toast.success(`${byRef(confirmRef)?.guestName} confirmed · auto check-in set`);
      setConfirmRef(null);
    }
  };

  const handleResolve = (choice: string): void => {
    if (conflictRef) {
      toast.success(`Room conflict resolved · ${byRef(conflictRef)?.guestName} assigned ${choice}`);
      confirmRequest(conflictRef);
      setConflictRef(null);
    }
  };

  const handleRequestProof = (ref: string): void => {
    setRequestState(ref, 'AWAITING_GATEWAY');
    toast.info(`New proof requested from ${byRef(ref)?.guestName}`);
  };

  const handleExportQueue = (): void => {
    downloadCsv(
      'booking-request-queue.csv',
      ['Ref', 'Guest', 'Tier', 'Room', 'Stay', 'Amount', 'Channel', 'Status', 'Note'],
      queue.map((r) => [
        r.ref,
        r.guestName,
        r.tier ?? '',
        r.room,
        r.stay,
        r.amount,
        r.channel ?? '',
        r.state,
        r.note,
      ]),
    );
    toast.success(`Exporting ${queue.length} request(s) to CSV`);
  };

  const handleAuditCsv = (): void => {
    downloadCsv(
      'reconciliation-audit.csv',
      ['Transaction', 'Amount', 'Status'],
      AUDIT_ROWS.map((row) => [row.txn, row.amount, row.status]),
    );
    toast.success('Reconciliation audit exported to CSV');
  };

  return (
    <div className="space-y-6">
      <SectionTitle
        eyebrow="StayFlow · Front Desk"
        title="Booking Requests & Payment Verification"
        description="Deposits queue with KBZPay slip verification, pay-at-hotel confirmation and room-conflict resolution."
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await refresh();
                toast.info('Requests queue synced with Supabase.');
              }}
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportQueue}>
              <Download className="h-4 w-4" />
              Export Queue
            </Button>
          </div>
        }
      />

      <div className="flex flex-col gap-6 xl:flex-row xl:items-start">
        <div className="min-w-0 flex-1 space-y-4">
          <Panel
            title="Booking Request Queue"
            subtitle="Sunday, 20 October 2025"
            bodyClassName="space-y-3"
          >
            <div className="flex flex-wrap items-center gap-2">
              <TextInput
                placeholder="Search by guest, ref or room…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-9 max-w-xs flex-1 rounded-full"
              />
              <SelectInput
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="h-9 w-auto rounded-full pr-8"
              >
                <option>All requests</option>
                <option>Proof Uploaded</option>
                <option>Pay at Hotel</option>
                <option>Conflicts</option>
                <option>Rejected</option>
              </SelectInput>
              <CountBadge count={queue.length} className="ml-auto" />
            </div>

            <ul className="space-y-2.5">
              {queue.map((req) => (
                <QueueRow
                  key={req.ref}
                  req={req}
                  active={activeRef === req.ref}
                  onToggle={() => setActiveRef((prev) => (prev === req.ref ? null : req.ref))}
                  onVerify={() => setVerifyRef(req.ref)}
                  onConfirm={() => setConfirmRef(req.ref)}
                  onResolve={() => setConflictRef(req.ref)}
                  onRejectInfo={() => setRejectRef(req.ref)}
                  onViewSlip={() => setSlipRef(req.ref)}
                  onRequestProof={() => handleRequestProof(req.ref)}
                />
              ))}
            </ul>
          </Panel>
        </div>

        <div className="w-full shrink-0 space-y-4 xl:w-[360px]">
          <Panel
            title="Deposits Verified"
            subtitle={`${verified.length} payment(s) cleared today`}
            bodyClassName="space-y-3"
          >
            {verified.map((r) => (
              <div
                key={r.ref}
                className="rounded-xl border border-secondary/20 bg-secondary-container/25 px-3.5 py-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-label-md font-semibold text-[#0e1c32]">{r.ref}</span>
                  <StatusChip status="CONFIRMED" />
                </div>
                <p className="mt-1 text-body-md font-semibold text-on-surface">{r.guestName}</p>
                <p className="text-body-sm text-on-surface-variant">
                  {r.room} · {r.stay} · {r.nights}N
                </p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-label-md font-bold text-on-surface">{mmk(r.amount)}</span>
                  <span className="flex items-center gap-1 text-label-sm text-on-secondary-container">
                    <KeyRound className="h-3.5 w-3.5" />
                    QR pass dispatched
                  </span>
                </div>
              </div>
            ))}
          </Panel>

          <Panel
            title="Reconciliation Audit Trail"
            action={
              <span className="text-label-sm font-medium text-on-surface-variant">
                Reconciled {AUDIT_ROWS.filter((r) => r.status !== 'Awaiting settlement').length} / {AUDIT_ROWS.length}
              </span>
            }
            bodyClassName="p-0"
          >
            <table className="w-full text-left text-body-sm">
              <thead>
                <tr className="border-b border-outline-variant/40 text-label-sm text-on-surface-variant">
                  <th className="px-4 py-2.5 font-medium">Transaction</th>
                  <th className="px-2 py-2.5 font-medium">Amount</th>
                  <th className="px-3 py-2.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30">
                {AUDIT_ROWS.map((row) => (
                  <tr key={`${row.txn}-${row.amount}`} className="align-top">
                    <td className="px-4 py-2.5 font-mono text-label-sm text-on-surface">{row.txn}</td>
                    <td className="px-2 py-2.5 font-semibold text-on-surface">{mmk(row.amount)}</td>
                    <td className="px-3 py-2.5">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 text-label-sm',
                          row.status === 'Amount matched' ? 'text-secondary' : 'text-[#b45309]',
                        )}
                      >
                        {row.status === 'Amount matched' ? (
                          <CheckCheck className="h-3.5 w-3.5" />
                        ) : (
                          <Clock className="h-3.5 w-3.5" />
                        )}
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="border-t border-outline-variant/40 px-4 py-3">
              <Button variant="ghost" size="sm" onClick={handleAuditCsv}>
                <Download className="h-3.5 w-3.5" />
                Download CSV
              </Button>
            </div>
          </Panel>
        </div>
      </div>

      <SlipModal req={byRef(slipRef)} onClose={() => setSlipRef(null)} />
      <VerifyModal req={byRef(verifyRef)} onClose={() => setVerifyRef(null)} onConfirm={handleVerify} />
      <ConfirmStayModal req={byRef(confirmRef)} onClose={() => setConfirmRef(null)} onConfirm={handleConfirmStay} />
      <ResolveModal req={byRef(conflictRef)} onClose={() => setConflictRef(null)} onResolve={handleResolve} />
      <RejectModal req={byRef(rejectRef)} onClose={() => setRejectRef(null)} />
    </div>
  );
}