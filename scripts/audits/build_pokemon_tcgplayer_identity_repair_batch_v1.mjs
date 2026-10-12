import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { printingManifestHash } from '../../backend/catalog/printing_completeness_gate_v1.mjs';
import { validateTcgplayerExactMappingCandidateForApplyV1 } from '../../backend/pricing/tcgplayer_market_exact_mapping_apply_policy_v1.mjs';

const SCRIPT_VERSION = 'POKEMON_TCGPLAYER_IDENTITY_REPAIR_BATCH_BUILDER_V1';
const REVIEWED_AT = '2026-10-12T07:15:00.000Z';
const SELECTED_PRODUCT_IDS = [85720, 85721, 214239, 654596, 654598];
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const CONFIG = {
  gym2: {
    setId: 'bb258610-a859-4f71-b54a-21a8591a5fad',
    groupId: 1440,
    numbers: ['75', '76'],
    finishByNumber: { '75': 'normal', '76': 'normal' },
    printingGvIdByNumber: {
      '75': 'GV-PK-G2-75-STD',
      '76': 'GV-PK-G2-76-STD',
    },
    tcgdexFileByNumber: { '75': 'gym2-75.json', '76': 'gym2-76.json' },
  },
  swshp: {
    setId: 'fb3eedc5-7234-49b5-b95b-8a9286c27daf',
    groupId: 2545,
    numbers: ['SWSH028'],
    finishByNumber: { SWSH028: 'holo' },
    printingGvIdByNumber: { SWSH028: 'GV-PK-PR-SW-SWSH028-HOLO' },
    tcgdexFileByNumber: { SWSH028: 'swshp-SWSH028.json' },
  },
  mep: {
    setId: '3af96ea1-8897-4bb9-aa7e-cdfb98118bbf',
    groupId: 24451,
    numbers: ['002', '004'],
    finishByNumber: { '002': 'holo', '004': 'holo' },
    printingGvIdByNumber: {
      '002': 'GV-PK-MEP-002-HOLO',
      '004': 'GV-PK-MEP-004-HOLO',
    },
    tcgdexFileByNumber: { '002': 'mep-002.json', '004': 'mep-004.json' },
  },
};

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const json = value => `${JSON.stringify(value, null, 2)}\n`;

function parseArgs(args) {
  const options = {};
  for (const token of args) {
    const match = /^--(plan-dir|source-root|out-dir)=(.+)$/.exec(token);
    assert.ok(match && !options[match[1]], `unknown_or_repeated_argument:${token}`);
    options[match[1]] = path.resolve(match[2]);
  }
  for (const name of ['plan-dir', 'source-root', 'out-dir']) {
    assert.ok(options[name], `--${name} is required`);
  }
  return options;
}

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, 'utf8'));
}

async function writeNew(file, contents) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, contents, { flag: 'wx' });
}

