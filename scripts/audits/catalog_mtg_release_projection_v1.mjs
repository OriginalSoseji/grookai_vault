import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { readMtgPrintReleaseV1, MTG_PRINT_RELEASE_READ_V1 } from '../../backend/catalog/mtg_print_release_read_v1.mjs';

const req = createRequire(new URL('../../backend/package.json', import.meta.url));
const cfg = req('dotenv').parse(fs.readFileSync('.env.local'));
const project = 'ycdxbpibncqcchqiihfz', target = new URL(cfg.SUPABASE_DB_URL);
if (new URL(cfg.SUPABASE_URL).hostname !== project + '.supabase.co' ||
    !fs.readFileSync('supabase/config.toml', 'utf8').includes(project) ||
    !`${target.hostname} ${decodeURIComponent(target.username)}`.includes(project)) throw Error('ENVIRONMENT_MISMATCH');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const sourceFiles = ['backend/catalog/mtg_print_release_read_v1.mjs',
  'backend/pricing/mtg_canonical_catalog_candidate_v1.mjs', 'scripts/audits/catalog_mtg_release_projection_v1.mjs'];
const executedSources = Object.fromEntries(sourceFiles.map(file => [file,
  fs.readFileSync(new URL('../../' + file, import.meta.url), 'utf8')]));
const output = process.argv[2];
if (!output || fs.existsSync(path.join(output, 'report.json'))) throw Error('NEW_OUTPUT_DIRECTORY_REQUIRED');
fs.mkdirSync(output, { recursive: true });
const db = new (req('pg').Client)({ connectionString: cfg.SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false }, application_name: 'catalog_mtg_release_projection_readonly' });
const report = { version: MTG_PRINT_RELEASE_READ_V1, at: new Date().toISOString(), project,
  database_writes: 0, status: 'started', counts: {}, read: 0, usable: 0,
  undated_set_but_verified_print: 0, dated_set_differs_from_print: 0,
  original_source_dates_verified: 0, rejected: [], date_histogram: {}, samples: [] };
