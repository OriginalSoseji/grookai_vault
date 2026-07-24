import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import net from 'node:net';
import path from 'node:path';
import process from 'node:process';
import tls from 'node:tls';
import { createClient } from '@supabase/supabase-js';
import pg from 'pg';

// Node does not use the Windows trust store by default. Add it to the bundled
// roots while keeping certificate and hostname verification fully enabled.
tls.setDefaultCACertificates([
  ...tls.getCACertificates('default'),
  ...tls.getCACertificates('system'),
]);

export const ROOT = process.cwd();
export const OUTPUT_DIR = path.join(ROOT, 'docs', 'audits', 'image_truth_v1');
export const STORAGE_BUCKET = process.env.SELF_HOSTED_IMAGES_STORAGE_BUCKET ?? 'user-card-images';
export const FETCH_TIMEOUT_MS = Math.max(
  10_000,
  Number.parseInt(process.env.IMG_HOST_WH22_FETCH_TIMEOUT_MS ?? '45000', 10) || 45_000,
);
export const FETCH_CONCURRENCY = Math.max(
  1,
  Math.min(Number.parseInt(process.env.IMG_HOST_WH22_FETCH_CONCURRENCY ?? '4', 10) || 4, 8),
);
export const USER_AGENT = 'Grookai Vault WH22 Residual Image Hosting/1.0';
export const MANIFEST_SCHEMA = 'grookai.self_hosted_images.wh22.residual_governed.v1';
export const TLS_VERIFICATION_MODE = 'enabled_with_node_bundled_plus_windows_system_ca_roots';
export const SUPABASE_DB_TLS_PINS = Object.freeze({
  root_sha256: '807025ad50d4ed219d2c9c7d299c004f824eb00cf7f65afef607d07b72e6cafa',
  root_subject_cn: 'Supabase Root 2021 CA',
  intermediate_sha256: '303b0a59bbc8d77e967fbed20b3fe68ec5d7d391c3081ece9936efceef0a55ea',
});
export const ALLOWED_HOSTED_PREFIXES = [
  'warehouse-derived/self-hosted-images-v1/',
  'warehouse-derived/image-truth-v1/',
];
export const ALLOWED_APPLY_COLUMNS = [
  'image_source',
  'image_path',
  'image_status',
  'image_url',
  'representative_image_url',
];
export const POINTER_MUTATION_CONTRACT = {
  transport: 'postgres_tls_pre_auth_leaf_and_spki_pin',
  target_table: 'card_prints',
  allowed_apply_columns: ALLOWED_APPLY_COLUMNS,
  compare_and_swap_fields: [
    'id',
    'gv_id',
    'name',
    'set_code',
    'number',
    'variant_key',
    'image_source',
    'image_path',
    'image_status',
    'image_note',
    'image_url',
    'image_alt_url',
    'representative_image_url',
  ],
  failure_recovery: 'database_transaction_rollback',
  atomicity: 'single_24_row_transaction',
};
export const MAX_IMAGE_BYTES = Math.max(
  2_000_000,
  Number.parseInt(process.env.IMG_HOST_WH22_MAX_IMAGE_BYTES ?? '8388608', 10) || 8_388_608,
);
export const ALLOWED_IMAGE_HOSTS = new Set([
  'pkmncards.com',
  'www.pkmncards.com',
  'product-images.tcgplayer.com',
  'images.pokemontcg.io',
  'assets.tcgdex.net',
]);
const CODE_BUNDLE_FILES = [
  'scripts/audits/self_hosted_images_wh22_common.mjs',
  'scripts/audits/self_hosted_images_wh22a_residual_governed_upload_dry_run.mjs',
  'scripts/audits/self_hosted_images_wh22b_residual_governed_storage_upload_apply.mjs',
  'scripts/audits/self_hosted_images_wh22c_residual_governed_db_pointer_dry_run.mjs',
  'scripts/audits/self_hosted_images_wh22d_residual_governed_db_pointer_apply.mjs',
];

