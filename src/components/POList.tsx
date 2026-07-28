"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import StatusBadge from "./StatusBadge";
import { STATUS_ORDER, statusLabel } from "@/lib/status";
import { formatAmount, formatDate, formatDateTime } from "@/lib/format";

export type PORow = {
  id: string;
  poNumber: string;
  revision: number;
  supplierName: string;
  preparedBy: string;
  itemCodes: string[];
  poDate: string;
  grandTotal: number;
  currency: string;
  status: string;
  expectedShipping: string | null;
  expectedArrival: string | null;
  emailSentAt: string | null;
  updatedAt: string;
};

const SEARCH_FIELDS = [
  { key: "all", label: "All fields" },
  { key: "ponumber", label: "PO Number" },
  { key: "supplier", label: "Supplier" },
  { key: "itemcode", label: "Item Code" },
  { key: "preparedby", label: "Prepared By" },
  { key: "sent", label: "Sent Date" },
  { key: "arrival", label: "Arrival Date" },
] as const;

type FieldKey = (typeof SEARCH_FIELDS)[number]["key"];

function fieldHaystack(o: PORow, field: FieldKey): string {
  switch (field) {
    case "ponumber":
      return o.poNumber;
    case "supplier":
      return o.supplierName;
    case "itemcode":
      return o.itemCodes.join(" ");
    case "preparedby":
      return o.preparedBy;
    case "sent":
      return formatDate(o.emailSentAt) + " " + (o.emailSentAt || "");
    case "arrival":
      return formatDate(o.expectedArrival) + " " + (o.expectedArrival || "");
    case "all":
    default:
      return [
        o.poNumber,
        o.supplierName,
        o.preparedBy,
        o.itemCodes.join(" "),
        formatDate(o.poDate),
        formatDate(o.emailSentAt),
        formatDate(o.expectedShipping),
        formatDate(o.expectedArrival),
        statusLabel(o.status),
      ].join(" ");
  }
}

export default function POList({ orders }: { orders: PORow[] }) {
  const [query, setQuery] = useState("");
  const [field, setField] = useState<FieldKey>("all");
  const [status, setStatus] = useState("ALL");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return orders.filter((o) => {
      const matchesQuery = !q || fieldHaystack(o, field).toLowerCase().includes(q);
      const matchesStatus = status === "ALL" || o.status === status;
      return matchesQuery && matchesStatus;
    });
  }, [orders, query, field, status]);

  return (
    <div>
      <div className="mb-5 flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-slate-800">Purchase Orders</h1>
        <p className="text-sm text-slate-500">
          {orders.length} order{orders.length === 1 ? "" : "s"} total
        </p>
      </div>

      {/* Controls */}
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-12">
        <div className="relative sm:col-span-5">
          <input
            className="input pl-9"
            placeholder="Search…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <svg
            className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.45 4.39l3.58 3.58a1 1 0 01-1.42 1.42l-3.58-3.58A7 7 0 012 9z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <select
          className="input sm:col-span-3"
          value={field}
          onChange={(e) => setField(e.target.value as FieldKey)}
          aria-label="Search field"
        >
          {SEARCH_FIELDS.map((f) => (
            <option key={f.key} value={f.key}>
              Search: {f.label}
            </option>
          ))}
        </select>
        <select
          className="input sm:col-span-2"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          aria-label="Status filter"
        >
          <option value="ALL">All statuses</option>
          {STATUS_ORDER.map((s) => (
            <option key={s} value={s}>
              {statusLabel(s)}
            </option>
          ))}
        </select>
        <Link
          href="/purchase-orders/new"
          className="btn-primary sm:col-span-2 text-center"
        >
          + Create PO
        </Link>
      </div>

      {/* Table (desktop) */}
      <div className="card hidden overflow-hidden md:block">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">PO Number</th>
                <th className="px-4 py-3 font-semibold">Supplier</th>
                <th className="px-4 py-3 font-semibold">PO Date</th>
                <th className="px-4 py-3 text-right font-semibold">Total</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Exp. Shipping</th>
                <th className="px-4 py-3 font-semibold">Exp. Arrival</th>
                <th className="px-4 py-3 font-semibold">Last Updated</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((o) => (
                <tr key={o.id} className="hover:bg-brand-50/40">
                  <td className="px-4 py-3 font-semibold text-slate-800">
                    {o.poNumber}
                    {o.revision > 0 && (
                      <span className="ml-1 rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700">
                        rev{o.revision}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{o.supplierName}</td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(o.poDate)}</td>
                  <td className="px-4 py-3 text-right font-medium text-slate-800">
                    {formatAmount(o.grandTotal, o.currency)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={o.status} />
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {formatDate(o.expectedShipping)}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {formatDate(o.expectedArrival)}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {formatDateTime(o.updatedAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/purchase-orders/${o.id}`}
                      className="btn-ghost px-3 py-1.5"
                    >
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <EmptyState hasOrders={orders.length > 0} />}
      </div>

      {/* Cards (mobile) */}
      <div className="space-y-3 md:hidden">
        {filtered.map((o) => (
          <Link
            key={o.id}
            href={`/purchase-orders/${o.id}`}
            className="card block p-4 active:bg-slate-50"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-semibold text-slate-800">
                  {o.poNumber}
                  {o.revision > 0 && (
                    <span className="ml-1 rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700">
                      rev{o.revision}
                    </span>
                  )}
                </div>
                <div className="text-sm text-slate-600">{o.supplierName}</div>
              </div>
              <StatusBadge status={o.status} />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-500">
              <div>
                <span className="block text-slate-400">PO Date</span>
                {formatDate(o.poDate)}
              </div>
              <div className="text-right">
                <span className="block text-slate-400">Total</span>
                <span className="font-semibold text-slate-800">
                  {formatAmount(o.grandTotal, o.currency)}
                </span>
              </div>
              <div>
                <span className="block text-slate-400">Exp. Shipping</span>
                {formatDate(o.expectedShipping)}
              </div>
              <div className="text-right">
                <span className="block text-slate-400">Exp. Arrival</span>
                {formatDate(o.expectedArrival)}
              </div>
            </div>
          </Link>
        ))}
        {filtered.length === 0 && (
          <div className="card">
            <EmptyState hasOrders={orders.length > 0} />
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ hasOrders }: { hasOrders: boolean }) {
  return (
    <div className="px-4 py-14 text-center">
      <p className="text-slate-500">
        {hasOrders
          ? "No purchase orders match your search."
          : "No purchase orders yet."}
      </p>
      {!hasOrders && (
        <Link href="/purchase-orders/new" className="btn-primary mt-4">
          + Create your first Purchase Order
        </Link>
      )}
    </div>
  );
}
