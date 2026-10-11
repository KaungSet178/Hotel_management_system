import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { SearchCriteria } from '@/types';
import { addDaysISO, isDateString, nightsBetween, todayPlus } from '@/lib/dates';

export interface StayQuery extends SearchCriteria {
  nights: number;
  /** Whether every field was present and valid in the URL. */
  complete: boolean;
  queryString: string;
}

export function parseStayParams(params: URLSearchParams): StayQuery {
  const destination = params.get('dest') ?? '';
  const rawIn = params.get('in') ?? '';
  const rawOut = params.get('out') ?? '';
  const checkIn = isDateString(rawIn) ? rawIn : todayPlus(7);
  const checkOut =
    isDateString(rawOut) && rawOut > checkIn ? rawOut : addDaysISO(checkIn, 3);
  const adults = clampInt(params.get('adults'), 1, 8, 2);
  const rooms = clampInt(params.get('rooms'), 1, 4, 1);
  const nights = nightsBetween(checkIn, checkOut);

  const complete = Boolean(destination) && isDateString(rawIn) && isDateString(rawOut) && rawOut > rawIn;

  const search = new URLSearchParams({
    dest: destination,
    in: checkIn,
    out: checkOut,
    adults: String(adults),
    rooms: String(rooms),
  });

  return {
    destination,
    checkIn,
    checkOut,
    adults,
    rooms,
    nights,
    complete,
    queryString: `?${search.toString()}`,
  };
}

function clampInt(value: string | null, min: number, max: number, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

export function useStayQuery(): StayQuery {
  const [params] = useSearchParams();
  return useMemo(() => parseStayParams(params), [params]);
}

/** Builds a query string carrying the stay info forward between routes. */
export function stayQueryString(criteria: Pick<SearchCriteria, 'destination' | 'checkIn' | 'checkOut' | 'adults' | 'rooms'>): string {
  const search = new URLSearchParams({
    dest: criteria.destination,
    in: criteria.checkIn,
    out: criteria.checkOut,
    adults: String(criteria.adults),
    rooms: String(criteria.rooms),
  });
  return `?${search.toString()}`;
}