const PKMNCARDS_ASSETS = [
  ['190', 231265, '317f51d07cda8d0d8c7ffe884e6f82c441d465c6397cfdc8a3d00a789ddfb52a'],
  ['191', 158497, '6a18ef1b02b9601cebcf28343d8afc78b4c96b8c66008e1ca0b0bb04dc034806'],
  ['192', 166925, '21f61733d0a0bdb5d5f4f079002e73df38f39e29458fcfece64d7d8d1701981e'],
  ['204', 198516, '449c95df6f40bc70347f9b6b5126f065ad0714ed99e77f77006ba0d51ea4054b'],
  ['205', 202237, '5f99624de5d459a5cee1a56fc40a4dc59cd6610bf0c1811e42b9be7b84baf825'],
  ['208', 174536, 'e662a0cc021a000a7427c6bf2078a18b1546a9e5f814379267468916e2f7b7ee'],
  ['209', 215446, '92b26b23cd4bda45f351612e5d4e07da983990744b8aa2f6488e09a3ec8aa966'],
  ['210', 180979, 'c841a8c68365da8186e6b85660eeb220ceb9a8a5cd343af8416817371f8e2321'],
  ['211', 174195, '1675161099fa9131dfcdce573b9b8163d2809ea5d26da67c5291a71121df26a1'],
  ['212', 154286, 'f914b3630daff1bf4d2df95184f96aeea4219eba2d0184a94de0b2cd17f279c8'],
  ['213', 176385, 'c4c6a916da62adc12ddb2dc1c7cf2e2a9b88327429219ae8d056773a3085ffdf'],
  ['214', 143073, '9ff6219898a92fb2302646ccd50f1bcc74ff7189dcf963042a17ac1b143b9d8e'],
  ['215', 160568, 'cfdf65fef9ece25d6fcc340fdc400a67bd2a54ef9ddb00c4131d04fce7c682b9'],
  ['216', 201191, 'f9abedf6db823019f91cc2a8f1794c0d47f23f6e7e21fababbfa421abc97d029'],
  ['217', 197075, '5f4a8a0b3935a14cbacd3f6d506ed7bddc02ef77b88a4aaadbcb23951109d484'],
  ['218', 201546, '87b76977440d17bc45079d28bdfded386c7b118a7c4fba3dd4eb002a17ff271b'],
  ['224', 168265, 'e73a3d47931c595e0e36728c84656250e1e457b8904be87b20b78ba3fa246109'],
];

const REUSED_STORAGE_PATHS = new Map([
  [
    'svp-190',
    'warehouse-derived/image-truth-v1/img15a-svp-pikachu-visible-missing/svp/c8f42393-c642-4d54-b033-b2174f2b4e4e/317f51d07cda8d0d8c7ffe88.jpg',
  ],
  [
    'svp-214',
    'warehouse-derived/image-truth-v1/img15a-svp-pikachu-visible-missing/svp/7fe6c78d-ff07-4a48-b828-04983b3337ef/9ff6219898a92fb2302646cc.jpg',
  ],
]);

function targetPath(setCode, ownerGvId, sha256, extension) {
  return [
    'warehouse-derived',
    'self-hosted-images-v1',
    'card_prints',
    normalizePathSegment(setCode),
    normalizePathSegment(ownerGvId),
    `${sha256.slice(0, 24)}.${extension}`,
  ].join('/');
}

