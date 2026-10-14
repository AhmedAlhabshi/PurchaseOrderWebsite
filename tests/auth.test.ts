import assert from "node:assert/strict";
import { test } from "node:test";
import { hashPassword, verifyPassword } from "../src/lib/password";
import { registerSchema } from "../src/lib/authValidation";
import { preparedBySnapshot } from "../src/lib/preparedBy";
import { loginHref, safeReturnTo } from "../src/lib/authNavigation";

test("passwords are salted, hashed, and verified without storing plaintext", async () => {
  const first = await hashPassword("Correct horse 123");
  const second = await hashPassword("Correct horse 123");
  assert.notEqual(first, second);
  assert.ok(!first.includes("Correct horse"));
  assert.equal(await verifyPassword("Correct horse 123", first), true);
  assert.equal(await verifyPassword("Wrong password", first), false);
  assert.equal(await verifyPassword("Correct horse 123", "malformed"), false);
});

test("registration requires PDF contact details and normalizes account email", () => {
  const input = { name: " Ahmad ", email: " Ahmad@Example.com ", phone: "+966 501234567", password: "Strong password" };
  const user = registerSchema.parse(input);
  assert.equal(user.name, "Ahmad");
  assert.equal(user.email, "ahmad@example.com");
  for (const field of ["name", "phone", "email", "password"]) {
    assert.equal(registerSchema.safeParse({ ...input, [field]: "" }).success, false);
  }
});

test("new orders use authenticated details and revisions retain original snapshots", () => {
  const user = { name: "Ahmad", email: "ahmad@example.com", phone: "+966501234567" };
  assert.deepEqual(preparedBySnapshot(user), { preparedBy: user.name, preparedByEmail: user.email, preparedByPhone: user.phone });
  const original = { preparedBy: "Ali", preparedByEmail: "ali@example.com", preparedByPhone: "0507654321" };
  assert.deepEqual(preparedBySnapshot(user, original), original);
});

test("sign-in returns to the requested operation without allowing external redirects", () => {
  const edit = "/purchase-orders/example/edit";
  assert.equal(safeReturnTo(edit), edit);
  assert.equal(loginHref(edit), "/login?next=%2Fpurchase-orders%2Fexample%2Fedit");
  for (const unsafe of ["https://other.example", "//other.example", "/\\other.example", "/login", "/register?next=/", "/api/auth/logout", "\n//other.example"]) {
    assert.equal(safeReturnTo(unsafe), "/");
  }
});
