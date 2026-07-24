import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { createClient } from '@supabase/supabase-js';
import {
  FETCH_CONCURRENCY,
  OUTPUT_DIR,
  ROOT,
  STORAGE_BUCKET,
  TLS_VERIFICATION_MODE,
  clean,
  connectVerifiedDbClient as connectVerifiedDbClientWh22,
  mapLimit,
  proofHash,
  readJson,
  readJsonl,
  sha256Hex,
  targetBindingFromEnvironment as targetBindingFromEnvironmentWh22,
  targetBindingsEqual,
  writeJsonl,
} from './self_hosted_images_wh22_common.mjs';

export {
  FETCH_CONCURRENCY,
  OUTPUT_DIR,
  ROOT,
  STORAGE_BUCKET,
  TLS_VERIFICATION_MODE,
  clean,
  mapLimit,
  proofHash,
  readJson,
  readJsonl,
  sha256Hex,
  targetBindingsEqual,
  writeJsonl,
};

export const MANIFEST_SCHEMA = 'grookai.self_hosted_images.wh23.pocket_native_max.v1';
export const PACKAGE_SCOPE = 'GV-TCGP-P-A-74..GV-TCGP-P-A-100';
export const SOURCE_USER_AGENT = 'Grookai Vault WH23 Pocket Native Image Audit/1.0';
export const ALLOWED_APPLY_COLUMNS = Object.freeze([
  'image_path',
  'image_source',
  'image_status',
  'image_url',
]);
export const POINTER_MUTATION_CONTRACT = Object.freeze({
  transport: 'postgres_tls_pre_auth_leaf_and_spki_pin',
  target_table: 'card_prints',
  exact_row_scope: 27,
  allowed_apply_columns: ALLOWED_APPLY_COLUMNS,
  compare_and_swap: 'complete_to_jsonb_card_prints_row',
  locking: 'all_27_rows_for_update_before_first_mutation',
  atomicity: 'single_27_row_transaction',
  failure_recovery: 'database_transaction_rollback',
  storage_precondition: 'all_27_objects_sha256_and_dimensions_reverified_before_begin',
  postcondition: 'complete_row_readback_hash_for_all_27_rows_before_commit',
});

const MAX_IMAGE_BYTES = 2_000_000;
const ALLOWED_SOURCE_HOSTS = new Set(['assets.pokemon-zone.com', 'www.serebii.net']);
const CODE_BUNDLE_FILES = Object.freeze([
  'scripts/audits/self_hosted_images_wh22_common.mjs',
  'scripts/audits/self_hosted_images_wh23_common.mjs',
  'scripts/audits/self_hosted_images_wh23a_pocket_native_upload_dry_run.mjs',
  'scripts/audits/self_hosted_images_wh23b_pocket_native_storage_upload_apply.mjs',
  'scripts/audits/self_hosted_images_wh23c_pocket_native_db_pointer_dry_run.mjs',
  'scripts/audits/self_hosted_images_wh23d_pocket_native_db_pointer_apply.mjs',
  'tests/contracts/self_hosted_images_wh23_guardrails_v1.test.mjs',
]);

