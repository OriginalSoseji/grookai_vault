begin;

create or replace function public.execute_card_interaction_outcome_v1(
  p_execution_type text,
  p_latest_interaction_id uuid,
  p_source_instance_id uuid,
  p_price_amount numeric default null,
  p_price_currency text default null,
  p_execution_event_id uuid default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_now timestamptz := now();
  v_execution_type text := lower(btrim(coalesce(p_execution_type, '')));
  v_price_currency text := upper(nullif(btrim(p_price_currency), ''));
  v_interaction public.card_interactions%rowtype;
  v_source_instance public.vault_item_instances%rowtype;
  v_source_bucket public.vault_items%rowtype;
  v_target_bucket public.vault_items%rowtype;
  v_result_instance public.vault_item_instances%rowtype;
  v_execution_event public.card_execution_events%rowtype;
  v_event_leg_count integer := 0;
  v_target_user_id uuid;
  v_remaining_source_count integer := 0;
  v_target_bucket_count integer := 0;
  v_target_gv_id text;
begin
  if v_actor is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  if v_execution_type not in ('sale', 'trade') then
    raise exception 'invalid_execution_type' using errcode = 'P0001';
  end if;

  if p_latest_interaction_id is null then
    raise exception 'latest_interaction_id_required' using errcode = 'P0001';
  end if;

  if p_source_instance_id is null then
    raise exception 'source_instance_id_required' using errcode = 'P0001';
  end if;

  if p_price_amount is not null and p_price_amount < 0 then
    raise exception 'price_amount_nonnegative_required' using errcode = 'P0001';
  end if;

  if (p_price_amount is null and v_price_currency is not null) or (p_price_amount is not null and v_price_currency is null) then
    raise exception 'price_amount_and_currency_must_pair' using errcode = 'P0001';
  end if;

  if v_execution_type = 'sale' and p_execution_event_id is not null then
    raise exception 'sale_does_not_accept_existing_event' using errcode = 'P0001';
  end if;

  select *
  into v_interaction
  from public.card_interactions
  where id = p_latest_interaction_id;

  if not found then
    raise exception 'interaction_not_found' using errcode = 'P0001';
  end if;

  if v_actor <> v_interaction.sender_user_id and v_actor <> v_interaction.receiver_user_id then
    raise exception 'interaction_participant_required' using errcode = 'P0001';
  end if;

  v_target_user_id :=
    case
      when v_interaction.sender_user_id = v_actor then v_interaction.receiver_user_id
      else v_interaction.sender_user_id
    end;

  if v_target_user_id is null or v_target_user_id = v_actor then
    raise exception 'counterpart_resolution_failed' using errcode = 'P0001';
  end if;

  select *
  into v_source_instance
  from public.vault_item_instances
  where id = p_source_instance_id
  for update;

  if not found then
    raise exception 'source_instance_not_found' using errcode = 'P0001';
  end if;

  if v_source_instance.archived_at is not null then
    raise exception 'source_instance_already_archived' using errcode = 'P0001';
  end if;

  if v_source_instance.user_id <> v_actor then
    raise exception 'source_instance_not_owned_by_actor' using errcode = 'P0001';
  end if;

  if v_source_instance.card_print_id is null then
    raise exception 'source_instance_missing_card_print' using errcode = 'P0001';
  end if;

  if v_source_instance.card_print_id <> v_interaction.card_print_id then
    raise exception 'interaction_card_mismatch' using errcode = 'P0001';
  end if;

  if v_source_instance.legacy_vault_item_id is null then
    raise exception 'source_instance_missing_vault_item_lineage' using errcode = 'P0001';
  end if;

  if v_source_instance.legacy_vault_item_id <> v_interaction.vault_item_id then
    raise exception 'interaction_vault_item_mismatch' using errcode = 'P0001';
  end if;

  select *
  into v_source_bucket
  from public.vault_items
  where id = v_source_instance.legacy_vault_item_id
  for update;

  if not found then
    raise exception 'source_vault_item_not_found' using errcode = 'P0001';
  end if;

  if v_source_bucket.archived_at is not null then
    raise exception 'source_vault_item_already_archived' using errcode = 'P0001';
  end if;

  if v_source_bucket.user_id <> v_actor then
    raise exception 'source_vault_item_not_owned_by_actor' using errcode = 'P0001';
  end if;

  if v_source_bucket.card_id <> v_source_instance.card_print_id then
    raise exception 'source_bucket_card_mismatch' using errcode = 'P0001';
  end if;

  if p_execution_event_id is not null then
    select *
    into v_execution_event
    from public.card_execution_events
    where id = p_execution_event_id
    for update;

    if not found then
      raise exception 'execution_event_not_found' using errcode = 'P0001';
    end if;

    if v_execution_event.execution_type <> 'trade' then
      raise exception 'execution_event_type_mismatch' using errcode = 'P0001';
    end if;

    select count(*)
    into v_event_leg_count
    from public.card_interaction_outcomes outcomes
    where outcomes.execution_event_id = v_execution_event.id;

    if exists (
      select 1
      from public.card_interaction_outcomes outcomes
      where outcomes.execution_event_id = v_execution_event.id
        and (
          outcomes.source_user_id not in (v_actor, v_target_user_id)
          or outcomes.target_user_id not in (v_actor, v_target_user_id)
        )
    ) then
      raise exception 'execution_event_participant_mismatch' using errcode = 'P0001';
    end if;

    if exists (
      select 1
      from public.card_interaction_outcomes outcomes
      where outcomes.execution_event_id = v_execution_event.id
        and outcomes.source_user_id = v_actor
    ) then
      raise exception 'trade_leg_already_recorded_for_actor' using errcode = 'P0001';
    end if;

    if v_event_leg_count >= 2 then
      raise exception 'execution_event_already_complete' using errcode = 'P0001';
    end if;
  else
    insert into public.card_execution_events (
      execution_type,
      initiated_by_user_id,
      created_at
    ) values (
      v_execution_type,
      v_actor,
      v_now
    )
    returning *
    into v_execution_event;
  end if;

  update public.vault_item_instances
  set archived_at = v_now
  where id = v_source_instance.id
    and archived_at is null;

  if not found then
    raise exception 'source_instance_archive_failed' using errcode = 'P0001';
  end if;

  select count(*)
  into v_remaining_source_count
  from public.vault_item_instances
  where legacy_vault_item_id = v_source_bucket.id
    and archived_at is null;

  if v_remaining_source_count <= 0 then
    update public.vault_items
    set
      qty = 0,
      archived_at = coalesce(archived_at, v_now)
    where id = v_source_bucket.id
      and user_id = v_actor
      and archived_at is null
    returning *
    into v_source_bucket;
  else
    update public.vault_items
    set qty = v_remaining_source_count
    where id = v_source_bucket.id
      and user_id = v_actor
      and archived_at is null
    returning *
    into v_source_bucket;
  end if;

  select coalesce(nullif(btrim(v_source_bucket.gv_id), ''), nullif(btrim(cp.gv_id), ''))
  into v_target_gv_id
  from public.card_prints cp
  where cp.id = v_source_instance.card_print_id;

  select *
  into v_target_bucket
  from public.resolve_active_vault_anchor_v1(
    p_user_id => v_target_user_id,
    p_card_print_id => v_source_instance.card_print_id,
    p_gv_id => v_target_gv_id,
    p_condition_label => coalesce(v_source_instance.condition_label, v_source_bucket.condition_label, 'NM'),
    p_notes => v_source_instance.notes,
    p_name => coalesce(v_source_instance.name, v_source_bucket.name),
    p_set_name => coalesce(v_source_instance.set_name, v_source_bucket.set_name),
    p_photo_url => coalesce(v_source_instance.photo_url, v_source_bucket.photo_url),
    p_create_if_missing => true
  );

  if v_target_bucket.id is null then
    raise exception 'target_vault_item_resolution_failed' using errcode = 'P0001';
  end if;

  select *
  into v_result_instance
  from public.admin_vault_instance_create_v1(
    p_user_id => v_target_user_id,
    p_card_print_id => v_source_instance.card_print_id,
    p_legacy_vault_item_id => v_target_bucket.id,
    p_acquisition_cost => p_price_amount,
    p_condition_label => v_source_instance.condition_label,
    p_condition_score => v_source_instance.condition_score,
    p_is_graded => v_source_instance.is_graded,
    p_grade_company => v_source_instance.grade_company,
    p_grade_value => v_source_instance.grade_value,
    p_grade_label => v_source_instance.grade_label,
    p_notes => v_source_instance.notes,
    p_name => coalesce(v_source_instance.name, v_source_bucket.name),
    p_set_name => coalesce(v_source_instance.set_name, v_source_bucket.set_name),
    p_photo_url => coalesce(v_source_instance.photo_url, v_source_bucket.photo_url),
    p_market_price => v_source_instance.market_price,
    p_last_price_update => v_source_instance.last_price_update,
    p_image_source => v_source_instance.image_source,
    p_image_url => v_source_instance.image_url,
    p_image_back_source => v_source_instance.image_back_source,
    p_image_back_url => v_source_instance.image_back_url,
    p_created_at => v_now
  );

  select count(*)
  into v_target_bucket_count
  from public.vault_item_instances
  where legacy_vault_item_id = v_target_bucket.id
    and archived_at is null;

  update public.vault_items
  set qty = greatest(v_target_bucket_count, 1)
  where id = v_target_bucket.id
    and user_id = v_target_user_id
    and archived_at is null
  returning *
  into v_target_bucket;

  insert into public.card_interaction_outcomes (
    execution_event_id,
    latest_interaction_id,
    card_print_id,
    source_instance_id,
    source_vault_item_id,
    source_user_id,
    target_user_id,
    result_instance_id,
    result_vault_item_id,
    outcome_type,
    price_amount,
    price_currency,
    executed_by_user_id,
    created_at
  ) values (
    v_execution_event.id,
    v_interaction.id,
    v_source_instance.card_print_id,
    v_source_instance.id,
    v_source_bucket.id,
    v_actor,
    v_target_user_id,
    v_result_instance.id,
    v_target_bucket.id,
    v_execution_type,
    p_price_amount,
    v_price_currency,
    v_actor,
    v_now
  );

  return jsonb_build_object(
    'execution_event_id', v_execution_event.id,
    'latest_interaction_id', v_interaction.id,
    'card_print_id', v_source_instance.card_print_id,
    'source_instance_id', v_source_instance.id,
    'source_vault_item_id', v_source_bucket.id,
    'target_user_id', v_target_user_id,
    'result_instance_id', v_result_instance.id,
    'result_vault_item_id', v_target_bucket.id,
    'outcome_type', v_execution_type,
    'price_amount', p_price_amount,
    'price_currency', v_price_currency
  );
end;
$$;

revoke all on function public.execute_card_interaction_outcome_v1(text, uuid, uuid, numeric, text, uuid)
from public, anon;

grant execute on function public.execute_card_interaction_outcome_v1(text, uuid, uuid, numeric, text, uuid)
to authenticated;

commit;
