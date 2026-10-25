import { jsonError } from "@/lib/api";
import { authoriseLocationRequest } from "@/lib/auth/guard";
import { getTasks } from "@/lib/data/tasks";

// GET /api/tasks?location=warsaw
// The signed-in user's own open tasks due today or overdue. The location only sets the time zone
// for "today" and is authorised like Reception; the owner always comes from the session.
export async function GET(request: Request) {
  const access = await authoriseLocationRequest(request, "reception");
  if ("error" in access) return access.error;

  try {
    const body = await getTasks(access.location, access.user.email);
    return Response.json(body, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("tasks failed:", error);
    return jsonError(502, "Salesforce data is temporarily unavailable");
  }
}
