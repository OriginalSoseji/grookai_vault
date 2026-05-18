import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { performance } from 'node:perf_hooks';

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'docs', 'audits', 'grookai_dex_v1');
const OUT_JSON = path.join(OUT_DIR, 'grookai_dex_route_smoke_20260518.json');
const OUT_MD = path.join(OUT_DIR, 'grookai_dex_route_smoke_20260518.md');
const BASE_PORT = Number.parseInt(process.env.GROOKAI_DEX_SMOKE_PORT ?? '3021', 10);

function startServer(flagEnabled, port) {
  const env = {
    ...process.env,
    NODE_OPTIONS: process.env.NODE_OPTIONS?.includes('--use-system-ca')
      ? process.env.NODE_OPTIONS
      : `${process.env.NODE_OPTIONS ?? ''} --use-system-ca`.trim(),
    ...(flagEnabled ? { GROOKAI_DEX_V1_ENABLED: 'true' } : {}),
  };
  delete env.NEXT_PUBLIC_GROOKAI_DEX_V1_ENABLED;

  const nextBin = path.join(ROOT, 'apps', 'web', 'node_modules', 'next', 'dist', 'bin', 'next');
  const child = spawn(process.execPath, [nextBin, 'start', '-p', String(port)], {
    cwd: path.join(ROOT, 'apps', 'web'),
    env,
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let output = '';
  child.stdout.on('data', (chunk) => {
    output += chunk.toString();
  });
  child.stderr.on('data', (chunk) => {
    output += chunk.toString();
  });

  return { child, getOutput: () => output };
}

async function stopServer(child) {
  child.kill('SIGTERM');
  await new Promise((resolve) => setTimeout(resolve, 1000));
  if (!child.killed) child.kill('SIGKILL');
}

async function waitForServer(baseUrl) {
  for (let index = 0; index < 45; index += 1) {
    try {
      await fetch(`${baseUrl}/login`, { redirect: 'manual' });
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  throw new Error('server_not_ready');
}

async function timedFetch(baseUrl, pathname) {
  const started = performance.now();
  const response = await fetch(`${baseUrl}${pathname}`, { redirect: 'manual' });
  const body = await response.text();
  const leaksKnownUserCheckpoint =
    body.includes('42 / 223') ||
    body.includes('42/223') ||
    body.includes('88 total copies') ||
    body.includes('4 / 133') ||
    body.includes('4/133') ||
    body.includes('6 total copies');
  return {
    path: pathname,
    status: response.status,
    duration_ms: Math.round(performance.now() - started),
    body_length: body.length,
    has_grookai_dex: body.includes('Grookai Dex'),
    has_pikachu: body.includes('Pikachu'),
    has_charizard: body.includes('Charizard'),
    has_expected_counter_text: body.includes('card prints owned') || body.includes('cards'),
    has_owned_tab: body.includes('Owned'),
    has_missing_tab: body.includes('Missing'),
    has_find_card_action: body.includes('Find card'),
    has_variant_label: body.includes('Pokemon Together Stamp') || body.includes('Stamp'),
    leaks_known_user_checkpoint: leaksKnownUserCheckpoint,
  };
}

async function runScenario(flagEnabled, port) {
  const baseUrl = `http://127.0.0.1:${port}`;
  const server = startServer(flagEnabled, port);
  try {
    await waitForServer(baseUrl);
    const routes = flagEnabled
      ? ['/dex', '/dex/pikachu', '/dex/pikachu?view=owned', '/dex/pikachu?view=missing', '/dex/charizard']
      : ['/dex', '/dex/pikachu'];
    const results = [];
    for (const route of routes) {
      results.push(await timedFetch(baseUrl, route));
    }
    return {
      flag_enabled: flagEnabled,
      results,
      server_output_tail: server.getOutput().slice(-2000),
    };
  } finally {
    await stopServer(server.child);
  }
}

async function main() {
  const off = await runScenario(false, BASE_PORT);
  const on = await runScenario(true, BASE_PORT + 1);
  const report = {
    contract: 'GROOKAI_DEX_V1',
    generated_at: new Date().toISOString(),
    base_ports: [BASE_PORT, BASE_PORT + 1],
    scenarios: [off, on],
  };
  const failures = [];
  for (const result of off.results) {
    if (result.status !== 404 || result.has_grookai_dex || result.leaks_known_user_checkpoint) {
      failures.push(`flag-off route should hide Dex without ownership leakage: ${result.path}`);
    }
  }
  for (const result of on.results) {
    if (result.status !== 200 || !result.has_grookai_dex || result.leaks_known_user_checkpoint) {
      failures.push(`flag-on route should render Dex without known-user ownership leakage: ${result.path}`);
    }
  }
  const pikachu = on.results.find((result) => result.path === '/dex/pikachu');
  if (!pikachu?.has_owned_tab || !pikachu?.has_missing_tab) {
    failures.push('Pikachu detail should expose owned and missing tabs');
  }
  if (!pikachu?.has_variant_label) {
    failures.push('Pikachu detail should expose variant/stamp labels for duplicate-looking prints');
  }
  const pikachuMissing = on.results.find((result) => result.path === '/dex/pikachu?view=missing');
  if (!pikachuMissing?.has_find_card_action) {
    failures.push('Pikachu missing view should expose card action links');
  }
  report.failures = failures;

  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.writeFile(OUT_JSON, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  const lines = [
    '# Grookai Dex Route Smoke',
    '',
    `Generated: ${report.generated_at}`,
    '',
    '## Results',
    '',
  ];
  for (const scenario of report.scenarios) {
    lines.push(`### Feature Flag ${scenario.flag_enabled ? 'On' : 'Off'}`);
    lines.push('');
    for (const result of scenario.results) {
      lines.push(
        `- ${result.path}: status ${result.status}, ${result.duration_ms} ms, body ${result.body_length} bytes, Grookai Dex=${result.has_grookai_dex}, known-user leak=${result.leaks_known_user_checkpoint}`,
      );
    }
    lines.push('');
  }
  if (failures.length > 0) {
    lines.push('## Failures');
    lines.push('');
    for (const failure of failures) {
      lines.push(`- ${failure}`);
    }
    lines.push('');
  }
  await fs.writeFile(OUT_MD, `${lines.join('\n')}\n`, 'utf8');
  console.log(JSON.stringify(report, null, 2));
  if (failures.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error('[grookai-dex:route-smoke] fatal:', error);
  process.exitCode = 1;
});
