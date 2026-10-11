import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  CircleAlert,
  Clock,
  CreditCard,
  Landmark,
  Lock,
  QrCode,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Users,
  Wallet,
} from 'lucide-react';
import { Container } from '@/components/ui/section';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox, Field, Input, Select, Textarea } from '@/components/ui/form';
import { StepsBar } from '@/components/booking/StepsBar';
import { PriceSummary } from '@/components/booking/PriceSummary';
import { BookingAuthGate } from '@/components/booking/BookingAuthGate';
import { PaymentInstructions } from '@/components/booking/PaymentInstructions';
import { ImageWithFallback } from '@/components/ui/image';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { useToast } from '@/components/ui/toast';
import { useAsync } from '@/hooks/useAsync';
import { useStayQuery } from '@/hooks/useStayQuery';
import { useBooking } from '@/context/BookingContext';
import { useAuth } from '@/context/AuthContext';
import { bookings, hotels } from '@/services';
import { toUserMessage } from '@/services/errors';
import { computeBreakdown } from '@/lib/pricing';
import { PAYMENT_ACCOUNTS } from '@/lib/paymentAccounts';
import { formatMMK } from '@/lib/currency';
import { formatRange, nightsBetween, todayISO } from '@/lib/dates';
import { cn } from '@/lib/cn';
import type { AddOn, GuestDetails, PaymentMethod, PaymentStatus } from '@/types';

const guestSchema = z.object({
  fullName: z.string().trim().min(2, 'Please enter the guest’s full name.'),
  email: z
    .string()
    .trim()
    .regex(/^[^@\s]+@[^@\s]+\.[^@\s]+$/, 'Enter a valid email address.'),
  phoneCountryCode: z.string().min(1),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9 ()-]{6,20}$/, 'Enter a valid phone number.'),
  estimatedArrival: z.string().min(1, 'Let us know your arrival window.'),
  conNotes: z.string().max(500, 'Please keep notes under 500 characters.').optional(),
  highFloor: z.boolean(),
  quietRoom: z.boolean(),
  lateCheckIn: z.boolean(),
  featherFreePillows: z.boolean(),
  celebrationNote: z.boolean(),
  agreeToTerms: z
    .boolean()
    .refine((value) => value === true, { message: 'Please accept the booking terms to continue.' }),
});

type GuestFormValues = z.infer<typeof guestSchema>;

const ARRIVAL_WINDOWS = ['14:00 - 16:00', '16:00 - 18:00', '18:00 - 20:00', 'After 20:00'];
const COUNTRY_CODES = ['+95', '+66', '+65', '+60', '+61', '+91'];

interface PaymentMethodMeta {
  id: PaymentMethod;
  label: string;
  description: string;
  icon: typeof Smartphone;
  badge?: string;
}

const PAYMENT_METHODS: PaymentMethodMeta[] = [
  { id: 'KBZPAY', label: 'KBZPay Instant App Pay', description: 'Scan & pay instantly in the KBZPay app.', icon: Smartphone, badge: '100% Guaranteed' },
  { id: 'WAVEPAY', label: 'WavePay Digital QR', description: 'One-tap digital wallet QR payment.', icon: QrCode },
  { id: 'CB_PAY', label: 'CB Pay Direct Transfer', description: 'Direct transfer from your CB bank account.', icon: Landmark },
  { id: 'CARD', label: 'Card · Visa / Mastercard / MPU', description: 'Securely pay with a debit or credit card.', icon: CreditCard },
  { id: 'PAY_AT_HOTEL', label: 'Pay at Hotel', description: 'Settle at reception when you arrive.', icon: Wallet },
];

export function BookPage() {
  const { user } = useAuth();
  if (!user) return <BookingAuthGate />;
  return <BookingFlow />;
}

