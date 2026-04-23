import { createBackendClient } from '../../supabase_backend_client.mjs';

// LOCK: Quarantine is preservation only; it never promotes payloads into canon.
// LOCK: Resolution metadata may be appended explicitly, but historical payload evidence stays immutable.

let defaultTarget = null;

function normalizeTextOrNull(value) {
  if (value === undefined || value === null) {
    return null;
  }
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function isPgTarget(target) {
  return Boolean(target && typeof target.query === 'function');
}

function isSupabaseTarget(target) {
  return Boolean(target && typeof target.from === 'function');
}

async function getTargetV1(explicitTarget = null) {
  if (explicitTarget) {
    return explicitTarget;
  }
  if (!defaultTarget) {
    defaultTarget = createBackendClient();
  }
  return defaultTarget;
}

function buildWhereClauses(filters = {}, startingIndex = 1) {
  const clauses = [];
  const params = [];
  let index = startingIndex;

  const contractName = normalizeTextOrNull(filters.contract_name);
  if (contractName) {
    clauses.push(`contract_name = $${index}`);
    params.push(contractName);
    index += 1;
  }

  const executionName = normalizeTextOrNull(filters.execution_name);
  if (executionName) {
    clauses.push(`execution_name = $${index}`);
    params.push(executionName);
    index += 1;
  }

  const sourceSystem = normalizeTextOrNull(filters.source_system);
  if (sourceSystem) {
    clauses.push(`source_system = $${index}`);
    params.push(sourceSystem);
    index += 1;
  }

  const unresolvedOnly = filters.unresolved_only !== false;
  if (unresolvedOnly) {
    clauses.push('resolved_at is null');
  }

  const olderThanDays = Number(filters.older_than_days);
  if (Number.isFinite(olderThanDays) && olderThanDays > 0) {
    clauses.push(`created_at <= now() - ($${index}::int * interval '1 day')`);
    params.push(Math.trunc(olderThanDays));
    index += 1;
  }

  return { clauses, params, nextIndex: index };
}

function buildAgeBucketSql() {
  return `
    case
      when created_at >= now() - interval '1 day' then 'lt_1_day'
      when created_at >= now() - interval '7 days' then 'lt_7_days'
      when created_at >= now() - interval '30 days' then 'lt_30_days'
      else 'gte_30_days'
    end
  `;
}

export async function insertQuarantine({
  target = null,
  source_system,
  execution_name,
  contract_name,
  quarantine_reason,
  source_payload_hash,
  payload_snapshot,
  canonical_write_blocked = true,
}) {
  const resolvedTarget = await getTargetV1(target);
  const row = {
    source_system,
    execution_name,
    contract_name,
    quarantine_reason,
    source_payload_hash,
    payload_snapshot,
    canonical_write_blocked: canonical_write_blocked === true,
  };

  if (isPgTarget(resolvedTarget)) {
    const { rows } = await resolvedTarget.query(
      `
        insert into public.quarantine_records (
          source_system,
          execution_name,
          contract_name,
          quarantine_reason,
          source_payload_hash,
          payload_snapshot,
          canonical_write_blocked
        )
        values ($1, $2, $3, $4, $5, $6, $7)
        returning id, created_at
      `,
      [
        row.source_system,
        row.execution_name,
        row.contract_name,
        row.quarantine_reason,
        row.source_payload_hash,
        row.payload_snapshot,
        row.canonical_write_blocked,
      ],
    );
    return rows[0] ?? null;
  }

  if (isSupabaseTarget(resolvedTarget)) {
    const { data, error } = await resolvedTarget
      .from('quarantine_records')
      .insert(row)
      .select('id,created_at')
      .single();
    if (error) {
      throw new Error(`[contracts] quarantine_records insert failed: ${error.message}`);
    }
    return data ?? null;
  }

  throw new Error('[contracts] unsupported quarantine target');
}

export async function fetchUnresolved(target = null, filters = {}) {
  const resolvedTarget = await getTargetV1(target);
  const groupBy = normalizeTextOrNull(filters.group_by);
  const limit = Number.isFinite(Number(filters.limit)) ? Math.max(1, Math.trunc(Number(filters.limit))) : 100;
  const { clauses, params } = buildWhereClauses(filters);
  const whereSql = clauses.length > 0 ? `where ${clauses.join(' and ')}` : '';

  if (isPgTarget(resolvedTarget)) {
    if (groupBy === 'reason' || groupBy === 'contract' || groupBy === 'source' || groupBy === 'age_bucket') {
      const selectExpr =
        groupBy === 'reason'
          ? 'quarantine_reason'
          : groupBy === 'contract'
            ? 'contract_name'
            : groupBy === 'source'
              ? 'source_system'
              : buildAgeBucketSql();
      const label = groupBy === 'age_bucket' ? 'age_bucket' : groupBy;
      const { rows } = await resolvedTarget.query(
        `
          select ${selectExpr} as ${label}, count(*)::int as unresolved_count
          from public.quarantine_records
          ${whereSql}
          group by 1
          order by unresolved_count desc, 1 asc
          limit ${limit}
        `,
        params,
      );
      return rows;
    }

    const { rows } = await resolvedTarget.query(
      `
        select
          id,
          source_system,
          execution_name,
          contract_name,
          quarantine_reason,
          source_payload_hash,
          payload_snapshot,
          canonical_write_blocked,
          created_at,
          resolved_at,
          resolved_by,
          resolution_outcome,
          resolution_notes
        from public.quarantine_records
        ${whereSql}
        order by created_at asc, id asc
        limit ${limit}
      `,
      params,
    );
    return rows;
  }

  if (isSupabaseTarget(resolvedTarget)) {
    let query = resolvedTarget
      .from('quarantine_records')
      .select(
        'id,source_system,execution_name,contract_name,quarantine_reason,source_payload_hash,payload_snapshot,canonical_write_blocked,created_at,resolved_at,resolved_by,resolution_outcome,resolution_notes',
      )
      .order('created_at', { ascending: true })
      .limit(limit);

    if (filters.unresolved_only !== false) {
      query = query.is('resolved_at', null);
    }
    if (normalizeTextOrNull(filters.contract_name)) {
      query = query.eq('contract_name', normalizeTextOrNull(filters.contract_name));
    }
    if (normalizeTextOrNull(filters.execution_name)) {
      query = query.eq('execution_name', normalizeTextOrNull(filters.execution_name));
    }
    if (normalizeTextOrNull(filters.source_system)) {
      query = query.eq('source_system', normalizeTextOrNull(filters.source_system));
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`[contracts] quarantine_records fetch failed: ${error.message}`);
    }

    const rows = data ?? [];
    if (!groupBy) {
      return rows;
    }

    const grouped = new Map();
    for (const row of rows) {
      const key =
        groupBy === 'reason'
          ? normalizeTextOrNull(row.quarantine_reason) ?? 'unknown'
          : groupBy === 'contract'
            ? normalizeTextOrNull(row.contract_name) ?? 'unknown'
            : groupBy === 'source'
              ? normalizeTextOrNull(row.source_system) ?? 'unknown'
              : (() => {
                  const createdAt = row.created_at ? new Date(row.created_at).getTime() : 0;
                  const ageMs = Date.now() - createdAt;
                  if (ageMs < 24 * 60 * 60 * 1000) return 'lt_1_day';
                  if (ageMs < 7 * 24 * 60 * 60 * 1000) return 'lt_7_days';
                  if (ageMs < 30 * 24 * 60 * 60 * 1000) return 'lt_30_days';
                  return 'gte_30_days';
                })();
      grouped.set(key, (grouped.get(key) ?? 0) + 1);
    }

    return [...grouped.entries()]
      .map(([key, unresolved_count]) => ({ [groupBy === 'age_bucket' ? 'age_bucket' : groupBy]: key, unresolved_count }))
      .sort((left, right) => right.unresolved_count - left.unresolved_count);
  }

  throw new Error('[contracts] unsupported quarantine target');
}

