import { prisma } from "@/lib/db";
import SuppliersManager, { SupplierRow } from "@/components/SuppliersManager";
import { parseCc } from "@/lib/serialize";

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
    emails: parseCc(s.emails),
    orderCount: s._count.purchaseOrders,
  }));

  return <SuppliersManager suppliers={rows} />;
}