function BookingFlow() {
  const { roomId = '' } = useParams();
  const stay = useStayQuery();
  const navigate = useNavigate();
  const toast = useToast();
  const { draft, ensureDraft, updateDraft, resetDraft } = useBooking();
  const { user } = useAuth();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [submitting, setSubmitting] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const paymentSectionRef = useRef<HTMLDivElement>(null);

  const roomQuery = useAsync(() => hotels.getRoom(roomId).then((r) => r.data), [roomId]);
  const addOnsQuery = useAsync(() => hotels.getAddOns().then((r) => r.data), []);
  const availabilityQuery = useAsync(
    () =>
      hotels
        .checkAvailability(roomId, { checkIn: stay.checkIn, checkOut: stay.checkOut })
        .then((r) => r.data),
    [roomId, stay.checkIn, stay.checkOut],
  );

  useEffect(() => {
    ensureDraft({
      roomId,
      checkIn: stay.checkIn,
      checkOut: stay.checkOut,
      adults: stay.adults,
      rooms: stay.rooms,
    });
    // Intentionally keyed on the stay only — recreating the draft identity on
    // every render would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, stay.checkIn, stay.checkOut, stay.adults, stay.rooms]);

  // Bring each step into view so guests always land at the top of the new step
  // instead of staying scrolled to the bottom of the previous one.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  // When a payment method is chosen, glide down to the QR / upload panel so the
  // next action is immediately visible.
  useEffect(() => {
    if (step !== 3 || !draft?.paymentMethod) return;
    paymentSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [step, draft?.paymentMethod]);

  const room = roomQuery.data?.room ?? null;
  const hotel = roomQuery.data?.hotel ?? null;
  const ratePlans = roomQuery.data?.ratePlans ?? [];
  const selectedRatePlan =
    ratePlans.find((plan) => plan.id === draft?.ratePlanId) ?? ratePlans.find((p) => p.recommended) ?? ratePlans[0];

  const defaultValues = useMemo<GuestFormValues>(() => {
    const saved = draft?.guest ?? null;
    return {
      fullName: saved?.fullName ?? user?.fullName ?? '',
      email: saved?.email ?? user?.email ?? '',
      phoneCountryCode: saved?.phoneCountryCode ?? user?.phoneCountryCode ?? '+95',
      phone: saved?.phone ?? user?.phone ?? '',
      estimatedArrival: saved?.estimatedArrival ?? ARRIVAL_WINDOWS[0],
      conNotes: saved?.conNotes ?? '',
      highFloor: saved?.preferences.highFloor ?? false,
      quietRoom: saved?.preferences.quietRoom ?? false,
      lateCheckIn: saved?.preferences.lateCheckIn ?? false,
      featherFreePillows: saved?.preferences.featherFreePillows ?? false,
      celebrationNote: saved?.preferences.celebrationNote ?? false,
      agreeToTerms: saved?.agreeToTerms ?? false,
    };
    // Defaults are computed once from whatever was already captured.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<GuestFormValues>({ resolver: zodResolver(guestSchema), defaultValues, mode: 'onTouched' });

  const selectedAddOns: AddOn[] = useMemo(() => {
    const list = addOnsQuery.data ?? [];
    return list.filter((addOn) => draft?.addOnIds.includes(addOn.id));
  }, [addOnsQuery.data, draft?.addOnIds]);

  const breakdown = useMemo(() => {
    if (!selectedRatePlan) return null;
    return computeBreakdown({
      ratePlan: selectedRatePlan,
      nights: stay.nights,
      rooms: stay.rooms,
      addOns: selectedAddOns,
    });
  }, [selectedRatePlan, stay.nights, stay.rooms, selectedAddOns]);

  if (roomQuery.loading || (!roomQuery.data && !roomQuery.error)) {
    return (
      <Container className="py-16">
        <LoadingState label="Preparing your booking…" />
      </Container>
    );
  }

  if (roomQuery.error || !room || !hotel || !draft || !selectedRatePlan || !breakdown) {
    return (
      <Container className="py-16">
        <ErrorState
          title="We couldn't start this booking"
          description={roomQuery.error ?? 'This room may no longer be available. Please pick another suite.'}
          onRetry={roomQuery.reload}
        />
      </Container>
    );
  }

  const available = availabilityQuery.data?.available ?? true;
  const daysToArrival = nightsBetween(todayISO(), stay.checkIn);
  const payAtHotelEligible = daysToArrival <= 1;

  const toggleAddOn = (id: string) => {
    const current = draft.addOnIds;
    const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
    updateDraft({ addOnIds: next });
  };

  const onGuestSubmit = (values: GuestFormValues) => {
    const guest: GuestDetails = {
      fullName: values.fullName.trim(),
      email: values.email.trim(),
      phoneCountryCode: values.phoneCountryCode,
      phone: values.phone.trim(),
      estimatedArrival: values.estimatedArrival,
      conNotes: values.conNotes?.trim() ?? '',
      agreeToTerms: values.agreeToTerms,
      preferences: {
        highFloor: values.highFloor,
        quietRoom: values.quietRoom,
        lateCheckIn: values.lateCheckIn,
        featherFreePillows: values.featherFreePillows,
        celebrationNote: values.celebrationNote,
      },
    };
    updateDraft({ guest });
    setStep(3);
  };

  const confirmBooking = async () => {
    if (!draft.guest || !draft.paymentMethod) {
      setPaymentError('Please complete the guest details and choose a payment method.');
      return;
    }
    if (draft.paymentMethod !== 'PAY_AT_HOTEL' && !draft.paymentProof) {
      setPaymentError('Please upload a screenshot of your payment so our team can verify it.');
      return;
    }
    setSubmitting(true);
    setPaymentError(null);
    try {
      const paymentStatus: PaymentStatus =
        draft.paymentMethod === 'PAY_AT_HOTEL' ? 'pay_at_hotel' : 'awaiting_review';

      const created = await bookings.createBooking({
        draftKey: draft.draftKey,
        hotelId: hotel.id,
        roomId: room.id,
        checkIn: draft.checkIn,
        checkOut: draft.checkOut,
        adults: draft.adults,
        rooms: draft.rooms,
        ratePlanId: draft.ratePlanId,
        addOnIds: draft.addOnIds,
        guest: draft.guest,
        paymentMethod: draft.paymentMethod,
        paymentStatus,
        paymentProof: draft.paymentProof ?? undefined,
      });

      const reference = created.data.reference;
      resetDraft();
      toast.success('Booking submitted', `Reference ${reference} — awaiting staff confirmation.`);
      navigate(`/confirmation/${reference}`);
    } catch (error) {
      const message = toUserMessage(error);
      setPaymentError(message);
      toast.error('We could not submit your booking', message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container className="py-8">
      <Link
        to={`/rooms/${room.id}${stay.queryString}`}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to suite details
      </Link>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">Complete your booking</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Secure checkout · No hidden fees · Instant confirmation
          </p>
        </div>
        <StepsBar current={step} onSelect={(next) => setStep(next)} />
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="min-w-0 space-y-6">
          {/* Stay header */}
          <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
            <div className="h-24 w-full shrink-0 overflow-hidden rounded-xl sm:w-32">
              <ImageWithFallback
                src={room.images[0]?.src ?? hotel.heroImage}
                alt={room.name}
                seed={room.id}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="min-w-0">
              <Badge tone="lavender">{hotel.address.city}</Badge>
              <h2 className="mt-2 text-lg font-semibold text-ink">{room.name}</h2>
              <p className="text-sm text-ink-soft">{hotel.name}</p>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-mute">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                  {formatRange(stay.checkIn, stay.checkOut)} · {stay.nights} night
                  {stay.nights === 1 ? '' : 's'}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" aria-hidden="true" />
                  {stay.adults} adult{stay.adults === 1 ? '' : 's'} · {stay.rooms} room
                  {stay.rooms === 1 ? '' : 's'}
                </span>
              </div>
            </div>
          </Card>

          {!available ? (
            <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <p>
                This suite is no longer available for {formatRange(stay.checkIn, stay.checkOut)}. Please choose
                another room or adjust your dates.
              </p>
            </div>
          ) : null}

          {step === 1 ? (
            <section aria-labelledby="step-rate">
              <h2 id="step-rate" className="text-lg font-semibold text-ink">
                1. Choose your rate & enhancements
              </h2>
              <p className="mt-1 text-sm text-ink-soft">
                Select the rate plan that suits your stay, then add any optional privileges.
              </p>

              <div className="mt-4 space-y-3">
                {ratePlans.map((plan) => {
                  const active = draft.ratePlanId === plan.id;
                  const planBreakdown = computeBreakdown({
                    ratePlan: plan,
                    nights: stay.nights,
                    rooms: stay.rooms,
                  });
                  return (
                    <label
                      key={plan.id}
                      className={cn(
                        'flex cursor-pointer flex-col gap-3 rounded-2xl border p-4 transition-colors sm:flex-row sm:items-start sm:justify-between',
                        active ? 'border-brand-600 bg-brand-50/60' : 'border-brand-900/12 bg-white hover:border-brand-400',
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="radio"
                          name="ratePlan"
                          className="mt-1 h-4 w-4 accent-brand-700"
                          checked={active}
                          onChange={() => updateDraft({ ratePlanId: plan.id })}
                        />
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-ink">{plan.label}</span>
                            {plan.recommended ? <Badge tone="brand">Recommended</Badge> : null}
                            {plan.savePercent ? <Badge tone="green">Save {plan.savePercent}%</Badge> : null}
                          </div>
                          <ul className="mt-2 space-y-1 text-xs text-ink-soft">
                            {plan.features.map((feature) => (
                              <li key={feature}>{feature}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                      <div className="text-right sm:pl-4">
                        <p className="text-lg font-bold text-brand-800">{formatMMK(plan.nightlyRate)}</p>
                        <p className="text-xs text-ink-mute">per night</p>
                        <p className="mt-1 text-xs font-medium text-ink-soft">
                          {formatMMK(planBreakdown.total)} total
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>

              <h3 className="mt-8 flex items-center gap-2 text-sm font-semibold text-ink">
                <Sparkles className="h-4 w-4 text-brand-600" aria-hidden="true" /> Enhance your stay
                <span className="font-normal text-ink-mute">(optional)</span>
              </h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {(addOnsQuery.data ?? []).map((addOn) => {
                  const active = draft.addOnIds.includes(addOn.id);
                  return (
                    <label
                      key={addOn.id}
                      className={cn(
                        'flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-colors',
                        active ? 'border-brand-600 bg-brand-50/60' : 'border-brand-900/12 bg-white hover:border-brand-400',
                      )}
                    >
                      <input
                        type="checkbox"
                        className="mt-0.5 h-4 w-4 accent-brand-700"
                        checked={active}
                        onChange={() => toggleAddOn(addOn.id)}
                      />
                      <div className="min-w-0">
                        <span className="block text-sm font-semibold text-ink">{addOn.label}</span>
                        <span className="mt-0.5 block text-xs text-ink-soft">{addOn.description}</span>
                        <span className="mt-1 block text-xs font-semibold text-brand-700">
                          + {formatMMK(addOn.price)}
                        </span>
                      </div>
                    </label>
                  );
                })}
              </div>

              <div className="mt-6 flex justify-end">
                <Button
                  size="lg"
                  disabled={!available}
                  trailingIcon={<ArrowRight className="h-4 w-4" aria-hidden="true" />}
                  onClick={() => setStep(2)}
                >
                  Proceed to Guest Details
                </Button>
              </div>
            </section>
          ) : null}

          {step === 2 ? (
            <section aria-labelledby="step-guest">
              <h2 id="step-guest" className="text-lg font-semibold text-ink">
                2. Guest details
              </h2>
              <p className="mt-1 text-sm text-ink-soft">
                We’ll use these details for your folio, check-in pass and arrival coordination.
              </p>

              <form className="mt-4 space-y-5" onSubmit={handleSubmit(onGuestSubmit)} noValidate>
                <Field label="Full name" htmlFor="fullName" required error={errors.fullName?.message}>
                  <Input id="fullName" autoComplete="name" placeholder="e.g. Thant Zin" {...register('fullName')} invalid={Boolean(errors.fullName)} />
                </Field>

                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Email address" htmlFor="email" required error={errors.email?.message}>
                    <Input id="email" type="email" autoComplete="email" placeholder="you@example.com" {...register('email')} invalid={Boolean(errors.email)} />
                  </Field>
                  <Field label="Mobile number" htmlFor="phone" required error={errors.phone?.message}>
                    <div className="grid grid-cols-[7rem_1fr] gap-2">
                      <Select
                        aria-label="Country calling code"
                        {...register('phoneCountryCode')}
                      >
                        {COUNTRY_CODES.map((code) => (
                          <option key={code} value={code}>
                            {code}
                          </option>
                        ))}
                      </Select>
                      <Input id="phone" autoComplete="tel" placeholder="9 798 123 456" {...register('phone')} invalid={Boolean(errors.phone)} />
                    </div>
                  </Field>
                </div>

                <Field
                  label="Estimated arrival time"
                  htmlFor="estimatedArrival"
                  required
                  error={errors.estimatedArrival?.message}
                  hint="Check-in opens at 14:00. We’ll hold your suite and prepare refreshments."
                >
                  <Select id="estimatedArrival" {...register('estimatedArrival')}>
                    {ARRIVAL_WINDOWS.map((window) => (
                      <option key={window} value={window}>
                        {window}
                      </option>
                    ))}
                  </Select>
                </Field>

                <fieldset>
                  <legend className="text-sm font-medium text-ink">Stay preferences</legend>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <Checkbox label="High floor preferred" {...register('highFloor')} />
                    <Checkbox label="Quiet room away from lifts" {...register('quietRoom')} />
                    <Checkbox label="Late check-in" {...register('lateCheckIn')} />
                    <Checkbox label="Feather-free pillows" {...register('featherFreePillows')} />
                    <Checkbox
                      label="Celebration / special occasion"
                      description="Let us know and we’ll prepare a small surprise."
                      {...register('celebrationNote')}
                    />
                  </div>
                </fieldset>

                <Field
                  label="Special requests to the concierge"
                  htmlFor="conNotes"
                  error={errors.conNotes?.message}
                  hint="Allergies, dietary needs, airport pick-up timing — anything we should prepare."
                >
                  <Textarea id="conNotes" placeholder="Optional" {...register('conNotes')} invalid={Boolean(errors.conNotes)} />
                </Field>

                <div>
                  <Checkbox
                    label={
                      <span>
                        I agree to the booking terms, cancellation policy and privacy notice.
                      </span>
                    }
                    {...register('agreeToTerms')}
                  />
                  {errors.agreeToTerms ? (
                    <p role="alert" className="mt-1.5 text-xs font-medium text-rose-600">
                      {errors.agreeToTerms.message}
                    </p>
                  ) : null}
                </div>

                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
                  <Button variant="ghost" onClick={() => setStep(1)} leadingIcon={<ArrowLeft className="h-4 w-4" aria-hidden="true" />}>
                    Back to rate selection
                  </Button>
                  <Button type="submit" size="lg" trailingIcon={<ArrowRight className="h-4 w-4" aria-hidden="true" />}>
                    Proceed to Payment
                  </Button>
                </div>
              </form>
            </section>
          ) : null}

          {step === 3 ? (
            <section aria-labelledby="step-payment">
              <h2 id="step-payment" className="text-lg font-semibold text-ink">
                3. Payment method
              </h2>
              <p className="mt-1 text-sm text-ink-soft">
                Choose how you’d like to pay. Digital wallets and transfers require a screenshot of your
                payment so our team can verify it before the booking is confirmed. Pay at Hotel is only
                offered for arrivals today or tomorrow — longer stays ahead are secured online.
              </p>

              <div className="mt-4 space-y-3">
                {PAYMENT_METHODS.map((method) => {
                  const disabled = method.id === 'PAY_AT_HOTEL' && !payAtHotelEligible;
                  const active = draft.paymentMethod === method.id;
                  const Icon = method.icon;
                  return (
                    <button
                      key={method.id}
                      type="button"
                      disabled={disabled}
                      onClick={() => {
                        updateDraft({ paymentMethod: method.id });
                        setPaymentError(null);
                      }}
                      className={cn(
                        'flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition-colors',
                        disabled && 'cursor-not-allowed opacity-55',
                        active ? 'border-brand-600 bg-brand-50/60' : 'border-brand-900/12 bg-white hover:border-brand-400',
                      )}
                    >
                      <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', active ? 'bg-brand-700 text-white' : 'bg-lavender-100 text-brand-700')}>
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-ink">{method.label}</span>
                          {method.badge ? <Badge tone="green">{method.badge}</Badge> : null}
                        </span>
                        <span className="mt-0.5 block text-xs text-ink-soft">{method.description}</span>
                        {disabled ? (
                          <span className="mt-1 block text-xs text-ink-mute">
                            Not available for this arrival date — Pay at Hotel is only offered when you check in
                            today or tomorrow. Please pay online.
                          </span>
                        ) : null}
                      </span>
                      <span
                        className={cn(
                          'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
                          active ? 'border-brand-700 bg-brand-700' : 'border-brand-900/25',
                        )}
                        aria-hidden="true"
                      >
                        {active ? <span className="h-2 w-2 rounded-full bg-white" /> : null}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div ref={paymentSectionRef} className="scroll-mt-24">
                {draft.paymentMethod && draft.paymentMethod !== 'PAY_AT_HOTEL' ? (
                  <PaymentInstructions
                    account={PAYMENT_ACCOUNTS[draft.paymentMethod]}
                    amount={breakdown.total}
                    reference={draft.draftKey}
                    proof={draft.paymentProof}
                    onProofChange={(proof) => updateDraft({ paymentProof: proof })}
                    error={paymentError ?? undefined}
                  />
                ) : null}

                {draft.paymentMethod === 'PAY_AT_HOTEL' && payAtHotelEligible ? (
                  <div className="mt-4 rounded-2xl border border-brand-900/12 bg-lavender-100/50 p-4 text-sm text-ink-soft">
                    <p className="font-medium text-ink">No advance payment required</p>
                    <p className="mt-1">
                      We’ll hold your suite and issue a folio now. Settle {formatMMK(breakdown.total)} at
                      reception during check-in.
                    </p>
                  </div>
                ) : null}

                {draft.paymentMethod === 'PAY_AT_HOTEL' && !payAtHotelEligible ? (
                  <div role="alert" className="mt-4 flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between">
                    <p>
                      Pay at Hotel is no longer available for this arrival date. Please choose an online
                      payment method so our team can verify your booking.
                    </p>
                    <Button variant="outline" size="sm" onClick={() => updateDraft({ paymentMethod: null })}>
                      Choose online payment
                    </Button>
                  </div>
                ) : null}

                <div className="mt-4 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  <Clock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <p>
                    Our team reviews every booking before it is confirmed. Until then your reservation stays
                    <span className="font-semibold"> pending</span> and shows “Awaiting review”.
                  </p>
                </div>
              </div>

              {paymentError && draft.paymentMethod === 'PAY_AT_HOTEL' ? (
                <div role="alert" className="mt-4 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                  <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <p>{paymentError}</p>
                </div>
              ) : null}

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
                <Button variant="ghost" onClick={() => setStep(2)} leadingIcon={<ArrowLeft className="h-4 w-4" aria-hidden="true" />}>
                  Back to guest details
                </Button>
                <Button
                  size="lg"
                  loading={submitting}
                  leadingIcon={<Lock className="h-4 w-4" aria-hidden="true" />}
                  disabled={
                    !draft.paymentMethod ||
                    !available ||
                    (draft.paymentMethod === 'PAY_AT_HOTEL' && !payAtHotelEligible) ||
                    (draft.paymentMethod !== 'PAY_AT_HOTEL' && !draft.paymentProof)
                  }
                  onClick={confirmBooking}
                >
                  {draft.paymentMethod === 'PAY_AT_HOTEL'
                    ? `Confirm Booking · Pay ${formatMMK(breakdown.total)} at hotel`
                    : `Submit ${formatMMK(breakdown.total)} payment for review`}
                </Button>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-ink-mute">
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> Staff-verified payments
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" /> Refundable per rate plan
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5" aria-hidden="true" /> Proof stored on this device
                </span>
              </div>
            </section>
          ) : null}
        </div>

        <aside className="lg:sticky lg:top-24 lg:h-fit">
          <PriceSummary
            ratePlan={selectedRatePlan}
            stay={{ checkIn: stay.checkIn, checkOut: stay.checkOut }}
            addOns={selectedAddOns}
            breakdown={breakdown}
            footer={
              step < 3 ? (
                <p className="text-xs text-ink-mute">
                  Continue through checkout to apply any promotions and confirm your reservation.
                </p>
              ) : (
                <p className="text-xs text-ink-mute">
                  {draft.paymentMethod === 'PAY_AT_HOTEL'
                    ? 'Your folio will be issued now and settled at check-in.'
                    : 'You will receive a folio and QR express check-in pass instantly.'}
                </p>
              )
            }
          />
        </aside>
      </div>
    </Container>
  );
}