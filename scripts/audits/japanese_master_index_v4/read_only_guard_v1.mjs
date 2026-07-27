import crypto from 'node:crypto';

import pg from 'pg';

export const READ_ONLY_GUARD_VERSION = 'JPN-MASTER-INDEX-READ-ONLY-GUARD-V1';

const MUTATION_FLAGS = new Set([
  '--apply',
  '--commit',
  '--create',
  '--delete',
  '--drop',
  '--insert',
  '--migrate',
  '--mutate',
  '--promote',
  '--publish',
  '--quarantine',
  '--truncate',
  '--update',
  '--upload',
  '--write',
]);

const MUTATION_SQL_PATTERNS = [
  [/\binsert\b/i, 'INSERT'],
  [/\bupdate\b/i, 'UPDATE'],
  [/\bdelete\b/i, 'DELETE'],
  [/\bmerge\b/i, 'MERGE'],
  [/\btruncate\b/i, 'TRUNCATE'],
  [/\bcreate\b/i, 'CREATE'],
  [/\balter\b/i, 'ALTER'],
  [/\bdrop\b/i, 'DROP'],
  [/\bgrant\b/i, 'GRANT'],
  [/\brevoke\b/i, 'REVOKE'],
  [/\bcomment\s+on\b/i, 'COMMENT ON'],
  [/\brefresh\s+materialized\b/i, 'REFRESH MATERIALIZED'],
  [/\bvacuum\b/i, 'VACUUM'],
  [/\breindex\b/i, 'REINDEX'],
  [/\bcluster\b/i, 'CLUSTER'],
  [/\bcopy\b/i, 'COPY'],
  [/\bcall\b/i, 'CALL'],
  [/\bdo\b\s+\$/i, 'DO'],
  [/\block\s+table\b/i, 'LOCK TABLE'],
  [/\bselect\b[\s\S]*\binto\b/i, 'SELECT INTO'],
  [/\bfor\s+(?:no\s+key\s+)?update\b/i, 'FOR UPDATE'],
  [/\bfor\s+(?:key\s+)?share\b/i, 'FOR SHARE'],
  [/\bnextval\s*\(/i, 'NEXTVAL'],
  [/\bsetval\s*\(/i, 'SETVAL'],
  [/\bpg_advisory_(?:lock|xact_lock)\s*\(/i, 'ADVISORY LOCK'],
  [/\bpg_notify\s*\(/i, 'PG_NOTIFY'],
  [/\bdblink(?:_exec)?\s*\(/i, 'DBLINK'],
  [/\blo_(?:create|creat|import|unlink|put|truncate)\s*\(/i, 'LARGE OBJECT WRITE'],
];

function stripSqlLiteralsAndComments(sql) {
  let output = '';
  let index = 0;

  while (index < sql.length) {
    const current = sql[index];
    const next = sql[index + 1];

    if (current === '-' && next === '-') {
      index += 2;
      while (index < sql.length && sql[index] !== '\n') index += 1;
      output += '\n';
      continue;
    }

    if (current === '/' && next === '*') {
      index += 2;
      while (
        index < sql.length
        && !(sql[index] === '*' && sql[index + 1] === '/')
      ) {
        index += 1;
      }
      index += 2;
      output += ' ';
      continue;
    }

    if (current === "'") {
      output += "''";
      index += 1;
      while (index < sql.length) {
        if (sql[index] === "'" && sql[index + 1] === "'") {
          index += 2;
          continue;
        }
        if (sql[index] === "'") {
          index += 1;
          break;
        }
        index += 1;
      }
      continue;
    }

    if (current === '"') {
      output += '""';
      index += 1;
      while (index < sql.length) {
        if (sql[index] === '"' && sql[index + 1] === '"') {
          index += 2;
          continue;
        }
        if (sql[index] === '"') {
          index += 1;
          break;
        }
        index += 1;
      }
      continue;
    }

    if (current === '$') {
      const tagMatch = sql.slice(index).match(/^\$[A-Za-z0-9_]*\$/);
      if (tagMatch) {
        const tag = tagMatch[0];
        const closeAt = sql.indexOf(tag, index + tag.length);
        output += '$$';
        index = closeAt === -1 ? sql.length : closeAt + tag.length;
        continue;
      }
    }

    output += current;
    index += 1;
  }

  return output;
}

function normalizeFlag(rawArg) {
  const [flag] = String(rawArg).trim().toLowerCase().split('=', 1);
  return flag;
}

export function assertAuditOnlyArgs(argv = process.argv.slice(2)) {
  const rejected = argv
    .map(normalizeFlag)
    .filter((flag) => MUTATION_FLAGS.has(flag));

  if (rejected.length > 0) {
    throw new Error(
      `${READ_ONLY_GUARD_VERSION} rejected mutation flag(s): ${[...new Set(rejected)].join(', ')}`,
    );
  }
}

export function assertReadOnlySql(sql) {
  if (typeof sql !== 'string' || sql.trim().length === 0) {
    throw new Error(`${READ_ONLY_GUARD_VERSION} requires non-empty SQL`);
  }

  const stripped = stripSqlLiteralsAndComments(sql).trim();
  const withoutTrailingSemicolon = stripped.replace(/;\s*$/, '');
  if (withoutTrailingSemicolon.includes(';')) {
    throw new Error(`${READ_ONLY_GUARD_VERSION} rejected multiple SQL statements`);
  }

  for (const [pattern, label] of MUTATION_SQL_PATTERNS) {
    if (pattern.test(withoutTrailingSemicolon)) {
      throw new Error(`${READ_ONLY_GUARD_VERSION} rejected ${label} SQL`);
    }
  }

  if (!/^(?:select|with|show|explain)\b/i.test(withoutTrailingSemicolon)) {
    throw new Error(
      `${READ_ONLY_GUARD_VERSION} rejected SQL outside SELECT, WITH, SHOW, or EXPLAIN`,
    );
  }

  return sql;
}

export function pgSslConfig(connectionString) {
  const host = new URL(connectionString).hostname.toLowerCase();
  return host === 'localhost' || host === '127.0.0.1'
    ? false
    : { rejectUnauthorized: false };
}

export function environmentFingerprint(connectionString, environmentLabel) {
  const parsed = new URL(connectionString);
  const safeIdentity = {
    environment_label: environmentLabel,
    protocol: parsed.protocol,
    host: parsed.hostname.toLowerCase(),
    port: parsed.port || 'default',
    database: parsed.pathname.replace(/^\/+/, ''),
  };

  return {
    environment_label: environmentLabel,
    environment_key_sha256: crypto
      .createHash('sha256')
      .update(JSON.stringify(safeIdentity))
      .digest('hex'),
  };
}

export async function withReadOnlyClient({
  connectionString,
  environmentLabel = 'live-read-only',
  statementTimeoutMs = 120_000,
  clientFactory,
}, callback) {
  if (!connectionString) {
    throw new Error(
      `${READ_ONLY_GUARD_VERSION} requires SUPABASE_DB_URL, DATABASE_URL, or POSTGRES_URL`,
    );
  }

  const createClient = clientFactory ?? ((config) => new pg.Client(config));
  const client = createClient({
    connectionString,
    ssl: pgSslConfig(connectionString),
    connectionTimeoutMillis: 20_000,
    query_timeout: statementTimeoutMs,
    statement_timeout: statementTimeoutMs,
    application_name: 'jpn-master-index-v4-read-only',
  });

  await client.connect();
  let transactionStarted = false;

  try {
    await client.query('set default_transaction_read_only = on');
    await client.query('begin read only');
    transactionStarted = true;

    const transactionState = await client.query('show transaction_read_only');
    const sessionState = await client.query('show default_transaction_read_only');
    const transactionReadOnly = transactionState.rows[0]?.transaction_read_only;
    const sessionReadOnly = sessionState.rows[0]?.default_transaction_read_only;

    if (transactionReadOnly !== 'on' || sessionReadOnly !== 'on') {
      throw new Error(
        `${READ_ONLY_GUARD_VERSION} could not prove read-only session and transaction state`,
      );
    }

    const guardedClient = {
      query(sql, values = []) {
        assertReadOnlySql(sql);
        return client.query(sql, values);
      },
    };

    return await callback(guardedClient, {
      guard_version: READ_ONLY_GUARD_VERSION,
      transaction_read_only: transactionReadOnly,
      default_transaction_read_only: sessionReadOnly,
      ...environmentFingerprint(connectionString, environmentLabel),
    });
  } finally {
    if (transactionStarted) {
      try {
        await client.query('rollback');
      } catch {
        // The original query error remains authoritative.
      }
    }
    await client.end();
  }
}
