import Link from "next/link";
import POForm, { SupplierOption, PreparerOption } from "@/components/POForm";
import { prisma } from "@/lib/db";
import { parseCc } from "@/lib/serialize";

export const dynamic = "force-dynamic";

export default async function NewPOPage() {
  const [suppliers, preparers] = await Promise.all([
    prisma.supplier.findMany({ orderBy: { name: "asc" } }),
    prisma.preparer.findMany({ orderBy: { name: "asc" } }),
  ]);
  const today = new Date().toISOString().slice(0, 10);

  const options: SupplierOption[] = suppliers.map((s) => ({
    id: s.id,
    name: s.name,
    abbreviation: s.abbreviation,
    seq: s.seq,
    seqYear: s.seqYear,
    emails: parseCc(s.emails),
  }));

  const preparerOptions: PreparerOption[] = preparers.map((p) => ({
    id: p.id,
    name: p.name,
    phone: p.phone,
    email: p.email,
  }));

  if (options.length === 0) {
    return (
      <div className="card mx-auto max-w-lg p-8 text-center">
        <h1 className="text-xl font-bold text-slate-800">No suppliers yet</h1>
        <p className="mt-2 text-sm text-slate-500">
          Add at least one supplier (with an abbreviation) before creating a
          purchase order — the PO number is built from the supplier abbreviation.
        </p>
        <Link href="/suppliers" className="btn-primary mt-5">
          Go to Suppliers
        </Link>
      </div>
    );
  }

  return (
    <POForm
      mode="create"
      suppliers={options}
      preparers={preparerOptions}
      today={today}
    />
  );
}