export function assetDefinitions() {
  const definitions = PKMNCARDS_ASSETS.map(([number, sizeBytes, sha256]) => {
    const assetId = `svp-${number}`;
    const ownerGvId = `GV-PK-PR-SV-${number}`;
    const reusedPath = REUSED_STORAGE_PATHS.get(assetId) ?? null;
    return {
      asset_id: assetId,
      owner_gv_id: ownerGvId,
      set_code: 'svp',
      source_provider: 'pkmncards',
      source_route: 'pkmncards_preserved_identity_asset',
      source_url: `https://pkmncards.com/wp-content/uploads/svbsp_en_${number}_std.jpg`,
      source_page_url: null,
      preserved_evidence_ref: `docs/audits/verified_master_set_index_v1/source_fixtures/generated_pkmncards_preservation_v1/svp.json#card_number=${number}`,
      expected: {
        content_type: 'image/jpeg',
        size_bytes: sizeBytes,
        sha256,
        width: 733,
        height: 1024,
        format: 'jpg',
      },
      target_storage_bucket: STORAGE_BUCKET,
      target_storage_path: reusedPath ?? targetPath('svp', ownerGvId, sha256, 'jpg'),
      initial_storage_disposition: reusedPath ? 'reuse_existing_first_party' : 'new_upload',
    };
  });

  definitions.push(
    {
      asset_id: 'svp-225',
      owner_gv_id: 'GV-PK-PR-SV-225',
      set_code: 'svp',
      source_provider: 'tcgplayer',
      source_route: 'tcgplayer_product_image_exact',
      source_url: 'https://product-images.tcgplayer.com/fit-in/1000x1000/648631.jpg',
      source_page_url: 'https://www.tcgplayer.com/product/648631/pokemon-sv-scarlet-and-violet-promo-cards-pikachu-225-world-championship-2025',
      preserved_evidence_ref: 'scripts/audits/image_truth_v1_img15a_svp_pikachu_visible_missing_dry_run.mjs#product_id=648631',
      expected: {
        content_type: 'image/jpeg',
        size_bytes: 149612,
        sha256: 'c6e5a222eb9a25f9d40f1dbe3c90a440ad100763dcd2033ebc38ee367738de26',
        width: 716,
        height: 1000,
        format: 'jpg',
      },
      target_storage_bucket: STORAGE_BUCKET,
      target_storage_path: targetPath(
        'svp',
        'GV-PK-PR-SV-225',
        'c6e5a222eb9a25f9d40f1dbe3c90a440ad100763dcd2033ebc38ee367738de26',
        'jpg',
      ),
      initial_storage_disposition: 'new_upload',
    },
    {
      asset_id: 'svp-500',
      owner_gv_id: 'GV-PK-PR-SV-500',
      set_code: 'svp',
      source_provider: 'tcgplayer',
      source_route: 'tcgplayer_product_image_exact',
      source_url: 'https://product-images.tcgplayer.com/595035.jpg',
      source_page_url: 'https://www.tcgplayer.com/product/595035/pokemon-jumbo-cards-terapagos-and-friends',
      preserved_evidence_ref: 'tcgcsv:group=3/1528:product_id=595035',
      expected: {
        content_type: 'image/jpeg',
        size_bytes: 135708,
        sha256: '08721710714bfd098f4a08480bf1cfde6d03cc250132d7b7796194072ca5af14',
        width: 733,
        height: 1024,
        format: 'jpg',
      },
      target_storage_bucket: STORAGE_BUCKET,
      target_storage_path: targetPath(
        'svp',
        'GV-PK-PR-SV-500',
        '08721710714bfd098f4a08480bf1cfde6d03cc250132d7b7796194072ca5af14',
        'jpg',
      ),
      initial_storage_disposition: 'new_upload',
    },
    {
      asset_id: 'ecard2-h27',
      owner_gv_id: 'GV-PK-AQ-H27',
      set_code: 'ecard2',
      source_provider: 'pokemontcg',
      source_route: 'pokemontcg_hires_exact',
      source_url: 'https://images.pokemontcg.io/ecard2/H27_hires.png',
      source_page_url: 'https://api.pokemontcg.io/v2/cards/ecard2-H27',
      preserved_evidence_ref: 'pokemontcg_api:ecard2-H27',
      expected: {
        content_type: 'image/png',
        size_bytes: 1103535,
        sha256: '6cf0eb58e37fd2ddc4d73cd57de1f85d7390de058d796d357aa1d9c386f898e9',
        width: 600,
        height: 825,
        format: 'png',
      },
      target_storage_bucket: STORAGE_BUCKET,
      target_storage_path: targetPath(
        'ecard2',
        'GV-PK-AQ-H27',
        '6cf0eb58e37fd2ddc4d73cd57de1f85d7390de058d796d357aa1d9c386f898e9',
        'png',
      ),
      initial_storage_disposition: 'new_upload',
    },
    {
      asset_id: 'ecard2-h29',
      owner_gv_id: 'GV-PK-AQ-H29',
      set_code: 'ecard2',
      source_provider: 'pokemontcg',
      source_route: 'pokemontcg_hires_exact',
      source_url: 'https://images.pokemontcg.io/ecard2/H29_hires.png',
      source_page_url: 'https://api.pokemontcg.io/v2/cards/ecard2-H29',
      preserved_evidence_ref: 'pokemontcg_api:ecard2-H29',
      expected: {
        content_type: 'image/png',
        size_bytes: 1110097,
        sha256: '15b00652c3540107b3402922939a018637341d1aa9d1befa002228cdef3aa28a',
        width: 600,
        height: 825,
        format: 'png',
      },
      target_storage_bucket: STORAGE_BUCKET,
      target_storage_path: targetPath(
        'ecard2',
        'GV-PK-AQ-H29',
        '15b00652c3540107b3402922939a018637341d1aa9d1befa002228cdef3aa28a',
        'png',
      ),
      initial_storage_disposition: 'new_upload',
    },
  );

  return definitions.sort((left, right) => left.asset_id.localeCompare(right.asset_id));
}

