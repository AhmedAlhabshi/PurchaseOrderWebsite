import { normalizeDescription } from "./descriptionHistory";

// Each search term must occur in the selected field, without requiring
// adjacent words. Numeric dimensions and punctuation remain intact.
export function matchesSearch(value: string, query: string): boolean {
  const normalized = normalizeDescription(value);
  const terms = normalizeDescription(query).split(" ").filter(Boolean);
  return terms.every(term => normalized.includes(term));
}
