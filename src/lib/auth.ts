import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { prisma } from "./db";
import { loginHref } from "./authNavigation";

export const SESSION_COOKIE = "po_session";
export const SESSION_SECONDS = 30 * 24 * 60 * 60;
export const publicUserSelect = { id: true, name: true, email: true, phone: true } as const;
export const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");

export async function currentUser() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const session = await prisma.session.findUnique({
    where: { tokenHash: tokenHash(token) },
    include: { user: { select: publicUserSelect } },
  });
  return session && session.expiresAt > new Date() ? session.user : null;
}

export async function requireUser(next = "/") {
  const user = await currentUser();
  if (!user) redirect(loginHref(next));
  return user;
}

export async function apiUser() {
  const user = await currentUser();
  return user ?? NextResponse.json({ error: "Please sign in to continue." }, { status: 401 });
}

export async function createSession(userId: string, response: NextResponse) {
  const token = randomBytes(32).toString("hex");
  await prisma.session.create({ data: {
    userId, tokenHash: tokenHash(token),
    expiresAt: new Date(Date.now() + SESSION_SECONDS * 1000),
  } });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true, secure: process.env.NODE_ENV === "production",
    sameSite: "lax", path: "/", maxAge: SESSION_SECONDS,
  });
  response.headers.set("Cache-Control", "no-store");
}

// Shared across server instances, rather than relying on an in-memory counter.
export async function allowAuthAttempt(email: string) {
  const key = tokenHash(email);
  const now = new Date();
  await prisma.authThrottle.deleteMany({ where: { key, expiresAt: { lte: now } } });
  const attempt = await prisma.authThrottle.upsert({
    where: { key }, update: { count: { increment: 1 } },
    create: { key, count: 1, expiresAt: new Date(now.getTime() + 15 * 60 * 1000) },
  });
  return attempt.count <= 10;
}