async function build(args) {
  const options = parseArgs(args);
  await fs.mkdir(path.dirname(options['out-dir']), { recursive: true });
  await fs.mkdir(options['out-dir'], { recursive: false });

  const sourceCandidatePath = path.join(options['plan-dir'], 'candidates.jsonl');
  const sourceCandidateBytes = await fs.readFile(sourceCandidatePath);
  const allCandidates = sourceCandidateBytes.toString('utf8').split(/\r?\n/)
    .filter(line => line.trim()).map(JSON.parse);
  const selected = allCandidates
    .filter(row => SELECTED_PRODUCT_IDS.includes(Number(row.source_product_id)))
    .sort((a, b) => Number(a.source_product_id) - Number(b.source_product_id));
  assert.deepEqual(selected.map(row => Number(row.source_product_id)), SELECTED_PRODUCT_IDS,
    'selected candidate set mismatch');
  for (const candidate of selected) {
    const result = validateTcgplayerExactMappingCandidateForApplyV1(candidate);
    assert.ok(result.accepted, `invalid candidate ${candidate.source_product_id}:${result.failures.join(',')}`);
  }

  const planDir = path.join(options['out-dir'], 'plan');
  const selectedBytes = Buffer.from(`${selected.map(row => JSON.stringify(row)).join('\n')}\n`);
  const sourceRunPlanBytes = await fs.readFile(path.join(options['plan-dir'], 'run_plan.json'));
  const sourceSummaryBytes = await fs.readFile(path.join(options['plan-dir'], 'summary.json'));
  const sourceRunPlan = JSON.parse(sourceRunPlanBytes);
  const sourceSummary = JSON.parse(sourceSummaryBytes);
  assert.equal(sourceRunPlan.mode, 'read_only_dry_run');
  assert.equal(sourceRunPlan.tracked_worktree_clean, true);
  assert.equal(sourceSummary.status, 'passed');
  const batchRunPlan = {
    ...sourceRunPlan,
    derived_batch_version: SCRIPT_VERSION,
    source_candidate_artifact_sha256: sha256(sourceCandidateBytes),
    selected_source_product_ids: SELECTED_PRODUCT_IDS,
    selected_candidate_artifact_sha256: sha256(selectedBytes),
  };
  const batchSummary = {
    version: SCRIPT_VERSION,
    status: 'passed',
    counts: {
      candidates: selected.length,
      supporting_gap_rows: selected.reduce((sum, row) => sum + Number(row.supporting_gap_row_count), 0),
      source_groups: new Set(selected.map(row => Number(row.source_group_id))).size,
      target_sets: new Set(selected.map(row => row.target.set_id)).size,
    },
    source_plan: {
      commit_sha: sourceRunPlan.commit_sha,
      run_plan_sha256: sha256(sourceRunPlanBytes),
      summary_sha256: sha256(sourceSummaryBytes),
      candidates_sha256: sha256(sourceCandidateBytes),
    },
    boundaries: {
      reviewed_selection_only: true,
      database_writes: 0,
      pricing_writes: 0,
      customer_state_writes: 0,
      execution_authorized: false,
    },
  };
  await writeNew(path.join(planDir, 'candidates.jsonl'), selectedBytes);
  await writeNew(path.join(planDir, 'run_plan.json'), json(batchRunPlan));
  await writeNew(path.join(planDir, 'summary.json'), json(batchSummary));

  const scopeEntries = [];
  for (const [setCode, config] of Object.entries(CONFIG)) {
    const setCandidates = selected.filter(row => row.target.set_code === setCode);
    assert.equal(setCandidates.length, config.numbers.length, `${setCode}:candidate count mismatch`);
    assert.ok(setCandidates.every(row => row.target.set_id === config.setId), `${setCode}:set id mismatch`);
    assert.ok(setCandidates.every(row => Number(row.source_group_id) === config.groupId), `${setCode}:group mismatch`);

    const masterCards = await readJson(path.join(REPO_ROOT,
      'docs', 'audits', 'english_master_index_publishable_v1', 'sets', setCode, 'cards.json'));
    const masterPrintings = await readJson(path.join(REPO_ROOT,
      'docs', 'audits', 'english_master_index_publishable_v1', 'sets', setCode, 'printings.json'));
    const cards = masterCards.cards.filter(row => config.numbers.includes(row.card_number));
    const selectedPrintings = masterPrintings.printings.filter(row =>
      config.numbers.includes(row.card_number) && config.finishByNumber[row.card_number] === row.finish_key);
    assert.equal(cards.length, config.numbers.length, `${setCode}:master card count mismatch`);
    assert.equal(selectedPrintings.length, config.numbers.length, `${setCode}:master printing count mismatch`);

    const scopeDir = path.join(options['out-dir'], 'authority', setCode);
    const sourceDir = path.join(scopeDir, 'sources');
    await fs.mkdir(sourceDir, { recursive: true });
    const tcgcsvName = `${config.groupId}-products.json`;
    const tcgcsvInput = path.join(options['source-root'], 'tcgcsv', tcgcsvName);
    const tcgcsvBytes = await fs.readFile(tcgcsvInput);
    const tcgcsv = JSON.parse(tcgcsvBytes);
    for (const candidate of setCandidates) {
      const source = tcgcsv.results.find(row => Number(row.productId) === Number(candidate.source_product_id));
      assert.ok(source, `${setCode}:source product missing:${candidate.source_product_id}`);
      assert.equal(source.name, candidate.source_product_name, `${setCode}:source name changed`);
      assert.equal(Number(source.groupId), config.groupId, `${setCode}:source group changed`);
      const printedNumber = source.extendedData.find(row => row.name === 'Number')?.value;
      assert.equal(printedNumber, candidate.printed_number, `${setCode}:source number changed`);
    }
    await fs.copyFile(tcgcsvInput, path.join(sourceDir, tcgcsvName), fs.constants.COPYFILE_EXCL);

    const sourceArtifacts = [{
      ref: `tcgcsv-group-${config.groupId}`,
      sha256: sha256(tcgcsvBytes),
      kind: 'exact_printing_mapping',
      url_or_identifier: `https://tcgcsv.com/tcgplayer/3/${config.groupId}/products`,
      retrieved_at: config.groupId === 1440 ? '2026-10-12T07:03:15.000Z' : '2026-10-12T07:03:16.000Z',
    }];
    const tcgdexByNumber = new Map();
    for (const number of config.numbers) {
      const fileName = config.tcgdexFileByNumber[number];
      const input = path.join(options['source-root'], 'tcgdex', fileName);
      const bytes = await fs.readFile(input);
      const payload = JSON.parse(bytes);
      const candidate = setCandidates.find(row => row.target.canonical_number === number);
      assert.equal(payload.name, candidate.target.canonical_name, `${setCode}:${number}:TCGdex name mismatch`);
      assert.equal(payload.localId, number, `${setCode}:${number}:TCGdex number mismatch`);
      assert.equal(payload.variants[config.finishByNumber[number]], true, `${setCode}:${number}:TCGdex finish mismatch`);
      await fs.copyFile(input, path.join(sourceDir, fileName), fs.constants.COPYFILE_EXCL);
      const ref = `tcgdex-${setCode}-${number}`;
      tcgdexByNumber.set(number, { ref, sha256: sha256(bytes), fileName });
      sourceArtifacts.push({
        ref,
        sha256: sha256(bytes),
        kind: 'checked_checklist',
        url_or_identifier: `https://api.tcgdex.net/v2/en/cards/${setCode}-${number}`,
        retrieved_at: number === '75' || number === '76'
          ? '2026-10-12T07:03:50.000Z' : '2026-10-12T07:03:51.000Z',
      });
    }

    const master = {
      version: 'POKEMON_TCGPLAYER_IDENTITY_REPAIR_MASTER_V1',
      set_code: setCode,
      set_id: config.setId,
      selected_cards: cards,
      selected_printings: selectedPrintings,
      candidate_fingerprints: setCandidates.map(row => row.candidate_fingerprint).sort(),
      source_plan_commit_sha: sourceRunPlan.commit_sha,
    };
    const masterBytes = Buffer.from(json(master));
    const masterRef = `master:${setCode}:pokemon-tcgplayer-repair-20261012-batch-01`;
    await writeNew(path.join(scopeDir, 'master.json'), masterBytes);

    const parents = setCandidates.map(candidate => ({
      id: candidate.target.card_print_id,
      name: candidate.target.canonical_name,
      gv_id: candidate.target.gv_id,
      set_id: candidate.target.set_id,
      variant_key: candidate.target.variant_key,
      identity_domain: 'pokemon_eng_standard',
      printed_coordinate: candidate.target.canonical_number,
      printed_identity_modifier: null,
    }));
    const printings = setCandidates.map(candidate => {
      const number = candidate.target.canonical_number;
      const finish = config.finishByNumber[number];
      const source = tcgdexByNumber.get(number);
      return {
        card_print_id: candidate.target.card_print_id,
        finish_key: finish,
        printing_gv_id: config.printingGvIdByNumber[number],
        review_status: 'verified',
        evidence: [{
          kind: 'checked_checklist',
          source_ref: source.ref,
          sha256: source.sha256,
          card_print_id: candidate.target.card_print_id,
          finish_key: finish,
        }],
      };
    });
    const finishCounts = Object.fromEntries([...new Set(printings.map(row => row.finish_key))]
      .map(finish => [finish, printings.filter(row => row.finish_key === finish).length]));
    const exactSource = sourceArtifacts[0];
    const authorityWithoutReview = {
      version: 'MASTER_INDEX_PRINTING_AUTHORITY_V1',
      status: 'verified_scope',
      set_id: config.setId,
      source_artifacts: sourceArtifacts,
      protected_facts: printings.map(row => ({ card_print_id: row.card_print_id, finish_key: row.finish_key })),
      forbidden_facts: [],
      conflicts: [],
    };
    const externalMappingAssertions = setCandidates.map(candidate => ({
      source: 'tcgplayer',
      external_id: String(candidate.source_product_id),
      card_print_id: candidate.target.card_print_id,
      candidate_fingerprint: candidate.candidate_fingerprint,
      source_ref: exactSource.ref,
      source_sha256: exactSource.sha256,
    }));
    const manifestProjection = {
      version: 'PRINTING_COMPLETENESS_GATE_V1',
      game: 'pokemon',
      language: 'en',
      set_code: setCode,
      scope: 'verified_parent_families',
      identity_policy_version: 'POKEMON_EN_PHYSICAL_V1',
      master_index_ref: masterRef,
      master_index_sha256: sha256(masterBytes),
      parents,
      printings,
      unresolved_variants: [],
      suppressed_printing_facts: [],
      expected: { parents: parents.length, printings: printings.length, finishes: finishCounts },
      external_mapping_assertions: externalMappingAssertions,
      authority: authorityWithoutReview,
    };
    const review = {
      status: 'verified_scope',
      master_index_sha256: manifestProjection.master_index_sha256,
      game: manifestProjection.game,
      language: manifestProjection.language,
      set_code: manifestProjection.set_code,
      scope: manifestProjection.scope,
      reviewer: 'Codex source adjudication; not founder mutation approval',
      reviewed_at: REVIEWED_AT,
      projection_sha256: printingManifestHash(manifestProjection),
      reasoning: [
        'The bounded planner target, canonical set, printed coordinate and normalized name were checked against the captured TCGCSV group payload.',
        'The captured TCGdex card payload independently matches the canonical parent and the one protected printing finish used by this scope.',
        'The scope covers only the selected existing parents and does not claim complete-set coverage or authorize a database mutation.',
      ],
      mutation_authority: false,
    };
    const reviewBytes = Buffer.from(json(review));
    await writeNew(path.join(scopeDir, 'review.json'), reviewBytes);
    const manifestBody = {
      ...manifestProjection,
      authority: {
        ...authorityWithoutReview,
        review: {
          ref: `review:${setCode}:pokemon-tcgplayer-repair-20261012-batch-01`,
          sha256: sha256(reviewBytes),
        },
      },
    };
    const manifest = { ...manifestBody, fingerprint: printingManifestHash(manifestBody) };
    await writeNew(path.join(scopeDir, 'manifest.json'), json(manifest));
    const artifactMap = [
      { ref: masterRef, path: 'master.json' },
      { ref: manifest.authority.review.ref, path: 'review.json' },
      { ref: exactSource.ref, path: `sources/${tcgcsvName}` },
      ...config.numbers.map(number => ({
        ref: tcgdexByNumber.get(number).ref,
        path: `sources/${tcgdexByNumber.get(number).fileName}`,
      })),
    ];
    await writeNew(path.join(scopeDir, 'artifact_map.json'), json(artifactMap));
    scopeEntries.push({
      manifest: `authority/${setCode}/manifest.json`,
      artifact_map: `authority/${setCode}/artifact_map.json`,
    });
  }
  await writeNew(path.join(options['out-dir'], 'scopes.json'), json(scopeEntries));
  await writeNew(path.join(options['out-dir'], 'README.md'), `# Pokémon TCGPlayer identity repair — batch 01\n\n` +
    `This immutable review batch binds five existing English Pokémon parents to five current TCGPlayer products. ` +
    `It covers seven missing-price observations. It does not authorize a database write or price publication.\n\n` +
    `The authority scopes retain the exact TCGCSV group payloads and TCGdex card payloads acquired on 2026-10-12. ` +
    `Gym Challenge is limited to the normal printing; Duraludon, Inteleon and Lunatone are limited to holo.\n\n` +
    `Generated by \`${SCRIPT_VERSION}\`.\n`);

  return {
    version: SCRIPT_VERSION,
    selected_count: selected.length,
    supporting_gap_rows: batchSummary.counts.supporting_gap_rows,
    scope_count: scopeEntries.length,
    selected_sha256: sha256(selectedBytes),
    output: path.relative(REPO_ROOT, options['out-dir']).replace(/\\/g, '/'),
    execution_authorized: false,
    database_writes: 0,
  };
}

export { build };

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  build(process.argv.slice(2)).then(result => process.stdout.write(`${JSON.stringify(result, null, 2)}\n`))
    .catch(error => { console.error(error.stack || error.message); process.exitCode = 1; });
}
