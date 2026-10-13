/**
 * StayEase — shared payment-proof store (development only).
 *
 * This Vite plugin exposes a tiny REST-ish API that both the customer and the
 * staff dev servers mount, so a screenshot a guest uploads while booking can be
 * read by the front desk. It deliberately mirrors the contract the real backend
 * will serve (`POST/GET /api/payment-proofs`), so swapping the mock out later is
 * a matter of pointing VITE_API_BASE_URL at the backend — no UI changes needed.
 *
 * Records are persisted to a single JSON file at the repo root
 * (`.stayease/payment-proofs.json`) so both origins (localhost:5174 and
 * localhost:5175) share one source of truth.
 *
 * Endpoints:
 *   POST /api/payment-proofs        upsert a proof (upsert key: bookingRef)
 *   GET  /api/payment-proofs        list every proof
 *   GET  /api/payment-proofs/:ref   fetch one proof by booking reference
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(here, '..');
const STORE_DIR = join(REPO_ROOT, '.stayease');
const STORE_FILE = join(STORE_DIR, 'payment-proofs.json');
const BASE_PATH = '/api/payment-proofs';
const MAX_BODY_BYTES = 15 * 1024 * 1024;

/** Booking references are compared case-insensitively and without a leading `#`. */
export function normalizeRef(ref) {
  return String(ref ?? '').replace(/^#/, '').trim().toUpperCase();
}

function readStore() {
  try {
    if (!existsSync(STORE_FILE)) return [];
    const parsed = JSON.parse(readFileSync(STORE_FILE, 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStore(records) {
  if (!existsSync(STORE_DIR)) mkdirSync(STORE_DIR, { recursive: true });
  writeFileSync(STORE_FILE, JSON.stringify(records, null, 2), 'utf8');
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function send(res, status, payload) {
  res.statusCode = status;
  for (const [key, value] of Object.entries(CORS_HEADERS)) res.setHeader(key, value);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

function readJsonBody(req) {
  return new Promise((resolveBody, rejectBody) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        rejectBody(new Error('payload_too_large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        const text = Buffer.concat(chunks).toString('utf8');
        resolveBody(text ? JSON.parse(text) : {});
      } catch (error) {
        rejectBody(error);
      }
    });
    req.on('error', rejectBody);
  });
}

function normalizeRecord(body) {
  return {
    bookingRef: normalizeRef(body.bookingRef),
    fileName: String(body.fileName ?? 'payment-proof'),
    mimeType: String(body.mimeType ?? 'image/jpeg'),
    dataUrl: String(body.dataUrl),
    uploadedAt: String(body.uploadedAt ?? new Date().toISOString()),
    guestName: body.guestName ?? null,
    phone: body.phone ?? null,
    amount: typeof body.amount === 'number' ? body.amount : null,
    payer: body.payer ?? null,
    txnRef: body.txnRef ?? null,
    room: body.room ?? null,
    roomCategory: body.roomCategory ?? null,
    stay: body.stay ?? null,
    nights: typeof body.nights === 'number' ? body.nights : null,
  };
}

function handle(req, res, next) {
  if (!req.url || !req.url.startsWith(BASE_PATH)) return next();

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    for (const [key, value] of Object.entries(CORS_HEADERS)) res.setHeader(key, value);
    res.end();
    return;
  }

  const url = new URL(req.url, 'http://localhost');
  const tail = url.pathname.slice(BASE_PATH.length).replace(/^\//, '');

  if (req.method === 'GET') {
    const records = readStore();
    if (!tail) return send(res, 200, { proofs: records });
    const ref = normalizeRef(decodeURIComponent(tail));
    const found = records.find((record) => normalizeRef(record.bookingRef) === ref);
    return found ? send(res, 200, found) : send(res, 404, { error: 'not_found' });
  }

  if (req.method === 'POST') {
    readJsonBody(req)
      .then((body) => {
        const record = normalizeRecord(body);
        if (!record.bookingRef || !record.dataUrl) {
          send(res, 400, { error: 'bookingRef and dataUrl are required' });
          return;
        }
        const records = readStore();
        const next = records.filter((entry) => normalizeRef(entry.bookingRef) !== record.bookingRef);
        next.unshift(record);
        writeStore(next);
        send(res, 201, record);
      })
      .catch((error) => send(res, 400, { error: String(error?.message ?? error) }));
    return;
  }

  send(res, 405, { error: 'method_not_allowed' });
}

export function paymentProofStore() {
  return {
    name: 'stayease-payment-proof-store',
    configureServer(server) {
      server.middlewares.use(handle);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handle);
    },
  };
}

export default paymentProofStore;
