set search_path = public;

alter table public.canon_warehouse_candidates
add constraint chk_candidates_state
check (state in (
  'RAW',
  'NORMALIZED',
  'CLASSIFIED',
  'REVIEW_READY',
  'APPROVED_BY_FOUNDER',
  'STAGED_FOR_PROMOTION',
  'PROMOTED',
  'REJECTED',
  'ARCHIVED'
));

alter table public.canon_warehouse_candidates
add constraint chk_candidates_notes_not_blank
check (length(trim(notes)) > 0);

alter table public.canon_warehouse_candidates
add constraint chk_candidates_submission_intent
check (submission_intent in ('MISSING_CARD', 'MISSING_IMAGE'));

alter table public.canon_warehouse_candidates
add constraint chk_candidates_intake_channel
check (intake_channel in ('SCAN', 'UPLOAD', 'MANUAL'));

alter table public.canon_warehouse_candidates
add constraint chk_candidates_submission_type_not_blank
check (length(trim(submission_type)) > 0);

alter table public.canon_warehouse_candidates
add constraint chk_candidates_tcgplayer_id_not_blank
check (tcgplayer_id is null or length(trim(tcgplayer_id)) > 0);

alter table public.canon_warehouse_candidates
add constraint chk_candidates_interpreter_decision
check (
  interpreter_decision is null
  or interpreter_decision in ('ROW', 'CHILD', 'BLOCKED')
);

alter table public.canon_warehouse_candidates
add constraint chk_candidates_proposed_action_type
check (
  proposed_action_type is null
  or proposed_action_type in (
    'CREATE_CARD_PRINT',
    'CREATE_CARD_PRINTING',
    'ENRICH_CANON_IMAGE',
    'BLOCKED_NO_PROMOTION',
    'REVIEW_REQUIRED'
  )
);

alter table public.canon_warehouse_candidates
add constraint chk_candidates_promotion_result_type
check (
  promotion_result_type is null
  or promotion_result_type in (
    'CARD_PRINT_CREATED',
    'CARD_PRINTING_CREATED',
    'CANON_IMAGE_ENRICHED',
    'NO_OP',
    'FAILED'
  )
);

alter table public.canon_warehouse_candidates
add constraint chk_candidates_founder_approval_pair
check (
  (founder_approved_by_user_id is null and founder_approved_at is null)
  or
  (founder_approved_by_user_id is not null and founder_approved_at is not null)
);

alter table public.canon_warehouse_candidates
add constraint chk_candidates_founder_required_for_approved_states
check (
  state not in ('APPROVED_BY_FOUNDER', 'STAGED_FOR_PROMOTION', 'PROMOTED')
  or
  (founder_approved_by_user_id is not null and founder_approved_at is not null)
);

alter table public.canon_warehouse_candidates
add constraint chk_candidates_rejected_pair
check (
  (rejected_by_user_id is null and rejected_at is null)
  or
  (rejected_by_user_id is not null and rejected_at is not null)
);

alter table public.canon_warehouse_candidates
add constraint chk_candidates_archived_pair
check (
  (archived_by_user_id is null and archived_at is null)
  or
  (archived_by_user_id is not null and archived_at is not null)
);

alter table public.canon_warehouse_candidates
add constraint chk_candidates_promoted_card_print_state
check (
  promoted_card_print_id is null
  or state = 'PROMOTED'
);

alter table public.canon_warehouse_candidates
add constraint chk_candidates_promoted_card_printing_state
check (
  promoted_card_printing_id is null
  or state = 'PROMOTED'
);

alter table public.canon_warehouse_candidates
add constraint chk_candidates_promoted_image_target_state
check (
  (promoted_image_target_type is null and promoted_image_target_id is null)
  or
  (
    state = 'PROMOTED'
    and promoted_image_target_type is not null
    and promoted_image_target_id is not null
  )
);

alter table public.canon_warehouse_candidates
add constraint chk_candidates_promoted_metadata_required
check (
  state <> 'PROMOTED'
  or
  (
    promoted_by_user_id is not null
    and promoted_at is not null
    and promotion_result_type is not null
  )
);

