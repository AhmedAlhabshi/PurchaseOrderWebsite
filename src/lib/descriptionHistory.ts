export function normalizeDescription(description: string): string {
  return description.trim().replace(/\s+/g, " ").toLowerCase();
}

export type DescriptionHistoryEntry = {
  description: string;
  poId: string;
  poNumber: string;
  supplierName: string;
};

// Input is newest first so each normalized description keeps its latest PO.
export function uniqueDescriptionHistory(entries: DescriptionHistoryEntry[]): DescriptionHistoryEntry[] {
  const seen = new Set<string>();
  return entries.filter(entry => {
    const key = normalizeDescription(entry.description);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
