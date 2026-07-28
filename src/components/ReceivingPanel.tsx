"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatNumber } from "@/lib/format";

export type ReceivingItem = {
  id: string;
  itemCode: string;
  description: string;
  quantity: number;
  receivedQty: number;
};

export default function ReceivingPanel({
  poId,
  items,
}: {
  poId: string;
  items: ReceivingItem[];
}) {
  const router = useRouter();

  return (
    <div className="space-y-3">
      {items.map((it) => (
        <ItemReceiveRow key={it.id} item={it} poId={poId} onDone={() => router.refresh()} />
      ))}
    </div>
  );
}

function ItemReceiveRow({
  item,
  poId,
  onDone,
}: {
  item: ReceivingItem;
  poId: string;
  onDone: () => void;
}) {
  const remaining = Math.max(item.quantity - item.receivedQty, 0);
  const fullyReceived = remaining <= 1e-9;
  const [qty, setQty] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pct = item.quantity > 0 ? Math.min((item.receivedQty / item.quantity) * 100, 100) : 0;

  async function receive(amount: number) {
    setError(null);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter a quantity greater than 0.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/purchase-orders/${poId}/receive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: item.id, quantity: amount }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || "Could not record the delivery.");
        setBusy(false);
        return;
      }
      setQty("");
      onDone();
    } catch {
      setError("Network error. Please try again.");
      setBusy(false);
    }
  }

  return (
    <div
      className={`rounded-lg border p-3 ${
        fullyReceived ? "border-green-200 bg-green-50" : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-medium text-slate-800">{item.itemCode}</div>
          <div className="text-xs text-slate-500">{item.description}</div>
        </div>
        {fullyReceived && (
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
            Received
          </span>
        )}
      </div>

      {/* Progress */}
      <div className="mt-2">
        <div className="flex justify-between text-xs text-slate-500">
          <span>
            Received {formatNumber(item.receivedQty)} / {formatNumber(item.quantity)}
          </span>
          <span>{formatNumber(remaining)} remaining</span>
        </div>
        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className={`h-full ${fullyReceived ? "bg-green-500" : "bg-amber-500"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {error && <p className="error-text">{error}</p>}

      {!fullyReceived && (
        <div className="mt-2 flex gap-2">
          <input
            type="number"
            min="0"
            step="any"
            className="input"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            placeholder={`Qty (max ${formatNumber(remaining)})`}
          />
          <button
            type="button"
            className="btn-secondary whitespace-nowrap"
            onClick={() => receive(parseFloat(qty))}
            disabled={busy}
          >
            {busy ? "…" : "Receive"}
          </button>
          <button
            type="button"
            className="btn-success whitespace-nowrap"
            onClick={() => receive(remaining)}
            disabled={busy}
            title="Receive all remaining"
          >
            All
          </button>
        </div>
      )}
    </div>
  );
}
