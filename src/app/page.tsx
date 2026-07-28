import { prisma } from "@/lib/db";
import POList, { PORow } from "@/components/POList";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const orders = await prisma.purchaseOrder.findMany({
    orderBy: { updatedAt: "desc" },
    include: { items: { select: { itemCode: true } } },
  });

  const rows: PORow[] = orders.map((o) => ({
    id: o.id,
    poNumber: o.poNumber,
    revision: o.revision,
    supplierName: o.supplierName,
    preparedBy: o.preparedBy,
    itemCodes: o.items.map((i) => i.itemCode),
    poDate: o.poDate.toISOString(),
    grandTotal: o.grandTotal,
    currency: o.currency,
    status: o.status,
    expectedShipping: o.expectedShipping?.toISOString() ?? null,
    expectedArrival: o.expectedArrival?.toISOString() ?? null,
    emailSentAt: o.emailSentAt?.toISOString() ?? null,
    updatedAt: o.updatedAt.toISOString(),
  }));

  return <POList orders={rows} />;
}