export function rowDefinitions() {
  const baseNumbers = [
    '190', '191', '192', '204', '205', '208', '209', '210', '211', '212',
    '213', '214', '215', '216', '217', '218', '224', '225', '500',
  ];
  const rows = baseNumbers.map((number) => ({
    gv_id: `GV-PK-PR-SV-${number}`,
    asset_id: `svp-${number}`,
    set_code: 'svp',
    number,
    image_claim_role: 'exact_parent',
    expected_current_image_status: 'missing',
    proposed_image_status: 'exact',
  }));
  rows.push(
    {
      gv_id: 'GV-PK-SVP-209-POKEMON-CENTER-STAMP',
      asset_id: 'svp-209',
      set_code: 'svp',
      number: '209',
      image_claim_role: 'representative_shared_stamp',
      expected_current_image_status: 'representative_shared_stamp',
      proposed_image_status: 'representative_shared_stamp',
    },
    {
      gv_id: 'GV-PK-SVP-210-POKEMON-CENTER-STAMP',
      asset_id: 'svp-210',
      set_code: 'svp',
      number: '210',
      image_claim_role: 'representative_shared_stamp',
      expected_current_image_status: 'representative_shared_stamp',
      proposed_image_status: 'representative_shared_stamp',
    },
    {
      gv_id: 'GV-PK-SVP-224-WORLD-CHAMPIONSHIPS-2025-STAFF-STAMP',
      asset_id: 'svp-224',
      set_code: 'svp',
      number: '224',
      image_claim_role: 'representative_shared_stamp',
      expected_current_image_status: 'representative_shared_stamp',
      proposed_image_status: 'representative_shared_stamp',
    },
    {
      gv_id: 'GV-PK-AQ-H27',
      asset_id: 'ecard2-h27',
      set_code: 'ecard2',
      number: 'H27',
      image_claim_role: 'exact_parent',
      expected_current_image_status: 'exact',
      proposed_image_status: 'exact',
    },
    {
      gv_id: 'GV-PK-AQ-H29',
      asset_id: 'ecard2-h29',
      set_code: 'ecard2',
      number: 'H29',
      image_claim_role: 'exact_parent',
      expected_current_image_status: 'exact',
      proposed_image_status: 'exact',
    },
  );
  return rows.sort((left, right) => left.gv_id.localeCompare(right.gv_id));
}

export function clean(value) {
  const normalized = String(value ?? '').trim();
  return normalized.length > 0 ? normalized : null;
}

export function errorDetail(error) {
  const cause = error?.cause;
  return {
    message: error instanceof Error ? error.message : String(error),
    name: error?.name ?? null,
    code: error?.code ?? cause?.code ?? null,
    cause_message: cause?.message ?? null,
    cause_code: cause?.code ?? null,
    tls_verification: TLS_VERIFICATION_MODE,
  };
}

export function normalizePathSegment(value, fallback = 'unknown') {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || fallback;
}

