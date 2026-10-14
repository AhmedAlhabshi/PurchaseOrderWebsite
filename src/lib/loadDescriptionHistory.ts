import { prisma } from "./db";
import { uniqueDescriptionHistory } from "./descriptionHistory";
import { uniqueItemCodeHistory } from "./itemCodeHistory";

export async function loadItemHistory(excludePoId?: string) {
  const items = await prisma.pOItem.findMany({
    where: {
      po: { status: { not: "DRAFT" }, ...(excludePoId ? { id: { not: excludePoId } } : {}) },
    },
    orderBy: { po: { createdAt: "desc" } },
    select: {
      description: true,
      itemCode: true,
      po: { select: { id: true, poNumber: true, supplierName: true } },
    },
  });
  const entries = items.map(item => ({
    description: item.description,
    itemCode: item.itemCode,
    poId: item.po.id,
    poNumber: item.po.poNumber,
    supplierName: item.po.supplierName,
  }));
  return {
    descriptionHistory: uniqueDescriptionHistory(entries),
    itemCodeHistory: uniqueItemCodeHistory(entries),
  };
}

export async function loadDescriptionHistory(excludePoId?: string) {
  return (await loadItemHistory(excludePoId)).descriptionHistory;
}
