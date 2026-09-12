import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../../', import.meta.url));
const sources = {};
function read(relative) {
  const text = readFileSync(path.join(root, relative), 'utf8').replaceAll('\r\n', '\n');
  sources[relative] = createHash('sha256').update(text).digest('hex');
  return text;
}
function extract(source, name) {
  const start = source.indexOf(`create or replace function public.${name}(`);
  if (start < 0) throw new Error(`Missing function ${name}`);
  const tail = source.slice(start);
  const marker = tail.match(/\bas (\$[\w]*\$)/i)?.[1];
  if (!marker) throw new Error(`Missing function body ${name}`);
  const end = tail.indexOf(`${marker};`, tail.indexOf(marker) + marker.length);
  if (end < 0) throw new Error(`Missing function end ${name}`);
  return tail.slice(0, end + marker.length + 1);
}
function replaceOnce(source, old, next) {
  if (source.split(old).length !== 2) throw new Error(`Ambiguous repair anchor: ${old.slice(0, 70)}`);
  return source.replace(old, next);
}
export function buildCandidate() {
  const schema = read('supabase/migrations/20260723100000_collaborative_binders_schema_v1.sql');
  const boundary = read('supabase/migrations/20260816050000_catalog_release_definer_boundary_v1.sql');
  const authority = read('scripts/preview/sql/collector_set_binder_authority_v1.sql');
  let matches = extract(schema, 'binder_contribution_matches_v1');
  matches = replaceOnce(matches, "  if v_binder.target_kind = 'custom' then", `  if v_binder.target_kind = 'set' and v_binder.checklist_mode = 'master_set' then
    return exists (select 1 from public.binder_set_slots_authority_v1(v_binder.set_id) s
      where s.card_print_id = p_card_print_id
        and s.card_printing_id is not distinct from p_card_printing_id);
  end if;

  if v_binder.target_kind = 'custom' then`);
  let progress = extract(schema, 'binder_progress_recalculate_v1');
  progress = replaceOnce(progress, "  elsif v_binder.target_kind = 'custom' then", `  elsif v_binder.target_kind = 'set' and v_binder.checklist_mode = 'master_set' then
    v_unit := 'finish_options';
    select total, member_completed, link_completed, public_completed, active_count
      into v_total, v_member, v_link, v_public, v_active_count
      from public.binder_set_progress_counts_v1(p_binder_id);
    if v_total = 0 then raise exception 'set_binder_authority_unavailable' using errcode = 'P0001'; end if;
  elsif v_binder.target_kind = 'custom' then`);
  let slots = extract(boundary, 'binder_slot_rows_v1');
  slots = replaceOnce(slots, '  select * from custom_slots;', `  select * from custom_slots
  union all
  select s.* from binder_row b cross join lateral public.binder_set_slots_authority_v1(b.set_id) s
  where b.target_kind = 'set' and b.checklist_mode = 'master_set';`);
  let enabled = extract(boundary, 'binder_target_enabled_v1');
  enabled = replaceOnce(enabled,
    "and to_regprocedure('public.binder_set_slots_authority_v1(uuid)') is not null",
    "and exists (select 1 from public.binder_set_slots_authority_v1(binder.set_id))");
  const options = read('scripts/preview/sql/collector_set_binder_options_v1.sql');
  const sql = ['begin;', authority, matches, progress, slots, enabled, options, 'commit;'].join('\n\n');
  return { sql, sources: { ...sources }, sha256: createHash('sha256').update(sql).digest('hex') };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const candidate = buildCandidate();
  const out = `C:/grookai_vault_operator_artifacts/collector_polish/authenticated_20260910/set-binder-candidate-${Date.now()}`;
  mkdirSync(out, { recursive: true });
  writeFileSync(`${out}/candidate.sql`, candidate.sql);
  writeFileSync(`${out}/plan.json`, JSON.stringify({ mode: 'isolated-replay-only', ...candidate, sql: undefined,
    sampleApply: false, productionApply: false, approvedSetManifests: 0 }, null, 2));
  console.log(JSON.stringify({ out, sha256: candidate.sha256 }));
}
