begin;

-- COLLABORATIVE_BINDERS_SYSTEM_CONTRACT_V1
-- Template/legacy user entrypoints plus service-only repair, moderation,
-- capability-expiry, retention, and account-deletion authorities.

create unique index binder_templates_custom_source_unique_idx
  on public.binder_templates (source_binder_id)
  where authority_kind = 'custom_owner';

create table public.binder_template_version_reviews (
  id uuid primary key default gen_random_uuid(),
  template_version_id uuid not null unique
    references public.binder_template_versions(id) on delete restrict,
  decision text not null,
  correlation_id text not null,
  reviewed_at timestamptz not null default now(),
  constraint binder_template_version_reviews_decision_check
    check (decision in ('published', 'rejected')),
  constraint binder_template_version_reviews_correlation_check
    check (btrim(correlation_id) <> '' and char_length(correlation_id) <= 160)
);

-- Terminal principal references must remain nullable in practice because their
-- auth foreign keys are ON DELETE SET NULL. Live rows still fail closed.
alter table public.binder_invitations
  drop constraint binder_invitations_response_check;
alter table public.binder_invitations
  add constraint binder_invitations_response_check check (
    (
      status = 'accepted'
      and used_at is not null
      and responded_at is not null
    )
    or (
      status in ('declined', 'revoked', 'expired')
      and responded_at is not null
    )
    or (
      status = 'pending'
      and responded_at is null
      and used_at is null
      and revoked_at is null
    )
  );

alter table public.binder_join_requests
  drop constraint binder_join_requests_response_check;
alter table public.binder_join_requests
  add constraint binder_join_requests_response_check check (
    (status = 'pending' and responded_at is null and decision_user_id is null)
    or (status = 'withdrawn' and responded_at is not null)
    or (status in ('approved', 'rejected') and responded_at is not null)
  );

alter table public.binder_templates
  drop constraint binder_templates_authority_source_check;
alter table public.binder_templates
  add constraint binder_templates_authority_source_check check (
    (
      authority_kind = 'system'
      and creator_user_id is null
      and system_key is not null
    )
    or (
      authority_kind = 'custom_owner'
      and source_binder_id is not null
      and system_key is null
      and (creator_user_id is not null or status = 'removed')
    )
  );

-- Template definitions are immutable. Moderation may perform exactly one
-- null->timestamp publication transition without changing the definition.
drop trigger if exists trg_binder_template_versions_append_only_v1
on public.binder_template_versions;

create or replace function public.binder_template_version_immutable_v1()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'binder_template_versions is append-only' using errcode = '55000';
  end if;
  if new.id is distinct from old.id
     or new.template_id is distinct from old.template_id
     or new.version_number is distinct from old.version_number
     or new.definition is distinct from old.definition
     or new.checklist_hash is distinct from old.checklist_hash
     or new.created_at is distinct from old.created_at
     or old.published_at is not null
     or new.published_at is null then
    raise exception 'binder_template_version_immutable' using errcode = '55000';
  end if;
  return new;
end;
$$;

create trigger trg_binder_template_versions_immutable_v1
before update or delete on public.binder_template_versions
for each row execute function public.binder_template_version_immutable_v1();

create or replace function public.binder_require_service_v1(
  p_service_source text,
  p_correlation_id text
)
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.role() <> 'service_role'
     or p_service_source not in (
       'vault_lifecycle',
       'canonical_catalog',
       'platform_moderation',
       'retention',
       'account_deletion',
       'template_moderation',
       'capability_expiry'
     )
     or btrim(coalesce(p_correlation_id, '')) = ''
     or char_length(p_correlation_id) > 160 then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
end;
$$;

create or replace function public.binder_template_definition_from_binder_v1(
  p_binder_id uuid,
  p_title text,
  p_description text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_binder public.binders%rowtype;
  v_slots jsonb;
begin
  select * into v_binder from public.binders where id = p_binder_id;
  if not found or not public.binder_target_enabled_v1(v_binder.id) then
    raise exception 'unavailable' using errcode = 'P0001';
  end if;
  select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
    'slot_id', s.slot_id,
    'position', s.position,
    'card_print_id', s.card_print_id,
    'card_printing_id', s.card_printing_id,
    'required_quantity', s.required_quantity
  )) order by s.position), '[]'::jsonb)
  into v_slots
  from public.binder_slot_rows_v1(v_binder.id) s;
  if jsonb_array_length(v_slots) < 1
     or jsonb_array_length(v_slots) > 1000 then
    raise exception 'unavailable' using errcode = 'P0001';
  end if;
  return jsonb_strip_nulls(jsonb_build_object(
    'contract_version', 1,
    'template_title', btrim(p_title),
    'template_description', nullif(p_description, ''),
    'target_kind', v_binder.target_kind,
    'checklist_mode', v_binder.checklist_mode,
    'target', public.binder_target_json_v1(v_binder.id),
    'target_label', public.binder_target_json_v1(v_binder.id) ->> 'label',
    'species_id', v_binder.species_id,
    'set_id', v_binder.set_id,
    'source_definition_revision', v_binder.definition_revision,
    'slots', v_slots
  ));
end;
$$;

