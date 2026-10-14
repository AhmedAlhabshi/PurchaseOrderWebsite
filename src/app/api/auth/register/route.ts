import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { registerSchema } from "@/lib/authValidation";
import { allowAuthAttempt, createSession, publicUserSelect } from "@/lib/auth";
import { hashPassword } from "@/lib/password";

export const runtime = "nodejs";
export async function POST(req: NextRequest) {
  const parsed = registerSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 422 });
  const { name, email, phone, password } = parsed.data;
  if (!await allowAuthAttempt(email)) return NextResponse.json({ error: "Too many attempts. Try again in 15 minutes." }, { status: 429 });
  try {
    const user = await prisma.user.create({ data: {
      name, email, phone, passwordHash: await hashPassword(password),
    }, select: publicUserSelect });
    const response = NextResponse.json({ user }, { status: 201 });
    await createSession(user.id, response);
    return response;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "This email already has an account. Please sign in." }, { status: 409 });
    }
    throw error;
  }
}
