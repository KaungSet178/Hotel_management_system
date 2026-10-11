import type { Booking, ServiceRequest } from '@/types';
import {
  SEED_BOOKINGS,
  applyDemoBlockouts,
  buildSeedServiceRequests,
  ROOMS,
} from './seed';
import type { Room } from '@/types';

/**
 * Development-only persistent store.
 *
 * Keeps demo bookings and service requests across page reloads so the mock
 * flow behaves like a real backend during a demo. It is intentionally simple:
 * a JSON blob in localStorage plus a subscription channel. The real backend
 * replaces this entirely (see `services/`).
 */

const STORAGE_KEY = 'stayflow.db.v1';
export const DB_EVENT = 'stayflow:db-changed';

export interface MockDb {
  bookings: Booking[];
  serviceRequests: ServiceRequest[];
  createdAt: string;
}

function seedDb(): MockDb {
  return {
    bookings: SEED_BOOKINGS,
    serviceRequests: buildSeedServiceRequests(),
    createdAt: new Date().toISOString(),
  };
}

function safeParse(raw: string | null): MockDb | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as MockDb;
    if (!Array.isArray(parsed.bookings) || !Array.isArray(parsed.serviceRequests)) return null;
    return parsed;
  } catch {
    return null;
  }
}

let cache: MockDb | null = null;

function read(): MockDb {
  if (cache) return cache;
  if (typeof window === 'undefined') {
    cache = seedDb();
    return cache;
  }
  const stored = safeParse(window.localStorage.getItem(STORAGE_KEY));
  cache = stored ?? seedDb();
  if (!stored) write(cache);
  return cache;
}

function write(db: MockDb): void {
  cache = db;
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    } catch {
      // Storage may be full or disabled — mock keeps working in-memory.
    }
    window.dispatchEvent(new Event(DB_EVENT));
  }
}

export const mockDb = {
  get(): MockDb {
    return read();
  },

  update(mutator: (db: MockDb) => MockDb): MockDb {
    const next = mutator(read());
    write(next);
    return next;
  },

  reset(): void {
    write(seedDb());
  },

  /** Rooms with their demo blockouts applied (matches seeded availability). */
  rooms(): Room[] {
    return applyDemoBlockouts(ROOMS);
  },
};

/** Subscribe to store changes (used for live service-request status updates). */
export function subscribeMockDb(listener: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = () => listener();
  window.addEventListener(DB_EVENT, handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener(DB_EVENT, handler);
    window.removeEventListener('storage', handler);
  };
}