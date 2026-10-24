import { jsonError } from "@/lib/api";
import { authoriseLocationRequest } from "@/lib/auth/guard";
import { getReception } from "@/lib/data/reception";

// GET /api/reception?location=warsaw  (requires a group granting "reception" for that location)
export async function GET(request: Request) {
  const access = await authoriseLocationRequest(request, "reception");
  if ("error" in access) return access.error;

  try {
    const body = await getReception(access.location);
    return Response.json(body, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    // Details stay in the server log; the browser only learns that the data source is unavailable.
    console.error("reception failed:", error);
    return jsonError(502, "Salesforce data is temporarily unavailable");
  }
}
