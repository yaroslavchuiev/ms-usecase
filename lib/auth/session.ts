import "server-only";
import { cookies } from "next/headers";
import { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS, signToken, verifyToken } from "./token";
import { findUser, type MockUser } from "./users";

/** The signed-in user, or null. Used by pages and route handlers (never trust the proxy alone). */
export async function getSessionUser(): Promise<MockUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const payload = token ? await verifyToken(token) : null;
  return payload ? (findUser(payload.uid) ?? null) : null;
}

/** Cookie attributes for a new session. HttpOnly keeps the token away from browser scripts. */
export async function sessionCookie(userId: string) {
  const exp = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS;
  return {
    name: SESSION_COOKIE,
    value: await signToken({ uid: userId, exp }),
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}
