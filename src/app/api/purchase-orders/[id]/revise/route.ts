import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  poInputSchema,
  computeGrandTotal,
  computeLineTotal,
} from "@/lib/validation";
import { renderPOPdf } from "@/lib/pdf";
import { sendPOEmail } from "@/lib/mailer";
import { stringifyCc } from "@/lib/serialize";
import { receivingStatus } from "@/lib/arrival";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Edits an existing PO, bumps the revision, regenerates the PDF and re-sends it.
// The PO number stays the same; only the revision increases (rev1, rev2, ...).
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const existing = await prisma.purchaseOrder.findUnique({
    where: { id: params.id },
    include: { items: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Purchase order not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = poInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const data = parsed.data;
  const grandTotal = computeGrandTotal(data.items);
  const revision = existing.revision + 1;
  const poNumber = existing.poNumber;

  // Preserve received quantities across the edit by matching on item code.
  const receivedByCode = new Map<string, number>();
  for (const it of existing.items) {
    receivedByCode.set(
      it.itemCode,
      (receivedByCode.get(it.itemCode) || 0) + it.receivedQty
    );
  }
  const newItems = data.items.map((it, idx) => {
    const carried = receivedByCode.get(it.itemCode) || 0;
    const receivedQty = Math.min(carried, it.quantity);
    // consume the carried amount so duplicate codes don't double-count
    receivedByCode.set(it.itemCode, carried - receivedQty);
    return {
      itemCode: it.itemCode,
      description: it.description,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      lineTotal: computeLineTotal(it.quantity, it.unitPrice),
      receivedQty,
      sortOrder: idx,
    };
  });

  const newStatus = receivingStatus(
    newItems.map((i) => ({ quantity: i.quantity, receivedQty: i.receivedQty })),
    existing.status
  );

  // Render the revised PDF (stored in the DB, replacing the previous snapshot).
  const pdf = await renderPOPdf({
    poNumber,
    revision,
    supplierName: data.supplierName,
    attention: data.attention,
    mainEmail: data.mainEmail,
    ccEmails: data.ccEmails,
    poDate: data.poDate,
    deliveryMethod: data.deliveryMethod,
    paymentTerms: data.paymentTerms,
    currency: data.currency,
    preparedBy: data.preparedBy,
    items: data.items,
    grandTotal,
  });

  // Re-send the email.
  let emailMode: "sent" | "preview" | "failed" = "failed";
  let emailMessage = "";
  let emailSentAt: Date | null = null;
  try {
    const result = await sendPOEmail({
      to: data.mainEmail,
      cc: data.ccEmails,
      subject: `Purchase Order - ${poNumber} (rev${revision})`,
      poNumber,
      supplierName: data.supplierName,
      attention: data.attention,
      preparedBy: data.preparedBy,
      pdf,
    });
    emailMode = result.mode;
    emailMessage = result.message;
    emailSentAt = new Date();
  } catch (err) {
    emailMode = "failed";
    emailMessage =
      "The revision and PDF were saved, but re-sending the email failed: " +
      (err instanceof Error ? err.message : "unknown error");
  }

  await prisma.$transaction([
    prisma.pOItem.deleteMany({ where: { poId: existing.id } }),
    prisma.purchaseOrder.update({
      where: { id: existing.id },
      data: {
        supplierName: data.supplierName,
        attention: data.attention || null,
        mainEmail: data.mainEmail,
        ccEmails: stringifyCc(data.ccEmails),
        poDate: new Date(data.poDate),
        deliveryMethod: data.deliveryMethod,
        paymentTerms: data.paymentTerms || null,
        currency: data.currency,
        preparedBy: data.preparedBy,
        grandTotal,
        revision,
        status: newStatus,
        pdfData: pdf,
        emailSentAt,
        emailMode: emailMode === "failed" ? null : emailMode,
        items: { create: newItems },
        statusEvents: {
          create: {
            type: "REVISED",
            label: `Revised (rev${revision}) & re-sent`,
            note:
              emailMode === "sent"
                ? "Revised PO emailed to supplier."
                : emailMode === "preview"
                ? "Revised PO created (email in preview mode)."
                : "Revised PO saved (email re-send failed).",
          },
        },
      },
    }),
  ]);

  return NextResponse.json({
    id: existing.id,
    poNumber,
    revision,
    emailMode,
    emailMessage,
  });
}
