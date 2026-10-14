import { normalizeDescription, uniqueDescriptionHistory, DescriptionHistoryEntry } from "./descriptionHistory";
import { uniqueItemCodeHistory, ItemCodeHistoryEntry } from "./itemCodeHistory";

export type PriceDetails = { unitPrice: number; currency: string; poId: string; poNumber: string; supplierName: string };
type PriceEntry = DescriptionHistoryEntry & ItemCodeHistoryEntry & PriceDetails;

export function buildPriceHistory(entries: PriceEntry[]) {
  // Zero is the existing form/database default for an unrecorded price.
  const priced = entries.filter(entry => Number.isFinite(entry.unitPrice) && entry.unitPrice > 0);
  return { byCode: uniqueItemCodeHistory(priced), byDescription: uniqueDescriptionHistory(priced) };
}

export type PriceHistory = ReturnType<typeof buildPriceHistory>;

export function previousPrice(itemCode: string, description: string,
  byCode: ReadonlyMap<string, PriceDetails>, byDescription: ReadonlyMap<string, PriceDetails>) {
  const code = normalizeDescription(itemCode);
  return code ? byCode.get(code) : byDescription.get(normalizeDescription(description));
}
