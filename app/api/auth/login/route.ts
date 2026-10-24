import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { sessionCookie } from "@/lib/auth/session";
import { findUser } from "@/lib/auth/users";

// Placeholder sign-in: pick a demo user, get a signed session cookie.
export async function POST(request: Request) {
  if (process.env.AUTH_MODE !== "placeholder") return jsonError(404, "Placeholder login is disabled");

  const form = await request.formData();
  const user = findUser(String(form.get("userId") ?? ""));
  // 303 turns the POST into a GET on the target page.
  const target = new URL(user ? "/" : "/login?error=1", request.url);
  const response = NextResponse.redirect(target, 303);
  if (user) response.cookies.set(await sessionCookie(user.id));
  return response;
}
