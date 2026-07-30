import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import POForm, {
  SupplierOption,
  PreparerOption,
  POFormInitial,
} from "@/components/POForm";
import { parseCc } from "@/lib/serialize";
import { toDateInputValue } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function EditPOPage({
  params,
}: {
  params: { id: string };
}) {
  const [po, suppliers, preparers] = await Promise.all([
    prisma.purchaseOrder.findUnique({
      where: { id: params.id },
      include: { items: { orderBy: { sortOrder: "asc" } } },
    }),
    prisma.supplier.findMany({ orderBy: { name: "asc" } }),
    prisma.preparer.findMany({ orderBy: { name: "asc" } }),
  ]);

  if (!po) notFound();

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

  const initial: POFormInitial = {
    supplierId: po.supplierId || "",
    supplierName: po.supplierName,
    attention: po.attention || "",
    mainEmail: po.mainEmail,
    ccEmails: parseCc(po.ccEmails),
    poNumber: po.poNumber,
    poDate: toDateInputValue(po.poDate),
    deliveryMethod: po.deliveryMethod,
    paymentTerms: po.paymentTerms || "",
    currency: po.currency,
    preparedBy: po.preparedBy,
    preparedByEmail: po.preparedByEmail,
    preparedByPhone: po.preparedByPhone,
    revision: po.revision,
    taxRate: po.taxRate,
    items: po.items.map((it) => ({
      itemCode: it.itemCode,
      description: it.description,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
    })),
  };

  const today = new Date().toISOString().slice(0, 10);

  return (
    <POForm
      mode="edit"
      suppliers={options}
      preparers={preparerOptions}
      today={today}
      poId={po.id}
      initial={initial}
    />
  );
}
