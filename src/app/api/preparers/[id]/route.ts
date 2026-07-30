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

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const preparer = await prisma.preparer.findUnique({ where: { id: params.id } });
  if (!preparer) {
    return NextResponse.json({ error: "Preparer not found" }, { status: 404 });
  }

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

  const clash = await prisma.preparer.findFirst({
    where: { name, id: { not: params.id } },
  });
  if (clash) {
    return NextResponse.json(
      { error: "Another preparer already uses this name" },
      { status: 409 }
    );
  }

  const updated = await prisma.preparer.update({
    where: { id: params.id },
    data: { name, phone, email },
  });
  return NextResponse.json({ preparer: updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  await prisma.preparer.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