export function sha256Hex(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function canonicalizeJson(value) {
  if (Array.isArray(value)) return value.map((entry) => canonicalizeJson(entry));
  if (!value || typeof value !== 'object') return value;
  return Object.keys(value)
    .sort((left, right) => left.localeCompare(right))
    .reduce((acc, key) => {
      acc[key] = canonicalizeJson(value[key]);
      return acc;
    }, {});
}

export function proofHash(value) {
  return sha256Hex(JSON.stringify(canonicalizeJson(value)));
}

export function computeManifestFingerprint(assetRows, rowRows, targetBinding, codeBundleHash) {
  return proofHash({
    manifest_schema: MANIFEST_SCHEMA,
    target_binding: targetBinding,
    code_bundle_hash: codeBundleHash,
    mutation_contract: POINTER_MUTATION_CONTRACT,
    asset_manifest_rows: assetRows,
    row_manifest_rows: rowRows,
  });
}

export async function computeCodeBundleHash() {
  const files = [];
  for (const relativePath of CODE_BUNDLE_FILES) {
    files.push({ relative_path: relativePath, sha256: sha256Hex(await fs.readFile(path.join(ROOT, relativePath))) });
  }
  return { files, hash: proofHash(files) };
}

function requireDbUrl() {
  return process.env.SUPABASE_DB_URL
    ?? process.env.DATABASE_URL
    ?? process.env.POSTGRES_URL
    ?? process.env.POSTGRES_PRISMA_URL
    ?? null;
}

function certificatePem(raw) {
  const lines = raw.toString('base64').match(/.{1,64}/g) ?? [];
  return `-----BEGIN CERTIFICATE-----\n${lines.join('\n')}\n-----END CERTIFICATE-----\n`;
}

function dbDescriptor(projectRef) {
  const rawDbUrl = requireDbUrl();
  if (!rawDbUrl) throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL.');
  const parsed = new URL(rawDbUrl);
  const expectedHost = `db.${projectRef}.supabase.co`;
  if (parsed.hostname.toLowerCase() !== expectedHost) {
    throw new Error(`Database host ${parsed.hostname} does not match Supabase project ${projectRef}.`);
  }
  return {
    connection_string: rawDbUrl,
    host: parsed.hostname.toLowerCase(),
    port: Number.parseInt(parsed.port || '5432', 10),
    database_name: decodeURIComponent(parsed.pathname.replace(/^\//, '') || 'postgres'),
    username: decodeURIComponent(parsed.username),
  };
}

async function bootstrapPostgresTlsChain(descriptor) {
  const plainSocket = await new Promise((resolve, reject) => {
    const socket = net.connect({ host: descriptor.host, port: descriptor.port });
    socket.setTimeout(FETCH_TIMEOUT_MS, () => socket.destroy(new Error('postgres_tls_bootstrap_timeout')));
    socket.once('connect', () => resolve(socket));
    socket.once('error', reject);
  });
  const sslAccepted = await new Promise((resolve, reject) => {
    const request = Buffer.alloc(8);
    request.writeUInt32BE(8, 0);
    request.writeUInt32BE(80877103, 4);
    plainSocket.once('data', (data) => resolve(data[0] === 0x53));
    plainSocket.once('error', reject);
    plainSocket.write(request);
  });
  if (!sslAccepted) {
    plainSocket.destroy();
    throw new Error('postgres_server_rejected_tls');
  }
  const secureSocket = tls.connect({
    socket: plainSocket,
    servername: descriptor.host,
    rejectUnauthorized: false,
  });
  await new Promise((resolve, reject) => {
    secureSocket.setTimeout(FETCH_TIMEOUT_MS, () => secureSocket.destroy(new Error('postgres_tls_handshake_timeout')));
    secureSocket.once('secureConnect', resolve);
    secureSocket.once('error', reject);
  });
  const leaf = secureSocket.getPeerCertificate(true);
  const hostnameError = tls.checkServerIdentity(descriptor.host, leaf);
  if (hostnameError) {
    secureSocket.destroy();
    throw hostnameError;
  }
  const chain = [];
  const seen = new Set();
  let current = leaf;
  while (current?.raw && !seen.has(current.fingerprint256)) {
    seen.add(current.fingerprint256);
    const x509 = new crypto.X509Certificate(current.raw);
    const spki = x509.publicKey.export({ type: 'spki', format: 'der' });
    chain.push({
      sha256: sha256Hex(current.raw),
      spki_sha256: sha256Hex(spki),
      subject_cn: current.subject?.CN ?? null,
      issuer_cn: current.issuer?.CN ?? null,
      valid_from: current.valid_from,
      valid_to: current.valid_to,
      pem: certificatePem(current.raw),
    });
    current = current.issuerCertificate;
  }
  secureSocket.destroy();
  if (chain.length < 3) throw new Error(`postgres_tls_chain_incomplete:${chain.length}`);
  assertPinnedSupabaseTlsChain(chain, descriptor);
  return chain;
}

function publicTlsChain(chain) {
  return chain.map(({ pem: _pem, ...entry }) => entry);
}

function assertPinnedSupabaseTlsChain(chain, descriptor) {
  const leaf = chain[0];
  const intermediate = chain.find(
    (certificate) => certificate.sha256 === SUPABASE_DB_TLS_PINS.intermediate_sha256,
  );
  const root = chain.find(
    (certificate) => certificate.sha256 === SUPABASE_DB_TLS_PINS.root_sha256,
  );
  if (leaf?.subject_cn !== descriptor.host) {
    throw new Error(
      `postgres_tls_leaf_cn_mismatch:${leaf?.subject_cn ?? 'missing'}:${descriptor.host}`,
    );
  }
  if (!intermediate) throw new Error('postgres_tls_intermediate_pin_mismatch');
  if (!root) throw new Error('postgres_tls_root_pin_mismatch');
  if (root.subject_cn !== SUPABASE_DB_TLS_PINS.root_subject_cn) {
    throw new Error(`postgres_tls_root_cn_mismatch:${root.subject_cn ?? 'missing'}`);
  }
}

export async function targetBindingFromEnvironment() {
  const rawUrl = clean(process.env.SUPABASE_URL);
  if (!rawUrl) throw new Error('Missing SUPABASE_URL.');
  const parsed = new URL(rawUrl);
  if (parsed.protocol !== 'https:') throw new Error('SUPABASE_URL must use HTTPS.');
  const match = parsed.hostname.match(/^([a-z0-9]+)\.supabase\.co$/i);
  if (!match) throw new Error(`SUPABASE_URL is not a project-scoped Supabase origin: ${parsed.hostname}`);
  const projectRef = match[1].toLowerCase();
  const descriptor = dbDescriptor(projectRef);
  const chain = await bootstrapPostgresTlsChain(descriptor);
  return {
    supabase_project_ref: projectRef,
    data_api_origin: parsed.origin,
    storage_api_origin: `${parsed.origin}/storage/v1`,
    storage_bucket: STORAGE_BUCKET,
    database: {
      host: descriptor.host,
      port: descriptor.port,
      database_name: descriptor.database_name,
      username: descriptor.username,
      tls_verification: 'bootstrap_no_credentials_then_verified_ca_reconnect',
      approved_chain: publicTlsChain(chain),
    },
  };
}

export async function connectVerifiedDbClient(expectedBinding) {
  const descriptor = dbDescriptor(expectedBinding.supabase_project_ref);
  const chain = await bootstrapPostgresTlsChain(descriptor);
  const observedBinding = {
    ...expectedBinding,
    database: {
      ...expectedBinding.database,
      host: descriptor.host,
      port: descriptor.port,
      database_name: descriptor.database_name,
      username: descriptor.username,
      approved_chain: publicTlsChain(chain),
    },
  };
  if (!targetBindingsEqual(observedBinding, expectedBinding)) {
    throw new Error('Pinned database target or TLS certificate chain mismatch.');
  }
  const client = new pg.Client({
    connectionString: descriptor.connection_string,
    ssl: {
      ca: chain.slice(1).map((entry) => entry.pem),
      rejectUnauthorized: true,
      servername: descriptor.host,
    },
  });
  await client.connect();
  const stream = client.connection?.stream;
  if (stream?.authorized !== true) {
    await client.end().catch(() => {});
    throw new Error(`Verified PostgreSQL TLS connection was not authorized: ${stream?.authorizationError ?? 'unknown'}`);
  }
  const peer = stream.getPeerCertificate(true);
  if (sha256Hex(peer.raw) !== expectedBinding.database.approved_chain[0]?.sha256) {
    await client.end().catch(() => {});
    throw new Error('Verified PostgreSQL leaf certificate changed after bootstrap.');
  }
  const identity = await client.query('select current_database()::text as database_name, current_user::text as username');
  if (
    identity.rows[0]?.database_name !== expectedBinding.database.database_name
    || identity.rows[0]?.username !== expectedBinding.database.username
  ) {
    await client.end().catch(() => {});
    throw new Error('Authenticated PostgreSQL target identity mismatch.');
  }
  return client;
}

export function targetBindingsEqual(left, right) {
  return proofHash(left) === proofHash(right);
}

export function validateManifestSemantics(assetRows, rowRows, targetBinding) {
  const errors = [];
  const expectedAssets = assetDefinitions();
  const expectedRows = rowDefinitions();
  const actualAssetById = new Map(assetRows.map((row) => [row.asset_id, row]));
  const actualRowByGvId = new Map(rowRows.map((row) => [row.gv_id, row]));
  if (assetRows.length !== 21 || actualAssetById.size !== 21) errors.push('asset_scope_not_exactly_21_unique_assets');
  if (rowRows.length !== 24 || actualRowByGvId.size !== 24) errors.push('row_scope_not_exactly_24_unique_gv_ids');
  if (targetBinding?.storage_bucket !== STORAGE_BUCKET) errors.push('target_binding_storage_bucket_mismatch');

  for (const expected of expectedAssets) {
    const actual = actualAssetById.get(expected.asset_id);
    if (!actual) {
      errors.push(`missing_asset:${expected.asset_id}`);
      continue;
    }
    for (const key of [
      'owner_gv_id',
      'set_code',
      'source_provider',
      'source_route',
      'verified_fallback_url',
      'target_storage_bucket',
      'target_storage_path',
      'initial_storage_disposition',
    ]) {
      const expectedValue = key === 'verified_fallback_url' ? expected.source_url : expected[key];
      if (actual[key] !== expectedValue) errors.push(`asset_${key}_mismatch:${expected.asset_id}`);
    }
    if (proofHash(actual.source_expected) !== proofHash(expected.expected)) {
      errors.push(`asset_integrity_contract_mismatch:${expected.asset_id}`);
    }
    if (!isAllowedHostedPath(actual.target_storage_path)) errors.push(`asset_path_not_allowed:${expected.asset_id}`);
    if (actual.target_storage_bucket !== targetBinding?.storage_bucket) errors.push(`asset_project_bucket_mismatch:${expected.asset_id}`);
  }

  for (const expected of expectedRows) {
    const actual = actualRowByGvId.get(expected.gv_id);
    if (!actual) {
      errors.push(`missing_row:${expected.gv_id}`);
      continue;
    }
    const asset = actualAssetById.get(expected.asset_id);
    if (actual.asset_id !== expected.asset_id) errors.push(`row_asset_mapping_mismatch:${expected.gv_id}`);
    if (actual.set_code !== expected.set_code || String(actual.number) !== expected.number) {
      errors.push(`row_identity_scope_mismatch:${expected.gv_id}`);
    }
    if (actual.image_claim_role !== expected.image_claim_role) errors.push(`row_claim_role_mismatch:${expected.gv_id}`);
    if (actual.proposed_values?.image_source !== 'identity') errors.push(`row_non_identity_source:${expected.gv_id}`);
    const expectedProposedKeys = (
      expected.image_claim_role === 'representative_shared_stamp'
        ? ['image_path', 'image_source', 'representative_image_url']
        : expected.expected_current_image_status === expected.proposed_image_status
          ? ['image_path', 'image_source', 'image_url']
          : ['image_path', 'image_source', 'image_status', 'image_url']
    ).sort();
    const actualProposedKeys = Object.keys(actual.proposed_values ?? {}).sort();
    if (proofHash(actualProposedKeys) !== proofHash(expectedProposedKeys)) {
      errors.push(`row_proposed_keyset_mismatch:${expected.gv_id}`);
    }
    if (
      expected.expected_current_image_status !== expected.proposed_image_status
      && actual.proposed_values?.image_status !== expected.proposed_image_status
    ) {
      errors.push(`row_status_plan_mismatch:${expected.gv_id}`);
    }
    if (actual.proposed_values?.image_path !== asset?.target_storage_path) errors.push(`row_asset_path_mismatch:${expected.gv_id}`);
    if (expected.image_claim_role === 'exact_parent' && actual.proposed_values?.image_url !== asset?.verified_fallback_url) {
      errors.push(`row_exact_fallback_field_mismatch:${expected.gv_id}`);
    }
    if (
      expected.image_claim_role === 'representative_shared_stamp'
      && actual.proposed_values?.representative_image_url !== asset?.verified_fallback_url
    ) {
      errors.push(`row_representative_fallback_field_mismatch:${expected.gv_id}`);
    }
    if (actual.target_storage_path !== asset?.target_storage_path) errors.push(`row_target_path_mismatch:${expected.gv_id}`);
    if (actual.target_storage_bucket !== asset?.target_storage_bucket) errors.push(`row_target_bucket_mismatch:${expected.gv_id}`);
    if (actual.verified_fallback_url !== asset?.verified_fallback_url) errors.push(`row_fallback_url_mismatch:${expected.gv_id}`);
    if (!isAllowedHostedPath(actual.proposed_values?.image_path)) errors.push(`row_path_not_allowed:${expected.gv_id}`);
    if (proofHash(actual.allowed_apply_columns) !== proofHash(ALLOWED_APPLY_COLUMNS)) {
      errors.push(`row_allowed_columns_mismatch:${expected.gv_id}`);
    }
  }

  for (const actual of assetRows) {
    if (!expectedAssets.some((expected) => expected.asset_id === actual.asset_id)) errors.push(`unexpected_asset:${actual.asset_id}`);
  }
  for (const actual of rowRows) {
    if (!expectedRows.some((expected) => expected.gv_id === actual.gv_id)) errors.push(`unexpected_row:${actual.gv_id}`);
  }
  return [...new Set(errors)].sort();
}

export function isAllowedHostedPath(value) {
  const candidate = clean(value);
  return candidate ? ALLOWED_HOSTED_PREFIXES.some((prefix) => candidate.startsWith(prefix)) : false;
}

export function createStorageClient() {
  const url = clean(process.env.SUPABASE_URL);
  const key = clean(process.env.SUPABASE_SECRET_KEY);
  if (!url) throw new Error('Missing SUPABASE_URL.');
  if (!key) throw new Error('Missing SUPABASE_SECRET_KEY.');
  return createClient(url, key, { auth: { persistSession: false } });
}

export const createDataClient = createStorageClient;

function pngDimensions(buffer) {
  if (buffer.length < 24) return null;
  if (buffer[0] !== 0x89 || buffer[1] !== 0x50 || buffer[2] !== 0x4e || buffer[3] !== 0x47) return null;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20), format: 'png' };
}

function jpegDimensions(buffer) {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = buffer[offset + 1];
    if (marker === 0xd8 || marker === 0xd9) {
      offset += 2;
      continue;
    }
    const length = buffer.readUInt16BE(offset + 2);
    if (length < 2) return null;
    const isSof = marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker);
    if (isSof && offset + 8 < buffer.length) {
      return { width: buffer.readUInt16BE(offset + 7), height: buffer.readUInt16BE(offset + 5), format: 'jpg' };
    }
    offset += 2 + length;
  }
  return null;
}

