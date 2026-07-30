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
import { COMPANY } from "./company";

// The company hero (logos + name band + contact info) is reproduced exactly from
// the customer's template as a single embedded image at the top.
const heroDataUri = HERO_DATA_URI;

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
  preparedByEmail?: string | null;
  preparedByPhone?: string | null;
  taxRate?: number;
  items: {
    itemCode: string;
    description: string;
    quantity: number;
    unitPrice: number;
  }[];
  grandTotal: number;
};

const NAVY = "#0b4a8f";
const NAVY_DARK = "#0a3d75";
const LABEL_TX = "#0b4a8f";
const BORDER = "#d5deea";
const ALT = "#f2f6fc";
const GRAY = "#5b6b7f";
const TITLE = "#0f2b4c";

const styles = StyleSheet.create({
  page: {
    paddingTop: 0,
    paddingBottom: 40,
    paddingHorizontal: 0,
    fontSize: 9,
    color: "#1f2937",
    fontFamily: "Helvetica",
  },
  hero: { width: "100%" },
  body: { paddingHorizontal: 34, paddingTop: 10 },

  // Top row: supplier card + PO identity
  topRow: { flexDirection: "row", gap: 12, marginBottom: 12 },
  supplierCard: {
    flex: 1.9,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 6,
    overflow: "hidden",
  },
  poCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: NAVY,
    borderRadius: 6,
    overflow: "hidden",
  },
  poNumLabel: { backgroundColor: NAVY, paddingVertical: 5, paddingHorizontal: 10 },
  poNumLabelText: {
    color: "#ffffff",
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    letterSpacing: 1,
  },
  poCardBody: { padding: 10 },
  poNumValue: { fontFamily: "Helvetica-Bold", fontSize: 14, color: NAVY },
  poDateLabel: { fontSize: 7, color: GRAY, marginTop: 8 },
  poDateValue: { fontFamily: "Helvetica-Bold", fontSize: 11, color: TITLE, marginTop: 1 },

  // Info cards
  cardHead: {
    backgroundColor: NAVY,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  cardHeadText: { color: "#ffffff", fontFamily: "Helvetica-Bold", fontSize: 9 },
  cardBody: { padding: 8 },
  kv: { flexDirection: "row", marginBottom: 4 },
  k: { width: 92, color: GRAY },
  v: { flex: 1, color: "#111827", fontFamily: "Helvetica-Bold" },

  // Meta strip
  metaStrip: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 6,
    marginBottom: 12,
  },
  metaCell: {
    flex: 1,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRightWidth: 1,
    borderRightColor: BORDER,
  },
  metaCellLast: { flex: 1, paddingVertical: 7, paddingHorizontal: 10 },
  metaLabel: { fontSize: 7, color: GRAY, marginBottom: 2 },
  metaValue: { fontFamily: "Helvetica-Bold", color: TITLE, fontSize: 9 },

  // Items table
  table: { borderWidth: 1, borderColor: NAVY, borderRadius: 3, marginBottom: 12 },
  th: { flexDirection: "row", backgroundColor: NAVY },
  thCell: {
    color: "#ffffff",
    fontFamily: "Helvetica-Bold",
    paddingVertical: 5,
    paddingHorizontal: 5,
    fontSize: 8.5,
  },
  tr: { flexDirection: "row", borderTopWidth: 1, borderTopColor: BORDER },
  trAlt: { backgroundColor: ALT },
  cell: { paddingVertical: 5, paddingHorizontal: 5 },
  cNo: { width: "6%", textAlign: "center" },
  cDesc: { width: "40%" },
  cCode: { width: "16%" },
  cQty: { width: "10%", textAlign: "right" },
  cPrice: { width: "14%", textAlign: "right" },
  cTotal: { width: "14%", textAlign: "right" },

  // Bottom: totals + prepared by
  bottomRow: { flexDirection: "row", gap: 12 },
  totalsBox: { width: "48%" },
  totRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: BORDER,
    borderTopWidth: 0,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  totRowFirst: { borderTopWidth: 1, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  totLabel: { color: GRAY },
  totVal: { fontFamily: "Helvetica-Bold", color: "#111827" },
  grandRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: NAVY,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
  },
  grandText: { color: "#ffffff", fontFamily: "Helvetica-Bold", fontSize: 11 },

  prepBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 6,
    overflow: "hidden",
  },

  footer: {
    position: "absolute",
    bottom: 18,
    left: 34,
    right: 34,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingTop: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    color: GRAY,
  },
  thanks: {
    textAlign: "center",
    color: NAVY,
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    marginTop: 14,
    marginBottom: 4,
  },
});

function KV({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.kv}>
      <Text style={styles.k}>{label}</Text>
      <Text style={styles.v}>{value || "—"}</Text>
    </View>
  );
}

