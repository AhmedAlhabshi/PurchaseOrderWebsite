// Only return to pages in this application; reject external or ambiguous URLs.
export function safeReturnTo(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || /[\\\x00-\x20]/.test(value)) return "/";
  try {
    const url = new URL(value, "https://purchase-orders.local");
    if (url.origin !== "https://purchase-orders.local" || ["/login", "/register"].includes(url.pathname) || url.pathname.startsWith("/api/")) return "/";
    return url.pathname + url.search;
  } catch { return "/"; }
}

export function loginHref(next: string): string {
  return `/login?next=${encodeURIComponent(safeReturnTo(next))}`;
}
