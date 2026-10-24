import { jsonError } from "@/lib/api";
import { authoriseLocationRequest } from "@/lib/auth/guard";
import { getStats } from "@/lib/data/stats";
import type { StatsRange } from "@/lib/dto";

const RANGES: StatsRange[] = ["7d", "30d", "90d"];

// GET /api/stats?location=warsaw&range=30d  (requires a group granting "stats" for that location)
export async function GET(request: Request) {
  const access = await authoriseLocationRequest(request, "stats");
  if ("error" in access) return access.error;

  const range = new URL(request.url).searchParams.get("range") ?? "30d";
  if (!RANGES.includes(range as StatsRange)) return jsonError(400, "Invalid 'range': use 7d, 30d or 90d");

  try {
    const body = await getStats(access.location, range as StatsRange);
    return Response.json(body, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    // Details stay in the server log; the browser only learns that the data source is unavailable.
    console.error("stats failed:", error);
    return jsonError(502, "Salesforce data is temporarily unavailable");
  }
}
