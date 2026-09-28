import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { createSession, SESSION_COOKIE, verifySession } from "./session";

// Some hosting adapters serve static pages without running Next middleware.
// Establish the signed visitor identity at the API boundary as well.
export async function sessionUser(request: NextRequest) {
  const existing = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);
  if (existing) return existing;
  const token = await createSession();
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" || request.nextUrl.protocol === "https:",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return (await verifySession(token))!;
}
