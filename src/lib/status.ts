// Central definition of Purchase Order statuses and the tracking timeline.

export type POStatus =
  | "DRAFT"
  | "PO_SENT"
  | "ORDER_CONFIRMED"
  | "PARTIALLY_ARRIVED"
  | "ARRIVED";

export const STATUS_ORDER: POStatus[] = [
  "DRAFT",
  "PO_SENT",
  "ORDER_CONFIRMED",
  "PARTIALLY_ARRIVED",
  "ARRIVED",
];

export const STATUS_META: Record<
  POStatus,
  { label: string; badge: string; dot: string }
> = {
  DRAFT: {
    label: "Draft (not sent)",
    badge: "bg-slate-100 text-slate-700 border border-slate-300",
    dot: "bg-slate-400",
  },
  PO_SENT: {
    label: "PO Sent",
    badge: "bg-blue-100 text-blue-800 border border-blue-200",
    dot: "bg-blue-500",
  },
  ORDER_CONFIRMED: {
    label: "Order Confirmed",
    badge: "bg-indigo-100 text-indigo-800 border border-indigo-200",
    dot: "bg-indigo-500",
  },
  PARTIALLY_ARRIVED: {
    label: "Partially Arrived",
    badge: "bg-amber-100 text-amber-800 border border-amber-200",
    dot: "bg-amber-500",
  },
  ARRIVED: {
    label: "Arrived at Warehouse",
    badge: "bg-green-100 text-green-800 border border-green-200",
    dot: "bg-green-500",
  },
};

export function statusLabel(status: string): string {
  return STATUS_META[status as POStatus]?.label ?? status;
}

export function statusBadgeClass(status: string): string {
  return (
    STATUS_META[status as POStatus]?.badge ??
    "bg-gray-100 text-gray-700 border border-gray-200"
  );
}

// The 5 milestones shown on the details page timeline.
export type Milestone = {
  key: string;
  label: string;
};

export const MILESTONES: Milestone[] = [
  { key: "po_sent", label: "PO Sent" },
  { key: "order_confirmed", label: "Order Confirmed" },
  { key: "expected_shipping", label: "Expected Shipping Date" },
  { key: "expected_arrival", label: "Expected Arrival Date" },
  { key: "arrived", label: "Arrived at Warehouse" },
];
