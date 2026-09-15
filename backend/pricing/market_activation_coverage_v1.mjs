// Materialize release-scoped inputs before joining. Correlated run/release IDs
// otherwise produce severe row underestimates for newly inserted publications.
export const MARKET_ACTIVATION_COVERAGE_SQL_V1 = `
with publication_scopes as materialized (
  select $1::uuid as publication_set_id, $2::uuid as run_id,
         'production'::text as scope
  union all
  select current_state.publication_set_id, current_state.run_id, 'current'
  from public.market_price_current_publication current_state
  join public.market_price_publication_sets publication_set
    on publication_set.id = current_state.publication_set_id
   and publication_set.run_id = current_state.run_id
   and publication_set.publication_state = 'published'
  join public.market_price_pipeline_runs pipeline_run
    on pipeline_run.id = current_state.run_id
   and pipeline_run.reconciliation_state = 'reconciled'
   and pipeline_run.state in ('published', 'verified')
  where current_state.singleton
),
scoped_snapshots as materialized (
  select snapshot.card_printing_id, snapshot.qualification_decision_id,
         snapshot.run_id, snapshot.source_sync_finished_at, scope.scope
  from publication_scopes scope
  join public.market_price_publication_snapshots snapshot
    on snapshot.publication_set_id = scope.publication_set_id
   and snapshot.run_id = scope.run_id
  where scope.scope = 'production'
     or (snapshot.publication_state = 'published'
         and snapshot.freshness_state = 'fresh')
),
scoped_decisions as materialized (
  select decision.id, decision.run_id, decision.evidence ->> 'category_id' as category_id
  from public.market_price_qualification_decisions decision
  where decision.run_id in (select run_id from publication_scopes)
    and decision.eligible = true
    and decision.decision = 'publish'
    and decision.publication_lane = 'current'
),
hidden_printings as materialized (
  select distinct card_printing_id
  from public.card_printing_truth_reviews
  where active = true
    and public_visibility in ('hidden_pending_review', 'hidden_unsupported')
),
matched as (
  select snapshot.*, decision.category_id,
         hidden.card_printing_id is null as visible
  from scoped_snapshots snapshot
  join scoped_decisions decision
    on decision.id = snapshot.qualification_decision_id
   and decision.run_id = snapshot.run_id
  left join hidden_printings hidden
    on hidden.card_printing_id = snapshot.card_printing_id
)
select
  count(*) filter (where scope = 'production' and category_id = '1')::integer as mtg_selected,
  count(distinct card_printing_id) filter (
    where scope = 'production' and category_id = '1' and visible
  )::integer as mtg_eligible,
  count(distinct card_printing_id) filter (
    where scope = 'current' and category_id = '1' and visible
  )::integer as mtg_baseline_eligible,
  count(distinct card_printing_id) filter (
    where scope = 'production' and category_id = '3' and visible
  )::integer as pokemon_eligible,
  count(distinct card_printing_id) filter (
    where scope = 'current' and category_id = '3' and visible
  )::integer as pokemon_baseline_eligible,
  count(distinct card_printing_id) filter (
    where scope = 'current' and category_id = '3' and visible
      and source_sync_finished_at >= now() - interval '36 hours'
  )::integer as fresh_pokemon_eligible
from matched`;
