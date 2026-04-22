set search_path = public;

alter table public.canon_warehouse_candidates
  add column if not exists identity_audit_status text,
  add column if not exists identity_audit_reason_code text,
  add column if not exists identity_resolution text;

alter table public.canon_warehouse_candidates
drop constraint if exists chk_candidates_identity_audit_status;

alter table public.canon_warehouse_candidates
add constraint chk_candidates_identity_audit_status
check (
  identity_audit_status is null
  or identity_audit_status in (
    'NEW_CANONICAL',
    'ALIAS',
    'VARIANT_IDENTITY',
    'PRINTING_ONLY',
    'SLOT_CONFLICT',
    'AMBIGUOUS'
  )
);

alter table public.canon_warehouse_candidates
drop constraint if exists chk_candidates_identity_resolution;

alter table public.canon_warehouse_candidates
add constraint chk_candidates_identity_resolution
check (
  identity_resolution is null
  or identity_resolution in (
    'PROMOTE_NEW',
    'PROMOTE_VARIANT',
    'ATTACH_PRINTING',
    'MAP_ALIAS',
    'BLOCK_REVIEW_REQUIRED',
    'BLOCK_AMBIGUOUS'
  )
);

alter table public.canon_warehouse_candidates
drop constraint if exists chk_candidates_identity_resolution_requires_audit;

alter table public.canon_warehouse_candidates
add constraint chk_candidates_identity_resolution_requires_audit
check (
  identity_resolution is null
  or identity_audit_status is not null
);

create or replace function public.trg_canon_warehouse_candidates_transition_guard_v1()
returns trigger
language plpgsql
as $$
declare
  v_staging_status text;
  v_success_count integer;
begin
  if new.state = old.state then
    return new;
  end if;

  case old.state
    when 'RAW' then
      if new.state not in ('NORMALIZED', 'ARCHIVED') then
        raise exception 'illegal_candidate_state_transition';
      end if;
    when 'NORMALIZED' then
      if new.state not in ('CLASSIFIED', 'ARCHIVED') then
        raise exception 'illegal_candidate_state_transition';
      end if;
    when 'CLASSIFIED' then
      if new.state not in ('REVIEW_READY', 'ARCHIVED') then
        raise exception 'illegal_candidate_state_transition';
      end if;
    when 'REVIEW_READY' then
      if new.state not in ('APPROVED_BY_FOUNDER', 'REJECTED', 'ARCHIVED') then
        raise exception 'illegal_candidate_state_transition';
      end if;
    when 'APPROVED_BY_FOUNDER' then
      if new.state not in ('REVIEW_READY', 'STAGED_FOR_PROMOTION', 'REJECTED', 'ARCHIVED') then
        raise exception 'illegal_candidate_state_transition';
      end if;
    when 'STAGED_FOR_PROMOTION' then
      if new.state not in ('REVIEW_READY', 'PROMOTED', 'ARCHIVED') then
        raise exception 'illegal_candidate_state_transition';
      end if;
    when 'REJECTED' then
      if new.state not in ('ARCHIVED') then
        raise exception 'illegal_candidate_state_transition';
      end if;
    when 'PROMOTED' then
      raise exception 'illegal_candidate_state_transition';
    when 'ARCHIVED' then
      raise exception 'illegal_candidate_state_transition';
    else
      raise exception 'illegal_candidate_state_transition';
  end case;

  if new.state = 'APPROVED_BY_FOUNDER'
     and (new.founder_approved_by_user_id is null or new.founder_approved_at is null) then
    raise exception 'founder_approval_required';
  end if;

  if old.state = 'STAGED_FOR_PROMOTION' and new.state = 'REVIEW_READY' then
    if old.current_staging_id is null then
      raise exception 'review_ready_requires_current_staging_id';
    end if;

    select s.execution_status
      into v_staging_status
    from public.canon_warehouse_promotion_staging s
    where s.id = old.current_staging_id
      and s.candidate_id = old.id;

    if not found then
      raise exception 'invalid_current_staging_id';
    end if;

    if v_staging_status <> 'FAILED' then
      raise exception 'review_ready_requires_failed_staging';
    end if;

    if new.current_staging_id is not null then
      raise exception 'review_ready_requires_null_current_staging_id';
    end if;
  end if;

  if old.state = 'APPROVED_BY_FOUNDER' and new.state = 'REVIEW_READY' and new.current_staging_id is not null then
    raise exception 'review_ready_requires_null_current_staging_id';
  end if;

  if new.state = 'STAGED_FOR_PROMOTION' then
    if new.current_staging_id is null then
      raise exception 'current_staging_id_required';
    end if;

    select s.execution_status
      into v_staging_status
    from public.canon_warehouse_promotion_staging s
    where s.id = new.current_staging_id
      and s.candidate_id = new.id;

    if not found then
      raise exception 'invalid_current_staging_id';
    end if;

    if v_staging_status not in ('PENDING', 'RUNNING', 'FAILED', 'SUCCEEDED') then
      raise exception 'invalid_staging_status';
    end if;
  end if;

  if new.state = 'PROMOTED' then
    if new.current_staging_id is null then
      raise exception 'current_staging_id_required';
    end if;

    select s.execution_status
      into v_staging_status
    from public.canon_warehouse_promotion_staging s
    where s.id = new.current_staging_id
      and s.candidate_id = new.id;

    if not found then
      raise exception 'invalid_current_staging_id';
    end if;

    if v_staging_status <> 'SUCCEEDED' then
      raise exception 'promoted_requires_succeeded_staging';
    end if;

    select count(*)
      into v_success_count
    from public.canon_warehouse_promotion_staging s
    where s.candidate_id = new.id
      and s.execution_status = 'SUCCEEDED';

    if v_success_count <> 1 then
      raise exception 'promoted_requires_exactly_one_successful_staging';
    end if;
  end if;

  return new;
end;
$$;