export function imageDimensions(buffer) {
  return pngDimensions(buffer) ?? jpegDimensions(buffer);
}

function normalizedContentType(value) {
  return clean(value)?.split(';')[0]?.trim().toLowerCase() ?? null;
}

export function observeImageBuffer(buffer, contentType, extra = {}) {
  const dimensions = imageDimensions(buffer);
  return {
    ...extra,
    content_type: normalizedContentType(contentType),
    size_bytes: buffer.length,
    sha256: sha256Hex(buffer),
    width: dimensions?.width ?? null,
    height: dimensions?.height ?? null,
    format: dimensions?.format ?? null,
  };
}

export function verifyImageObservation(observation, expected, { requireHttpSuccess = false } = {}) {
  const errors = [];
  if (requireHttpSuccess && observation?.ok !== true) errors.push(`http_${observation?.status ?? 'unknown'}`);
  if (normalizedContentType(observation?.content_type) !== expected.content_type) errors.push('content_type_mismatch');
  if (Number(observation?.size_bytes) !== expected.size_bytes) errors.push('size_bytes_mismatch');
  if (observation?.sha256 !== expected.sha256) errors.push('sha256_mismatch');
  if (Number(observation?.width) !== expected.width) errors.push('width_mismatch');
  if (Number(observation?.height) !== expected.height) errors.push('height_mismatch');
  if (observation?.format !== expected.format) errors.push('format_mismatch');
  if (Number(observation?.width) < 600 || Number(observation?.height) < 825) errors.push('below_high_quality_floor');
  return errors;
}

