-- Fingerprinting V1.1 admin RPCs for bindings and provenance events.

-- Upsert binding on (user_id, fingerprint_key)
create or replace function public.admin_fingerprint_bind_v1(
  p_user_id uuid,
  p_fingerprint_key text,
  p_vault_item_id uuid,
  p_snapshot_id uuid,
  p_analysis_key text
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.fingerprint_bindings (
    user_id,
    fingerprint_key,
    vault_item_id,
    snapshot_id,
    analysis_key
  ) values (
    p_user_id,
    p_fingerprint_key,
    p_vault_item_id,
    p_snapshot_id,
    p_analysis_key
  )
  on conflict (user_id, fingerprint_key) do update
    set vault_item_id = excluded.vault_item_id,
        snapshot_id   = excluded.snapshot_id,
        analysis_key  = excluded.analysis_key,
        last_seen_at  = now();
end;
$$;

revoke all on function public.admin_fingerprint_bind_v1(
  uuid, text, uuid, uuid, text
) from public, anon, authenticated;

grant execute on function public.admin_fingerprint_bind_v1(
  uuid, text, uuid, uuid, text
) to service_role;

-- Insert provenance event (append-only, idempotent via unique constraint)
create or replace function public.admin_fingerprint_event_insert_v1(
  p_user_id uuid,
  p_analysis_key text,
  p_event_type text,
  p_snapshot_id uuid,
  p_fingerprint_key text default null,
  p_vault_item_id uuid default null,
  p_event_metadata jsonb default '{}'::jsonb
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.fingerprint_provenance_events (
    user_id,
    vault_item_id,
    snapshot_id,
    analysis_key,
    fingerprint_key,
    event_type,
    event_metadata
  ) values (
    p_user_id,
    p_vault_item_id,
    p_snapshot_id,
    p_analysis_key,
    p_fingerprint_key,
    p_event_type,
    coalesce(p_event_metadata, '{}'::jsonb)
  )
  on conflict (user_id, analysis_key, event_type) do nothing;
end;
$$;

revoke all on function public.admin_fingerprint_event_insert_v1(
  uuid, text, text, uuid, text, uuid, jsonb
) from public, anon, authenticated;

grant execute on function public.admin_fingerprint_event_insert_v1(
  uuid, text, text, uuid, text, uuid, jsonb
) to service_role;
