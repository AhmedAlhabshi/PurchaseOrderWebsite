import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  poInputSchema,
  computeGrandTotal,
  computeLineTotal,
} from "@/lib/validation";
import { renderPOPdf } from "@/lib/pdf";
import { sendPOEmail } from "@/lib/mailer";
import { reserveNextNumber } from "@/lib/ponumber";
import { stringifyCc } from "@/lib/serialize";
import { statusLabel } from "@/lib/status";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Creates the PO: renders + stores the PDF, sends (or previews) the email,
// then persists the order, items and the first status event.
export async function POST(req: NextRequest) {
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
  if (!data.supplierId) {
    return NextResponse.json(
      { error: "Please choose a supplier." },
      { status: 422 }
    );
  }
  // send=false → save as a draft (no email yet).
  const send = (body as { send?: boolean }).send !== false;
  const grandTotal = computeGrandTotal(data.items, data.taxRate);

  let poNumber: string;
  try {
    poNumber = await reserveNextNumber(data.supplierId);
  } catch {
    return NextResponse.json(
      { error: "Selected supplier no longer exists." },
      { status: 422 }
    );
  }

  // 1) Render PDF (always — so drafts can be viewed too)
  const pdf = await renderPOPdf({
    poNumber,
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
    taxRate: data.taxRate,
    grandTotal,
  });

  // 2) Send the email (unless saving as a draft)
  let emailMode: "sent" | "preview" | "failed" | "draft" = "draft";
  let emailMessage = "Saved as a draft — no email sent yet.";
  let emailSentAt: Date | null = null;
  if (send) {
    emailMode = "failed";
    try {
      const result = await sendPOEmail({
        to: data.mainEmail,
        cc: data.ccEmails,
        subject: `Purchase Order - ${poNumber}`,
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
        "The order and PDF were saved, but sending the email failed: " +
        (err instanceof Error ? err.message : "unknown error");
    }
  }
  const status = send ? "PO_SENT" : "DRAFT";

  // 4) Persist order + items + first status event
  const created = await prisma.purchaseOrder.create({
    data: {
      poNumber,
      supplierId: data.supplierId,
      supplierName: data.supplierName,
      attention: data.attention || null,
      mainEmail: data.mainEmail,
      ccEmails: stringifyCc(data.ccEmails),
      poDate: new Date(data.poDate),
      deliveryMethod: data.deliveryMethod,
      paymentTerms: data.paymentTerms || null,
      currency: data.currency,
      preparedBy: data.preparedBy,
      taxRate: data.taxRate,
      grandTotal,
      status,
      pdfData: pdf,
      emailSentAt,
      emailMode:
        emailMode === "sent" || emailMode === "preview" ? emailMode : null,
      items: {
        create: data.items.map((it, idx) => ({
          itemCode: it.itemCode,
          description: it.description,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          lineTotal: computeLineTotal(it.quantity, it.unitPrice),
          sortOrder: idx,
        })),
      },
      statusEvents: {
        create: {
          type: status,
          label: statusLabel(status),
          note: !send
            ? "Purchase order saved as a draft (not sent)."
            : emailMode === "sent"
            ? "Purchase order emailed to supplier."
            : emailMode === "preview"
            ? "Purchase order created (email in preview mode)."
            : "Purchase order created (email sending failed).",
        },
      },
    },
    select: { id: true, poNumber: true },
  });

  return NextResponse.json({
    id: created.id,
    poNumber: created.poNumber,
    emailMode,
    emailMessage,
  });
}

// Simple list endpoint (the list page reads Prisma directly, but this is handy).
export async function GET() {
  const orders = await prisma.purchaseOrder.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ orders });
}
