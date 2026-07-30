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
import { computeSubtotal, computeTaxTotal } from "./validation";
import { HERO_DATA_URI } from "./heroImage";
import { COMPANY, PO_NOTES } from "./company";

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

// Palette — warm, editorial
const CREAM = "#F7F5F0";
const NAVY = "#16283F";
const ACCENT = "#3D78C0";
const INK = "#1C2A3A";
const MUTED = "#94908A";
const UNITBLUE = "#5C7CA0";
const RULE = "#DAD6CE";
const RULE_DARK = "#2A3B52";

// Layout geometry (A4 = 595 x 842 pt)
const M = 40; // page margin
const SB_W = 52; // sidebar width
const SB_GAP = 20; // gap between sidebar and content
const HERO_H = 124; // hero height at content width (ratio ~4.17, trimmed)
const SB_TOP = 30 + HERO_H + 24; // below hero
const SB_BOTTOM = 46; // gap above footer
const SB_H = 842 - SB_TOP - SB_BOTTOM;
const HEADER_H = 366; // height of the repeating fixed header (tuned to fit)

// One font family throughout (same as the "SUPPLIER" label). Bold is used only
// for emphasis — same family, same size.
const SANS = "Helvetica";
const BOLD = "Helvetica-Bold";
const BODY = 10; // uniform content size
const LABEL = 8; // uniform label size

const styles = StyleSheet.create({
  page: {
    backgroundColor: CREAM,
    paddingTop: HEADER_H, // reserve space for the fixed header on every page
    paddingHorizontal: M,
    paddingBottom: 40,
    fontFamily: "Helvetica",
    color: INK,
  },
  // Fixed header (hero + reference + meta + blue rule + table head) — repeats
  // on every page. Absolute so it sits inside the reserved top padding.
  headerFixed: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 30,
    paddingHorizontal: M,
    backgroundColor: CREAM,
  },
  headerBody: { marginLeft: SB_W + SB_GAP, marginTop: 24 },
  contentFlow: { marginLeft: SB_W + SB_GAP },
  hero: { width: "100%", height: HERO_H, borderRadius: 6, objectFit: "contain" },

  // Sidebar
  sidebar: {
    position: "absolute",
    left: M,
    top: SB_TOP,
    width: SB_W,
    height: SB_H,
    backgroundColor: NAVY,
  },
  sidebarAccent: {
    position: "absolute",
    top: 0,
    left: 0,
    width: SB_W,
    height: 64,
    backgroundColor: ACCENT,
  },
  sidebarTitle: {
    position: "absolute",
    width: SB_H,
    top: (SB_H - 34) / 2,
    left: (SB_W - SB_H) / 2,
    transform: "rotate(-90deg)",
    textAlign: "center",
    color: "#FFFFFF",
    fontFamily: SANS,
    fontSize: 22,
    letterSpacing: 1,
  },
  sidebarRef: {
    position: "absolute",
    width: 150,
    top: SB_H - 88,
    left: (SB_W - 150) / 2,
    transform: "rotate(-90deg)",
    textAlign: "center",
    color: "#8FA9C8",
    fontFamily: "Helvetica",
    fontSize: 7,
    letterSpacing: 1,
  },

  label: {
    fontSize: LABEL,
    letterSpacing: 1.4,
    color: MUTED,
    fontFamily: SANS,
  },

  refRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  refNumber: { fontFamily: BOLD, fontSize: BODY, color: INK, marginTop: 5, letterSpacing: 0.3 },
  dateValue: { fontFamily: SANS, fontSize: BODY, color: INK, marginTop: 5 },

  ruleThin: { borderTopWidth: 0.7, borderTopColor: RULE, marginVertical: 18 },
  ruleThick: { borderTopWidth: 1.4, borderTopColor: RULE_DARK, marginVertical: 18 },

  metaRow: { flexDirection: "row", marginBottom: 2 },
  metaCol: { flex: 1, paddingRight: 10 },
  metaValue: { fontFamily: SANS, fontSize: BODY, color: INK, marginTop: 5 },

  // Table
  tHead: { flexDirection: "row", marginBottom: 4 },
  tRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 9,
    borderBottomWidth: 0.5,
    borderBottomColor: RULE,
  },
  cNo: { width: "7%" },
  cCode: { width: "16%" },
  cDesc: { width: "38%" },
  cQty: { width: "10%", textAlign: "right" },
  cUnit: { width: "13%", textAlign: "right" },
  cAmt: { width: "16%", textAlign: "right" },

  no: { fontFamily: SANS, fontSize: BODY, color: MUTED, letterSpacing: 0.5 },
  code: { fontFamily: SANS, fontSize: BODY, color: INK },
  desc: { fontFamily: SANS, fontSize: BODY, color: INK },
  qty: { fontFamily: SANS, fontSize: BODY, color: INK },
  unit: { fontFamily: SANS, fontSize: BODY, color: UNITBLUE },
  amt: { fontFamily: BOLD, fontSize: BODY, color: INK },

  // Bottom
  bottom: { flexDirection: "row", marginTop: 22 },
  bottomLeft: { flex: 1.15, paddingRight: 24 },
  bottomRight: { flex: 1 },
  noteText: { fontFamily: SANS, fontSize: BODY, color: "#555", lineHeight: 1.5, marginTop: 6 },

  totRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  totLabel: { fontFamily: SANS, fontSize: LABEL, letterSpacing: 1.2, color: MUTED },
  totValue: { fontFamily: BOLD, fontSize: BODY, color: INK },
  grandLabel: { fontFamily: SANS, fontSize: LABEL, letterSpacing: 1.4, color: MUTED },
  grandRow: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", marginTop: 3 },
  grandNumber: { fontFamily: BOLD, fontSize: BODY, color: INK },
  grandCurrency: { fontFamily: SANS, fontSize: LABEL, color: MUTED },

  footer: {
    position: "absolute",
    bottom: 20,
    left: M,
    right: M,
    borderTopWidth: 0.7,
    borderTopColor: RULE,
    paddingTop: 7,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footText: { fontFamily: SANS, fontSize: LABEL, letterSpacing: 0.8, color: MUTED },
});

