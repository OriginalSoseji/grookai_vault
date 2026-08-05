import crypto from 'node:crypto';
import net from 'node:net';
import tls from 'node:tls';

import pg from 'pg';

import {
  FETCH_TIMEOUT_MS,
  SUPABASE_DB_TLS_PINS,
  sha256Hex,
} from '../self_hosted_images_wh22_common.mjs';
import { proofHash } from './image_pointer_common_v1.mjs';

function dbDescriptor(projectRef) {
  const connectionString = process.env.SUPABASE_DB_URL
    ?? process.env.DATABASE_URL
    ?? process.env.POSTGRES_URL;
  if (!connectionString) {
    throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL.');
  }
  const parsed = new URL(connectionString);
  const expectedHost = `db.${projectRef}.supabase.co`;
  if (parsed.hostname.toLowerCase() !== expectedHost) {
    throw new Error(`Database host ${parsed.hostname} does not match ${projectRef}.`);
  }
  return {
    connection_string: connectionString,
    host: parsed.hostname.toLowerCase(),
    port: Number.parseInt(parsed.port || '5432', 10),
    database_name: decodeURIComponent(parsed.pathname.replace(/^\//, '') || 'postgres'),
    username: decodeURIComponent(parsed.username),
  };
}

function certificatePem(raw) {
  const lines = raw.toString('base64').match(/.{1,64}/g) ?? [];
  return `-----BEGIN CERTIFICATE-----\n${lines.join('\n')}\n-----END CERTIFICATE-----\n`;
}

function assertCertificateValidity(certificate, label) {
  const now = Date.now();
  if (Date.parse(certificate.validFrom) > now || Date.parse(certificate.validTo) < now) {
    throw new Error(`postgres_tls_${label}_certificate_not_current`);
  }
}

function assertPinnedChain(chain, descriptor) {
  const leaf = chain[0];
  const intermediate = chain.find(
    (entry) => entry.sha256 === SUPABASE_DB_TLS_PINS.intermediate_sha256,
  );
  const root = chain.find(
    (entry) => entry.sha256 === SUPABASE_DB_TLS_PINS.root_sha256,
  );
  if (!leaf || leaf.subject_cn !== descriptor.host) {
    throw new Error(`postgres_tls_leaf_cn_mismatch:${leaf?.subject_cn ?? 'missing'}`);
  }
  if (!intermediate) throw new Error('postgres_tls_intermediate_pin_mismatch');
  if (!root) throw new Error('postgres_tls_root_pin_mismatch');
  if (root.subject_cn !== SUPABASE_DB_TLS_PINS.root_subject_cn) {
    throw new Error(`postgres_tls_root_cn_mismatch:${root.subject_cn ?? 'missing'}`);
  }
  const leafCertificate = new crypto.X509Certificate(leaf.pem);
  const intermediateCertificate = new crypto.X509Certificate(intermediate.pem);
  const rootCertificate = new crypto.X509Certificate(root.pem);
  assertCertificateValidity(leafCertificate, 'leaf');
  assertCertificateValidity(intermediateCertificate, 'intermediate');
  assertCertificateValidity(rootCertificate, 'root');
  if (!leafCertificate.verify(intermediateCertificate.publicKey)) {
    throw new Error('postgres_tls_leaf_signature_mismatch');
  }
  if (!intermediateCertificate.verify(rootCertificate.publicKey)) {
    throw new Error('postgres_tls_intermediate_signature_mismatch');
  }
  if (!rootCertificate.verify(rootCertificate.publicKey)) {
    throw new Error('postgres_tls_root_self_signature_mismatch');
  }
}

async function bootstrapPinnedTlsChain(descriptor) {
  const plainSocket = await new Promise((resolve, reject) => {
    const socket = net.connect({ host: descriptor.host, port: descriptor.port });
    socket.setTimeout(
      FETCH_TIMEOUT_MS,
      () => socket.destroy(new Error('postgres_tls_bootstrap_timeout')),
    );
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
  // No credentials are sent on this bootstrap connection. The peer is
  // manually verified before its pinned CA chain can authorize authentication.
  const secureSocket = tls.connect({
    socket: plainSocket,
    servername: descriptor.host,
    rejectUnauthorized: false,
  });
  await new Promise((resolve, reject) => {
    secureSocket.setTimeout(
      FETCH_TIMEOUT_MS,
      () => secureSocket.destroy(new Error('postgres_tls_handshake_timeout')),
    );
    secureSocket.once('secureConnect', resolve);
    secureSocket.once('error', reject);
  });
  const peer = secureSocket.getPeerCertificate(true);
  const hostnameError = tls.checkServerIdentity(descriptor.host, peer);
  if (hostnameError) {
    secureSocket.destroy();
    throw hostnameError;
  }
  const chain = [];
  const seen = new Set();
  let current = peer;
  while (current?.raw && !seen.has(current.fingerprint256)) {
    seen.add(current.fingerprint256);
    chain.push({
      sha256: sha256Hex(current.raw),
      subject_cn: current.subject?.CN ?? null,
      issuer_cn: current.issuer?.CN ?? null,
      pem: certificatePem(current.raw),
    });
    current = current.issuerCertificate;
  }
  secureSocket.destroy();
  if (chain.length < 3) throw new Error(`postgres_tls_chain_incomplete:${chain.length}`);
  assertPinnedChain(chain, descriptor);
  return chain;
}

function publicTlsChain(chain) {
  return chain.map(({ pem: _pem, ...entry }) => entry);
}

export async function targetBindingFromEnvironment() {
  const rawUrl = process.env.SUPABASE_URL;
  if (!rawUrl) throw new Error('Missing SUPABASE_URL.');
  const parsed = new URL(rawUrl);
  const match = parsed.hostname.toLowerCase().match(/^([a-z0-9]+)\.supabase\.co$/);
  if (parsed.protocol !== 'https:' || !match) {
    throw new Error('SUPABASE_URL is not a project-scoped HTTPS origin.');
  }
  const projectRef = match[1];
  const descriptor = dbDescriptor(projectRef);
  const chain = await bootstrapPinnedTlsChain(descriptor);
  return {
    supabase_project_ref: projectRef,
    data_api_origin: parsed.origin,
    storage_api_origin: `${parsed.origin}/storage/v1`,
    storage_bucket: 'user-card-images',
    database: {
      host: descriptor.host,
      port: descriptor.port,
      database_name: descriptor.database_name,
      username: descriptor.username,
      tls_verification: 'credential_free_manual_chain_validation_then_pinned_ca_reconnect',
      approved_chain: publicTlsChain(chain),
    },
  };
}

export async function connectVerifiedDbClient(expectedBinding) {
  const descriptor = dbDescriptor(expectedBinding.supabase_project_ref);
  const chain = await bootstrapPinnedTlsChain(descriptor);
  if (proofHash(publicTlsChain(chain))
    !== proofHash(expectedBinding.database.approved_chain)) {
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
  const identity = await client.query(
    'select current_database()::text as database_name, current_user::text as username',
  );
  if (identity.rows[0]?.database_name !== descriptor.database_name
    || identity.rows[0]?.username !== descriptor.username) {
    await client.end().catch(() => {});
    throw new Error('Authenticated PostgreSQL target identity mismatch.');
  }
  return client;
}