alter table public.canon_warehouse_candidate_evidence
add constraint chk_candidate_evidence_kind
check (
  evidence_kind in (
    'IDENTITY_SNAPSHOT',
    'CONDITION_SNAPSHOT',
    'SCAN_EVENT',
    'IMAGE'
  )
);

alter table public.canon_warehouse_candidate_evidence
add constraint chk_candidate_evidence_slot
check (
  evidence_slot is null
  or evidence_slot in ('front', 'back')
);

alter table public.canon_warehouse_candidate_evidence
add constraint chk_candidate_evidence_shape
check (
  (
    evidence_kind = 'IDENTITY_SNAPSHOT'
    and identity_snapshot_id is not null
    and condition_snapshot_id is null
    and identity_scan_event_id is null
  )
  or
  (
    evidence_kind = 'CONDITION_SNAPSHOT'
    and identity_snapshot_id is null
    and condition_snapshot_id is not null
    and identity_scan_event_id is null
  )
  or
  (
    evidence_kind = 'SCAN_EVENT'
    and identity_snapshot_id is null
    and condition_snapshot_id is null
    and identity_scan_event_id is not null
  )
  or
  (
    evidence_kind = 'IMAGE'
    and identity_snapshot_id is null
    and condition_snapshot_id is null
    and identity_scan_event_id is null
    and evidence_slot is not null
    and storage_path is not null
    and length(trim(storage_path)) > 0
  )
);

alter table public.canon_warehouse_candidate_events
add constraint chk_candidate_events_actor_type
check (
  actor_type in ('USER', 'SYSTEM', 'REVIEWER', 'FOUNDER', 'EXECUTOR')
);

alter table public.canon_warehouse_candidate_events
add constraint chk_candidate_events_previous_state
check (
  previous_state is null
  or previous_state in (
    'RAW',
    'NORMALIZED',
    'CLASSIFIED',
    'REVIEW_READY',
    'APPROVED_BY_FOUNDER',
    'STAGED_FOR_PROMOTION',
    'PROMOTED',
    'REJECTED',
    'ARCHIVED'
  )
);

alter table public.canon_warehouse_candidate_events
add constraint chk_candidate_events_next_state
check (
  next_state is null
  or next_state in (
    'RAW',
    'NORMALIZED',
    'CLASSIFIED',
    'REVIEW_READY',
    'APPROVED_BY_FOUNDER',
    'STAGED_FOR_PROMOTION',
    'PROMOTED',
    'REJECTED',
    'ARCHIVED'
  )
);

alter table public.canon_warehouse_candidate_credits
add constraint chk_candidate_credits_credit_type
check (
  credit_type in (
    'DISCOVERY',
    'IMAGE_CONTRIBUTION',
    'FINISH_CONFIRMATION',
    'VARIANT_CONFIRMATION'
  )
);

alter table public.canon_warehouse_candidate_credits
add constraint chk_candidate_credits_credit_status
check (
  credit_status in ('PENDING', 'AWARDED', 'REJECTED', 'ARCHIVED')
);

alter table public.canon_warehouse_candidate_credits
add constraint chk_candidate_credits_canonical_pair
check (
  (canonical_target_type is null and canonical_target_id is null)
  or
  (canonical_target_type is not null and canonical_target_id is not null)
);