// Every primary is the exact full-card WebP exposed by the Pokemon Zone card page.
// Every fallback is an independently hosted full-card JPEG from Serebii. Both
// sources were observed at 367x512. These are the highest directly verified,
// untransformed sources available for this scope; no upscale is made.
const POCKET_ASSET_ROWS = Object.freeze([
  [74, 'Zeraora', 'zeraora', 'cPK_90_007410_00_ZERAORA_AR.webp', 82932, 'b50571ef696d039b5d1df3e4bc54afd81850782e845be17c1c653b468b5a0e87', 98267, '52e68724929de7fb4a376114524278aadcae8f9bf2273305e31fe14621f05c7a'],
  [75, 'Kartana', 'kartana', 'cPK_90_007250_00_KAMITURUGI_C.webp', 42032, '15e73faec8d49014cb8266979072bfb26c28ab69bd730152d129bf8112f023c9', 56021, 'd99918def37ec20c469dd15da90ddc5f4e4d477b451fe8b5442314baeda9faab'],
  [76, 'Blacephalon', 'blacephalon', 'cPK_90_007260_00_ZUGADOON_C.webp', 54398, 'e81f7ddf25a48c6654211790ee5c4c5ce2c09f94d3f1faa13bf885bd5a3d193c', 64641, 'b55e5d70c4936f5cf844e68a13cf1589f32ebe4eda19452cbc8dbe372b71e37f'],
  [77, 'Xurkitree', 'xurkitree', 'cPK_90_007270_00_DENJYUMOKU_C.webp', 49542, '17f3cd883145732b48973fe7e105c78b0d3ee74cc57f6030a340a01dd0924016', 66134, '7bce8ea85efb287850fabbac3c1a7730680ef0f385e9799b1eee5b1d89c7c0f2'],
  [78, 'Dawn Wings Necrozma', 'dawn-wings-necrozma', 'cPK_90_007280_00_NECROZMAAKATSUKINOTSUBASA_R.webp', 54306, 'fd21a7e1e78eb0ea2737c1df72f9eb1073cd413bc4d4d7c9a33330f509ba6de4', 63742, '2e3ab4592e5187b42fbf592b0b17955688fca9115a8c8de500facc674ad0257a'],
  [79, 'Dusk Mane Necrozma', 'dusk-mane-necrozma', 'cPK_90_007290_00_NECROZMATASOGARENOTATEGAMI_R.webp', 64474, 'e4880c3b59990d4184b7fb82acec8bc7b793d7925735a8ce51f16f7a7479e6cd', 70336, '860341cbb70e30b0ac3e8598676025056bf22a1435329783f6769dac4a1d48cc'],
  [80, 'Stakataka', 'stakataka', 'cPK_90_007300_00_TUNDETUNDE_C.webp', 60410, '85ad5575bb19b1a86d8ae637ba2549c47e63757f70ecc11d1f9374410b68c688', 66435, '7f28f126521b626f960a94d68cc18ba1e06f05137449e208d431941cb167909b'],
  [81, 'Ultra Necrozma ex', 'ultra-necrozma-ex', 'cPK_90_007310_00_NECROZMAULTRANECROZMAex_RR.webp', 67036, 'ebc81a16eee7583d784af8feb3ed785e4fc4abf98f94e120bce9db42685099a1', 75457, '83b6f657d287a1407d76a681b49b50170c5a30fe576788ee1bc9ea9b24ebacdd'],
  [82, 'Poipole', 'poipole', 'cPK_90_007370_00_BEVENOM_R.webp', 57848, 'b73c37c1b21d6efc7fcc48ad7fd3d381f7344f611c262545649031e81b83303b', 65960, 'c168bc750404c2c5112bb6a820f5ab186918b7b7e19e666d9c6d6538b49ddfff'],
  [83, 'Stufful', 'stufful', 'cPK_90_007380_00_NUIKOGUMA_R.webp', 48844, '66f1d98a617e1777dbef240d2f7172f739352c7af0a3b4ad6066d5e89d1a8c56', 58896, '5a5ae73ce90a4158310f77b344ca037b50acc53ab827a0d99c91aec0c1e5ed20'],
  [84, 'Tapu Koko ex', 'tapu-koko-ex', 'cPK_90_007420_00_KAPU-KOKEKOex_RR.webp', 58314, '55e54874110293b438582e418e9c5e32bd45f7abbf53f755a8afb591f8f55e68', 75423, '5d7ed601e31e8628a1e88326fefacc5c11f3a8e8e3de3328003177d3fcb2b67b'],
  [85, 'Vanillite', 'vanillite', 'cPK_90_007320_00_VANIPETI_C.webp', 54770, '41884269ad614779199c27f1dafe133825cb7f591c04625a5948ee845f996ca4', 66404, 'd00ae85fede1364526af951640a0503838033531d34797d60e7a71c490eb7fcf'],
  [86, 'Jolteon', 'jolteon', 'cPK_90_007330_00_THUNDERS_R.webp', 44762, '89ccad173718146ec42539082221c91b948173e30151ea8a1ef6d4d787427b01', 63589, 'a19438e5a9f5e5f9d9e9f5e42d8678dde640cf36c61135ac2ac2ae05934098ab'],
  [87, 'Alcremie', 'alcremie', 'cPK_90_007340_00_MAWHIP_AR.webp', 72680, 'cd356edfed3b597271b175d53cf2eb7c870f4d3d5236a27d05552835d514665e', 79874, 'a63276142a838b1707f1aaa8a82193d927cc35ecd2eacbdbb811f23f0b3c34f6'],
  [88, 'Dragonair', 'dragonair', 'cPK_90_007350_00_HAKURYU_C.webp', 53434, '869020a62969736ebe8aa3890cc2343c9c02a5fd8f6401b8c4aa355e2308892a', 61618, '89263b856038575ebd81ee5b766f2bcfb8dcf863a9fd730ec22375ae2a6eb9bb'],
  [89, 'Audino', 'audino', 'cPK_90_007360_00_TABUNNE_C.webp', 44252, '40229b48db9e05e0b28242d1a5ecbf91757cf29bf355ed68c39802c06a7e2c4c', 54311, '2bf76633c2d10261fc41db34981c6c58b4b86f13b507c3521ea4e6eebbdcf87e'],
  [90, 'Togedemaru', 'togedemaru', 'cPK_90_007390_00_TOGEDEMARU_R.webp', 64094, '25dc51c0dc7db3c8e4bdcc035b97168e5f64f90f9ae97e6af2841a8df216123a', 69187, 'a8fa52ec16e16da915b468bb25f9fa2ab728af85611a181bb4dce229322840af'],
  [91, 'Greedent', 'greedent', 'cPK_90_007400_00_YOKUBARISU_R.webp', 47922, '7ddf261420ab57e90af9ffc587160b5e15016dcd2aa22793edff2eb35f03461a', 59785, '03618b14c9e6e785a2955af82625f8dc414f9ee6cfbb8ae867758317bb863c2f'],
  [92, 'Eevee', 'eevee', 'cPK_90_002060_00_EIEVUI_R.webp', 47826, '881315ec15e4c8a643adebc23e943defcfe612318be17a74c7468312a12b93d6', 56797, 'cac2ce8df2285f940c230c3667c8e5e48308eec1ce552685154b46050f5858a4'],
  [93, 'Cleffa', 'cleffa', 'cPK_90_009330_00_PY_AR.webp', 44212, '3870b0955b069995ab84f37b26e19fba0adda2b5a24a3fe3d16b746a27038852', 56983, '29088b872e73465264773226becde503f2624f470ef982e6a69cbce65509fa70'],
  [94, 'Horsea', 'horsea', 'cPK_90_010070_00_TATTU_C.webp', 55646, '5eb07f6edb2a7bd41b5999ae5b277d50afcb8e8f262c36eda548f6c2400165f5', 62389, '1c6f32e95b9bf4925f7c9b243f730c178f37289786dc72376fe0bfe882afa59c'],
  [95, 'Chinchou', 'chinchou', 'cPK_90_010080_00_CHONCHIE_C.webp', 48184, '607784f65a361b4a68f24b3166d6f1b9265faaa9396f20a545d41bbedf3087c3', 63124, '9378e5810a80229ec684566ba668d8a7da0fc7fff96f7608f942948742ad4856'],
  [96, 'Houndoom', 'houndoom', 'cPK_90_009740_00_HELLGAR_C.webp', 55534, 'f2269099eb469bc65402c2bed648469e6951ede72275bc9de0d8d07404b97f99', 64042, '5f818741f997c66eac7e4ed0e5a76d69ac592c5c783fb4400fe2b09788d1d39f'],
  [97, 'Kangaskhan', 'kangaskhan', 'cPK_90_009890_00_GARURA_R.webp', 47896, '210af513a6f026d67bf6ac2a45302bc00d3d44c639373f73bb76831adc2c4f0e', 59500, '786a07a7a23e3d76b090860587dfd1531d2e37c7865165dbe79d99edeaf15295'],
  [98, 'Blissey ex', 'blissey-ex', 'cPK_90_010090_00_HAPPINASex_RR.webp', 48288, '0e85fc6c25a1a5a7289659f11f2665fc60ca213aa63b8dd4c1faf17b0c5c1346', 59086, '6ef30dad8babb1581352a3eedabc3d8a20cf80b1dceba33dcf9889b190ee79e3'],
  [99, 'Marill', 'marill', 'cPK_90_009050_00_MARIL_R.webp', 62354, 'd748d3d1ea21b7377504f2a5444f886a0bd8e23584103b29b52ccf23acd922f2', 66157, 'd12558ddc9127e9e7071ab0beec1345d3a8d7c4bb0cf4e1d101a259108c948b3'],
  [100, 'Weavile', 'weavile', 'cPK_90_009720_00_MANYULA_R.webp', 56718, 'dfb8fdd5e491051148c53bb548fa1c46d02552e4baaefdb930a612210bcd7e6f', 63874, '44d459fdb8971663d66f4ce3c6dd458c5ac6cb2269cde375d9f4e2108077e115'],
]);

