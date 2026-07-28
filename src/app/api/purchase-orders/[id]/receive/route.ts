import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { receivingStatus } from "@/lib/arrival";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  itemId: z.string().trim().min(1, "Item is required"),
  quantity: z.coerce.number().positive("Quantity must be greater than 0"),
  note: z.string().trim().optional(),
});

const EPS = 1e-9;

// Records a (partial) delivery of one item and recomputes the PO status.
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const po = await prisma.purchaseOrder.findUnique({
    where: { id: params.id },
    include: { items: true },
  });
  if (!po) {
    return NextResponse.json({ error: "Purchase order not found" }, { status: 404 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Validation failed" },
      { status: 422 }
    );
  }
  const { itemId, quantity, note } = parsed.data;

  const item = po.items.find((i) => i.id === itemId);
  if (!item) {
    return NextResponse.json(
      { error: "Item does not belong to this purchase order" },
      { status: 404 }
    );
  }

  const remaining = item.quantity - item.receivedQty;
  if (quantity > remaining + EPS) {
    return NextResponse.json(
      {
        error: `Only ${remaining} remaining for ${item.itemCode}. You tried to receive ${quantity}.`,
      },
      { status: 422 }
    );
  }

  const newReceived = Math.min(item.receivedQty + quantity, item.quantity);

  // Compute the new PO status from the updated item quantities.
  const updatedItems = po.items.map((i) =>
    i.id === itemId ? { quantity: i.quantity, receivedQty: newReceived } : { quantity: i.quantity, receivedQty: i.receivedQty }
  );
  const newStatus = receivingStatus(updatedItems, po.status);

  await prisma.$transaction([
    prisma.pOItem.update({
      where: { id: itemId },
      data: {
        receivedQty: newReceived,
        receipts: { create: { quantity, note: note || null } },
      },
    }),
    prisma.purchaseOrder.update({
      where: { id: po.id },
      data: {
        status: newStatus,
        statusEvents: {
          create: {
            type: "RECEIVED",
            label: `Received ${quantity} of ${item.itemCode}`,
            note:
              note ||
              `${newReceived} of ${item.quantity} received (${Math.max(
                item.quantity - newReceived,
                0
              )} remaining).`,
          },
        },
      },
    }),
  ]);

  return NextResponse.json({ ok: true, status: newStatus });
}