export async function resolveQuarantine({
  target = null,
  id,
  resolved_by,
  resolution_outcome,
  resolution_notes = null,
}) {
  const normalizedId = normalizeTextOrNull(id);
  if (!normalizedId) {
    throw new Error('[contracts] resolveQuarantine requires an id');
  }

  const resolvedTarget = await getTargetV1(target);

  if (isPgTarget(resolvedTarget)) {
    const { rows } = await resolvedTarget.query(
      `
        update public.quarantine_records
        set
          resolved_at = coalesce(resolved_at, now()),
          resolved_by = $2,
          resolution_outcome = $3,
          resolution_notes = $4
        where id = $1
        returning id, resolved_at, resolved_by, resolution_outcome, resolution_notes
      `,
      [normalizedId, normalizeTextOrNull(resolved_by), normalizeTextOrNull(resolution_outcome), normalizeTextOrNull(resolution_notes)],
    );
    return rows[0] ?? null;
  }

  if (isSupabaseTarget(resolvedTarget)) {
    const { data, error } = await resolvedTarget
      .from('quarantine_records')
      .update({
        resolved_at: new Date().toISOString(),
        resolved_by: normalizeTextOrNull(resolved_by),
        resolution_outcome: normalizeTextOrNull(resolution_outcome),
        resolution_notes: normalizeTextOrNull(resolution_notes),
      })
      .eq('id', normalizedId)
      .select('id,resolved_at,resolved_by,resolution_outcome,resolution_notes')
      .maybeSingle();
    if (error) {
      throw new Error(`[contracts] quarantine_records resolve failed: ${error.message}`);
    }
    return data ?? null;
  }

  throw new Error('[contracts] unsupported quarantine target');
}

export async function appendResolutionMetadata({
  target = null,
  id,
  resolved_by = null,
  resolution_outcome = null,
  resolution_notes = null,
}) {
  return resolveQuarantine({
    target,
    id,
    resolved_by,
    resolution_outcome,
    resolution_notes,
  });
}
