import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { MARKET_ACTIVATION_COVERAGE_SQL_V1 as sql } from '../../backend/pricing/market_activation_coverage_v1.mjs';

const original = readFileSync(new URL('../fixtures/market_activation_coverage_original_v1.sql', import.meta.url), 'utf8');
const run = "'aaaaaaaa-0000-0000-0000-000000000001'";
const current = "'bbbbbbbb-0000-0000-0000-000000000001'";
const history = "'cccccccc-0000-0000-0000-000000000001'";
const render = query => query.replaceAll('public.', 'pg_temp.').replaceAll('$1', run).replaceAll('$2', run);

test('coverage remains scoped, distinct, truth-filtered and time-bounded', () => {
  assert.match(sql, /publication_scopes as materialized/);
  assert.match(sql, /decision.run_id in \(select run_id from publication_scopes\)/);
  assert.match(sql, /snapshot.run_id = scope.run_id/);
  assert.match(sql, /decision.run_id = snapshot.run_id/);
  assert.match(sql, /publication_set.publication_state = 'published'/);
  assert.match(sql, /pipeline_run.reconciliation_state = 'reconciled'/);
  assert.match(sql, /source_sync_finished_at >= now\(\) - interval '36 hours'/);
  assert.match(sql, /select distinct card_printing_id/);
  assert.doesNotMatch(sql, /v_market_price_current|set_config|update |delete |insert /i);
});

// Opt-in local Docker test: temporary tables only; never consumes an env DB URL.
test('PostgreSQL parity, hostile evidence, missing pointer and full release scale', {
  skip: process.env.GROOKAI_LOCAL_ACTIVATION_SQL_TEST !== '1', timeout: 180_000,
}, () => {
  const parity = `do $$ begin
    if exists (( (${render(original)}) except (${render(sql)}) ) union all
               ( (${render(sql)}) except (${render(original)}) )) then
      raise exception 'coverage parity failed';
    end if;
  end $$;`;
  const input = `begin;
    set local statement_timeout='60s';
    create temp table market_price_current_publication(singleton boolean, publication_set_id uuid, run_id uuid);
    create temp table market_price_publication_sets(id uuid primary key, run_id uuid, publication_state text);
    create temp table market_price_pipeline_runs(id uuid primary key, reconciliation_state text, state text);
    create temp table market_price_publication_snapshots(
      id integer primary key, publication_set_id uuid, run_id uuid, card_printing_id uuid,
      qualification_decision_id integer, source_sync_finished_at timestamptz,
      publication_state text, freshness_state text);
    create temp table market_price_qualification_decisions(
      id integer primary key, run_id uuid, eligible boolean, decision text,
      publication_lane text, evidence jsonb);
    create temp table card_printing_truth_reviews(card_printing_id uuid, active boolean, public_visibility text);
    create index on market_price_publication_snapshots(publication_set_id,card_printing_id);
    create index on market_price_qualification_decisions(run_id,id)
      where eligible and decision='publish' and publication_lane='current';
    insert into market_price_current_publication values(true,${current},${current});
    insert into market_price_publication_sets values (${current},${current},'published');
    insert into market_price_pipeline_runs values (${current},'reconciled','verified');
    insert into market_price_qualification_decisions
      select n,case when n<20 then ${run}::uuid else ${current}::uuid end,
        n<>7,case when n=8 then 'exclude' else 'publish' end,
        case when n=9 then 'history' else 'current' end,
        jsonb_build_object('category_id',case when n in(1,2,3,20,21) then '1' when n=11 then '2' else '3' end)
      from generate_series(1,27) n where n<>10;
    insert into market_price_publication_snapshots
      select n,case when n<20 then ${run}::uuid else ${current}::uuid end,
        case when n=6 then ${history}::uuid when n<20 then ${run}::uuid else ${current}::uuid end,
        md5(case when n=2 then '1' else n::text end)::uuid,n,
        now()-case when n=24 then interval '40 hours' else interval '1 hour' end,
        case when n=25 then 'staging' else 'published' end,
        case when n=26 then 'stale' else 'fresh' end
      from generate_series(1,27) n where n<=11 or n>=20;
    insert into card_printing_truth_reviews values
      (md5('3')::uuid,true,'hidden_pending_review'),
      (md5('5')::uuid,true,'hidden_unsupported'),
      (md5('21')::uuid,true,'hidden_pending_review'),
      (md5('23')::uuid,true,'hidden_unsupported'),
      (md5('22')::uuid,false,'hidden_unsupported'),
      (md5('27')::uuid,true,'visible');
    ${parity}
    do $$ declare c record; begin
      select * into c from (${render(sql)}) q;
      if row(c.mtg_selected,c.mtg_eligible,c.mtg_baseline_eligible,c.pokemon_eligible,c.pokemon_baseline_eligible,c.fresh_pokemon_eligible)
        is distinct from row(3,1,1,1,3,2) then raise exception 'unexpected fixture counts: %',row_to_json(c);end if;
    end $$;
    update market_price_pipeline_runs set state='failed';
    ${parity}
    do $$ declare c record; begin select * into c from (${render(sql)}) q;
      if c.mtg_baseline_eligible<>0 or c.pokemon_baseline_eligible<>0 then raise exception 'failed baseline admitted'; end if;end $$;
    update market_price_pipeline_runs set state='verified';
    update market_price_current_publication set publication_set_id=${history};
    ${parity}
    update market_price_current_publication set publication_set_id=${current};
    update market_price_qualification_decisions set run_id=${history} where id=4;
    ${parity}
    update market_price_qualification_decisions set run_id=${run} where id=4;
    delete from market_price_current_publication;
    ${parity}
    insert into market_price_current_publication values(true,${current},${current});
    insert into market_price_publication_snapshots
      select n,${history},${history},md5(n::text)::uuid,n,now(),'superseded','fresh'
      from generate_series(100,300099) n;
    insert into market_price_qualification_decisions
      select n,${history},true,'publish','current','{"category_id":"3"}'::jsonb
      from generate_series(100,300099) n;
    analyze market_price_publication_snapshots;
    analyze market_price_qualification_decisions;
    insert into market_price_publication_snapshots
      select n,case when n<664110 then ${run}::uuid else ${current}::uuid end,
        case when n<664110 then ${run}::uuid else ${current}::uuid end,
        md5(n::text)::uuid,n,now(),'published','fresh'
      from generate_series(500000,828226) n;
    insert into market_price_qualification_decisions
      select n,case when n<664110 then ${run}::uuid else ${current}::uuid end,
        true,'publish','current',jsonb_build_object('category_id',case when n%2=0 then '1' else '3' end)
      from generate_series(500000,828226) n;
    ${parity}
    select row_to_json(c) from (${render(sql)}) c;
    rollback;`;
  const result = spawnSync('docker', ['exec','-i','supabase_db_ycdxbpibncqcchqiihfz',
    'psql','-U','postgres','-d','postgres','-X','-q','-A','-t','-v','ON_ERROR_STOP=1'],
  { input, encoding:'utf8', timeout:170_000, maxBuffer:2_000_000 });
  assert.equal(result.status,0,result.stderr || result.error?.message);
  const counts=JSON.parse(result.stdout.trim());
  assert.equal(counts.mtg_eligible,82056);
  assert.equal(counts.pokemon_eligible,82056);
});
