set search_path = public;

create index idx_candidates_review_ready
on public.canon_warehouse_candidates (created_at desc)
where state = 'REVIEW_READY';

create index idx_candidates_submitter_created_at
on public.canon_warehouse_candidates (submitted_by_user_id, created_at desc);

create index idx_candidates_promoted_card_print_lookup
on public.canon_warehouse_candidates (promoted_card_print_id)
where promoted_card_print_id is not null;

create index idx_candidates_promoted_card_printing_lookup
on public.canon_warehouse_candidates (promoted_card_printing_id)
where promoted_card_printing_id is not null;

create unique index uq_staging_active
on public.canon_warehouse_promotion_staging (candidate_id)
where execution_status in ('PENDING', 'RUNNING');

create index idx_staging_executor_queue
on public.canon_warehouse_promotion_staging (staged_at asc)
where execution_status = 'PENDING';

create index idx_staging_candidate_id
on public.canon_warehouse_promotion_staging (candidate_id);

create index idx_evidence_candidate
on public.canon_warehouse_candidate_evidence (candidate_id, created_at asc);

create index idx_events_candidate
on public.canon_warehouse_candidate_events (candidate_id, created_at desc);

create index idx_credits_candidate
on public.canon_warehouse_candidate_credits (candidate_id);
