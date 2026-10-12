import { useMemo } from 'react';
import {
  BadgeCheck,
  Building2,
  Camera,
  KeyRound,
  LogOut,
  QrCode,
  Radar,
  ScanLine,
  Smartphone,
  UserCheck,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { mmk } from '@/lib/format';
import { LOCALE } from '@/data/seed';
import { useAppStore } from '@/store';
import { useToast } from '@/components/toast';
import {
  Avatar,
  Button,
  Card,
  Panel,
  SectionTitle,
  StatChip,
} from '@/components/ui';

const STEPS = [
  { n: '01', title: 'Scan the guest QR', desc: 'Hold the QR to the reader at the door' },
  { n: '02', title: 'Verify ID & payment', desc: 'Confirm NRC and the deposit status' },
  { n: '03', title: 'Confirm check-in', desc: 'Release the room and print the key card' },
];

function QrFrame() {
  return (
    <div className="relative flex h-48 w-48 items-center justify-center rounded-2xl bg-white shadow-[0_20px_60px_-20px_rgba(0,0,0,0.5)]">
      <span className="absolute top-2 left-2 h-5 w-5 rounded-tl-xl border-t-[3px] border-l-[3px] border-[#0e1c32]" />
      <span className="absolute top-2 right-2 h-5 w-5 rounded-tr-xl border-t-[3px] border-r-[3px] border-[#0e1c32]" />
      <span className="absolute bottom-2 left-2 h-5 w-5 rounded-bl-xl border-b-[3px] border-l-[3px] border-[#0e1c32]" />
      <span className="absolute right-2 bottom-2 h-5 w-5 rounded-br-xl border-r-[3px] border-b-[3px] border-[#0e1c32]" />
      <div className="relative">
        <QrCode className="h-32 w-32 text-[#0e1c32]" />
        <span className="absolute top-1/2 left-1/2 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-lg bg-white">
          <Building2 className="h-5 w-5 text-[#0e1c32]" />
        </span>
      </div>
      <span className="absolute right-3 bottom-3 flex h-6 w-6 items-center justify-center rounded-full bg-[#0e1c32]">
        <ScanLine className="h-3.5 w-3.5 text-[#89f5e7]" />
      </span>
    </div>
  );
}

export function QrCheckInPage() {
  const { bookings, checkInBooking } = useAppStore();
  const toast = useToast();

  const expected = useMemo(
    () => bookings.filter((b) => b.checkIn === '2025-10-18' && (b.status === 'CONFIRMED' || b.status === 'PENDING')),
    [bookings],
  );
  const checkedIn = useMemo(
    () => bookings.filter((b) => b.status === 'CHECKED_IN'),
    [bookings],
  );

  const release = (ref: string, guest: string): void => {
    if (checkInBooking(ref)) {
      toast.success(`${guest} scanned & released · ${ref}`);
    } else {
      toast.warning(`${ref} is not ready to release`);
    }
  };

  const scanNext = (): void => {
    const next = expected[0];
    if (!next) {
      toast.warning('No guests waiting in the scan queue');
      return;
    }
    release(next.ref, next.guestName);
  };

  return (
    <div className="space-y-6">
      <SectionTitle
        eyebrow="StayFlow · Front Desk"
        title="QR Check-in"
        description="Contactless, self-service check-in at the door. Guests scan, staff verify, rooms release."
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
            <div className="relative grid grid-cols-1 items-start gap-8 md:grid-cols-[1fr_auto]">
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary-container">
                    <ScanLine className="h-4 w-4 text-on-secondary-container" />
                  </span>
                  <p className="text-label-sm font-semibold tracking-widest text-[#89f5e7] uppercase">
                    Self-service · Room 305
                  </p>
                </div>
                <h2 className="mt-3 text-headline-xl font-semibold tracking-tight">
                  Scan the guest QR at the door
                </h2>
                <p className="mt-2 max-w-md text-body-md text-white/70">
                  Point the reader at the confirmation QR on the guest phone. We verify ID and
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

              <div className="flex flex-col items-center gap-4 md:pr-4">
                <QrFrame />
                <div className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-label-sm text-white/85">
                  <Radar className="h-3.5 w-3.5 text-[#89f5e7]" /> Live reader
                </div>
                <Button
                  variant="primary"
                  className="w-full bg-white text-[#0e1c32] hover:bg-white/90"
                  onClick={scanNext}
                >
                  <ScanLine className="h-4 w-4" />
                  {expected.length > 0
                    ? `Scan to release · ${expected.length} waiting`
                    : 'Scan to release'}
                </Button>
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
              <div className="flex items-center gap-2">
                <span className="hidden items-center gap-1.5 text-label-sm text-white/60 sm:flex">
                  <Camera className="h-3.5 w-3.5" />
                  Input mobile number
                </span>
                <div className="flex items-center gap-1 rounded-full border border-white/15 px-1.5 py-1">
                  {['bg-white', 'bg-white/50', 'bg-white'].map((c, i) => (
                    <span key={c} className={cn('h-2 w-2 rounded-full', c, i === 1 && 'opacity-50')} />
                  ))}
                </div>
              </div>
            </div>
          </div>

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
              value="2"
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
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => release(b.ref, b.guestName)}
                >
                  Release
                </Button>
              </div>
            ))}
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
                <span className="font-semibold text-on-surface">Scan-to-release</span> enabled.
                Room keys are printed at the door, no front-desk queue needed.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}