export const HOSTED_CONVENTION_SAMPLES = Object.freeze([
  { gv_id: 'GV-TCGP-P-A-1', path: 'warehouse-derived/self-hosted-images-v1/card_prints/unknown/gv-tcgp-p-a-1/638b4fe4003c31ca3a249a84.webp', source_url: 'https://assets.tcgdex.net/en/tcgp/P-A/001/high.webp', size_bytes: 34156, sha256: '638b4fe4003c31ca3a249a8412625e6326c596578ed2c05a39078e7456ccd990' },
  { gv_id: 'GV-TCGP-P-A-37', path: 'warehouse-derived/self-hosted-images-v1/card_prints/unknown/gv-tcgp-p-a-37/2339d850535fb00370ddb6dc.webp', source_url: 'https://assets.tcgdex.net/en/tcgp/P-A/037/high.webp', size_bytes: 51746, sha256: '2339d850535fb00370ddb6dc5ea5bbb0fdba65c8fee055956d023a280220395b' },
  { gv_id: 'GV-TCGP-P-A-50', path: 'warehouse-derived/self-hosted-images-v1/card_prints/unknown/gv-tcgp-p-a-50/b0546533c5b0c9af336f819b.webp', source_url: 'https://assets.tcgdex.net/en/tcgp/P-A/050/high.webp', size_bytes: 52456, sha256: 'b0546533c5b0c9af336f819b34ac03c23afcdfe4b9aba160d4f795e43c100cf0' },
  { gv_id: 'GV-TCGP-P-A-73', path: 'warehouse-derived/self-hosted-images-v1/card_prints/unknown/gv-tcgp-p-a-73/b6a75b61466fd4898b46264d.webp', source_url: 'https://assets.tcgdex.net/en/tcgp/P-A/073/high.webp', size_bytes: 41158, sha256: 'b6a75b61466fd4898b46264d485c90f01a6de2fdfb31cf07d799be5d57dfdc5f' },
]);