const projections = [], qualified = new Map();
try {
  await db.connect();
  await db.query('begin isolation level repeatable read read only');
  await db.query("set local statement_timeout='180s'");
  await db.query('set local jit=off');
  report.counts = (await db.query('select (select count(*) from card_prints) parents,(select count(*) from sets) sets,(select count(*) from card_print_traits) traits')).rows[0];
  if (Number(report.counts.parents) < 40000 || Number(report.counts.sets) < 150 || Number(report.counts.traits) < 5000) throw Error('ENVIRONMENT_COUNTS');
  let after = '00000000-0000-0000-0000-000000000000';
  for (;;) {
    const rows = (await db.query(`select jsonb_build_object(
      'id',p.id,'gv_id',p.gv_id,'name',p.name,'number',p.number,'set_code',p.set_code,
      'identity_domain',p.identity_domain,'variant_key',p.variant_key,'print_identity_key',p.print_identity_key,
      'printed_identity_modifier',p.printed_identity_modifier,'set_identity_model',p.set_identity_model,
      'external_ids',p.external_ids,'ai_metadata',jsonb_build_object('mtg_print_details_v1',
        (select jsonb_object_agg(key,value) from jsonb_each(p.ai_metadata->'mtg_print_details_v1')
         where key=any(array['normalization_version','verification_status','source_provider','source_released_at',
           'source_print_id','source_card_sha256','source_bulk_sha256','source_raw_import_id','source_bulk_updated_at',
           'source_retrieved_at','source_url','identity_id','identity_key_hash','source_coordinates'])))) parent,
      s.release_date::text set_release_date,
      (select coalesce(jsonb_agg(to_jsonb(i)),'[]'::jsonb) from card_print_identity i where i.card_print_id=p.id and i.is_active) identities
      from card_prints p join sets s on s.id=p.set_id
      where p.identity_domain='mtg_eng_paper_print' and p.ai_metadata ? 'mtg_print_details_v1'
      and p.id>$1::uuid order by p.id limit 1000`, [after])).rows;
    if (!rows.length) break;
    const sourceIds = rows.map(r => r.parent.ai_metadata.mtg_print_details_v1.source_print_id);
    const mappings = (await db.query("select * from external_mappings where source='scryfall' and active and external_id=any($1::text[])", [sourceIds])).rows;
    for (const row of rows) {
      report.read++;
      const d = row.parent.ai_metadata.mtg_print_details_v1;
      const owners = mappings.filter(m => m.external_id === d.source_print_id);
      const projection = readMtgPrintReleaseV1(row.parent, row.identities, owners);
      if (!projection) { report.rejected.push(row.parent.id); continue; }
      report.usable++;
      if (!row.set_release_date) report.undated_set_but_verified_print++;
      else if (row.set_release_date !== projection.release_date) report.dated_set_differs_from_print++;
      report.date_histogram[projection.release_year] = (report.date_histogram[projection.release_year] ?? 0) + 1;
      projections.push(projection);
      qualified.set(row.parent.id, { date: projection.release_date, raw_id: d.source_raw_import_id,
        body_sha256: d.source_card_sha256, source_print_id: d.source_print_id });
      if (report.samples.length < 3 && !row.set_release_date) report.samples.push({
        gv_id: row.parent.gv_id, name: row.parent.name, set_code: row.parent.set_code,
        set_release_date: row.set_release_date, ...projection });
    }
    after = rows.at(-1).parent.id;
    if (report.read % 10000 === 0) console.log(JSON.stringify({ stage: 'current_identity_owner', read: report.read, usable: report.usable }));
  }
  if (report.read !== 105560 || report.usable !== report.read) throw Error('CURRENT_RELEASE_PROJECTION_REJECTED:' + report.rejected.length);
  // Reparse the exact durable original body for every projected date. Bridge
  // records preserve both historical identity and current metadata; dates come
  // from the current source member, never the historical identity snapshot.
  const rawIds = [...new Set([...qualified.values()].map(r => r.raw_id))].sort();
  const sourceSeen = new Set();
  for (const rawId of rawIds) {
    const rows = (await db.query(`select r.source,r.payload->>'_kind' kind,m->>'card_print_id' card_print_id,
      coalesce(m->'current',m)->>'body_sha256' stored_body_sha256,
      encode(sha256(convert_to(coalesce(m->'current',m)->>'body_text','UTF8')),'hex') actual_body_sha256,
      (coalesce(m->'current',m)->>'body_text')::jsonb->>'id' source_print_id,
      (coalesce(m->'current',m)->>'body_text')::jsonb->>'released_at' released_at
      from raw_imports r cross join lateral jsonb_array_elements(r.payload->'members') x(m)
      where r.id=$1::bigint`, [rawId])).rows;
    for (const row of rows) {
      const wanted = qualified.get(row.card_print_id);
      if (!wanted || wanted.raw_id !== rawId) throw Error('UNEXPECTED_SOURCE_MEMBER');
      if (!['grookai_catalog_mtg_print_details_v1', 'grookai_catalog_mtg_identity_bridge_v1'].includes(row.source) ||
          !['mtg_print_details_original_source_members', 'mtg_identity_bridge_original_source_pairs'].includes(row.kind) ||
          row.actual_body_sha256 !== row.stored_body_sha256 || row.actual_body_sha256 !== wanted.body_sha256 ||
          row.released_at !== wanted.date || row.source_print_id !== wanted.source_print_id || sourceSeen.has(row.card_print_id)) throw Error('ORIGINAL_RELEASE_DATE_OR_BODY_MISMATCH');
      sourceSeen.add(row.card_print_id);
      report.original_source_dates_verified++;
    }
    if (report.original_source_dates_verified % 10000 < 500) console.log(JSON.stringify({ stage: 'original_source_dates', verified: report.original_source_dates_verified }));
  }
  if (sourceSeen.size !== qualified.size) throw Error('MISSING_ORIGINAL_SOURCE_PROOF');
  report.admitted_raw_snapshots = rawIds.length;
  report.unknown_metadata_holds = Number((await db.query("select count(*) n from card_prints where identity_domain='mtg_eng_paper_print' and not coalesce(ai_metadata ? 'mtg_print_details_v1',false)")).rows[0].n);
  await db.query('rollback');
  const bytes = gzipSync(JSON.stringify(projections) + '\n');
  fs.writeFileSync(path.join(output, 'verified_print_dates.json.gz'), bytes, { flag: 'wx' });
  report.projection_sha256 = hash(bytes);
  report.sources = Object.fromEntries(sourceFiles.map(file => [file, hash(executedSources[file])]));
  for (const file of sourceFiles) {
    if (hash(fs.readFileSync(new URL('../../' + file, import.meta.url))) !== report.sources[file]) throw Error('QUALIFICATION_SOURCE_CHANGED_DURING_RUN');
  }
  const sourceArchive = gzipSync(JSON.stringify(executedSources) + '\n');
  fs.writeFileSync(path.join(output, 'executed_sources.json.gz'), sourceArchive, { flag: 'wx' });
  report.source_archive_sha256 = hash(sourceArchive);
  report.status = 'passed'; report.finished_at = new Date().toISOString();
  report.fingerprint = hash(JSON.stringify(report));
  fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify(report));
} catch (error) {
  report.status = 'failed'; report.error = error.message;
  fs.writeFileSync(path.join(output, 'failure_' + Date.now() + '.json'), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
  throw error;
} finally { await db.end(); }
