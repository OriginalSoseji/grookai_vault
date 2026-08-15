import assert from "node:assert/strict";
import test from "node:test";

import {
  bindOnePieceSealedReviewToOfficialV1,
  buildOnePieceSealedOfficialAuthorityResultV1,
  normalizeOnePieceSealedOfficialTextV1,
  parseOnePieceOfficialProductDetailV1,
  parseOnePieceOfficialProductIndexV1,
  validateOnePieceSealedOfficialAuthorityResultV1,
} from "../../backend/pricing/one_piece_sealed_official_authority_v1.mjs";

const indexHtml = `<!doctype html><html lang="en"><body>
<li class="linkListColBox" data-cat="decks">
  <a href="https://en.onepiece-cardgame.com/products/decks/st27.php" class="linkListColItem">
    <img data-src="/images/products/decks/st27/item.webp" alt="">
    <span class="linkListColCat">DECKS</span>
    <h4 class="linkListColTitle">STARTER DECK -BLACK Marshall.D.Teach- [ST-27]</h4>
    <p class="linkListColDate">Release Date June 6, 2025</p>
    <p class="linkListColPrice">MSRP USD $11.99</p>
  </a>
</li>
<a href="?page=1">1</a><a href="?page=17">17</a>
</body></html>`;

const currentDetailHtml = `<!doctype html><html lang="en"><body>
<div class="detailColStatus">
  <h4>STARTER DECK -BLACK Marshall.D.Teach- [ST-27]</h4>
  <dl><dt>Release Date</dt><dd><p>June 6, 2025</p></dd></dl>
  <dl><dt>MSRP</dt><dd><p>USD $11.99</p></dd></dl>
  <dl><dt>Contents</dt><dd><p>Constructed Deck x 1 (51 cards), DON!! Card x 10</p></dd></dl>
</div><img src="/images/products/decks/st27/item.webp"></body></html>`;

const legacyDetailHtml = `<!doctype html><html lang="en"><body>
<div class="prodStatusBox"><h4 class="prodStatusTit">Product Name</h4>
<div class="prodStatusContents"><p>ONE PIECE CARD GAME -Double Pack Set vol.2- [DP-02]</p></div></div>
<div class="prodStatusBox"><h4 class="prodStatusTit">MSRP</h4>
<div class="prodStatusContents"><p>USD $9.99</p></div></div>
<div class="prodStatusBox"><h4 class="prodStatusTit">Contents</h4>
<div class="prodStatusContents"><ul><li>Booster Pack [OP-05] x2</li><li>DON!! Card x1</li></ul></div></div>
<div class="prodStatusBox"><h4 class="prodStatusTit">Release Date</h4>
<div class="prodStatusContents"><p>December 8, 2023</p></div></div>
</body></html>`;

test("official index parser preserves primary-source links and pagination", () => {
  const result = parseOnePieceOfficialProductIndexV1({
    html: indexHtml,
    pageUrl: "https://en.onepiece-cardgame.com/products/?page=1",
  });
  assert.equal(result.maximum_page, 17);
  assert.equal(result.entries.length, 1);
  assert.equal(result.entries[0].index_category, "decks");
  assert.equal(result.entries[0].official_index_title,
    "STARTER DECK -BLACK Marshall.D.Teach- [ST-27]");
  assert.equal(new URL(result.entries[0].image_url).hostname,
    "en.onepiece-cardgame.com");
});

test("current product detail parser records family evidence without variant authority", () => {
  const indexEntry = parseOnePieceOfficialProductIndexV1({
    html: indexHtml,
    pageUrl: "https://en.onepiece-cardgame.com/products/?page=1",
  }).entries[0];
  const result = parseOnePieceOfficialProductDetailV1({
    html: currentDetailHtml,
    finalUrl: indexEntry.official_url,
    indexEntry,
  });
  assert.equal(result.release_date, "2025-06-06");
  assert.equal(result.contents_text.length, 1);
  assert.equal(result.authority_scope.official_product_family_support, true);
  assert.equal(result.authority_scope.exact_source_variant_support, false);
  assert.equal(result.authority_scope.exact_source_mapping_authority, false);
});

