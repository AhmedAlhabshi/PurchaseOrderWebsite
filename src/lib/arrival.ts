import { POStatus } from "./status";

const EPS = 1e-9;

type ReceiveItem = { quantity: number; receivedQty: number };

// Derives the overall PO status from how much of each item has been received.
// Never downgrades below the pre-arrival base status (PO_SENT / ORDER_CONFIRMED).
export function receivingStatus(
  items: ReceiveItem[],
  baseStatus: string
): POStatus {
  if (items.length === 0) return normalizeBase(baseStatus);

  const anyReceived = items.some((i) => i.receivedQty > EPS);
  const allReceived = items.every((i) => i.receivedQty >= i.quantity - EPS);

  if (allReceived && anyReceived) return "ARRIVED";
  if (anyReceived) return "PARTIALLY_ARRIVED";
  return normalizeBase(baseStatus);
}

function normalizeBase(status: string): POStatus {
  return status === "ORDER_CONFIRMED" ? "ORDER_CONFIRMED" : "PO_SENT";
}

export function totalOrdered(items: ReceiveItem[]): number {
  return items.reduce((s, i) => s + i.quantity, 0);
}

export function totalReceived(items: ReceiveItem[]): number {
  return items.reduce((s, i) => s + i.receivedQty, 0);
}
