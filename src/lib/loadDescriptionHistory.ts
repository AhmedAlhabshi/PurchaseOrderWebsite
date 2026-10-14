import { prisma } from "./db";
import { uniqueDescriptionHistory } from "./descriptionHistory";

export async function loadDescriptionHistory(excludePoId?: string) {
  const items = await prisma.pOItem.findMany({
    where: {
      po: { status: { not: "DRAFT" }, ...(excludePoId ? { id: { not: excludePoId } } : {}) },
    },
    orderBy: { po: { createdAt: "desc" } },
    select: {
      description: true,
      po: { select: { id: true, poNumber: true, supplierName: true } },
    },
  });
  return uniqueDescriptionHistory(items.map(item => ({
    description: item.description,
    poId: item.po.id,
    poNumber: item.po.poNumber,
    supplierName: item.po.supplierName,
  })));
}
