import Link from "next/link";
import { normalizeDescription } from "@/lib/descriptionHistory";

export default function ItemHistoryHint({ value, previous }: {
  value: string;
  previous?: { poId: string; poNumber: string; supplierName: string };
}) {
  if (!normalizeDescription(value)) return null;
  return previous ? (
    <p className="mt-1 text-xs text-green-700">
      ✓ Previously ordered —{" "}
      <Link href={`/purchase-orders/${previous.poId}`} target="_blank" rel="noopener noreferrer"
        className="font-semibold underline hover:text-green-900" title={`Last ordered from ${previous.supplierName}`}>
        {previous.poNumber}
      </Link>
    </p>
  ) : <p className="mt-1 text-xs text-slate-500">New — not previously ordered</p>;
}
