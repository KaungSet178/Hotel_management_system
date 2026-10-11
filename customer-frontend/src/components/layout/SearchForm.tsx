import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, MapPin, Search, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, Input, Select, Stepper } from '@/components/ui/form';
import { useAsync } from '@/hooks/useAsync';
import { hotels } from '@/services';
import type { SearchCriteria } from '@/types';
import { addDaysISO, nightsBetween, todayPlus } from '@/lib/dates';
import { cn } from '@/lib/cn';

export interface SearchFormProps {
  variant?: 'hero' | 'compact';
  initial?: Partial<SearchCriteria>;
  className?: string;
}

export function SearchForm({ variant = 'hero', initial, className }: SearchFormProps) {
  const navigate = useNavigate();
  const { data: destinations } = useAsync(() => hotels.getDestinations().then((r) => r.data), []);

  const defaults = useMemo<SearchCriteria>(
    () => ({
      destination: initial?.destination ?? '',
      checkIn: initial?.checkIn ?? todayPlus(7),
      checkOut: initial?.checkOut ?? todayPlus(10),
      adults: initial?.adults ?? 2,
      rooms: initial?.rooms ?? 1,
    }),
    [initial?.destination, initial?.checkIn, initial?.checkOut, initial?.adults, initial?.rooms],
  );

  const [destination, setDestination] = useState(defaults.destination);
  const [checkIn, setCheckIn] = useState(defaults.checkIn);
  const [checkOut, setCheckOut] = useState(defaults.checkOut);
  const [adults, setAdults] = useState(defaults.adults);
  const [rooms, setRooms] = useState(defaults.rooms);
  const [error, setError] = useState<string | null>(null);

  const nights = nightsBetween(checkIn, checkOut);

  function handleCheckIn(value: string) {
    setCheckIn(value);
    setError(null);
    const minOut = addDaysISO(value, 1);
    if (checkOut <= value) setCheckOut(minOut);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!destination) {
      setError('Choose a destination to see available rooms.');
      return;
    }
    if (nights <= 0) {
      setError('Check-out must be at least one night after check-in.');
      return;
    }
    const params = new URLSearchParams({
      dest: destination,
      in: checkIn,
      out: checkOut,
      adults: String(adults),
      rooms: String(rooms),
    });
    navigate(`/search?${params.toString()}`);
  }

  const fieldCount = variant === 'hero' ? 'lg:grid-cols-[1.4fr_1fr_1fr_1.2fr_auto]' : 'lg:grid-cols-5';

  return (
    <form
      onSubmit={handleSubmit}
      className={cn('rounded-3xl bg-white p-4 shadow-card sm:p-5', className)}
      aria-label="Search available rooms"
    >
      <div className={cn('grid grid-cols-1 gap-4 sm:grid-cols-2', fieldCount)}>
        <Field label="Destination" htmlFor="search-destination" className="sm:col-span-2 lg:col-span-1">
          <div className="relative">
            <MapPin
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-500"
              aria-hidden="true"
            />
            <Select
              id="search-destination"
              value={destination}
              onChange={(event) => {
                setDestination(event.target.value);
                setError(null);
              }}
              className="pl-9"
            >
              <option value="">Select a destination</option>
              {(destinations ?? []).map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
        </Field>

        <Field label="Check-in" htmlFor="search-checkin">
          <div className="relative">
            <CalendarDays
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-500"
              aria-hidden="true"
            />
            <Input
              id="search-checkin"
              type="date"
              className="pl-9"
              value={checkIn}
              min={todayPlus(0)}
              onChange={(event) => handleCheckIn(event.target.value)}
            />
          </div>
        </Field>

        <Field label="Check-out" htmlFor="search-checkout">
          <div className="relative">
            <CalendarDays
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-500"
              aria-hidden="true"
            />
            <Input
              id="search-checkout"
              type="date"
              className="pl-9"
              value={checkOut}
              min={addDaysISO(checkIn, 1)}
              onChange={(event) => {
                setCheckOut(event.target.value);
                setError(null);
              }}
            />
          </div>
        </Field>

        <Field label="Guests & rooms" htmlFor="search-guests">
          <div
            id="search-guests"
            className="flex h-full flex-col justify-center gap-3 rounded-xl border border-brand-900/15 px-3.5 py-2.5"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-1.5 text-xs text-ink-soft">
                <Users className="h-3.5 w-3.5" aria-hidden="true" /> Adults
              </span>
              <Stepper value={adults} min={1} max={8} onChange={setAdults} label="adults" />
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-ink-soft">Rooms</span>
              <Stepper value={rooms} min={1} max={4} onChange={setRooms} label="rooms" />
            </div>
          </div>
        </Field>

        <div className="flex items-end">
          <Button type="submit" size="lg" className="w-full" leadingIcon={<Search className="h-4 w-4" />}>
            Search
          </Button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-ink-mute">
          {nights > 0 ? `${nights} night${nights === 1 ? '' : 's'} selected` : 'Select your dates'}
          {' · '}Best rate assured in MMK
        </p>
        {error ? (
          <p role="alert" className="text-xs font-medium text-rose-600">
            {error}
          </p>
        ) : null}
      </div>
    </form>
  );
}