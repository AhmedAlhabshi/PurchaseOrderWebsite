import { prisma } from "@/lib/db";
import PreparersManager, { PreparerRow } from "@/components/PreparersManager";

export const dynamic = "force-dynamic";

export default async function PreparersPage() {
  const preparers = await prisma.preparer.findMany({ orderBy: { name: "asc" } });
  const rows: PreparerRow[] = preparers.map((p) => ({
    id: p.id,
    name: p.name,
    phone: p.phone,
    email: p.email,
  }));
  return <PreparersManager preparers={rows} />;
}
