// Helpers to convert between the DB representation and plain objects.

export function parseCc(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function stringifyCc(list: string[]): string {
  return JSON.stringify(list.filter(Boolean));
}
