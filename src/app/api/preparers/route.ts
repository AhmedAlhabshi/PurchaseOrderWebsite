import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  phone: z.string().trim().optional().default(""),
  email: z
    .string()
    .trim()
    .optional()
    .default("")
    .refine((v) => v === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "Email is not valid"),
});

export async function GET() {
  const preparers = await prisma.preparer.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json({ preparers });
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Validation failed" },
      { status: 422 }
    );
  }
  const { name, phone, email } = parsed.data;

  const existing = await prisma.preparer.findUnique({ where: { name } });
  if (existing) {
    return NextResponse.json(
      { error: "A preparer with this name already exists" },
      { status: 409 }
    );
  }

  const preparer = await prisma.preparer.create({ data: { name, phone, email } });
  return NextResponse.json({ preparer });
}
