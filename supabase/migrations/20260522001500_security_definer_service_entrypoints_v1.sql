-- SECURITY_DEFINER_SERVICE_ENTRYPOINTS_V1
-- Move remaining user-facing privileged RPC execution behind service-role entrypoints.

begin;

create or replace function public.execute_card_interaction_outcome_service_v1(
  p_actor_user_id uuid,
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
begin
  if auth.role() <> 'service_role' then
    raise exception 'service_role_required' using errcode = '42501';
  end if;

  if p_actor_user_id is null then
    raise exception 'actor_user_id_required' using errcode = 'P0001';
  end if;

  perform set_config('request.jwt.claim.sub', p_actor_user_id::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);

  return public.execute_card_interaction_outcome_v1(
    p_execution_type,
    p_latest_interaction_id,
    p_source_instance_id,
    p_price_amount,
    p_price_currency,
    p_execution_event_id
  );
end;
$$;

create or replace function public.vault_add_card_instance_service_v1(
  p_actor_user_id uuid,
  p_card_print_id uuid,
  p_quantity integer default 1,
  p_condition_label text default 'NM',
  p_notes text default null,
  p_name text default null,
  p_set_name text default null,
  p_photo_url text default null,
  p_card_printing_id uuid default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() <> 'service_role' then
    raise exception 'service_role_required' using errcode = '42501';
  end if;

  if p_actor_user_id is null then
    raise exception 'actor_user_id_required' using errcode = 'P0001';
  end if;

  perform set_config('request.jwt.claim.sub', p_actor_user_id::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);

  return public.vault_add_card_instance_v1(
    p_card_print_id,
    p_quantity,
    p_condition_label,
    p_notes,
    p_name,
    p_set_name,
    p_photo_url,
    p_card_printing_id
  );
end;
$$;

create or replace function public.warehouse_intake_service_v1(
  p_actor_user_id uuid,
  p_notes text,
  p_tcgplayer_id text,
  p_submission_intent text,
  p_intake_channel text,
  p_identity_snapshot_id uuid,
  p_condition_snapshot_id uuid,
  p_identity_scan_event_id uuid,
  p_images jsonb,
  p_reference_hints_payload jsonb default '{}'::jsonb
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() <> 'service_role' then
    raise exception 'service_role_required' using errcode = '42501';
  end if;

  if p_actor_user_id is null then
    raise exception 'actor_user_id_required' using errcode = 'P0001';
  end if;

  perform set_config('request.jwt.claim.sub', p_actor_user_id::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);

  return public.warehouse_intake_v1(
    p_notes,
    p_tcgplayer_id,
    p_submission_intent,
    p_intake_channel,
    p_identity_snapshot_id,
    p_condition_snapshot_id,
    p_identity_scan_event_id,
    p_images,
    p_reference_hints_payload
  );
end;
$$;

revoke all on function public.execute_card_interaction_outcome_service_v1(
  uuid, text, uuid, uuid, numeric, text, uuid
) from public, anon, authenticated;
grant execute on function public.execute_card_interaction_outcome_service_v1(
  uuid, text, uuid, uuid, numeric, text, uuid
) to service_role;

revoke all on function public.vault_add_card_instance_service_v1(
  uuid, uuid, integer, text, text, text, text, text, uuid
) from public, anon, authenticated;
grant execute on function public.vault_add_card_instance_service_v1(
  uuid, uuid, integer, text, text, text, text, text, uuid
) to service_role;

revoke all on function public.warehouse_intake_service_v1(
  uuid, text, text, text, text, uuid, uuid, uuid, jsonb, jsonb
) from public, anon, authenticated;
grant execute on function public.warehouse_intake_service_v1(
  uuid, text, text, text, text, uuid, uuid, uuid, jsonb, jsonb
) to service_role;

revoke all on function public.execute_card_interaction_outcome_v1(
  text, uuid, uuid, numeric, text, uuid
) from public, anon, authenticated;
grant execute on function public.execute_card_interaction_outcome_v1(
  text, uuid, uuid, numeric, text, uuid
) to service_role;

revoke all on function public.vault_add_card_instance_v1(
  uuid, integer, text, text, text, text, text, uuid
) from public, anon, authenticated;
grant execute on function public.vault_add_card_instance_v1(
  uuid, integer, text, text, text, text, text, uuid
) to service_role;

revoke all on function public.warehouse_intake_v1(
  text, text, text, text, uuid, uuid, uuid, jsonb
) from public, anon, authenticated;
grant execute on function public.warehouse_intake_v1(
  text, text, text, text, uuid, uuid, uuid, jsonb
) to service_role;

revoke all on function public.warehouse_intake_v1(
  text, text, text, text, uuid, uuid, uuid, jsonb, jsonb
) from public, anon, authenticated;
grant execute on function public.warehouse_intake_v1(
  text, text, text, text, uuid, uuid, uuid, jsonb, jsonb
) to service_role;

notify pgrst, 'reload schema';

commit;
