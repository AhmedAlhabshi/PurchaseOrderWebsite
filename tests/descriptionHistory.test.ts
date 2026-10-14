import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeDescription, uniqueDescriptionHistory } from "../src/lib/descriptionHistory";

test("matches exact descriptions ignoring case and repeated whitespace", () => {
  assert.equal(normalizeDescription("  CUTTING  disc\n125 MM "), "cutting disc 125 mm");
  assert.notEqual(normalizeDescription("Cutting disc 125 mm"), normalizeDescription("Cutting disc 150 mm"));
  assert.equal(normalizeDescription(" \n "), "");
});

test("keeps the newest matching PO across suppliers and ignores blank descriptions", () => {
  const latest = { description: "Cutting disc", poId: "new", poNumber: "PO-002", supplierName: "Supplier B" };
  assert.deepEqual(uniqueDescriptionHistory([
    latest,
    { ...latest, description: " CUTTING   DISC ", poId: "old", supplierName: "Supplier A" },
    { ...latest, description: " " },
  ]), [latest]);
});
