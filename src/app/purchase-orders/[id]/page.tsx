import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { parseCc } from "@/lib/serialize";
import {
  formatAmount,
  formatDate,
  formatDateTime,
  formatNumber,
  toDateInputValue,
} from "@/lib/format";
import { STATUS_ORDER, POStatus } from "@/lib/status";
import { computeSubtotal, computeTaxTotal } from "@/lib/validation";
import StatusBadge from "@/components/StatusBadge";
import Timeline, { TimelineState } from "@/components/Timeline";
import TrackingPanel from "@/components/TrackingPanel";
import ReceivingPanel, { ReceivingItem } from "@/components/ReceivingPanel";
import DeletePOButton from "@/components/DeletePOButton";
import SendEmailButton from "@/components/SendEmailButton";

export const dynamic = "force-dynamic";

function rank(status: string): number {
  const i = STATUS_ORDER.indexOf(status as POStatus);
  return i === -1 ? 0 : i;
}

export default async function PODetailsPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { created?: string; revised?: string };
}) {
  const po = await prisma.purchaseOrder.findUnique({
    where: { id: params.id },
    include: {
      items: { orderBy: { sortOrder: "asc" } },
      statusEvents: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!po) notFound();

  const cc = parseCc(po.ccEmails);
  const confirmed = rank(po.status) >= rank("ORDER_CONFIRMED");
  const arrived = po.status === "ARRIVED";
  const partially = po.status === "PARTIALLY_ARRIVED";

  const totalOrdered = po.items.reduce((s, it) => s + it.quantity, 0);
  const totalReceived = po.items.reduce((s, it) => s + it.receivedQty, 0);
  const subtotal = computeSubtotal(po.items);
  const taxTotal = computeTaxTotal(po.items, po.taxRate);
  const isDraft = po.status === "DRAFT";

  const timeline: TimelineState = {
    po_sent: !isDraft,
    order_confirmed: confirmed,
    expected_shipping: Boolean(po.expectedShipping),
    expected_arrival: Boolean(po.expectedArrival),
    arrived,
  };

  const receivingItems: ReceivingItem[] = po.items.map((it) => ({
    id: it.id,
    itemCode: it.itemCode,
    description: it.description,
    quantity: it.quantity,
    receivedQty: it.receivedQty,
  }));

  const created = searchParams?.created === "1";
  const revised = searchParams?.revised === "1";

  return (
    <div>
      {/* Draft notice (persistent) */}
      {isDraft && (
        <div className="mb-4 flex flex-col gap-2 rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-700 sm:flex-row sm:items-center sm:justify-between">
          <span>
            📝 This purchase order is a <strong>draft</strong> — it has not been
            sent to the supplier yet.
          </span>
          <SendEmailButton poId={po.id} mainEmail={po.mainEmail} />
        </div>
      )}

      {/* Created / revised banner */}
      {(created || revised) && !isDraft && (
        <div
          className={`mb-4 rounded-lg border px-4 py-3 text-sm ${
            po.emailMode === "sent"
              ? "border-green-200 bg-green-50 text-green-700"
              : po.emailMode === "preview"
              ? "border-blue-200 bg-blue-50 text-blue-700"
              : "border-amber-200 bg-amber-50 text-amber-700"
          }`}
        >
          {po.emailMode === "sent" && (
            <>
              ✅ {revised ? `Revision ${po.revision} saved` : "Purchase order created"}{" "}
              and email sent to <strong>{po.mainEmail}</strong>.
            </>
          )}
          {po.emailMode === "preview" && (
            <>
              ✅ {revised ? `Revision ${po.revision} saved` : "Purchase order created"}
              . Email settings are not configured, so the message was prepared in{" "}
              <strong>preview mode</strong> and <strong>not actually sent</strong>.
            </>
          )}
          {!po.emailMode && (
            <>
              ⚠️ Saved, but the email could not be sent. Check your SMTP settings.
            </>
          )}
        </div>
      )}

      {/* Header */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link href="/" className="btn-ghost mb-2 px-0 text-sm">
            ← All Orders
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-800">{po.poNumber}</h1>
            {po.revision > 0 && (
              <span className="rounded-md bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700">
                rev{po.revision}
              </span>
            )}
            <StatusBadge status={po.status} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/purchase-orders/${po.id}/edit`} className="btn-secondary">
            Edit / Revise
          </Link>
          <a
            href={`/api/purchase-orders/${po.id}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary"
          >
            View PDF
          </a>
          <a href={`/api/purchase-orders/${po.id}/pdf?download=1`} className="btn-primary">
            Download PDF
          </a>
          <DeletePOButton poId={po.id} poNumber={po.poNumber} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Left */}
        <div className="space-y-5 lg:col-span-2">
          <section className="card p-5">
            <h2 className="mb-4 text-lg font-semibold text-slate-800">Order Details</h2>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
              <Detail label="Supplier" value={po.supplierName} />
              <Detail label="Contact Person" value={po.attention || "—"} />
              <Detail label="Main Email" value={po.mainEmail} />
              <Detail label="CC Emails" value={cc.length ? cc.join(", ") : "—"} />
              <Detail label="Delivery Method" value={po.deliveryMethod} />
              <Detail label="Payment Terms" value={po.paymentTerms || "—"} />
              <Detail label="PO Date" value={formatDate(po.poDate)} />
              <Detail label="Currency" value={po.currency} />
              <Detail label="Prepared By" value={po.preparedBy} />
              <Detail label="Revision" value={po.revision > 0 ? `rev${po.revision}` : "Original"} />
              <Detail
                label="Email Sent"
                value={
                  po.emailSentAt
                    ? `${formatDateTime(po.emailSentAt)}${
                        po.emailMode === "preview" ? " (preview mode)" : ""
                      }`
                    : "Not sent"
                }
              />
            </dl>
          </section>

          <section className="card p-5">
            <h2 className="mb-4 text-lg font-semibold text-slate-800">Items</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-2 py-2">Code</th>
                    <th className="px-2 py-2">Description</th>
                    <th className="px-2 py-2 text-right">Qty</th>
                    <th className="px-2 py-2 text-right">Unit Price</th>
                    <th className="px-2 py-2 text-right">Line Total</th>
                    <th className="px-2 py-2 text-right">Received</th>
                    <th className="px-2 py-2 text-right">Remaining</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {po.items.map((it) => {
                    const remaining = Math.max(it.quantity - it.receivedQty, 0);
                    return (
                      <tr key={it.id}>
                        <td className="px-2 py-2 font-medium text-slate-700">{it.itemCode}</td>
                        <td className="px-2 py-2 text-slate-700">{it.description}</td>
                        <td className="px-2 py-2 text-right text-slate-600">
                          {formatNumber(it.quantity)}
                        </td>
                        <td className="px-2 py-2 text-right text-slate-600">
                          {formatAmount(it.unitPrice, po.currency)}
                        </td>
                        <td className="px-2 py-2 text-right font-medium text-slate-800">
                          {formatAmount(it.lineTotal, po.currency)}
                        </td>
                        <td className="px-2 py-2 text-right text-slate-600">
                          {formatNumber(it.receivedQty)}
                        </td>
                        <td
                          className={`px-2 py-2 text-right font-medium ${
                            remaining <= 1e-9 ? "text-green-600" : "text-amber-600"
                          }`}
                        >
                          {formatNumber(remaining)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-200">
                    <td colSpan={4} className="px-2 pt-3 text-right text-slate-500">
                      Subtotal
                    </td>
                    <td className="px-2 pt-3 text-right font-medium text-slate-700">
                      {formatAmount(subtotal, po.currency)}
                    </td>
                    <td colSpan={2}></td>
                  </tr>
                  <tr>
                    <td colSpan={4} className="px-2 py-1 text-right text-slate-500">
                      {po.taxRate ? `Tax (${formatNumber(po.taxRate)}%)` : "Tax"}
                    </td>
                    <td className="px-2 py-1 text-right font-medium text-slate-700">
                      {formatAmount(taxTotal, po.currency)}
                    </td>
                    <td colSpan={2}></td>
                  </tr>
                  <tr>
                    <td colSpan={4} className="px-2 pb-3 text-right font-semibold text-slate-700">
                      Grand Total
                    </td>
                    <td className="px-2 pb-3 text-right text-lg font-bold text-brand-600">
                      {formatAmount(po.grandTotal, po.currency)}
                    </td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>

          {/* History */}
          <section className="card p-5">
            <h2 className="mb-4 text-lg font-semibold text-slate-800">Update History</h2>
            <ul className="space-y-3">
              {po.statusEvents.map((ev) => (
                <li key={ev.id} className="flex gap-3">
                  <span className="mt-1.5 h-2 w-2 flex-none rounded-full bg-brand-500" />
                  <div>
                    <div className="text-sm font-medium text-slate-800">{ev.label}</div>
                    {ev.note && <div className="text-sm text-slate-600">{ev.note}</div>}
                    <div className="text-xs text-slate-400">
                      {formatDateTime(ev.createdAt)}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* Right */}
        <div className="space-y-5">
          <section className="card p-5">
            <h2 className="mb-4 text-lg font-semibold text-slate-800">Order Progress</h2>
            <Timeline
              state={timeline}
              shippingDate={po.expectedShipping?.toISOString() ?? null}
              arrivalDate={po.expectedArrival?.toISOString() ?? null}
            />
            {partially && (
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                Partially arrived — {formatNumber(totalReceived)} of{" "}
                {formatNumber(totalOrdered)} units received.
              </div>
            )}
          </section>

          <section className="card p-5">
            <h2 className="mb-1 text-lg font-semibold text-slate-800">Receive Items</h2>
            <p className="mb-4 text-xs text-slate-500">
              Record deliveries per item (supports partial / multiple batches).
            </p>
            <ReceivingPanel poId={po.id} items={receivingItems} />
          </section>

          <section className="card p-5">
            <h2 className="mb-4 text-lg font-semibold text-slate-800">Update Status</h2>
            <TrackingPanel
              poId={po.id}
              expectedShipping={toDateInputValue(po.expectedShipping)}
              expectedArrival={toDateInputValue(po.expectedArrival)}
              confirmed={confirmed}
            />
          </section>
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="text-sm font-medium text-slate-800 break-words">{value}</dd>
    </div>
  );
}
