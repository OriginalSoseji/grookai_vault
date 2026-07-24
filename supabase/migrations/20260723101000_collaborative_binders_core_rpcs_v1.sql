begin;

-- Guarded user mutation entrypoints for Binder identity, policy, lifecycle,
-- exact-copy contributions, invitations, and view-only links.

create or replace function public.binder_audience_rank_v1(p_scope text)
returns integer
language sql
immutable
set search_path = pg_catalog
as $$
  select case lower(btrim(coalesce(p_scope, '')))
    when 'none' then 0
    when 'link' then 1
    when 'public' then 2
    else -1
  end;
$$;

create or replace function public.binder_token_v1()
returns text
language sql
volatile
set search_path = public, extensions, pg_catalog
as $$
  select translate(
    encode(extensions.gen_random_bytes(32), 'base64'),
    '+/=',
    '-_'
  );
$$;

create or replace function public.binder_token_hash_v1(p_token text)
returns bytea
language sql
immutable
set search_path = public, extensions, pg_catalog
as $$
  select extensions.digest(
    convert_to(coalesce(p_token, ''), 'UTF8'),
    'sha256'
  );
$$;

create or replace function public.binder_card_has_hosted_canonical_image_v1(
  p_card_print_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.card_prints cp
    where cp.id = p_card_print_id
      and lower(btrim(coalesce(cp.image_source, ''))) = 'identity'
      and nullif(btrim(cp.image_path), '') is not null
      and nullif(btrim(cp.gv_id), '') is not null
  );
$$;

create or replace function public.binder_cover_card_matches_v1(
  p_binder_id uuid,
  p_card_print_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    p_card_print_id is not null
    and exists (
      select 1
      from public.binders b
      where b.id = p_binder_id
        and (
          (
            b.target_kind = 'species'
            and b.checklist_mode = 'card_prints'
            and exists (
              select 1
              from public.card_print_species cps
              where cps.species_id = b.species_id
                and cps.card_print_id = p_card_print_id
                and cps.active is true
                and cps.counts_for_completion is true
            )
          )
          or (
            b.target_kind = 'custom'
            and public.binder_card_has_hosted_canonical_image_v1(
              p_card_print_id
            )
            and exists (
              select 1
              from public.binder_custom_slots slot
              where slot.binder_id = b.id
                and slot.definition_revision = b.definition_revision
                and slot.active is true
                and slot.card_print_id = p_card_print_id
            )
          )
          or (
            b.target_kind = 'set'
            and public.binder_contribution_matches_v1(
              b.id,
              p_card_print_id,
              null
            )
          )
        )
    );
$$;

create or replace function public.binder_internal_create_v1(
  p_owner_user_id uuid,
  p_title text,
  p_target_kind text,
  p_checklist_mode text,
  p_description text default null,
  p_species_id uuid default null,
  p_set_id uuid default null,
  p_cover_card_print_id uuid default null,
  p_custom_slots jsonb default '[]'::jsonb,
  p_legacy_watch_id uuid default null
)
returns public.binders
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_target_kind text := lower(btrim(coalesce(p_target_kind, '')));
  v_mode text := lower(btrim(coalesce(p_checklist_mode, '')));
  v_binder public.binders%rowtype;
  v_revision_id uuid;
  v_slot jsonb;
  v_position integer := 0;
  v_card_print_id uuid;
  v_card_printing_id uuid;
  v_required_quantity integer;
  v_total_required_quantity integer := 0;
begin
  if p_owner_user_id is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  if not public.binder_feature_enabled_v1('schema_internal') then
    raise exception 'feature_disabled' using errcode = 'P0001';
  end if;

  if btrim(coalesce(p_title, '')) = ''
     or char_length(btrim(p_title)) > 80
     or not public.binder_text_safe_v1(btrim(p_title), false) then
    raise exception 'invalid_title' using errcode = '22023';
  end if;

  if p_description is not null
     and (
       char_length(p_description) > 1000
       or not public.binder_text_safe_v1(p_description, true)
     ) then
    raise exception 'invalid_description' using errcode = '22023';
  end if;

  if v_target_kind = 'species' then
    if not public.binder_feature_enabled_v1('personal') then
      raise exception 'feature_disabled' using errcode = 'P0001';
    end if;
    if v_mode <> 'card_prints' then
      raise exception 'invalid_target' using errcode = '22023';
    end if;
    if p_species_id is null or not exists (
      select 1
      from public.pokemon_species
      where id = p_species_id and active is true
    ) then
      raise exception 'invalid_target' using errcode = '22023';
    end if;
    if p_set_id is not null or coalesce(jsonb_array_length(coalesce(p_custom_slots, '[]'::jsonb)), 0) <> 0 then
      raise exception 'invalid_target' using errcode = '22023';
    end if;
  elsif v_target_kind = 'set' then
    if not public.binder_feature_enabled_v1('set_binders')
       or to_regprocedure('public.binder_set_slots_authority_v1(uuid)') is null then
      raise exception 'set_binders_disabled' using errcode = 'P0001';
    end if;
    if v_mode <> 'master_set'
       or p_set_id is null
       or not exists (select 1 from public.sets where id = p_set_id)
       or p_species_id is not null then
      raise exception 'invalid_target' using errcode = '22023';
    end if;
  elsif v_target_kind = 'custom' then
    if not public.binder_feature_enabled_v1('custom') then
      raise exception 'feature_disabled' using errcode = 'P0001';
    end if;
    if v_mode <> 'custom'
       or p_species_id is not null
       or p_set_id is not null
       or jsonb_typeof(coalesce(p_custom_slots, '[]'::jsonb)) <> 'array'
       or jsonb_array_length(coalesce(p_custom_slots, '[]'::jsonb)) < 1
       or jsonb_array_length(coalesce(p_custom_slots, '[]'::jsonb)) > 1000 then
      raise exception 'invalid_target' using errcode = '22023';
    end if;
  else
    raise exception 'invalid_target' using errcode = '22023';
  end if;

  perform public.binder_advisory_lock_v1('binder:owner-capacity:' || p_owner_user_id::text);
  perform public.binder_advisory_lock_v1('binder:membership-user:' || p_owner_user_id::text);
  if (
    select count(*)
    from public.binders
    where owner_user_id = p_owner_user_id
      and lifecycle in ('active', 'archived')
  ) >= 20 then
    raise exception 'capacity' using errcode = 'P0001';
  end if;
  if (
    select count(*)
    from public.binder_members
    where user_id = p_owner_user_id
      and state in ('active', 'suspended')
  ) >= 100 then
    raise exception 'capacity' using errcode = 'P0001';
  end if;

  insert into public.binders (
    owner_user_id,
    title,
    description,
    target_kind,
    species_id,
    set_id,
    checklist_mode,
    cover_card_print_id,
    legacy_watch_id
  ) values (
    p_owner_user_id,
    btrim(p_title),
    nullif(p_description, ''),
    v_target_kind,
    p_species_id,
    p_set_id,
    v_mode,
    p_cover_card_print_id,
    p_legacy_watch_id
  )
  returning * into v_binder;

  insert into public.binder_members (
    binder_id,
    user_id,
    role,
    state,
    membership_epoch,
    joined_at
  ) values (
    v_binder.id,
    p_owner_user_id,
    'owner',
    'active',
    1,
    now()
  );

  if v_target_kind = 'custom' then
    insert into public.binder_custom_revisions (
      binder_id,
      revision,
      created_by_user_id
    ) values (
      v_binder.id,
      1,
      p_owner_user_id
    )
    returning id into v_revision_id;

    for v_slot in
      select value
      from jsonb_array_elements(p_custom_slots)
    loop
      begin
        v_card_print_id := nullif(v_slot ->> 'card_print_id', '')::uuid;
        v_card_printing_id := nullif(v_slot ->> 'card_printing_id', '')::uuid;
        v_required_quantity := coalesce((v_slot ->> 'required_quantity')::integer, 1);
      exception when others then
        raise exception 'invalid_custom_slot' using errcode = '22023';
      end;

      if v_card_print_id is null
         or v_required_quantity not between 1 and 100
         or not exists (select 1 from public.card_prints where id = v_card_print_id)
         or (
           v_card_printing_id is not null
           and not exists (
             select 1
             from public.card_printings
             where id = v_card_printing_id
               and card_print_id = v_card_print_id
           )
         ) then
        raise exception 'invalid_custom_slot' using errcode = '22023';
      end if;
      v_total_required_quantity :=
        v_total_required_quantity + v_required_quantity;
      if v_total_required_quantity > 25000 then
        raise exception 'custom_copy_capacity_exceeded' using errcode = '22023';
      end if;

      insert into public.binder_custom_slots (
        revision_id,
        binder_id,
        definition_revision,
        card_print_id,
        card_printing_id,
        position,
        required_quantity
      ) values (
        v_revision_id,
        v_binder.id,
        1,
        v_card_print_id,
        v_card_printing_id,
        v_position,
        v_required_quantity
      );
      v_position := v_position + 1;
    end loop;
  end if;

  if p_cover_card_print_id is not null
     and not public.binder_cover_card_matches_v1(
       v_binder.id,
       p_cover_card_print_id
     ) then
    raise exception 'invalid_cover' using errcode = '22023';
  end if;

  if p_cover_card_print_id is not null
     and v_binder.read_access = 'public'
     and v_binder.discoverability = 'listed'
     and not public.binder_card_has_hosted_canonical_image_v1(
       p_cover_card_print_id
     ) then
    raise exception 'hosted_cover_required' using errcode = '22023';
  end if;

  perform public.binder_progress_recalculate_v1(
    p_binder_id => v_binder.id,
    p_actor_kind => 'user',
    p_actor_user_id => p_owner_user_id
  );

  return v_binder;
end;
$$;

create or replace function public.binder_resolve_owned_instance_v1(
  p_user_id uuid,
  p_vault_item_instance_id uuid,
  p_lock boolean default false
)
returns table (
  vault_item_instance_id uuid,
  gv_vi_id text,
  card_print_id uuid,
  card_printing_id uuid,
  created_at timestamptz
)
language plpgsql
volatile
security definer
set search_path = public
as $$
begin
  if p_lock then
    perform 1
    from public.vault_item_instances
    where id = p_vault_item_instance_id
    for update;
  end if;

  return query
  select
    vii.id,
    vii.gv_vi_id,
    coalesce(vii.card_print_id, slab.card_print_id),
    vii.card_printing_id,
    vii.created_at
  from public.vault_item_instances vii
  left join public.slab_certs slab
    on slab.id = vii.slab_cert_id
  where vii.id = p_vault_item_instance_id
    and vii.user_id = p_user_id
    and vii.archived_at is null
    and public.binder_gvvi_valid_v1(vii.user_id, vii.gv_vi_id)
    and coalesce(vii.card_print_id, slab.card_print_id) is not null
    and (
      vii.card_printing_id is null
      or exists (
        select 1
        from public.card_printings printing
        where printing.id = vii.card_printing_id
          and printing.card_print_id = coalesce(vii.card_print_id, slab.card_print_id)
      )
    );
end;
$$;

create or replace function public.binder_internal_add_contribution_v1(
  p_actor_user_id uuid,
  p_binder_id uuid,
  p_vault_item_instance_id uuid,
  p_source text,
  p_defer_recalculation boolean default false
)
returns public.binder_contributions
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_binder public.binders%rowtype;
  v_member public.binder_members%rowtype;
  v_instance record;
  v_state text;
  v_contribution public.binder_contributions%rowtype;
  v_event_type text;
begin
  if not public.binder_feature_enabled_v1('schema_internal') then
    raise exception 'feature_disabled' using errcode = 'P0001';
  end if;

  select * into v_binder
  from public.binders
  where id = p_binder_id
  for update;

  if not found
     or v_binder.lifecycle <> 'active'
     or v_binder.moderation_state in ('frozen', 'removed') then
    raise exception 'unavailable' using errcode = 'P0001';
  end if;

  select * into v_member
  from public.binder_members
  where binder_id = p_binder_id
    and user_id = p_actor_user_id
    and state = 'active'
  for update;

  if not found or v_member.role = 'viewer' then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  if public.binder_pair_blocked_v1(p_actor_user_id, v_binder.owner_user_id) then
    raise exception 'unavailable' using errcode = 'P0001';
  end if;

  if v_binder.contribution_policy = 'owner_only'
     and v_member.role <> 'owner' then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  select * into v_instance
  from public.binder_resolve_owned_instance_v1(
    p_user_id => p_actor_user_id,
    p_vault_item_instance_id => p_vault_item_instance_id,
    p_lock => true
  );

  if not found then
    raise exception 'conflict' using errcode = 'P0001';
  end if;

  if not public.binder_contribution_matches_v1(
    p_binder_id,
    v_instance.card_print_id,
    v_instance.card_printing_id
  ) then
    raise exception 'invalid_target' using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from public.binder_contributions
    where binder_id = p_binder_id
      and vault_item_instance_id = p_vault_item_instance_id
      and state in ('pending', 'active')
  ) then
    raise exception 'conflict' using errcode = 'P0001';
  end if;

  if (
    select count(*)
    from public.binder_contributions
    where binder_id = p_binder_id
      and state in ('pending', 'active')
  ) >= 25000 then
    raise exception 'capacity' using errcode = 'P0001';
  end if;

  if (
    select count(*)
    from public.binder_contributions
    where vault_item_instance_id = p_vault_item_instance_id
      and state in ('pending', 'active')
  ) >= 20 then
    raise exception 'capacity' using errcode = 'P0001';
  end if;

  v_state := case
    when v_binder.contribution_policy = 'approval_required'
      and v_member.role <> 'owner'
      then 'pending'
    else 'active'
  end;
  v_event_type := case when v_state = 'active'
    then 'contribution_added'
    else 'contribution_submitted'
  end;

  insert into public.binder_contributions (
    binder_id,
    contributor_member_id,
    contributor_user_id,
    contributor_membership_epoch,
    vault_item_instance_id,
    state,
    snapshot_gv_vi_id,
    snapshot_card_print_id,
    snapshot_card_printing_id,
    source,
    added_by_user_id,
    activated_at
  ) values (
    p_binder_id,
    v_member.id,
    p_actor_user_id,
    v_member.membership_epoch,
    p_vault_item_instance_id,
    v_state,
    v_instance.gv_vi_id,
    v_instance.card_print_id,
    v_instance.card_printing_id,
    lower(btrim(coalesce(p_source, 'manual'))),
    p_actor_user_id,
    case when v_state = 'active' then now() else null end
  )
  returning * into v_contribution;

  perform public.binder_append_activity_v1(
    p_binder_id => p_binder_id,
    p_event_type => v_event_type,
    p_actor_kind => 'user',
    p_actor_user_id => p_actor_user_id,
    p_subject_member_id => v_member.id,
    p_contribution_id => v_contribution.id,
    p_payload => jsonb_build_object(
      'state', v_state,
      'card_print_id', v_instance.card_print_id,
      'card_printing_id', v_instance.card_printing_id
    )
  );

  if v_state = 'active' and not coalesce(p_defer_recalculation, false) then
    perform public.binder_progress_recalculate_v1(
      p_binder_id => p_binder_id,
      p_actor_kind => 'user',
      p_actor_user_id => p_actor_user_id
    );
  end if;

  return v_contribution;
