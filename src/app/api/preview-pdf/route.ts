import { NextRequest, NextResponse } from "next/server";
import { poInputSchema, computeGrandTotal } from "@/lib/validation";
import { renderPOPdf } from "@/lib/pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Generates the PO PDF from the current form data WITHOUT saving anything.
// Used for the "Generate PO & Preview" step.
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
  const grandTotal = computeGrandTotal(data.items, data.taxRate);

  const pdf = await renderPOPdf({
    poNumber: data.poNumber,
    revision: data.revision,
    supplierName: data.supplierName,
    attention: data.attention,
    mainEmail: data.mainEmail,
    ccEmails: data.ccEmails,
    poDate: data.poDate,
    deliveryMethod: data.deliveryMethod,
    paymentTerms: data.paymentTerms,
    currency: data.currency,
    preparedBy: data.preparedBy,
    preparedByEmail: data.preparedByEmail,
    preparedByPhone: data.preparedByPhone,
    items: data.items,
    taxRate: data.taxRate,
    grandTotal,
  });

  return new NextResponse(pdf, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${data.poNumber}-preview.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
