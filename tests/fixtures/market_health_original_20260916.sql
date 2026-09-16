with latest_source as (
         select
           run_key,
           status,
           source_marker,
           finished_at,
           price_row_count,
           failed_count,
           error
         from public.tcgcsv_source_sync_runs
         where sync_mode = 'current_full_sync'
         order by finished_at desc nulls last, created_at desc
         limit 1
       ),
       completed_source as (
         select
           run_key,
           status,
           source_marker,
           finished_at,
           price_row_count,
           failed_count,
           error
         from public.tcgcsv_source_sync_runs
         where sync_mode = 'current_full_sync'
           and status = 'completed'
         order by finished_at desc nulls last, created_at desc
         limit 1
       ),
       selected_run as (
         select *
         from public.market_price_pipeline_runs
         where ($1::text is null or run_key = $1)
         order by created_at desc, id desc
         limit 1
       ),
       selected_publication_set as (
         select publication_set.id
         from public.market_price_publication_sets publication_set
         join selected_run pipeline_run
           on pipeline_run.id = publication_set.run_id
       ),
       selected_decisions as (
         select decision.*
         from public.market_price_qualification_decisions decision
         join selected_run pipeline_run
           on pipeline_run.id = decision.run_id
       ),
       decision_totals as (
         select
           count(*)::integer as decision_count,
           count(*) filter (where eligible)::integer as eligible_count,
           count(*) filter (where decision = 'delay')::integer as delayed_count,
           count(*) filter (where decision = 'suppress_stale')::integer as suppressed_count,
           count(*) filter (where decision = 'quarantine')::integer as quarantined_count,
           count(*) filter (where decision = 'exclude')::integer as excluded_count
         from selected_decisions
       ),
       snapshot_totals as (
         select
           count(distinct snapshot.id)::integer as snapshot_count,
           count(distinct snapshot.id) filter (
             where decision.id is not null
               and decision.source_observation_id = snapshot.source_observation_id
               and decision.card_printing_id = snapshot.card_printing_id
               and decision.eligible = true
           )::integer as traced_snapshot_count
         from selected_publication_set publication_set
         left join public.market_price_publication_snapshots snapshot
           on snapshot.publication_set_id = publication_set.id
         left join public.market_price_qualification_decisions decision
           on decision.id = snapshot.qualification_decision_id
          and decision.run_id = snapshot.run_id
       ),
       phase_totals as (
         select
           count(distinct phase.phase_name) filter (
             where phase.state = 'succeeded'
               and phase.phase_name in (
                 'prepare_variant_assignments',
                 'stage_candidates',
                 'qualify',
                 'build_publication',
                 'reconcile'
               )
           )::integer as succeeded_required_phase_count,
           count(*) filter (where phase.state = 'failed')::integer as failed_phase_attempt_count
         from selected_run pipeline_run
         left join public.market_price_pipeline_phase_attempts phase
           on phase.run_id = pipeline_run.id
       ),
       current_publication as (
         select publication_set_id, run_id, activated_at
         from public.market_price_current_publication
         where singleton = true
       ),
       current_totals as (
         select
           count(distinct snapshot.card_printing_id)::integer
             as current_exact_price_count,
           count(distinct snapshot.card_print_id)::integer
             as current_parent_price_count,
           max(snapshot.source_sync_finished_at)
             as latest_published_source_at
         from current_publication current_state
         join public.market_price_publication_sets publication_set
           on publication_set.id = current_state.publication_set_id
          and publication_set.run_id = current_state.run_id
          and publication_set.publication_state = 'published'
         join public.market_price_pipeline_runs pipeline_run
           on pipeline_run.id = current_state.run_id
          and pipeline_run.reconciliation_state = 'reconciled'
          and pipeline_run.state in ('published', 'verified')
         join public.market_price_publication_snapshots snapshot
           on snapshot.publication_set_id = current_state.publication_set_id
          and snapshot.run_id = current_state.run_id
          and snapshot.publication_state = 'published'
          and snapshot.freshness_state = 'fresh'
          and snapshot.source_sync_finished_at >= now() - interval '36 hours'
         join public.market_price_qualification_decisions decision
           on decision.id = snapshot.qualification_decision_id
          and decision.run_id = snapshot.run_id
          and decision.eligible = true
          and decision.decision = 'publish'
          and decision.publication_lane = 'current'
         where not exists (
           select 1
           from public.card_printing_truth_reviews truth_review
           where truth_review.card_printing_id = snapshot.card_printing_id
             and truth_review.active = true
             and truth_review.public_visibility in (
               'hidden_pending_review',
               'hidden_unsupported'
             )
         )
       )
       select
         source.run_key as latest_source_run_key,
         source.status as latest_source_status,
         source.source_marker as latest_source_marker,
         source.finished_at as latest_source_finished_at,
         source.price_row_count as latest_source_price_row_count,
         source.failed_count as latest_source_failed_count,
         source.error as latest_source_error,
         completed_source.run_key as completed_source_run_key,
         completed_source.status as completed_source_status,
         completed_source.source_marker as completed_source_marker,
         completed_source.finished_at as completed_source_finished_at,
         completed_source.price_row_count as completed_source_price_row_count,
         completed_source.failed_count as completed_source_failed_count,
         completed_source.error as completed_source_error,
         pipeline_run.id as selected_run_id,
         pipeline_run.run_mode as selected_run_mode,
         pipeline_run.state as selected_run_state,
         pipeline_run.reconciliation_state,
         pipeline_run.selected_count as run_selected_count,
         pipeline_run.excluded_count as run_excluded_count,
         pipeline_run.quarantined_count as run_quarantined_count,
         pipeline_run.delayed_count as run_delayed_count,
         pipeline_run.suppressed_count as run_suppressed_count,
         pipeline_run.eligible_count as run_eligible_count,
         pipeline_run.snapshot_count as run_snapshot_count,
         pipeline_run.required_phase_count,
         pipeline_run.succeeded_phase_count,
         decisions.*,
         snapshots.snapshot_count,
         snapshots.traced_snapshot_count,
         phases.succeeded_required_phase_count,
         phases.failed_phase_attempt_count,
         current_prices.*,
         current_publication.publication_set_id as current_publication_set_id,
         current_publication.run_id as current_publication_run_id,
         current_publication.activated_at as current_publication_activated_at,
         (
           snapshots.snapshot_count - snapshots.traced_snapshot_count
         )::integer as broken_trace_count
       from decision_totals decisions
       cross join snapshot_totals snapshots
       cross join phase_totals phases
       cross join current_totals current_prices
       left join latest_source source on true
       left join completed_source on true
       left join selected_run pipeline_run on true
       left join current_publication on true