create or replace function public.binder_template_submit_v1(
  p_public_id uuid,
  p_name text,
  p_description text,
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
  v_template public.binder_templates%rowtype;
  v_definition jsonb;
  v_version integer;
  v_version_id uuid;
  v_hash text;
  v_event_id uuid;
  v_response jsonb;
begin
  v_cached := public.binder_idempotency_get_v1(
    v_actor_key, 'binder_template_submit_v1', p_idempotency_key
  );
  if v_cached is not null then return v_cached; end if;
  if not public.binder_feature_enabled_v1('templates')
     or btrim(coalesce(p_name, '')) = ''
     or char_length(btrim(p_name)) > 80
     or not public.binder_text_safe_v1(btrim(p_name), false)
     or char_length(coalesce(p_description, '')) > 1000
     or not public.binder_text_safe_v1(p_description, true) then
    raise exception 'unavailable' using errcode = 'P0001';
  end if;
  select * into v_binder
  from public.binders
  where public_id = p_public_id
  for update;
  if not found
     or v_binder.owner_user_id <> v_uid
     or v_binder.target_kind <> 'custom'
     or v_binder.lifecycle <> 'active'
     or v_binder.moderation_state in ('frozen', 'removed')
     or not public.binder_feature_enabled_v1('custom') then
    raise exception 'unavailable' using errcode = 'P0001';
  end if;
  perform public.binder_rate_limit_assert_v1(v_uid, v_binder.id, 'template_submit', 5, 10);
  select * into v_template
  from public.binder_templates
  where authority_kind = 'custom_owner'
    and source_binder_id = v_binder.id
  for update;
  if not found then
    insert into public.binder_templates (
      authority_kind,
      creator_user_id,
      source_binder_id,
      title,
      description,
      target_kind,
      checklist_mode,
      status,
      latest_version
    ) values (
      'custom_owner',
      v_uid,
      v_binder.id,
      btrim(p_name),
      nullif(p_description, ''),
      'custom',
      'custom',
      'pending',
      0
    )
    returning * into v_template;
  elsif v_template.creator_user_id is distinct from v_uid
     or v_template.moderation_state in ('frozen', 'removed') then
    raise exception 'unavailable' using errcode = 'P0001';
  end if;
  if exists (
    select 1
    from public.binder_template_versions pending
    left join public.binder_template_version_reviews review
      on review.template_version_id = pending.id
    where pending.template_id = v_template.id
      and pending.published_at is null
      and review.id is null
  ) then
    raise exception 'conflict' using errcode = 'P0001';
  end if;

  v_definition := public.binder_template_definition_from_binder_v1(
    v_binder.id,
    btrim(p_name),
    nullif(p_description, '')
  );
  select coalesce(max(version_number), 0) + 1
  into v_version
  from public.binder_template_versions
  where template_id = v_template.id;
  v_hash := encode(
    extensions.digest(convert_to(v_definition::text, 'UTF8'), 'sha256'),
    'hex'
  );
  insert into public.binder_template_versions (
    template_id,
    version_number,
    definition,
    checklist_hash
  ) values (
    v_template.id,
    v_version,
    v_definition,
    v_hash
  )
  returning id into v_version_id;

  v_event_id := public.binder_append_activity_v1(
    p_binder_id => v_binder.id,
    p_event_type => 'template_submitted',
    p_actor_kind => 'user',
    p_actor_user_id => v_uid,
    p_payload => jsonb_build_object(
      'template_public_id', v_template.public_id,
      'version', v_version
    )
  );
  v_response := jsonb_build_object(
    'ok', true,
    'binder_public_id', v_binder.public_id,
    'template_public_id', v_template.public_id,
    'template_version_id', v_version_id,
    'version', v_version,
    'state', 'pending',
    'event_id', v_event_id
  );
  return public.binder_idempotency_store_v1(
    v_actor_key,
    v_uid,
    'binder_template_submit_v1',
    p_idempotency_key,
    v_binder.id,
    v_response
  );
end;
$$;

create or replace function public.binder_service_template_publish_v1(
  p_template_version_id uuid,
  p_decision text,
  p_correlation_id text,
  p_idempotency_key text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_actor_key text := 'service:template_moderation';
  v_cached jsonb;
  v_decision text := lower(btrim(coalesce(p_decision, '')));
  v_version public.binder_template_versions%rowtype;
  v_template public.binder_templates%rowtype;
  v_event_id uuid;
  v_response jsonb;
begin
  perform public.binder_require_service_v1('template_moderation', p_correlation_id);
  v_cached := public.binder_idempotency_get_v1(
    v_actor_key, 'binder_service_template_publish_v1', p_idempotency_key
  );
  if v_cached is not null then return v_cached; end if;
  if v_decision not in ('publish', 'reject') then
    raise exception 'invalid_decision' using errcode = '22023';
  end if;
  select * into v_version
  from public.binder_template_versions
  where id = p_template_version_id
  for update;
  if not found then raise exception 'unavailable' using errcode = 'P0001'; end if;
  select * into v_template
  from public.binder_templates
  where id = v_version.template_id
  for update;
  if not found
     or v_template.moderation_state in ('frozen', 'removed')
     or exists (
       select 1
       from public.binder_template_version_reviews
       where template_version_id = v_version.id
     ) then
    raise exception 'conflict' using errcode = 'P0001';
  end if;

  insert into public.binder_template_version_reviews (
    template_version_id,
    decision,
    correlation_id
  ) values (
    v_version.id,
    case when v_decision = 'publish' then 'published' else 'rejected' end,
    p_correlation_id
  );
  if v_decision = 'publish' then
    update public.binder_template_versions
    set published_at = now()
    where id = v_version.id;
    update public.binder_templates
    set
      title = coalesce(
        nullif(left(btrim(v_version.definition ->> 'template_title'), 80), ''),
        v_template.title
      ),
      description = nullif(v_version.definition ->> 'template_description', ''),
      status = 'published',
      latest_version = v_version.version_number,
      updated_at = now()
    where id = v_template.id
    returning * into v_template;
  elsif v_template.latest_version = 0 then
    update public.binder_templates
    set status = 'rejected', updated_at = now()
    where id = v_template.id
    returning * into v_template;
  end if;

  if v_template.source_binder_id is not null
     and exists (
       select 1 from public.binders where id = v_template.source_binder_id
     ) then
    v_event_id := public.binder_append_activity_v1(
      p_binder_id => v_template.source_binder_id,
      p_event_type => case
        when v_decision = 'publish' then 'template_published'
        else 'template_rejected'
      end,
      p_actor_kind => 'service',
      p_service_source => 'template_moderation',
      p_correlation_id => p_correlation_id,
      p_payload => jsonb_build_object(
        'template_public_id', v_template.public_id,
        'version', v_version.version_number
      )
    );
  end if;
  v_response := jsonb_strip_nulls(jsonb_build_object(
    'ok', true,
    'template_public_id', v_template.public_id,
    'version', v_version.version_number,
    'state', case when v_decision = 'publish' then 'published' else 'rejected' end,
    'event_id', v_event_id
  ));
  return public.binder_idempotency_store_v1(
    v_actor_key,
    null,
    'binder_service_template_publish_v1',
    p_idempotency_key,
    v_template.source_binder_id,
    v_response
  );
end;
$$;

create or replace function public.binder_template_clone_v1(
  p_template_public_id uuid,
  p_title text,
  p_version_number integer,
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
  v_template public.binder_templates%rowtype;
  v_version public.binder_template_versions%rowtype;
  v_definition jsonb;
  v_binder public.binders%rowtype;
  v_event_id uuid;
  v_response jsonb;
begin
  v_cached := public.binder_idempotency_get_v1(
    v_actor_key, 'binder_template_clone_v1', p_idempotency_key
  );
  if v_cached is not null then return v_cached; end if;
  if not public.binder_feature_enabled_v1('templates') then
    raise exception 'unavailable' using errcode = 'P0001';
  end if;
  select * into v_template
  from public.binder_templates
  where public_id = p_template_public_id
    and status = 'published'
    and moderation_state = 'clear';
  if not found then raise exception 'unavailable' using errcode = 'P0001'; end if;
  select * into v_version
  from public.binder_template_versions
  where template_id = v_template.id
    and version_number = coalesce(p_version_number, v_template.latest_version)
    and published_at is not null;
  if not found then raise exception 'unavailable' using errcode = 'P0001'; end if;
  v_definition := v_version.definition;
  if jsonb_typeof(v_definition -> 'slots') <> 'array'
     or jsonb_array_length(v_definition -> 'slots') not between 1 and 1000 then
    raise exception 'unavailable' using errcode = 'P0001';
  end if;

  if v_template.authority_kind = 'system'
     and v_template.target_kind in ('species', 'set') then
    v_binder := public.binder_internal_create_v1(
      p_owner_user_id => v_uid,
      p_title => p_title,
      p_target_kind => v_template.target_kind,
      p_checklist_mode => v_template.checklist_mode,
      p_description => null,
      p_species_id => nullif(v_definition ->> 'species_id', '')::uuid,
      p_set_id => nullif(v_definition ->> 'set_id', '')::uuid
    );
  elsif v_template.target_kind = 'custom' then
    v_binder := public.binder_internal_create_v1(
      p_owner_user_id => v_uid,
      p_title => p_title,
      p_target_kind => 'custom',
      p_checklist_mode => 'custom',
      p_description => null,
      p_custom_slots => v_definition -> 'slots'
    );
  else
    raise exception 'unavailable' using errcode = 'P0001';
  end if;

  insert into public.binder_template_adoptions (
    template_version_id,
    binder_id,
    adopter_user_id
  ) values (
    v_version.id,
    v_binder.id,
    v_uid
  );
  v_event_id := public.binder_append_activity_v1(
    p_binder_id => v_binder.id,
    p_event_type => 'binder_created',
    p_actor_kind => 'user',
    p_actor_user_id => v_uid,
    p_payload => jsonb_build_object(
      'target_kind', v_binder.target_kind,
      'checklist_mode', v_binder.checklist_mode,
      'template_public_id', v_template.public_id,
      'template_version', v_version.version_number
    )
  );
  v_response := jsonb_build_object(
    'ok', true,
    'binder_public_id', v_binder.public_id,
    'template_public_id', v_template.public_id,
    'template_version', v_version.version_number,
    'event_id', v_event_id
  );
  return public.binder_idempotency_store_v1(
    v_actor_key,
    v_uid,
    'binder_template_clone_v1',
    p_idempotency_key,
    v_binder.id,
    v_response
  );
end;
$$;

create or replace function public.binder_legacy_decide_v1(
  p_watch_id uuid,
  p_decision text,
  p_title text,
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
  v_watch public.watches%rowtype;
  v_existing public.binder_legacy_watch_decisions%rowtype;
  v_binder public.binders%rowtype;
  v_default_title text;
  v_response jsonb;
  v_event_id uuid;
begin
  v_cached := public.binder_idempotency_get_v1(
    v_actor_key, 'binder_legacy_decide_v1', p_idempotency_key
  );
  if v_cached is not null then return v_cached; end if;
  if not public.binder_feature_enabled_v1('personal')
     or v_decision not in ('convert', 'dismiss') then
    raise exception 'unavailable' using errcode = 'P0001';
  end if;
  select * into v_watch
  from public.watches
  where id = p_watch_id
    and user_id = v_uid
    and reason = 'manual'
    and subject_type in ('character', 'set')
  for update;
  if not found then raise exception 'unavailable' using errcode = 'P0001'; end if;
  select * into v_existing
  from public.binder_legacy_watch_decisions
  where source_watch_id = v_watch.id;
  if found then
    v_response := jsonb_strip_nulls(jsonb_build_object(
      'ok', true,
      'decision', case when v_existing.decision = 'converted' then 'convert' else 'dismiss' end,
      'binder_public_id', (
        select public_id from public.binders where id = v_existing.resulting_binder_id
      ),
      'already_decided', true
    ));
    return public.binder_idempotency_store_v1(
      v_actor_key,
      v_uid,
      'binder_legacy_decide_v1',
      p_idempotency_key,
      v_existing.resulting_binder_id,
      v_response
    );
  end if;

  if v_decision = 'dismiss' then
    insert into public.binder_legacy_watch_decisions (
      user_id, source_watch_id, decision
    ) values (
      v_uid, v_watch.id, 'dismissed'
    );
    v_response := jsonb_build_object('ok', true, 'decision', 'dismiss');
    return public.binder_idempotency_store_v1(
      v_actor_key, v_uid, 'binder_legacy_decide_v1', p_idempotency_key, null, v_response
    );
  end if;

  if v_watch.subject_type = 'character' then
    select display_name || ' Binder'
    into v_default_title
    from public.pokemon_species
    where id = v_watch.subject_id and active is true;
    if v_default_title is null then
      raise exception 'unavailable' using errcode = 'P0001';
    end if;
    v_binder := public.binder_internal_create_v1(
      p_owner_user_id => v_uid,
      p_title => coalesce(nullif(btrim(p_title), ''), v_default_title),
      p_target_kind => 'species',
      p_checklist_mode => 'card_prints',
      p_species_id => v_watch.subject_id,
      p_legacy_watch_id => v_watch.id
    );
  else
    if not public.binder_feature_enabled_v1('set_binders')
       or to_regprocedure('public.binder_set_slots_authority_v1(uuid)') is null then
      raise exception 'unavailable' using errcode = 'P0001';
    end if;
    select coalesce(nullif(btrim(name), ''), nullif(btrim(code), ''), 'Set') || ' Binder'
    into v_default_title
    from public.sets
    where id = v_watch.subject_id;
    if v_default_title is null then
      raise exception 'unavailable' using errcode = 'P0001';
    end if;
    v_binder := public.binder_internal_create_v1(
      p_owner_user_id => v_uid,
      p_title => coalesce(nullif(btrim(p_title), ''), v_default_title),
      p_target_kind => 'set',
      p_checklist_mode => 'master_set',
      p_set_id => v_watch.subject_id,
      p_legacy_watch_id => v_watch.id
    );
  end if;
  insert into public.binder_legacy_watch_decisions (
    user_id, source_watch_id, decision, resulting_binder_id
  ) values (
    v_uid, v_watch.id, 'converted', v_binder.id
  );
  v_event_id := public.binder_append_activity_v1(
    p_binder_id => v_binder.id,
    p_event_type => 'binder_created',
    p_actor_kind => 'user',
    p_actor_user_id => v_uid,
    p_payload => jsonb_build_object(
      'target_kind', v_binder.target_kind,
      'checklist_mode', v_binder.checklist_mode,
      'legacy_conversion', true
    )
  );
  v_response := jsonb_build_object(
    'ok', true,
    'decision', 'convert',
    'binder_public_id', v_binder.public_id,
    'event_id', v_event_id
  );
  return public.binder_idempotency_store_v1(
    v_actor_key,
    v_uid,
    'binder_legacy_decide_v1',
    p_idempotency_key,
    v_binder.id,
    v_response
  );
end;
$$;

create or replace function public.binder_contribution_current_valid_v1(
  p_contribution_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.binder_contributions c
    join public.binders b on b.id = c.binder_id
    join public.binder_members m
      on m.id = c.contributor_member_id
     and m.binder_id = c.binder_id
     and m.user_id = c.contributor_user_id
     and m.state = 'active'
     and m.role <> 'viewer'
     and m.membership_epoch = c.contributor_membership_epoch
    join public.vault_item_instances vii
      on vii.id = c.vault_item_instance_id
     and vii.user_id = c.contributor_user_id
     and vii.archived_at is null
    left join public.slab_certs slab on slab.id = vii.slab_cert_id
    where c.id = p_contribution_id
      and c.state in ('pending', 'active')
      and b.lifecycle in ('active', 'archived')
      and b.moderation_state <> 'removed'
      and public.binder_gvvi_valid_v1(vii.user_id, vii.gv_vi_id)
      and vii.gv_vi_id = c.snapshot_gv_vi_id
      and coalesce(vii.card_print_id, slab.card_print_id)
            is not distinct from c.snapshot_card_print_id
      and vii.card_printing_id
            is not distinct from c.snapshot_card_printing_id
      and (
        vii.card_printing_id is null
        or exists (
          select 1
          from public.card_printings cpn
          where cpn.id = vii.card_printing_id
            and cpn.card_print_id = coalesce(vii.card_print_id, slab.card_print_id)
        )
      )
      and public.binder_contribution_matches_v1(
        b.id,
        coalesce(vii.card_print_id, slab.card_print_id),
        vii.card_printing_id
      )
      and not public.binder_pair_blocked_v1(m.user_id, b.owner_user_id)
  );
$$;

create or replace function public.binder_invalidate_instance_links_v1(
  p_vault_item_instance_id uuid,
  p_force boolean,
  p_reason text,
  p_service_source text,
  p_correlation_id text
)
returns integer
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_contribution public.binder_contributions%rowtype;
  v_binder_id uuid;
  v_binder_ids uuid[] := '{}'::uuid[];
  v_invalidated integer := 0;
begin
  if p_service_source not in ('vault_lifecycle', 'canonical_catalog')
     or btrim(coalesce(p_correlation_id, '')) = ''
     or char_length(p_correlation_id) > 160
     or char_length(coalesce(p_reason, '')) > 80 then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  if (
    select count(*)
    from public.binder_contributions
    where vault_item_instance_id = p_vault_item_instance_id
      and state in ('pending', 'active')
  ) > 20 then
    raise exception 'binder_instance_fanout_contract_violation' using errcode = '54000';
  end if;

  for v_contribution in
    select *
    from public.binder_contributions
    where vault_item_instance_id = p_vault_item_instance_id
      and state in ('pending', 'active')
    order by id
    for update
  loop
    if coalesce(p_force, false)
       or not public.binder_contribution_current_valid_v1(v_contribution.id) then
      update public.binder_contributions
      set
        state = 'invalidated',
        terminal_by_user_id = null,
        terminal_at = now()
      where id = v_contribution.id;
      perform public.binder_append_activity_v1(
        p_binder_id => v_contribution.binder_id,
        p_event_type => 'contribution_invalidated',
        p_actor_kind => 'service',
        p_service_source => p_service_source,
        p_correlation_id => p_correlation_id || ':' || v_contribution.id::text,
        p_subject_member_id => v_contribution.contributor_member_id,
        p_contribution_id => v_contribution.id,
        p_payload => jsonb_build_object('reason', left(coalesce(p_reason, 'instance_changed'), 80))
      );
      if not v_contribution.binder_id = any(v_binder_ids) then
        v_binder_ids := array_append(v_binder_ids, v_contribution.binder_id);
      end if;
      v_invalidated := v_invalidated + 1;
    end if;
  end loop;
  foreach v_binder_id in array v_binder_ids
  loop
    perform public.binder_progress_recalculate_v1(
      p_binder_id => v_binder_id,
      p_actor_kind => 'service',
      p_service_source => p_service_source,
      p_correlation_id => p_correlation_id || ':progress:' || v_binder_id::text
    );
    update public.binders set updated_at = now() where id = v_binder_id;
  end loop;
  return v_invalidated;
end;
$$;

create or replace function public.binder_vault_instance_guard_v1()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_force boolean := tg_op = 'DELETE';
  v_reason text;
begin
  if tg_op = 'DELETE' then
    v_id := old.id;
    v_reason := 'vault_instance_deleted';
  else
    v_id := new.id;
    v_reason := case
      when new.archived_at is not null and old.archived_at is null then 'vault_instance_archived'
      when new.user_id is distinct from old.user_id then 'vault_owner_changed'
      when new.gv_vi_id is distinct from old.gv_vi_id then 'vault_identity_changed'
      when new.card_print_id is distinct from old.card_print_id then 'canonical_card_changed'
      when new.card_printing_id is distinct from old.card_printing_id then 'canonical_printing_changed'
      when new.slab_cert_id is distinct from old.slab_cert_id then 'slab_anchor_changed'
      else 'vault_instance_changed'
    end;
  end if;
  perform public.binder_invalidate_instance_links_v1(
    v_id,
    v_force,
    v_reason,
    'vault_lifecycle',
    'vault-trigger:' || txid_current()::text || ':' || v_id::text
  );
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_binder_vault_instance_update_v1
on public.vault_item_instances;
create trigger trg_binder_vault_instance_update_v1
after update of user_id, gv_vi_id, card_print_id, card_printing_id,
  slab_cert_id, archived_at
on public.vault_item_instances
for each row execute function public.binder_vault_instance_guard_v1();

drop trigger if exists trg_binder_vault_instance_delete_v1
on public.vault_item_instances;
create trigger trg_binder_vault_instance_delete_v1
before delete on public.vault_item_instances
for each row execute function public.binder_vault_instance_guard_v1();

create or replace function public.binder_slab_identity_guard_v1()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_instance record;
begin
  for v_instance in
    select id
    from public.vault_item_instances
    where slab_cert_id = new.id
    order by id
  loop
    perform public.binder_invalidate_instance_links_v1(
      v_instance.id,
      false,
      'slab_canonical_card_changed',
      'vault_lifecycle',
      'slab-trigger:' || txid_current()::text || ':' || new.id::text
    );
  end loop;
  return new;
end;
$$;

drop trigger if exists trg_binder_slab_identity_update_v1 on public.slab_certs;
create trigger trg_binder_slab_identity_update_v1
after update of card_print_id on public.slab_certs
for each row
when (old.card_print_id is distinct from new.card_print_id)
execute function public.binder_slab_identity_guard_v1();

create or replace function public.binder_service_vault_instance_changed_v1(
  p_vault_item_instance_id uuid,
  p_correlation_id text,
  p_idempotency_key text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_actor_key text := 'service:vault_lifecycle';
  v_cached jsonb;
  v_count integer;
  v_response jsonb;
begin
  perform public.binder_require_service_v1('vault_lifecycle', p_correlation_id);
  v_cached := public.binder_idempotency_get_v1(
    v_actor_key, 'binder_service_vault_instance_changed_v1', p_idempotency_key
  );
  if v_cached is not null then return v_cached; end if;
  v_count := public.binder_invalidate_instance_links_v1(
    p_vault_item_instance_id,
    false,
    'vault_lifecycle_revalidation',
    'vault_lifecycle',
    p_correlation_id
  );
  v_response := jsonb_build_object(
    'ok', true,
    'invalidated_count', v_count
  );
  return public.binder_idempotency_store_v1(
    v_actor_key,
    null,
    'binder_service_vault_instance_changed_v1',
    p_idempotency_key,
    null,
    v_response
  );
end;
$$;

create or replace function public.binder_service_canonical_refresh_v1(
  p_binder_id uuid,
  p_correlation_id text,
  p_idempotency_key text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_actor_key text := 'service:canonical_catalog';
  v_cached jsonb;
  v_binder public.binders%rowtype;
  v_before public.binder_progress_state%rowtype;
  v_after public.binder_progress_state%rowtype;
  v_contribution public.binder_contributions%rowtype;
  v_invalidated integer := 0;
  v_event_id uuid;
  v_response jsonb;
begin
  perform public.binder_require_service_v1('canonical_catalog', p_correlation_id);
  v_cached := public.binder_idempotency_get_v1(
    v_actor_key, 'binder_service_canonical_refresh_v1', p_idempotency_key
  );
  if v_cached is not null then return v_cached; end if;
  select * into v_binder
  from public.binders
  where id = p_binder_id
  for update;
  if not found or v_binder.lifecycle = 'deleted_tombstone' then
    raise exception 'unavailable' using errcode = 'P0001';
  end if;
  if (
    select count(*)
    from public.binder_contributions
    where binder_id = v_binder.id and state in ('pending', 'active')
  ) > 25000 then
    raise exception 'binder_contribution_capacity_contract_violation' using errcode = '54000';
  end if;
  select * into v_before
  from public.binder_progress_state
  where binder_id = v_binder.id;

  for v_contribution in
    select *
    from public.binder_contributions
    where binder_id = v_binder.id
      and state in ('pending', 'active')
    order by id
    for update
  loop
    if not public.binder_contribution_current_valid_v1(v_contribution.id) then
      update public.binder_contributions
      set
        state = 'invalidated',
        terminal_by_user_id = null,
        terminal_at = now()
      where id = v_contribution.id;
      perform public.binder_append_activity_v1(
        p_binder_id => v_binder.id,
        p_event_type => 'contribution_invalidated',
        p_actor_kind => 'service',
        p_service_source => 'canonical_catalog',
        p_correlation_id => p_correlation_id || ':' || v_contribution.id::text,
        p_subject_member_id => v_contribution.contributor_member_id,
        p_contribution_id => v_contribution.id,
        p_payload => jsonb_build_object('reason', 'canonical_revalidation')
      );
      v_invalidated := v_invalidated + 1;
    end if;
  end loop;
  v_after := public.binder_progress_recalculate_v1(
    p_binder_id => v_binder.id,
    p_actor_kind => 'service',
    p_service_source => 'canonical_catalog',
    p_correlation_id => p_correlation_id || ':progress'
  );
  if coalesce(v_before.total_slots, 0) <> v_after.total_slots then
    v_event_id := public.binder_append_activity_v1(
      p_binder_id => v_binder.id,
      p_event_type => 'checklist_updated',
      p_actor_kind => 'service',
      p_service_source => 'canonical_catalog',
      p_correlation_id => p_correlation_id || ':checklist',
      p_payload => jsonb_build_object(
        'previous_total', coalesce(v_before.total_slots, 0),
        'total', v_after.total_slots,
        'definition_revision', v_binder.definition_revision
      )
    );
  end if;
  if v_invalidated > 0
     or coalesce(v_before.total_slots, 0) <> v_after.total_slots then
    update public.binders set updated_at = now() where id = v_binder.id;
  end if;
  v_response := jsonb_strip_nulls(jsonb_build_object(
    'ok', true,
    'binder_public_id', v_binder.public_id,
    'invalidated_count', v_invalidated,
    'previous_total', coalesce(v_before.total_slots, 0),
    'total', v_after.total_slots,
    'completed', v_after.member_completed_slots,
    'event_id', v_event_id
  ));
  return public.binder_idempotency_store_v1(
    v_actor_key,
    null,
    'binder_service_canonical_refresh_v1',
    p_idempotency_key,
    v_binder.id,
    v_response
  );
end;
$$;

create or replace function public.binder_service_moderate_v1(
  p_binder_id uuid,
  p_moderation_state text,
  p_correlation_id text,
  p_idempotency_key text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_actor_key text := 'service:platform_moderation';
  v_cached jsonb;
  v_state text := lower(btrim(coalesce(p_moderation_state, '')));
  v_binder public.binders%rowtype;
  v_contribution public.binder_contributions%rowtype;
  v_row record;
  v_invalidated integer := 0;
  v_invitations integer := 0;
  v_links integer := 0;
  v_join_requests integer := 0;
  v_offers integer := 0;
  v_event_id uuid;
  v_response jsonb;
begin
  perform public.binder_require_service_v1('platform_moderation', p_correlation_id);
  v_cached := public.binder_idempotency_get_v1(
    v_actor_key, 'binder_service_moderate_v1', p_idempotency_key
  );
  if v_cached is not null then return v_cached; end if;
  if v_state not in ('clear', 'forced_unlisted', 'frozen', 'removed') then
    raise exception 'invalid_moderation_state' using errcode = '22023';
  end if;

  select * into v_binder
  from public.binders
  where id = p_binder_id
  for update;
  if not found or v_binder.lifecycle = 'deleted_tombstone' then
    raise exception 'unavailable' using errcode = 'P0001';
  end if;

  if v_binder.moderation_state = v_state then
    v_response := jsonb_build_object(
      'ok', true,
      'binder_public_id', v_binder.public_id,
      'moderation_state', v_state,
      'unchanged', true,
      'invalidated_count', 0,
      'revoked_invitation_count', 0,
      'revoked_view_link_count', 0
    );
    return public.binder_idempotency_store_v1(
      v_actor_key,
      null,
      'binder_service_moderate_v1',
      p_idempotency_key,
      v_binder.id,
      v_response
    );
  end if;

  -- Removal is terminal. Retention and moderator tooling may still inspect
  -- the row, but restoring member/product access requires a separately
  -- contracted revalidation flow and is intentionally unavailable here.
  if v_binder.moderation_state = 'removed' then
    raise exception 'unavailable' using errcode = 'P0001';
  end if;

  if v_state = 'removed' then
    if (
      select count(*)
      from public.binder_contributions
      where binder_id = v_binder.id
        and state in ('pending', 'active')
    ) > 25000 then
      raise exception 'binder_contribution_capacity_contract_violation'
        using errcode = '54000';
    end if;

    for v_contribution in
      select *
      from public.binder_contributions
      where binder_id = v_binder.id
        and state in ('pending', 'active')
      order by id
      for update
    loop
      update public.binder_contributions
      set
        state = 'invalidated',
        terminal_by_user_id = null,
        terminal_at = now()
      where id = v_contribution.id;
      perform public.binder_append_activity_v1(
        p_binder_id => v_binder.id,
        p_event_type => 'contribution_invalidated',
        p_actor_kind => 'service',
        p_service_source => 'platform_moderation',
        p_correlation_id => p_correlation_id || ':contribution:' || v_contribution.id::text,
        p_subject_member_id => v_contribution.contributor_member_id,
        p_contribution_id => v_contribution.id,
        p_payload => jsonb_build_object('reason', 'binder_removed')
      );
      v_invalidated := v_invalidated + 1;
    end loop;

    for v_row in
      select id
      from public.binder_invitations
      where binder_id = v_binder.id and status = 'pending'
      order by id
      for update
    loop
      update public.binder_invitations
      set status = 'revoked', responded_at = now(), revoked_at = now()
      where id = v_row.id;
      perform public.binder_append_activity_v1(
        p_binder_id => v_binder.id,
        p_event_type => 'invitation_revoked',
        p_actor_kind => 'service',
        p_service_source => 'platform_moderation',
        p_correlation_id => p_correlation_id || ':invitation:' || v_row.id::text,
        p_payload => jsonb_build_object('reason', 'binder_removed')
      );
      v_invitations := v_invitations + 1;
    end loop;

    for v_row in
      select id
      from public.binder_view_links
      where binder_id = v_binder.id and status = 'active'
      order by id
      for update
    loop
      update public.binder_view_links
      set status = 'revoked', revoked_at = now()
      where id = v_row.id;
      perform public.binder_append_activity_v1(
        p_binder_id => v_binder.id,
        p_event_type => 'view_link_revoked',
        p_actor_kind => 'service',
        p_service_source => 'platform_moderation',
        p_correlation_id => p_correlation_id || ':view-link:' || v_row.id::text,
        p_payload => jsonb_build_object('reason', 'binder_removed')
      );
      v_links := v_links + 1;
    end loop;

    -- A service close has no auth principal that can lawfully occupy the
    -- decision_user_id field, so pending requests use their terminal
    -- requester-owned "withdrawn" state.
    for v_row in
      select id
      from public.binder_join_requests
      where binder_id = v_binder.id and status = 'pending'
      order by id
      for update
    loop
      update public.binder_join_requests
      set status = 'withdrawn', responded_at = now()
      where id = v_row.id;
      perform public.binder_append_activity_v1(
        p_binder_id => v_binder.id,
        p_event_type => 'join_request_withdrawn',
        p_actor_kind => 'service',
        p_service_source => 'platform_moderation',
        p_correlation_id => p_correlation_id || ':join-request:' || v_row.id::text,
        p_payload => jsonb_build_object('reason', 'binder_removed')
      );
      v_join_requests := v_join_requests + 1;
    end loop;

    for v_row in
      select id, target_member_id
      from public.binder_owner_transfer_offers
      where binder_id = v_binder.id and status = 'pending'
      order by id
      for update
    loop
      update public.binder_owner_transfer_offers
      set status = 'revoked', responded_at = now()
      where id = v_row.id;
      perform public.binder_append_activity_v1(
        p_binder_id => v_binder.id,
        p_event_type => 'owner_transfer_revoked',
        p_actor_kind => 'service',
        p_service_source => 'platform_moderation',
        p_correlation_id => p_correlation_id || ':owner-offer:' || v_row.id::text,
        p_subject_member_id => v_row.target_member_id,
        p_payload => jsonb_build_object('reason', 'binder_removed')
      );
      v_offers := v_offers + 1;
    end loop;
  end if;

  update public.binders
  set moderation_state = v_state, updated_at = now()
  where id = v_binder.id;

  if v_state = 'removed' then
    perform public.binder_progress_recalculate_v1(
      p_binder_id => v_binder.id,
      p_actor_kind => 'service',
      p_service_source => 'platform_moderation',
      p_correlation_id => p_correlation_id || ':progress'
    );
  end if;

  v_event_id := public.binder_append_activity_v1(
    p_binder_id => v_binder.id,
    p_event_type => 'moderation_changed',
    p_actor_kind => 'service',
    p_service_source => 'platform_moderation',
    p_correlation_id => p_correlation_id,
    p_payload => jsonb_build_object(
      'previous_state', v_binder.moderation_state,
      'moderation_state', v_state,
      'invalidated_count', v_invalidated,
      'revoked_invitation_count', v_invitations,
      'revoked_view_link_count', v_links,
      'closed_join_request_count', v_join_requests,
      'revoked_owner_offer_count', v_offers
    )
  );
  v_response := jsonb_build_object(
    'ok', true,
    'binder_public_id', v_binder.public_id,
    'moderation_state', v_state,
    'invalidated_count', v_invalidated,
    'revoked_invitation_count', v_invitations,
    'revoked_view_link_count', v_links,
    'closed_join_request_count', v_join_requests,
    'revoked_owner_offer_count', v_offers,
    'event_id', v_event_id
  );
  return public.binder_idempotency_store_v1(
    v_actor_key,
    null,
    'binder_service_moderate_v1',
    p_idempotency_key,
    v_binder.id,
    v_response
  );
end;
$$;

create or replace function public.binder_service_account_delete_v1(
  p_user_id uuid,
  p_correlation_id text,
  p_idempotency_key text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_actor_key text := 'service:account_deletion';
  v_cached jsonb;
  v_owned integer;
  v_member public.binder_members%rowtype;
  v_contribution public.binder_contributions%rowtype;
  v_row record;
  v_binder_id uuid;
  v_binder_ids uuid[] := '{}'::uuid[];
  v_members_removed integer := 0;
  v_contributions_invalidated integer := 0;
  v_invitations_revoked integer := 0;
  v_requests_withdrawn integer := 0;
  v_offers_revoked integer := 0;
  v_response jsonb;
begin
  perform public.binder_require_service_v1('account_deletion', p_correlation_id);
  if p_user_id is null then
    raise exception 'invalid_user' using errcode = '22023';
  end if;
  v_cached := public.binder_idempotency_get_v1(
    v_actor_key, 'binder_service_account_delete_v1', p_idempotency_key
  );
  if v_cached is not null then return v_cached; end if;

  perform public.binder_advisory_lock_v1(
    'binder:owner-capacity:' || p_user_id::text
  );
  perform public.binder_advisory_lock_v1(
    'binder:membership-user:' || p_user_id::text
  );
  perform public.binder_advisory_lock_v1(
    'binder:invite-recipient:' || p_user_id::text
  );
  select count(*)::integer
  into v_owned
  from public.binders
  where owner_user_id = p_user_id
    and lifecycle in ('active', 'archived');
  if v_owned > 0 then
    v_response := jsonb_build_object(
      'ok', false,
      'code', 'owner_resolution_required',
      'owned_binder_count', v_owned
    );
    return public.binder_idempotency_store_v1(
      v_actor_key,
      null,
      'binder_service_account_delete_v1',
      p_idempotency_key,
      null,
      v_response
    );
  end if;

  -- Every Binder row affected by account scrubbing is locked before any child
  -- row. The deterministic UUID order is shared with Binder lifecycle flows
  -- and prevents membership/contribution/invitation races from forming a
  -- child->Binder deadlock cycle.
  for v_row in
    with affected_binders as (
      select binder_id
      from public.binder_members
      where user_id = p_user_id
         or invited_by_user_id = p_user_id
      union
      select binder_id
      from public.binder_contributions
      where p_user_id in (
        contributor_user_id,
        added_by_user_id,
        decided_by_user_id,
        terminal_by_user_id
      )
      union
      select binder_id
      from public.binder_invitations
      where p_user_id in (
        inviter_user_id,
        intended_user_id,
        accepted_by_user_id
      )
      union
      select binder_id
      from public.binder_join_requests
      where p_user_id in (requester_user_id, decision_user_id)
      union
      select binder_id
      from public.binder_owner_transfer_offers
      where p_user_id in (current_owner_user_id, target_user_id)
      union
      select binder_id
      from public.binder_view_links
      where created_by_user_id = p_user_id
      union
      select source_binder_id
      from public.binder_templates
      where creator_user_id = p_user_id
        and source_binder_id is not null
      union
      select id
      from public.binders
      where owner_user_id = p_user_id
    )
    select b.id
    from public.binders b
    join affected_binders affected on affected.binder_id = b.id
    order by b.id
    for update of b
  loop
    null;
  end loop;

  for v_member in
    select *
    from public.binder_members
    where user_id = p_user_id
      and role <> 'owner'
      and state in ('active', 'suspended')
    order by binder_id, id
    for update
  loop
    for v_contribution in
      select *
      from public.binder_contributions
      where binder_id = v_member.binder_id
        and contributor_member_id = v_member.id
        and state in ('pending', 'active')
      order by id
      for update
    loop
      update public.binder_contributions
      set
        state = 'invalidated',
        contributor_user_id = null,
        added_by_user_id = case
          when added_by_user_id = p_user_id then null
          else added_by_user_id
        end,
        decided_by_user_id = case
          when decided_by_user_id = p_user_id then null
          else decided_by_user_id
        end,
        terminal_by_user_id = null,
        terminal_at = now()
      where id = v_contribution.id;
      perform public.binder_append_activity_v1(
        p_binder_id => v_member.binder_id,
        p_event_type => 'contribution_invalidated',
        p_actor_kind => 'service',
        p_service_source => 'account_deletion',
        p_correlation_id => p_correlation_id || ':contribution:' || v_contribution.id::text,
        p_subject_member_id => v_member.id,
        p_contribution_id => v_contribution.id,
        p_payload => jsonb_build_object('reason', 'account_deleted')
      );
      v_contributions_invalidated := v_contributions_invalidated + 1;
    end loop;

    update public.binder_members
    set
      user_id = null,
      display_alias = null,
      state = 'removed',
      ended_at = now(),
      suspended_at = null,
      content_scope = 'none',
      content_consent_epoch = null,
      content_consent_revision = null,
      identity_scope = 'none',
      identity_consent_epoch = null,
      identity_consent_revision = null,
      invited_by_user_id = case
        when invited_by_user_id = p_user_id then null
        else invited_by_user_id
      end,
      updated_at = now()
    where id = v_member.id;
    perform public.binder_append_activity_v1(
      p_binder_id => v_member.binder_id,
      p_event_type => 'member_removed',
      p_actor_kind => 'service',
      p_service_source => 'account_deletion',
      p_correlation_id => p_correlation_id || ':member:' || v_member.id::text,
      p_subject_member_id => v_member.id,
      p_payload => jsonb_build_object('reason', 'account_deleted', 'role', v_member.role)
    );
    if not v_member.binder_id = any(v_binder_ids) then
      v_binder_ids := array_append(v_binder_ids, v_member.binder_id);
    end if;
    v_members_removed := v_members_removed + 1;
  end loop;

  -- A concurrent Binder deletion can move a membership to a terminal state
  -- before this account-deletion flow reaches the member loop. Scrub terminal
  -- membership identity as well so correctness does not depend on the later
  -- auth.users cascade or retention finalizer.
  update public.binder_members
  set
    user_id = null,
    display_alias = null,
    invited_by_user_id = case
      when invited_by_user_id = p_user_id then null
      else invited_by_user_id
    end,
    updated_at = now()
  where user_id = p_user_id;

  -- Scrub the deleted principal from already-terminal contribution fields too.
  update public.binder_contributions
  set
    contributor_user_id = case
      when contributor_user_id = p_user_id then null
      else contributor_user_id
    end,
    added_by_user_id = case
      when added_by_user_id = p_user_id then null
      else added_by_user_id
    end,
    decided_by_user_id = case
      when decided_by_user_id = p_user_id then null
      else decided_by_user_id
    end,
    terminal_by_user_id = case
      when terminal_by_user_id = p_user_id then null
      else terminal_by_user_id
    end
  where state not in ('pending', 'active')
    and p_user_id in (
      contributor_user_id,
      added_by_user_id,
      decided_by_user_id,
      terminal_by_user_id
    );

  for v_row in
    select id, binder_id
    from public.binder_invitations
    where status = 'pending'
      and (intended_user_id = p_user_id or inviter_user_id = p_user_id)
    order by binder_id, id
    for update
  loop
    update public.binder_invitations
    set
      status = 'revoked',
      intended_user_id = case
        when intended_user_id = p_user_id then null
        else intended_user_id
      end,
      inviter_user_id = case
        when inviter_user_id = p_user_id then null
        else inviter_user_id
      end,
      responded_at = now(),
      revoked_at = now()
    where id = v_row.id;
    perform public.binder_append_activity_v1(
      p_binder_id => v_row.binder_id,
      p_event_type => 'invitation_revoked',
      p_actor_kind => 'service',
      p_service_source => 'account_deletion',
      p_correlation_id => p_correlation_id || ':invitation:' || v_row.id::text,
      p_payload => jsonb_build_object('reason', 'account_deleted')
    );
    update public.binders set updated_at = now() where id = v_row.binder_id;
    v_invitations_revoked := v_invitations_revoked + 1;
  end loop;

  update public.binder_invitations
  set
    intended_user_id = case
      when intended_user_id = p_user_id then null
      else intended_user_id
    end,
    inviter_user_id = case
      when inviter_user_id = p_user_id then null
      else inviter_user_id
    end,
    accepted_by_user_id = case
      when accepted_by_user_id = p_user_id then null
      else accepted_by_user_id
    end
  where status <> 'pending'
    and p_user_id in (intended_user_id, inviter_user_id, accepted_by_user_id);

  for v_row in
    select id, binder_id
    from public.binder_join_requests
    where status = 'pending' and requester_user_id = p_user_id
    order by binder_id, id
    for update
  loop
    update public.binder_join_requests
    set status = 'withdrawn', requester_user_id = null, responded_at = now()
    where id = v_row.id;
    perform public.binder_append_activity_v1(
      p_binder_id => v_row.binder_id,
      p_event_type => 'join_request_withdrawn',
      p_actor_kind => 'service',
      p_service_source => 'account_deletion',
      p_correlation_id => p_correlation_id || ':join-request:' || v_row.id::text,
      p_payload => jsonb_build_object('reason', 'account_deleted')
    );
    update public.binders set updated_at = now() where id = v_row.binder_id;
    v_requests_withdrawn := v_requests_withdrawn + 1;
  end loop;

  update public.binder_join_requests
  set
    requester_user_id = case
      when requester_user_id = p_user_id then null
      else requester_user_id
    end,
    decision_user_id = case
      when decision_user_id = p_user_id then null
      else decision_user_id
    end
  where status <> 'pending'
    and p_user_id in (requester_user_id, decision_user_id);

  for v_row in
    select id, binder_id, target_member_id
    from public.binder_owner_transfer_offers
    where status = 'pending'
      and (target_user_id = p_user_id or current_owner_user_id = p_user_id)
    order by binder_id, id
    for update
  loop
    update public.binder_owner_transfer_offers
    set
      status = 'revoked',
      target_user_id = case
        when target_user_id = p_user_id then null
        else target_user_id
      end,
      current_owner_user_id = case
        when current_owner_user_id = p_user_id then null
        else current_owner_user_id
      end,
      responded_at = now()
    where id = v_row.id;
    perform public.binder_append_activity_v1(
      p_binder_id => v_row.binder_id,
      p_event_type => 'owner_transfer_revoked',
      p_actor_kind => 'service',
      p_service_source => 'account_deletion',
      p_correlation_id => p_correlation_id || ':owner-offer:' || v_row.id::text,
      p_subject_member_id => v_row.target_member_id,
      p_payload => jsonb_build_object('reason', 'account_deleted')
    );
    update public.binders set updated_at = now() where id = v_row.binder_id;
    v_offers_revoked := v_offers_revoked + 1;
  end loop;

  update public.binder_owner_transfer_offers
  set
    target_user_id = case
      when target_user_id = p_user_id then null
      else target_user_id
    end,
    current_owner_user_id = case
      when current_owner_user_id = p_user_id then null
      else current_owner_user_id
    end
  where status <> 'pending'
    and p_user_id in (target_user_id, current_owner_user_id);

  update public.binder_members
  set invited_by_user_id = null, updated_at = now()
  where invited_by_user_id = p_user_id;

  update public.binder_view_links
  set created_by_user_id = null
  where created_by_user_id = p_user_id;

  update public.binder_templates
  set
    creator_user_id = null,
    status = 'removed',
    moderation_state = 'removed',
    updated_at = now()
  where authority_kind = 'custom_owner'
    and creator_user_id = p_user_id;

  update public.binders
  set owner_user_id = null, updated_at = now()
  where owner_user_id = p_user_id
    and lifecycle = 'deleted_tombstone';

  foreach v_binder_id in array v_binder_ids
  loop
    perform public.binder_progress_recalculate_v1(
      p_binder_id => v_binder_id,
      p_actor_kind => 'service',
      p_service_source => 'account_deletion',
      p_correlation_id => p_correlation_id || ':progress:' || v_binder_id::text
    );
    update public.binders set updated_at = now() where id = v_binder_id;
  end loop;

  v_response := jsonb_build_object(
    'ok', true,
    'memberships_removed', v_members_removed,
    'contributions_invalidated', v_contributions_invalidated,
    'invitations_revoked', v_invitations_revoked,
    'join_requests_withdrawn', v_requests_withdrawn,
    'owner_offers_revoked', v_offers_revoked
  );
  return public.binder_idempotency_store_v1(
    v_actor_key,
    null,
    'binder_service_account_delete_v1',
    p_idempotency_key,
    null,
    v_response
  );
end;
$$;

create or replace function public.binder_service_retention_finalize_v1(
  p_binder_id uuid,
  p_correlation_id text,
  p_idempotency_key text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_actor_key text := 'service:retention';
  v_cached jsonb;
  v_binder public.binders%rowtype;
  v_event_id uuid;
  v_response jsonb;
begin
  perform public.binder_require_service_v1('retention', p_correlation_id);
  v_cached := public.binder_idempotency_get_v1(
    v_actor_key, 'binder_service_retention_finalize_v1', p_idempotency_key
  );
  if v_cached is not null then return v_cached; end if;
  select * into v_binder
  from public.binders
  where id = p_binder_id
  for update;
  if not found
     or v_binder.lifecycle <> 'deleted_tombstone'
     or exists (
       select 1 from public.binder_members
       where binder_id = v_binder.id and state in ('active', 'suspended')
     )
     or exists (
       select 1 from public.binder_contributions
       where binder_id = v_binder.id and state in ('pending', 'active')
     )
     or exists (
       select 1 from public.binder_invitations
       where binder_id = v_binder.id and status = 'pending'
     )
     or exists (
       select 1 from public.binder_view_links
       where binder_id = v_binder.id and status = 'active'
     ) then
    raise exception 'unavailable' using errcode = 'P0001';
  end if;

  -- Immutable activity, adoption, crossing, and idempotency rows remain the
  -- approved internal audit record. Mutable auth foreign keys and user copy
  -- are removed without deleting Binder or Vault history.
  update public.binder_members
  set
    user_id = null,
    invited_by_user_id = null,
    display_alias = null,
    updated_at = now()
  where binder_id = v_binder.id;
  update public.binder_contributions
  set
    contributor_user_id = null,
    added_by_user_id = null,
    decided_by_user_id = null,
    terminal_by_user_id = null
  where binder_id = v_binder.id;
  update public.binder_invitations
  set
    inviter_user_id = null,
    intended_user_id = null,
    accepted_by_user_id = null
  where binder_id = v_binder.id;
  update public.binder_view_links
  set created_by_user_id = null
  where binder_id = v_binder.id;
  update public.binder_join_requests
  set requester_user_id = null, decision_user_id = null
  where binder_id = v_binder.id;
  update public.binder_owner_transfer_offers
  set current_owner_user_id = null, target_user_id = null
  where binder_id = v_binder.id;
  update public.binders
  set
    owner_user_id = null,
    title = 'Deleted Binder',
    description = null,
    cover_card_print_id = null,
    legacy_watch_id = null,
    updated_at = now()
  where id = v_binder.id;

  v_event_id := public.binder_append_activity_v1(
    p_binder_id => v_binder.id,
    p_event_type => 'retention_finalized',
    p_actor_kind => 'service',
    p_service_source => 'retention',
    p_correlation_id => p_correlation_id
  );
  v_response := jsonb_build_object(
    'ok', true,
    'binder_public_id', v_binder.public_id,
    'retention_state', 'finalized',
    'event_id', v_event_id
  );
  return public.binder_idempotency_store_v1(
    v_actor_key,
    null,
    'binder_service_retention_finalize_v1',
    p_idempotency_key,
    v_binder.id,
    v_response
  );
end;
$$;

create or replace function public.binder_service_expire_capabilities_v1(
  p_before timestamptz,
  p_limit integer,
  p_correlation_id text,
  p_idempotency_key text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_actor_key text := 'service:capability_expiry';
  v_cached jsonb;
  v_cutoff timestamptz := least(coalesce(p_before, now()), now());
  v_limit integer := least(greatest(coalesce(p_limit, 100), 1), 100);
  v_capability record;
  v_changed_binder_id uuid;
  v_processed integer := 0;
  v_invitations integer := 0;
  v_links integer := 0;
  v_offers integer := 0;
  v_has_more boolean;
  v_response jsonb;
begin
  perform public.binder_require_service_v1('capability_expiry', p_correlation_id);
  v_cached := public.binder_idempotency_get_v1(
    v_actor_key, 'binder_service_expire_capabilities_v1', p_idempotency_key
  );
  if v_cached is not null then return v_cached; end if;

  for v_capability in
    select *
    from (
      select
        'invitation'::text as capability_kind,
        i.id,
        i.binder_id,
        null::uuid as subject_member_id,
        i.expires_at
      from public.binder_invitations i
      where i.status = 'pending' and i.expires_at <= v_cutoff
      union all
      select
        'view_link'::text,
        l.id,
        l.binder_id,
        null::uuid,
        l.expires_at
      from public.binder_view_links l
      where l.status = 'active'
        and l.expires_at is not null
        and l.expires_at <= v_cutoff
      union all
      select
        'owner_offer'::text,
        o.id,
        o.binder_id,
        o.target_member_id,
        o.expires_at
      from public.binder_owner_transfer_offers o
      where o.status = 'pending' and o.expires_at <= v_cutoff
    ) candidates
    order by expires_at, id
    limit v_limit
  loop
    v_changed_binder_id := null;
    if v_capability.capability_kind = 'invitation' then
      update public.binder_invitations
      set status = 'expired', responded_at = now()
      where id = v_capability.id
        and status = 'pending'
        and expires_at <= v_cutoff
      returning binder_id into v_changed_binder_id;
      if v_changed_binder_id is not null then
        perform public.binder_append_activity_v1(
          p_binder_id => v_changed_binder_id,
          p_event_type => 'invitation_expired',
          p_actor_kind => 'service',
          p_service_source => 'capability_expiry',
          p_correlation_id => p_correlation_id || ':invitation:' || v_capability.id::text
        );
        v_invitations := v_invitations + 1;
      end if;
    elsif v_capability.capability_kind = 'view_link' then
      update public.binder_view_links
      set status = 'expired'
      where id = v_capability.id
        and status = 'active'
        and expires_at is not null
        and expires_at <= v_cutoff
      returning binder_id into v_changed_binder_id;
      if v_changed_binder_id is not null then
        perform public.binder_append_activity_v1(
          p_binder_id => v_changed_binder_id,
          p_event_type => 'view_link_expired',
          p_actor_kind => 'service',
          p_service_source => 'capability_expiry',
          p_correlation_id => p_correlation_id || ':view-link:' || v_capability.id::text
        );
        v_links := v_links + 1;
      end if;
    else
      update public.binder_owner_transfer_offers
      set status = 'expired', responded_at = now()
      where id = v_capability.id
        and status = 'pending'
        and expires_at <= v_cutoff
      returning binder_id into v_changed_binder_id;
      if v_changed_binder_id is not null then
        perform public.binder_append_activity_v1(
          p_binder_id => v_changed_binder_id,
          p_event_type => 'owner_transfer_expired',
          p_actor_kind => 'service',
          p_service_source => 'capability_expiry',
          p_correlation_id => p_correlation_id || ':owner-offer:' || v_capability.id::text,
          p_subject_member_id => v_capability.subject_member_id
        );
        v_offers := v_offers + 1;
      end if;
    end if;
    if v_changed_binder_id is not null then
      update public.binders set updated_at = now()
      where id = v_changed_binder_id;
      v_processed := v_processed + 1;
    end if;
  end loop;

  v_has_more :=
    exists (
      select 1 from public.binder_invitations
      where status = 'pending' and expires_at <= v_cutoff
    )
    or exists (
      select 1 from public.binder_view_links
      where status = 'active'
        and expires_at is not null
        and expires_at <= v_cutoff
    )
    or exists (
      select 1 from public.binder_owner_transfer_offers
      where status = 'pending' and expires_at <= v_cutoff
    );
  v_response := jsonb_build_object(
    'ok', true,
    'processed_count', v_processed,
    'invitation_count', v_invitations,
    'view_link_count', v_links,
    'owner_offer_count', v_offers,
    'has_more', v_has_more
  );
  return public.binder_idempotency_store_v1(
    v_actor_key,
    null,
    'binder_service_expire_capabilities_v1',
    p_idempotency_key,
    null,
    v_response
  );
end;
$$;

create or replace function public.binder_pulse_milestone_share_v1(
  p_public_id uuid,
  p_threshold integer,
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
  v_progress public.binder_progress_state%rowtype;
  v_percent integer;
  v_dedupe_key text;
  v_pulse_event_id uuid;
  v_activity_event_id uuid;
  v_response jsonb;
begin
  v_cached := public.binder_idempotency_get_v1(
    v_actor_key, 'binder_pulse_milestone_share_v1', p_idempotency_key
  );
  if v_cached is not null then return v_cached; end if;
  if p_threshold not in (25, 50, 75, 90, 100)
     or not public.binder_feature_enabled_v1('public')
     or not public.binder_feature_enabled_v1('pulse_milestones')
     or not public.interest_graph_collector_public_v1(v_uid) then
    raise exception 'unavailable' using errcode = 'P0001';
  end if;

  select * into v_binder
  from public.binders
  where public_id = p_public_id
  for update;
  if not found
     or v_binder.owner_user_id <> v_uid
     or v_binder.lifecycle <> 'active'
     or v_binder.moderation_state <> 'clear'
     or v_binder.read_access <> 'public'
     or v_binder.discoverability <> 'listed' then
    raise exception 'unavailable' using errcode = 'P0001';
  end if;
  select * into v_progress
  from public.binder_progress_state
  where binder_id = v_binder.id;
  if not found or v_progress.total_slots < 1 then
    raise exception 'unavailable' using errcode = 'P0001';
  end if;
  v_percent := round(
    (v_progress.public_completed_slots::numeric / v_progress.total_slots::numeric) * 100
  )::integer;
  if v_percent < p_threshold
     or not exists (
       select 1
       from public.binder_progress_crossings crossing
       where crossing.binder_id = v_binder.id
         and crossing.definition_revision = v_binder.definition_revision
         and crossing.threshold = p_threshold
     ) then
    raise exception 'unavailable' using errcode = 'P0001';
  end if;

  perform public.binder_rate_limit_assert_v1(v_uid, v_binder.id, 'pulse_milestone_share', 5, 20);
  v_dedupe_key := concat_ws(
    ':',
    'binder-milestone',
    v_binder.public_id::text,
    v_binder.definition_revision::text,
    p_threshold::text
  );
  select id into v_pulse_event_id
  from public.card_events
  where dedupe_key = v_dedupe_key;
  if v_pulse_event_id is not null then
    v_response := jsonb_build_object(
      'ok', true,
      'binder_public_id', v_binder.public_id,
      'threshold', p_threshold,
      'completed_slots', v_progress.public_completed_slots,
      'total_slots', v_progress.total_slots,
      'unit', v_progress.unit,
      'percent', v_percent,
      'pulse_event_id', v_pulse_event_id,
      'already_shared', true
    );
    return public.binder_idempotency_store_v1(
      v_actor_key,
      v_uid,
      'binder_pulse_milestone_share_v1',
      p_idempotency_key,
      v_binder.id,
      v_response
    );
  end if;

  v_pulse_event_id := public.interest_graph_emit_event_v1(
    'binder_pulse_milestone_share_v1',
    'binder_milestone_shared',
    null,
    v_uid,
    null,
    jsonb_build_object(
      'binder_public_id', v_binder.public_id,
      'title', v_binder.title,
      'definition_revision', v_binder.definition_revision,
      'threshold', p_threshold,
      'completed', v_progress.public_completed_slots,
      'total', v_progress.total_slots,
      'unit', v_progress.unit
    ),
    'public',
    v_dedupe_key
  );
  if v_pulse_event_id is null then
    select id into v_pulse_event_id
    from public.card_events
    where dedupe_key = v_dedupe_key;
  end if;
  if v_pulse_event_id is null then
    v_response := jsonb_build_object('ok', false, 'code', 'unavailable');
    return public.binder_idempotency_store_v1(
      v_actor_key,
      v_uid,
      'binder_pulse_milestone_share_v1',
      p_idempotency_key,
      v_binder.id,
      v_response
    );
  end if;

  v_activity_event_id := public.binder_append_activity_v1(
    p_binder_id => v_binder.id,
    p_event_type => 'milestone_shared_to_pulse',
    p_actor_kind => 'user',
    p_actor_user_id => v_uid,
    p_payload => jsonb_build_object(
      'definition_revision', v_binder.definition_revision,
      'threshold', p_threshold,
      'completed_slots', v_progress.public_completed_slots,
      'total_slots', v_progress.total_slots,
      'unit', v_progress.unit
    )
  );
  v_response := jsonb_build_object(
    'ok', true,
    'binder_public_id', v_binder.public_id,
    'threshold', p_threshold,
    'completed_slots', v_progress.public_completed_slots,
    'total_slots', v_progress.total_slots,
    'unit', v_progress.unit,
    'percent', v_percent,
    'pulse_event_id', v_pulse_event_id,
    'activity_event_id', v_activity_event_id,
    'already_shared', false
  );
  return public.binder_idempotency_store_v1(
    v_actor_key,
    v_uid,
    'binder_pulse_milestone_share_v1',
    p_idempotency_key,
    v_binder.id,
    v_response
  );
end;
$$;

create or replace function public.binder_public_action_resolve_v1(
  p_binder_public_id uuid,
  p_surface text,
  p_action_ref uuid,
  p_viewer_user_id uuid
)
returns table (
  binder_id uuid,
  internal_surface_id uuid,
  target_member_id uuid,
  target_user_id uuid
)
language sql
stable
security definer
set search_path = public
as $$
  with contribution_target as (
    select
      b.id as binder_id,
      c.id as internal_surface_id,
      m.id as target_member_id,
      m.user_id as target_user_id
    from public.binders b
    join public.binder_contributions c
      on c.binder_id = b.id
     and c.public_action_ref = p_action_ref
     and c.state = 'active'
    join public.binder_members m
      on m.id = c.contributor_member_id
     and m.binder_id = c.binder_id
     and m.user_id = c.contributor_user_id
     and m.state = 'active'
     and m.role <> 'viewer'
     and m.membership_epoch = c.contributor_membership_epoch
    where lower(btrim(coalesce(p_surface, ''))) = 'contribution'
      and b.public_id = p_binder_public_id
      and public.binder_contribution_current_valid_v1(c.id)
  ),
  member_target as (
    select
      b.id as binder_id,
      m.id as internal_surface_id,
      m.id as target_member_id,
      m.user_id as target_user_id
    from public.binders b
    join public.binder_members m
      on m.binder_id = b.id
     and m.public_action_ref = p_action_ref
     and m.state = 'active'
     and m.role <> 'viewer'
     and m.user_id is not null
    where lower(btrim(coalesce(p_surface, ''))) = 'member'
      and b.public_id = p_binder_public_id
      and exists (
        select 1
        from public.binder_contributions c
        where c.binder_id = b.id
          and c.contributor_member_id = m.id
          and c.contributor_user_id = m.user_id
          and c.contributor_membership_epoch = m.membership_epoch
          and c.state = 'active'
          and public.binder_contribution_current_valid_v1(c.id)
      )
  ),
  targets as (
    select * from contribution_target
    union all
    select * from member_target
  )
  select
    target.binder_id,
    target.internal_surface_id,
    target.target_member_id,
    target.target_user_id
  from targets target
  join public.binders b on b.id = target.binder_id
  join public.binder_members m on m.id = target.target_member_id
  where p_viewer_user_id is not null
    and target.target_user_id <> p_viewer_user_id
    and public.binder_feature_enabled_v1('schema_internal')
    and public.binder_feature_enabled_v1('public')
    and b.lifecycle = 'active'
    and b.moderation_state not in ('frozen', 'removed')
    and b.read_access = 'public'
    and public.binder_target_enabled_v1(b.id)
    and m.content_scope = 'public'
    and m.content_consent_epoch = m.membership_epoch
    and m.content_consent_revision = b.external_projection_revision
    and not public.binder_pair_blocked_v1(
      target.target_user_id,
      b.owner_user_id
    )
    and not public.binder_pair_blocked_v1(
      p_viewer_user_id,
      b.owner_user_id
    )
    and not public.binder_pair_blocked_v1(
      p_viewer_user_id,
      target.target_user_id
    )
  limit 1;
$$;

create or replace function public.binder_public_action_report_v1(
  p_public_id uuid,
  p_surface text,
  p_action_ref uuid,
  p_reason text,
  p_details text,
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
  v_surface text := lower(btrim(coalesce(p_surface, '')));
  v_reason text := lower(btrim(coalesce(p_reason, 'other')));
  v_target record;
  v_response jsonb := jsonb_build_object('ok', true);
begin
  v_cached := public.binder_idempotency_get_v1(
    v_actor_key,
    'binder_public_action_report_v1',
    p_idempotency_key
  );
  if v_cached is not null then return v_cached; end if;
  if p_public_id is null
     or p_action_ref is null
     or v_surface not in ('contribution', 'member')
     or v_reason not in (
       'spam',
       'harassment',
       'scam',
       'inappropriate',
       'other'
     )
     or char_length(coalesce(p_details, '')) > 2000
     or not public.binder_text_safe_v1(p_details, true) then
    raise exception 'invalid_report' using errcode = '22023';
  end if;

  perform public.binder_rate_limit_assert_v1(
    v_uid,
    null,
    'public_action_report',
    10,
    20
  );

  select * into v_target
  from public.binder_public_action_resolve_v1(
    p_public_id,
    v_surface,
    p_action_ref,
    v_uid
  );
  if found then
    insert into public.trust_reports (
      reporter_user_id,
      reported_user_id,
      surface,
      surface_id,
      reason,
      details
    ) values (
      v_uid,
      v_target.target_user_id,
      case
        when v_surface = 'contribution' then 'binder_contribution'
        else 'binder_member'
      end,
      v_target.internal_surface_id::text,
      v_reason,
      nullif(p_details, '')
    );
  end if;

  return public.binder_idempotency_store_v1(
    v_actor_key,
    v_uid,
    'binder_public_action_report_v1',
    p_idempotency_key,
    v_target.binder_id,
    v_response
  );
end;
$$;

create or replace function public.binder_public_member_block_v1(
  p_public_id uuid,
  p_member_action_ref uuid,
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
  v_target record;
  v_response jsonb := jsonb_build_object('ok', true);
begin
  v_cached := public.binder_idempotency_get_v1(
    v_actor_key,
    'binder_public_member_block_v1',
    p_idempotency_key
  );
  if v_cached is not null then return v_cached; end if;
  if p_public_id is null or p_member_action_ref is null then
    raise exception 'invalid_block' using errcode = '22023';
  end if;

  perform public.binder_rate_limit_assert_v1(
    v_uid,
    null,
    'public_member_block',
    10,
    20
  );

  select * into v_target
  from public.binder_public_action_resolve_v1(
    p_public_id,
    'member',
    p_member_action_ref,
    v_uid
  );
  if found then
    insert into public.trust_blocks (user_id, blocked_user_id)
    values (v_uid, v_target.target_user_id)
    on conflict (user_id, blocked_user_id) do nothing;
    perform public.binder_apply_block_pair_v1(
      v_uid,
      v_target.target_user_id
    );
  end if;

  return public.binder_idempotency_store_v1(
    v_actor_key,
    v_uid,
    'binder_public_member_block_v1',
    p_idempotency_key,
    v_target.binder_id,
    v_response
  );
end;
$$;

-- Sanitized Realtime authority. This is the only Binder table added to the
-- Realtime publication. It intentionally contains no internal Binder id,
-- activity type, actor, member, contribution, policy, or payload fields.
create table public.binder_refresh_signals (
  binder_public_id uuid primary key
    references public.binders(public_id) on delete cascade,
  revision bigint not null default 1,
  changed_at timestamptz not null default now(),
  constraint binder_refresh_signals_revision_check check (revision >= 1)
);

alter table public.binder_refresh_signals enable row level security;
alter table public.binder_refresh_signals replica identity full;

revoke all on table public.binder_refresh_signals
from public, anon, authenticated;
grant select on table public.binder_refresh_signals to authenticated;
grant all on table public.binder_refresh_signals to service_role;

create or replace function public.binder_refresh_signal_visible_v1(
  p_binder_public_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.binder_feature_enabled_v1('schema_internal')
    and exists (
      select 1
      from public.binders b
      join public.binder_members m
        on m.binder_id = b.id
       and m.user_id = auth.uid()
       and m.state = 'active'
      where b.public_id = p_binder_public_id
        and b.lifecycle <> 'deleted_tombstone'
        and b.moderation_state <> 'removed'
    );
$$;

revoke all on function public.binder_refresh_signal_visible_v1(uuid)
from public, anon, authenticated;
grant execute on function public.binder_refresh_signal_visible_v1(uuid)
to authenticated, service_role;

create policy binder_refresh_signals_active_member_select_v1
on public.binder_refresh_signals
for select
to authenticated
using (
  public.binder_refresh_signal_visible_v1(binder_public_id)
);

create policy binder_refresh_signals_service_role_all_v1
on public.binder_refresh_signals
for all
to service_role
using (true)
with check (true);

create or replace function public.binder_activity_refresh_signal_v1()
returns trigger
language plpgsql
volatile
security definer
set search_path = public
as $$
begin
  insert into public.binder_refresh_signals (
    binder_public_id,
    revision,
    changed_at
  )
  select
    b.public_id,
    1,
    new.created_at
  from public.binders b
  where b.id = new.binder_id
  on conflict (binder_public_id) do update
    set revision = public.binder_refresh_signals.revision + 1,
        changed_at = greatest(
          public.binder_refresh_signals.changed_at,
          excluded.changed_at
        );

  return new;
end;
$$;

create trigger trg_binder_activity_refresh_signal_v1
after insert on public.binder_activity_events
for each row execute function public.binder_activity_refresh_signal_v1();

revoke all on function public.binder_activity_refresh_signal_v1()
from public, anon, authenticated;
grant execute on function public.binder_activity_refresh_signal_v1()
to service_role;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'binder_refresh_signals'
  ) then
    alter publication supabase_realtime
      add table public.binder_refresh_signals;
  end if;
end;
$$;

comment on table public.binder_refresh_signals is
'Sanitized member-only Realtime invalidation signal. Clients debounce INSERT/UPDATE and re-fetch guarded Binder RPCs; this table carries no domain payload.';

-- Preserve the existing card/watch Pulse eligibility implementation, then extend
-- its public contract with an explicitly shared, cardless Binder milestone lane.
-- Renaming keeps the pre-Binder implementation byte-for-byte intact while the
-- replacement below remains the canonical function consumed by Pulse reads and
-- daily delivery.
alter function public.pulse_eligible_events_for_viewer_v1(uuid)
rename to binder_pulse_base_eligible_events_for_viewer_v1;

create or replace function public.pulse_eligible_events_for_viewer_v1(
  p_viewer_user_id uuid
)
returns table (
  card_event_id uuid,
  event_type text,
  rank_bucket text,
  bucket_rank integer,
  created_at timestamptz,
  actor_user_id uuid,
  actor_slug text,
  actor_display_name text,
  actor_avatar_path text,
  subject_user_id uuid,
  subject_slug text,
  subject_display_name text,
  card_print_id uuid,
  gv_id text,
  card_name text,
  set_code text,
  set_name text,
  card_number text,
  display_image_url text,
  display_image_kind text,
  ownership_context text,
  distance_bucket text,
  locality_label text,
  value_delta_amount numeric,
  value_delta_percent numeric,
  completion_subject_type text,
  completion_subject_label text,
  completion_threshold numeric,
  primary_action text,
  primary_action_label text,
  primary_action_route text,
  payload jsonb,
  visibility text,
  watch_subject_type text,
  watch_subject_id uuid,
  watch_strength double precision
)
language sql
stable
security definer
set search_path = public
as $$
  select *
  from public.binder_pulse_base_eligible_events_for_viewer_v1(p_viewer_user_id)

  union all

  select
    e.id as card_event_id,
    e.event_type,
    'completion'::text as rank_bucket,
    4::integer as bucket_rank,
    e.created_at,
    e.actor_user_id,
    actor_profile.slug as actor_slug,
    actor_profile.display_name as actor_display_name,
    actor_profile.avatar_path as actor_avatar_path,
    null::uuid as subject_user_id,
    null::text as subject_slug,
    null::text as subject_display_name,
    null::uuid as card_print_id,
    null::text as gv_id,
    null::text as card_name,
    null::text as set_code,
    null::text as set_name,
    null::text as card_number,
    nullif(cover.card ->> 'image_url', '') as display_image_url,
    case
      when nullif(cover.card ->> 'image_url', '') is not null then 'exact'
      else 'missing'
    end::text as display_image_kind,
    null::text as ownership_context,
    null::text as distance_bucket,
    null::text as locality_label,
    null::numeric as value_delta_amount,
    null::numeric as value_delta_percent,
    'binder'::text as completion_subject_type,
    b.title as completion_subject_label,
    case
      when nullif(e.payload ->> 'threshold', '') ~ '^[0-9]+$'
        then (e.payload ->> 'threshold')::numeric
      else null::numeric
    end as completion_threshold,
    'open_binder'::text as primary_action,
    'View Binder'::text as primary_action_label,
    '/binders/' || b.public_id::text as primary_action_route,
    e.payload,
    e.visibility,
    w.subject_type as watch_subject_type,
    w.subject_id as watch_subject_id,
    w.strength as watch_strength
  from public.card_events e
  join public.binders b
    on b.public_id = public.pulse_jsonb_uuid_v1(e.payload ->> 'binder_public_id')
   and b.owner_user_id = e.actor_user_id
  join public.watches w
    on w.user_id = p_viewer_user_id
   and w.subject_type = 'collector'
   and w.subject_id = e.actor_user_id
   and w.muted_at is null
  left join public.public_profiles actor_profile
    on actor_profile.user_id = e.actor_user_id
  left join lateral (
    select public.binder_card_json_v1(b.cover_card_print_id, null) as card
  ) cover on true
  where e.event_type = 'binder_milestone_shared'
    and e.visibility = 'public'
    and nullif(e.payload ->> 'definition_revision', '') ~ '^[0-9]+$'
    and (e.payload ->> 'definition_revision')::integer = b.definition_revision
    and b.lifecycle = 'active'
    and b.moderation_state = 'clear'
    and b.read_access = 'public'
    and b.discoverability = 'listed'
    and public.binder_feature_enabled_v1('schema_internal')
    and public.binder_feature_enabled_v1('public')
    and public.binder_feature_enabled_v1('pulse_milestones')
    and public.binder_target_enabled_v1(b.id)
    and public.interest_graph_collector_public_v1(b.owner_user_id)
    and public.interest_graph_card_event_visible_to_viewer_v1(
      p_viewer_user_id,
      e.actor_user_id,
      e.subject_user_id,
      e.visibility
    )
    and not public.binder_pair_blocked_v1(p_viewer_user_id, b.owner_user_id);
$$;

create or replace function public.binder_card_event_visible_to_viewer_v1(
  p_viewer_user_id uuid,
  p_event_type text,
  p_card_print_id uuid,
  p_actor_user_id uuid,
  p_subject_user_id uuid,
  p_visibility text,
  p_payload jsonb,
  p_dedupe_key text
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_event_type text := lower(btrim(coalesce(p_event_type, '')));
  v_public_id uuid;
  v_revision integer;
  v_threshold integer;
begin
  if left(v_event_type, 7) <> 'binder_' then
    return public.interest_graph_card_event_visible_to_viewer_v1(
      p_viewer_user_id,
      p_actor_user_id,
      p_subject_user_id,
      p_visibility
    );
  end if;
  if v_event_type <> 'binder_milestone_shared'
     or p_card_print_id is not null
     or p_subject_user_id is not null
     or p_visibility <> 'public'
     or jsonb_typeof(coalesce(p_payload, 'null'::jsonb)) <> 'object'
     or not public.interest_graph_card_event_visible_to_viewer_v1(
       p_viewer_user_id,
       p_actor_user_id,
       p_subject_user_id,
       p_visibility
     ) then
    return false;
  end if;

  v_public_id := public.pulse_jsonb_uuid_v1(
    p_payload ->> 'binder_public_id'
  );
  if nullif(p_payload ->> 'definition_revision', '') !~ '^[0-9]+$'
     or nullif(p_payload ->> 'threshold', '') !~ '^[0-9]+$' then
    return false;
  end if;
  v_revision := (p_payload ->> 'definition_revision')::integer;
  v_threshold := (p_payload ->> 'threshold')::integer;
  if v_public_id is null
     or v_revision < 1
     or v_threshold not in (25, 50, 75, 90, 100)
     or p_dedupe_key is distinct from concat_ws(
       ':',
       'binder-milestone',
       v_public_id::text,
       v_revision::text,
       v_threshold::text
     ) then
    return false;
  end if;

  return exists (
    select 1
    from public.binders b
    where b.public_id = v_public_id
      and b.owner_user_id = p_actor_user_id
      and b.definition_revision = v_revision
      and b.lifecycle = 'active'
      and b.moderation_state = 'clear'
      and b.read_access = 'public'
      and b.discoverability = 'listed'
      and public.binder_feature_enabled_v1('schema_internal')
      and public.binder_feature_enabled_v1('public')
      and public.binder_feature_enabled_v1('pulse_milestones')
      and public.binder_target_enabled_v1(b.id)
      and public.interest_graph_collector_public_v1(b.owner_user_id)
      and not public.binder_pair_blocked_v1(
        p_viewer_user_id,
        b.owner_user_id
      )
      and exists (
        select 1
        from public.binder_progress_crossings crossing
        where crossing.binder_id = b.id
          and crossing.definition_revision = v_revision
          and crossing.threshold = v_threshold
      )
      and exists (
        select 1
        from public.binder_activity_events activity
        where activity.binder_id = b.id
          and activity.event_type = 'milestone_shared_to_pulse'
          and activity.actor_kind = 'user'
          and activity.actor_user_id = b.owner_user_id
          and activity.payload ->> 'definition_revision'
                = v_revision::text
          and activity.payload ->> 'threshold' = v_threshold::text
      )
  );
exception
  when others then
    return false;
end;
$$;

drop policy if exists card_events_visibility_select
on public.card_events;
create policy card_events_visibility_select
on public.card_events
for select
to authenticated
using (
  public.binder_card_event_visible_to_viewer_v1(
    auth.uid(),
    event_type,
    card_print_id,
    actor_user_id,
    subject_user_id,
    visibility,
    payload,
    dedupe_key
  )
);

drop policy if exists card_events_actor_insert
on public.card_events;
create policy card_events_actor_insert
on public.card_events
for insert
to authenticated
with check (
  actor_user_id = auth.uid()
  and jsonb_typeof(payload) = 'object'
  and left(lower(btrim(event_type)), 7) <> 'binder_'
);

create or replace function public.card_events_feed_v1(
  p_limit integer default 40,
  p_before_created_at timestamptz default null,
  p_before_id uuid default null
)
returns table (
  event_id uuid,
  event_type text,
  card_print_id uuid,
  gv_id text,
  card_name text,
  set_code text,
  set_name text,
  card_number text,
  actor_slug text,
  actor_display_name text,
  subject_slug text,
  subject_display_name text,
  payload jsonb,
  visibility text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_limit integer := least(greatest(coalesce(p_limit, 40), 1), 80);
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  return query
  select
    e.id,
    e.event_type,
    e.card_print_id,
    cp.gv_id,
    cp.name,
    cp.set_code,
    s.name,
    cp.number,
    actor_profile.slug,
    actor_profile.display_name,
    subject_profile.slug,
    subject_profile.display_name,
    e.payload,
    e.visibility,
    e.created_at
  from public.card_events e
  left join public.card_prints cp on cp.id = e.card_print_id
  left join public.sets s on s.id = cp.set_id
  left join public.public_profiles actor_profile
    on actor_profile.user_id = e.actor_user_id
  left join public.public_profiles subject_profile
    on subject_profile.user_id = e.subject_user_id
  where public.binder_card_event_visible_to_viewer_v1(
      v_uid,
      e.event_type,
      e.card_print_id,
      e.actor_user_id,
      e.subject_user_id,
      e.visibility,
      e.payload,
      e.dedupe_key
    )
    and (
      p_before_created_at is null
      or e.created_at < p_before_created_at
      or (
        p_before_id is not null
        and e.created_at = p_before_created_at
        and e.id < p_before_id
      )
    )
  order by e.created_at desc, e.id desc
  limit v_limit;
end;
$$;

comment on function public.pulse_eligible_events_for_viewer_v1(uuid) is
'Pulse eligibility with the pre-Binder watch feed plus explicit, current, public Binder milestone shares for unmuted followers.';

revoke all on function public.binder_card_event_visible_to_viewer_v1(
  uuid,text,uuid,uuid,uuid,text,jsonb,text
) from public, anon;
grant execute on function public.binder_card_event_visible_to_viewer_v1(
  uuid,text,uuid,uuid,uuid,text,jsonb,text
) to authenticated, service_role;

-- The shared interest-graph emitters are SECURITY DEFINER and must never be
-- callable directly by clients. Binder and existing trigger functions continue
-- to call them as their owning definer; service jobs retain explicit access.
revoke all on function public.interest_graph_emit_event_v1(
  text,text,uuid,uuid,uuid,jsonb,text,text
) from public, anon, authenticated;
grant execute on function public.interest_graph_emit_event_v1(
  text,text,uuid,uuid,uuid,jsonb,text,text
) to service_role;

revoke all on function public.interest_graph_log_emit_failure_v1(
  text,text,uuid,uuid,jsonb,text
) from public, anon, authenticated;
grant execute on function public.interest_graph_log_emit_failure_v1(
  text,text,uuid,uuid,jsonb,text
) to service_role;

revoke insert on table public.card_events_emit_failures
from authenticated;
drop policy if exists card_events_emit_failures_owner_insert
on public.card_events_emit_failures;

revoke all on function public.binder_pulse_base_eligible_events_for_viewer_v1(uuid)
from public, anon, authenticated;
grant execute on function public.binder_pulse_base_eligible_events_for_viewer_v1(uuid)
to service_role;

revoke all on function public.pulse_eligible_events_for_viewer_v1(uuid)
from public, anon, authenticated;
grant execute on function public.pulse_eligible_events_for_viewer_v1(uuid)
to service_role;

alter table public.binder_template_version_reviews enable row level security;
revoke all on table public.binder_template_version_reviews
from public, anon, authenticated;
grant all on table public.binder_template_version_reviews to service_role;
create policy binder_template_version_reviews_service_role_all
on public.binder_template_version_reviews
for all to service_role
using (true)
with check (true);

create trigger trg_binder_template_version_reviews_append_only_v1
before update or delete on public.binder_template_version_reviews
for each row execute function public.binder_append_only_guard_v1();

do $$
declare
  v_signature text;
begin
  foreach v_signature in array array[
    'public.binder_template_version_immutable_v1()',
    'public.binder_require_service_v1(text,text)',
    'public.binder_template_definition_from_binder_v1(uuid,text,text)',
    'public.binder_contribution_current_valid_v1(uuid)',
    'public.binder_public_action_resolve_v1(uuid,text,uuid,uuid)',
    'public.binder_invalidate_instance_links_v1(uuid,boolean,text,text,text)',
    'public.binder_vault_instance_guard_v1()',
    'public.binder_slab_identity_guard_v1()'
  ]
  loop
    execute 'revoke all on function ' || v_signature || ' from public, anon, authenticated';
  end loop;
end;
$$;

revoke all on function public.binder_template_submit_v1(uuid,text,text,text)
from public, anon;
grant execute on function public.binder_template_submit_v1(uuid,text,text,text)
to authenticated, service_role;

revoke all on function public.binder_template_clone_v1(uuid,text,integer,text)
from public, anon;
grant execute on function public.binder_template_clone_v1(uuid,text,integer,text)
to authenticated, service_role;

revoke all on function public.binder_legacy_decide_v1(uuid,text,text,text)
from public, anon;
grant execute on function public.binder_legacy_decide_v1(uuid,text,text,text)
to authenticated, service_role;

revoke all on function public.binder_pulse_milestone_share_v1(uuid,integer,text)
from public, anon;
grant execute on function public.binder_pulse_milestone_share_v1(uuid,integer,text)
to authenticated, service_role;

revoke all on function public.binder_public_action_report_v1(
  uuid,text,uuid,text,text,text
) from public, anon;
grant execute on function public.binder_public_action_report_v1(
  uuid,text,uuid,text,text,text
) to authenticated, service_role;

revoke all on function public.binder_public_member_block_v1(uuid,uuid,text)
from public, anon;
grant execute on function public.binder_public_member_block_v1(uuid,uuid,text)
to authenticated, service_role;

do $$
declare
  v_signature text;
begin
  foreach v_signature in array array[
    'public.binder_service_template_publish_v1(uuid,text,text,text)',
    'public.binder_service_vault_instance_changed_v1(uuid,text,text)',
    'public.binder_service_canonical_refresh_v1(uuid,text,text)',
    'public.binder_service_moderate_v1(uuid,text,text,text)',
    'public.binder_service_account_delete_v1(uuid,text,text)',
    'public.binder_service_retention_finalize_v1(uuid,text,text)',
    'public.binder_service_expire_capabilities_v1(timestamptz,integer,text,text)'
  ]
  loop
    execute 'revoke all on function ' || v_signature || ' from public, anon, authenticated';
    execute 'grant execute on function ' || v_signature || ' to service_role';
  end loop;
end;
$$;

commit;
