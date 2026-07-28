"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  poId: string;
  expectedShipping: string | null; // YYYY-MM-DD or ""
  expectedArrival: string | null;
  confirmed: boolean;
};

export default function TrackingPanel({
  poId,
  expectedShipping,
  expectedArrival,
  confirmed,
}: Props) {
  const router = useRouter();
  const [shipping, setShipping] = useState(expectedShipping || "");
  const [arrival, setArrival] = useState(expectedArrival || "");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function call(action: string, body: Record<string, unknown> = {}) {
    setBusy(action);
    setError(null);
    try {
      const res = await fetch(`/api/purchase-orders/${poId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...body }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || "Update failed.");
        setBusy(null);
        return;
      }
      if (action === "add_note") setNote("");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {!confirmed && (
        <button
          type="button"
          className="btn-primary w-full"
          onClick={() => call("confirm_order")}
          disabled={busy !== null}
        >
          {busy === "confirm_order" ? "Saving…" : "Confirm Order ✓"}
        </button>
      )}

      <div>
        <label className="field-label">Expected Shipping Date</label>
        <div className="flex gap-2">
          <input
            type="date"
            className="input"
            value={shipping}
            onChange={(e) => setShipping(e.target.value)}
          />
          <button
            type="button"
            className="btn-secondary whitespace-nowrap"
            onClick={() => call("set_shipping", { date: shipping })}
            disabled={busy !== null || !shipping}
          >
            {busy === "set_shipping" ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      <div>
        <label className="field-label">Expected Arrival Date</label>
        <div className="flex gap-2">
          <input
            type="date"
            className="input"
            value={arrival}
            onChange={(e) => setArrival(e.target.value)}
          />
          <button
            type="button"
            className="btn-secondary whitespace-nowrap"
            onClick={() => call("set_arrival", { date: arrival })}
            disabled={busy !== null || !arrival}
          >
            {busy === "set_arrival" ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      <div>
        <label className="field-label">Add a note (optional)</label>
        <textarea
          className="input"
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. Supplier confirmed by phone…"
        />
        <button
          type="button"
          className="btn-secondary mt-2 w-full"
          onClick={() => call("add_note", { note })}
          disabled={busy !== null || !note.trim()}
        >
          {busy === "add_note" ? "Saving…" : "Add Note"}
        </button>
      </div>
    </div>
  );
}
