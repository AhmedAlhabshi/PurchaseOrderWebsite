import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const updateSchema = z.object({
  name: z.string().trim().min(1, "Supplier name is required"),
  abbreviation: z
    .string()
    .trim()
    .min(1, "Abbreviation is required")
    .max(6, "Abbreviation is too long")
    .transform((s) => s.toUpperCase().replace(/[^A-Z0-9]/g, "")),
  currentNumber: z.coerce.number().int().min(0).default(0),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supplier = await prisma.supplier.findUnique({ where: { id: params.id } });
  if (!supplier) {
    return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Validation failed" },
      { status: 422 }
    );
  }
  const { name, abbreviation, currentNumber } = parsed.data;

  // Ensure the name stays unique.
  const clash = await prisma.supplier.findFirst({
    where: { name, id: { not: params.id } },
  });
  if (clash) {
    return NextResponse.json(
      { error: "Another supplier already uses this name" },
      { status: 409 }
    );
  }

  const updated = await prisma.supplier.update({
    where: { id: params.id },
    data: {
      name,
      abbreviation,
      seq: currentNumber,
      seqYear: new Date().getFullYear(),
    },
  });

  return NextResponse.json({ supplier: updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const count = await prisma.purchaseOrder.count({
    where: { supplierId: params.id },
  });
  if (count > 0) {
    return NextResponse.json(
      {
        error: `Cannot delete: ${count} purchase order(s) use this supplier.`,
      },
      { status: 409 }
    );
  }
  await prisma.supplier.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
