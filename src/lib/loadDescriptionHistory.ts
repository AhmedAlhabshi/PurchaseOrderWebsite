import { prisma } from "./db";
import { uniqueDescriptionHistory } from "./descriptionHistory";
import { uniqueItemCodeHistory } from "./itemCodeHistory";
import { buildPriceHistory } from "./previousPrice";

export async function loadItemHistory(excludePoId?: string) {
  const items = await prisma.pOItem.findMany({
    where: {
      po: { status: { not: "DRAFT" }, ...(excludePoId ? { id: { not: excludePoId } } : {}) },
    },
    orderBy: { po: { createdAt: "desc" } },
    select: {
      description: true,
      itemCode: true,
      unitPrice: true,
      po: { select: { id: true, poNumber: true, supplierName: true, currency: true } },
    },
  });
  const entries = items.map(item => ({
    description: item.description,
    itemCode: item.itemCode,
    unitPrice: item.unitPrice,
    currency: item.po.currency,
    poId: item.po.id,
    poNumber: item.po.poNumber,
    supplierName: item.po.supplierName,
  }));
  return {
    descriptionHistory: uniqueDescriptionHistory(entries),
    itemCodeHistory: uniqueItemCodeHistory(entries),
    priceHistory: buildPriceHistory(entries),
  };
}

export async function loadDescriptionHistory(excludePoId?: string) {
  return (await loadItemHistory(excludePoId)).descriptionHistory;
}
