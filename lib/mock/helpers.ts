import type { SfAttributes, SfQueryResult, SfRecord } from "@/lib/salesforce/types";

// Helpers that make fixtures look like real Salesforce REST output.

const API_VERSION = "v62.0";

// --- Seeded randomness: varied data, but identical on every reload ------------------------

export interface Rng {
  next(): number;
  /** Integer in [min, max], inclusive. */
  int(min: number, max: number): number;
  chance(p: number): boolean;
  pick<T>(items: readonly T[]): T;
  weighted<T>(items: readonly (readonly [T, number])[]): T;
  normal(mean: number, sd: number): number;
  shuffle<T>(items: readonly T[]): T[];
}

export function createRng(seed: string): Rng {
  let h = 2166136261; // FNV-1a hash of the seed string -> 32-bit state
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  let state = h >>> 0;

  const next = () => {
    // mulberry32
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const rng: Rng = {
    next,
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    chance: (p) => next() < p,
    pick: (items) => items[Math.floor(next() * items.length)],
    weighted: (items) => {
      let r = next() * items.reduce((sum, [, w]) => sum + w, 0);
      for (const [item, w] of items) if ((r -= w) < 0) return item;
      return items[items.length - 1][0];
    },
    normal: (mean, sd) => {
      // Box-Muller
      const u = 1 - next();
      return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * next());
    },
    shuffle: (items) => {
      const a = [...items];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    },
  };
  return rng;
}

// --- 18-character Salesforce IDs ------------------------------------------------------------

const BASE62 = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
const CHECKSUM = "ABCDEFGHIJKLMNOPQRSTUVWXYZ012345";
const BASE62_5 = 62 ** 5;

/** Salesforce's case-safe suffix: 3 chars encoding which of the 15 chars are uppercase. */
function checksum(id15: string): string {
  let out = "";
  for (let chunk = 0; chunk < 3; chunk++) {
    let bits = 0;
    for (let i = 0; i < 5; i++) {
      const c = id15[chunk * 5 + i];
      if (c >= "A" && c <= "Z") bits |= 1 << i;
    }
    out += CHECKSUM[bits];
  }
  return out;
}

/**
 * Returns a generator of unique IDs per key prefix: 3-char prefix + instance "5g" + "00000" +
 * 5 scrambled chars + 3-char checksum (18 total), e.g. "5005g00000Xk3mQAAS".
 * Prefixes: Case 500, Account 001, Contact 003, Contract 800; custom objects a00-a04.
 */
export function createIdFactory(): (prefix: string) => string {
  const counters = new Map<string, number>();
  return (prefix) => {
    const n = (counters.get(prefix) ?? 0) + 1;
    counters.set(prefix, n);
    // Multiplying by a number coprime with 62^5 is a bijection: scrambled but never colliding.
    let scrambled = (n * 2654435761) % BASE62_5;
    let tail = "";
    for (let i = 0; i < 5; i++) {
      tail = BASE62[scrambled % 62] + tail;
      scrambled = Math.floor(scrambled / 62);
    }
    const id15 = `${prefix}5g00000${tail}`;
    return id15 + checksum(id15);
  };
}

// --- Record and response wrappers ------------------------------------------------------------

function attributes(type: string, id?: string): SfAttributes {
  return {
    type,
    url: `/services/data/${API_VERSION}/sobjects/${type}${id ? `/${id}` : ""}`,
  };
}

export function record<F extends object>(type: string, id: string, fields: F): SfRecord & F {
  return { attributes: attributes(type, id), Id: id, ...fields };
}

/** Relationship object, e.g. Account__r: { attributes, Name }. */
export function ref<F extends object>(type: string, id: string, fields: F) {
  return { attributes: attributes(type, id), ...fields };
}

export function queryResult<T>(records: T[]): SfQueryResult<T> {
  return { totalSize: records.length, done: true, records };
}

/** Salesforce datetime format: 2026-10-24T14:03:21.000+0000 */
export function sfDateTime(date: Date): string {
  return date.toISOString().replace("Z", "+0000");
}
