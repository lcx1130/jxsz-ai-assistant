import { NextRequest, NextResponse } from "next/server";
import { createSession, SESSION_COOKIE, verifySession } from "./lib/session";

export async function middleware(request: NextRequest) {
  const existing = request.cookies.get(SESSION_COOKIE)?.value;
  if (await verifySession(existing)) return NextResponse.next();
  const token = await createSession();
  request.cookies.set(SESSION_COOKIE, token);
  const response = NextResponse.next({ request: { headers: request.headers } });
  response.cookies.set(SESSION_COOKIE, token, { httpOnly: true, secure: request.nextUrl.protocol === "https:", sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
  return response;
}
export const config = { matcher: ["/", "/chat", "/history", "/human", "/api/:path*"] };
