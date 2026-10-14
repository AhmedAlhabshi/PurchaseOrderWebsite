import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { loginSchema } from "@/lib/authValidation";
import { allowAuthAttempt, createSession, publicUserSelect } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/password";

export const runtime = "nodejs";
// A missing account also performs the expensive password operation.
const dummyHash = hashPassword("unused-account-password");
export async function POST(req: NextRequest) {
  const parsed = loginSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid email and password." }, { status: 422 });
  const { email, password } = parsed.data;
  if (!await allowAuthAttempt(email)) return NextResponse.json({ error: "Too many attempts. Try again in 15 minutes." }, { status: 429 });
  const account = await prisma.user.findUnique({ where: { email } });
  const matches = await verifyPassword(password, account?.passwordHash ?? await dummyHash);
  if (!account || !matches) return NextResponse.json({ error: "Email or password is incorrect." }, { status: 401 });
  const user = await prisma.user.findUniqueOrThrow({ where: { id: account.id }, select: publicUserSelect });
  const response = NextResponse.json({ user });
  await createSession(user.id, response);
  return response;
}
