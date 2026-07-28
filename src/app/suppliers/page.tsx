import { prisma } from "@/lib/db";
import SuppliersManager, { SupplierRow } from "@/components/SuppliersManager";

export const dynamic = "force-dynamic";

export default async function SuppliersPage() {
  const suppliers = await prisma.supplier.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { purchaseOrders: true } } },
  });

  const rows: SupplierRow[] = suppliers.map((s) => ({
    id: s.id,
    name: s.name,
    abbreviation: s.abbreviation,
    seq: s.seq,
    seqYear: s.seqYear,
    orderCount: s._count.purchaseOrders,
  }));

  return <SuppliersManager suppliers={rows} />;
}
