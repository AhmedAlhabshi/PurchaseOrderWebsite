"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  DELIVERY_METHODS,
  CURRENCIES,
  DEFAULT_PREPARED_BY,
  DEFAULT_CC_EMAILS,
} from "@/lib/options";
import { formatAmount } from "@/lib/format";

export type SupplierOption = {
  id: string;
  name: string;
  abbreviation: string;
  seq: number;
  seqYear: number;
  emails: string[];
};

export type POFormInitial = {
  supplierId: string;
  supplierName: string;
  attention: string;
  mainEmail: string;
  ccEmails: string[];
  poNumber: string;
  poDate: string;
  deliveryMethod: string;
  paymentTerms: string;
  currency: string;
  preparedBy: string;
  revision: number;
  taxRate: number;
  items: {
    itemCode: string;
    description: string;
    quantity: number;
    unitPrice: number;
  }[];
};

type ItemRow = {
  key: string;
  itemCode: string;
  description: string;
  quantity: string;
  unitPrice: string;
};

type Errors = Record<string, string>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const YEAR = new Date().getFullYear();

let keyCounter = 0;
const newKey = () => `row-${keyCounter++}`;

function emptyItem(): ItemRow {
  return {
    key: newKey(),
    itemCode: "",
    description: "",
    quantity: "",
    unitPrice: "",
  };
}

// Projected PO number for a supplier (mirrors the server logic, no DB access).
function projectedNumber(sup: SupplierOption): string {
  const base = sup.seqYear === YEAR ? sup.seq : 0;
  const yr = String(YEAR % 1000).padStart(3, "0");
  const seq = String(base + 1).padStart(3, "0");
  return `PO-DIT-${yr}-${sup.abbreviation}-${seq}`;
}

