import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { stripSourceSetHtmlV1 } from '../audits/japanese_master_index_v4/set_source_parsers_v1.mjs';

// This compiler consumes preserved evidence only. It never accesses a database,
// downloads images, translates with a model, or mutates canonical identity.
const root = process.cwd();
const input = process.argv[2];
assert.ok(input, 'Pass the directory containing read-only coverage/covers receipts.');
const read = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const hash = (p) => createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const base = path.join(root, 'docs/audits/japanese_master_index_v4/sets');
const assertionsFile = path.join(base, 'source_set_assertions_v1.json');
const registryFile = path.join(base, 'jpn_set_registry_v1.json');
const scopeFile = path.join(base, 'jpn_official_product_scope_v1.json');
const assertions = read(assertionsFile).content.assertions;
const registry = read(registryFile).content.registry_entries;
const products = read(scopeFile).content.products;
const translationsFile = path.join(root, 'scripts/catalog/japanese_display_translations_v1.json');
const translations = read(translationsFile).entries;
const coverage = read(path.join(input, 'coverage.sql.result.json'));
const covers = read(path.join(input, 'covers.sql.result.json'));
const readbackFile = path.join(input, 'cover-readback.json');
const readbacks = read(readbackFile).results;
const packagesFile = path.join(input, 'package-cover-readback.json');
const packageReadbacks = read(packagesFile);
for (const receipt of [coverage, covers]) {
  assert.equal(receipt.project, 'ycdxbpibncqcchqiihfz');
  assert.equal(receipt.readOnly, true);
  assert.equal(receipt.status, 201);
}
const sets = coverage.body[0].evidence.populated_japanese_sets;
const ja = (v) => /[\u3040-\u30ff\u3400-\u9fff]/u.test(v ?? '');
const normalize = (v) => stripSourceSetHtmlV1(v).normalize('NFKC').replace(/\s+/gu, '').toLowerCase();
const core = (v) => {
  const quoted = String(v ?? '').match(/[「『]([^」』]+)[」』]/u);
  return normalize(quoted?.[1] ?? v);
};
const unique = (values) => [...new Set(values.filter(Boolean))];
const entries = {};
const gaps = [];
for (const s of sets) {
  const r = registry.find((r) => r.registry_key.toLowerCase() === s.code.toLowerCase());
  const keys = new Set(r?.source_assertion_keys ?? []);
  const linked = assertions.filter((a) => keys.has(`${a.source_id}:${a.source_set_id}`));
  const japanese = stripSourceSetHtmlV1(s.source?.canonical_name_ja ?? (ja(s.name) ? s.name : null)) || null;
  const matches = japanese ? assertions.filter((a) => a.source_native_japanese_name && core(a.source_native_japanese_name) === core(japanese)) : [];
  const translated = unique(matches.map((a) => a.source_native_name).filter((v) => !ja(v)));
  const translation = translations[s.code.toLowerCase()];
  if (translation) assert.equal(normalize(translation.name_ja), normalize(japanese), `Translation source drift: ${s.code}`);
  const english = translation?.name_en ?? (translated.length === 1 ? translated[0]
    : (!ja(r?.preferred_source_name) && r?.preferred_source_name ? r.preferred_source_name
      : !ja(s.name) && !/^Japanese\s/i.test(s.name) ? s.name : null));
  const nameMatches = english ? assertions.filter((a) => normalize(a.source_native_name) === normalize(english)) : [];
  const japaneseNames = unique([...linked, ...nameMatches].map((a) => a.source_native_japanese_name).filter(ja));
  const printedName = japanese ?? (japaneseNames.length === 1 ? japaneseNames[0] : null);
  const official = products.find((p) => p.registry_key.toLowerCase() === s.code.toLowerCase());
  const officialCode = {
    'jpn-product-3090050c1bdfc5ce': 'M4',
    'jpn-product-48f4cc1504b3dc44': 'M5',
    'jpn-product-93e429bd4ffd351d': 'M6',
  }[s.code.toLowerCase()];
  // These three codes were checked against their official product pages. Other
  // URL path fragments are deliberately not promoted into printed codes.
  const printedCode = officialCode ?? (/^[a-z0-9][a-z0-9.-]{0,15}$/i.test(s.printed_set_abbrev ?? '') && !/product/i.test(s.printed_set_abbrev) ? s.printed_set_abbrev : null);
  entries[s.code.toLowerCase()] = {
    set_id: s.id, game: 'pokemon', name_en: english, name_ja: printedName,
    printed_code: printedCode,
    translation_kind: translation ? 'editorial_translation_of_official_name' : 'preserved_source_display_name',
    sources: unique([...linked, ...matches, ...nameMatches].map((a) => a.source_url).concat(official?.source_url ?? [], officialCode ? `https://www.pokemon-card.com/ex/${officialCode.toLowerCase()}/` : [])),
  };
  if (!english || !printedName) gaps.push({ code: s.code, name: s.name, missing: [!english && 'english_name', !printedName && 'japanese_name'].filter(Boolean) });
}
const verifiedCovers = covers.body.filter(c => readbacks.some(r => r.valid === true && r.status === 200 && r.set_id === c.set_id && r.gv_id === c.gv_id));
for (const c of verifiedCovers) {
  assert.equal(c.game, 'pokemon');
  assert.ok(c.gv_id && c.image_path && c.card_print_id && c.set_id);
  const key = c.code.toLowerCase();
  const existing = entries[key];
  assert.ok(!existing || existing.set_id === c.set_id, `Set code collision: ${key}`);
  entries[key] = { ...existing, set_id: c.set_id, game: c.game,
    cover_card_gv_id: c.gv_id, cover_card_print_id: c.card_print_id,
    cover_image_path: c.image_path, cover_role: 'representative_card' };
}
for (const p of packageReadbacks.results.filter(p => p.valid)) {
  const entry = entries[p.code.toLowerCase()];
  assert.equal(entry?.set_id, p.set_id);
  assert.match(p.local_url, /^\/catalog-set-covers\/[a-f0-9]{64}\.(jpg|png|webp)$/);
  assert.equal(hash(path.join(root, 'apps/web/public', p.local_url)), p.sha256);
  Object.assign(entry, { package_cover_url: p.local_url, package_source_url: p.source_url,
    package_image_source_url: p.image_url, package_image_sha256: p.sha256 });
}
const manifest = { version: 'CATALOG_PRESENTATION_V1',
  inputs: Object.fromEntries([assertionsFile,registryFile,scopeFile,translationsFile,path.join(input,'coverage.sql.result.json'),path.join(input,'covers.sql.result.json'),readbackFile,packagesFile].map((p) => [path.basename(p),hash(p)])),
  entries: Object.fromEntries(Object.entries(entries).sort(([a],[b]) => a.localeCompare(b))) };
fs.writeFileSync(path.join(root, 'apps/web/src/lib/catalogPresentation.generated.json'), JSON.stringify(manifest, null, 2) + '\n');
fs.writeFileSync(path.join(input, 'display-gaps.json'), JSON.stringify(gaps, null, 2));
console.log(JSON.stringify({ entries: Object.keys(entries).length, representativeCovers: verifiedCovers.length, unverifiedCoverCandidates: covers.body.length - verifiedCovers.length, bilingual: sets.length - gaps.length, nameGaps: gaps.length }));