async function readResponseBufferWithLimit(response, maxBytes) {
  const declaredLength = Number.parseInt(response.headers.get('content-length') ?? '0', 10);
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new Error(`response_too_large_declared:${declaredLength}:${maxBytes}`);
  }
  if (!response.body) return Buffer.alloc(0);
  const chunks = [];
  let totalBytes = 0;
  for await (const chunk of response.body) {
    const buffer = Buffer.from(chunk);
    totalBytes += buffer.length;
    if (totalBytes > maxBytes) {
      await response.body.cancel().catch(() => {});
      throw new Error(`response_too_large_streamed:${totalBytes}:${maxBytes}`);
    }
    chunks.push(buffer);
  }
  return Buffer.concat(chunks);
}

export async function fetchImage(url, timeoutMs = FETCH_TIMEOUT_MS) {
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:') throw new Error(`non_https_image_url:${url}`);
  if (!ALLOWED_IMAGE_HOSTS.has(parsed.hostname.toLowerCase())) throw new Error(`image_host_not_allowed:${parsed.hostname}`);
  const response = await fetch(parsed, {
    redirect: 'follow',
    signal: AbortSignal.timeout(timeoutMs),
    headers: {
      'user-agent': USER_AGENT,
      // Pin raster acquisition to the audited original formats. Some CDNs
      // content-negotiate a different WebP payload for the same URL.
      accept: 'image/jpeg,image/png;q=0.9,*/*;q=0.1',
    },
  });
  const finalUrl = new URL(response.url);
  if (finalUrl.protocol !== 'https:' || !ALLOWED_IMAGE_HOSTS.has(finalUrl.hostname.toLowerCase())) {
    throw new Error(`redirected_image_host_not_allowed:${response.url}`);
  }
  const buffer = await readResponseBufferWithLimit(response, MAX_IMAGE_BYTES);
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
  const slashIndex = storagePath.lastIndexOf('/');
  const folder = slashIndex >= 0 ? storagePath.slice(0, slashIndex) : '';
  const fileName = slashIndex >= 0 ? storagePath.slice(slashIndex + 1) : storagePath;
  const { data, error } = await supabase.storage.from(bucket).list(folder, { limit: 100, search: fileName });
  if (error) throw new Error(`storage_probe_failed:${bucket}:${storagePath}:${error.message}`);
  return (data ?? []).some((entry) => entry.name === fileName);
}

