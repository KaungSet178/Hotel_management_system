import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  BadgeCheck,
  ChevronRight,
  Clock,
  Download,
  FileText,
  Link2,
  Maximize2,
  Printer,
  RefreshCw,
  SendHorizontal,
  ShieldCheck,
  UserX,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { mmk, formatMyanmarFullDate } from '@/lib/format';
import { downloadCsv, downloadImage } from '@/lib/download';
import { printSlip } from '@/lib/print';
import { useAppStore } from '@/store';
import { useToast } from '@/components/toast';
import {
  Button,
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
  const imageSrc = req.slip?.image || req.slip?.receiptUrl || req.slip?.dataUrl;
  return (
    <div className="group rounded-xl border border-[#0e1c32]/15 bg-primary-container px-4 py-3 text-[#ecf1ff] transition-all hover:border-[#89f5e7]/50 hover:bg-[#142642]">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {imageSrc ? (
            <img
              src={imageSrc}
              alt="Payment receipt thumbnail"
              className="h-10 w-10 shrink-0 rounded-lg border border-white/20 object-cover bg-white"
            />
          ) : (
            <Link2 className="h-4 w-4 text-[#89f5e7] shrink-0" />
          )}
          <div className="min-w-0 text-left">
            <div className="flex items-center gap-2">
              <span className="text-label-md font-semibold text-[#89f5e7]">
                {req.slip?.txnRef?.includes('WAVE') ? 'WAVEPAY' : req.slip?.txnRef?.includes('CB') ? 'CB PAY' : req.channel || 'KBZPAY'}
              </span>
              <span className="truncate text-label-xs text-white/70">{req.slip?.txnRef}</span>
            </div>
            {req.slip?.fileName && (
              <p className="truncate text-label-xs text-white/50">{req.slip.fileName}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-label-md font-bold">{mmk(req.amount)}</span>
          <span className="rounded-lg bg-white/10 px-2.5 py-1 text-label-xs font-medium text-white/90 group-hover:bg-[#89f5e7] group-hover:text-[#0e1c32]">
            View Slip ↗
          </span>
        </div>
      </div>
    </div>
  );
}

function QueueRow({
  req,
  active,
  onToggle,
  onVerify,
  onReject,
  onRejectInfo,
  onViewSlip,
  onRequestProof,
}: {
  req: BookingRequest;
  active: boolean;
  onToggle: () => void;
  onVerify: () => void;
  onReject: () => void;
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

          {req.slip && (
            <button type="button" onClick={onViewSlip} className="mt-3 block w-full">
              <SlipBlock req={req} />
            </button>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {req.slip && (
              <Button variant="outline" size="sm" onClick={onViewSlip}>
                <FileText className="h-3.5 w-3.5" />
                View Bank Slip
              </Button>
            )}

            {req.state === 'PROOF_UPLOADED' && (
              <>
                <Button variant="ghost" size="sm" onClick={onRequestProof}>
                  <SendHorizontal className="h-3.5 w-3.5" />
                  Request Re-upload
                </Button>

                <div className="ml-auto flex items-center gap-2">
                  <Button variant="danger" size="sm" onClick={onReject}>
                    <UserX className="h-3.5 w-3.5" />
                    Reject
                  </Button>
                  <Button size="sm" onClick={onVerify}>
                    <BadgeCheck className="h-3.5 w-3.5" />
                    Mark as Verified
                  </Button>
                </div>
              </>
            )}

            {req.state === 'AWAITING_GATEWAY' && (
              <div className="ml-auto flex items-center gap-2">
                <Button variant="danger" size="sm" onClick={onReject}>
                  <UserX className="h-3.5 w-3.5" />
                  Reject
                </Button>
                <Button size="sm" onClick={onVerify}>
                  <BadgeCheck className="h-3.5 w-3.5" />
                  Re-verify Payment
                </Button>
              </div>
            )}

            {req.state === 'REJECTED' && (
              <div className="ml-auto flex items-center gap-2">
                <span className="rounded-full bg-rose-500/10 border border-rose-500/30 px-2.5 py-0.5 text-label-xs font-semibold text-rose-700">
                  Declined
                </span>
                <Button variant="outline" size="sm" onClick={onRejectInfo}>
                  <UserX className="h-3.5 w-3.5" />
                  View Rejection Record
                </Button>
              </div>
            )}

            {req.state === 'CONFIRMED' && (
              <div className="ml-auto flex items-center gap-2">
                <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 text-label-xs font-semibold text-emerald-700">
                  Verified & Confirmed
                </span>
              </div>
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

  const imageSrc = slip.image || slip.receiptUrl || slip.dataUrl;
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
          <div>
            <p className="text-label-sm text-on-surface-variant">Timestamp</p>
            <p className="mt-0.5 font-medium text-on-surface">{slip.timestamp}</p>
          </div>
          {slip.fileName && (
            <div>
              <p className="text-label-sm text-on-surface-variant">Attached File</p>
              <p className="mt-0.5 font-mono text-xs font-medium text-on-surface truncate">{slip.fileName}</p>
            </div>
          )}
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
              { id: 'trusted', title: 'Trusted source review', desc: 'Senior desk verification of the payment callback / slip' },
              { id: 'gateway', title: 'Raw gateway data', desc: 'Match txn_ref cross-checked against the payment transaction payload' },
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
            placeholder="e.g. Callback received, transaction reference confirmed"
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

/**
 * Interactive Modal for rejecting an active booking request
 */
function RejectActionModal({
  req,
  onClose,
  onConfirmReject,
}: {
  req: BookingRequest | null;
  onClose: () => void;
  onConfirmReject: (ref: string, reason: string) => void;
}) {
  const [presetReason, setPresetReason] = useState('Payment slip unreadable or blurry');
  const [customNote, setCustomNote] = useState('');

  if (!req) return null;

  const REASONS = [
    'Payment slip unreadable or blurry',
    'Transfer amount does not match booking total',
    'Invalid or duplicate transaction reference',
    'Sender account mismatch / unverified payer',
    'Slip timestamp expired or invalid',
    'Room unavailable / Overbooking',
    'Other reason (see note)',
  ];

  const handleConfirm = () => {
    const finalReason = customNote.trim()
      ? `${presetReason}: ${customNote.trim()}`
      : presetReason;
    onConfirmReject(req.ref, finalReason);
  };

  return (
    <Modal open={req !== null} onClose={onClose} title={`Reject Booking ${req.ref}`} tone="danger">
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-xl bg-rose-500/10 border border-rose-500/20 p-3.5 text-rose-900 dark:text-rose-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
          <div className="text-body-sm">
            <p className="font-semibold">Confirm Rejection</p>
            <p className="mt-0.5 text-rose-800/90 dark:text-rose-300">
              Rejecting this request will mark the booking as cancelled and release any tentative room holds. The guest will receive an immediate notification.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-outline-variant/50 bg-surface-container-low/50 p-3 text-body-sm">
          <div className="grid grid-cols-2 gap-2 text-on-surface">
            <div>
              <span className="text-label-xs text-on-surface-variant block">Guest</span>
              <span className="font-semibold">{req.guestName}</span>
            </div>
            <div>
              <span className="text-label-xs text-on-surface-variant block">Amount</span>
              <span className="font-bold">{mmk(req.amount)}</span>
            </div>
            <div>
              <span className="text-label-xs text-on-surface-variant block">Stay</span>
              <span>{req.stay}</span>
            </div>
            <div>
              <span className="text-label-xs text-on-surface-variant block">Channel</span>
              <span>{req.channel}</span>
            </div>
          </div>
        </div>

        <Field label="Rejection Reason">
          <SelectInput
            value={presetReason}
            onChange={(e) => setPresetReason(e.target.value)}
          >
            {REASONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </SelectInput>
        </Field>

        <Field label="Additional Staff Note (Optional)">
          <TextArea
            rows={2}
            value={customNote}
            onChange={(e) => setCustomNote(e.target.value)}
            placeholder="Add specific notes for audit records and customer notification..."
          />
        </Field>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-outline-variant/40">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleConfirm}>
            <UserX className="h-4 w-4" />
            Confirm Rejection
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/**
 * Read-only modal displaying historical rejection details
 */
function RejectRecordModal({ req, onClose }: { req: BookingRequest | null; onClose: () => void }) {
  if (!req) return null;
  return (
    <Modal open={req !== null} onClose={onClose} title="Rejection Record" tone="danger">
      <div className="space-y-4">
        <div className="flex items-start gap-2 rounded-xl bg-error-container px-4 py-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-on-error-container" />
          <div>
            <p className="text-label-md font-semibold text-on-error-container">Booking Declined</p>
            <p className="mt-0.5 text-body-sm text-on-error-container">
              This reservation was declined by front desk staff.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-2 text-body-sm sm:grid-cols-2">
          <div>
            <p className="text-label-sm text-on-surface-variant">Ticket / Ref</p>
            <p className="mt-0.5 font-medium text-on-surface">{req.ref}</p>
          </div>
          <div>
            <p className="text-label-sm text-on-surface-variant">Guest</p>
            <p className="mt-0.5 font-medium text-on-surface">{req.guestName}</p>
          </div>
          <div>
            <p className="text-label-sm text-on-surface-variant">Stay</p>
            <p className="mt-0.5 font-medium text-on-surface">{req.stay}</p>
          </div>
          <div>
            <p className="text-label-sm text-on-surface-variant">Amount</p>
            <p className="mt-0.5 font-medium text-on-surface">{mmk(req.amount)}</p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-label-sm text-on-surface-variant">Recorded Reason</p>
            <p className="mt-0.5 font-medium text-on-surface">{req.note}</p>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export type QueueFilter = 'All' | 'Proof Uploaded' | 'Rejected';

export function BookingRequestsPage() {
  const { requests, confirmRequest, rejectRequest, setRequestState, refresh } = useAppStore();
  const toast = useToast();

  const [activeRef, setActiveRef] = useState<string | null>(null);
  const [filter, setFilter] = useState<QueueFilter>('All');
  const [query, setQuery] = useState('');
  const [slipRef, setSlipRef] = useState<string | null>(null);
  const [verifyRef, setVerifyRef] = useState<string | null>(null);
  const [rejectActionRef, setRejectActionRef] = useState<string | null>(null);
  const [rejectRecordRef, setRejectRecordRef] = useState<string | null>(null);

  const byRef = (ref: string | null): BookingRequest | null =>
    requests.find((r) => r.ref === ref) ?? null;

  // Exact 3 filters requested by the user: All, Proof Uploaded, Rejected
  const counts = useMemo(() => {
    return {
      all: requests.length,
      proofUploaded: requests.filter((r) => r.state === 'PROOF_UPLOADED').length,
      rejected: requests.filter((r) => r.state === 'REJECTED').length,
    };
  }, [requests]);

  const queue = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = requests.filter((r) => {
      if (q && !`${r.guestName} ${r.ref} ${r.room}`.toLowerCase().includes(q)) return false;
      switch (filter) {
        case 'Proof Uploaded':
          return r.state === 'PROOF_UPLOADED';
        case 'Rejected':
          return r.state === 'REJECTED';
        case 'All':
        default:
          return true;
      }
    });

    return [...filtered].sort((a, b) => {
      const getReqScore = (r: BookingRequest): number => {
        if (r.state === 'PROOF_UPLOADED') return 0; // Uploaded slip at the very top
        if (r.state === 'AWAITING_GATEWAY') return 1;
        if (r.state === 'CONFIRMED') return 2;
        return 3; // REJECTED at the bottom
      };
      return getReqScore(a) - getReqScore(b);
    });
  }, [requests, filter, query]);

  const handleVerify = (): void => {
    if (verifyRef) {
      confirmRequest(verifyRef);
      toast.success(`Payment verified · ${byRef(verifyRef)?.guestName} · ${byRef(verifyRef)?.ref}`);
      setVerifyRef(null);
    }
  };

  const handleConfirmReject = (ref: string, reason: string): void => {
    rejectRequest(ref, reason);
    toast.warning(`Reservation ${ref} rejected · ${reason}`);
    setRejectActionRef(null);
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

  return (
    <div className="space-y-6">
      <SectionTitle
        eyebrow="StayEase · Front Desk"
        title="Booking Requests & Payment Verification"
        description="Payment verification queue for online bookings with digital wallet & bank transfer slip verification."
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

      <div className="space-y-4">
        <Panel
          title="Booking Request Queue"
          subtitle={formatMyanmarFullDate()}
          bodyClassName="space-y-4"
        >
            {/* Filter Tabs: All, Proof Uploaded, Rejected */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant/40 pb-3">
              <div className="flex flex-wrap items-center gap-1.5">
                {(
                  [
                    { id: 'All', label: 'All Requests', count: counts.all },
                    { id: 'Proof Uploaded', label: 'Proof Uploaded', count: counts.proofUploaded },
                    { id: 'Rejected', label: 'Rejected', count: counts.rejected },
                  ] as const
                ).map((tab) => {
                  const active = filter === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setFilter(tab.id)}
                      className={cn(
                        'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-label-sm font-semibold transition cursor-pointer',
                        active
                          ? 'bg-[#0e1c32] text-white shadow-xs'
                          : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container hover:text-on-surface',
                      )}
                    >
                      <span>{tab.label}</span>
                      <span
                        className={cn(
                          'rounded-full px-1.5 py-0.2 text-[11px] font-bold',
                          active
                            ? 'bg-white/20 text-white'
                            : 'bg-outline-variant/50 text-on-surface-variant',
                        )}
                      >
                        {tab.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2">
                <TextInput
                  placeholder="Search guest, ref or room…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="h-9 w-52 sm:w-64 rounded-full"
                />
                <SelectInput
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as QueueFilter)}
                  className="h-9 w-auto rounded-full pr-8 text-label-sm"
                >
                  <option value="All">All ({counts.all})</option>
                  <option value="Proof Uploaded">Proof Uploaded ({counts.proofUploaded})</option>
                  <option value="Rejected">Rejected ({counts.rejected})</option>
                </SelectInput>
              </div>
            </div>

            {queue.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-outline-variant/60 py-12 text-center">
                <ShieldCheck className="h-10 w-10 text-on-surface-variant/40" />
                <p className="mt-2 text-label-md font-semibold text-on-surface">
                  No requests in this view
                </p>
                <p className="text-body-sm text-on-surface-variant">
                  {filter === 'Proof Uploaded'
                    ? 'All payment slips have been verified!'
                    : filter === 'Rejected'
                    ? 'There are no rejected bookings.'
                    : 'The request queue is empty.'}
                </p>
              </div>
            ) : (
              <ul className="space-y-2.5">
                {queue.map((req) => (
                  <QueueRow
                    key={req.ref}
                    req={req}
                    active={activeRef === req.ref}
                    onToggle={() => setActiveRef((prev) => (prev === req.ref ? null : req.ref))}
                    onVerify={() => setVerifyRef(req.ref)}
                    onReject={() => setRejectActionRef(req.ref)}
                    onRejectInfo={() => setRejectRecordRef(req.ref)}
                    onViewSlip={() => setSlipRef(req.ref)}
                    onRequestProof={() => handleRequestProof(req.ref)}
                  />
                ))}
              </ul>
            )}
          </Panel>
        </div>

      <SlipModal req={byRef(slipRef)} onClose={() => setSlipRef(null)} />
      <VerifyModal req={byRef(verifyRef)} onClose={() => setVerifyRef(null)} onConfirm={handleVerify} />
      <RejectActionModal
        req={byRef(rejectActionRef)}
        onClose={() => setRejectActionRef(null)}
        onConfirmReject={handleConfirmReject}
      />
      <RejectRecordModal req={byRef(rejectRecordRef)} onClose={() => setRejectRecordRef(null)} />
    </div>
  );
}