function normalizePathSegment(value, fallback = 'unknown') {
  return String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || fallback;
}

export function assetDefinitions() {
  return POCKET_ASSET_ROWS.map(([number, name, slug, sourceFile, primaryBytes, primarySha, fallbackBytes, fallbackSha]) => {
    const gvId = `GV-TCGP-P-A-${number}`;
    return {
      asset_id: `p-a-${number}`,
      owner_gv_id: gvId,
      number: String(number),
      name,
      set_code: null,
      identity_domain: 'tcg_pocket_excluded',
      source_provider: 'pokemon-zone-game-preview',
      source_page_url: `https://www.pokemon-zone.com/cards/promo-a/${number}/${slug}/`,
      source_url: `https://assets.pokemon-zone.com/game-assets/CardPreviews/${sourceFile}`,
      source_expected: { content_type: 'image/webp', size_bytes: primaryBytes, sha256: primarySha, width: 367, height: 512, format: 'webp' },
      fallback_provider: 'serebii',
      fallback_url: `https://www.serebii.net/tcgpocket/promo-a/${number}.jpg`,
      fallback_expected: { content_type: 'image/jpeg', size_bytes: fallbackBytes, sha256: fallbackSha, width: 367, height: 512, format: 'jpg' },
      quality_claim: 'highest_directly_verified_untransformed_full_card_source_available_at_acquisition_time',
      transformation: 'none_exact_primary_source_bytes',
      target_storage_bucket: STORAGE_BUCKET,
      target_storage_path: `warehouse-derived/self-hosted-images-v1/card_prints/unknown/${normalizePathSegment(gvId)}/${primarySha.slice(0, 24)}.webp`,
      overwrite_allowed: false,
    };
  });
}

export function rowDefinitions() {
  return assetDefinitions().map((asset) => ({
    gv_id: asset.owner_gv_id,
    asset_id: asset.asset_id,
    number: asset.number,
    expected_name: asset.name,
    expected_identity_domain: 'tcg_pocket_excluded',
    expected_set_code: null,
    expected_image_status: 'missing',
    proposed_image_status: 'exact',
  }));
}

