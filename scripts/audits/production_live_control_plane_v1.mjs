import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

import { OUT_DIR, TOPOLOGY_PATH, validateTopologyV1 } from './production_backend_launch_baseline_v1.mjs';

const GITHUB_REPOSITORY = process.env.GITHUB_REPOSITORY || 'OriginalSoseji/grookai_vault';
const TERMINAL_PRICE_STATES = new Set(['published', 'verified']);
const TERMINAL_SYNC_STATES = new Set(['completed', 'skipped_no_change']);

function minutesSince(timestamp, now) {
  const parsed = Date.parse(timestamp ?? '');
  return Number.isFinite(parsed) ? Math.max(0, (now.getTime() - parsed) / 60_000) : null;
}

function safeError(error) {
  if (!error) return null;
  return {
    code: error.code ?? null,
    message: error.message ?? String(error),
    hint: error.hint ?? null
  };
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

async function readJsonOrNull(filePath) {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

function resolveGitHubToken() {
  if (process.env.GITHUB_TOKEN?.trim()) return process.env.GITHUB_TOKEN.trim();
  try {
    return execFileSync('gh', ['auth', 'token'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim();
  } catch {
    return null;
  }
}

function workflowFile(component) {
  return component.source_files?.find((file) => /^\.github\/workflows\/[^/]+\.ya?ml$/i.test(file)) ?? null;
}

export function classifyWorkflowRunV1(component, run, now = new Date()) {
  if (!run) return { status: 'unmeasured', reason: 'No workflow run evidence returned.' };
  const observedAt = run.updated_at ?? run.created_at ?? null;
  const ageMinutes = minutesSince(observedAt, now);
  const maxStaleness = Number(component.max_staleness_minutes ?? 0);

  if (run.status !== 'completed') {
    return { status: 'degraded', reason: `Latest workflow is ${run.status}.`, observed_at: observedAt, age_minutes: ageMinutes };
  }
  if (run.conclusion !== 'success') {
    return { status: 'failed', reason: `Latest workflow concluded ${run.conclusion ?? 'without a conclusion'}.`, observed_at: observedAt, age_minutes: ageMinutes };
  }
  if (Number.isFinite(ageMinutes) && maxStaleness > 0 && ageMinutes > maxStaleness) {
    return { status: 'stale', reason: `Latest successful workflow is ${Math.round(ageMinutes)} minutes old; maximum is ${maxStaleness}.`, observed_at: observedAt, age_minutes: ageMinutes };
  }
  return { status: 'healthy', reason: 'Latest workflow completed successfully within its freshness window.', observed_at: observedAt, age_minutes: ageMinutes };
}

async function collectGitHubWorkflow(component, token, now) {
  const file = workflowFile(component);
  if (!file) return null;

  const workflowId = encodeURIComponent(path.basename(file));
  let payload;
  try {
    const headers = {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'grookai-production-control-plane-v1',
      'X-GitHub-Api-Version': '2022-11-28'
    };
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_REPOSITORY}/actions/workflows/${workflowId}/runs?per_page=1&branch=main`,
      { headers }
    );
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    payload = await response.json();
  } catch (fetchError) {
    try {
      if (!token) throw fetchError;
      payload = JSON.parse(execFileSync(
        'gh',
        [
          'api',
          '-X',
          'GET',
          `repos/${GITHUB_REPOSITORY}/actions/workflows/${path.basename(file)}/runs`,
          '-f',
          'per_page=1',
          '-f',
          'branch=main'
        ],
        {
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'ignore'],
          env: { ...process.env, GITHUB_TOKEN: token }
        }
      ));
    } catch {
      return {
        component_id: component.id,
        provider: 'github_actions',
        status: 'failed',
        reason: `GitHub workflow lookup failed through both provider paths: ${fetchError.message}.`,
        evidence: { workflow_file: file }
      };
    }
  }

  const run = payload.workflow_runs?.[0] ?? null;
  const classification = classifyWorkflowRunV1(component, run, now);
  return {
    component_id: component.id,
    provider: 'github_actions',
    ...classification,
    evidence: run
      ? {
          workflow_file: file,
          run_id: run.id,
          event: run.event,
          status: run.status,
          conclusion: run.conclusion,
          head_sha: run.head_sha,
          created_at: run.created_at,
          updated_at: run.updated_at,
          html_url: run.html_url
        }
      : { workflow_file: file }
  };
}

function makeSupabaseClient() {
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SECRET_KEY?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

async function queryOne(builder) {
  const { data, error } = await builder.limit(1).maybeSingle();
  return { data: data ?? null, error: safeError(error) };
}

export function classifyPricingRunV1(run, now = new Date(), maxStalenessMinutes = 2160) {
  if (!run) return { status: 'failed', reason: 'No production pricing run exists.' };
  const terminalAt = run.completed_at ?? run.failed_at ?? run.created_at;
  const ageMinutes = minutesSince(terminalAt, now);
  if (run.state === 'failed' || run.failed_at) {
    return { status: 'failed', reason: `Latest production pricing run failed: ${run.error_classification ?? 'unclassified'}.`, observed_at: terminalAt, age_minutes: ageMinutes };
  }
  if (!TERMINAL_PRICE_STATES.has(run.state) || run.reconciliation_state !== 'reconciled') {
    return { status: 'degraded', reason: `Latest production pricing run is ${run.state}/${run.reconciliation_state}.`, observed_at: terminalAt, age_minutes: ageMinutes };
  }
  if (Number.isFinite(ageMinutes) && ageMinutes > maxStalenessMinutes) {
    return { status: 'stale', reason: `Latest reconciled pricing run is ${Math.round(ageMinutes)} minutes old.`, observed_at: terminalAt, age_minutes: ageMinutes };
  }
  return { status: 'healthy', reason: 'Latest production pricing run is terminal, reconciled, and fresh.', observed_at: terminalAt, age_minutes: ageMinutes };
}

export function classifySourceSyncV1(run, now = new Date(), maxStalenessMinutes = 2160) {
  if (!run) return { status: 'failed', reason: 'No current full source sync exists.' };
  const terminalAt = run.finished_at ?? run.started_at ?? run.created_at;
  const ageMinutes = minutesSince(terminalAt, now);
  if (run.status === 'failed' || Number(run.failed_count ?? 0) > 0) {
    return { status: 'failed', reason: `Latest source sync is ${run.status} with ${run.failed_count ?? 0} failed rows.`, observed_at: terminalAt, age_minutes: ageMinutes };
  }
  if (!TERMINAL_SYNC_STATES.has(run.status)) {
    return { status: 'degraded', reason: `Latest source sync is ${run.status}.`, observed_at: terminalAt, age_minutes: ageMinutes };
  }
  if (Number.isFinite(ageMinutes) && ageMinutes > maxStalenessMinutes) {
    return { status: 'stale', reason: `Latest successful source sync is ${Math.round(ageMinutes)} minutes old.`, observed_at: terminalAt, age_minutes: ageMinutes };
  }
  return { status: 'healthy', reason: 'Latest current full source sync is terminal and fresh.', observed_at: terminalAt, age_minutes: ageMinutes };
}

export function classifyNewSetDiscoveryV1(report, now = new Date(), maxStalenessMinutes = 1800) {
  if (!report) return { status: 'unmeasured', reason: 'No new-set discovery report is available.' };
  const ageMinutes = minutesSince(report.observed_at, now);
  if (report.status !== 'succeeded' || (report.findings?.length ?? 0) > 0) {
    return {
      status: 'failed',
      reason: `New-set discovery is ${report.status ?? 'unknown'} with ${(report.findings ?? []).length} findings.`,
      observed_at: report.observed_at ?? null,
      age_minutes: ageMinutes
    };
  }
  if (!Number.isFinite(ageMinutes) || ageMinutes > maxStalenessMinutes) {
    return {
      status: 'stale',
      reason: `Latest successful new-set discovery is ${Number.isFinite(ageMinutes) ? Math.round(ageMinutes) : 'unknown'} minutes old.`,
      observed_at: report.observed_at ?? null,
      age_minutes: ageMinutes
    };
  }
  return {
    status: 'healthy',
    reason: `New-set discovery is fresh; ${Number(report.counts?.review_required ?? 0)} candidates require governed review.`,
    observed_at: report.observed_at,
    age_minutes: ageMinutes
  };
}

export function classifyScannerIdentityV1(probe) {
  const servicesActive = probe?.v3_state === 'active' && probe?.v5_state === 'active';
  const healthValid = probe?.v3_health?.ok === true && probe?.v5_health?.ok === true;
  if (!servicesActive) {
    return {
      status: 'failed',
      reason: `Scanner services are not both active (${probe?.v3_state ?? 'unknown'}/${probe?.v5_state ?? 'unknown'}).`
    };
  }
  if (!healthValid) {
    return {
      status: 'failed',
      reason: 'Scanner services are active, but one or more HTTP health probes failed.'
    };
  }
  return {
    status: 'healthy',
    reason: 'Scanner V3 and V5 services are active and both HTTP health probes succeeded.'
  };
}

export function applyRuntimeTimerStateV1(result, timerState, timerUnit) {
  const evidence = {
    ...(result?.evidence ?? {}),
    runtime_timer: { unit: timerUnit, state: timerState }
  };
  if (timerState !== 'active') {
    return {
      ...result,
      status: 'failed',
      reason: `${timerUnit} is ${timerState}; a successful historical run does not prove unattended operation.`,
      evidence
    };
  }
  return { ...result, evidence };
}

export function classifyOperationsAlertDeliveryV1(event, outboxRows, now = new Date(), maxStalenessMinutes = 1440) {
  if (!event) return { status: 'failed', reason: 'No operations notification event exists.' };
  if (!Array.isArray(outboxRows) || outboxRows.length === 0) {
    return { status: 'failed', reason: 'No operations notification outbox evidence exists.' };
  }
  if (outboxRows.some((row) => row.failed_at || row.failure_reason)) {
    return { status: 'failed', reason: 'Latest operations notification delivery failed.' };
  }
  const sentRows = outboxRows.filter((row) => row.sent_at);
  if (sentRows.length !== Number(event.recipient_count ?? 0)) {
    return {
      status: 'degraded',
      reason: `Latest operations notification delivered ${sentRows.length} of ${Number(event.recipient_count ?? 0)} recipient rows.`
    };
  }
  const observedAt = sentRows.map((row) => row.sent_at).sort().at(-1) ?? event.received_at ?? null;
  const ageMinutes = minutesSince(observedAt, now);
  if (!Number.isFinite(ageMinutes) || ageMinutes > maxStalenessMinutes) {
    return {
      status: 'stale',
      reason: `Latest successful operations notification delivery is ${Number.isFinite(ageMinutes) ? Math.round(ageMinutes) : 'unknown'} minutes old.`,
      observed_at: observedAt,
      age_minutes: ageMinutes
    };
  }
  return {
    status: 'healthy',
    reason: 'Latest operations notification was enqueued and delivered within its freshness window.',
    observed_at: observedAt,
    age_minutes: ageMinutes
  };
}

function systemdState(unit) {
  try {
    return execFileSync('systemctl', ['is-active', unit], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    }).trim();
  } catch (error) {
    return String(error?.stdout ?? '').trim() || 'unknown';
  }
}

async function scannerHealth(url) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(5_000) });
    if (!response.ok) return { ok: false, http_status: response.status };
    const payload = await response.json();
    return {
      ok: payload?.ok === true,
      service: payload?.service ?? null,
      started_at: payload?.started_at ?? null,
      reference_count: payload?.reference_count ?? null,
      reference_view_count: payload?.reference_view_count ?? null,
      dimensions: payload?.dimensions ?? null,
      contract: payload?.contract ?? null
    };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

async function collectScannerIdentity(now) {
  if (process.env.GROOKAI_CONTROL_PLANE_RUNTIME_PROBES_ENABLED !== '1') {
    return {
      component_id: 'scanner-identity',
      provider: 'digitalocean_systemd_http',
      status: 'unmeasured',
      reason: 'Runtime-local scanner probes are disabled for this collector execution.',
      evidence: {}
    };
  }
  const probe = {
    v3_state: systemdState(process.env.SCANNER_V3_SYSTEMD_UNIT || 'scanner-v3-identity.service'),
    v5_state: systemdState(process.env.SCANNER_V5_SYSTEMD_UNIT || 'scanner-v5-identity.service'),
    v3_health: await scannerHealth(process.env.SCANNER_V3_HEALTH_URL || 'http://127.0.0.1:8787/health'),
    v5_health: await scannerHealth(process.env.SCANNER_V5_HEALTH_URL || 'http://127.0.0.1:8795/health')
  };
  return {
    component_id: 'scanner-identity',
    provider: 'digitalocean_systemd_http',
    ...classifyScannerIdentityV1(probe),
    observed_at: now.toISOString(),
    evidence: probe
  };
}

function collectControlPlaneRuntime(now) {
  if (process.env.GROOKAI_CONTROL_PLANE_RUNTIME_PROBES_ENABLED !== '1') {
    return {
      component_id: 'production-control-plane',
      provider: 'digitalocean_systemd',
      status: 'unmeasured',
      reason: 'Runtime-local control-plane probes are disabled for this collector execution.',
      evidence: {}
    };
  }
  const timerState = systemdState(
    process.env.PRODUCTION_CONTROL_PLANE_TIMER_UNIT || 'grookai-production-control-plane.timer'
  );
  return {
    component_id: 'production-control-plane',
    provider: 'digitalocean_systemd',
    status: timerState === 'active' ? 'healthy' : 'failed',
    reason: timerState === 'active'
      ? 'Production control-plane timer is active; this report is the current scheduled probe.'
      : `Production control-plane timer is ${timerState}.`,
    observed_at: now.toISOString(),
    evidence: { timer_state: timerState }
  };
}

async function collectNewSetDiscovery(rootDir, topology, now) {
  const component = topology.components.find((item) => item.id === 'new-set-discovery');
  if (!component) return null;
  const configured = process.env.POKEMON_NEW_SET_DISCOVERY_LATEST_REPORT?.trim();
  const candidates = [
    configured,
    '/var/lib/grookai/new-set-discovery/latest.json',
    path.join(rootDir, 'artifacts', 'new-set-discovery', 'latest.json')
  ].filter(Boolean);
  let report = null;
  let reportPath = null;
  for (const candidate of candidates) {
    try {
      report = JSON.parse(await fs.readFile(candidate, 'utf8'));
      reportPath = candidate;
      break;
    } catch (error) {
      if (error.code !== 'ENOENT') {
        return {
          component_id: component.id,
          provider: 'filesystem_runtime_artifact',
          status: 'failed',
          reason: `New-set discovery report could not be parsed: ${error.message}.`,
          evidence: { report_path: candidate }
        };
      }
    }
  }
  const classification = classifyNewSetDiscoveryV1(report, now, component.max_staleness_minutes);
  return {
    component_id: component.id,
    provider: 'filesystem_runtime_artifact',
    ...classification,
    evidence: report
      ? {
          report_path: reportPath,
          source_run_id: report.source?.run_id ?? null,
          source_run_key: report.source?.run_key ?? null,
          source_age_hours: report.source?.age_hours ?? null,
          counts: report.counts ?? {},
          candidate_fingerprint_sha256: report.candidate_fingerprint_sha256 ?? null
        }
      : { searched_paths: candidates }
  };
}

async function collectSupabase(supabase, topology, now) {
  if (!supabase) {
    return topology.components
      .filter((component) => ['supabase-core', 'operations-alert-delivery', 'tcgplayer-market-pipeline', 'mee-nightly'].includes(component.id))
      .map((component) => ({
        component_id: component.id,
        provider: 'supabase',
        status: 'unmeasured',
        reason: 'Supabase service credentials are unavailable.',
        evidence: {}
      }));
  }

  const results = [];
  const core = await supabase.from('games').select('id', { count: 'exact', head: true });
  results.push({
    component_id: 'supabase-core',
    provider: 'supabase',
    status: core.error ? 'failed' : 'healthy',
    reason: core.error ? 'Supabase core read probe failed.' : 'Supabase API, authentication, and database read probe succeeded.',
    evidence: core.error ? { error: safeError(core.error) } : { game_count: core.count, observed_at: now.toISOString() }
  });

  const operationsEvent = await queryOne(
    supabase
      .from('operations_notification_events')
      .select('id,notification_id,event_type,severity,source_host,source_unit,source_commit_sha,recipient_count,received_at')
      .order('received_at', { ascending: false })
  );
  const operationsOutbox = operationsEvent.data
    ? await supabase
        .from('notification_outbox')
        .select('id,event_type,dedupe_key,attempts,sent_at,failed_at,failure_reason,created_at')
        .eq('event_type', 'operations_alert')
        .eq('dedupe_key', `operations-alert:${operationsEvent.data.notification_id}`)
        .order('created_at', { ascending: false })
    : { data: [], error: null };
  const operationsComponent = topology.components.find((item) => item.id === 'operations-alert-delivery');
  const operationsErrors = [operationsEvent.error, operationsOutbox.error].filter(Boolean);
  const operationsClassification = operationsErrors.length > 0
    ? { status: 'failed', reason: 'Operations notification delivery readback failed.' }
    : classifyOperationsAlertDeliveryV1(
        operationsEvent.data,
        operationsOutbox.data ?? [],
        now,
        operationsComponent?.max_staleness_minutes
      );
  results.push({
    component_id: 'operations-alert-delivery',
    provider: 'supabase',
    ...operationsClassification,
    evidence: {
      event: operationsEvent.data,
      outbox: operationsOutbox.data ?? [],
      errors: operationsErrors
    }
  });

  const pricing = await queryOne(
    supabase
      .from('market_price_pipeline_runs')
      .select('id,run_key,run_mode,state,reconciliation_state,selected_count,mapped_count,eligible_count,snapshot_count,git_commit_sha,started_at,completed_at,failed_at,error_classification,error,created_at')
      .eq('run_mode', 'production')
      .order('created_at', { ascending: false })
  );
  const pricingComponent = topology.components.find((item) => item.id === 'tcgplayer-market-pipeline');
  const pricingClassification = pricing.error
    ? { status: 'failed', reason: 'Production pricing run query failed.' }
    : classifyPricingRunV1(pricing.data, now, pricingComponent?.max_staleness_minutes);
  results.push({
    component_id: 'tcgplayer-market-pipeline',
    provider: 'supabase',
    ...pricingClassification,
    evidence: pricing.error ? { error: pricing.error } : pricing.data
  });

  const sourceSync = await queryOne(
    supabase
      .from('tcgcsv_source_sync_runs')
      .select('id,run_key,sync_mode,status,observed_on,request_count,category_count,group_count,product_count,price_row_count,inserted_count,updated_count,no_op_count,failed_count,git_commit_sha,started_at,finished_at,error,created_at')
      .eq('sync_mode', 'current_full_sync')
      .order('created_at', { ascending: false })
  );
  const sourceClassification = sourceSync.error
    ? { status: 'failed', reason: 'Current source sync query failed.' }
    : classifySourceSyncV1(sourceSync.data, now, pricingComponent?.max_staleness_minutes);
  results.push({
    component_id: 'tcgplayer-source-sync',
    provider: 'supabase',
    ...sourceClassification,
    evidence: sourceSync.error ? { error: sourceSync.error } : sourceSync.data
  });

  const listing = await queryOne(
    supabase
      .from('market_listing_acquisition_runs')
      .select('id,run_key,status,consumed_call_count,observed_listing_count,error_count,started_at,finished_at,created_at')
      .order('created_at', { ascending: false })
  );
  const reference = await queryOne(
    supabase
      .from('market_reference_acquisition_runs')
      .select('id,run_key,source_phase,source_list,started_at,finished_at,created_at')
      .order('created_at', { ascending: false })
  );
  const meeRows = [listing.data, reference.data].filter(Boolean);
  const meeErrors = [listing.error, reference.error].filter(Boolean);
  const latestMeeAt = meeRows
    .map((row) => row.finished_at ?? row.started_at ?? row.created_at)
    .filter(Boolean)
    .sort()
    .at(-1) ?? null;
  const meeAge = minutesSince(latestMeeAt, now);
  const meeComponent = topology.components.find((item) => item.id === 'mee-nightly');
  let meeStatus = 'healthy';
  let meeReason = 'Latest MEE acquisition evidence is readable and fresh.';
  if (meeErrors.length > 0) {
    meeStatus = 'failed';
    meeReason = 'One or more MEE acquisition run queries failed.';
  } else if (meeRows.length === 0) {
    meeStatus = 'failed';
    meeReason = 'No MEE acquisition run evidence exists.';
  } else if (listing.data?.status === 'failed' || Number(listing.data?.error_count ?? 0) > 0) {
    meeStatus = 'failed';
    meeReason = 'Latest eBay acquisition run failed or recorded errors.';
  } else if (Number.isFinite(meeAge) && meeAge > Number(meeComponent?.max_staleness_minutes ?? 2160)) {
    meeStatus = 'stale';
    meeReason = `Latest MEE acquisition evidence is ${Math.round(meeAge)} minutes old.`;
  }
  results.push({
    component_id: 'mee-nightly',
    provider: 'supabase',
    status: meeStatus,
    reason: meeReason,
    observed_at: latestMeeAt,
    age_minutes: meeAge,
    evidence: {
      listing_run: listing.data,
      reference_run: reference.data,
      errors: meeErrors
    }
  });

  return results;
}

export function controlPlaneAlertFindingsV1(report, topology) {
  const launchCriticalIds = new Set(
    topology.components
      .filter((component) => component.criticality === 'launch_critical')
      .map((component) => component.id)
  );
  return report.components
    .filter((component) => launchCriticalIds.has(component.component_id))
    .filter((component) => ['failed', 'stale', 'degraded'].includes(component.status))
    .map((component) => ({
      component_id: component.component_id,
      status: component.status,
      reason: component.reason,
      observed_at: component.observed_at ?? null
    }))
    .sort((left, right) => left.component_id.localeCompare(right.component_id));
}

export function shouldDeliverControlPlaneAlertV1({
  findingFingerprint,
  previousState,
  now = new Date(),
  cooldownMinutes = 360
}) {
  if (!findingFingerprint) return false;
  if (previousState?.finding_fingerprint !== findingFingerprint) return true;
  const lastDeliveredAt = Date.parse(previousState?.delivered_at ?? '');
  if (!Number.isFinite(lastDeliveredAt)) return true;
  return now.getTime() - lastDeliveredAt >= cooldownMinutes * 60_000;
}

async function dispatchControlPlaneAlertV1({ report, topology, outputDir, now }) {
  if (process.env.GROOKAI_CONTROL_PLANE_ALERTS_ENABLED !== '1') return null;
  const findings = controlPlaneAlertFindingsV1(report, topology);
  const statePath = path.join(outputDir, 'alert_state_v1.json');
  const previousState = await readJsonOrNull(statePath);
  if (findings.length === 0) {
    const healthyState = {
      schema_version: 'GROOKAI_CONTROL_PLANE_ALERT_STATE_V1',
      status: 'healthy',
      finding_fingerprint: null,
      observed_at: now.toISOString(),
      delivered_at: previousState?.delivered_at ?? null
    };
    await fs.writeFile(statePath, `${JSON.stringify(healthyState, null, 2)}\n`);
    return healthyState;
  }

  const findingFingerprint = sha256(JSON.stringify(findings));
  const cooldownMinutes = Number(process.env.GROOKAI_CONTROL_PLANE_ALERT_COOLDOWN_MINUTES || 360);
  if (!shouldDeliverControlPlaneAlertV1({
    findingFingerprint,
    previousState,
    now,
    cooldownMinutes
  })) {
    const suppressedState = {
      ...previousState,
      status: 'suppressed_duplicate',
      observed_at: now.toISOString(),
      findings
    };
    await fs.writeFile(statePath, `${JSON.stringify(suppressedState, null, 2)}\n`);
    return suppressedState;
  }

  const webhookUrl = process.env.GROOKAI_OPERATIONS_WEBHOOK_URL?.trim();
  const webhookToken = process.env.GROOKAI_OPERATIONS_WEBHOOK_BEARER_TOKEN?.trim();
  if (!webhookUrl || !webhookToken) {
    throw new Error('Control-plane alert delivery credentials are unavailable.');
  }
  const cooldownBucket = Math.floor(now.getTime() / (cooldownMinutes * 60_000));
  const notificationId = sha256(`production-control-plane|${findingFingerprint}|${cooldownBucket}`);
  const payload = {
    notification_version: 'GROOKAI_PRODUCTION_CONTROL_PLANE_ALERT_V1',
    notification_id: notificationId,
    event: 'production_control_plane_degraded',
    severity: findings.some((finding) => finding.status === 'failed') ? 'critical' : 'high',
    created_at: now.toISOString(),
    host: os.hostname(),
    unit: 'grookai-production-control-plane.service',
    commit_sha: report.commit_sha,
    finding_fingerprint: findingFingerprint,
    findings
  };
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${webhookToken}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15_000)
  });
  if (!response.ok) {
    throw new Error(`Control-plane operations webhook returned HTTP ${response.status}.`);
  }
  const deliveredState = {
    schema_version: 'GROOKAI_CONTROL_PLANE_ALERT_STATE_V1',
    status: 'delivered',
    notification_id: notificationId,
    finding_fingerprint: findingFingerprint,
    findings,
    observed_at: now.toISOString(),
    delivered_at: new Date().toISOString(),
    http_status: response.status
  };
  await fs.writeFile(statePath, `${JSON.stringify(deliveredState, null, 2)}\n`);
  return deliveredState;
}

function reportMarkdown(report) {
  return [
    '# Production Live Control Plane V1',
    '',
    `Observed: ${report.observed_at}`,
    '',
    `Overall status: **${report.overall_status.toUpperCase()}**`,
    '',
    '## Summary',
    '',
    ...Object.entries(report.summary).map(([status, count]) => `- ${status}: ${count}`),
    '',
    '## Components',
    '',
    '| Component | Provider | Status | Reason |',
    '| --- | --- | --- | --- |',
    ...report.components.map((item) => `| ${item.component_id} | ${item.provider} | ${item.status.toUpperCase()} | ${item.reason.replaceAll('|', '\\|')} |`),
    '',
    'This report contains no credentials. It records provider IDs, run IDs, counts, timestamps, states, and public workflow URLs only.',
    ''
  ].join('\n');
}

export async function runProductionLiveControlPlaneV1({ rootDir = process.cwd(), now = new Date() } = {}) {
  const topology = JSON.parse(await fs.readFile(path.join(rootDir, TOPOLOGY_PATH), 'utf8'));
  const validation = await validateTopologyV1(topology, rootDir);
  if (!validation.ok) throw new Error(validation.errors.join('\n'));

  const githubToken = resolveGitHubToken();
  const githubComponents = topology.components.filter((component) => workflowFile(component));
  const githubResults = await Promise.all(
    githubComponents.map(async (component) => {
      try {
        return await collectGitHubWorkflow(component, githubToken, now);
      } catch (error) {
        return {
          component_id: component.id,
          provider: 'github_actions',
          status: 'failed',
          reason: `GitHub provider adapter failed: ${error.message}.`,
          evidence: { workflow_file: workflowFile(component) }
        };
      }
    })
  );
  let supabaseResults;
  try {
    supabaseResults = await collectSupabase(makeSupabaseClient(), topology, now);
  } catch (error) {
    supabaseResults = topology.components
      .filter((component) => ['supabase-core', 'tcgplayer-market-pipeline', 'mee-nightly'].includes(component.id))
      .map((component) => ({
        component_id: component.id,
        provider: 'supabase',
        status: 'failed',
        reason: `Supabase provider adapter failed: ${error.message}.`,
        evidence: {}
      }));
  }
  let newSetDiscovery;
  try {
    newSetDiscovery = await collectNewSetDiscovery(rootDir, topology, now);
  } catch (error) {
    newSetDiscovery = {
      component_id: 'new-set-discovery',
      provider: 'filesystem_runtime_artifact',
      status: 'failed',
      reason: `New-set discovery provider adapter failed: ${error.message}.`,
      evidence: {}
    };
  }
  let scannerIdentity;
  try {
    scannerIdentity = await collectScannerIdentity(now);
  } catch (error) {
    scannerIdentity = {
      component_id: 'scanner-identity',
      provider: 'digitalocean_systemd_http',
      status: 'failed',
      reason: `Scanner identity provider adapter failed: ${error.message}.`,
      evidence: {}
    };
  }
  if (process.env.GROOKAI_CONTROL_PLANE_RUNTIME_PROBES_ENABLED === '1') {
    const runtimeTimers = new Map([
      ['mee-nightly', 'grookai-mee-nightly.timer'],
      ['tcgplayer-market-pipeline', 'grookai-tcgplayer-market-pipeline.timer'],
      ['new-set-discovery', 'grookai-pokemon-new-set-discovery.timer']
    ]);
    supabaseResults = supabaseResults.map((result) => {
      const timerUnit = runtimeTimers.get(result.component_id);
      return timerUnit
        ? applyRuntimeTimerStateV1(result, systemdState(timerUnit), timerUnit)
        : result;
    });
    const newSetTimer = runtimeTimers.get(newSetDiscovery?.component_id);
    if (newSetTimer) {
      newSetDiscovery = applyRuntimeTimerStateV1(
        newSetDiscovery,
        systemdState(newSetTimer),
        newSetTimer
      );
    }
  }
  const controlPlaneRuntime = collectControlPlaneRuntime(now);
  const providerResults = [
    ...githubResults,
    ...supabaseResults,
    newSetDiscovery,
    scannerIdentity,
    controlPlaneRuntime
  ].filter(Boolean);
  const measuredIds = new Set(providerResults.map((item) => item.component_id));
  const unmeasured = topology.components
    .filter((component) => !measuredIds.has(component.id))
    .map((component) => ({
      component_id: component.id,
      provider: component.execution_plane,
      status: 'unmeasured',
      reason: 'No live provider adapter is registered yet.',
      evidence: {}
    }));

  const components = [...providerResults, ...unmeasured]
    .filter(Boolean)
    .sort((left, right) => left.component_id.localeCompare(right.component_id));
  const statuses = ['healthy', 'degraded', 'failed', 'stale', 'unmeasured'];
  const summary = Object.fromEntries(statuses.map((status) => [status, components.filter((item) => item.status === status).length]));
  const overallStatus = summary.failed > 0 ? 'failed' : summary.stale > 0 || summary.degraded > 0 ? 'degraded' : summary.unmeasured > 0 ? 'incomplete' : 'healthy';
  const report = {
    schema_version: 'GROOKAI_PRODUCTION_LIVE_CONTROL_PLANE_V1',
    observed_at: now.toISOString(),
    commit_sha: process.env.GITHUB_SHA ?? null,
    repository: GITHUB_REPOSITORY,
    overall_status: overallStatus,
    summary,
    components
  };

  const configuredOutputDir = process.env.GROOKAI_CONTROL_PLANE_OUTPUT_DIR?.trim();
  const outputDir = configuredOutputDir
    ? path.resolve(configuredOutputDir)
    : path.join(rootDir, OUT_DIR);
  await fs.mkdir(outputDir, { recursive: true });
  await Promise.all([
    fs.writeFile(path.join(outputDir, 'live_control_plane_v1.json'), `${JSON.stringify(report, null, 2)}\n`),
    fs.writeFile(path.join(outputDir, 'LIVE_CONTROL_PLANE_V1.md'), reportMarkdown(report))
  ]);
  await dispatchControlPlaneAlertV1({ report, topology, outputDir, now });
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  runProductionLiveControlPlaneV1()
    .then((report) => console.log(JSON.stringify({
      ok: true,
      overall_status: report.overall_status,
      summary: report.summary,
      output_dir: process.env.GROOKAI_CONTROL_PLANE_OUTPUT_DIR?.trim() || OUT_DIR
    }, null, 2)))
    .catch((error) => {
      console.error(error instanceof Error ? error.stack : String(error));
      process.exitCode = 1;
    });
}