export async function downloadStorageImage(supabase, bucket, storagePath) {
  const { data, error } = await supabase.storage.from(bucket).download(storagePath);
  if (error) throw new Error(`storage_download_failed:${bucket}:${storagePath}:${error.message}`);
  const buffer = Buffer.from(await data.arrayBuffer());
  return {
    buffer,
    observation: observeImageBuffer(buffer, data.type, {
      ok: true,
      status: 200,
      storage_bucket: bucket,
      storage_path: storagePath,
      tls_verification: TLS_VERIFICATION_MODE,
    }),
  };
}

export async function inspectStorageAsset(supabase, asset) {
  const exists = await storageObjectExists(supabase, asset.target_storage_bucket, asset.target_storage_path);
  if (!exists) return { exists: false, valid: false, observation: null, errors: ['storage_object_missing'] };
  const downloaded = await downloadStorageImage(supabase, asset.target_storage_bucket, asset.target_storage_path);
  const errors = verifyImageObservation(downloaded.observation, asset.expected);
  return {
    exists: true,
    valid: errors.length === 0,
    observation: downloaded.observation,
    errors,
  };
}

export async function mapLimit(values, limit, mapper) {
  const output = new Array(values.length);
  let cursor = 0;
  async function worker() {
    while (cursor < values.length) {
      const index = cursor;
      cursor += 1;
      output[index] = await mapper(values[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, values.length) }, () => worker()));
  return output;
}

export function countBy(rows, selector) {
  const counts = {};
  for (const row of rows) {
    const key = selector(row) ?? 'unknown';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)));
}

export function markdownTable(rows) {
  if (!rows.length) return '_None._';
  const keys = Object.keys(rows[0]);
  return [
    `| ${keys.join(' | ')} |`,
    `| ${keys.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${keys.map((key) => String(row[key] ?? '').replace(/\|/g, '\\|')).join(' | ')} |`),
  ].join('\n');
}

export async function readJson(file) {
  return JSON.parse(await fs.readFile(file, 'utf8'));
}

export async function readJsonl(file) {
  return (await fs.readFile(file, 'utf8'))
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line));
}

export async function writeJsonl(file, rows) {
  await fs.writeFile(file, `${rows.map((row) => JSON.stringify(row)).join('\n')}\n`, 'utf8');
}
