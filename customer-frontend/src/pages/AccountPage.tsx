import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  CalendarClock,
  Check,
  LogOut,
  Mail,
  Smartphone,
  Ticket,
  UserRound,
} from 'lucide-react';
import { Container, SectionHeading } from '@/components/ui/section';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button, buttonStyles } from '@/components/ui/button';
import { Field, Input, Select } from '@/components/ui/form';
import { EmptyState, LoadingState } from '@/components/ui/states';
import { BookingStatusBadge, PaymentStatusBadge } from '@/components/ui/status';
import { useToast } from '@/components/ui/toast';
import { InitialsAvatar } from '@/components/account/InitialsAvatar';
import { GoogleIcon } from '@/components/account/GoogleIcon';
import { useAuth } from '@/context/AuthContext';
import { useAsync } from '@/hooks/useAsync';
import { useMockDbVersion } from '@/hooks/useMockDbVersion';
import { bookings } from '@/services';
import { loyaltyTierFor } from '@/lib/auth';
import { formatMMK } from '@/lib/currency';
import { formatDate, todayISO } from '@/lib/dates';
import type { Booking, UserProfile } from '@/types';

const COUNTRY_CODES = ['+95', '+66', '+65', '+60', '+61', '+91'];

const PROVIDER_META: Record<
  UserProfile['provider'],
  { label: string; render: () => ReactNode }
> = {
  google: { label: 'Signed in with Google', render: () => <GoogleIcon className="h-4 w-4" /> },
  phone: { label: 'Signed in with phone', render: () => <Smartphone className="h-4 w-4" /> },
  email: { label: 'Signed in with email', render: () => <Mail className="h-4 w-4" /> },
};

type Segment = 'upcoming' | 'active' | 'past' | 'cancelled';

function segmentOf(booking: Booking, today: string): Segment {
  if (booking.status === 'cancelled' || booking.status === 'no_show') return 'cancelled';
  if (booking.status === 'checked_in') return 'active';
  if (booking.status === 'checked_out') return 'past';
  if (booking.stay.checkOut < today) return 'past';
  return 'upcoming';
}

