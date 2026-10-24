import { buildMockDataset, type MockDataset } from "./fixtures";

// Building the dataset takes ~300 ms, so reuse it for a short time. Within the window the
// data is identical anyway; after it, "now" moves on and everything is regenerated.
const TTL_MS = 30_000;
let cached: { builtAt: number; dataset: MockDataset } | null = null;

export function getMockDataset(): MockDataset {
  const now = Date.now();
  if (!cached || now - cached.builtAt > TTL_MS) {
    cached = { builtAt: now, dataset: buildMockDataset(new Date(now)) };
  }
  return cached.dataset;
}
