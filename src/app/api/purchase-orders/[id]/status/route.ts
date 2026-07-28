import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { STATUS_ORDER, POStatus } from "@/lib/status";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  action: z.enum(["confirm_order", "set_shipping", "set_arrival", "add_note"]),
  date: z.string().trim().optional(),
  note: z.string().trim().optional(),
});

function rank(status: string): number {
  const i = STATUS_ORDER.indexOf(status as POStatus);
  return i === -1 ? 0 : i;
}

// Advance status only forward (never downgrade).
function advance(current: string, target: POStatus): string {
  return rank(target) > rank(current) ? target : current;
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const po = await prisma.purchaseOrder.findUnique({
    where: { id: params.id },
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
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 422 }
    );
  }
  const { action, date, note } = parsed.data;

  const data: Record<string, unknown> = {};
  let eventType = "";
  let eventLabel = "";

  switch (action) {
    case "confirm_order": {
      data.status = advance(po.status, "ORDER_CONFIRMED");
      eventType = "ORDER_CONFIRMED";
      eventLabel = "Order Confirmed";
      break;
    }
    case "set_shipping": {
      if (!date) {
        return NextResponse.json(
          { error: "Expected shipping date is required" },
          { status: 422 }
        );
      }
      data.expectedShipping = new Date(date);
      // Setting a shipping date implies the order is at least confirmed.
      data.status = advance(po.status, "ORDER_CONFIRMED");
      eventType = "SHIPPING_SET";
      eventLabel = "Expected Shipping Date set";
      break;
    }
    case "set_arrival": {
      if (!date) {
        return NextResponse.json(
          { error: "Expected arrival date is required" },
          { status: 422 }
        );
      }
      data.expectedArrival = new Date(date);
      data.status = advance(po.status, "ORDER_CONFIRMED");
      eventType = "ARRIVAL_SET";
      eventLabel = "Expected Arrival Date set";
      break;
    }
    case "add_note": {
      if (!note) {
        return NextResponse.json(
          { error: "Note text is required" },
          { status: 422 }
        );
      }
      eventType = "NOTE";
      eventLabel = "Note added";
      break;
    }
  }

  const updated = await prisma.purchaseOrder.update({
    where: { id: po.id },
    data: {
      ...data,
      statusEvents: {
        create: {
          type: eventType,
          label: eventLabel,
          note: note || null,
        },
      },
    },
    select: { id: true, status: true },
  });

  return NextResponse.json({ ok: true, status: updated.status });
}