alter table public.canon_warehouse_promotion_staging
add constraint chk_staging_status
check (execution_status in ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED'));

alter table public.canon_warehouse_promotion_staging
add constraint chk_staging_approved_action
check (
  approved_action_type in (
    'CREATE_CARD_PRINT',
    'CREATE_CARD_PRINTING',
    'ENRICH_CANON_IMAGE'
  )
);

alter table public.canon_warehouse_promotion_staging
add constraint chk_staging_founder_approval_required
check (
  founder_approved_by_user_id is not null
  and founder_approved_at is not null
);

alter table public.canon_warehouse_promotion_staging
add constraint chk_staging_execution_attempts_nonnegative
check (execution_attempts >= 0);

alter table public.canon_warehouse_promotion_staging
add constraint chk_staging_executed_at_on_success
check (
  (execution_status = 'SUCCEEDED' and executed_at is not null)
  or
  (execution_status <> 'SUCCEEDED' and executed_at is null)
);

alter table public.canon_warehouse_candidates
add constraint fk_warehouse_candidates_submitted_by_user
foreign key (submitted_by_user_id)
references auth.users(id)
on delete restrict;

alter table public.canon_warehouse_candidates
add constraint fk_warehouse_candidates_founder_approved_by_user
foreign key (founder_approved_by_user_id)
references auth.users(id)
on delete restrict;

alter table public.canon_warehouse_candidates
add constraint fk_warehouse_candidates_rejected_by_user
foreign key (rejected_by_user_id)
references auth.users(id)
on delete restrict;

alter table public.canon_warehouse_candidates
add constraint fk_warehouse_candidates_archived_by_user
foreign key (archived_by_user_id)
references auth.users(id)
on delete restrict;

alter table public.canon_warehouse_candidates
add constraint fk_warehouse_candidates_promoted_by_user
foreign key (promoted_by_user_id)
references auth.users(id)
on delete restrict;

alter table public.canon_warehouse_candidates
add constraint fk_warehouse_candidates_promoted_card_print
foreign key (promoted_card_print_id)
references public.card_prints(id)
on delete restrict;

alter table public.canon_warehouse_candidates
add constraint fk_warehouse_candidates_promoted_card_printing
foreign key (promoted_card_printing_id)
references public.card_printings(id)
on delete restrict;

alter table public.canon_warehouse_candidate_evidence
add constraint fk_warehouse_evidence_candidate
foreign key (candidate_id)
references public.canon_warehouse_candidates(id)
on delete restrict;

alter table public.canon_warehouse_candidate_evidence
add constraint fk_warehouse_evidence_identity_snapshot
foreign key (identity_snapshot_id)
references public.identity_snapshots(id)
on delete restrict;

alter table public.canon_warehouse_candidate_evidence
add constraint fk_warehouse_evidence_condition_snapshot
foreign key (condition_snapshot_id)
references public.condition_snapshots(id)
on delete restrict;

alter table public.canon_warehouse_candidate_evidence
add constraint fk_warehouse_evidence_identity_scan_event
foreign key (identity_scan_event_id)
references public.identity_scan_events(id)
on delete restrict;

alter table public.canon_warehouse_candidate_evidence
add constraint fk_warehouse_evidence_created_by_user
foreign key (created_by_user_id)
references auth.users(id)
on delete restrict;

alter table public.canon_warehouse_candidate_events
add constraint fk_warehouse_events_candidate
foreign key (candidate_id)
references public.canon_warehouse_candidates(id)
on delete restrict;

alter table public.canon_warehouse_candidate_events
add constraint fk_warehouse_events_actor_user
foreign key (actor_user_id)
references auth.users(id)
on delete restrict;

alter table public.canon_warehouse_candidate_credits
add constraint fk_warehouse_credits_candidate
foreign key (candidate_id)
references public.canon_warehouse_candidates(id)
on delete restrict;

alter table public.canon_warehouse_candidate_credits
add constraint fk_warehouse_credits_user
foreign key (user_id)
references auth.users(id)
on delete restrict;

alter table public.canon_warehouse_promotion_staging
add constraint fk_warehouse_staging_candidate
foreign key (candidate_id)
references public.canon_warehouse_candidates(id)
on delete restrict;

alter table public.canon_warehouse_promotion_staging
add constraint fk_warehouse_staging_founder_approved_by_user
foreign key (founder_approved_by_user_id)
references auth.users(id)
on delete restrict;

alter table public.canon_warehouse_promotion_staging
add constraint fk_warehouse_staging_staged_by_user
foreign key (staged_by_user_id)
references auth.users(id)
on delete restrict;

alter table public.canon_warehouse_candidates
add constraint fk_warehouse_candidates_current_staging
foreign key (current_staging_id)
references public.canon_warehouse_promotion_staging(id)
on delete restrict;

alter table public.canon_warehouse_candidate_events
add constraint fk_warehouse_events_staging
foreign key (staging_id)
references public.canon_warehouse_promotion_staging(id)
on delete restrict;
