// Offline review helper, deliberately without --apply or provider credentials.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { planSquareCatalog, squareNewItemsCsv, SquareCatalogPlanError } from './catalog_plan_v1.mjs';

async function main() {
  const args = process.argv.slice(2);
  if (args.length !== 4 || args[0] !== '--input' || args[2] !== '--out-dir') {
    throw new SquareCatalogPlanError('usage_--input_snapshot.json_--out-dir_new_private_directory');
  }
  const inputPath = path.resolve(args[1]);
  const requestedOutput = path.resolve(args[3]);
  // Resolve the existing parent so a symlink/junction cannot place private
  // preparation artifacts back inside the source checkout.
  const outputPath = path.join(await fs.realpath(path.dirname(requestedOutput)), path.basename(requestedOutput));
  const repoRoot = fileURLToPath(new URL('../../', import.meta.url));
  const relative = path.relative(repoRoot, outputPath);
  if (relative === '' || (!relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative))) {
    throw new SquareCatalogPlanError('output_must_be_outside_repository');
  }
  // Refuse replacement of a previous run and retain diagnostics on input failure.
  await fs.mkdir(outputPath, {recursive: false, mode: 0o700});
  try {
    const stat = await fs.stat(inputPath);
    if (!stat.isFile() || stat.size > 8 * 1024 * 1024) throw new SquareCatalogPlanError('input_too_large');
    const input = JSON.parse(await fs.readFile(inputPath, 'utf8'));
    const plan = planSquareCatalog(input);
    await fs.writeFile(path.join(outputPath, 'plan.private.json'), `${JSON.stringify(plan, null, 2)}\n`, {flag: 'wx', mode: 0o600});
    await fs.writeFile(path.join(outputPath, 'new-items.csv'), squareNewItemsCsv(plan, {locationName: input.locationName}), {flag: 'wx', mode: 0o600});
    const counts = Object.fromEntries(['create', 'update', 'unchanged', 'adoption_required', 'conflict']
      .map(action => [action, plan.actions.filter(row => row.action === action).length]));
    const result = {version: plan.version, status: 'prepared_only', executable: false,
      planHash: plan.planHash, counts, excluded: plan.excluded.length,
      csvRows: counts.create, networkRequests: 0, providerWrites: 0, databaseWrites: 0};
    await fs.writeFile(path.join(outputPath, 'result.json'), `${JSON.stringify(result, null, 2)}\n`, {flag: 'wx', mode: 0o600});
    console.log(JSON.stringify(result));
  } catch (error) {
    const code = error instanceof SquareCatalogPlanError ? error.code : 'preparation_failed';
    await fs.writeFile(path.join(outputPath, 'failure.json'), JSON.stringify({status: 'failed', code, executable: false}), {flag: 'wx', mode: 0o600});
    throw new SquareCatalogPlanError(code);
  }
}

try { await main(); }
catch (error) {
  console.error(JSON.stringify({status: 'failed', code: error instanceof SquareCatalogPlanError ? error.code : 'preparation_failed'}));
  process.exitCode = 1;
}
