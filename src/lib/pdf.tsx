import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import { formatAmount, formatNumber, formatDate } from "./format";
import { computeSubtotal, computeTaxTotal } from "./validation";
import { HERO_DATA_URI } from "./heroImage";

// The company hero (logos + name band + "Purchase Order" title) is reproduced
// exactly from the customer's template as a single embedded image at the top.
const heroDataUri = HERO_DATA_URI;

// Shape of the data the PDF needs. Works both before saving (preview) and after.
export type PODocData = {
  poNumber: string;
  revision?: number;
  supplierName: string;
  attention?: string | null;
  mainEmail: string;
  ccEmails: string[];
  poDate: string | Date;
  deliveryMethod: string;
  paymentTerms?: string | null;
  currency: string;
  preparedBy: string;
  items: {
    itemCode: string;
    description: string;
    quantity: number;
    unitPrice: number;
    taxRate?: number;
  }[];
  grandTotal: number;
};

const NAVY = "#0b4a8f";
const LABEL_BG = "#dbeafe";
const LABEL_TX = "#0b4a8f";
const BORDER = "#c7d2e0";
const ALT = "#f1f6fc";
const GRAY = "#475569";

const styles = StyleSheet.create({
  page: {
    paddingTop: 0,
    paddingBottom: 46,
    paddingHorizontal: 0,
    fontSize: 9.5,
    color: "#0f172a",
    fontFamily: "Helvetica",
  },
  hero: { width: "100%" },
  body: { paddingHorizontal: 40, paddingTop: 6 },

  metaWrap: { alignItems: "flex-end", marginBottom: 14 },
  metaLine: { fontFamily: "Helvetica-Bold", fontSize: 10, marginTop: 2 },

  // Supplier / order fields block (label column tinted, like the template).
  fields: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 2,
    marginBottom: 14,
  },
  fRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: BORDER },
  fRowLast: { flexDirection: "row" },
  fLabel: {
    width: 120,
    backgroundColor: LABEL_BG,
    color: LABEL_TX,
    fontFamily: "Helvetica-Bold",
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  fValue: { flex: 1, paddingVertical: 5, paddingHorizontal: 8 },

  intro: { marginBottom: 8, color: "#334155" },

  table: { borderWidth: 1, borderColor: NAVY, borderRadius: 1 },
  th: { flexDirection: "row", backgroundColor: NAVY },
  thCell: {
    color: "#ffffff",
    fontFamily: "Helvetica-Bold",
    paddingVertical: 5,
    paddingHorizontal: 5,
    fontSize: 9,
  },
  tr: { flexDirection: "row", borderTopWidth: 1, borderTopColor: BORDER },
  trAlt: { backgroundColor: ALT },
  cell: { paddingVertical: 4.5, paddingHorizontal: 5 },

  cNo: { width: "5%", textAlign: "center" },
  cCode: { width: "14%" },
  cDesc: { width: "34%" },
  cQty: { width: "9%", textAlign: "right" },
  cPrice: { width: "13%", textAlign: "right" },
  cTax: { width: "8%", textAlign: "right" },
  cTotal: { width: "17%", textAlign: "right" },

  // Totals block (right-aligned) under the items table.
  totalsWrap: { flexDirection: "row", justifyContent: "flex-end" },
  totalsBox: { width: "45%" },
  totRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: BORDER,
    borderTopWidth: 0,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  totRowFirst: { borderTopWidth: 1 },
  totLabel: { color: GRAY },
  totVal: { fontFamily: "Helvetica-Bold" },
  grandRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: NAVY,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  grandText: { color: "#ffffff", fontFamily: "Helvetica-Bold", fontSize: 11 },

  footer: {
    position: "absolute",
    bottom: 22,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingTop: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 9,
  },
  preparedBy: { fontFamily: "Helvetica-Bold" },
});

function Field({
  label,
  value,
  last,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View style={last ? styles.fRowLast : styles.fRow}>
      <Text style={styles.fLabel}>{label}</Text>
      <Text style={styles.fValue}>{value || "—"}</Text>
    </View>
  );
}

