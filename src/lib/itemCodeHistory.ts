import { normalizeDescription } from "./descriptionHistory";

export type ItemCodeHistoryEntry = {
  itemCode: string;
  poId: string;
  poNumber: string;
  supplierName: string;
};

export function uniqueItemCodeHistory(entries: ItemCodeHistoryEntry[]): ItemCodeHistoryEntry[] {
  const seen = new Set<string>();
  return entries.filter(entry => {
    const key = normalizeDescription(entry.itemCode);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
