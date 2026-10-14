import assert from "node:assert/strict";
import { test } from "node:test";
import { uniqueItemCodeHistory } from "../src/lib/itemCodeHistory";
import { normalizeDescription } from "../src/lib/descriptionHistory";

test("keeps the newest PO for an exact code across suppliers, ignoring case and extra spaces", () => {
  const latest = { itemCode: "AB-123", poId: "new", poNumber: "PO-002", supplierName: "Supplier B" };
  const other = { ...latest, itemCode: "AB-124", poId: "other" };
  assert.deepEqual(uniqueItemCodeHistory([
    latest,
    { ...latest, itemCode: " ab-123 ", poId: "old", supplierName: "Supplier A" },
    { ...latest, itemCode: " " },
    other,
  ]), [latest, other]);
  assert.notEqual(normalizeDescription("AB-123"), normalizeDescription("AB-124"));
  assert.notEqual(normalizeDescription("AB-123"), normalizeDescription("AB123"));
});
