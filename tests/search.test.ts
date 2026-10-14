import assert from "node:assert/strict";
import { test } from "node:test";
import { matchesSearch } from "../src/lib/search";

test("finds mixed words and numbers even when separated by additional text", () => {
  const stored = "Cutting Disc for Steel 41 300x2.5x25.4 A 46 - BF Basic*";
  for (const query of ["cutting disc 4", "cutting 41", "300x2.5x25.4 cutting disc", "Cutting Disc", "41", ""]) {
    assert.equal(matchesSearch(stored, query), true, query);
  }
  assert.equal(matchesSearch(stored, "cutting 999"), false);
  assert.equal(matchesSearch(stored, "cutting 300x2.5x22.4"), false);
});

test("matches the supplied full description with extra spaces", () => {
  assert.equal(matchesSearch("Cutting Disc   41   300x2.5x25.4   A 46 - BF  Basic*", "Cutting Disc 41 300x2.5x25.4 A 46 - BF Basic*"), true);
  assert.equal(matchesSearch("Diamond Saw C1W 600x3.6x60 TSU***", "saw 600x3.6x60"), true);
});
