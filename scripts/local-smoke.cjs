// End-to-end checks against the isolated local preview; never uses production.
const fs = require("node:fs");
const assert = require("node:assert/strict");
const { inflateSync } = require("node:zlib");
const localEnv = fs.readFileSync(".env.local", "utf8");
assert.match(localEnv, /^DATABASE_URL="file:\.\.\/\.local\/purchase-orders\.db"$/m);
process.env.DATABASE_URL = "file:../.local/purchase-orders.db";
const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient();
const base = "http://127.0.0.1:3000";
const suffix = Date.now();
const password = "Local test password 123";
const createdUsers = [];
let supplierId, orderId;

async function call(path, { method = "GET", body, cookie, origin = base } = {}) {
  return fetch(base + path, { method, redirect: "manual", headers: {
    Origin: origin, ...(body ? { "Content-Type": "application/json" } : {}),
    ...(cookie ? { Cookie: cookie } : {}),
  }, body: body ? JSON.stringify(body) : undefined });
}
async function signup(name, email) {
  const r = await call("/api/auth/register", { method: "POST", body: { name, email, phone: "+966501234567", password } });
  assert.equal(r.status, 201, await r.clone().text());
  const data = await r.json(); createdUsers.push(data.user.id);
  assert.equal(data.user.passwordHash, undefined);
  const cookie = r.headers.get("set-cookie");
  assert.match(cookie, /HttpOnly/i); assert.match(cookie, /Max-Age=2592000/i);
  return cookie.split(";")[0];
}
function pdfText(bytes) {
  const raw = Buffer.from(bytes).toString("latin1");
  let text = "";
  for (const match of raw.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)) {
    try {
      const content = inflateSync(Buffer.from(match[1], "latin1")).toString("latin1");
      text += [...content.matchAll(/<([a-f\d]+)>/gi)].map(m => Buffer.from(m[1], "hex").toString("latin1")).join("");
    } catch { /* image streams are not text */ }
  }
  return text;
}
async function main() {
  const { loadDescriptionHistory } = require("../src/lib/loadDescriptionHistory.ts");
  assert.equal((await call("/")).status, 200);
  for (const path of ["/suppliers", "/purchase-orders/new", "/account"]) {
    const r = await call(path); assert.equal(r.status, 307); assert.equal(r.headers.get("location"), `/login?next=${encodeURIComponent(path)}`);
  }
  for (const path of ["/api/purchase-orders", "/api/suppliers"]) {
    assert.equal((await call(path)).status, 401);
  }
  assert.equal((await call("/api/purchase-orders/missing/pdf")).status, 404);
  assert.equal((await call("/api/auth/register", { method: "POST", origin: "https://other.example", body: {} })).status, 403);
  assert.equal((await call("/api/auth/register", { method: "POST", body: { name: "Test", email: "bad", phone: "", password } })).status, 422);
  const email = `qa-${suffix}@example.invalid`;
  const cookie = await signup("QA Employee", email);
  assert.equal((await call("/", { cookie })).status, 200);
  const duplicate = await call("/api/auth/register", { method: "POST", body: { name: "Other", email: email.toUpperCase(), phone: "+966501234567", password } });
  assert.equal(duplicate.status, 409);
  const wrong = await call("/api/auth/login", { method: "POST", body: { email, password: "wrong password" } });
  assert.equal(wrong.status, 401);
  const supplierResponse = await call("/api/suppliers", { method: "POST", cookie, body: { name: `QA supplier ${suffix}`, abbreviation: "QA", currentNumber: 0, emails: [] } });
  assert.equal(supplierResponse.status, 200, await supplierResponse.clone().text());
  supplierId = (await supplierResponse.json()).supplier.id;
  const payload = { supplierId, supplierName: "QA supplier", poNumber: "preview", poDate: "2026-10-14", mainEmail: "supplier@example.invalid", ccEmails: [], deliveryMethod: "DHL", currency: "USD", preparedBy: "FORGED NAME", preparedByEmail: "forged@example.invalid", preparedByPhone: "0000000", send: false, emailBody: "My custom message", items: [{ itemCode: "QA", description: `QA item ${suffix}`, quantity: 2, unitPrice: 10 }] };
  const preview = await call("/api/preview-pdf", { method: "POST", cookie, body: payload });
  assert.equal(preview.status, 200, await preview.clone().text());
  const text = pdfText(await preview.arrayBuffer());
  assert.ok(text.includes("QA Employee")); assert.ok(text.includes(email)); assert.ok(!text.includes("FORGED NAME"));
  const created = await call("/api/purchase-orders", { method: "POST", cookie, body: payload });
  assert.equal(created.status, 200, await created.clone().text());
  orderId = (await created.json()).id;
  assert.ok(!(await loadDescriptionHistory()).some(entry => entry.poId === orderId), "Drafts must be excluded from description history");
  const details = await call(`/purchase-orders/${orderId}`);
  assert.equal(details.status, 200);
  assert.ok((await details.text()).includes("Sign in to update status"));
  assert.equal((await call(`/api/purchase-orders/${orderId}/pdf`)).status, 200);
  const editPath = `/purchase-orders/${orderId}/edit`;
  const editRedirect = await call(editPath);
  assert.equal(editRedirect.status, 307);
  assert.equal(editRedirect.headers.get("location"), `/login?next=${encodeURIComponent(editPath)}`);
  for (const action of ["send", "revise", "receive", "status"]) {
    assert.equal((await call(`/api/purchase-orders/${orderId}/${action}`, { method: "POST", body: payload })).status, 401);
  }
  assert.equal((await call(`/api/purchase-orders/${orderId}`, { method: "DELETE" })).status, 401);
  assert.equal((await call("/api/purchase-orders", { method: "POST", body: payload })).status, 401);
  let order = await db.purchaseOrder.findUniqueOrThrow({ where: { id: orderId } });
  assert.equal(order.preparedBy, "QA Employee"); assert.equal(order.preparedByEmail, email);
  assert.equal(order.preparedByUserId, createdUsers[0]); assert.equal(order.emailBody, payload.emailBody);
  const form = await (await call("/purchase-orders/new", { cookie })).text();
  assert.ok(form.includes('id="prepared-by"')); assert.ok(form.includes("QA Employee")); assert.ok(!form.includes("Select preparer"));
  const sent = await call(`/api/purchase-orders/${orderId}/send`, { method: "POST", cookie });
  assert.equal(sent.status, 200); assert.equal((await sent.json()).emailMode, "preview");
  const previousItem = (await loadDescriptionHistory()).find(entry => entry.description === payload.items[0].description);
  assert.equal(previousItem.poId, orderId);
  assert.ok(!(await loadDescriptionHistory(orderId)).some(entry => entry.poId === orderId), "An edited order must not match itself");
  const secondCookie = await signup("QA Colleague", `colleague-${suffix}@example.invalid`);
  const revised = await call(`/api/purchase-orders/${orderId}/revise`, { method: "POST", cookie: secondCookie, body: payload });
  assert.equal(revised.status, 200, await revised.clone().text());
  order = await db.purchaseOrder.findUniqueOrThrow({ where: { id: orderId } });
  assert.equal(order.preparedBy, "QA Employee"); assert.equal(order.revision, 1);
  const pdf = await call(`/api/purchase-orders/${orderId}/pdf`, { cookie: secondCookie });
  assert.ok(pdfText(await pdf.arrayBuffer()).includes("QA Employee"));
  assert.equal((await call("/api/auth/logout", { method: "POST", cookie })).status, 200);
  assert.equal((await call("/api/suppliers", { cookie })).status, 401);
  const login = await call("/api/auth/login", { method: "POST", body: { email, password } });
  assert.equal(login.status, 200);
  const newCookie = login.headers.get("set-cookie").split(";")[0];
  const afterLogin = await call(`/login?next=${encodeURIComponent(editPath)}`, { cookie: newCookie });
  assert.equal(afterLogin.status, 307); assert.equal(afterLogin.headers.get("location"), editPath);
  assert.equal((await call("/api/suppliers", { cookie: newCookie })).status, 200);
  await db.session.updateMany({ where: { userId: createdUsers[0] }, data: { expiresAt: new Date(0) } });
  assert.equal((await call("/api/suppliers", { cookie: newCookie })).status, 401);
  console.log("PASS: guest browsing/PDF, sign-in on creation/editing, protected writes, return to operation, registration, login, sessions, CSRF, immutable preparer, PDF details, drafts and revisions.");
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => {
  if (orderId) await db.purchaseOrder.deleteMany({ where: { id: orderId } });
  if (supplierId) await db.supplier.deleteMany({ where: { id: supplierId } });
  if (createdUsers.length) await db.user.deleteMany({ where: { id: { in: createdUsers } } });
  await db.$disconnect();
  await require("../src/lib/db.ts").prisma.$disconnect();
});
