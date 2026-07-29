"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeletePOButton({
  poId,
  poNumber,
}: {
  poId: string;
  poNumber: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmDelete() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/purchase-orders/${poId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error || "Delete failed.");
        setBusy(false);
        return;
      }
      // Go back to the list (and refresh server data).
      router.push("/");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className="btn border border-red-300 bg-white text-red-600 hover:bg-red-50 focus:ring-red-300"
        onClick={() => setOpen(true)}
      >
        Delete
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="card w-full max-w-sm p-5">
            <h3 className="text-lg font-semibold text-slate-800">
              Delete {poNumber}?
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              This permanently deletes the purchase order, its items, delivery
              records and history. This cannot be undone.
            </p>
            {error && (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setOpen(false)}
                disabled={busy}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn bg-red-600 text-white hover:bg-red-700 focus:ring-red-500"
                onClick={confirmDelete}
                disabled={busy}
              >
                {busy ? "Deleting…" : "Delete permanently"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