end;
$$;

create or replace function public.binder_create_v1(
  p_title text,
  p_target_kind text,
  p_checklist_mode text,
  p_idempotency_key text,
  p_description text default null,
  p_species_id uuid default null,
  p_set_id uuid default null,
  p_cover_card_print_id uuid default null,
  p_custom_slots jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_uid uuid := public.binder_require_user_v1();
  v_actor_key text := 'user:' || v_uid::text;
  v_cached jsonb;
  v_binder public.binders%rowtype;
  v_event_id uuid;
  v_response jsonb;
begin
  v_cached := public.binder_idempotency_get_v1(v_actor_key, 'binder_create_v1', p_idempotency_key);
  if v_cached is not null then return v_cached; end if;

  perform public.binder_rate_limit_assert_v1(v_uid, null, 'binder_create', 10, 20);

  v_binder := public.binder_internal_create_v1(
    p_owner_user_id => v_uid,
    p_title => p_title,
    p_target_kind => p_target_kind,
    p_checklist_mode => p_checklist_mode,
    p_description => p_description,
    p_species_id => p_species_id,
    p_set_id => p_set_id,
    p_cover_card_print_id => p_cover_card_print_id,
    p_custom_slots => p_custom_slots
  );

  v_event_id := public.binder_append_activity_v1(
    p_binder_id => v_binder.id,
    p_event_type => 'binder_created',
    p_actor_kind => 'user',
    p_actor_user_id => v_uid,
    p_payload => jsonb_build_object(
      'target_kind', v_binder.target_kind,
      'checklist_mode', v_binder.checklist_mode
    )
  );

  v_response := jsonb_build_object(
    'ok', true,
    'binder_public_id', v_binder.public_id,
    'event_id', v_event_id
  );
  return public.binder_idempotency_store_v1(
    v_actor_key, v_uid, 'binder_create_v1', p_idempotency_key, v_binder.id, v_response
  );
end;
$$;

create or replace function public.binder_update_metadata_v1(
  p_public_id uuid,
  p_title text,
  p_description text,
  p_cover_card_print_id uuid,
  p_idempotency_key text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_uid uuid := public.binder_require_user_v1();
  v_actor_key text := 'user:' || v_uid::text;
  v_cached jsonb;
  v_binder public.binders%rowtype;
  v_member public.binder_members%rowtype;
  v_event_id uuid;
  v_response jsonb;
begin
  v_cached := public.binder_idempotency_get_v1(v_actor_key, 'binder_update_metadata_v1', p_idempotency_key);
  if v_cached is not null then return v_cached; end if;
  if not public.binder_feature_enabled_v1('schema_internal') then
    raise exception 'feature_disabled' using errcode = 'P0001';
  end if;

  select * into v_binder
  from public.binders
  where public_id = p_public_id
  for update;

  if not found
     or v_binder.lifecycle <> 'active'
     or v_binder.moderation_state in ('frozen', 'removed') then
    raise exception 'unavailable' using errcode = 'P0001';
  end if;

  select * into v_member
  from public.binder_members
  where binder_id = v_binder.id
    and user_id = v_uid
    and state = 'active';

  if not found or v_member.role not in ('owner', 'manager') then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  if btrim(coalesce(p_title, '')) = ''
     or char_length(btrim(p_title)) > 80
     or not public.binder_text_safe_v1(btrim(p_title), false)
     or (
       p_description is not null
       and (
         char_length(p_description) > 1000
         or not public.binder_text_safe_v1(p_description, true)
       )
     ) then
    raise exception 'invalid_metadata' using errcode = '22023';
  end if;

  if p_cover_card_print_id is not null
     and not public.binder_cover_card_matches_v1(
       v_binder.id,
       p_cover_card_print_id
     ) then
    raise exception 'invalid_cover' using errcode = '22023';
  end if;

  if p_cover_card_print_id is not null
     and v_binder.read_access = 'public'
     and v_binder.discoverability = 'listed'
     and not public.binder_card_has_hosted_canonical_image_v1(
       p_cover_card_print_id
     ) then
    raise exception 'hosted_cover_required' using errcode = '22023';
  end if;

  update public.binders
  set
    title = btrim(p_title),
    description = nullif(p_description, ''),
    -- Required nullable input is authoritative: null explicitly clears.
    cover_card_print_id = p_cover_card_print_id
  where id = v_binder.id;

  v_event_id := public.binder_append_activity_v1(
    p_binder_id => v_binder.id,
    p_event_type => 'metadata_updated',
    p_actor_kind => 'user',
    p_actor_user_id => v_uid,
    p_payload => jsonb_build_object(
      'cover_changed',
      p_cover_card_print_id is distinct from v_binder.cover_card_print_id
    )
  );

  v_response := jsonb_build_object(
    'ok', true,
    'binder_public_id', p_public_id,
    'event_id', v_event_id
  );
  return public.binder_idempotency_store_v1(
    v_actor_key, v_uid, 'binder_update_metadata_v1', p_idempotency_key, v_binder.id, v_response
  );
end;
$$;

create or replace function public.binder_update_policy_v1(
  p_public_id uuid,
  p_read_access text,
  p_discoverability text,
  p_join_policy text,
  p_contribution_policy text,
  p_idempotency_key text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_uid uuid := public.binder_require_user_v1();
  v_actor_key text := 'user:' || v_uid::text;
  v_cached jsonb;
  v_binder public.binders%rowtype;
  v_read text := lower(btrim(coalesce(p_read_access, '')));
  v_discovery text := lower(btrim(coalesce(p_discoverability, '')));
  v_join text := lower(btrim(coalesce(p_join_policy, '')));
  v_contribution text := lower(btrim(coalesce(p_contribution_policy, '')));
  v_broadened boolean := false;
  v_cover_cleared boolean := false;
  v_contribution_row public.binder_contributions%rowtype;
  v_invitation public.binder_invitations%rowtype;
  v_request public.binder_join_requests%rowtype;
  v_link public.binder_view_links%rowtype;
  v_event_id uuid;
  v_response jsonb;
begin
  v_cached := public.binder_idempotency_get_v1(v_actor_key, 'binder_update_policy_v1', p_idempotency_key);
  if v_cached is not null then return v_cached; end if;
  if not public.binder_feature_enabled_v1('schema_internal') then
    raise exception 'feature_disabled' using errcode = 'P0001';
  end if;

  select * into v_binder
  from public.binders
  where public_id = p_public_id
  for update;

  if not found
     or v_binder.lifecycle <> 'active'
     or v_binder.moderation_state in ('frozen', 'removed')
     or v_binder.owner_user_id <> v_uid then
    raise exception 'unavailable' using errcode = 'P0001';
  end if;

  if v_read not in ('private', 'link', 'public')
     or v_discovery not in ('unlisted', 'listed')
     or v_join not in ('closed', 'invite_only', 'request_to_join')
     or v_contribution not in ('owner_only', 'members_direct', 'approval_required')
     or (v_read <> 'public' and v_discovery <> 'unlisted')
     or (
       v_join = 'request_to_join'
       and not (
         v_read = 'public'
         and v_discovery = 'listed'
         and v_contribution = 'approval_required'
       )
     ) then
    raise exception 'invalid_policy' using errcode = '22023';
  end if;

  if (v_join <> 'closed' or v_contribution <> 'owner_only')
     and not public.binder_feature_enabled_v1('shared') then
    raise exception 'feature_disabled' using errcode = 'P0001';
  end if;
  if v_read = 'link' and not public.binder_feature_enabled_v1('view_links') then
    raise exception 'feature_disabled' using errcode = 'P0001';
  end if;
  if v_read = 'public' and not public.binder_feature_enabled_v1('public') then
    raise exception 'feature_disabled' using errcode = 'P0001';
  end if;
  if v_join = 'request_to_join' and not public.binder_feature_enabled_v1('community') then
    raise exception 'feature_disabled' using errcode = 'P0001';
  end if;

  v_broadened :=
    (v_binder.read_access = 'private' and v_read in ('link', 'public'))
    or (v_binder.read_access = 'link' and v_read = 'public')
    or (v_binder.discoverability = 'unlisted' and v_discovery = 'listed');
  v_cover_cleared :=
    v_read = 'public'
    and v_discovery = 'listed'
    and v_binder.cover_card_print_id is not null
    and not public.binder_card_has_hosted_canonical_image_v1(
      v_binder.cover_card_print_id
    );

  if v_contribution = 'owner_only'
     and v_contribution is distinct from v_binder.contribution_policy then
    for v_contribution_row in
      select *
      from public.binder_contributions
      where binder_id = v_binder.id
        and state = 'pending'
        and contributor_user_id <> v_binder.owner_user_id
      for update
    loop
      update public.binder_contributions
      set
        state = 'rejected',
        decided_by_user_id = v_uid,
        terminal_by_user_id = v_uid,
        decided_at = now(),
        terminal_at = now()
      where id = v_contribution_row.id;

      perform public.binder_append_activity_v1(
        p_binder_id => v_binder.id,
        p_event_type => 'contribution_rejected',
        p_actor_kind => 'user',
        p_actor_user_id => v_uid,
        p_subject_member_id => v_contribution_row.contributor_member_id,
        p_contribution_id => v_contribution_row.id,
        p_payload => jsonb_build_object('reason', 'policy_changed')
      );
    end loop;
  end if;

  if v_join <> 'invite_only' then
    for v_invitation in
      select *
      from public.binder_invitations
      where binder_id = v_binder.id and status = 'pending'
      for update
    loop
      update public.binder_invitations
      set status = 'revoked', responded_at = now(), revoked_at = now()
      where id = v_invitation.id;
      perform public.binder_append_activity_v1(
        p_binder_id => v_binder.id,
        p_event_type => 'invitation_revoked',
        p_actor_kind => 'user',
        p_actor_user_id => v_uid,
        p_payload => jsonb_build_object('reason', 'join_policy_changed')
      );
    end loop;
  end if;

  if v_join <> 'request_to_join' then
    for v_request in
      select *
      from public.binder_join_requests
      where binder_id = v_binder.id and status = 'pending'
      for update
    loop
      update public.binder_join_requests
      set status = 'rejected', decision_user_id = v_uid, responded_at = now()
      where id = v_request.id;
      perform public.binder_append_activity_v1(
        p_binder_id => v_binder.id,
        p_event_type => 'join_request_rejected',
        p_actor_kind => 'user',
        p_actor_user_id => v_uid,
        p_payload => jsonb_build_object('reason', 'join_policy_changed')
      );
    end loop;
  end if;

  if v_read = 'private' then
    for v_link in
      select *
      from public.binder_view_links
      where binder_id = v_binder.id and status = 'active'
      for update
    loop
      update public.binder_view_links
      set status = 'revoked', revoked_at = now()
      where id = v_link.id;
      perform public.binder_append_activity_v1(
        p_binder_id => v_binder.id,
        p_event_type => 'view_link_revoked',
        p_actor_kind => 'user',
        p_actor_user_id => v_uid,
        p_payload => jsonb_build_object('reason', 'read_access_changed')
      );
    end loop;
  end if;

  update public.binders
  set
    read_access = v_read,
    discoverability = v_discovery,
    join_policy = v_join,
    contribution_policy = v_contribution,
    cover_card_print_id = case
      when v_cover_cleared then null
      else cover_card_print_id
    end,
    external_projection_revision = external_projection_revision + case when v_broadened then 1 else 0 end
  where id = v_binder.id
  returning * into v_binder;

  perform public.binder_progress_recalculate_v1(
    p_binder_id => v_binder.id,
    p_actor_kind => 'user',
    p_actor_user_id => v_uid
  );

  v_event_id := public.binder_append_activity_v1(
    p_binder_id => v_binder.id,
    p_event_type => 'policy_updated',
    p_actor_kind => 'user',
    p_actor_user_id => v_uid,
    p_payload => jsonb_build_object(
      'read_access', v_read,
      'discoverability', v_discovery,
      'join_policy', v_join,
      'contribution_policy', v_contribution,
      'cover_cleared', v_cover_cleared,
      'external_projection_revision', v_binder.external_projection_revision
    )
  );

  v_response := jsonb_build_object(
    'ok', true,
    'binder_public_id', p_public_id,
    'event_id', v_event_id,
    'external_projection_revision', v_binder.external_projection_revision
  );
  return public.binder_idempotency_store_v1(
    v_actor_key, v_uid, 'binder_update_policy_v1', p_idempotency_key, v_binder.id, v_response
  );
end;
$$;

create or replace function public.binder_set_lifecycle_v1(
  p_public_id uuid,
  p_lifecycle text,
  p_idempotency_key text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_uid uuid := public.binder_require_user_v1();
  v_actor_key text := 'user:' || v_uid::text;
  v_cached jsonb;
  v_binder public.binders%rowtype;
  v_next text := lower(btrim(coalesce(p_lifecycle, '')));
  v_member public.binder_members%rowtype;
  v_contribution public.binder_contributions%rowtype;
  v_invitation public.binder_invitations%rowtype;
  v_link public.binder_view_links%rowtype;
  v_offer public.binder_owner_transfer_offers%rowtype;
  v_current_gvvi text;
  v_current_card_print_id uuid;
  v_current_card_printing_id uuid;
  v_instance_found boolean;
  v_closed integer;
  v_event_id uuid;
  v_response jsonb;
begin
  v_cached := public.binder_idempotency_get_v1(v_actor_key, 'binder_set_lifecycle_v1', p_idempotency_key);
  if v_cached is not null then return v_cached; end if;
  if not public.binder_feature_enabled_v1('schema_internal') then
    raise exception 'feature_disabled' using errcode = 'P0001';
  end if;

  select * into v_binder
  from public.binders
  where public_id = p_public_id
  for update;

  if not found
     or v_binder.owner_user_id <> v_uid
     or v_binder.lifecycle = 'deleted_tombstone'
     or v_binder.moderation_state in ('frozen', 'removed')
     or v_next not in ('active', 'archived') then
    raise exception 'unavailable' using errcode = 'P0001';
  end if;

  if v_next = v_binder.lifecycle then
    raise exception 'conflict' using errcode = 'P0001';
  end if;

  if v_next = 'active' then
    if (
         v_binder.target_kind = 'species'
         and not public.binder_feature_enabled_v1('personal')
       )
       or (
         v_binder.target_kind = 'custom'
         and not public.binder_feature_enabled_v1('custom')
       )
       or not exists (
         select 1
         from public.binder_members
         where binder_id = v_binder.id
           and user_id = v_uid
           and role = 'owner'
           and state = 'active'
       )
       or (v_binder.target_kind = 'species' and not exists (
         select 1 from public.pokemon_species
         where id = v_binder.species_id and active is true
       ))
       or (v_binder.target_kind = 'set' and (
         not public.binder_feature_enabled_v1('set_binders')
         or to_regprocedure('public.binder_set_slots_authority_v1(uuid)') is null
       )) then
      raise exception 'conflict' using errcode = 'P0001';
    end if;

    if (
      (v_binder.join_policy <> 'closed' or v_binder.contribution_policy <> 'owner_only')
      and not public.binder_feature_enabled_v1('shared')
    ) or (
      v_binder.read_access = 'link'
      and not public.binder_feature_enabled_v1('view_links')
    ) or (
      v_binder.read_access = 'public'
      and not public.binder_feature_enabled_v1('public')
    ) or (
      v_binder.join_policy = 'request_to_join'
      and not public.binder_feature_enabled_v1('community')
    ) then
      raise exception 'feature_disabled' using errcode = 'P0001';
    end if;

    -- Repair legacy/pre-trigger Owner↔member blocks before collaboration
    -- resumes. The member's Vault rows remain untouched.
    for v_member in
      select *
      from public.binder_members
      where binder_id = v_binder.id
        and state in ('active', 'suspended')
        and role <> 'owner'
        and public.binder_pair_blocked_v1(user_id, v_binder.owner_user_id)
      for update
    loop
      v_closed := public.binder_close_member_contributions_v1(
        v_member.id,
        'invalidated',
        'rejected',
        'restore_block_revalidation',
        'user',
        v_uid
      );
      update public.binder_members
      set
        state = 'removed',
        ended_at = now(),
        suspended_at = null,
        content_scope = 'none',
        content_consent_epoch = null,
        content_consent_revision = null,
        identity_scope = 'none',
        identity_consent_epoch = null,
        identity_consent_revision = null
      where id = v_member.id;
      perform public.binder_append_activity_v1(
        p_binder_id => v_binder.id,
        p_event_type => 'member_removed',
        p_actor_kind => 'user',
        p_actor_user_id => v_uid,
        p_subject_member_id => v_member.id,
        p_payload => jsonb_build_object(
          'reason', 'restore_block_revalidation',
          'closed_contribution_count', v_closed
        )
      );
    end loop;

    if (
      select count(*)
      from public.binder_members
      where binder_id = v_binder.id and state in ('active', 'suspended')
    ) > 50 or exists (
      select 1
      from public.binder_members member_cap
      where member_cap.binder_id = v_binder.id
        and member_cap.state in ('active', 'suspended')
        and (
          member_cap.user_id is null
          or (
            select count(*)
            from public.binder_members account_membership
            where account_membership.user_id = member_cap.user_id
              and account_membership.state in ('active', 'suspended')
          ) > 100
        )
    ) then
      raise exception 'capacity' using errcode = 'P0001';
    end if;

    for v_contribution in
      select *
      from public.binder_contributions
      where binder_id = v_binder.id
        and state in ('pending', 'active')
      for update
    loop
      v_current_gvvi := null;
      v_current_card_print_id := null;
      v_current_card_printing_id := null;
      select
        resolved.gv_vi_id,
        resolved.card_print_id,
        resolved.card_printing_id
      into
        v_current_gvvi,
        v_current_card_print_id,
        v_current_card_printing_id
      from public.binder_resolve_owned_instance_v1(
        v_contribution.contributor_user_id,
        v_contribution.vault_item_instance_id,
        true
      ) resolved;
      v_instance_found := found;

      if not v_instance_found
         or not exists (
           select 1
           from public.binder_members contribution_member
           where contribution_member.id = v_contribution.contributor_member_id
             and contribution_member.state = 'active'
             and contribution_member.membership_epoch = v_contribution.contributor_membership_epoch
             and contribution_member.user_id = v_contribution.contributor_user_id
             and contribution_member.role <> 'viewer'
         )
         or v_current_gvvi <> v_contribution.snapshot_gv_vi_id
         or v_current_card_print_id <> v_contribution.snapshot_card_print_id
         or v_current_card_printing_id is distinct from v_contribution.snapshot_card_printing_id
         or not public.binder_contribution_matches_v1(
           v_binder.id,
           v_current_card_print_id,
           v_current_card_printing_id
         ) then
        update public.binder_contributions
        set
          state = 'invalidated',
          terminal_by_user_id = v_uid,
          terminal_at = now()
        where id = v_contribution.id;
        perform public.binder_append_activity_v1(
          p_binder_id => v_binder.id,
          p_event_type => 'contribution_invalidated',
          p_actor_kind => 'user',
          p_actor_user_id => v_uid,
          p_subject_member_id => v_contribution.contributor_member_id,
          p_contribution_id => v_contribution.id,
          p_payload => jsonb_build_object('reason', 'restore_revalidation_failed')
        );
      end if;
    end loop;

    for v_invitation in
      select *
      from public.binder_invitations
      where binder_id = v_binder.id
        and status = 'pending'
        and (
          expires_at <= now()
          or not exists (
            select 1
            from public.binder_members inviter
            where inviter.binder_id = v_binder.id
              and inviter.user_id = binder_invitations.inviter_user_id
              and inviter.state = 'active'
              and inviter.role in ('owner', 'manager')
              and (
                binder_invitations.max_role <> 'manager'
                or inviter.role = 'owner'
              )
          )
        )
      for update
    loop
      update public.binder_invitations
      set
        status = case when v_invitation.expires_at <= now() then 'expired' else 'revoked' end,
        responded_at = now(),
        revoked_at = case when v_invitation.expires_at > now() then now() else null end
      where id = v_invitation.id;
      perform public.binder_append_activity_v1(
        p_binder_id => v_binder.id,
        p_event_type => case when v_invitation.expires_at <= now()
          then 'invitation_expired' else 'invitation_revoked' end,
        p_actor_kind => 'user',
        p_actor_user_id => v_uid,
        p_payload => jsonb_build_object('reason', 'restore_revalidation')
      );
    end loop;

    for v_link in
      select *
      from public.binder_view_links
      where binder_id = v_binder.id
        and status = 'active'
        and expires_at is not null
        and expires_at <= now()
      for update
    loop
      update public.binder_view_links set status = 'expired'
      where id = v_link.id;
      perform public.binder_append_activity_v1(
        p_binder_id => v_binder.id,
        p_event_type => 'view_link_expired',
        p_actor_kind => 'user',
        p_actor_user_id => v_uid
      );
    end loop;

    for v_offer in
      select *
      from public.binder_owner_transfer_offers
      where binder_id = v_binder.id
        and status = 'pending'
        and expires_at <= now()
      for update
    loop
      update public.binder_owner_transfer_offers
      set status = 'expired', responded_at = now()
      where id = v_offer.id;
      perform public.binder_append_activity_v1(
        p_binder_id => v_binder.id,
        p_event_type => 'owner_transfer_expired',
        p_actor_kind => 'user',
        p_actor_user_id => v_uid,
        p_subject_member_id => v_offer.target_member_id
      );
    end loop;
  end if;

  update public.binders
  set
    lifecycle = v_next,
    archived_at = case when v_next = 'archived' then now() else null end,
    external_projection_revision = case
      when v_next = 'active' then external_projection_revision + 1
      else external_projection_revision
    end
  where id = v_binder.id;

  if v_next = 'active' then
    -- Restore never silently resumes a member's former external exposure.
    -- Every member must explicitly re-consent against the new projection.
    update public.binder_members
    set
      content_scope = 'none',
      content_consent_epoch = null,
      content_consent_revision = null,
      identity_scope = 'none',
      identity_consent_epoch = null,
      identity_consent_revision = null,
      updated_at = now()
    where binder_id = v_binder.id
      and state in ('active', 'suspended');
    perform public.binder_progress_recalculate_v1(
      p_binder_id => v_binder.id,
      p_actor_kind => 'user',
      p_actor_user_id => v_uid
    );
  end if;

  v_event_id := public.binder_append_activity_v1(
    p_binder_id => v_binder.id,
    p_event_type => case when v_next = 'archived' then 'binder_archived' else 'binder_restored' end,
    p_actor_kind => 'user',
    p_actor_user_id => v_uid
  );

  v_response := jsonb_build_object(
    'ok', true,
    'binder_public_id', p_public_id,
    'lifecycle', v_next,
    'event_id', v_event_id
  );
  return public.binder_idempotency_store_v1(
    v_actor_key, v_uid, 'binder_set_lifecycle_v1', p_idempotency_key, v_binder.id, v_response
  );
end;
$$;

create or replace function public.binder_delete_v1(
  p_public_id uuid,
  p_confirmation text,
  p_idempotency_key text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_uid uuid := public.binder_require_user_v1();
  v_actor_key text := 'user:' || v_uid::text;
  v_cached jsonb;
  v_binder public.binders%rowtype;
  v_contribution public.binder_contributions%rowtype;
  v_invitation public.binder_invitations%rowtype;
  v_link public.binder_view_links%rowtype;
  v_request public.binder_join_requests%rowtype;
  v_offer public.binder_owner_transfer_offers%rowtype;
  v_member public.binder_members%rowtype;
  v_event_id uuid;
  v_response jsonb;
begin
  v_cached := public.binder_idempotency_get_v1(v_actor_key, 'binder_delete_v1', p_idempotency_key);
  if v_cached is not null then return v_cached; end if;
  if not public.binder_feature_enabled_v1('schema_internal') then
    raise exception 'feature_disabled' using errcode = 'P0001';
  end if;

  select * into v_binder
  from public.binders
  where public_id = p_public_id
  for update;

  if not found
     or v_binder.owner_user_id <> v_uid
     or v_binder.lifecycle = 'deleted_tombstone'
     or v_binder.moderation_state in ('frozen', 'removed')
     or p_confirmation <> 'DELETE ' || v_binder.title then
    raise exception 'unavailable' using errcode = 'P0001';
  end if;

  for v_contribution in
    select *
    from public.binder_contributions
    where binder_id = v_binder.id
      and state in ('pending', 'active')
    for update
  loop
    update public.binder_contributions
    set
      state = 'invalidated',
      terminal_by_user_id = v_uid,
      terminal_at = now()
    where id = v_contribution.id;
    perform public.binder_append_activity_v1(
      p_binder_id => v_binder.id,
      p_event_type => 'contribution_invalidated',
      p_actor_kind => 'user',
      p_actor_user_id => v_uid,
      p_subject_member_id => v_contribution.contributor_member_id,
      p_contribution_id => v_contribution.id,
      p_payload => jsonb_build_object('reason', 'binder_deleted')
    );
  end loop;

  for v_invitation in
    select * from public.binder_invitations
    where binder_id = v_binder.id and status = 'pending'
    for update
  loop
    update public.binder_invitations
    set status = 'revoked', responded_at = now(), revoked_at = now()
    where id = v_invitation.id;
    perform public.binder_append_activity_v1(
      p_binder_id => v_binder.id,
      p_event_type => 'invitation_revoked',
      p_actor_kind => 'user',
      p_actor_user_id => v_uid,
      p_payload => jsonb_build_object('reason', 'binder_deleted')
    );
  end loop;

  for v_link in
    select * from public.binder_view_links
    where binder_id = v_binder.id and status = 'active'
    for update
  loop
    update public.binder_view_links
    set status = 'revoked', revoked_at = now()
    where id = v_link.id;
    perform public.binder_append_activity_v1(
      p_binder_id => v_binder.id,
      p_event_type => 'view_link_revoked',
      p_actor_kind => 'user',
      p_actor_user_id => v_uid,
      p_payload => jsonb_build_object('reason', 'binder_deleted')
    );
  end loop;

  for v_request in
    select * from public.binder_join_requests
    where binder_id = v_binder.id and status = 'pending'
    for update
  loop
    update public.binder_join_requests
    set status = 'rejected', decision_user_id = v_uid, responded_at = now()
    where id = v_request.id;
    perform public.binder_append_activity_v1(
      p_binder_id => v_binder.id,
      p_event_type => 'join_request_rejected',
      p_actor_kind => 'user',
      p_actor_user_id => v_uid,
      p_payload => jsonb_build_object('reason', 'binder_deleted')
    );
  end loop;

  for v_offer in
    select * from public.binder_owner_transfer_offers
    where binder_id = v_binder.id and status = 'pending'
    for update
  loop
    update public.binder_owner_transfer_offers
    set status = 'revoked', responded_at = now()
    where id = v_offer.id;
    perform public.binder_append_activity_v1(
      p_binder_id => v_binder.id,
      p_event_type => 'owner_transfer_revoked',
      p_actor_kind => 'user',
      p_actor_user_id => v_uid,
      p_subject_member_id => v_offer.target_member_id,
      p_payload => jsonb_build_object('reason', 'binder_deleted')
    );
  end loop;

  for v_member in
    select * from public.binder_members
    where binder_id = v_binder.id and state in ('active', 'suspended')
    for update
  loop
    update public.binder_members
    set
      state = 'removed',
      ended_at = now(),
      suspended_at = null,
      content_scope = 'none',
      content_consent_epoch = null,
      content_consent_revision = null,
      identity_scope = 'none',
      identity_consent_epoch = null,
      identity_consent_revision = null
    where id = v_member.id;
    perform public.binder_append_activity_v1(
      p_binder_id => v_binder.id,
      p_event_type => 'member_removed',
      p_actor_kind => 'user',
      p_actor_user_id => v_uid,
      p_subject_member_id => v_member.id,
      p_payload => jsonb_build_object('reason', 'binder_deleted', 'role', v_member.role)
    );
  end loop;

  update public.binders
  set
    lifecycle = 'deleted_tombstone',
    read_access = 'private',
    discoverability = 'unlisted',
    join_policy = 'closed',
    archived_at = null,
    deleted_at = now()
  where id = v_binder.id;

  perform public.binder_progress_recalculate_v1(
    p_binder_id => v_binder.id,
    p_actor_kind => 'user',
    p_actor_user_id => v_uid
  );

  v_event_id := public.binder_append_activity_v1(
    p_binder_id => v_binder.id,
    p_event_type => 'binder_deleted',
    p_actor_kind => 'user',
    p_actor_user_id => v_uid
  );

  v_response := jsonb_build_object(
    'ok', true,
    'binder_public_id', p_public_id,
    'lifecycle', 'deleted_tombstone',
    'event_id', v_event_id
  );
  return public.binder_idempotency_store_v1(
    v_actor_key, v_uid, 'binder_delete_v1', p_idempotency_key, v_binder.id, v_response
  );
end;
$$;

create or replace function public.binder_member_preferences_v1(
  p_public_id uuid,
  p_alias text,
  p_content_scope text,
  p_identity_scope text,
  p_notification_preference text,
  p_idempotency_key text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_uid uuid := public.binder_require_user_v1();
  v_actor_key text := 'user:' || v_uid::text;
  v_cached jsonb;
  v_binder public.binders%rowtype;
  v_member public.binder_members%rowtype;
  v_content text := lower(btrim(coalesce(p_content_scope, 'none')));
  v_identity text := lower(btrim(coalesce(p_identity_scope, 'none')));
  v_notification text := lower(btrim(coalesce(p_notification_preference, 'digest')));
  v_full_write boolean;
  v_privacy_only boolean;
  v_event_id uuid;
  v_response jsonb;
begin
  v_cached := public.binder_idempotency_get_v1(v_actor_key, 'binder_member_preferences_v1', p_idempotency_key);
  if v_cached is not null then return v_cached; end if;
  if not public.binder_feature_enabled_v1('schema_internal') then
    raise exception 'feature_disabled' using errcode = 'P0001';
  end if;

  select * into v_binder
  from public.binders
  where public_id = p_public_id
    and lifecycle in ('active', 'archived')
    and moderation_state <> 'removed'
  for update;
  if not found then raise exception 'unavailable' using errcode = 'P0001'; end if;

  select * into v_member
  from public.binder_members
    where binder_id = v_binder.id
      and user_id = v_uid
    and state in ('active', 'suspended')
  for update;
  if not found then raise exception 'unavailable' using errcode = 'P0001'; end if;

  if (p_alias is not null and (
      btrim(p_alias) = ''
      or char_length(btrim(p_alias)) > 40
      or not public.binder_text_safe_v1(btrim(p_alias), false)
    ))
    or public.binder_audience_rank_v1(v_content) < 0
    or public.binder_audience_rank_v1(v_identity) < 0
    or public.binder_audience_rank_v1(v_identity) > public.binder_audience_rank_v1(v_content)
    or v_notification not in ('immediate', 'digest', 'muted') then
    raise exception 'invalid_preferences' using errcode = '22023';
  end if;

  v_full_write :=
    v_member.state = 'active'
    and v_binder.lifecycle = 'active'
    and v_binder.moderation_state not in ('frozen', 'removed');
  v_privacy_only :=
    v_content = 'none'
    and v_identity = 'none'
    and (
      p_alias is null
      or nullif(btrim(p_alias), '') is not distinct from v_member.display_alias
    )
    and v_notification = v_member.notification_preference;
  if not v_full_write and not v_privacy_only then
    raise exception 'unavailable' using errcode = 'P0001';
  end if;

  update public.binder_members
  set
    display_alias = case
      when not v_full_write and p_alias is null then display_alias
      else nullif(btrim(p_alias), '')
    end,
    content_scope = v_content,
    content_consent_epoch = case when v_content = 'none' then null else membership_epoch end,
    content_consent_revision = case when v_content = 'none' then null else v_binder.external_projection_revision end,
    identity_scope = v_identity,
    identity_consent_epoch = case when v_identity = 'none' then null else membership_epoch end,
    identity_consent_revision = case when v_identity = 'none' then null else v_binder.external_projection_revision end,
    notification_preference = v_notification
  where id = v_member.id;

  perform public.binder_progress_recalculate_v1(
    p_binder_id => v_binder.id,
    p_actor_kind => 'user',
    p_actor_user_id => v_uid
  );

  v_event_id := public.binder_append_activity_v1(
    p_binder_id => v_binder.id,
    p_event_type => 'member_preferences_updated',
    p_actor_kind => 'user',
    p_actor_user_id => v_uid,
    p_subject_member_id => v_member.id,
    p_payload => jsonb_build_object(
      'content_scope', v_content,
      'identity_scope', v_identity,
      'notification_preference', v_notification,
      'alias_set', p_alias is not null,
      'privacy_withdrawal_only', not v_full_write
    )
  );

  v_response := jsonb_build_object(
    'ok', true,
    'binder_public_id', p_public_id,
    'content_scope', v_content,
    'identity_scope', v_identity,
    'notification_preference', v_notification,
    'privacy_withdrawal_only', not v_full_write,
    'event_id', v_event_id
  );
  return public.binder_idempotency_store_v1(
    v_actor_key, v_uid, 'binder_member_preferences_v1', p_idempotency_key, v_binder.id, v_response
  );
end;
$$;

create or replace function public.binder_contribution_add_v1(
  p_public_id uuid,
  p_vault_item_instance_id uuid,
  p_idempotency_key text,
  p_source text default 'manual'
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_uid uuid := public.binder_require_user_v1();
  v_actor_key text := 'user:' || v_uid::text;
  v_cached jsonb;
  v_binder_id uuid;
  v_contribution public.binder_contributions%rowtype;
  v_event_id uuid;
  v_response jsonb;
begin
  v_cached := public.binder_idempotency_get_v1(v_actor_key, 'binder_contribution_add_v1', p_idempotency_key);
  if v_cached is not null then return v_cached; end if;
  if lower(btrim(coalesce(p_source, 'manual'))) <> 'manual' then
    raise exception 'invalid_source' using errcode = '22023';
  end if;

  select id into v_binder_id
  from public.binders
  where public_id = p_public_id;
  if v_binder_id is null then raise exception 'unavailable' using errcode = 'P0001'; end if;

  perform public.binder_rate_limit_assert_v1(v_uid, v_binder_id, 'contribution_mutation', 120, null);
  v_contribution := public.binder_internal_add_contribution_v1(
    v_uid,
    v_binder_id,
    p_vault_item_instance_id,
    'manual'
  );

  select id into v_event_id
  from public.binder_activity_events
  where contribution_id = v_contribution.id
  order by created_at desc, id desc
  limit 1;

  v_response := jsonb_build_object(
    'ok', true,
    'binder_public_id', p_public_id,
    'contribution_id', v_contribution.id,
    'state', v_contribution.state,
    'event_id', v_event_id
  );
  return public.binder_idempotency_store_v1(
    v_actor_key, v_uid, 'binder_contribution_add_v1', p_idempotency_key, v_binder_id, v_response
  );
end;
$$;

create or replace function public.binder_contribution_withdraw_v1(
  p_contribution_id uuid,
  p_idempotency_key text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_uid uuid := public.binder_require_user_v1();
  v_actor_key text := 'user:' || v_uid::text;
  v_cached jsonb;
  v_binder_id uuid;
  v_contribution public.binder_contributions%rowtype;
  v_binder public.binders%rowtype;
  v_event_id uuid;
  v_response jsonb;
begin
  v_cached := public.binder_idempotency_get_v1(v_actor_key, 'binder_contribution_withdraw_v1', p_idempotency_key);
  if v_cached is not null then return v_cached; end if;

  select binder_id into v_binder_id
  from public.binder_contributions
  where id = p_contribution_id;
  if not found then
    raise exception 'unavailable' using errcode = 'P0001';
  end if;

  select * into v_binder
  from public.binders
  where id = v_binder_id
    and lifecycle in ('active', 'archived')
  for update;
  if not found then raise exception 'unavailable' using errcode = 'P0001'; end if;

  select * into v_contribution
  from public.binder_contributions
  where id = p_contribution_id
    and binder_id = v_binder.id
  for update;
  if not found
     or v_contribution.contributor_user_id <> v_uid
     or v_contribution.state not in ('pending', 'active') then
    raise exception 'unavailable' using errcode = 'P0001';
  end if;

  perform public.binder_rate_limit_assert_v1(v_uid, v_binder.id, 'contribution_mutation', 120, null);

  update public.binder_contributions
  set
    state = 'withdrawn',
    terminal_by_user_id = v_uid,
    terminal_at = now()
  where id = v_contribution.id;

  v_event_id := public.binder_append_activity_v1(
    p_binder_id => v_binder.id,
    p_event_type => 'contribution_withdrawn',
    p_actor_kind => 'user',
    p_actor_user_id => v_uid,
    p_subject_member_id => v_contribution.contributor_member_id,
    p_contribution_id => v_contribution.id
  );

  if v_contribution.state = 'active' then
    perform public.binder_progress_recalculate_v1(
      p_binder_id => v_binder.id,
      p_actor_kind => 'user',
      p_actor_user_id => v_uid
    );
  end if;

  v_response := jsonb_build_object(
    'ok', true,
    'binder_public_id', v_binder.public_id,
    'contribution_id', v_contribution.id,
    'state', 'withdrawn',
    'event_id', v_event_id
  );
  return public.binder_idempotency_store_v1(
    v_actor_key, v_uid, 'binder_contribution_withdraw_v1', p_idempotency_key, v_binder.id, v_response
  );
end;
$$;

create or replace function public.binder_contribution_decide_v1(
  p_contribution_id uuid,
  p_decision text,
  p_idempotency_key text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_uid uuid := public.binder_require_user_v1();
  v_actor_key text := 'user:' || v_uid::text;
  v_cached jsonb;
  v_decision text := lower(btrim(coalesce(p_decision, '')));
  v_binder_id uuid;
  v_contribution public.binder_contributions%rowtype;
  v_binder public.binders%rowtype;
  v_actor_member public.binder_members%rowtype;
  v_subject_member public.binder_members%rowtype;
  v_instance record;
  v_next_state text;
  v_event_id uuid;
  v_response jsonb;
begin
  v_cached := public.binder_idempotency_get_v1(v_actor_key, 'binder_contribution_decide_v1', p_idempotency_key);
  if v_cached is not null then return v_cached; end if;
  if not public.binder_feature_enabled_v1('schema_internal') then
    raise exception 'feature_disabled' using errcode = 'P0001';
  end if;
  if v_decision not in ('approve', 'reject') then
    raise exception 'invalid_decision' using errcode = '22023';
  end if;

  select binder_id into v_binder_id
  from public.binder_contributions
  where id = p_contribution_id;
  if not found then
    raise exception 'unavailable' using errcode = 'P0001';
  end if;

  select binder_row.* into v_binder
  from public.binders binder_row
  where binder_row.id = v_binder_id
  for update;
  if not found
     or v_binder.lifecycle <> 'active'
     or v_binder.moderation_state in ('frozen', 'removed') then
    raise exception 'unavailable' using errcode = 'P0001';
  end if;

  select * into v_contribution
  from public.binder_contributions
  where id = p_contribution_id
    and binder_id = v_binder.id
  for update;
  if not found or v_contribution.state <> 'pending' then
    raise exception 'unavailable' using errcode = 'P0001';
  end if;

  select * into v_actor_member
  from public.binder_members
  where binder_id = v_binder.id and user_id = v_uid and state = 'active';
  select * into v_subject_member
  from public.binder_members
  where id = v_contribution.contributor_member_id
  for update;

  if v_actor_member.id is null
     or v_actor_member.role not in ('owner', 'manager')
     or (v_actor_member.role = 'manager' and v_contribution.contributor_user_id = v_uid) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  perform public.binder_rate_limit_assert_v1(v_uid, v_binder.id, 'contribution_mutation', 120, null);

  if v_decision = 'reject' then
    v_next_state := 'rejected';
  else
    select * into v_instance
    from public.binder_resolve_owned_instance_v1(
      p_user_id => v_contribution.contributor_user_id,
      p_vault_item_instance_id => v_contribution.vault_item_instance_id,
      p_lock => true
    );

    if not found
       or v_subject_member.state <> 'active'
       or v_subject_member.membership_epoch <> v_contribution.contributor_membership_epoch
       or v_subject_member.role = 'viewer'
       or v_instance.gv_vi_id <> v_contribution.snapshot_gv_vi_id
       or v_instance.card_print_id <> v_contribution.snapshot_card_print_id
       or v_instance.card_printing_id is distinct from v_contribution.snapshot_card_printing_id
       or not public.binder_contribution_matches_v1(
         v_binder.id,
         v_instance.card_print_id,
         v_instance.card_printing_id
       )
       or public.binder_pair_blocked_v1(v_subject_member.user_id, v_binder.owner_user_id) then
      v_next_state := 'invalidated';
    else
      v_next_state := 'active';
    end if;
  end if;

  update public.binder_contributions
  set
    state = v_next_state,
    decided_by_user_id = v_uid,
    decided_at = now(),
    activated_at = case when v_next_state = 'active' then now() else activated_at end,
    terminal_by_user_id = case when v_next_state in ('rejected', 'invalidated') then v_uid else null end,
    terminal_at = case when v_next_state in ('rejected', 'invalidated') then now() else null end
  where id = v_contribution.id;

  v_event_id := public.binder_append_activity_v1(
    p_binder_id => v_binder.id,
    p_event_type => case v_next_state
      when 'active' then 'contribution_approved'
      when 'rejected' then 'contribution_rejected'
      else 'contribution_invalidated'
    end,
    p_actor_kind => 'user',
    p_actor_user_id => v_uid,
    p_subject_member_id => v_contribution.contributor_member_id,
    p_contribution_id => v_contribution.id,
    p_payload => case when v_next_state = 'invalidated'
      then jsonb_build_object('reason', 'approval_revalidation_failed')
      else '{}'::jsonb
    end
  );

  if v_next_state = 'active' then
    perform public.binder_progress_recalculate_v1(
      p_binder_id => v_binder.id,
      p_actor_kind => 'user',
      p_actor_user_id => v_uid
    );
  end if;

  v_response := jsonb_build_object(
    'ok', true,
    'binder_public_id', v_binder.public_id,
    'contribution_id', v_contribution.id,
    'decision', v_decision,
    'state', v_next_state,
    'event_id', v_event_id
  );
  return public.binder_idempotency_store_v1(
    v_actor_key, v_uid, 'binder_contribution_decide_v1', p_idempotency_key, v_binder.id, v_response
  );
end;
$$;

create or replace function public.binder_bulk_add_v1(
  p_public_id uuid,
  p_vault_item_instance_ids uuid[],
  p_idempotency_key text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_uid uuid := public.binder_require_user_v1();
  v_actor_key text := 'user:' || v_uid::text;
  v_cached jsonb;
  v_binder_id uuid;
  v_instance_id uuid;
  v_contribution public.binder_contributions%rowtype;
  v_results jsonb := '[]'::jsonb;
  v_accepted integer := 0;
  v_rejected integer := 0;
  v_active_accepted integer := 0;
  v_response jsonb;
begin
  v_cached := public.binder_idempotency_get_v1(v_actor_key, 'binder_bulk_add_v1', p_idempotency_key);
  if v_cached is not null then return v_cached; end if;

  if p_vault_item_instance_ids is null
     or cardinality(p_vault_item_instance_ids) < 1
     or cardinality(p_vault_item_instance_ids) > 100
     or cardinality(p_vault_item_instance_ids) <> (
       select count(distinct x) from unnest(p_vault_item_instance_ids) x
     ) then
    raise exception 'invalid_batch' using errcode = '22023';
  end if;

  select id into v_binder_id
  from public.binders
  where public_id = p_public_id;
  if v_binder_id is null then raise exception 'unavailable' using errcode = 'P0001'; end if;

  perform public.binder_rate_limit_reserve_v1(
    v_uid,
    v_binder_id,
    'contribution_mutation',
    cardinality(p_vault_item_instance_ids),
    120,
    null
  );

  foreach v_instance_id in array p_vault_item_instance_ids
  loop
    begin
      v_contribution := public.binder_internal_add_contribution_v1(
        v_uid,
        v_binder_id,
        v_instance_id,
        'bulk',
        true
      );
      v_accepted := v_accepted + 1;
      if v_contribution.state = 'active' then
        v_active_accepted := v_active_accepted + 1;
      end if;
      v_results := v_results || jsonb_build_array(jsonb_build_object(
        'vault_item_instance_id', v_instance_id,
        'accepted', true,
        'contribution_id', v_contribution.id,
        'state', v_contribution.state
      ));
    exception
      when sqlstate '42501' then
        v_rejected := v_rejected + 1;
        v_results := v_results || jsonb_build_array(jsonb_build_object(
          'vault_item_instance_id', v_instance_id,
          'accepted', false,
          'reason', 'not_authorized'
        ));
      when unique_violation then
        v_rejected := v_rejected + 1;
        v_results := v_results || jsonb_build_array(jsonb_build_object(
          'vault_item_instance_id', v_instance_id,
          'accepted', false,
          'reason', 'conflict'
        ));
      when raise_exception then
        if sqlerrm not in ('capacity', 'conflict', 'invalid_target', 'unavailable') then
          raise;
        end if;
        v_rejected := v_rejected + 1;
        v_results := v_results || jsonb_build_array(jsonb_build_object(
          'vault_item_instance_id', v_instance_id,
          'accepted', false,
          'reason', sqlerrm
        ));
    end;
  end loop;

  if v_active_accepted > 0 then
    perform public.binder_progress_recalculate_v1(
      p_binder_id => v_binder_id,
      p_actor_kind => 'user',
      p_actor_user_id => v_uid
    );
  end if;

  v_response := jsonb_build_object(
    'ok', true,
    'binder_public_id', p_public_id,
    'accepted_count', v_accepted,
    'rejected_count', v_rejected,
    'items', v_results
  );
  return public.binder_idempotency_store_v1(
    v_actor_key, v_uid, 'binder_bulk_add_v1', p_idempotency_key, v_binder_id, v_response
  );
end;
$$;

-- Invitation acceptance helper used by token and account-inbox entrypoints.
create or replace function public.binder_internal_accept_invitation_v1(
  p_invitation_id uuid,
  p_actor_user_id uuid
)
returns table (
  binder_id uuid,
  binder_public_id uuid,
  membership_id uuid,
  event_id uuid
)
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_binder_id uuid;
  v_invitation public.binder_invitations%rowtype;
  v_binder public.binders%rowtype;
  v_inviter public.binder_members%rowtype;
  v_member public.binder_members%rowtype;
  v_event_id uuid;
begin
  if not public.binder_feature_enabled_v1('shared') then
    raise exception 'feature_disabled' using errcode = 'P0001';
  end if;

  perform public.binder_advisory_lock_v1(
    'binder:membership-user:' || p_actor_user_id::text
  );

  select invitation.binder_id into v_binder_id
  from public.binder_invitations invitation
  where invitation.id = p_invitation_id;
  if not found then
    raise exception 'unavailable' using errcode = 'P0001';
  end if;

  select * into v_binder
  from public.binders
  where id = v_binder_id
  for update;

  if not found
     or v_binder.lifecycle <> 'active'
     or v_binder.moderation_state in ('frozen', 'removed')
     or v_binder.join_policy <> 'invite_only'
     or p_actor_user_id = v_binder.owner_user_id
     or public.binder_pair_blocked_v1(p_actor_user_id, v_binder.owner_user_id) then
    raise exception 'unavailable' using errcode = 'P0001';
  end if;

  select invitation.* into v_invitation
  from public.binder_invitations invitation
  where invitation.id = p_invitation_id
    and invitation.binder_id = v_binder.id
  for update;

  if not found
     or v_invitation.status <> 'pending'
     or v_invitation.expires_at <= now()
     or (
       v_invitation.is_account_targeted
       and v_invitation.intended_user_id <> p_actor_user_id
     )
     or (
       v_invitation.inviter_user_id is not null
       and public.binder_pair_blocked_v1(
         p_actor_user_id,
         v_invitation.inviter_user_id
       )
     ) then
    raise exception 'unavailable' using errcode = 'P0001';
  end if;

  select inviter.* into v_inviter
  from public.binder_members inviter
  where inviter.binder_id = v_binder.id
    and inviter.user_id = v_invitation.inviter_user_id
    and inviter.state = 'active';
  if v_inviter.id is null
     or v_inviter.role not in ('owner', 'manager')
     or (v_invitation.max_role = 'manager' and v_inviter.role <> 'owner')
     or (v_invitation.max_role = 'manager' and not v_invitation.is_account_targeted) then
    raise exception 'unavailable' using errcode = 'P0001';
  end if;

  perform public.binder_advisory_lock_v1('binder:membership-user:' || p_actor_user_id::text);

  if (
    select count(*)
    from public.binder_members member_row
    where member_row.binder_id = v_binder.id
      and member_row.state in ('active', 'suspended')
  ) >= 50 then
    raise exception 'capacity' using errcode = 'P0001';
  end if;
  if (
    select count(*)
    from public.binder_members member_row
    where member_row.user_id = p_actor_user_id
      and member_row.state in ('active', 'suspended')
  ) >= 100 then
    raise exception 'capacity' using errcode = 'P0001';
  end if;

  select member_row.* into v_member
  from public.binder_members member_row
  where member_row.binder_id = v_binder.id
    and member_row.user_id = p_actor_user_id
  for update;

  if found and v_member.state in ('active', 'suspended') then
    raise exception 'conflict' using errcode = 'P0001';
  elsif found then
    update public.binder_members
    set
      role = v_invitation.max_role,
      state = 'active',
      membership_epoch = membership_epoch + 1,
      public_action_ref = gen_random_uuid(),
      display_alias = null,
      invited_by_user_id = v_invitation.inviter_user_id,
      joined_at = now(),
      ended_at = null,
      suspended_at = null,
      content_scope = 'none',
      content_consent_epoch = null,
      content_consent_revision = null,
      identity_scope = 'none',
      identity_consent_epoch = null,
      identity_consent_revision = null,
      notification_preference = 'digest'
    where id = v_member.id
    returning * into v_member;
  else
    insert into public.binder_members (
      binder_id,
      user_id,
      role,
      state,
      membership_epoch,
      invited_by_user_id,
      joined_at
    ) values (
      v_binder.id,
      p_actor_user_id,
      v_invitation.max_role,
      'active',
      1,
      v_invitation.inviter_user_id,
      now()
    )
    returning * into v_member;
  end if;

  update public.binder_invitations
  set
    status = 'accepted',
    accepted_by_user_id = p_actor_user_id,
    used_at = now(),
    responded_at = now()
  where id = v_invitation.id;

  perform public.binder_append_activity_v1(
    p_binder_id => v_binder.id,
    p_event_type => 'invitation_accepted',
    p_actor_kind => 'user',
    p_actor_user_id => p_actor_user_id,
    p_subject_member_id => v_member.id,
    p_payload => jsonb_build_object('role', v_member.role)
  );
  v_event_id := public.binder_append_activity_v1(
    p_binder_id => v_binder.id,
    p_event_type => 'member_joined',
    p_actor_kind => 'user',
    p_actor_user_id => p_actor_user_id,
    p_subject_member_id => v_member.id,
    p_payload => jsonb_build_object(
      'role', v_member.role,
      'membership_epoch', v_member.membership_epoch
    )
  );

  return query select v_binder.id, v_binder.public_id, v_member.id, v_event_id;
end;
$$;

create or replace function public.binder_invite_create_v1(
  p_public_id uuid,
  p_max_role text,
  p_idempotency_key text,
  p_recipient_user_id uuid default null,
  p_expires_at timestamptz default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_uid uuid := public.binder_require_user_v1();
  v_actor_key text := 'user:' || v_uid::text;
  v_cached jsonb;
  v_binder public.binders%rowtype;
  v_member public.binder_members%rowtype;
  v_role text := lower(btrim(coalesce(p_max_role, '')));
  v_expiry timestamptz := coalesce(p_expires_at, now() + interval '7 days');
  v_token text;
  v_invitation public.binder_invitations%rowtype;
  v_event_id uuid;
  v_response jsonb;
  v_replay_response jsonb;
begin
  v_cached := public.binder_idempotency_get_v1(v_actor_key, 'binder_invite_create_v1', p_idempotency_key);
  if v_cached is not null then return v_cached; end if;

  if p_recipient_user_id is not null then
    perform public.binder_advisory_lock_v1(
      'binder:invite-recipient:' || p_recipient_user_id::text
    );
  end if;

  select * into v_binder
  from public.binders
  where public_id = p_public_id
  for update;
  if not found
     or v_binder.lifecycle <> 'active'
     or v_binder.moderation_state in ('frozen', 'removed')
     or v_binder.join_policy <> 'invite_only'
     or not public.binder_feature_enabled_v1('shared') then
    raise exception 'unavailable' using errcode = 'P0001';
  end if;

  select * into v_member
  from public.binder_members
  where binder_id = v_binder.id and user_id = v_uid and state = 'active';
  if v_member.id is null
     or v_member.role not in ('owner', 'manager')
     or v_role not in ('manager', 'contributor', 'viewer')
     or (v_member.role = 'manager' and v_role = 'manager')
     or (p_recipient_user_id is null and v_role = 'manager')
     or p_recipient_user_id = v_uid
     or v_expiry <= now() + interval '5 minutes'
     or v_expiry > now() + interval '30 days' then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  if p_recipient_user_id is not null and (
    public.binder_pair_blocked_v1(v_uid, p_recipient_user_id)
    or public.binder_pair_blocked_v1(v_binder.owner_user_id, p_recipient_user_id)
    or exists (
      select 1 from public.binder_members
      where binder_id = v_binder.id
        and user_id = p_recipient_user_id
        and state in ('active', 'suspended')
    )
  ) then
    raise exception 'unavailable' using errcode = 'P0001';
  end if;

  if p_recipient_user_id is not null then
    if (
      select count(*)
      from public.binder_invitations
      where is_account_targeted is true
        and intended_user_id = p_recipient_user_id
        and status = 'pending'
        and expires_at > now()
    ) >= 50 then
      raise exception 'capacity' using errcode = 'P0001';
    end if;
  end if;

  if (
    select count(*) from public.binder_invitations
    where binder_id = v_binder.id and status = 'pending' and expires_at > now()
  ) >= 20 then
    raise exception 'capacity' using errcode = 'P0001';
  end if;

  perform public.binder_rate_limit_assert_v1(v_uid, v_binder.id, 'invitation', 10, 50);
  v_token := public.binder_token_v1();

  insert into public.binder_invitations (
    binder_id,
    inviter_user_id,
    is_account_targeted,
    intended_user_id,
    max_role,
    token_hash,
    expires_at
  ) values (
    v_binder.id,
    v_uid,
    p_recipient_user_id is not null,
    p_recipient_user_id,
    v_role,
    public.binder_token_hash_v1(v_token),
    v_expiry
  )
  returning * into v_invitation;

  v_event_id := public.binder_append_activity_v1(
    p_binder_id => v_binder.id,
    p_event_type => 'invitation_created',
    p_actor_kind => 'user',
    p_actor_user_id => v_uid,
    p_payload => jsonb_build_object(
      'max_role', v_role,
      'account_targeted', p_recipient_user_id is not null,
      'expires_at', v_expiry
    )
  );

  v_response := jsonb_build_object(
    'ok', true,
    'binder_public_id', p_public_id,
    'invitation_id', v_invitation.id,
    'state', 'pending',
    'maximum_role', v_role,
    'role', v_role,
    'is_account_targeted', p_recipient_user_id is not null,
    'token', v_token,
    'url', 'https://grookaivault.com/binder-invites/' || v_token,
    'expires_at', v_expiry,
    'event_id', v_event_id
  );
  v_replay_response := jsonb_build_object(
    'ok', true,
    'binder_public_id', p_public_id,
    'invitation_id', v_invitation.id,
    'state', 'pending',
    'maximum_role', v_role,
    'role', v_role,
    'is_account_targeted', p_recipient_user_id is not null,
    'expires_at', v_expiry,
    'event_id', v_event_id,
    'token_available', false,
    'replayed', true
  );
  perform public.binder_idempotency_store_v1(
    v_actor_key, v_uid, 'binder_invite_create_v1', p_idempotency_key, v_binder.id, v_replay_response
  );
  return v_response;
end;
$$;

create or replace function public.binder_invite_accept_v1(
  p_token text,
  p_idempotency_key text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_uid uuid := public.binder_require_user_v1();
  v_actor_key text := 'user:' || v_uid::text;
  v_cached jsonb;
  v_invitation_id uuid;
  v_result record;
  v_response jsonb;
begin
  v_cached := public.binder_idempotency_get_v1(v_actor_key, 'binder_invite_accept_v1', p_idempotency_key);
  if v_cached is not null then return v_cached; end if;
  if not public.binder_feature_enabled_v1('shared') then
    raise exception 'feature_disabled' using errcode = 'P0001';
  end if;

  select id into v_invitation_id
  from public.binder_invitations
  where token_hash = public.binder_token_hash_v1(p_token)
    and (
      is_account_targeted is false
      or intended_user_id = v_uid
    );
  if v_invitation_id is null then raise exception 'unavailable' using errcode = 'P0001'; end if;

  select * into v_result
  from public.binder_internal_accept_invitation_v1(v_invitation_id, v_uid);

  v_response := jsonb_build_object(
    'ok', true,
    'decision', 'accept',
    'binder_public_id', v_result.binder_public_id,
    'membership_id', v_result.membership_id,
    'event_id', v_result.event_id
  );
  return public.binder_idempotency_store_v1(
    v_actor_key, v_uid, 'binder_invite_accept_v1', p_idempotency_key, v_result.binder_id, v_response
  );
end;
$$;

create or replace function public.binder_invite_decline_v1(
  p_token text,
  p_idempotency_key text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_uid uuid := public.binder_require_user_v1();
  v_actor_key text := 'user:' || v_uid::text;
  v_cached jsonb;
  v_binder_id uuid;
  v_invitation public.binder_invitations%rowtype;
  v_binder public.binders%rowtype;
  v_event_id uuid;
  v_response jsonb;
begin
  v_cached := public.binder_idempotency_get_v1(v_actor_key, 'binder_invite_decline_v1', p_idempotency_key);
  if v_cached is not null then return v_cached; end if;

  select binder_id into v_binder_id
  from public.binder_invitations
  where token_hash = public.binder_token_hash_v1(p_token)
    and (
      is_account_targeted is false
      or intended_user_id = v_uid
    );
  if not found then
    raise exception 'unavailable' using errcode = 'P0001';
  end if;

  select * into v_binder
  from public.binders
  where id = v_binder_id
  for update;
  if not found
     or v_binder.lifecycle <> 'active'
     or v_binder.moderation_state in ('frozen', 'removed')
     or v_binder.join_policy <> 'invite_only'
     or public.binder_pair_blocked_v1(v_uid, v_binder.owner_user_id) then
    raise exception 'unavailable' using errcode = 'P0001';
  end if;

  select * into v_invitation
  from public.binder_invitations
  where binder_id = v_binder.id
    and token_hash = public.binder_token_hash_v1(p_token)
    and (
      is_account_targeted is false
      or intended_user_id = v_uid
    )
  for update;
  if not found
     or v_invitation.status <> 'pending'
     or v_invitation.expires_at <= now()
     or (
       v_invitation.inviter_user_id is not null
       and public.binder_pair_blocked_v1(v_uid, v_invitation.inviter_user_id)
     ) then
    raise exception 'unavailable' using errcode = 'P0001';
  end if;
  update public.binder_invitations
  set status = 'declined', responded_at = now()
  where id = v_invitation.id;

  v_event_id := public.binder_append_activity_v1(
    p_binder_id => v_binder.id,
    p_event_type => 'invitation_declined',
    p_actor_kind => 'user',
    p_actor_user_id => v_uid
  );
  v_response := jsonb_build_object(
    'ok', true,
    'decision', 'decline',
    'binder_public_id', v_binder.public_id,
    'membership_id', null,
    'event_id', v_event_id
  );
  return public.binder_idempotency_store_v1(
    v_actor_key, v_uid, 'binder_invite_decline_v1', p_idempotency_key, v_binder.id, v_response
  );
end;
$$;

create or replace function public.binder_invite_respond_v1(
  p_invitation_id uuid,
  p_decision text,
  p_idempotency_key text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_uid uuid := public.binder_require_user_v1();
  v_actor_key text := 'user:' || v_uid::text;
  v_cached jsonb;
  v_decision text := lower(btrim(coalesce(p_decision, '')));
  v_binder_id uuid;
  v_invitation public.binder_invitations%rowtype;
  v_binder public.binders%rowtype;
  v_result record;
  v_event_id uuid;
  v_response jsonb;
begin
  v_cached := public.binder_idempotency_get_v1(v_actor_key, 'binder_invite_respond_v1', p_idempotency_key);
  if v_cached is not null then return v_cached; end if;
  if v_decision not in ('accept', 'decline') then
    raise exception 'invalid_decision' using errcode = '22023';
  end if;
  if v_decision = 'accept' and not public.binder_feature_enabled_v1('shared') then
    raise exception 'feature_disabled' using errcode = 'P0001';
  end if;

  select binder_id into v_binder_id
  from public.binder_invitations
  where id = p_invitation_id
    and is_account_targeted is true
    and intended_user_id = v_uid;
  if not found
  then
    raise exception 'unavailable' using errcode = 'P0001';
  end if;

  if v_decision = 'accept' then
    select * into v_result
    from public.binder_internal_accept_invitation_v1(p_invitation_id, v_uid);
    v_response := jsonb_build_object(
      'ok', true,
      'decision', 'accept',
      'binder_public_id', v_result.binder_public_id,
      'membership_id', v_result.membership_id,
      'event_id', v_result.event_id
    );
    return public.binder_idempotency_store_v1(
      v_actor_key, v_uid, 'binder_invite_respond_v1', p_idempotency_key, v_result.binder_id, v_response
    );
  end if;

  select * into v_binder
  from public.binders
  where id = v_binder_id
  for update;
  if not found
     or v_binder.lifecycle <> 'active'
     or v_binder.moderation_state in ('frozen', 'removed')
     or public.binder_pair_blocked_v1(v_uid, v_binder.owner_user_id) then
    raise exception 'unavailable' using errcode = 'P0001';
  end if;

  select * into v_invitation
  from public.binder_invitations
  where id = p_invitation_id
    and binder_id = v_binder.id
  for update;
  if not found
     or not v_invitation.is_account_targeted
     or v_invitation.intended_user_id <> v_uid
     or v_invitation.status <> 'pending'
     or v_invitation.expires_at <= now() then
    raise exception 'unavailable' using errcode = 'P0001';
  end if;

  update public.binder_invitations
  set status = 'declined', responded_at = now()
  where id = v_invitation.id;
  v_event_id := public.binder_append_activity_v1(
    p_binder_id => v_binder.id,
    p_event_type => 'invitation_declined',
    p_actor_kind => 'user',
    p_actor_user_id => v_uid
  );
  v_response := jsonb_build_object(
    'ok', true,
    'decision', 'decline',
    'binder_public_id', v_binder.public_id,
    'membership_id', null,
    'event_id', v_event_id
  );
  return public.binder_idempotency_store_v1(
    v_actor_key, v_uid, 'binder_invite_respond_v1', p_idempotency_key, v_binder.id, v_response
  );
end;
$$;

create or replace function public.binder_invite_revoke_v1(
  p_invitation_id uuid,
  p_idempotency_key text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_uid uuid := public.binder_require_user_v1();
  v_actor_key text := 'user:' || v_uid::text;
  v_cached jsonb;
  v_binder_id uuid;
  v_invitation public.binder_invitations%rowtype;
  v_binder public.binders%rowtype;
  v_member public.binder_members%rowtype;
  v_event_id uuid;
  v_response jsonb;
begin
  v_cached := public.binder_idempotency_get_v1(v_actor_key, 'binder_invite_revoke_v1', p_idempotency_key);
  if v_cached is not null then return v_cached; end if;

  select binder_id into v_binder_id
  from public.binder_invitations
  where id = p_invitation_id;
  if not found then
    raise exception 'unavailable' using errcode = 'P0001';
  end if;

  select * into v_binder
  from public.binders
  where id = v_binder_id
  for update;
  if not found then
    raise exception 'unavailable' using errcode = 'P0001';
  end if;

  select * into v_invitation
  from public.binder_invitations
  where id = p_invitation_id
    and binder_id = v_binder.id
  for update;
  if not found
     or v_invitation.status <> 'pending'
     or v_invitation.expires_at <= now() then
    raise exception 'unavailable' using errcode = 'P0001';
  end if;

  select * into v_member from public.binder_members
  where binder_id = v_binder.id and user_id = v_uid and state = 'active';

  if v_member.id is null
     or v_binder.lifecycle <> 'active'
     or v_binder.moderation_state in ('frozen', 'removed')
     or v_member.role not in ('owner', 'manager')
     or (v_member.role = 'manager' and v_invitation.max_role = 'manager') then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  update public.binder_invitations
  set status = 'revoked', responded_at = now(), revoked_at = now()
  where id = v_invitation.id;
  v_event_id := public.binder_append_activity_v1(
    p_binder_id => v_binder.id,
    p_event_type => 'invitation_revoked',
    p_actor_kind => 'user',
    p_actor_user_id => v_uid
  );
  v_response := jsonb_build_object(
    'ok', true,
    'binder_public_id', v_binder.public_id,
    'invitation_id', v_invitation.id,
    'event_id', v_event_id
  );
  return public.binder_idempotency_store_v1(
    v_actor_key, v_uid, 'binder_invite_revoke_v1', p_idempotency_key, v_binder.id, v_response
  );
end;
$$;

create or replace function public.binder_view_link_create_v1(
  p_public_id uuid,
  p_idempotency_key text,
  p_label text default null,
  p_expires_at timestamptz default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_uid uuid := public.binder_require_user_v1();
  v_actor_key text := 'user:' || v_uid::text;
  v_cached jsonb;
  v_binder public.binders%rowtype;
  v_token text;
  v_link public.binder_view_links%rowtype;
  v_policy_event_id uuid;
  v_event_id uuid;
  v_response jsonb;
  v_replay_response jsonb;
begin
  v_cached := public.binder_idempotency_get_v1(v_actor_key, 'binder_view_link_create_v1', p_idempotency_key);
  if v_cached is not null then return v_cached; end if;

  select * into v_binder
  from public.binders
  where public_id = p_public_id
  for update;
  if not found
     or v_binder.owner_user_id <> v_uid
     or v_binder.lifecycle <> 'active'
     or v_binder.moderation_state in ('frozen', 'removed')
     or not public.binder_feature_enabled_v1('view_links')
     or (
       p_label is not null
       and (
         btrim(p_label) = ''
         or char_length(btrim(p_label)) > 80
         or not public.binder_text_safe_v1(btrim(p_label), false)
       )
     )
     or (p_expires_at is not null and p_expires_at <= now()) then
    raise exception 'unavailable' using errcode = 'P0001';
  end if;

  if (
    select count(*) from public.binder_view_links
    where binder_id = v_binder.id
      and status = 'active'
      and (expires_at is null or expires_at > now())
  ) >= 5 then
    raise exception 'capacity' using errcode = 'P0001';
  end if;

  if v_binder.read_access = 'private' then
    update public.binders
    set
      read_access = 'link',
      discoverability = 'unlisted',
      external_projection_revision = external_projection_revision + 1
    where id = v_binder.id
    returning * into v_binder;
    perform public.binder_progress_recalculate_v1(
      p_binder_id => v_binder.id,
      p_actor_kind => 'user',
      p_actor_user_id => v_uid
    );
    v_policy_event_id := public.binder_append_activity_v1(
      p_binder_id => v_binder.id,
      p_event_type => 'policy_updated',
      p_actor_kind => 'user',
      p_actor_user_id => v_uid,
      p_payload => jsonb_build_object(
        'read_access', 'link',
        'discoverability', 'unlisted',
        'external_projection_revision', v_binder.external_projection_revision,
        'reason', 'view_link_created'
      )
    );
  end if;

  v_token := public.binder_token_v1();
  insert into public.binder_view_links (
    binder_id,
    created_by_user_id,
    label,
    token_hash,
    expires_at
  ) values (
    v_binder.id,
    v_uid,
    nullif(btrim(p_label), ''),
    public.binder_token_hash_v1(v_token),
    p_expires_at
  )
  returning * into v_link;

  v_event_id := public.binder_append_activity_v1(
    p_binder_id => v_binder.id,
    p_event_type => 'view_link_created',
    p_actor_kind => 'user',
    p_actor_user_id => v_uid,
    p_payload => jsonb_build_object('expires_at', p_expires_at)
  );
  v_response := jsonb_build_object(
    'ok', true,
    'binder_public_id', p_public_id,
    'view_link_id', v_link.id,
    'label', coalesce(v_link.label, 'View-only link'),
    'token', v_token,
    'url', 'https://grookaivault.com/b/' || v_token,
    'expires_at', p_expires_at,
    'policy_event_id', v_policy_event_id,
    'event_id', v_event_id
  );
  v_replay_response := jsonb_build_object(
    'ok', true,
    'binder_public_id', p_public_id,
    'view_link_id', v_link.id,
    'label', coalesce(v_link.label, 'View-only link'),
    'expires_at', p_expires_at,
    'policy_event_id', v_policy_event_id,
    'event_id', v_event_id,
    'token_available', false,
    'replayed', true
  );
  perform public.binder_idempotency_store_v1(
    v_actor_key, v_uid, 'binder_view_link_create_v1', p_idempotency_key, v_binder.id, v_replay_response
  );
  return v_response;
end;
$$;

create or replace function public.binder_view_link_rotate_v1(
  p_view_link_id uuid,
  p_idempotency_key text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_uid uuid := public.binder_require_user_v1();
  v_actor_key text := 'user:' || v_uid::text;
  v_cached jsonb;
  v_binder_id uuid;
  v_link public.binder_view_links%rowtype;
  v_new_link public.binder_view_links%rowtype;
  v_binder public.binders%rowtype;
  v_token text;
  v_event_id uuid;
  v_response jsonb;
  v_replay_response jsonb;
begin
  v_cached := public.binder_idempotency_get_v1(v_actor_key, 'binder_view_link_rotate_v1', p_idempotency_key);
  if v_cached is not null then return v_cached; end if;
  if not public.binder_feature_enabled_v1('view_links') then
    raise exception 'feature_disabled' using errcode = 'P0001';
  end if;

  select binder_id into v_binder_id
  from public.binder_view_links
  where id = p_view_link_id;
  if not found then
    raise exception 'unavailable' using errcode = 'P0001';
  end if;

  select * into v_binder
  from public.binders
  where id = v_binder_id
  for update;
  if not found
     or v_binder.owner_user_id <> v_uid
     or v_binder.lifecycle <> 'active'
     or v_binder.moderation_state in ('frozen', 'removed')
     or not public.binder_feature_enabled_v1('view_links') then
    raise exception 'unavailable' using errcode = 'P0001';
  end if;

  select * into v_link
  from public.binder_view_links
  where id = p_view_link_id
    and binder_id = v_binder.id
  for update;
  if not found
     or v_link.status <> 'active'
     or (v_link.expires_at is not null and v_link.expires_at <= now()) then
    raise exception 'unavailable' using errcode = 'P0001';
  end if;

  update public.binder_view_links
  set status = 'rotated', rotated_at = now()
  where id = v_link.id;
  v_token := public.binder_token_v1();
  insert into public.binder_view_links (
    binder_id, created_by_user_id, label, token_hash, expires_at
  ) values (
    v_binder.id, v_uid, v_link.label, public.binder_token_hash_v1(v_token), v_link.expires_at
  )
  returning * into v_new_link;

  v_event_id := public.binder_append_activity_v1(
    p_binder_id => v_binder.id,
    p_event_type => 'view_link_rotated',
    p_actor_kind => 'user',
    p_actor_user_id => v_uid
  );
  v_response := jsonb_build_object(
    'ok', true,
    'binder_public_id', v_binder.public_id,
    'view_link_id', v_new_link.id,
    'label', coalesce(v_new_link.label, 'View-only link'),
    'token', v_token,
    'url', 'https://grookaivault.com/b/' || v_token,
    'expires_at', v_new_link.expires_at,
    'event_id', v_event_id
  );
  v_replay_response := jsonb_build_object(
    'ok', true,
    'binder_public_id', v_binder.public_id,
    'view_link_id', v_new_link.id,
    'label', coalesce(v_new_link.label, 'View-only link'),
    'expires_at', v_new_link.expires_at,
    'event_id', v_event_id,
    'token_available', false,
    'replayed', true
  );
  perform public.binder_idempotency_store_v1(
    v_actor_key, v_uid, 'binder_view_link_rotate_v1', p_idempotency_key, v_binder.id, v_replay_response
  );
  return v_response;
end;
$$;

create or replace function public.binder_view_link_revoke_v1(
  p_view_link_id uuid,
  p_idempotency_key text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_uid uuid := public.binder_require_user_v1();
  v_actor_key text := 'user:' || v_uid::text;
  v_cached jsonb;
  v_binder_id uuid;
  v_link public.binder_view_links%rowtype;
  v_binder public.binders%rowtype;
  v_event_id uuid;
  v_response jsonb;
begin
  v_cached := public.binder_idempotency_get_v1(v_actor_key, 'binder_view_link_revoke_v1', p_idempotency_key);
  if v_cached is not null then return v_cached; end if;
  select binder_id into v_binder_id
  from public.binder_view_links
  where id = p_view_link_id;
  if not found then
    raise exception 'unavailable' using errcode = 'P0001';
  end if;

  select * into v_binder
  from public.binders
  where id = v_binder_id
  for update;
  if not found
     or v_binder.owner_user_id <> v_uid
     or v_binder.moderation_state in ('frozen', 'removed') then
    raise exception 'unavailable' using errcode = 'P0001';
  end if;

  select * into v_link
  from public.binder_view_links
  where id = p_view_link_id
    and binder_id = v_binder.id
  for update;
  if not found
     or v_link.status <> 'active'
     or (v_link.expires_at is not null and v_link.expires_at <= now()) then
    raise exception 'unavailable' using errcode = 'P0001';
  end if;

  update public.binder_view_links
  set status = 'revoked', revoked_at = now()
  where id = v_link.id;
  v_event_id := public.binder_append_activity_v1(
    p_binder_id => v_binder.id,
    p_event_type => 'view_link_revoked',
    p_actor_kind => 'user',
    p_actor_user_id => v_uid
  );
  v_response := jsonb_build_object(
    'ok', true,
    'binder_public_id', v_binder.public_id,
    'view_link_id', v_link.id,
    'event_id', v_event_id
  );
  return public.binder_idempotency_store_v1(
    v_actor_key, v_uid, 'binder_view_link_revoke_v1', p_idempotency_key, v_binder.id, v_response
  );
end;
$$;

-- Helper functions are private. Public entrypoints are explicitly granted.
do $$
declare
  v_signature text;
begin
  foreach v_signature in array array[
    'public.binder_audience_rank_v1(text)',
    'public.binder_token_v1()',
    'public.binder_token_hash_v1(text)',
    'public.binder_gvvi_valid_v1(uuid,text)',
    'public.binder_card_has_hosted_canonical_image_v1(uuid)',
    'public.binder_cover_card_matches_v1(uuid,uuid)',
    'public.binder_internal_create_v1(uuid,text,text,text,text,uuid,uuid,uuid,jsonb,uuid)',
    'public.binder_resolve_owned_instance_v1(uuid,uuid,boolean)',
    'public.binder_internal_add_contribution_v1(uuid,uuid,uuid,text,boolean)',
    'public.binder_internal_accept_invitation_v1(uuid,uuid)'
  ]
  loop
    execute 'revoke all on function ' || v_signature || ' from public, anon, authenticated';
  end loop;
end;
$$;

revoke all on function public.binder_create_v1(text,text,text,text,text,uuid,uuid,uuid,jsonb) from public, anon;
revoke all on function public.binder_update_metadata_v1(uuid,text,text,uuid,text) from public, anon;
revoke all on function public.binder_update_policy_v1(uuid,text,text,text,text,text) from public, anon;
revoke all on function public.binder_set_lifecycle_v1(uuid,text,text) from public, anon;
revoke all on function public.binder_delete_v1(uuid,text,text) from public, anon;
revoke all on function public.binder_member_preferences_v1(uuid,text,text,text,text,text) from public, anon;
revoke all on function public.binder_contribution_add_v1(uuid,uuid,text,text) from public, anon;
revoke all on function public.binder_contribution_withdraw_v1(uuid,text) from public, anon;
revoke all on function public.binder_contribution_decide_v1(uuid,text,text) from public, anon;
revoke all on function public.binder_bulk_add_v1(uuid,uuid[],text) from public, anon;
revoke all on function public.binder_invite_create_v1(uuid,text,text,uuid,timestamptz) from public, anon;
revoke all on function public.binder_invite_accept_v1(text,text) from public, anon;
revoke all on function public.binder_invite_decline_v1(text,text) from public, anon;
revoke all on function public.binder_invite_respond_v1(uuid,text,text) from public, anon;
revoke all on function public.binder_invite_revoke_v1(uuid,text) from public, anon;
revoke all on function public.binder_view_link_create_v1(uuid,text,text,timestamptz) from public, anon;
revoke all on function public.binder_view_link_rotate_v1(uuid,text) from public, anon;
revoke all on function public.binder_view_link_revoke_v1(uuid,text) from public, anon;

grant execute on function public.binder_create_v1(text,text,text,text,text,uuid,uuid,uuid,jsonb) to authenticated, service_role;
grant execute on function public.binder_update_metadata_v1(uuid,text,text,uuid,text) to authenticated, service_role;
grant execute on function public.binder_update_policy_v1(uuid,text,text,text,text,text) to authenticated, service_role;
grant execute on function public.binder_set_lifecycle_v1(uuid,text,text) to authenticated, service_role;
grant execute on function public.binder_delete_v1(uuid,text,text) to authenticated, service_role;
grant execute on function public.binder_member_preferences_v1(uuid,text,text,text,text,text) to authenticated, service_role;
grant execute on function public.binder_contribution_add_v1(uuid,uuid,text,text) to authenticated, service_role;
grant execute on function public.binder_contribution_withdraw_v1(uuid,text) to authenticated, service_role;
grant execute on function public.binder_contribution_decide_v1(uuid,text,text) to authenticated, service_role;
grant execute on function public.binder_bulk_add_v1(uuid,uuid[],text) to authenticated, service_role;
grant execute on function public.binder_invite_create_v1(uuid,text,text,uuid,timestamptz) to authenticated, service_role;
grant execute on function public.binder_invite_accept_v1(text,text) to authenticated, service_role;
grant execute on function public.binder_invite_decline_v1(text,text) to authenticated, service_role;
grant execute on function public.binder_invite_respond_v1(uuid,text,text) to authenticated, service_role;
grant execute on function public.binder_invite_revoke_v1(uuid,text) to authenticated, service_role;
grant execute on function public.binder_view_link_create_v1(uuid,text,text,timestamptz) to authenticated, service_role;
grant execute on function public.binder_view_link_rotate_v1(uuid,text) to authenticated, service_role;
grant execute on function public.binder_view_link_revoke_v1(uuid,text) to authenticated, service_role;

commit;
