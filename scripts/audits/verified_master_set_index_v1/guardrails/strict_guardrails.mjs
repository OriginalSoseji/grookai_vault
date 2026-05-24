import { FINISH_LABELS, sourceAuthorityKey } from '../shared.mjs';

function parseExpectedFinishCounts(value) {
  if (!value) return new Map();
  return new Map(String(value)
    .split(',')
    .map((pair) => pair.trim())
    .filter(Boolean)
    .map((pair) => {
      const [finishKey, rawCount] = pair.split('=').map((part) => part.trim());
      const count = Number(rawCount);
      if (!finishKey || !Number.isInteger(count) || count < 0) {
        throw new Error(`Invalid --expect-finish-counts entry: ${pair}`);
      }
      return [finishKey, count];
    }));
}

function verifiedCountForFinish(classified, finishKey) {
  return classified.printings.filter((row) => (
    row.finish_key === finishKey && row.status === 'master_verified'
  )).length;
}

function formatFailures(failures) {
  return failures.map((failure) => `- ${failure}`).join('\n');
}

export function buildStrictGuardrailOptions(options) {
  return {
    enabled: options.strictGuardrails !== false,
    failOnUnverifiedPrintings: options.failOnUnverifiedPrintings === true,
    expectedFinishCounts: parseExpectedFinishCounts(options.expectFinishCounts),
  };
}

export function enforceStrictGuardrails({ records, classified, setConfigs, options }) {
  if (!options.enabled) return { ok: true, failures: [] };

  const failures = [];
  const notApplicableFinishesBySet = new Map(setConfigs.map((set) => [
    set.key,
    new Set(set.finish_profile?.not_applicable_finishes ?? []),
  ]));
  const expectedParallelCounts = new Map(setConfigs.flatMap((set) => (
    Object.entries(set.finish_profile?.expected_parallel_counts ?? {}).map(([finishKey, entry]) => [
      `${set.key}|${finishKey}`,
      Number(entry.expected_count ?? 0),
    ])
  )));

  if (classified.conflicts.length > 0) {
    failures.push(`source conflicts present (${classified.conflicts.length})`);
  }

  for (const row of records) {
    const notApplicable = notApplicableFinishesBySet.get(row.set_key);
    if (
      row.evidence_type === 'finish_presence'
      && row.finish_key
      && notApplicable?.has(row.finish_key)
    ) {
      failures.push(`${row.set_name} ${row.card_number ?? ''} ${row.card_name ?? ''} asserts not-applicable finish ${row.finish_key}`);
    }
  }

  for (const row of classified.printings) {
    if (row.status === 'master_verified' && row.source_count < 2) {
      failures.push(`${row.set_name} ${row.card_number} ${row.card_name} ${row.finish_key} is master_verified with source_count=${row.source_count}`);
    }

    const authorityCount = new Set(row.evidence.map(sourceAuthorityKey)).size;
    if (row.status === 'master_verified' && authorityCount < 2) {
      failures.push(`${row.set_name} ${row.card_number} ${row.card_name} ${row.finish_key} is master_verified without two independent source authorities`);
    }

    const expectedKey = `${row.set_key}|${row.finish_key}`;
    if (expectedParallelCounts.has(expectedKey)) {
      const expected = expectedParallelCounts.get(expectedKey);
      const verified = verifiedCountForFinish(classified, row.finish_key);
      if (verified > expected) {
        const label = FINISH_LABELS[row.finish_key] ?? row.finish_key;
        failures.push(`${label} verified count ${verified} exceeds expected count ${expected}`);
      }
    }
  }

  if (options.failOnUnverifiedPrintings) {
    const unverifiedPrintings = classified.printings.filter((row) => row.status !== 'master_verified');
    if (unverifiedPrintings.length > 0) {
      failures.push(`unverified exact printing rows present (${unverifiedPrintings.length})`);
    }
  }

  for (const [finishKey, expectedCount] of options.expectedFinishCounts.entries()) {
    const actualCount = verifiedCountForFinish(classified, finishKey);
    if (actualCount !== expectedCount) {
      const label = FINISH_LABELS[finishKey] ?? finishKey;
      failures.push(`${label} expected master_verified count ${expectedCount}, found ${actualCount}`);
    }
  }

  if (failures.length > 0) {
    throw new Error(`Strict Verified Master Set Index guardrails failed:\n${formatFailures(failures)}`);
  }

  return { ok: true, failures };
}
