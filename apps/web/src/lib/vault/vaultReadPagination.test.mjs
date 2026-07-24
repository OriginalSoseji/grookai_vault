import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const canonicalSource = fs.readFileSync(path.join(here, "getCanonicalVaultCollectorRows.ts"), "utf8");
const ownedCountsSource = fs.readFileSync(path.join(here, "getOwnedCountsByCardPrintIds.ts"), "utf8");
const ownedPrintingSource = fs.readFileSync(path.join(here, "getOwnedPrintingCountsByCardPrintIds.ts"), "utf8");

test("canonical Vault reads every active-instance page", () => {
  assert.match(canonicalSource, /SUPABASE_INSTANCE_PAGE_SIZE\s*=\s*1_000/);
  assert.match(canonicalSource, /\.range\(instanceFrom, instanceTo\)/);
  assert.match(canonicalSource, /page\.length < SUPABASE_INSTANCE_PAGE_SIZE/);
  assert.match(canonicalSource, /rows\.push\(\.\.\.page\)/);
});

test("ownership counts page through every matching copy", () => {
  assert.match(ownedCountsSource, /SUPABASE_OWNERSHIP_PAGE_SIZE\s*=\s*1_000/);
  assert.match(ownedCountsSource, /async function fetchAllOwnershipPages/);
  assert.match(ownedCountsSource, /\.range\(from, to\)/);
  assert.match(ownedCountsSource, /page\.length < SUPABASE_OWNERSHIP_PAGE_SIZE/);
});

test("parent ownership resolves only the owner's slab-only instances", () => {
  assert.match(ownedCountsSource, /\.is\("card_print_id", null\)/);
  assert.match(ownedCountsSource, /\.not\("slab_cert_id", "is", null\)/);
  assert.match(ownedCountsSource, /\.in\("id", chunk\)/);
  assert.doesNotMatch(
    ownedCountsSource,
    /\.from\("slab_certs"\)[\s\S]{0,240}\.in\("card_print_id"/,
  );
});

test("printing-level ownership counts are chunked and paged", () => {
  assert.match(ownedPrintingSource, /SUPABASE_PRINTING_COUNT_PAGE_SIZE\s*=\s*1_000/);
  assert.match(ownedPrintingSource, /chunkArray\(normalizedCardPrintIds, 200\)/);
  assert.match(ownedPrintingSource, /\.range\(from, to\)/);
  assert.match(ownedPrintingSource, /page\.length < SUPABASE_PRINTING_COUNT_PAGE_SIZE/);
});

test("printing ownership resolves only the owner's slab-only instances", () => {
  assert.match(
    ownedPrintingSource,
    /select\("id,card_print_id,card_printing_id"\)/,
  );
  assert.match(ownedPrintingSource, /\.is\("card_print_id", null\)/);
  assert.match(ownedPrintingSource, /\.not\("slab_cert_id", "is", null\)/);
  assert.match(ownedPrintingSource, /\.in\("id", slabCertIdChunk\)/);
  assert.doesNotMatch(
    ownedPrintingSource,
    /\.from\("slab_certs"\)[\s\S]{0,240}\.in\("card_print_id"/,
  );
});