export function AccountPage() {
  const { user, openSignIn, signOut, updateProfile } = useAuth();
  const dbVersion = useMockDbVersion();

  const listQuery = useAsync(
    () => (user ? bookings.listMyBookings().then((r) => r.data) : Promise.resolve<Booking[]>([])),
    [dbVersion, user?.id],
  );
  const all = useMemo(() => listQuery.data ?? [], [listQuery.data]);

  const today = todayISO();
  const counts = useMemo(() => {
    const result: Record<Segment, number> = { upcoming: 0, active: 0, past: 0, cancelled: 0 };
    for (const booking of all) result[segmentOf(booking, today)] += 1;
    return result;
  }, [all, today]);

  const completed = all.filter((b) => b.status === 'checked_out').length;
  const recent = useMemo(
    () => [...all].sort((a, b) => (a.stay.checkIn < b.stay.checkIn ? 1 : -1)).slice(0, 5),
    [all],
  );

  if (!user) {
    return <SignedOutPrompt onSignIn={openSignIn} />;
  }

  const tier = loyaltyTierFor(completed);
  const provider = PROVIDER_META[user.provider];

  return (
    <Container className="py-8">
      <SectionHeading
        eyebrow="My Account"
        title="Profile & booking status"
        description="Your identity, loyalty status and every reservation we can trace for you."
        action={
          <div className="flex items-center gap-2">
            <Link to="/bookings" className={buttonStyles('outline')}>
              My bookings
            </Link>
            <Button variant="ghost" onClick={signOut} leadingIcon={<LogOut className="h-4 w-4" aria-hidden="true" />}>
              Sign out
            </Button>
          </div>
        }
      />

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-8">
          {/* Identity card */}
          <Card className="p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <InitialsAvatar name={user.fullName} className="h-16 w-16 text-xl" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-semibold text-ink">{user.fullName}</h2>
                  <Badge tone="lavender" className="gap-1.5">
                    {provider.render()} {provider.label}
                  </Badge>
                </div>
                <div className="mt-2 flex flex-col gap-1 text-sm text-ink-soft sm:flex-row sm:flex-wrap sm:gap-x-5">
                  <span className="inline-flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-brand-500" aria-hidden="true" /> {user.email}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Smartphone className="h-3.5 w-3.5 text-brand-500" aria-hidden="true" /> {user.phoneCountryCode}{' '}
                    {user.phone}
                  </span>
                </div>
              </div>
              <div className="rounded-2xl border border-brand-900/10 bg-gradient-to-br from-brand-50 to-lavender-100 px-4 py-3 text-center">
                <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-800">
                  <BadgeCheck className="h-4 w-4" aria-hidden="true" /> {tier}
                </p>
                <p className="mt-0.5 text-xs text-ink-mute">
                  {completed} completed stay{completed === 1 ? '' : 's'}
                </p>
              </div>
            </div>
          </Card>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard label="Upcoming" value={counts.upcoming} tone="brand" />
            <StatCard label="In-stay" value={counts.active} tone="green" />
            <StatCard label="Past" value={counts.past} tone="slate" />
            <StatCard label="Cancelled" value={counts.cancelled} tone="red" />
          </div>

          {/* Trace bookings */}
          <div>
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-ink">Trace your bookings</h2>
                <p className="mt-1 text-sm text-ink-soft">
                  Live status for every reservation linked to your profile.
                </p>
              </div>
              <Link
                to="/bookings"
                className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline"
              >
                View all <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>

            <div className="mt-4">
              {listQuery.loading ? (
                <LoadingState label="Loading your bookings…" />
              ) : recent.length === 0 ? (
                <EmptyState
                  title="No reservations yet"
                  description="Book a stay and it will appear here with its live status, folio and check-in pass."
                  action={
                    <Link to="/search" className={buttonStyles('primary')}>
                      Find a room
                    </Link>
                  }
                />
              ) : (
                <div className="space-y-3">
                  {recent.map((booking) => (
                    <BookingRow key={booking.reference} booking={booking} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Editable details */}
        <aside className="lg:sticky lg:top-24 lg:h-fit">
          <ProfileForm key={user.id} user={user} onSave={updateProfile} />
        </aside>
      </div>
    </Container>
  );
}

function SignedOutPrompt({ onSignIn }: { onSignIn: () => void }) {
  return (
    <Container className="py-16">
      <Card className="mx-auto max-w-2xl p-8 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-lavender-100 text-brand-700">
          <UserRound className="h-7 w-7" aria-hidden="true" />
        </span>
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-ink">Your StayEase profile</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Sign in to trace every reservation, open folios and manage your stay — all in one place. Choose Google,
          phone number or email.
        </p>
        <Button
          size="lg"
          className="mt-6"
          onClick={onSignIn}
          leadingIcon={<UserRound className="h-4 w-4" aria-hidden="true" />}
        >
          Sign in to continue
        </Button>
      </Card>
    </Container>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'brand' | 'green' | 'slate' | 'red';
}) {
  const toneClass = {
    brand: 'text-brand-700',
    green: 'text-emerald-600',
    slate: 'text-slate-600',
    red: 'text-rose-600',
  }[tone];
  return (
    <Card className="p-4">
      <p className={`text-2xl font-bold ${toneClass}`}>{value}</p>
      <p className="mt-0.5 text-xs font-medium text-ink-mute">{label}</p>
    </Card>
  );
}

function BookingRow({ booking }: { booking: Booking }) {
  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-ink">{booking.hotel.name}</h3>
            <BookingStatusBadge status={booking.status} />
          </div>
          <p className="mt-1 text-xs text-ink-soft">
            {booking.room.name} · {formatDate(booking.stay.checkIn)} → {formatDate(booking.stay.checkOut)}
          </p>
          <p className="mt-0.5 font-mono text-[11px] text-ink-mute">{booking.reference}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-brand-800">{formatMMK(booking.price.total)}</p>
          <div className="mt-1 flex justify-end">
            <PaymentStatusBadge status={booking.paymentStatus} />
          </div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link to={`/reservations/${booking.reference}`} className={buttonStyles('outline', 'sm')}>
          <Ticket className="h-3.5 w-3.5" aria-hidden="true" /> View reservation
        </Link>
      </div>
    </Card>
  );
}

function ProfileForm({
  user,
  onSave,
}: {
  user: UserProfile;
  onSave: (patch: Partial<UserProfile>) => void;
}) {
  const toast = useToast();
  const [fullName, setFullName] = useState(user.fullName);
  const [email, setEmail] = useState(user.email);
  const [phoneCountryCode, setPhoneCountryCode] = useState(user.phoneCountryCode);
  const [phone, setPhone] = useState(user.phone);
  const [saved, setSaved] = useState(false);

  const submit = () => {
    if (fullName.trim().length < 2) {
      toast.error('Please enter your full name');
      return;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) {
      toast.error('Enter a valid email address');
      return;
    }
    onSave({ fullName, email, phoneCountryCode, phone });
    setSaved(true);
    toast.success('Profile updated', 'Your contact details have been saved.');
    window.setTimeout(() => setSaved(false), 2000);
  };

  return (
    <Card className="p-5">
      <h2 className="inline-flex items-center gap-2 text-sm font-semibold text-ink">
        <CalendarClock className="h-4 w-4 text-brand-600" aria-hidden="true" /> Account details
      </h2>
      <p className="mt-1 text-xs text-ink-soft">
        Keep your contact details current so we can match reservations and send updates.
      </p>

      <form
        className="mt-4 space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <Field label="Full name" htmlFor="account-name">
          <Input id="account-name" value={fullName} onChange={(event) => setFullName(event.target.value)} />
        </Field>
        <Field label="Email address" htmlFor="account-email">
          <Input id="account-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        </Field>
        <div className="grid grid-cols-[6.5rem_1fr] gap-3">
          <Field label="Code" htmlFor="account-cc">
            <Select
              id="account-cc"
              aria-label="Country calling code"
              value={phoneCountryCode}
              onChange={(event) => setPhoneCountryCode(event.target.value)}
            >
              {COUNTRY_CODES.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Mobile number" htmlFor="account-phone">
            <Input id="account-phone" value={phone} onChange={(event) => setPhone(event.target.value)} />
          </Field>
        </div>

        <Button
          type="submit"
          className="w-full"
          leadingIcon={saved ? <Check className="h-4 w-4" aria-hidden="true" /> : undefined}
        >
          {saved ? 'Saved' : 'Save changes'}
        </Button>
      </form>
    </Card>
  );
}