function POPdf({ data }: { data: PODocData }) {
  const lineTotal = (q: number, p: number) => Math.round(q * p * 100) / 100;
  const cc = data.ccEmails.filter(Boolean);
  const subtotal = computeSubtotal(data.items);
  const taxTotal = computeTaxTotal(data.items);

  return (
    <Document
      title={`Purchase Order ${data.poNumber}`}
      author="Diamond Tools & Equipment Est."
    >
      <Page size="LETTER" style={styles.page}>
        {heroDataUri ? (
          <Image src={heroDataUri} style={styles.hero} />
        ) : (
          <Text style={{ textAlign: "center", fontSize: 18, marginTop: 20 }}>
            Purchase Order
          </Text>
        )}

        <View style={styles.body}>
          {/* PO number + date, top-right like the template */}
          <View style={styles.metaWrap}>
            <Text style={styles.metaLine}>
              {data.poNumber}
              {data.revision && data.revision > 0 ? `  (rev${data.revision})` : ""}
            </Text>
            <Text style={styles.metaLine}>{formatDate(data.poDate)}</Text>
          </View>

          {/* Fields */}
          <View style={styles.fields}>
            <Field label="Supplier" value={data.supplierName} />
            <Field label="Attention" value={data.attention || ""} />
            <Field
              label="Subject"
              value={
                data.revision && data.revision > 0
                  ? `REVISED (rev${data.revision}): ${data.poNumber}`
                  : `NEW: ${data.poNumber}`
              }
            />
            <Field label="Main Email" value={data.mainEmail} />
            {cc.length > 0 && <Field label="CC" value={cc.join(", ")} />}
            <Field label="Delivery" value={data.deliveryMethod} />
            <Field
              label="Payment Terms:"
              value={data.paymentTerms || ""}
              last
            />
          </View>

          <Text style={styles.intro}>
            Please find below our purchase order details for your confirmation
            and processing.
          </Text>

          {/* Items */}
          <View style={styles.table}>
            <View style={styles.th}>
              <Text style={[styles.thCell, styles.cNo]}>No.</Text>
              <Text style={[styles.thCell, styles.cCode]}>Item Code</Text>
              <Text style={[styles.thCell, styles.cDesc]}>Item Description</Text>
              <Text style={[styles.thCell, styles.cQty]}>Qty.</Text>
              <Text style={[styles.thCell, styles.cPrice]}>Unit Price</Text>
              <Text style={[styles.thCell, styles.cTax]}>Tax %</Text>
              <Text style={[styles.thCell, styles.cTotal]}>Line Total</Text>
            </View>

            {data.items.map((it, i) => (
              <View
                key={i}
                style={i % 2 === 1 ? [styles.tr, styles.trAlt] : styles.tr}
                wrap={false}
              >
                <Text style={[styles.cell, styles.cNo]}>{i + 1}</Text>
                <Text style={[styles.cell, styles.cCode]}>{it.itemCode}</Text>
                <Text style={[styles.cell, styles.cDesc]}>{it.description}</Text>
                <Text style={[styles.cell, styles.cQty]}>
                  {formatNumber(it.quantity)}
                </Text>
                <Text style={[styles.cell, styles.cPrice]}>
                  {formatAmount(it.unitPrice, data.currency)}
                </Text>
                <Text style={[styles.cell, styles.cTax]}>
                  {it.taxRate ? `${formatNumber(it.taxRate)}%` : "—"}
                </Text>
                <Text style={[styles.cell, styles.cTotal]}>
                  {formatAmount(lineTotal(it.quantity, it.unitPrice), data.currency)}
                </Text>
              </View>
            ))}
          </View>

          {/* Totals: Subtotal / Tax / Grand Total */}
          <View style={styles.totalsWrap}>
            <View style={styles.totalsBox}>
              <View style={[styles.totRow, styles.totRowFirst]}>
                <Text style={styles.totLabel}>Subtotal</Text>
                <Text style={styles.totVal}>
                  {formatAmount(subtotal, data.currency)}
                </Text>
              </View>
              <View style={styles.totRow}>
                <Text style={styles.totLabel}>Tax</Text>
                <Text style={styles.totVal}>
                  {formatAmount(taxTotal, data.currency)}
                </Text>
              </View>
              <View style={styles.grandRow}>
                <Text style={styles.grandText}>TOTAL</Text>
                <Text style={styles.grandText}>
                  {formatAmount(data.grandTotal, data.currency)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.footer} fixed>
          <Text style={styles.preparedBy}>
            Prepared By: {data.preparedBy}
          </Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              `Page ${pageNumber} of ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}

export async function renderPOPdf(data: PODocData): Promise<Buffer> {
  return renderToBuffer(<POPdf data={data} />);
}
