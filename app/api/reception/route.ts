import { authoriseLocationRequest } from "@/lib/auth/guard";
import { getReception } from "@/lib/data/reception";

// GET /api/reception?location=warsaw  (requires a group granting "reception" for that location)
export async function GET(request: Request) {
  const access = await authoriseLocationRequest(request, "reception");
  if ("error" in access) return access.error;

  const body = await getReception(access.location);
  return Response.json(body, { headers: { "Cache-Control": "private, no-store" } });
}
