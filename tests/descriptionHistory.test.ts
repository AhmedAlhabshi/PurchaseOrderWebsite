import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeDescription, uniqueDescriptionHistory } from "../src/lib/descriptionHistory";

test("matches exact descriptions ignoring case and repeated whitespace", () => {
  assert.equal(normalizeDescription("  CUTTING  disc\n125 MM "), "cutting disc 125 mm");
  assert.notEqual(normalizeDescription("Cutting disc 125 mm"), normalizeDescription("Cutting disc 150 mm"));
  assert.equal(normalizeDescription(" \n "), "");
});

test("search matches the stored cutting disc description with extra spaces and numeric dimensions", () => {
  const stored = "Cutting Disc   41   300x2.5x25.4   A 46 - BF  Basic*";
  const query = "Cutting Disc 41 300x2.5x25.4 A 46 - BF Basic*";
  assert.equal(normalizeDescription(stored).includes(normalizeDescription(query)), true);
  assert.equal(normalizeDescription(stored).includes(normalizeDescription("300x2.5x25.4")), true);
  assert.equal(normalizeDescription(stored).includes(normalizeDescription("300x2.5x22.4")), false);
  assert.equal(normalizeDescription("Diamond Saw C1W  600x3.6x60  TSU***").includes(normalizeDescription("Diamond Saw C1W 600x3.6x60 TSU***")), true);
});

test("keeps the newest matching PO across suppliers and ignores blank descriptions", () => {
  const latest = { description: "Cutting disc", poId: "new", poNumber: "PO-002", supplierName: "Supplier B" };
  assert.deepEqual(uniqueDescriptionHistory([
    latest,
    { ...latest, description: " CUTTING   DISC ", poId: "old", supplierName: "Supplier A" },
    { ...latest, description: " " },
  ]), [latest]);
});