export async function computeCodeBundleHash() {
  const files = [];
  for (const relativePath of CODE_BUNDLE_FILES) {
    files.push({ relative_path: relativePath, sha256: sha256Hex(await fs.readFile(path.join(ROOT, relativePath))) });
  }
  return { files, hash: proofHash(files) };
}

export function computeManifestFingerprint(assetRows, rowRows, targetBinding, codeBundleHash) {
  return proofHash({
    manifest_schema: MANIFEST_SCHEMA,
    package_scope: PACKAGE_SCOPE,
    target_binding: targetBinding,
    code_bundle_hash: codeBundleHash,
    mutation_contract: POINTER_MUTATION_CONTRACT,
    asset_manifest_rows: assetRows,
    row_manifest_rows: rowRows,
  });
}

export function computePointerPlanHash(fingerprint, targetBinding, codeBundleHash, pointerRows) {
  return proofHash({
    package_id: 'IMG-HOST-WH-23C-POCKET-NATIVE-DB-POINTER-DRY-RUN',
    fingerprint,
    target_binding: targetBinding,
    code_bundle_hash: codeBundleHash,
    mutation_contract: POINTER_MUTATION_CONTRACT,
    rows: [...pointerRows]
      .sort((left, right) => Number(left.number) - Number(right.number))
      .map((row) => ({
        target_row_id: row.target_row_id,
        gv_id: row.gv_id,
        number: row.number,
        asset_id: row.asset_id,
        manifest_before_snapshot_hash: row.manifest_before_snapshot_hash,
        manifest_after_snapshot_hash: row.manifest_after_snapshot_hash,
        proposed_values: row.proposed_values,
        target_storage_bucket: row.target_storage_bucket,
        target_storage_path: row.target_storage_path,
      })),
  });
}

export function createDataClient() {
  const url = clean(process.env.SUPABASE_URL);
  const key = clean(process.env.SUPABASE_SECRET_KEY);
  if (!url) throw new Error('Missing SUPABASE_URL.');
  if (!key) throw new Error('Missing SUPABASE_SECRET_KEY.');
  return createClient(url, key, {
    auth: { persistSession: false },
    global: { headers: { 'user-agent': SOURCE_USER_AGENT } },
  });
}

export const createStorageClient = createDataClient;

const PLAN_ONLY_DB_PASSWORD = 'WH23_PLAN_ONLY_NO_AUTH';

function ensureProjectScopedDbDescriptor() {
  const existing = process.env.SUPABASE_DB_URL
    ?? process.env.DATABASE_URL
    ?? process.env.POSTGRES_URL
    ?? process.env.POSTGRES_PRISMA_URL;
  if (clean(existing)) return;
  const supabaseUrl = new URL(clean(process.env.SUPABASE_URL) ?? '');
  const match = supabaseUrl.hostname.match(/^([a-z0-9]+)\.supabase\.co$/i);
  if (!match) throw new Error('Cannot derive project-scoped plan-only database target from SUPABASE_URL.');
  process.env.SUPABASE_DB_URL = `postgresql://postgres:${PLAN_ONLY_DB_PASSWORD}@db.${match[1].toLowerCase()}.supabase.co:5432/postgres`;
}

export async function targetBindingFromEnvironment() {
  ensureProjectScopedDbDescriptor();
  return targetBindingFromEnvironmentWh22();
}

export async function connectVerifiedDbClient(expectedBinding) {
  ensureProjectScopedDbDescriptor();
  const rawUrl = process.env.SUPABASE_DB_URL
    ?? process.env.DATABASE_URL
    ?? process.env.POSTGRES_URL
    ?? process.env.POSTGRES_PRISMA_URL
    ?? '';
  if (rawUrl.includes(PLAN_ONLY_DB_PASSWORD)) {
    throw new Error('WH23 database apply requires an explicit real SUPABASE_DB_URL; the plan-only descriptor cannot authenticate.');
  }
  return connectVerifiedDbClientWh22(expectedBinding);
}

function jpegDimensions(buffer) {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) { offset += 1; continue; }
    const marker = buffer[offset + 1];
    if (marker === 0xd8 || marker === 0xd9) { offset += 2; continue; }
    const length = buffer.readUInt16BE(offset + 2);
    if (length < 2) return null;
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return { width: buffer.readUInt16BE(offset + 7), height: buffer.readUInt16BE(offset + 5), format: 'jpg' };
    }
    offset += 2 + length;
  }
  return null;
}

