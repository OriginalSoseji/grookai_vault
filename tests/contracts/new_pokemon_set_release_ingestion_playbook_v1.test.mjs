import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const playbook = fs.readFileSync('docs/playbooks/NEW_POKEMON_SET_RELEASE_INGESTION_PLAYBOOK_V1.md', 'utf8');
const manifest = JSON.parse(fs.readFileSync('data/set_ingest/20260714_abyss_eye_pitch_black_new_sets_v1.json', 'utf8'));
const runner = fs.readFileSync('scripts/ingest/new_set_release_ingest_v1.mjs', 'utf8');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const abyssEyeCombined = JSON.parse(fs.readFileSync(
  'docs/audits/new_set_release_ingestion_v1/20260714_abyss_eye_pitch_black/raw_sources/abyss_eye_jp/abyss_eye_combined_cards_v1.json',
  'utf8',
));

test('new Pokemon set release playbook remains the standing ingestion contract', () => {
  assert.match(playbook, /standing Grookai playbook/i);
  assert.match(playbook, /One-Command Runner/);
  assert.match(playbook, /Self-Hosted Image Rule/);
  assert.match(playbook, /Stop Conditions/);
});

test('Abyss Eye and Pitch Black release manifest has identity guards', () => {
  const setKeys = manifest.sets.map((set) => set.target_key).sort();
  assert.deepEqual(setKeys, ['abyss_eye_jp', 'pitch_black_en']);

  const abyssEye = manifest.sets.find((set) => set.target_key === 'abyss_eye_jp');
  assert.equal(abyssEye.canonical_set_code, 'jpn-m5');
  assert.equal(abyssEye.source_ids.limitless, 'jp/M5');
  assert.equal(abyssEye.source_ids.bulbapedia, 'Abyss_Eye_(TCG)');
  assert.match(JSON.stringify(abyssEye.source_urls), /jp\.pokellector\.com\/Abyss-Eye-Expansion/);
  assert.match(JSON.stringify(abyssEye.image_identity_guard), /PitchBlack/);
  assert.match(JSON.stringify(abyssEye.image_identity_guard), /card-placeholder/);
  assert.equal(abyssEye.image_overrides.length, 2);
  assert.equal(abyssEye.expected_counts.official, 81);
  assert.equal(abyssEye.expected_counts.secret, 37);
  assert.equal(abyssEye.expected_counts.total, 118);

  const pitchBlack = manifest.sets.find((set) => set.target_key === 'pitch_black_en');
  assert.equal(pitchBlack.canonical_set_code, 'me05');
  assert.match(JSON.stringify(pitchBlack.reject_source_ids), /Black Bolt/);
  assert.match(JSON.stringify(pitchBlack.source_urls), /pokemon\.com\/us\/pokemon-tcg\/mega-evolution-pitch-black/);
});

test('runner exposes manifest-backed one-command workflow', () => {
  assert.match(runner, /--manifest/);
  assert.match(runner, /--self-host-images/);
  assert.match(runner, /--update-master-indexes/);
  assert.match(runner, /limitless_manifest_seed/);
  assert.match(runner, /imageIdentityFindingsForRow/);
  assert.match(runner, /acquirePokellectorAbyssEyeImages/);
  assert.match(runner, /applyReviewedImageOverrides/);
  assert.match(runner, /image_identity_rejected/);
  assert.match(runner, /storage\.from\(STORAGE_BUCKET\)\.upload/);
  assert.equal(
    packageJson.scripts['pokemon:new-sets:ingest'],
    'node scripts/ingest/new_set_release_ingest_v1.mjs',
  );
});

test('Abyss Eye selected image artifact has no Pitch Black or placeholder images', () => {
  assert.equal(abyssEyeCombined.row_count, 118);
  assert.deepEqual(abyssEyeCombined.findings, []);

  const selectedBadImages = abyssEyeCombined.rows.filter((row) => {
    const selectedImageText = [
      row.image_url,
      row.preview_image_url,
      row.source_title,
    ].join(' ');
    return /PitchBlack|Pitch Black|card-placeholder/i.test(selectedImageText);
  });
  assert.deepEqual(selectedBadImages, []);

  const card118 = abyssEyeCombined.rows.find((row) => String(row.number).padStart(3, '0') === '118');
  assert.match(card118.image_url, /Mega-Darkrai-ex\.M5\.118/);
  assert.doesNotMatch(card118.image_url, /PitchBlack/i);
});