function money(n: number) {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
function qtyFmt(n: number) {
  return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
}
function dateFmt(d: string | Date) {
  const dt = typeof d === "string" ? new Date(d) : d;
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  return `${dd} / ${mm} / ${dt.getUTCFullYear()}`;
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaCol}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.metaValue}>{value || "—"}</Text>
    </View>
  );
}

function POPdf({ data }: { data: PODocData }) {
  const lineTotal = (q: number, p: number) => Math.round(q * p * 100) / 100;
  const subtotal = computeSubtotal(data.items);
  const taxTotal = computeTaxTotal(data.items, data.taxRate);
  const ref =
    data.poNumber +
    (data.revision && data.revision > 0 ? ` rev${data.revision}` : "");

  return (
    <Document title={`Purchase Order ${data.poNumber}`} author={COMPANY.name}>
      <Page size="A4" style={styles.page}>
        {/* Fixed header — repeats on every page */}
        <View style={styles.headerFixed} fixed>
          {heroDataUri ? (
            <Image src={heroDataUri} style={styles.hero} />
          ) : (
            <Text style={{ textAlign: "center", fontSize: 18 }}>
              {COMPANY.name}
            </Text>
          )}

          <View style={styles.headerBody}>
            <View style={styles.refRow}>
              <View>
                <Text style={styles.label}>OUR REFERENCE</Text>
                <Text style={styles.refNumber}>{ref}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.label}>DATE ISSUED</Text>
                <Text style={styles.dateValue}>{dateFmt(data.poDate)}</Text>
              </View>
            </View>

            <View style={styles.ruleThin} />

            <View style={styles.metaRow}>
              <Field label="SUPPLIER" value={data.supplierName} />
              <Field label="ATTENTION" value={data.attention || ""} />
              <Field label="CURRENCY" value={data.currency} />
            </View>
            <View style={[styles.metaRow, { marginTop: 16 }]}>
              <Field label="DELIVERY" value={data.deliveryMethod} />
              <Field label="PAYMENT TERMS" value={data.paymentTerms || ""} />
              <View style={styles.metaCol} />
            </View>

            <View style={styles.ruleThick} />

            <View style={styles.tHead}>
              <Text style={[styles.cNo, styles.label]}>NO.</Text>
              <Text style={[styles.cCode, styles.label]}>ITEM CODE</Text>
              <Text style={[styles.cDesc, styles.label]}>DESCRIPTION</Text>
              <Text style={[styles.cQty, styles.label]}>QTY</Text>
              <Text style={[styles.cUnit, styles.label]}>UNIT</Text>
              <Text style={[styles.cAmt, styles.label]}>AMOUNT</Text>
            </View>
          </View>
        </View>

        {/* Vertical sidebar — repeats on every page */}
        <View style={styles.sidebar} fixed>
          <View style={styles.sidebarAccent} />
          <Text style={styles.sidebarTitle}>Purchase Order</Text>
          <Text style={styles.sidebarRef}>{data.poNumber}</Text>
        </View>

        {/* Flowing content: items + totals */}
        <View style={styles.contentFlow}>
          {data.items.map((it, i) => (
            <View key={i} style={styles.tRow} wrap={false}>
              <Text style={[styles.cNo, styles.no]}>
                {String(i + 1).padStart(2, "0")}
              </Text>
              <Text style={[styles.cCode, styles.code]}>{it.itemCode || "—"}</Text>
              <Text style={[styles.cDesc, styles.desc]}>{it.description}</Text>
              <Text style={[styles.cQty, styles.qty]}>{qtyFmt(it.quantity)}</Text>
              <Text style={[styles.cUnit, styles.unit]}>{money(it.unitPrice)}</Text>
              <Text style={[styles.cAmt, styles.amt]}>
                {money(lineTotal(it.quantity, it.unitPrice))}
              </Text>
            </View>
          ))}

          {/* Bottom */}
          <View style={styles.bottom}>
            <View style={styles.bottomLeft}>
              <Text style={styles.label}>NOTES</Text>
              <Text style={styles.noteText}>{PO_NOTES}</Text>
            </View>

            <View style={styles.bottomRight}>
              {data.taxRate ? (
                <>
                  <View style={{ borderTopWidth: 0.7, borderTopColor: RULE }} />
                  <View style={styles.totRow}>
                    <Text style={styles.totLabel}>SUBTOTAL</Text>
                    <Text style={styles.totValue}>{money(subtotal)}</Text>
                  </View>
                  <View style={[styles.totRow, { paddingTop: 0 }]}>
                    <Text style={styles.totLabel}>TAX ({qtyFmt(data.taxRate)}%)</Text>
                    <Text style={styles.totValue}>{money(taxTotal)}</Text>
                  </View>
                </>
              ) : null}

              <View
                style={{
                  borderTopWidth: 0.7,
                  borderTopColor: RULE,
                  marginTop: data.taxRate ? 6 : 0,
                  paddingTop: 12,
                }}
              >
                <Text style={styles.grandLabel}>TOTAL ORDER VALUE</Text>
                <View style={styles.grandRow}>
                  <Text style={styles.grandNumber}>{money(data.grandTotal)}</Text>
                  <Text style={styles.grandCurrency}>{data.currency}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footText}>
            PREPARED BY   {data.preparedBy}
            {data.preparedByPhone ? `   ${data.preparedByPhone}` : ""}
            {data.preparedByEmail ? `   ·   ${data.preparedByEmail}` : ""}
          </Text>
          <Text
            style={styles.footText}
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
