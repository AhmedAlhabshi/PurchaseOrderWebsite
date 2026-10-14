import assert from "node:assert/strict";
import { test } from "node:test";
import { defaultEmailBody, emailBodyHtml } from "../src/lib/emailBody";
import { poInputSchema } from "../src/lib/validation";

test("default message includes the actual order and contact details", () => {
  const body = defaultEmailBody({ poNumber: "PO-019", attention: "Ali", preparedBy: "Ahmad" });
  assert.ok(body.startsWith("Dear Ali,"));
  assert.ok(body.includes("Purchase Order PO-019."));
  assert.ok(body.includes("Best regards,\nAhmad"));
});

test("revision message names the version it replaces", () => {
  const body = defaultEmailBody({ poNumber: "PO-019", preparedBy: "Ahmad", revision: 2 });
  assert.ok(body.includes("revised Purchase Order PO-019 (rev2)"));
  assert.ok(body.includes("previous Purchase Order PO-019 (rev1)"));
});

test("message validation distinguishes default, customized and intentionally blank", () => {
  const schema = poInputSchema.shape.emailBody;
  assert.equal(schema.parse(undefined), undefined);
  assert.equal(schema.parse(""), "");
  assert.equal(schema.parse("  My message\nThanks  "), "  My message\nThanks  ");
});

test("HTML preserves line breaks and renders custom content as text", () => {
  const html = emailBodyHtml('<script>alert("x")</script> &\r\nThanks');
  assert.ok(!html.includes("<script>"));
  assert.ok(html.includes("&lt;script&gt;"));
  assert.ok(html.includes("&amp;<br/>Thanks"));
  assert.ok(!emailBodyHtml("").includes("Dear"));
});
