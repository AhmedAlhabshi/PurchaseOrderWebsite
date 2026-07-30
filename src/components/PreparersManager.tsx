"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type PreparerRow = {
  id: string;
  name: string;
  phone: string;
  email: string;
};

export default function PreparersManager({
  preparers,
}: {
  preparers: PreparerRow[];
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function add() {
    setError(null);
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    setAdding(true);
    try {
      const res = await fetch("/api/preparers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || "Could not add preparer.");
        setAdding(false);
        return;
      }
      setName("");
      setPhone("");
      setEmail("");
      router.refresh();
    } catch {
      setError("Network error.");
    } finally {
      setAdding(false);
    }
  }

  return (
    <div>
      <h1 className="mb-5 text-2xl font-bold text-slate-800">Preparers</h1>

      <section className="card mb-6 p-5">
        <h2 className="mb-4 text-lg font-semibold text-slate-800">Add Preparer</h2>
        {error && (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className="field-label">Name</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Abdulbari" />
          </div>
          <div>
            <label className="field-label">Phone</label>
            <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+966 5x xxx xxxx" />
          </div>
          <div>
            <label className="field-label">Email</label>
            <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@diamondtools-est.com" />
          </div>
        </div>
        <div className="mt-4">
          <button className="btn-primary" onClick={add} disabled={adding}>
            {adding ? "Saving…" : "Add Preparer"}
          </button>
        </div>
      </section>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Phone</th>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {preparers.map((p) =>
                editingId === p.id ? (
                  <EditRow
                    key={p.id}
                    preparer={p}
                    onDone={() => {
                      setEditingId(null);
                      router.refresh();
                    }}
                    onCancel={() => setEditingId(null)}
                  />
                ) : (
                  <tr key={p.id} className="hover:bg-brand-50/40">
                    <td className="px-4 py-3 font-medium text-slate-800">{p.name}</td>
                    <td className="px-4 py-3 text-slate-600">{p.phone || "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{p.email || "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <button className="btn-ghost px-3 py-1.5" onClick={() => setEditingId(p.id)}>
                        Edit
                      </button>
                    </td>
                  </tr>
                )
              )}
              {preparers.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-slate-500">
                    No preparers yet. Add one above.
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
  preparer,
  onDone,
  onCancel,
}: {
  preparer: PreparerRow;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(preparer.name);
  const [phone, setPhone] = useState(preparer.phone);
  const [email, setEmail] = useState(preparer.email);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/preparers/${preparer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, email }),
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
    setBusy(true);
    try {
      const res = await fetch(`/api/preparers/${preparer.id}`, { method: "DELETE" });
      if (!res.ok) {
        setErr("Delete failed.");
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
        <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} />
      </td>
      <td className="px-4 py-2">
        <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
      </td>
      <td className="px-4 py-2 text-right">
        <div className="flex justify-end gap-1">
          <button className="text-xs font-medium text-red-600 hover:underline" onClick={remove} disabled={busy}>
            Delete
          </button>
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