function webpDimensions(buffer) {
  if (buffer.length < 30 || buffer.subarray(0, 4).toString('ascii') !== 'RIFF' || buffer.subarray(8, 12).toString('ascii') !== 'WEBP') return null;
  const chunk = buffer.subarray(12, 16).toString('ascii');
  if (chunk === 'VP8X') return { width: 1 + buffer.readUIntLE(24, 3), height: 1 + buffer.readUIntLE(27, 3), format: 'webp' };
  if (chunk === 'VP8L' && buffer.length >= 25 && buffer[20] === 0x2f) {
    const bits = buffer.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1, format: 'webp' };
  }
  if (chunk === 'VP8 ' && buffer.length >= 30 && buffer[23] === 0x9d && buffer[24] === 0x01 && buffer[25] === 0x2a) {
    return { width: buffer.readUInt16LE(26) & 0x3fff, height: buffer.readUInt16LE(28) & 0x3fff, format: 'webp' };
  }
  return null;
}

export function observeImageBuffer(buffer, contentType, extra = {}) {
  const dimensions = webpDimensions(buffer) ?? jpegDimensions(buffer);
  return {
    ...extra,
    content_type: clean(contentType)?.split(';')[0]?.toLowerCase() ?? null,
    size_bytes: buffer.length,
    sha256: sha256Hex(buffer),
    width: dimensions?.width ?? null,
    height: dimensions?.height ?? null,
    format: dimensions?.format ?? null,
  };
}

export function verifyImageObservation(observed, expected, { requireHttpSuccess = false } = {}) {
  const errors = [];
  if (requireHttpSuccess && observed?.ok !== true) errors.push(`http_${observed?.status ?? 'unknown'}`);
  for (const key of ['content_type', 'size_bytes', 'sha256', 'width', 'height', 'format']) {
    if (observed?.[key] !== expected?.[key]) errors.push(`${key}_mismatch`);
  }
  return errors;
}

