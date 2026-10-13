import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import {
  BadgeCheck,
  Building2,
  Camera,
  CheckCircle2,
  KeyRound,
  LogOut,
  ScanLine,
  Smartphone,
  AlertTriangle,
  UserCheck,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { mmk, todayIso } from '@/lib/format';
import { LOCALE } from '@/data/seed';
import { useAppStore } from '@/store';
import { useToast } from '@/components/toast';
import { QrScanner } from '@/components/qr-scanner';
import { normalizeRef, parseScan } from '@/lib/qr';
import {
  Avatar,
  Button,
  Card,
  Panel,
  SectionTitle,
  StatChip,
} from '@/components/ui';

const STEPS = [
  { n: '01', title: 'Scan the guest QR', desc: 'Hold the pass to the camera below' },
  { n: '02', title: 'Verify ID & payment', desc: 'Confirm NRC and the deposit status' },
  { n: '03', title: 'Confirm check-in', desc: 'Release the room and print the key card' },
];

interface ScanResult {
  ok: boolean;
  ref: string;
  guest: string;
  room: string;
  note: string;
  at: number;
}

export function QrCheckInPage() {
  const { bookings, checkInBooking, checkoutQueue } = useAppStore();
  const toast = useToast();

  const [manualRef, setManualRef] = useState('');
  const [lastScan, setLastScan] = useState<ScanResult | null>(null);

  const today = todayIso();
  const expected = useMemo(
    () =>
      bookings.filter(
        (b) => b.checkIn === today && b.status === 'CONFIRMED',
      ),
    [bookings, today],
  );
  const checkedIn = useMemo(
    () => bookings.filter((b) => b.status === 'CHECKED_IN'),
    [bookings],
  );
  const departures = useMemo(
    () =>
      bookings.filter(
        (b) => b.checkOut === today && b.status === 'CHECKED_IN',
      ),
    [bookings, today],
  );
  const departuresTodayCount =
    checkoutQueue?.length !== undefined ? checkoutQueue.length : departures.length;

  const handleQrText = (raw: string): void => {
    const parsed = parseScan(raw);
    if (!parsed) {
      toast.warning('Unrecognised QR code — not a StayFlow check-in pass.');
      setLastScan({
        ok: false,
        ref: '—',
        guest: 'Unrecognised code',
        room: '',
        note: 'The QR did not carry a StayFlow booking reference.',
        at: Date.now(),
      });
      return;
    }

    const norm = normalizeRef(parsed.ref);
    const match = bookings.find((b) => normalizeRef(b.ref) === norm);

    if (!match) {
      toast.warning(`No reservation matches ${parsed.ref}.`);
      setLastScan({
        ok: false,
        ref: parsed.ref,
        guest: 'No matching reservation',
        room: '',
        note: 'Nothing in the rack matches this reference.',
        at: Date.now(),
      });
      return;
    }

    if (match.status === 'CHECKED_IN') {
      toast.info(`${match.guestName} is already checked in.`);
      setLastScan({
        ok: true,
        ref: match.ref,
        guest: match.guestName,
        room: match.room ?? '—',
        note: 'Guest is already in-house.',
        at: Date.now(),
      });
      return;
    }

    if (match.status === 'PENDING') {
      toast.warning(`${match.ref} is awaiting payment approval. Please verify payment slip first.`);
      setLastScan({
        ok: false,
        ref: match.ref,
        guest: match.guestName,
        room: match.room ?? '—',
        note: 'Reservation is awaiting payment verification and staff approval.',
        at: Date.now(),
      });
      return;
    }

    if (match.status !== 'CONFIRMED') {
      toast.warning(`${match.ref} cannot be released (${match.status}).`);
      setLastScan({
        ok: false,
        ref: match.ref,
        guest: match.guestName,
        room: match.room ?? '—',
        note: `Reservation status is ${match.status}.`,
        at: Date.now(),
      });
      return;
    }

    if (checkInBooking(match.ref)) {
      toast.success(`${match.guestName} released · ${match.ref} · ${match.room}`);
      setLastScan({
        ok: true,
        ref: match.ref,
        guest: match.guestName,
        room: match.room ?? '—',
        note: `Released via QR · ${mmk(match.amount)}`,
        at: Date.now(),
      });
    } else {
      toast.warning(`${match.ref} is not ready to release.`);
    }
  };

  const release = (ref: string, guest: string): void => {
    const target = bookings.find((b) => b.ref === ref);
    if (target?.status === 'PENDING') {
      toast.warning(`${ref} is awaiting payment approval. Please verify payment slip first.`);
      return;
    }
    if (checkInBooking(ref)) {
      toast.success(`${guest} released · ${ref}`);
    } else {
      toast.warning(`${ref} is not ready to release`);
    }
  };

  const submitManual = (e: FormEvent): void => {
    e.preventDefault();
    const value = manualRef.trim();
    if (!value) return;
    handleQrText(value.startsWith('{') || value.startsWith('#') ? value : `#${value}`);
    setManualRef('');
  };

  return (
    <div className="space-y-6">
      <SectionTitle
        eyebrow="StayFlow · Front Desk"
        title="QR Check-in"
        description="Contactless, self-service check-in. Guests show their QR pass, the camera releases the room."
        action={
          <StatChip
            label="Expected today"
            value={String(expected.length)}
            accent="primary"
            icon={<Users className="h-4 w-4" />}
          />
        }
      />

      <div className="flex flex-col gap-6 xl:flex-row">
        <div className="min-w-0 flex-1 space-y-4">
          <div className="relative overflow-hidden rounded-2xl bg-primary-container p-6 text-[#ecf1ff] shadow-[0_20px_60px_-28px_rgba(14,28,50,0.9)] sm:p-8">
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  'radial-gradient(circle at 82% 12%, rgba(137,245,231,0.22), transparent 42%), radial-gradient(circle at 8% 88%, rgba(134,242,228,0.14), transparent 45%)',
              }}
            />
            <div className="relative grid grid-cols-1 items-start gap-8 md:grid-cols-[1fr_300px]">
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary-container">
                    <ScanLine className="h-4 w-4 text-on-secondary-container" />
                  </span>
                  <p className="text-label-sm font-semibold tracking-widest text-[#89f5e7] uppercase">
                    Live camera · Front desk
                  </p>
                </div>
                <h2 className="mt-3 text-headline-xl font-semibold tracking-tight">
                  Scan the guest QR pass
                </h2>
                <p className="mt-2 max-w-md text-body-md text-white/70">
                  Point the guest's check-in QR at the camera. We match the reference, verify ID and
                  payment, then release the room automatically.
                </p>

                <ol className="mt-6 space-y-3">
                  {STEPS.map((step) => (
                    <li key={step.n} className="flex items-center gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-label-sm font-bold text-[#0e1c32]">
                        {step.n}
                      </span>
                      <div>
                        <p className="text-label-md font-semibold text-white">{step.title}</p>
                        <p className="text-label-sm text-white/60">{step.desc}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="flex flex-col gap-3">
                <QrScanner onDecode={handleQrText} />
                <p className="text-center text-label-sm text-white/55">
                  Room releases automatically when a valid pass is read.
                </p>
              </div>
            </div>

            <div className="relative mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10">
                  <Building2 className="h-4 w-4 text-[#89f5e7]" />
                </span>
                <p className="text-label-md font-semibold text-white">
                  StayFlow <span className="font-normal text-white/50">· {LOCALE.property}</span>
                </p>
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-label-sm text-white/60">
                  v1.2.4
                </span>
              </div>
              <span className="flex items-center gap-1.5 text-label-sm text-white/60">
                <Camera className="h-3.5 w-3.5" />
                Camera scanning · Chromium browsers
              </span>
            </div>
          </div>

          <Card className="p-4 sm:p-5">
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_320px]">
              <form onSubmit={submitManual} className="space-y-2.5">
                <label className="block text-label-sm font-semibold text-on-surface">
                  Manual check-in
                </label>
                <p className="text-body-sm text-on-surface-variant">
                  Camera refused or unavailable? Enter the guest's booking reference (e.g.{' '}
                  <span className="font-semibold text-on-surface">#SF-9481</span>) to release the
                  room.
                </p>
                <div className="flex gap-2">
                  <input
                    value={manualRef}
                    onChange={(e) => setManualRef(e.target.value)}
                    placeholder="#SF-9481 or SF-89241-K7"
                    className="h-10 flex-1 rounded-xl border border-outline-variant/60 bg-surface-container-low px-3 text-body-sm font-semibold text-on-surface outline-none focus:border-primary-container focus:bg-white"
                  />
                  <Button type="submit" variant="primary" size="md">
                    <ScanLine className="h-4 w-4" />
                    Release
                  </Button>
                </div>
              </form>

              <div
                className={cn(
                  'rounded-xl border p-4',
                  !lastScan && 'border-outline-variant/50 bg-surface-container-low/50',
                  lastScan?.ok && 'border-secondary/30 bg-secondary-container/25',
                  lastScan && !lastScan.ok && 'border-error/30 bg-error-container/40',
                )}
              >
                <div className="flex items-center gap-2">
                  {!lastScan && <ScanLine className="h-4 w-4 text-on-surface-variant" />}
                  {lastScan?.ok && <CheckCircle2 className="h-4 w-4 text-on-secondary-container" />}
                  {lastScan && !lastScan.ok && (
                    <AlertTriangle className="h-4 w-4 text-on-error-container" />
                  )}
                  <p className="text-label-sm font-bold text-on-surface">
                    {lastScan ? (lastScan.ok ? 'Check-in confirmed' : 'Scan not accepted') : 'Last scan'}
                  </p>
                </div>
                {lastScan ? (
                  <div className="mt-2 space-y-0.5">
                    <p className="text-body-md font-semibold text-on-surface">{lastScan.guest}</p>
                    <p className="text-label-sm text-on-surface-variant">
                      {lastScan.ref}
                      {lastScan.room ? ` · ${lastScan.room}` : ''}
                    </p>
                    <p className="text-label-sm text-on-surface-variant">{lastScan.note}</p>
                  </div>
                ) : (
                  <p className="mt-2 text-body-sm text-on-surface-variant">
                    No pass scanned yet this session.
                  </p>
                )}
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatChip
              label="Expected today"
              value={String(expected.length)}
              accent="primary"
              icon={<Smartphone className="h-4 w-4" />}
            />
            <StatChip
              label="Checked in"
              value={String(checkedIn.length)}
              accent="secondary"
              icon={<UserCheck className="h-4 w-4" />}
            />
            <StatChip
              label="Departures today"
              value={String(departuresTodayCount)}
              accent="amber"
              icon={<LogOut className="h-4 w-4" />}
            />
          </div>
        </div>

        <div className="w-full shrink-0 space-y-4 xl:w-[340px]">
          <Panel
            title="Expected Today"
            subtitle={`${expected.length} QR guests to release`}
            bodyClassName="space-y-2.5"
          >
            {expected.map((b) => (
              <div
                key={b.ref}
                className="flex items-center gap-3 rounded-xl border border-outline-variant/50 bg-surface-container-lowest px-3 py-2.5"
              >
                <Avatar name={b.guestName} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-label-md font-semibold text-on-surface">{b.guestName}</p>
                  <p className="truncate text-label-sm text-on-surface-variant">
                    {b.ref} · {b.room}
                  </p>
                </div>
                <Button variant="secondary" size="sm" onClick={() => release(b.ref, b.guestName)}>
                  Release
                </Button>
              </div>
            ))}
            {expected.length === 0 && (
              <p className="py-2 text-center text-body-sm text-on-surface-variant">
                No QR guests expected today.
              </p>
            )}
          </Panel>

          <Panel
            title="Checked In"
            subtitle={`${checkedIn.length} guests now in-house`}
            bodyClassName="space-y-2.5"
          >
            {checkedIn.map((b) => (
              <div
                key={b.ref}
                className="flex items-center gap-3 rounded-xl border border-secondary/20 bg-secondary-container/25 px-3 py-2.5"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary-container">
                  <KeyRound className="h-4 w-4 text-on-secondary-container" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-label-md font-semibold text-on-surface">{b.guestName}</p>
                  <p className="truncate text-label-sm text-on-surface-variant">
                    {b.ref} · {b.room} · {mmk(b.amount)}
                  </p>
                </div>
              </div>
            ))}
            {checkedIn.length === 0 && (
              <p className="py-2 text-center text-body-sm text-on-surface-variant">
                No guests checked in yet.
              </p>
            )}
          </Panel>

          <Card className="p-4">
            <div className="flex items-start gap-2">
              <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-secondary" />
              <p className="text-body-sm text-on-surface-variant">
                <span className="font-semibold text-on-surface">Scan-to-release</span> enabled. Room
                keys are printed at the door, no front-desk queue needed.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
