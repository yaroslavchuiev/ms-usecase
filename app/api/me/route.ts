import { jsonError } from "@/lib/api";
import { getSessionUser } from "@/lib/auth/session";
import { buildMe } from "@/lib/me";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return jsonError(401, "Authentication required");
  return Response.json(await buildMe(user));
}
