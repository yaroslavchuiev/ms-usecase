import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifyToken } from "@/lib/auth/token";

// First line of defence: no valid session -> pages go to /login, API calls get 401.
// This is only an "optimistic" check (signature + expiry). Each route handler still loads
// the user and calls authorise() for the requested location and role.
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/api/auth/")) return NextResponse.next(); // login / logout

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const signedIn = token ? (await verifyToken(token)) !== null : false;

  if (pathname.startsWith("/api/")) {
    return signedIn ? NextResponse.next() : NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
  if (pathname === "/login") {
    return signedIn ? NextResponse.redirect(new URL("/", request.url)) : NextResponse.next();
  }
  return signedIn ? NextResponse.next() : NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
