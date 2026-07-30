import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendPOEmail } from "@/lib/mailer";
import { renderPOPdf } from "@/lib/pdf";
import { parseCc } from "@/lib/serialize";
import { statusLabel } from "@/lib/status";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Sends the email for a saved draft PO, then marks it as PO Sent.
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const po = await prisma.purchaseOrder.findUnique({
    where: { id: params.id },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });
  if (!po) {
    return NextResponse.json({ error: "Purchase order not found" }, { status: 404 });
  }
  if (po.status !== "DRAFT") {
    return NextResponse.json(
      { error: "This purchase order has already been sent." },
      { status: 409 }
    );
  }

  const cc = parseCc(po.ccEmails);

  // Use the stored PDF, or regenerate if missing.
  let pdf: Buffer;
  if (po.pdfData) {
    pdf = Buffer.from(po.pdfData);
  } else {
    pdf = await renderPOPdf({
      poNumber: po.poNumber,
      revision: po.revision,
      supplierName: po.supplierName,
      attention: po.attention,
      mainEmail: po.mainEmail,
      ccEmails: cc,
      poDate: po.poDate,
      deliveryMethod: po.deliveryMethod,
      paymentTerms: po.paymentTerms,
      currency: po.currency,
      preparedBy: po.preparedBy,
      preparedByEmail: po.preparedByEmail,
      preparedByPhone: po.preparedByPhone,
      items: po.items,
      taxRate: po.taxRate,
      grandTotal: po.grandTotal,
    });
  }

  let emailMode: "sent" | "preview" | "failed" = "failed";
  let emailMessage = "";
  try {
    const result = await sendPOEmail({
      to: po.mainEmail,
      cc,
      subject: `Purchase Order - ${po.poNumber}`,
      poNumber: po.poNumber,
      supplierName: po.supplierName,
      attention: po.attention,
      preparedBy: po.preparedBy,
      pdf,
    });
    emailMode = result.mode;
    emailMessage = result.message;
  } catch (err) {
    return NextResponse.json(
      {
        error:
          "Sending failed: " +
          (err instanceof Error ? err.message : "unknown error"),
      },
      { status: 502 }
    );
  }

  await prisma.purchaseOrder.update({
    where: { id: po.id },
    data: {
      status: "PO_SENT",
      emailSentAt: new Date(),
      emailMode,
      statusEvents: {
        create: {
          type: "PO_SENT",
          label: statusLabel("PO_SENT"),
          note:
            emailMode === "sent"
              ? "Draft sent to supplier."
              : "Draft sent (email in preview mode).",
        },
      },
    },
  });

  return NextResponse.json({ ok: true, emailMode, emailMessage });
}
