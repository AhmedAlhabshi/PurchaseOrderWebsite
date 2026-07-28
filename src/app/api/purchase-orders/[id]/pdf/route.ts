import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Serves the stored PDF for a PO (saved in the database). ?download=1 forces a
// download.
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const po = await prisma.purchaseOrder.findUnique({
    where: { id: params.id },
    select: { poNumber: true, pdfData: true },
  });

  if (!po || !po.pdfData) {
    return NextResponse.json({ error: "PDF not found" }, { status: 404 });
  }

  const download = req.nextUrl.searchParams.get("download") === "1";
  const disposition = download ? "attachment" : "inline";
  const body = Buffer.from(po.pdfData);

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${disposition}; filename="${po.poNumber}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
