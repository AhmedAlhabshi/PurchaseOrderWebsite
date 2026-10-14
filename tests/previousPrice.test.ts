import assert from "node:assert/strict";
import { test } from "node:test";
import { buildPriceHistory, previousPrice } from "../src/lib/previousPrice";

test("uses latest recorded positive unit price and its original currency", () => {
  const base = { itemCode: "AB-123", description: "Cutting Disc", poId: "new", poNumber: "PO-002", supplierName: "Supplier", unitPrice: 0, currency: "USD" };
  const recorded = { ...base, poId: "previous", unitPrice: 12.5, currency: "EUR" };
  const history = buildPriceHistory([base, recorded, { ...recorded, poId: "old", unitPrice: 9 }]);
  assert.deepEqual(history.byCode, [recorded]);
  assert.deepEqual(history.byDescription, [recorded]);
});

test("uses code first and description only for an empty code", () => {
  const codePrice = { unitPrice: 10, currency: "SAR", poId: "code", poNumber: "PO-001", supplierName: "A" };
  const descriptionPrice = { ...codePrice, unitPrice: 20, currency: "USD", poId: "description" };
  const codes = new Map([["ab-123", codePrice]]);
  const descriptions = new Map([["cutting disc", descriptionPrice]]);
  assert.equal(previousPrice(" AB-123 ", "Cutting Disc", codes, descriptions), codePrice);
  assert.equal(previousPrice("", " CUTTING  DISC ", codes, descriptions), descriptionPrice);
  assert.equal(previousPrice("AB-124", "Cutting Disc", codes, descriptions), undefined);
  assert.equal(previousPrice("", "", codes, descriptions), undefined);
});
