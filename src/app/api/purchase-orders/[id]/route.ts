import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Permanently deletes a purchase order and its items, receipts and history
// (cascaded by the database).
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const po = await prisma.purchaseOrder.findUnique({
    where: { id: params.id },
    select: { id: true },
  });
  if (!po) {
    return NextResponse.json({ error: "Purchase order not found" }, { status: 404 });
  }

  await prisma.purchaseOrder.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
