"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function SendEmailButton({
  poId,
  mainEmail,
}: {
  poId: string;
  mainEmail: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sendingRef = useRef(false);

  async function send() {
    if (sendingRef.current) return; // prevent double-send
    sendingRef.current = true;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/purchase-orders/${poId}/send`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || "Sending failed.");
        sendingRef.current = false;
        setBusy(false);
        return;
      }
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      sendingRef.current = false;
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1 sm:items-end">
      <button
        type="button"
        className="btn-success"
        onClick={send}
        disabled={busy}
        title={`Send to ${mainEmail}`}
      >
        {busy ? "Sending…" : "Send Email ✓"}
      </button>
      {error && <span className="text-xs font-medium text-red-600">{error}</span>}
    </div>
  );
}