export default function POForm({
  mode,
  suppliers: initialSuppliers,
  today,
  poId,
  initial,
}: {
  mode: "create" | "edit";
  suppliers: SupplierOption[];
  today: string;
  poId?: string;
  initial?: POFormInitial;
}) {
  const router = useRouter();
  const isEdit = mode === "edit";

  const [suppliers, setSuppliers] = useState<SupplierOption[]>(initialSuppliers);
  const [supplierId, setSupplierId] = useState(initial?.supplierId || "");

  const [attention, setAttention] = useState(initial?.attention || "");
  const [mainEmail, setMainEmail] = useState(initial?.mainEmail || "");
  const [ccEmails, setCcEmails] = useState<string[]>(
    initial ? initial.ccEmails : [...DEFAULT_CC_EMAILS]
  );
  const [poDate, setPoDate] = useState(initial?.poDate || today);
  const [deliveryMethod, setDeliveryMethod] = useState<string>(
    initial ? deliveryPreset(initial.deliveryMethod) : "DHL"
  );
  const [deliveryOther, setDeliveryOther] = useState(
    initial && deliveryPreset(initial.deliveryMethod) === "Other"
      ? initial.deliveryMethod
      : ""
  );
  const [paymentTerms, setPaymentTerms] = useState(initial?.paymentTerms || "");
  const [currency, setCurrency] = useState<string>(initial?.currency || "USD");
  const [preparedBy, setPreparedBy] = useState(
    initial?.preparedBy || DEFAULT_PREPARED_BY
  );
  const [taxRate, setTaxRate] = useState(
    initial?.taxRate ? String(initial.taxRate) : ""
  );
  const [items, setItems] = useState<ItemRow[]>(
    initial && initial.items.length
      ? initial.items.map((it) => ({
          key: newKey(),
          itemCode: it.itemCode,
          description: it.description,
          quantity: String(it.quantity),
          unitPrice: String(it.unitPrice),
        }))
      : [emptyItem()]
  );

  const [errors, setErrors] = useState<Errors>({});
  const [view, setView] = useState<"edit" | "preview">("edit");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [banner, setBanner] = useState<{ type: "error" | "info"; text: string } | null>(
    null
  );
  const sendingRef = useRef(false);

  // Add-supplier modal
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [newSupName, setNewSupName] = useState("");
  const [newSupAbbr, setNewSupAbbr] = useState("");
  const [newSupNum, setNewSupNum] = useState("0");
  const [newSupEmails, setNewSupEmails] = useState("");
  const [addingSupplier, setAddingSupplier] = useState(false);
  const [addSupError, setAddSupError] = useState<string | null>(null);

  const selectedSupplier = suppliers.find((s) => s.id === supplierId) || null;
  const supplierEmails = selectedSupplier?.emails ?? [];

  // Picking a supplier prefills the main email from its known emails.
  function selectSupplier(id: string) {
    setSupplierId(id);
    const sup = suppliers.find((s) => s.id === id);
    if (sup && sup.emails.length > 0) setMainEmail(sup.emails[0]);
  }

  function addCcEmail(email: string) {
    const e = email.trim();
    if (!e) return;
    setCcEmails((cc) => (cc.includes(e) ? cc : [...cc, e]));
  }

  const poNumber = useMemo(() => {
    if (isEdit) return initial?.poNumber || "";
    return selectedSupplier ? projectedNumber(selectedSupplier) : "";
  }, [isEdit, initial, selectedSupplier]);

  const nextRevision = isEdit ? (initial?.revision ?? 0) + 1 : 0;

  // ----- Items helpers -----
  function updateItem(key: string, patch: Partial<ItemRow>) {
    setItems((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }
  function addItem() {
    setItems((rows) => [...rows, emptyItem()]);
  }
  function removeItem(key: string) {
    setItems((rows) => (rows.length > 1 ? rows.filter((r) => r.key !== key) : rows));
  }

  const lineTotal = (q: string, p: string) => {
    const qn = parseFloat(q);
    const pn = parseFloat(p);
    if (!Number.isFinite(qn) || !Number.isFinite(pn)) return 0;
    return Math.round(qn * pn * 100) / 100;
  };

  const { subtotal, taxTotal, grandTotal } = useMemo(() => {
    const r2 = (n: number) => Math.round(n * 100) / 100;
    const sub = r2(items.reduce((s, it) => s + lineTotal(it.quantity, it.unitPrice), 0));
    const rate = parseFloat(taxRate);
    const tax = Number.isFinite(rate) && rate > 0 ? r2((sub * rate) / 100) : 0;
    return { subtotal: sub, taxTotal: tax, grandTotal: r2(sub + tax) };
  }, [items, taxRate]);

  // ----- CC helpers -----
  const addCc = () => setCcEmails((cc) => [...cc, ""]);
  const updateCc = (i: number, val: string) =>
    setCcEmails((cc) => cc.map((c, idx) => (idx === i ? val : c)));
  const removeCc = (i: number) =>
    setCcEmails((cc) => cc.filter((_, idx) => idx !== i));

  // ----- Add supplier -----
  async function handleAddSupplier() {
    setAddSupError(null);
    if (!newSupName.trim() || !newSupAbbr.trim()) {
      setAddSupError("Name and abbreviation are required.");
      return;
    }
    const emailList = newSupEmails
      .split(/[\n,]+/)
      .map((e) => e.trim())
      .filter(Boolean);
    setAddingSupplier(true);
    try {
      const res = await fetch("/api/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newSupName,
          abbreviation: newSupAbbr,
          currentNumber: Number(newSupNum) || 0,
          emails: emailList,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAddSupError(data?.error || "Could not add supplier.");
        setAddingSupplier(false);
        return;
      }
      const raw = data.supplier;
      const sup: SupplierOption = {
        id: raw.id,
        name: raw.name,
        abbreviation: raw.abbreviation,
        seq: raw.seq,
        seqYear: raw.seqYear,
        emails: emailList,
      };
      setSuppliers((list) =>
        [...list, sup].sort((a, b) => a.name.localeCompare(b.name))
      );
      setSupplierId(sup.id);
      if (emailList.length > 0) setMainEmail(emailList[0]);
      setShowAddSupplier(false);
      setNewSupName("");
      setNewSupAbbr("");
      setNewSupNum("0");
      setNewSupEmails("");
    } catch {
      setAddSupError("Network error while adding supplier.");
    } finally {
      setAddingSupplier(false);
    }
  }

  // ----- Validation -----
  function validate(): Errors {
    const e: Errors = {};
    if (!supplierId) e.supplier = "Please choose a supplier";
    if (!mainEmail.trim()) e.mainEmail = "Main email is required";
    else if (!EMAIL_RE.test(mainEmail.trim())) e.mainEmail = "Main email is not valid";
    if (!poDate) e.poDate = "PO date is required";
    if (deliveryMethod === "Other" && !deliveryOther.trim())
      e.deliveryOther = "Please specify the delivery method";
    if (!currency) e.currency = "Currency is required";
    if (!preparedBy.trim()) e.preparedBy = "Prepared by is required";

    ccEmails.forEach((c, i) => {
      if (c.trim() && !EMAIL_RE.test(c.trim())) e[`cc-${i}`] = "Invalid email";
    });

    // Item fields are all optional. Only flag negative numbers when entered.
    items.forEach((it, i) => {
      if (it.quantity) {
        const qn = parseFloat(it.quantity);
        if (!Number.isFinite(qn) || qn < 0) e[`item-${i}-qty`] = "≥ 0";
      }
      if (it.unitPrice) {
        const pn = parseFloat(it.unitPrice);
        if (!Number.isFinite(pn) || pn < 0) e[`item-${i}-price`] = "≥ 0";
      }
    });

    if (taxRate) {
      const tn = parseFloat(taxRate);
      if (!Number.isFinite(tn) || tn < 0) e.taxRate = "≥ 0";
    }

    return e;
  }

  function buildPayload(send = true) {
    return {
      supplierId,
      revision: nextRevision,
      send,
      supplierName: selectedSupplier?.name || initial?.supplierName || "",
      attention: attention.trim(),
      mainEmail: mainEmail.trim(),
      ccEmails: ccEmails.map((c) => c.trim()).filter(Boolean),
      poNumber,
      poDate,
      deliveryMethod:
        deliveryMethod === "Other" ? deliveryOther.trim() : deliveryMethod,
      paymentTerms: paymentTerms.trim(),
      currency,
      preparedBy: preparedBy.trim(),
      taxRate: parseFloat(taxRate) || 0,
      items: mappedItems(),
    };
  }

  // Item fields are optional. Keep rows that have any content; if all are empty,
  // still send one blank row so the PDF can be generated.
  function mappedItems() {
    const num = (v: string) => {
      const n = parseFloat(v);
      return Number.isFinite(n) && n >= 0 ? n : 0;
    };
    const rows = items
      .filter(
        (it) =>
          it.itemCode.trim() || it.description.trim() || it.quantity || it.unitPrice
      )
      .map((it) => ({
        itemCode: it.itemCode.trim(),
        description: it.description.trim(),
        quantity: num(it.quantity),
        unitPrice: num(it.unitPrice),
      }));
    return rows.length > 0
      ? rows
      : [{ itemCode: "", description: "", quantity: 0, unitPrice: 0 }];
  }

  // ----- Actions -----
  async function handleGeneratePreview() {
    setBanner(null);
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) {
      setBanner({ type: "error", text: "Please fix the highlighted fields before previewing." });
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch("/api/preview-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });
      if (!res.ok) {
        setBanner({ type: "error", text: "Could not generate the preview. Please check the form." });
        setGenerating(false);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(url);
      setView("preview");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setBanner({ type: "error", text: "Network error while generating the preview." });
    } finally {
      setGenerating(false);
    }
  }

  async function handleApproveSend(send = true) {
    if (sendingRef.current) return;
    sendingRef.current = true;
    setSending(true);
    setBanner(null);
    try {
      const endpoint = isEdit
        ? `/api/purchase-orders/${poId}/revise`
        : `/api/purchase-orders`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload(send)),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setBanner({ type: "error", text: data?.error || "Failed to save the purchase order." });
        sendingRef.current = false;
        setSending(false);
        return;
      }
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      const id = isEdit ? poId : data.id;
      router.push(`/purchase-orders/${id}?${isEdit ? "revised" : "created"}=1`);
    } catch {
      setBanner({ type: "error", text: "Network error while sending. Please try again." });
      sendingRef.current = false;
      setSending(false);
    }
  }

  // ============================ PREVIEW VIEW ============================
  if (view === "preview") {
    return (
      <div>
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-slate-800">
            {isEdit ? "Preview Revised PO" : "Preview Purchase Order"}
          </h1>
          <p className="text-sm text-slate-500">
            Review the PDF below. Nothing is sent until you click{" "}
            <span className="font-semibold">
              {isEdit ? "Approve & Re-send" : "Approve & Send"}
            </span>
            .
          </p>
        </div>

        {banner && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {banner.text}
          </div>
        )}

        <div className="card mb-4 overflow-hidden">
          {previewUrl ? (
            <iframe title="PO Preview" src={previewUrl} className="h-[70vh] w-full" />
          ) : (
            <div className="p-10 text-center text-slate-500">No preview available.</div>
          )}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            className="btn-secondary btn-lg"
            onClick={() => setView("edit")}
            disabled={sending}
          >
            ← Back to Edit
          </button>
          {!isEdit && (
            <button
              type="button"
              className="btn-secondary btn-lg"
              onClick={() => handleApproveSend(false)}
              disabled={sending}
            >
              {sending ? "Saving…" : "Save without sending"}
            </button>
          )}
          <button
            type="button"
            className="btn-success btn-lg"
            onClick={() => handleApproveSend(true)}
            disabled={sending}
          >
            {sending
              ? "Sending…"
              : isEdit
              ? `Approve & Re-send (rev${nextRevision}) ✓`
              : "Approve & Send ✓"}
          </button>
        </div>
      </div>
    );
  }

  // ============================ EDIT/CREATE VIEW ============================
  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-800">
          {isEdit ? `Edit ${initial?.poNumber}` : "Create Purchase Order"}
        </h1>
        <Link href={isEdit ? `/purchase-orders/${poId}` : "/"} className="btn-ghost">
          ← {isEdit ? "Back to Details" : "All Orders"}
        </Link>
      </div>

      {isEdit && (
        <div className="mb-4 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-700">
          Saving will create <strong>revision {nextRevision}</strong> of{" "}
          {initial?.poNumber} (same number) and re-send the email.
        </div>
      )}

      {banner && (
        <div
          className={`mb-4 rounded-lg border px-4 py-3 text-sm ${
            banner.type === "error"
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-blue-200 bg-blue-50 text-blue-700"
          }`}
        >
          {banner.text}
        </div>
      )}

      {/* Order information */}
      <section className="card mb-5 p-5">
        <h2 className="mb-4 text-lg font-semibold text-slate-800">Order Information</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="field-label">Supplier Name *</label>
            <div className="flex gap-2">
              <select
                className={`input ${errors.supplier ? "input-invalid" : ""}`}
                value={supplierId}
                onChange={(e) => selectSupplier(e.target.value)}
              >
                <option value="">— Select supplier —</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.abbreviation})
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn-secondary whitespace-nowrap"
                onClick={() => setShowAddSupplier(true)}
              >
                + New
              </button>
            </div>
            {errors.supplier && <p className="error-text">{errors.supplier}</p>}
          </div>

          <div>
            <label className="field-label">Attention / Contact Person</label>
            <input
              className="input"
              value={attention}
              onChange={(e) => setAttention(e.target.value)}
              placeholder="e.g. Anil"
            />
          </div>

          <div>
            <label className="field-label">Main Email *</label>
            <input
              type="email"
              list="supplier-emails"
              className={`input ${errors.mainEmail ? "input-invalid" : ""}`}
              value={mainEmail}
              onChange={(e) => setMainEmail(e.target.value)}
              placeholder="supplier@example.com"
            />
            {supplierEmails.length > 0 && (
              <p className="mt-1 text-xs text-slate-500">
                Supplier emails (click to use as main):{" "}
                {supplierEmails.map((em) => (
                  <button
                    key={em}
                    type="button"
                    className="mr-1 rounded bg-brand-50 px-1.5 py-0.5 text-brand-700 hover:bg-brand-100"
                    onClick={() => setMainEmail(em)}
                  >
                    {em}
                  </button>
                ))}
              </p>
            )}
            {errors.mainEmail && <p className="error-text">{errors.mainEmail}</p>}
          </div>

          <div>
            <label className="field-label">CC Emails</label>
            {supplierEmails.length > 0 && (
              <p className="mb-1 text-xs text-slate-500">
                Add supplier email:{" "}
                {supplierEmails.map((em) => (
                  <button
                    key={em}
                    type="button"
                    className="mr-1 rounded bg-brand-50 px-1.5 py-0.5 text-brand-700 hover:bg-brand-100 disabled:opacity-40"
                    onClick={() => addCcEmail(em)}
                    disabled={ccEmails.includes(em)}
                  >
                    + {em}
                  </button>
                ))}
              </p>
            )}
            <div className="space-y-2">
              {ccEmails.map((cc, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    type="email"
                    list="supplier-emails"
                    className={`input ${errors[`cc-${i}`] ? "input-invalid" : ""}`}
                    value={cc}
                    onChange={(e) => updateCc(i, e.target.value)}
                    placeholder="cc@example.com"
                  />
                  <button
                    type="button"
                    className="btn-secondary px-3"
                    onClick={() => removeCc(i)}
                    aria-label="Remove CC email"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button type="button" className="btn-ghost px-2 py-1 text-sm" onClick={addCc}>
                + Add CC email
              </button>
            </div>
          </div>

          {/* Shared datalist of the selected supplier's emails */}
          <datalist id="supplier-emails">
            {supplierEmails.map((em) => (
              <option key={em} value={em} />
            ))}
          </datalist>

          <div>
            <label className="field-label">
              PO Number {isEdit ? "" : "(auto)"}
            </label>
            <input
              className="input bg-slate-50"
              value={
                poNumber ||
                (isEdit ? "" : "Select a supplier to generate the number")
              }
              readOnly
            />
            {isEdit && (
              <p className="mt-1 text-xs text-slate-500">
                Number stays the same; this edit becomes rev{nextRevision}.
              </p>
            )}
          </div>

          <div>
            <label className="field-label">PO Date *</label>
            <input
              type="date"
              className={`input ${errors.poDate ? "input-invalid" : ""}`}
              value={poDate}
              onChange={(e) => setPoDate(e.target.value)}
            />
            {errors.poDate && <p className="error-text">{errors.poDate}</p>}
          </div>

          <div>
            <label className="field-label">Delivery Method *</label>
            <select
              className="input"
              value={deliveryMethod}
              onChange={(e) => setDeliveryMethod(e.target.value)}
            >
              {DELIVERY_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            {deliveryMethod === "Other" && (
              <input
                className={`input mt-2 ${errors.deliveryOther ? "input-invalid" : ""}`}
                value={deliveryOther}
                onChange={(e) => setDeliveryOther(e.target.value)}
                placeholder="Specify delivery method"
              />
            )}
            {errors.deliveryOther && <p className="error-text">{errors.deliveryOther}</p>}
          </div>

          <div>
            <label className="field-label">Payment Terms</label>
            <input
              className="input"
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value)}
              placeholder="e.g. Cash / 30 days"
            />
          </div>

          <div>
            <label className="field-label">Currency *</label>
            <select
              className="input"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="field-label">Prepared By *</label>
            <input
              className={`input ${errors.preparedBy ? "input-invalid" : ""}`}
              value={preparedBy}
              onChange={(e) => setPreparedBy(e.target.value)}
              placeholder="Your name"
            />
            {errors.preparedBy && <p className="error-text">{errors.preparedBy}</p>}
          </div>

          <div>
            <label className="field-label">Tax % (whole order, optional)</label>
            <input
              type="number"
              min="0"
              step="any"
              className={`input ${errors.taxRate ? "input-invalid" : ""}`}
              value={taxRate}
              onChange={(e) => setTaxRate(e.target.value)}
              placeholder="e.g. 15"
            />
            {errors.taxRate && <p className="error-text">{errors.taxRate}</p>}
          </div>
        </div>
      </section>

      {/* Items */}
      <section className="card mb-5 p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">Items</h2>
          <button type="button" className="btn-secondary" onClick={addItem}>
            + Add Item
          </button>
        </div>
        {errors.items && <p className="error-text mb-2">{errors.items}</p>}

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-2 py-2">Item Code</th>
                <th className="px-2 py-2">Description</th>
                <th className="px-2 py-2 w-32">Qty</th>
                <th className="px-2 py-2 w-32">Unit Price</th>
                <th className="px-2 py-2 w-32 text-right">Line Total</th>
                <th className="px-2 py-2 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => (
                <tr key={it.key} className="align-top">
                  <td className="px-2 py-1.5">
                    <input
                      className={`input ${errors[`item-${i}-code`] ? "input-invalid" : ""}`}
                      value={it.itemCode}
                      onChange={(e) => updateItem(it.key, { itemCode: e.target.value })}
                      placeholder="Code"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      className={`input ${errors[`item-${i}-desc`] ? "input-invalid" : ""}`}
                      value={it.description}
                      onChange={(e) => updateItem(it.key, { description: e.target.value })}
                      placeholder="Description"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      className={`input text-right ${errors[`item-${i}-qty`] ? "input-invalid" : ""}`}
                      value={it.quantity}
                      onChange={(e) => updateItem(it.key, { quantity: e.target.value })}
                      placeholder="0"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      className={`input text-right ${errors[`item-${i}-price`] ? "input-invalid" : ""}`}
                      value={it.unitPrice}
                      onChange={(e) => updateItem(it.key, { unitPrice: e.target.value })}
                      placeholder="0.00"
                    />
                  </td>
                  <td className="px-2 py-1.5 text-right font-medium text-slate-800">
                    {formatAmount(lineTotal(it.quantity, it.unitPrice), currency)}
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <button
                      type="button"
                      className="rounded-md px-2 py-1 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                      onClick={() => removeItem(it.key)}
                      disabled={items.length === 1}
                      aria-label="Remove item"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3} rowSpan={3} className="hidden sm:table-cell"></td>
                <td className="px-2 pt-3 text-right text-slate-500">Subtotal</td>
                <td className="px-2 pt-3 text-right font-medium text-slate-700">
                  {formatAmount(subtotal, currency)}
                </td>
                <td></td>
              </tr>
              <tr>
                <td className="px-2 py-1 text-right text-slate-500">
                  {parseFloat(taxRate) > 0 ? `Tax (${parseFloat(taxRate)}%)` : "Tax"}
                </td>
                <td className="px-2 py-1 text-right font-medium text-slate-700">
                  {formatAmount(taxTotal, currency)}
                </td>
                <td></td>
              </tr>
              <tr>
                <td className="px-2 pb-3 text-right font-semibold text-slate-700">
                  Grand Total
                </td>
                <td className="px-2 pb-3 text-right text-lg font-bold text-brand-600">
                  {formatAmount(grandTotal, currency)}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      {/* Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <Link
          href={isEdit ? `/purchase-orders/${poId}` : "/"}
          className="btn-secondary btn-lg text-center"
        >
          Cancel
        </Link>
        <button
          type="button"
          className="btn-primary btn-lg"
          onClick={handleGeneratePreview}
          disabled={generating}
        >
          {generating
            ? "Generating…"
            : isEdit
            ? "Generate Revision & Preview"
            : "Generate PO & Preview"}
        </button>
      </div>

      {/* Add supplier modal */}
      {showAddSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="card w-full max-w-md p-5">
            <h3 className="mb-4 text-lg font-semibold text-slate-800">
              Add New Supplier
            </h3>
            {addSupError && (
              <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {addSupError}
              </div>
            )}
            <div className="space-y-3">
              <div>
                <label className="field-label">Supplier Name *</label>
                <input
                  className="input"
                  value={newSupName}
                  onChange={(e) => setNewSupName(e.target.value)}
                  placeholder="e.g. Tyrolit - Trade"
                />
              </div>
              <div>
                <label className="field-label">Abbreviation * (for PO number)</label>
                <input
                  className="input uppercase"
                  value={newSupAbbr}
                  onChange={(e) => setNewSupAbbr(e.target.value.toUpperCase())}
                  placeholder="e.g. TYR"
                  maxLength={6}
                />
              </div>
              <div>
                <label className="field-label">Current Number (from Excel)</label>
                <input
                  type="number"
                  min="0"
                  className="input"
                  value={newSupNum}
                  onChange={(e) => setNewSupNum(e.target.value)}
                  placeholder="0"
                />
                <p className="mt-1 text-xs text-slate-500">
                  The last PO number already used for this supplier this year. The
                  next PO will continue from here (e.g. 18 → next is 019).
                </p>
              </div>
              <div>
                <label className="field-label">Supplier Emails (optional)</label>
                <textarea
                  className="input"
                  rows={2}
                  value={newSupEmails}
                  onChange={(e) => setNewSupEmails(e.target.value)}
                  placeholder="one per line, or comma-separated"
                />
                <p className="mt-1 text-xs text-slate-500">
                  These show up as choices for Main Email and CC when this supplier
                  is selected.
                </p>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowAddSupplier(false)}
                disabled={addingSupplier}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleAddSupplier}
                disabled={addingSupplier}
              >
                {addingSupplier ? "Saving…" : "Save Supplier"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Map a stored delivery method back to the select preset (or "Other").
function deliveryPreset(method: string): string {
  return (DELIVERY_METHODS as readonly string[]).includes(method) ? method : "Other";
}