async function readResponseBuffer(response) {
  const declared = Number.parseInt(response.headers.get('content-length') ?? '0', 10);
  if (declared > MAX_IMAGE_BYTES) throw new Error(`response_too_large:${declared}`);
  const chunks = [];
  let size = 0;
  for await (const chunk of response.body ?? []) {
    const value = Buffer.from(chunk);
    size += value.length;
    if (size > MAX_IMAGE_BYTES) throw new Error(`response_too_large_streamed:${size}`);
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

export async function fetchPocketImage(url, timeoutMs = 45_000) {
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:' || !ALLOWED_SOURCE_HOSTS.has(parsed.hostname.toLowerCase())) {
    throw new Error(`source_url_not_allowed:${url}`);
  }
  const pokemonZone = parsed.hostname.toLowerCase() === 'assets.pokemon-zone.com';
  const response = await fetch(parsed, {
    redirect: 'follow',
    signal: AbortSignal.timeout(timeoutMs),
    headers: pokemonZone ? {
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/138.0.0.0 Safari/537.36',
      accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      'accept-language': 'en-US,en;q=0.9',
      referer: 'https://www.pokemon-zone.com/',
      'sec-fetch-dest': 'image',
      'sec-fetch-mode': 'no-cors',
      'sec-fetch-site': 'same-site',
    } : {
      'user-agent': SOURCE_USER_AGENT,
      accept: 'image/jpeg,image/*;q=0.8,*/*;q=0.1',
    },
  });
  const finalUrl = new URL(response.url);
  if (finalUrl.protocol !== 'https:' || !ALLOWED_SOURCE_HOSTS.has(finalUrl.hostname.toLowerCase())) {
    throw new Error(`redirected_source_url_not_allowed:${response.url}`);
  }
  const buffer = await readResponseBuffer(response);
  return {
    buffer,
    observation: observeImageBuffer(buffer, response.headers.get('content-type'), {
      ok: response.ok,
      status: response.status,
      final_url: response.url,
      tls_verification: TLS_VERIFICATION_MODE,
    }),
  };
}

export async function storageObjectExists(supabase, bucket, storagePath) {
  const slash = storagePath.lastIndexOf('/');
  const folder = slash >= 0 ? storagePath.slice(0, slash) : '';
  const fileName = slash >= 0 ? storagePath.slice(slash + 1) : storagePath;
  const { data, error } = await supabase.storage.from(bucket).list(folder, { limit: 100, search: fileName });
  if (error) throw new Error(`storage_probe_failed:${bucket}:${storagePath}:${error.message}`);
  return (data ?? []).some((entry) => entry.name === fileName);
}

export async function downloadStorageImage(supabase, bucket, storagePath) {
  const { data, error } = await supabase.storage.from(bucket).download(storagePath);
  if (error) throw new Error(`storage_download_failed:${bucket}:${storagePath}:${error.message}`);
  const buffer = Buffer.from(await data.arrayBuffer());
  return { buffer, observation: observeImageBuffer(buffer, data.type, { ok: true, status: 200, storage_bucket: bucket, storage_path: storagePath }) };
}

export async function inspectStorageAsset(supabase, asset, expected = asset.source_expected) {
  const exists = await storageObjectExists(supabase, asset.target_storage_bucket, asset.target_storage_path);
  if (!exists) return { exists: false, valid: false, observation: null, errors: ['storage_object_missing'] };
  const downloaded = await downloadStorageImage(supabase, asset.target_storage_bucket, asset.target_storage_path);
  const errors = verifyImageObservation(downloaded.observation, expected);
  return { exists: true, valid: errors.length === 0, observation: downloaded.observation, errors };
}

export function validateManifestSemantics(assetRows, rowRows, targetBinding) {
  const errors = [];
  const definitions = assetDefinitions();
  const expectedGvIds = definitions.map((row) => row.owner_gv_id);
  const expectedAssetById = new Map(definitions.map((row) => [row.asset_id, row]));
  if (assetRows.length !== 27 || new Set(assetRows.map((row) => row.asset_id)).size !== 27) errors.push('asset_scope_not_exactly_27_unique');
  if (rowRows.length !== 27 || new Set(rowRows.map((row) => row.gv_id)).size !== 27) errors.push('row_scope_not_exactly_27_unique');
  if (proofHash([...rowRows.map((row) => row.gv_id)].sort((a, b) => Number(a.split('-').at(-1)) - Number(b.split('-').at(-1)))) !== proofHash(expectedGvIds)) errors.push('gv_id_scope_drift');
  if (targetBinding?.storage_bucket !== STORAGE_BUCKET) errors.push('storage_bucket_target_mismatch');
  for (const asset of assetRows) {
    const expected = expectedAssetById.get(asset.asset_id);
    if (!expected) { errors.push(`unexpected_asset:${asset.asset_id}`); continue; }
    if (asset.owner_gv_id !== expected.owner_gv_id || asset.target_storage_path !== expected.target_storage_path) errors.push(`asset_identity_drift:${asset.asset_id}`);
    if (proofHash(asset.source_expected) !== proofHash(expected.source_expected)) errors.push(`primary_evidence_drift:${asset.asset_id}`);
    if (proofHash(asset.fallback_expected) !== proofHash(expected.fallback_expected)) errors.push(`fallback_evidence_drift:${asset.asset_id}`);
    if (asset.source_verified !== true || asset.fallback_verified !== true) errors.push(`unverified_source:${asset.asset_id}`);
    if (asset.overwrite_allowed !== false) errors.push(`overwrite_policy_drift:${asset.asset_id}`);
  }
  for (const row of rowRows) {
    if (row.current_row_snapshot?.gv_id !== row.gv_id) errors.push(`snapshot_gv_id_drift:${row.gv_id}`);
    if (row.current_row_snapshot?.identity_domain !== 'tcg_pocket_excluded') errors.push(`identity_domain_drift:${row.gv_id}`);
    if (row.current_row_snapshot?.set_code !== null) errors.push(`set_code_drift:${row.gv_id}`);
    if (proofHash(Object.keys(row.proposed_values).sort()) !== proofHash([...ALLOWED_APPLY_COLUMNS].sort())) errors.push(`column_scope_drift:${row.gv_id}`);
    if (row.proposed_values?.image_source !== 'identity' || row.proposed_values?.image_status !== 'exact') errors.push(`pointer_state_drift:${row.gv_id}`);
    if (row.proposed_values?.image_url !== row.verified_fallback_url) errors.push(`fallback_pointer_drift:${row.gv_id}`);
  }
  return [...new Set(errors)].sort();
}
