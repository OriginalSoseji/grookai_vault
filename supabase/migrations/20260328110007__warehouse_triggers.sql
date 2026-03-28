set search_path = public;

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
      if new.state not in ('STAGED_FOR_PROMOTION', 'REJECTED', 'ARCHIVED') then
        raise exception 'illegal_candidate_state_transition';
      end if;
    when 'STAGED_FOR_PROMOTION' then
      if new.state not in ('PROMOTED', 'ARCHIVED') then
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

create or replace function public.trg_canon_warehouse_evidence_insert_only_v1()
returns trigger
language plpgsql
as $$
begin
  raise exception 'canon_warehouse_candidate_evidence is insert-only';
end;
$$;

create or replace function public.trg_canon_warehouse_events_insert_only_v1()
returns trigger
language plpgsql
as $$
begin
  raise exception 'canon_warehouse_candidate_events is insert-only';
end;
$$;

create or replace function public.trg_canon_warehouse_credits_guard_v1()
returns trigger
language plpgsql
as $$
declare
  v_candidate_state text;
begin
  if (new.canonical_target_type is null) <> (new.canonical_target_id is null) then
    raise exception 'canonical_target_pair_required';
  end if;

  if new.canonical_target_type is not null then
    select c.state
      into v_candidate_state
    from public.canon_warehouse_candidates c
    where c.id = new.candidate_id;

    if not found then
      raise exception 'candidate_not_found';
    end if;

    if v_candidate_state <> 'PROMOTED' then
      raise exception 'canonical_target_requires_promoted_candidate';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.trg_staging_success_immutable()
returns trigger
language plpgsql
as $$
begin
  if old.execution_status = 'SUCCEEDED' then
    raise exception 'Cannot modify SUCCEEDED staging row';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

create or replace function public.trg_staging_payload_immutability_v1()
returns trigger
language plpgsql
as $$
begin
  if new.frozen_payload is distinct from old.frozen_payload then
    raise exception 'frozen_payload is immutable';
  end if;

  if new.approved_action_type is distinct from old.approved_action_type then
    raise exception 'approved_action_type is immutable';
  end if;

  return new;
end;
$$;

create or replace function public.trg_canon_warehouse_set_updated_at_v1()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_canon_warehouse_candidates_updated_at on public.canon_warehouse_candidates;
create trigger trg_canon_warehouse_candidates_updated_at
before update on public.canon_warehouse_candidates
for each row
execute function public.trg_canon_warehouse_set_updated_at_v1();

drop trigger if exists trg_canon_warehouse_candidates_transition_guard on public.canon_warehouse_candidates;
create trigger trg_canon_warehouse_candidates_transition_guard
before update on public.canon_warehouse_candidates
for each row
execute function public.trg_canon_warehouse_candidates_transition_guard_v1();

drop trigger if exists trg_canon_warehouse_evidence_block_update on public.canon_warehouse_candidate_evidence;
create trigger trg_canon_warehouse_evidence_block_update
before update on public.canon_warehouse_candidate_evidence
for each row
execute function public.trg_canon_warehouse_evidence_insert_only_v1();

drop trigger if exists trg_canon_warehouse_evidence_block_delete on public.canon_warehouse_candidate_evidence;
create trigger trg_canon_warehouse_evidence_block_delete
before delete on public.canon_warehouse_candidate_evidence
for each row
execute function public.trg_canon_warehouse_evidence_insert_only_v1();

drop trigger if exists trg_canon_warehouse_events_block_update on public.canon_warehouse_candidate_events;
create trigger trg_canon_warehouse_events_block_update
before update on public.canon_warehouse_candidate_events
for each row
execute function public.trg_canon_warehouse_events_insert_only_v1();

drop trigger if exists trg_canon_warehouse_events_block_delete on public.canon_warehouse_candidate_events;
create trigger trg_canon_warehouse_events_block_delete
before delete on public.canon_warehouse_candidate_events
for each row
execute function public.trg_canon_warehouse_events_insert_only_v1();

drop trigger if exists trg_canon_warehouse_credits_guard on public.canon_warehouse_candidate_credits;
create trigger trg_canon_warehouse_credits_guard
before insert or update on public.canon_warehouse_candidate_credits
for each row
execute function public.trg_canon_warehouse_credits_guard_v1();

drop trigger if exists trg_staging_success_immutable on public.canon_warehouse_promotion_staging;
create trigger trg_staging_success_immutable
before update or delete on public.canon_warehouse_promotion_staging
for each row
execute function public.trg_staging_success_immutable();

drop trigger if exists trg_staging_payload_immutable on public.canon_warehouse_promotion_staging;
create trigger trg_staging_payload_immutable
before update on public.canon_warehouse_promotion_staging
for each row
execute function public.trg_staging_payload_immutability_v1();