test("legacy product detail parser extracts canonical name and contents", () => {
  const result = parseOnePieceOfficialProductDetailV1({
    html: legacyDetailHtml,
    finalUrl: "https://en.onepiece-cardgame.com/products/other/dp02.php",
    indexEntry: {
      official_index_title: "Double Pack Set Vol.2 [DP-02]",
      index_category: "others",
      index_label: "OTHER",
      index_tag: null,
      release_date_text: null,
      msrp_text: null,
      image_url: null,
    },
  });
  assert.equal(result.official_canonical_name,
    "ONE PIECE CARD GAME -Double Pack Set vol.2- [DP-02]");
  assert.deepEqual(result.contents_text,
    ["Booster Pack [OP-05] x2 DON!! Card x1"]);
  assert.equal(result.release_date, "2023-12-08");
});

test("normalization aligns starter deck numbers and official codes", () => {
  assert.equal(
    normalizeOnePieceSealedOfficialTextV1(
      "STARTER DECK -BLACK Marshall.D.Teach- [ST-27]"),
    "starter deck black marshall d teach starter deck 27",
  );
  assert.equal(
    normalizeOnePieceSealedOfficialTextV1(
      "Starter Deck 27: BLACK Marshall.D.Teach"),
    "starter deck 27 black marshall d teach",
  );
});

test("official binding supports a family candidate but never an exact variant", () => {
  const record = parseOnePieceOfficialProductDetailV1({
    html: currentDetailHtml,
    finalUrl: "https://en.onepiece-cardgame.com/products/decks/st27.php",
    indexEntry: parseOnePieceOfficialProductIndexV1({
      html: indexHtml,
      pageUrl: "https://en.onepiece-cardgame.com/products/?page=1",
    }).entries[0],
  });
  const binding = bindOnePieceSealedReviewToOfficialV1({
    candidate_id: "candidate-1",
    source_product_id: 627678,
    source_product_name: "Starter Deck 27: BLACK Marshall.D.Teach",
    source_identity: { group_name: "Starter Deck 27: BLACK Marshall.D.Teach" },
    proposed_family: {
      proposed_family_key: "starter_deck_27_black_marshall_d_teach",
      proposed_canonical_name: "Starter Deck 27: BLACK Marshall.D.Teach",
    },
    proposed_variant: { proposed_package_form: "deck" },
  }, [record]);
  assert.equal(binding.binding_status,
    "official_family_support_candidate_unique");
  assert.equal(binding.exact_variant_authority, false);
  assert.equal(binding.exact_source_mapping_authority, false);
  assert.equal(binding.promotion_eligible, false);
});

test("authority result validates 403 review rows without promotion authority", () => {
  const record = parseOnePieceOfficialProductDetailV1({
    html: currentDetailHtml,
    finalUrl: "https://en.onepiece-cardgame.com/products/decks/st27.php",
    indexEntry: parseOnePieceOfficialProductIndexV1({
      html: indexHtml,
      pageUrl: "https://en.onepiece-cardgame.com/products/?page=1",
    }).entries[0],
  });
  const reviewRows = Array.from({ length: 403 }, (_, index) => ({
    candidate_id: `candidate-${index}`,
    source_product_id: 700000 + index,
    source_product_name: `Unmatched Product ${index}`,
    source_identity: { group_name: `Unmatched Group ${index}` },
    proposed_family: {
      proposed_family_key: `unmatched_product_${index}`,
      proposed_canonical_name: `Unmatched Product ${index}`,
    },
    proposed_variant: { proposed_package_form: "collection" },
  }));
  const result = buildOnePieceSealedOfficialAuthorityResultV1({
    repository: { commit_sha: "a".repeat(40), branch: "test" },
    reviewPlanFingerprint: "b".repeat(64),
    indexSources: [{ page: 1, url: "https://en.onepiece-cardgame.com/products/" }],
    officialRecords: [record],
    reviewRows,
  });
  assert.deepEqual(validateOnePieceSealedOfficialAuthorityResultV1(result),
    { valid: true, findings: [] });
  assert.equal(result.counts.exact_variant_authorities, 0);
  assert.equal(result.counts.exact_source_mapping_authorities, 0);
});
