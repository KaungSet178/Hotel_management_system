import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CalendarDays, Filter, RefreshCw, SlidersHorizontal, Users, X } from 'lucide-react';
import { Container } from '@/components/ui/section';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field, Select } from '@/components/ui/form';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/states';
import { RoomListingCard } from '@/components/hotel/RoomListingCard';
import { SearchForm } from '@/components/layout/SearchForm';
import { useAsync } from '@/hooks/useAsync';
import { useStayQuery } from '@/hooks/useStayQuery';
import { hotels } from '@/services';
import { formatDate } from '@/lib/dates';
import { formatMMK } from '@/lib/currency';
import { cn } from '@/lib/cn';

type SortKey = 'recommended' | 'price_asc' | 'price_desc' | 'rating' | 'size';

const SORT_LABELS: Record<SortKey, string> = {
  recommended: 'Recommended',
  price_asc: 'Nightly rate: low to high',
  price_desc: 'Nightly rate: high to low',
  rating: 'Guest rating',
  size: 'Suite size',
};

export function SearchResultsPage() {
  const stay = useStayQuery();
  const [, setParams] = useSearchParams();
  const [editOpen, setEditOpen] = useState(false);

  const [categories, setCategories] = useState<string[]>([]);
  const [beds, setBeds] = useState<string[]>([]);
  const [amenities, setAmenities] = useState<string[]>([]);
  const [maxRate, setMaxRate] = useState<number | null>(null);
  const [availableOnly, setAvailableOnly] = useState(false);
  const [sort, setSort] = useState<SortKey>('recommended');

  const dests = useAsync(() => hotels.getDestinations().then((r) => r.data), []);
  const results = useAsync(
    () =>
      hotels
        .searchRooms({
          destination: stay.destination,
          stay: { checkIn: stay.checkIn, checkOut: stay.checkOut },
          adults: stay.adults,
          rooms: stay.rooms,
        })
        .then((r) => r.data),
    [stay.destination, stay.checkIn, stay.checkOut, stay.adults, stay.rooms],
  );

  const listings = useMemo(() => results.data ?? [], [results.data]);

  const destinationLabel =
    dests.data?.find((d) => d.id === stay.destination)?.label ?? 'All destinations';

  const { categoryOptions, bedOptions, amenityOptions, rateBounds } = useMemo(() => {
    const catMap = new Map<string, number>();
    const bedSet = new Set<string>();
    const amenitySet = new Set<string>();
    let min = Infinity;
    let max = 0;
    for (const item of listings) {
      catMap.set(item.room.category, (catMap.get(item.room.category) ?? 0) + 1);
      bedSet.add(item.room.bedConfiguration);
      for (const amenity of item.room.amenities) amenitySet.add(amenity);
      min = Math.min(min, item.fromNightly);
      max = Math.max(max, item.fromNightly);
    }
    return {
      categoryOptions: Array.from(catMap.entries()).map(([label, count]) => ({ label, count })),
      bedOptions: Array.from(bedSet).sort(),
      amenityOptions: Array.from(amenitySet)
        .sort((a, b) => a.localeCompare(b))
        .slice(0, 7),
      rateBounds: {
        min: Number.isFinite(min) ? min : 0,
        max: max || 0,
      },
    };
  }, [listings]);

  const filtered = useMemo(() => {
    const base = listings.filter((item) => {
      if (categories.length && !categories.includes(item.room.category)) return false;
      if (beds.length && !beds.includes(item.room.bedConfiguration)) return false;
      if (amenities.length && !amenities.every((a) => item.room.amenities.includes(a))) return false;
      if (maxRate != null && item.fromNightly > maxRate) return false;
      if (availableOnly && !item.availability.available) return false;
      return true;
    });

    const sorted = [...base];
    sorted.sort((a, b) => {
      switch (sort) {
        case 'price_asc':
          return a.fromNightly - b.fromNightly;
        case 'price_desc':
          return b.fromNightly - a.fromNightly;
        case 'rating':
          return b.room.rating - a.room.rating;
        case 'size':
          return b.room.areaSqm - a.room.areaSqm;
        default: {
          if (a.availability.available !== b.availability.available) {
            return a.availability.available ? -1 : 1;
          }
          return b.room.rating - a.room.rating;
        }
      }
    });
    return sorted;
  }, [listings, categories, beds, amenities, maxRate, availableOnly, sort]);

  const activeFilterCount =
    categories.length + beds.length + amenities.length + (maxRate != null ? 1 : 0) + (availableOnly ? 1 : 0);

  function toggle(list: string[], setList: (v: string[]) => void, value: string) {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  function resetFilters() {
    setCategories([]);
    setBeds([]);
    setAmenities([]);
    setMaxRate(null);
    setAvailableOnly(false);
  }

  const initialSearch = {
    destination: stay.destination,
    checkIn: stay.checkIn,
    checkOut: stay.checkOut,
    adults: stay.adults,
    rooms: stay.rooms,
  };

  return (
    <Container className="py-8">
      {/* Summary bar */}
      <div className="rounded-2xl border border-brand-900/8 bg-white p-4 shadow-card sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">
              Suites Selection
            </p>
            <h1 className="mt-1 text-xl font-bold text-ink sm:text-2xl">{destinationLabel}</h1>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-soft">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4 text-brand-500" aria-hidden="true" />
                {formatDate(stay.checkIn)} – {formatDate(stay.checkOut)} ({stay.nights} night
                {stay.nights === 1 ? '' : 's'})
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Users className="h-4 w-4 text-brand-500" aria-hidden="true" />
                {stay.adults} adult{stay.adults === 1 ? '' : 's'} · {stay.rooms} room
                {stay.rooms === 1 ? '' : 's'}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              leadingIcon={<Filter className="h-4 w-4" />}
              onClick={() => setEditOpen((v) => !v)}
              aria-expanded={editOpen}
            >
              Edit Search
            </Button>
            <Button
              variant="ghost"
              size="sm"
              leadingIcon={<RefreshCw className={cn('h-4 w-4', results.loading && 'animate-spin')} />}
              onClick={() => results.reload()}
              disabled={results.loading}
            >
              Refresh Rates
            </Button>
          </div>
        </div>

        {editOpen ? (
          <div className="mt-4 border-t border-dashed border-brand-900/12 pt-4">
            <SearchForm variant="compact" initial={initialSearch} />
          </div>
        ) : null}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[280px_1fr]">
        {/* Filters */}
        <aside className="lg:sticky lg:top-24 lg:h-fit" aria-label="Refine results">
          <Card>
            <div className="flex items-center justify-between border-b border-brand-900/8 p-4">
              <h2 className="inline-flex items-center gap-2 text-sm font-semibold text-ink">
                <SlidersHorizontal className="h-4 w-4 text-brand-600" aria-hidden="true" /> Refine Filters
              </h2>
              {activeFilterCount > 0 ? (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" /> Reset All
                </button>
              ) : null}
            </div>

            <div className="space-y-5 p-4">
              <FilterGroup title="Room category">
                {categoryOptions.map((option) => (
                  <FilterCheckbox
                    key={option.label}
                    label={`${option.label} (${option.count})`}
                    checked={categories.includes(option.label)}
                    onChange={() => toggle(categories, setCategories, option.label)}
                  />
                ))}
              </FilterGroup>

              <FilterGroup title="Bed configuration">
                {bedOptions.map((option) => (
                  <FilterCheckbox
                    key={option}
                    label={option}
                    checked={beds.includes(option)}
                    onChange={() => toggle(beds, setBeds, option)}
                  />
                ))}
              </FilterGroup>

              <FilterGroup title="Max nightly rate">
                <input
                  type="range"
                  min={rateBounds.min}
                  max={rateBounds.max}
                  step={5000}
                  value={maxRate ?? rateBounds.max}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    setMaxRate(value >= rateBounds.max ? null : value);
                  }}
                  aria-label="Maximum nightly rate"
                  className="w-full accent-brand-700"
                />
                <p className="text-xs text-ink-mute">
                  Up to{' '}
                  <span className="font-medium text-ink">
                    {formatMMK(maxRate ?? rateBounds.max)}
                  </span>
                </p>
              </FilterGroup>

              <FilterGroup title="Included amenities">
                {amenityOptions.map((option) => (
                  <FilterCheckbox
                    key={option}
                    label={option}
                    checked={amenities.includes(option)}
                    onChange={() => toggle(amenities, setAmenities, option)}
                  />
                ))}
              </FilterGroup>

              <label className="flex items-center gap-2 text-sm text-ink-soft">
                <input
                  type="checkbox"
                  checked={availableOnly}
                  onChange={(event) => setAvailableOnly(event.target.checked)}
                  className="h-4 w-4 rounded border-brand-900/25 accent-brand-700"
                />
                Show available rooms only
              </label>
            </div>
          </Card>
        </aside>

        {/* Results */}
        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-ink">Available Accommodations</h2>
              <p className="text-xs text-ink-mute">
                {results.loading
                  ? 'Checking live availability…'
                  : `Showing ${filtered.length} of ${listings.length} room${listings.length === 1 ? '' : 's'} for your dates`}
              </p>
            </div>
            <div className="w-full sm:w-64">
              <Field label="Sort by" htmlFor="sort" className="[&>label]:sr-only">
                <Select
                  id="sort"
                  value={sort}
                  onChange={(event) => setSort(event.target.value as SortKey)}
                >
                  {Object.entries(SORT_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          </div>

          <p className="mb-4 rounded-xl bg-lavender-100 px-4 py-2.5 text-xs text-ink-soft">
            All listed totals include 10% service charge &amp; 5% commercial tax.
          </p>

          {results.loading ? (
            <div className="space-y-4">
              {[0, 1, 2].map((key) => (
                <Card key={key} className="p-4">
                  <div className="grid gap-4 md:grid-cols-[minmax(0,320px)_1fr]">
                    <Skeleton className="h-52 w-full" />
                    <div className="space-y-3 py-2">
                      <Skeleton className="h-5 w-1/2" />
                      <Skeleton className="h-4 w-1/3" />
                      <Skeleton className="h-16 w-full" />
                      <Skeleton className="h-9 w-40" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : results.error ? (
            <ErrorState description={results.error} onRetry={results.reload} />
          ) : filtered.length === 0 ? (
            <EmptyState
              title="No rooms match your filters"
              description={
                listings.length === 0
                  ? `We do not have availability in ${destinationLabel} for the selected dates. Try different dates or another destination.`
                  : 'Try widening your filters — for example, raise the maximum nightly rate or clear selected amenities.'
              }
              action={
                activeFilterCount > 0 ? (
                  <Button variant="outline" onClick={resetFilters}>
                    Reset all filters
                  </Button>
                ) : (
                  <Button onClick={() => setParams(new URLSearchParams())}>Start a new search</Button>
                )
              }
            />
          ) : (
            <div className="space-y-4">
              {filtered.map((listing) => (
                <RoomListingCard
                  key={listing.room.id}
                  listing={listing}
                  queryString={stay.queryString}
                  nights={stay.nights}
                />
              ))}
            </div>
          )}

          <p className="mt-6 text-center text-xs text-ink-mute">
            Rates shown are for {formatDate(stay.checkIn)} – {formatDate(stay.checkOut)}. Availability is
            verified again at checkout.
          </p>
        </div>
      </div>
    </Container>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset>
      <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-mute">
        {title}
      </legend>
      <div className="space-y-2">{children}</div>
    </fieldset>
  );
}

function FilterCheckbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  const id = `filter-${label.replace(/\W+/g, '-').toLowerCase()}`;
  return (
    <label htmlFor={id} className="flex cursor-pointer items-center gap-2.5 text-sm text-ink-soft">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 rounded border-brand-900/25 accent-brand-700"
      />
      {label}
    </label>
  );
}