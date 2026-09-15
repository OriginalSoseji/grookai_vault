with production_counts as (
         select
           count(*) filter (
             where decision.evidence ->> 'category_id' = '1'
           )::integer as mtg_selected,
           count(distinct snapshot.card_printing_id) filter (
             where decision.evidence ->> 'category_id' = '1'
               and not exists (
                 select 1
                 from public.card_printing_truth_reviews truth_review
                 where truth_review.card_printing_id = snapshot.card_printing_id
                   and truth_review.active = true
                   and truth_review.public_visibility in (
                     'hidden_pending_review',
                     'hidden_unsupported'
                   )
               )
           )::integer as mtg_eligible,
           count(distinct snapshot.card_printing_id) filter (
             where decision.evidence ->> 'category_id' = '3'
               and not exists (
                 select 1
                 from public.card_printing_truth_reviews truth_review
                 where truth_review.card_printing_id = snapshot.card_printing_id
                   and truth_review.active = true
                   and truth_review.public_visibility in (
                     'hidden_pending_review',
                     'hidden_unsupported'
                   )
               )
           )::integer as pokemon_eligible
         from public.market_price_publication_snapshots snapshot
         join public.market_price_qualification_decisions decision
           on decision.id = snapshot.qualification_decision_id
          and decision.run_id = snapshot.run_id
          and decision.eligible = true
          and decision.decision = 'publish'
          and decision.publication_lane = 'current'
        where snapshot.publication_set_id = $1
          and snapshot.run_id = $2
       ),
       current_counts as (
         select
           count(distinct snapshot.card_printing_id) filter (
             where decision.evidence ->> 'category_id' = '1'
           )::integer as mtg_baseline_eligible,
           count(distinct snapshot.card_printing_id) filter (
             where decision.evidence ->> 'category_id' = '3'
           )::integer as pokemon_baseline_eligible,
           count(distinct snapshot.card_printing_id) filter (
             where decision.evidence ->> 'category_id' = '3'
               and snapshot.source_sync_finished_at >=
               now() - interval '36 hours'
           )::integer as fresh_pokemon_eligible
         from public.market_price_current_publication current_state
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
         join public.market_price_qualification_decisions decision
           on decision.id = snapshot.qualification_decision_id
          and decision.run_id = snapshot.run_id
          and decision.eligible = true
          and decision.decision = 'publish'
          and decision.publication_lane = 'current'
        where current_state.singleton
          and not exists (
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
         production_counts.mtg_selected,
         production_counts.mtg_eligible,
         current_counts.mtg_baseline_eligible,
         production_counts.pokemon_eligible,
         current_counts.pokemon_baseline_eligible,
         current_counts.fresh_pokemon_eligible
       from production_counts cross join current_counts