function POPdf({ data }: { data: PODocData }) {
  const lineTotal = (q: number, p: number) => Math.round(q * p * 100) / 100;
  const subtotal = computeSubtotal(data.items);
  const taxTotal = computeTaxTotal(data.items, data.taxRate);

  return (
    <Document
      title={`Purchase Order ${data.poNumber}`}
      author={COMPANY.name}
    >
      <Page size="LETTER" style={styles.page}>
        {heroDataUri ? (
          <Image src={heroDataUri} style={styles.hero} />
        ) : (
          <Text style={{ textAlign: "center", fontSize: 18, marginTop: 20 }}>
            {COMPANY.name}
          </Text>
        )}

        <View style={styles.body}>
          {/* Supplier info + PO identity */}
          <View style={styles.topRow}>
            <View style={styles.supplierCard}>
              <View style={styles.cardHead}>
                <Text style={styles.cardHeadText}>Supplier Information</Text>
              </View>
              <View style={styles.cardBody}>
                <KV label="Supplier Name" value={data.supplierName} />
                <KV label="Contact Person" value={data.attention || ""} />
              </View>
            </View>

            <View style={styles.poCard}>
              <View style={styles.poNumLabel}>
                <Text style={styles.poNumLabelText}>PO NUMBER</Text>
              </View>
              <View style={styles.poCardBody}>
                <Text style={styles.poNumValue}>
                  {data.poNumber}
                  {data.revision && data.revision > 0 ? ` (rev${data.revision})` : ""}
                </Text>
                <Text style={styles.poDateLabel}>Date</Text>
                <Text style={styles.poDateValue}>{formatDate(data.poDate)}</Text>
              </View>
            </View>
          </View>

          {/* Meta strip */}
          <View style={styles.metaStrip}>
            <View style={styles.metaCell}>
              <Text style={styles.metaLabel}>Currency</Text>
              <Text style={styles.metaValue}>{data.currency}</Text>
            </View>
            <View style={styles.metaCell}>
              <Text style={styles.metaLabel}>Payment Terms</Text>
              <Text style={styles.metaValue}>{data.paymentTerms || "—"}</Text>
            </View>
            <View style={styles.metaCellLast}>
              <Text style={styles.metaLabel}>Shipping Method</Text>
              <Text style={styles.metaValue}>{data.deliveryMethod}</Text>
            </View>
          </View>

          {/* Items */}
          <View style={styles.table}>
            <View style={styles.th}>
              <Text style={[styles.thCell, styles.cNo]}>No.</Text>
              <Text style={[styles.thCell, styles.cDesc]}>Item Description</Text>
              <Text style={[styles.thCell, styles.cCode]}>Item Code</Text>
              <Text style={[styles.thCell, styles.cQty]}>Qty.</Text>
              <Text style={[styles.thCell, styles.cPrice]}>Unit Price</Text>
              <Text style={[styles.thCell, styles.cTotal]}>Line Total</Text>
            </View>
            {data.items.map((it, i) => (
              <View
                key={i}
                style={i % 2 === 1 ? [styles.tr, styles.trAlt] : styles.tr}
                wrap={false}
              >
                <Text style={[styles.cell, styles.cNo]}>{i + 1}</Text>
                <Text style={[styles.cell, styles.cDesc]}>{it.description}</Text>
                <Text style={[styles.cell, styles.cCode]}>{it.itemCode}</Text>
                <Text style={[styles.cell, styles.cQty]}>
                  {formatNumber(it.quantity)}
                </Text>
                <Text style={[styles.cell, styles.cPrice]}>
                  {formatAmount(it.unitPrice, data.currency)}
                </Text>
                <Text style={[styles.cell, styles.cTotal]}>
                  {formatAmount(lineTotal(it.quantity, it.unitPrice), data.currency)}
                </Text>
              </View>
            ))}
          </View>

          {/* Totals + Prepared By */}
          <View style={styles.bottomRow}>
            <View style={styles.totalsBox}>
              <View style={[styles.totRow, styles.totRowFirst]}>
                <Text style={styles.totLabel}>Subtotal</Text>
                <Text style={styles.totVal}>
                  {formatAmount(subtotal, data.currency)}
                </Text>
              </View>
              <View style={styles.totRow}>
                <Text style={styles.totLabel}>
                  {data.taxRate ? `Tax (${formatNumber(data.taxRate)}%)` : "Tax"}
                </Text>
                <Text style={styles.totVal}>
                  {formatAmount(taxTotal, data.currency)}
                </Text>
              </View>
              <View style={styles.grandRow}>
                <Text style={styles.grandText}>Grand Total</Text>
                <Text style={styles.grandText}>
                  {formatAmount(data.grandTotal, data.currency)}
                </Text>
              </View>
            </View>

            <View style={styles.prepBox}>
              <View style={styles.cardHead}>
                <Text style={styles.cardHeadText}>Prepared By</Text>
              </View>
              <View style={styles.cardBody}>
                <KV label="Name" value={data.preparedBy} />
                {data.preparedByPhone ? (
                  <KV label="Phone" value={data.preparedByPhone} />
                ) : null}
                {data.preparedByEmail ? (
                  <KV label="Email" value={data.preparedByEmail} />
                ) : null}
              </View>
            </View>
          </View>

          <Text style={styles.thanks}>Thank you for your cooperation</Text>
        </View>

        <View style={styles.footer} fixed>
          <Text>
            {COMPANY.phone}  ·  {COMPANY.email}
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
