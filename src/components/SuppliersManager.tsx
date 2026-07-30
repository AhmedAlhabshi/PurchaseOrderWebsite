"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type SupplierRow = {
  id: string;
  name: string;
  abbreviation: string;
  seq: number;
  seqYear: number;
  emails: string[];
  orderCount: number;
};

function splitEmails(text: string): string[] {
  return text
    .split(/[\n,]+/)
    .map((e) => e.trim())
    .filter(Boolean);
}

const YEAR = new Date().getFullYear();

function nextNumber(s: { abbreviation: string; seq: number; seqYear: number }) {
  const base = s.seqYear === YEAR ? s.seq : 0;
  const yr = String(YEAR % 1000).padStart(3, "0");
  return `PO-DIT-${yr}-${s.abbreviation}-${String(base + 1).padStart(3, "0")}`;
}

export default function SuppliersManager({
  suppliers,
}: {
  suppliers: SupplierRow[];
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [abbr, setAbbr] = useState("");
  const [num, setNum] = useState("0");
  const [emails, setEmails] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function addSupplier() {
    setError(null);
    if (!name.trim() || !abbr.trim()) {
      setError("Name and abbreviation are required.");
      return;
    }
    setAdding(true);
    try {
      const res = await fetch("/api/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          abbreviation: abbr,
          currentNumber: Number(num) || 0,
          emails: splitEmails(emails),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || "Could not add supplier.");
        setAdding(false);
        return;
      }
      setName("");
      setAbbr("");
      setEmails("");
      setNum("0");
      router.refresh();
    } catch {
      setError("Network error.");
    } finally {
      setAdding(false);
    }
  }

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Suppliers</h1>
      </div>

      {/* Add supplier */}
      <section className="card mb-6 p-5">
        <h2 className="mb-4 text-lg font-semibold text-slate-800">
          Add Supplier
        </h2>
        {error && (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <div className="sm:col-span-2">
            <label className="field-label">Supplier Name</label>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Tyrolit - Trade"
            />
          </div>
          <div>
            <label className="field-label">Abbreviation</label>
            <input
              className="input"
              value={abbr}
              onChange={(e) => setAbbr(e.target.value)}
              placeholder="TYR"
              maxLength={12}
            />
          </div>
          <div>
            <label className="field-label">Current Number</label>
            <input
              type="number"
              min="0"
              className="input"
              value={num}
              onChange={(e) => setNum(e.target.value)}
            />
          </div>
          <div className="sm:col-span-4">
            <label className="field-label">Emails (optional)</label>
            <textarea
              className="input"
              rows={2}
              value={emails}
              onChange={(e) => setEmails(e.target.value)}
              placeholder="one per line, or comma-separated — shown as choices when creating a PO"
            />
          </div>
        </div>
        <div className="mt-4">
          <button className="btn-primary" onClick={addSupplier} disabled={adding}>
            {adding ? "Saving…" : "Add Supplier"}
          </button>
        </div>
      </section>

      {/* List */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Supplier</th>
                <th className="px-4 py-3 font-semibold">Abbr.</th>
                <th className="px-4 py-3 font-semibold">Emails</th>
                <th className="px-4 py-3 font-semibold">Current #</th>
                <th className="px-4 py-3 font-semibold">Next PO Number</th>
                <th className="px-4 py-3 font-semibold">Orders</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {suppliers.map((s) =>
                editingId === s.id ? (
                  <EditRow
                    key={s.id}
                    supplier={s}
                    onDone={() => {
                      setEditingId(null);
                      router.refresh();
                    }}
                    onCancel={() => setEditingId(null)}
                  />
                ) : (
                  <tr key={s.id} className="hover:bg-brand-50/40">
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {s.name}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{s.abbreviation}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {s.emails.length ? s.emails.join(", ") : "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {s.seqYear === YEAR ? s.seq : 0}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-700">
                      {nextNumber(s)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{s.orderCount}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        className="btn-ghost px-3 py-1.5"
                        onClick={() => setEditingId(s.id)}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                )
              )}
              {suppliers.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                    No suppliers yet. Add one above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function EditRow({
  supplier,
  onDone,
  onCancel,
}: {
  supplier: SupplierRow;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(supplier.name);
  const [abbr, setAbbr] = useState(supplier.abbreviation);
  const [num, setNum] = useState(String(supplier.seqYear === YEAR ? supplier.seq : 0));
  const [emails, setEmails] = useState(supplier.emails.join("\n"));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/suppliers/${supplier.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          abbreviation: abbr,
          currentNumber: Number(num) || 0,
          emails: splitEmails(emails),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(data?.error || "Save failed.");
        setBusy(false);
        return;
      }
      onDone();
    } catch {
      setErr("Network error.");
      setBusy(false);
    }
  }

  async function remove() {
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/suppliers/${supplier.id}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(data?.error || "Delete failed.");
        setBusy(false);
        return;
      }
      onDone();
    } catch {
      setErr("Network error.");
      setBusy(false);
    }
  }

  return (
    <tr className="bg-brand-50/40">
      <td className="px-4 py-2">
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
        {err && <p className="error-text">{err}</p>}
      </td>
      <td className="px-4 py-2">
        <input
          className="input w-24"
          value={abbr}
          maxLength={12}
          onChange={(e) => setAbbr(e.target.value)}
        />
      </td>
      <td className="px-4 py-2">
        <textarea
          className="input min-w-[200px]"
          rows={2}
          value={emails}
          onChange={(e) => setEmails(e.target.value)}
          placeholder="one per line"
        />
      </td>
      <td className="px-4 py-2" colSpan={2}>
        <input
          type="number"
          min="0"
          className="input w-28"
          value={num}
          onChange={(e) => setNum(e.target.value)}
        />
      </td>
      <td className="px-4 py-2">
        {supplier.orderCount === 0 && (
          <button
            className="text-xs font-medium text-red-600 hover:underline"
            onClick={remove}
            disabled={busy}
          >
            Delete
          </button>
        )}
      </td>
      <td className="px-4 py-2 text-right">
        <div className="flex justify-end gap-1">
          <button className="btn-secondary px-3 py-1.5" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button className="btn-primary px-3 py-1.5" onClick={save} disabled={busy}>
            {busy ? "…" : "Save"}
          </button>
        </div>
      </td>
    </tr>
  );
}
