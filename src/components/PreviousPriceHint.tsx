import Link from "next/link";
import { formatAmount } from "@/lib/format";
import type { PriceDetails } from "@/lib/previousPrice";

export default function PreviousPriceHint({ previous }: { previous?: PriceDetails }) {
  if (!previous) return null;
  return <p className="mt-1 text-xs text-slate-600">
    Last ordered price: <span className="font-semibold">{formatAmount(previous.unitPrice, previous.currency)}</span>{" "}
    <Link href={`/purchase-orders/${previous.poId}`} target="_blank" rel="noopener noreferrer"
      title={`${previous.poNumber} — ${previous.supplierName}`} className="text-brand-600 underline">
      {previous.poNumber}
    </Link>
  </p>;
}
