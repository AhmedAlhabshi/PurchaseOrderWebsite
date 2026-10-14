import { requireUser } from "@/lib/auth";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import POForm, {
  SupplierOption,
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
  await requireUser(`/purchase-orders/${params.id}/edit`);
  const [po, suppliers] = await Promise.all([
    prisma.purchaseOrder.findUnique({
      where: { id: params.id },
      include: { items: { orderBy: { sortOrder: "asc" } } },
    }),
    prisma.supplier.findMany({ orderBy: { name: "asc" } }),
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
    emailBody: po.emailBody,
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
      preparer={{ name: po.preparedBy, email: po.preparedByEmail, phone: po.preparedByPhone }}
      today={today}
      poId={po.id}
      initial={initial}
    />
  );
}
