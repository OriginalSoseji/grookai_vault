begin;

-- COLLABORATIVE_BINDERS_SYSTEM_CONTRACT_V1
-- RPC-only read models. Member reads are Binder-scoped. Public and capability
-- reads are independent allow-listed projections and never reuse raw rows.

create or replace function public.binder_target_enabled_v1(p_binder_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select
      public.binder_feature_enabled_v1('schema_internal')
      and case b.target_kind
        when 'species' then public.binder_feature_enabled_v1('personal')
        when 'custom' then public.binder_feature_enabled_v1('custom')
        when 'set' then
          public.binder_feature_enabled_v1('set_binders')
          and to_regprocedure('public.binder_set_slots_authority_v1(uuid)') is not null
        else false
      end
    from public.binders b
    where b.id = p_binder_id
  ), false);
$$;

create or replace function public.binder_member_context_v1(p_public_id uuid)
returns table (
  binder_id uuid,
  member_id uuid,
  member_user_id uuid,
  member_role text,
  membership_epoch integer
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := public.binder_require_user_v1();
begin
  if not public.binder_feature_enabled_v1('schema_internal') then
    raise exception 'unavailable' using errcode = 'P0001';
  end if;
  return query
  select
    b.id,
    m.id,
    m.user_id,
    m.role,
    m.membership_epoch
  from public.binders b
  join public.binder_members m
    on m.binder_id = b.id
   and m.user_id = v_uid
   and m.state = 'active'
  where b.public_id = p_public_id
    and b.lifecycle in ('active', 'archived')
    and b.moderation_state <> 'removed'
    and public.binder_target_enabled_v1(b.id)
    and not public.binder_pair_blocked_v1(v_uid, b.owner_user_id)
  limit 1;

  if not found then
    raise exception 'unavailable' using errcode = 'P0001';
  end if;
end;
$$;

create or replace function public.binder_card_json_v1(
  p_card_print_id uuid,
  p_card_printing_id uuid default null
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_strip_nulls(jsonb_build_object(
    'card_print_id', cp.id,
    'card_printing_id', cpn.id,
    'gv_id', nullif(btrim(cp.gv_id), ''),
    'name', left(coalesce(nullif(btrim(cp.name), ''), 'Unknown card'), 160),
    'set_code', nullif(btrim(cp.set_code), ''),
    'set_name', left(coalesce(nullif(btrim(s.name), ''), nullif(btrim(cp.set_code), ''), 'Unknown set'), 120),
    'number', left(nullif(btrim(cp.number), ''), 40),
    'finish_label', left(nullif(btrim(fk.label), ''), 100),
    'image_url', case
      when image.proxy_gv_id is not null then
        'https://grookaivault.com/api/canon/cards/'
          || image.proxy_gv_id
          || '/image'
      else null
    end,
    'canonical_image_url', case
      when image.proxy_gv_id is not null then
        'https://grookaivault.com/api/canon/cards/'
          || image.proxy_gv_id
          || '/image'
      else null
    end,
    'image_source', case
      when image.hosted_image then 'hosted'
      when image.proxy_gv_id is not null then 'canonical_proxy'
      else null
    end,
    'hosted_image', image.hosted_image
  ))
  from public.card_prints cp
  left join public.sets s on s.id = cp.set_id
  left join public.card_printings cpn
    on cpn.id = p_card_printing_id
   and cpn.card_print_id = cp.id
  left join public.finish_keys fk on fk.key = cpn.finish_key
  left join lateral (
    select
      coalesce(
        case
          when lower(btrim(coalesce(cpn.image_source, ''))) = 'identity'
            and nullif(btrim(cpn.image_path), '') is not null
            and nullif(btrim(cpn.printing_gv_id), '') is not null
            then btrim(cpn.printing_gv_id)
          else null
        end,
        nullif(btrim(cp.gv_id), '')
      ) as proxy_gv_id,
      case
        when lower(btrim(coalesce(cpn.image_source, ''))) = 'identity'
          and nullif(btrim(cpn.image_path), '') is not null
          and nullif(btrim(cpn.printing_gv_id), '') is not null
        then true
        when lower(btrim(coalesce(cp.image_source, ''))) = 'identity'
          and nullif(btrim(cp.image_path), '') is not null
          and nullif(btrim(cp.gv_id), '') is not null
        then true
        else false
      end as hosted_image
  ) image on true
  where cp.id = p_card_print_id;
$$;

create or replace function public.binder_target_json_v1(p_binder_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_strip_nulls(jsonb_build_object(
    'kind', b.target_kind,
    'id', case
      when b.target_kind = 'species' then b.species_id
      when b.target_kind = 'set' then b.set_id
      else null
    end,
    'key', case
      when b.target_kind = 'species' then ps.slug
      when b.target_kind = 'set' then s.code
      else 'custom'
    end,
    'label', case
      when b.target_kind = 'species' then ps.display_name
      when b.target_kind = 'set' then coalesce(nullif(btrim(s.name), ''), nullif(btrim(s.code), ''), 'Set')
      else 'Custom collection'
    end
  ))
  from public.binders b
  left join public.pokemon_species ps on ps.id = b.species_id
  left join public.sets s on s.id = b.set_id
  where b.id = p_binder_id;
$$;

create or replace function public.binder_slot_rows_v1(p_binder_id uuid)
returns table (
  "position" integer,
  slot_id uuid,
  card_print_id uuid,
  card_printing_id uuid,
  required_quantity integer
)
language sql
stable
security definer
set search_path = public
as $$
  with binder_row as (
    select *
    from public.binders
    where id = p_binder_id
      and public.binder_target_enabled_v1(id)
  ),
  species_slots as (
    select
      (row_number() over (
        order by s.release_date nulls last, cp.set_code nulls last,
                 cp.number_plain nulls last, cp.number nulls last, cp.id
      ) - 1)::integer as position,
      cp.id as slot_id,
      cp.id as card_print_id,
      null::uuid as card_printing_id,
      1::integer as required_quantity
    from binder_row b
    join public.card_print_species cps
      on cps.species_id = b.species_id
     and cps.active is true
     and cps.counts_for_completion is true
    join public.card_prints cp on cp.id = cps.card_print_id
    left join public.sets s on s.id = cp.set_id
    where b.target_kind = 'species'
    group by cp.id, s.release_date, cp.set_code, cp.number_plain, cp.number
  ),
  custom_slots as (
    select
      cs.position,
      cs.id as slot_id,
      cs.card_print_id,
      cs.card_printing_id,
      cs.required_quantity
    from binder_row b
    join public.binder_custom_slots cs
      on cs.binder_id = b.id
     and cs.definition_revision = b.definition_revision
     and cs.active is true
    where b.target_kind = 'custom'
  )
  select * from species_slots
  union all
  select * from custom_slots;
$$;

create or replace function public.binder_member_label_v1(
  p_member_id uuid,
  p_viewer_user_id uuid,
  p_audience text default 'member'
)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when m.id is null then 'A Binder member'
    when p_viewer_user_id is not null
         and m.user_id is not null
         and m.user_id <> p_viewer_user_id
         and public.binder_pair_blocked_v1(m.user_id, p_viewer_user_id)
      then 'A Binder member'
    when p_audience = 'member'
      then coalesce(nullif(btrim(m.display_alias), ''), 'A Binder member')
    when public.binder_audience_rank_v1(m.identity_scope)
           >= public.binder_audience_rank_v1(p_audience)
         and m.identity_consent_epoch = m.membership_epoch
         and m.identity_consent_revision = b.external_projection_revision
      then coalesce(nullif(btrim(m.display_alias), ''), 'A Binder member')
    else 'A Binder member'
  end
  from public.binder_members m
  join public.binders b on b.id = m.binder_id
  where m.id = p_member_id;
$$;

create or replace function public.binder_summary_json_v1(
  p_binder_id uuid,
  p_member_id uuid
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_strip_nulls(jsonb_build_object(
    'id', b.public_id,
    'public_id', b.public_id,
    'title', b.title,
    'description', b.description,
    'target_kind', b.target_kind,
    'target_label', public.binder_target_json_v1(b.id) ->> 'label',
    'target_id', coalesce(b.species_id, b.set_id),
    'target_key', public.binder_target_json_v1(b.id) ->> 'key',
    'checklist_mode', b.checklist_mode,
    'completed_slots', coalesce(ps.member_completed_slots, 0),
    'total_slots', coalesce(ps.total_slots, 0),
    'progress', jsonb_build_object(
      'completed_slots', coalesce(ps.member_completed_slots, 0),
      'total_slots', coalesce(ps.total_slots, 0),
      'unit', coalesce(ps.unit, 'card_prints')
    ),
    'member_count', (
      select count(*) from public.binder_members lm
      where lm.binder_id = b.id and lm.state = 'active'
    ),
    'pending_approval_count', case
      when m.role in ('owner', 'manager') then (
        select count(*) from public.binder_contributions pc
        where pc.binder_id = b.id and pc.state = 'pending'
      )
      else 0
    end,
    'viewer_role', m.role,
    'role', m.role,
    'read_access', b.read_access,
    'discoverability', b.discoverability,
    'join_policy', b.join_policy,
    'contribution_policy', b.contribution_policy,
    'lifecycle', b.lifecycle,
    'moderation_state', b.moderation_state,
    'cover_image_url', public.binder_card_json_v1(b.cover_card_print_id, null) ->> 'image_url',
    'updated_at', b.updated_at
  ))
  from public.binders b
  join public.binder_members m on m.id = p_member_id and m.binder_id = b.id
  left join public.binder_progress_state ps on ps.binder_id = b.id
  where b.id = p_binder_id;
$$;

create or replace function public.binder_dashboard_v1(
  p_limit integer default 20,
  p_before_updated_at timestamptz default null,
  p_before_id uuid default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := public.binder_require_user_v1();
  v_limit integer := least(greatest(coalesce(p_limit, 20), 1), 20);
  v_items jsonb;
  v_invites jsonb;
  v_suspended jsonb;
  v_suspended_next jsonb;
  v_suspended_has_more boolean := false;
  v_next jsonb;
begin
  if not public.binder_feature_enabled_v1('schema_internal') then
    raise exception 'unavailable' using errcode = 'P0001';
  end if;

  with rows as (
    select
      b.id,
      b.updated_at,
      m.id as member_id,
      public.binder_summary_json_v1(b.id, m.id) as item
    from public.binder_members m
    join public.binders b on b.id = m.binder_id
    where m.user_id = v_uid
      and m.state = 'active'
      and b.lifecycle in ('active', 'archived')
      and b.moderation_state <> 'removed'
      and public.binder_target_enabled_v1(b.id)
      and not public.binder_pair_blocked_v1(v_uid, b.owner_user_id)
      and (
        p_before_updated_at is null
        or (b.updated_at, b.id) < (p_before_updated_at, p_before_id)
      )
    order by b.updated_at desc, b.id desc
    limit v_limit + 1
  ),
  page as (
    select * from rows order by updated_at desc, id desc limit v_limit
  )
  select
    coalesce(jsonb_agg(item order by updated_at desc, id desc), '[]'::jsonb),
    case when (select count(*) from rows) > v_limit then (
      select jsonb_build_object('updated_at', updated_at, 'id', id)
      from page order by updated_at asc, id asc limit 1
    ) else null end
  into v_items, v_next
  from page;

  with rows as (
    select
      m.id,
      m.updated_at,
      jsonb_build_object(
        'id', b.public_id,
        'public_id', b.public_id,
        'membership_state', 'suspended',
        'state', 'suspended',
        'permissions', jsonb_build_object(
          'can_leave', true,
          'can_report', true
        )
      ) as item
    from public.binder_members m
    join public.binders b on b.id = m.binder_id
    where m.user_id = v_uid
      and m.state = 'suspended'
      and b.lifecycle in ('active', 'archived')
      and b.moderation_state <> 'removed'
      and not public.binder_pair_blocked_v1(v_uid, b.owner_user_id)
    order by m.updated_at desc, m.id desc
    limit 21
  ),
  page as (
    select * from rows order by updated_at desc, id desc limit 20
  )
  select
    coalesce(jsonb_agg(item order by updated_at desc, id desc), '[]'::jsonb),
    (select count(*) from rows) > 20,
    case when (select count(*) from rows) > 20 then (
      select jsonb_build_object('updated_at', updated_at, 'id', id)
      from page order by updated_at asc, id asc limit 1
    ) else null end
  into v_suspended, v_suspended_has_more, v_suspended_next
  from page;

  select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
    'id', i.id,
    'invitation_id', i.id,
    'invitation_public_id', i.id,
    'state', 'pending',
    'maximum_role', i.max_role,
    'role', i.max_role,
    'binder_public_id', b.public_id,
    'binder_title', b.title,
    'expires_at', i.expires_at,
    'is_account_targeted', true
  )) order by i.created_at desc), '[]'::jsonb)
  into v_invites
  from (
    select i.*, b.public_id as binder_public_id, b.title as binder_title
    from public.binder_invitations i
    join public.binders b on b.id = i.binder_id
    where i.is_account_targeted is true
      and i.intended_user_id = v_uid
      and i.status = 'pending'
      and i.expires_at > now()
      and b.lifecycle = 'active'
      and b.moderation_state not in ('frozen', 'removed')
      and b.join_policy = 'invite_only'
      and public.binder_feature_enabled_v1('shared')
      and public.binder_target_enabled_v1(b.id)
      and not public.binder_pair_blocked_v1(v_uid, b.owner_user_id)
      and (
        i.inviter_user_id is null
        or not public.binder_pair_blocked_v1(v_uid, i.inviter_user_id)
      )
    order by i.created_at desc, i.id desc
    limit 50
  ) i
  cross join lateral (
    select i.binder_public_id as public_id, i.binder_title as title
  ) b;

  return jsonb_build_object(
    'ok', true,
    'items', v_items,
    'suspended_binders', v_suspended,
    'suspended_binders_has_more', v_suspended_has_more,
    'suspended_binders_next_cursor', v_suspended_next,
    'invitations', v_invites,
    'next_cursor', v_next,
    'loaded_at', now()
  );
end;
$$;

create or replace function public.binder_invitation_inbox_v1(
  p_limit integer default 20,
  p_before_created_at timestamptz default null,
  p_before_id uuid default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := public.binder_require_user_v1();
  v_limit integer := least(greatest(coalesce(p_limit, 50), 1), 50);
  v_items jsonb;
  v_next jsonb;
  v_has_more boolean;
begin
  if not public.binder_feature_enabled_v1('shared') then
    return jsonb_build_object(
      'ok', true, 'items', '[]'::jsonb, 'has_more', false, 'next_cursor', null
    );
  end if;
  with rows as (
    select
      i.id,
      i.created_at,
      jsonb_build_object(
        'id', i.id,
        'invitation_id', i.id,
        'state', 'pending',
        'maximum_role', i.max_role,
        'role', i.max_role,
        'binder_public_id', b.public_id,
        'binder_title', b.title,
        'inviter_label', public.binder_member_label_v1(inviter.id, v_uid, 'member'),
        'expires_at', i.expires_at,
        'is_account_targeted', true
      ) as item
    from public.binder_invitations i
    join public.binders b on b.id = i.binder_id
    join public.binder_members inviter
      on inviter.binder_id = i.binder_id
     and inviter.user_id = i.inviter_user_id
     and inviter.state = 'active'
     and inviter.role in ('owner', 'manager')
    where i.is_account_targeted is true
      and i.intended_user_id = v_uid
      and i.status = 'pending'
      and i.expires_at > now()
      and b.lifecycle = 'active'
      and b.moderation_state not in ('frozen', 'removed')
      and b.join_policy = 'invite_only'
      and public.binder_target_enabled_v1(b.id)
      and not public.binder_pair_blocked_v1(v_uid, b.owner_user_id)
      and not public.binder_pair_blocked_v1(v_uid, i.inviter_user_id)
      and (
        p_before_created_at is null
        or (i.created_at, i.id) < (p_before_created_at, p_before_id)
      )
    order by i.created_at desc, i.id desc
    limit v_limit + 1
  ),
  page as (
    select * from rows order by created_at desc, id desc limit v_limit
  )
  select
    coalesce(jsonb_agg(item order by created_at desc, id desc), '[]'::jsonb),
    (select count(*) from rows) > v_limit,
    case when (select count(*) from rows) > v_limit then (
      select jsonb_build_object('created_at', created_at, 'id', id)
      from page order by created_at asc, id asc limit 1
    ) else null end
  into v_items, v_has_more, v_next
  from page;
  return jsonb_build_object(
    'ok', true,
    'items', v_items,
    'invitations', v_items,
    'has_more', coalesce(v_has_more, false),
    'next_cursor', v_next
  );
end;
$$;

create or replace function public.binder_suspended_binders_v1(
  p_limit integer default 20,
  p_before_updated_at timestamptz default null,
  p_before_id uuid default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := public.binder_require_user_v1();
  v_limit integer := least(greatest(coalesce(p_limit, 20), 1), 20);
  v_items jsonb;
  v_has_more boolean;
  v_next jsonb;
begin
  with rows as (
    select
      member.id,
      member.updated_at,
      jsonb_build_object(
        'id', binder.public_id,
        'public_id', binder.public_id,
        'membership_state', 'suspended',
        'state', 'suspended',
        'permissions', jsonb_build_object(
          'can_leave', true,
          'can_report', true
        )
      ) as item
    from public.binder_members member
    join public.binders binder on binder.id = member.binder_id
    where member.user_id = v_uid
      and member.state = 'suspended'
      and binder.lifecycle in ('active', 'archived')
      and binder.moderation_state <> 'removed'
      and not public.binder_pair_blocked_v1(v_uid, binder.owner_user_id)
      and (
        p_before_updated_at is null
        or (member.updated_at, member.id) < (p_before_updated_at, p_before_id)
      )
    order by member.updated_at desc, member.id desc
    limit v_limit + 1
  ),
  page as (
    select * from rows order by updated_at desc, id desc limit v_limit
  )
  select
    coalesce(jsonb_agg(item order by updated_at desc, id desc), '[]'::jsonb),
    (select count(*) from rows) > v_limit,
    case when (select count(*) from rows) > v_limit then (
      select jsonb_build_object('updated_at', updated_at, 'id', id)
      from page order by updated_at asc, id asc limit 1
    ) else null end
  into v_items, v_has_more, v_next
  from page;
  return jsonb_build_object(
    'ok', true,
    'items', v_items,
    'suspended_binders', v_items,
    'has_more', coalesce(v_has_more, false),
    'next_cursor', v_next
  );
end;
$$;

create or replace function public.binder_detail_v1(p_public_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := public.binder_require_user_v1();
  v_context record;
  v_binder public.binders%rowtype;
  v_member public.binder_members%rowtype;
  v_progress public.binder_progress_state%rowtype;
  v_can_write boolean;
  v_member_count integer;
  v_pending_contributions integer;
  v_pending_requests integer;
  v_invitations jsonb := '[]'::jsonb;
  v_view_links jsonb := '[]'::jsonb;
  v_join_requests jsonb := '[]'::jsonb;
  v_transfer jsonb;
begin
  select * into v_context from public.binder_member_context_v1(p_public_id);
  select * into v_binder from public.binders where id = v_context.binder_id;
  select * into v_member from public.binder_members where id = v_context.member_id;
  select * into v_progress from public.binder_progress_state where binder_id = v_binder.id;
  v_can_write := v_binder.lifecycle = 'active'
    and v_binder.moderation_state not in ('frozen', 'removed');

  select count(*) into v_member_count
  from public.binder_members
  where binder_id = v_binder.id and state = 'active';
  select count(*) into v_pending_contributions
  from public.binder_contributions
  where binder_id = v_binder.id and state = 'pending';
  select count(*) into v_pending_requests
  from public.binder_join_requests
  where binder_id = v_binder.id and status = 'pending';

  if v_member.role in ('owner', 'manager') then
    select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
      'id', i.id,
      'invitation_id', i.id,
      'state', i.status,
      'maximum_role', i.max_role,
      'is_account_targeted', i.is_account_targeted,
      'expires_at', i.expires_at
    )) order by i.created_at desc), '[]'::jsonb)
    into v_invitations
    from (
      select *
      from public.binder_invitations
      where binder_id = v_binder.id and status = 'pending'
      order by created_at desc, id desc
      limit 50
    ) i;

    select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
      'id', r.id,
      'request_id', r.id,
      'state', r.status,
      'requested_role', r.requested_role_ceiling,
      'requester_label', case
        when not public.binder_pair_blocked_v1(
          v_uid,
          r.requester_user_id
        )
          and profile.public_profile_enabled is true
          then left(nullif(btrim(profile.display_name), ''), 80)
        else 'Collector'
      end,
      'created_at', r.requested_at
    )) order by r.requested_at), '[]'::jsonb)
    into v_join_requests
    from (
      select *
      from public.binder_join_requests
      where binder_id = v_binder.id and status = 'pending'
      order by requested_at, id
      limit 50
    ) r
    left join public.public_profiles profile
      on profile.user_id = r.requester_user_id
    ;
  end if;

  if v_member.role = 'owner' then
    select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
      'id', l.id,
      'view_link_id', l.id,
      'label', coalesce(l.label, 'View-only link'),
      'expires_at', l.expires_at,
      'revoked_at', l.revoked_at
    )) order by l.created_at desc), '[]'::jsonb)
    into v_view_links
    from public.binder_view_links l
    where l.binder_id = v_binder.id and l.status = 'active';
  end if;

  select jsonb_strip_nulls(jsonb_build_object(
    'id', o.id,
    'offer_id', o.id,
    'target_member_id', o.target_member_id,
    'former_owner_role', o.former_owner_role,
    'is_target_viewer', o.target_user_id = v_uid,
    'expires_at', o.expires_at
  ))
  into v_transfer
  from public.binder_owner_transfer_offers o
  where o.binder_id = v_binder.id
    and o.status = 'pending'
    and (v_member.role = 'owner' or o.target_user_id = v_uid)
  limit 1;

  return jsonb_build_object(
    'ok', true,
    'binder', public.binder_summary_json_v1(v_binder.id, v_member.id)
      || jsonb_build_object(
        'target', public.binder_target_json_v1(v_binder.id),
        'definition_revision', v_binder.definition_revision,
        'external_projection_revision', v_binder.external_projection_revision,
        'cover_card_print_id', v_binder.cover_card_print_id
      ),
    'viewer', jsonb_strip_nulls(jsonb_build_object(
      'membership_public_id', v_member.id,
      'member_id', v_member.id,
      'role', v_member.role,
      'state', v_member.state,
      'epoch', v_member.membership_epoch,
      'alias', v_member.display_alias,
      'notification_preference', v_member.notification_preference,
      'stale_permission', false
    )),
    'membership', jsonb_strip_nulls(jsonb_build_object(
      'id', v_member.id,
      'role', v_member.role,
      'state', v_member.state,
      'epoch', v_member.membership_epoch,
      'alias', v_member.display_alias,
      'notification_preference', v_member.notification_preference
    )),
    'consent', jsonb_build_object(
      'content_scope', v_member.content_scope,
      'identity_scope', v_member.identity_scope,
      'notification_preference', v_member.notification_preference,
      'content_revision', v_member.content_consent_revision,
      'identity_revision', v_member.identity_consent_revision
    ),
    'permissions', jsonb_build_object(
      'can_add_copy', v_can_write and v_member.role in ('owner', 'manager', 'contributor')
        and (v_binder.contribution_policy <> 'owner_only' or v_member.role = 'owner'),
      'contribute', v_can_write and v_member.role in ('owner', 'manager', 'contributor')
        and (v_binder.contribution_policy <> 'owner_only' or v_member.role = 'owner'),
      'can_invite', v_can_write and v_member.role in ('owner', 'manager')
        and v_binder.join_policy = 'invite_only'
        and public.binder_feature_enabled_v1('shared'),
      'can_approve', v_can_write and v_member.role in ('owner', 'manager'),
      'can_manage_members', v_can_write and v_member.role in ('owner', 'manager'),
      'manage_members', v_can_write and v_member.role in ('owner', 'manager'),
      'can_edit', v_can_write and v_member.role in ('owner', 'manager'),
      'edit_metadata', v_can_write and v_member.role in ('owner', 'manager'),
      'can_manage_policy', v_can_write and v_member.role = 'owner',
      'manage_policy', v_can_write and v_member.role = 'owner',
      'can_transfer', v_member.role = 'owner' and v_binder.lifecycle in ('active', 'archived')
        and v_binder.moderation_state not in ('frozen', 'removed'),
      'transfer_ownership', v_member.role = 'owner' and v_binder.lifecycle in ('active', 'archived')
        and v_binder.moderation_state not in ('frozen', 'removed'),
      'can_archive', v_member.role = 'owner' and v_binder.lifecycle in ('active', 'archived')
        and v_binder.moderation_state not in ('frozen', 'removed'),
      'archive', v_member.role = 'owner' and v_binder.lifecycle in ('active', 'archived')
        and v_binder.moderation_state not in ('frozen', 'removed'),
      'can_leave', v_member.role <> 'owner',
      'can_share', v_can_write and v_member.role = 'owner',
      'can_report', true
    ),
    'progress', jsonb_build_object(
      'member', jsonb_build_object(
        'completed_slots', coalesce(v_progress.member_completed_slots, 0),
        'total_slots', coalesce(v_progress.total_slots, 0),
        'unit', coalesce(v_progress.unit, 'card_prints')
      ),
      'external', jsonb_build_object(
        'completed_slots', case v_binder.read_access
          when 'public' then coalesce(v_progress.public_completed_slots, 0)
          when 'link' then coalesce(v_progress.link_completed_slots, 0)
          else 0
        end,
        'total_slots', coalesce(v_progress.total_slots, 0),
        'unit', coalesce(v_progress.unit, 'card_prints')
      )
    ),
    'member_summary', jsonb_build_object(
      'member_count', v_member_count,
      'pending_contribution_count', case when v_member.role in ('owner', 'manager') then v_pending_contributions else 0 end,
      'pending_join_request_count', case when v_member.role in ('owner', 'manager') then v_pending_requests else 0 end
    ),
    'invitations', v_invitations,
    'view_links', v_view_links,
    'join_requests', v_join_requests,
    'owner_transfer_offer', v_transfer
  );
end;
$$;

create or replace function public.binder_pending_contributions_v1(
  p_public_id uuid,
  p_limit integer default 50,
  p_before_created_at timestamptz default null,
  p_before_id uuid default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := public.binder_require_user_v1();
  v_binder public.binders%rowtype;
  v_limit integer := least(greatest(coalesce(p_limit, 50), 1), 50);
  v_items jsonb;
  v_next jsonb;
  v_has_more boolean;
begin
  select * into v_binder
  from public.binders
  where public_id = p_public_id;
  if not found
     or v_binder.lifecycle not in ('active', 'archived')
     or v_binder.moderation_state = 'removed' then
    raise exception 'unavailable' using errcode = 'P0001';
  end if;
  perform 1
  from public.binder_members
  where binder_id = v_binder.id
    and user_id = v_uid
    and state = 'active'
    and role in ('owner', 'manager');
  if not found then
    raise exception 'unavailable' using errcode = 'P0001';
  end if;

  with rows as (
    select
      c.id,
      c.created_at,
      jsonb_build_object(
        'id', c.id,
        'contribution_id', c.id,
        'contribution_public_id', c.id,
        'state', c.state,
        'card', public.binder_card_json_v1(
          c.snapshot_card_print_id,
          c.snapshot_card_printing_id
        ),
        'title', public.binder_card_json_v1(
          c.snapshot_card_print_id,
          c.snapshot_card_printing_id
        ) ->> 'name',
        'member_id', c.contributor_member_id,
        'member_label', public.binder_member_label_v1(
          c.contributor_member_id,
          v_uid,
          'member'
        ),
        'can_decide',
          c.contributor_user_id <> v_uid
          and v_binder.lifecycle = 'active'
          and v_binder.moderation_state not in ('frozen', 'removed'),
        'can_remove',
          c.contributor_user_id <> v_uid
          and v_binder.lifecycle = 'active'
          and v_binder.moderation_state not in ('frozen', 'removed'),
        'created_at', c.created_at
      ) as item
    from public.binder_contributions c
    where c.binder_id = v_binder.id
      and c.state = 'pending'
      and (
        p_before_created_at is null
        or (c.created_at, c.id) < (p_before_created_at, p_before_id)
      )
    order by c.created_at desc, c.id desc
    limit v_limit + 1
  ),
  page as (
    select * from rows order by created_at desc, id desc limit v_limit
  )
  select
    coalesce(jsonb_agg(item order by created_at desc, id desc), '[]'::jsonb),
    (select count(*) from rows) > v_limit,
    case when (select count(*) from rows) > v_limit then (
      select jsonb_build_object('created_at', created_at, 'id', id)
      from page order by created_at asc, id asc limit 1
    ) else null end
  into v_items, v_has_more, v_next
  from page;
  return jsonb_build_object(
    'ok', true,
    'binder_public_id', v_binder.public_id,
    'items', v_items,
    'pending_contributions', v_items,
    'has_more', coalesce(v_has_more, false),
    'next_cursor', v_next
  );
end;
$$;

create or replace function public.binder_join_requests_queue_v1(
  p_public_id uuid,
  p_limit integer default 50,
  p_before_requested_at timestamptz default null,
  p_before_id uuid default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := public.binder_require_user_v1();
  v_binder public.binders%rowtype;
  v_limit integer := least(greatest(coalesce(p_limit, 50), 1), 50);
  v_items jsonb;
  v_next jsonb;
  v_has_more boolean;
begin
  select * into v_binder
  from public.binders
  where public_id = p_public_id;
  if not found
     or v_binder.lifecycle not in ('active', 'archived')
     or v_binder.moderation_state = 'removed' then
    raise exception 'unavailable' using errcode = 'P0001';
  end if;
  perform 1
  from public.binder_members
  where binder_id = v_binder.id
    and user_id = v_uid
    and state = 'active'
    and role in ('owner', 'manager');
  if not found then
    raise exception 'unavailable' using errcode = 'P0001';
  end if;

  with rows as (
    select
      request.id,
      request.requested_at,
      jsonb_build_object(
        'id', request.id,
        'request_id', request.id,
        'state', request.status,
        'requested_role', request.requested_role_ceiling,
        'requester_label', case
          when not public.binder_pair_blocked_v1(
            v_uid,
            request.requester_user_id
          )
            and profile.public_profile_enabled is true
            then left(nullif(btrim(profile.display_name), ''), 80)
          else 'Collector'
        end,
        'can_decide',
          v_binder.lifecycle = 'active'
          and v_binder.moderation_state not in ('frozen', 'removed'),
        'created_at', request.requested_at
      ) as item
    from public.binder_join_requests request
    left join public.public_profiles profile
      on profile.user_id = request.requester_user_id
    where request.binder_id = v_binder.id
      and request.status = 'pending'
      and request.requester_user_id is not null
      and (
        p_before_requested_at is null
        or (request.requested_at, request.id) < (p_before_requested_at, p_before_id)
      )
    order by request.requested_at desc, request.id desc
    limit v_limit + 1
  ),
  page as (
    select * from rows order by requested_at desc, id desc limit v_limit
  )
  select
    coalesce(jsonb_agg(item order by requested_at desc, id desc), '[]'::jsonb),
    (select count(*) from rows) > v_limit,
    case when (select count(*) from rows) > v_limit then (
      select jsonb_build_object('requested_at', requested_at, 'id', id)
      from page order by requested_at asc, id asc limit 1
    ) else null end
  into v_items, v_has_more, v_next
  from page;
  return jsonb_build_object(
    'ok', true,
    'binder_public_id', v_binder.public_id,
    'items', v_items,
    'join_requests', v_items,
    'has_more', coalesce(v_has_more, false),
    'next_cursor', v_next
  );
end;
$$;

create or replace function public.binder_checklist_v1(
  p_public_id uuid,
  p_filter text default 'all',
  p_limit integer default 50,
  p_after_position integer default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := public.binder_require_user_v1();
  v_context record;
  v_binder public.binders%rowtype;
  v_member public.binder_members%rowtype;
  v_progress public.binder_progress_state%rowtype;
  v_filter text := lower(btrim(coalesce(p_filter, 'all')));
  v_limit integer := least(greatest(coalesce(p_limit, 50), 1), 50);
  v_items jsonb;
  v_pending jsonb := '[]'::jsonb;
  v_pending_next jsonb;
  v_pending_has_more boolean := false;
  v_next_position integer;
begin
  if v_filter not in (
    'all',
    'in_binder',
    'missing',
    'in_your_vault',
    'contributed_by_you',
    'needs_review'
  ) then
    raise exception 'invalid_filter' using errcode = '22023';
  end if;
  select * into v_context from public.binder_member_context_v1(p_public_id);
  select * into v_binder from public.binders where id = v_context.binder_id;
  select * into v_member from public.binder_members where id = v_context.member_id;
  select * into v_progress from public.binder_progress_state where binder_id = v_binder.id;

  with slot_base as (
    select *
    from public.binder_slot_rows_v1(v_binder.id)
    where p_after_position is null or position > p_after_position
  ),
  candidate_slots as (
    -- The unfiltered checklist is the primary scrolling path. Bound its
    -- expensive contribution/Vault enrichment to one page plus the lookahead
    -- row; filtered modes still inspect the complete governed slot set.
    select *
    from slot_base
    order by position
    limit case when v_filter = 'all' then v_limit + 1 else null end
  ),
  enriched as (
    select
      s.position,
      s.slot_id,
      s.card_print_id,
      s.card_printing_id,
      s.required_quantity,
      public.binder_card_json_v1(s.card_print_id, s.card_printing_id) as card,
      coalesce(contrib.active_quantity, 0)::integer as active_quantity,
      coalesce(contrib.pending_count, 0)::integer as pending_count,
      coalesce(contrib.contributed_by_you_count, 0)::integer as contributed_by_you_count,
      coalesce(contrib.contributions_has_more, false) as contributions_has_more,
      coalesce(contrib.contributions, '[]'::jsonb) as contributions,
      coalesce(contrib.contribution_ids, '[]'::jsonb) as contribution_ids,
      coalesce(contrib.pending_contribution_ids, '[]'::jsonb) as pending_contribution_ids,
      coalesce(contrib.own_contribution_ids, '[]'::jsonb) as own_contribution_ids,
      coalesce(contrib.removable_contribution_ids, '[]'::jsonb) as removable_contribution_ids,
      coalesce(contrib.attribution_labels, '[]'::jsonb) as attribution_labels,
      contrib.viewer_contribution_id,
      contrib.viewer_contribution_state,
      coalesce(owned.owned_eligible_count, 0)::integer as owned_eligible_count,
      (
        v_binder.checklist_mode in ('master_variants', 'master_set')
        and coalesce(owned.unresolved_count, 0) > 0
      ) as needs_review
    from candidate_slots s
    left join lateral (
      select
        count(*) filter (where c.state = 'active') as active_quantity,
        count(*) filter (where c.state = 'pending') as pending_count,
        count(*) filter (
          where c.contributor_user_id = v_uid and c.state in ('pending', 'active')
        ) as contributed_by_you_count,
        count(*) > 20 as contributions_has_more,
        coalesce(jsonb_agg(
          jsonb_strip_nulls(jsonb_build_object(
            'contribution_id', c.id,
            'contribution_public_id', c.id,
            'member_id', c.contributor_member_id,
            'contributor_member_id', c.contributor_member_id,
            'state', c.state,
            'member_label', public.binder_member_label_v1(
              c.contributor_member_id,
              v_uid,
              'member'
            ),
            'is_own', c.contributor_user_id = v_uid,
            'can_remove',
              v_member.role in ('owner', 'manager')
              and c.contributor_user_id <> v_uid
              and v_binder.lifecycle = 'active'
              and v_binder.moderation_state not in ('frozen', 'removed'),
            'can_decide',
              c.state = 'pending'
              and v_member.role in ('owner', 'manager')
              and c.contributor_user_id <> v_uid
              and v_binder.lifecycle = 'active'
              and v_binder.moderation_state not in ('frozen', 'removed')
          ))
          order by c.created_at, c.id
        ) filter (where c.action_rank <= 20), '[]'::jsonb) as contributions,
        coalesce(jsonb_agg(to_jsonb(c.id) order by c.created_at, c.id) filter (
          where c.action_rank <= 20
            and (
              c.contributor_user_id = v_uid
              or v_member.role in ('owner', 'manager')
            )
        ), '[]'::jsonb) as contribution_ids,
        coalesce(jsonb_agg(to_jsonb(c.id) order by c.created_at, c.id) filter (
          where c.state = 'pending'
            and c.action_rank <= 20
            and (
              c.contributor_user_id = v_uid
              or v_member.role in ('owner', 'manager')
            )
        ), '[]'::jsonb) as pending_contribution_ids,
        coalesce(jsonb_agg(to_jsonb(c.id) order by c.created_at, c.id) filter (
          where c.contributor_user_id = v_uid
            and c.action_rank <= 20
        ), '[]'::jsonb) as own_contribution_ids,
        coalesce(jsonb_agg(to_jsonb(c.id) order by c.created_at, c.id) filter (
          where v_member.role in ('owner', 'manager')
            and c.action_rank <= 20
            and c.contributor_user_id <> v_uid
            and v_binder.lifecycle = 'active'
            and v_binder.moderation_state not in ('frozen', 'removed')
        ), '[]'::jsonb) as removable_contribution_ids,
        coalesce(jsonb_agg(distinct to_jsonb(public.binder_member_label_v1(
          c.contributor_member_id,
          v_uid,
          'member'
        ))) filter (where c.state = 'active'), '[]'::jsonb) as attribution_labels,
        (array_agg(c.id order by c.created_at, c.id) filter (
          where c.contributor_user_id = v_uid
            and c.contributor_rank = 1
        ))[1] as viewer_contribution_id,
        (array_agg(c.state order by c.created_at, c.id) filter (
          where c.contributor_user_id = v_uid
            and c.contributor_rank = 1
        ))[1] as viewer_contribution_state
      from (
        select
          eligible.*,
          row_number() over (order by eligible.created_at, eligible.id) as action_rank,
          row_number() over (
            partition by eligible.contributor_user_id
            order by eligible.created_at, eligible.id
          ) as contributor_rank
        from (
          select raw.*
          from public.binder_contributions raw
          join public.binder_members current_member
            on current_member.id = raw.contributor_member_id
           and current_member.binder_id = raw.binder_id
           and current_member.user_id = raw.contributor_user_id
           and current_member.state = 'active'
           and current_member.role <> 'viewer'
           and current_member.membership_epoch = raw.contributor_membership_epoch
           and not public.binder_pair_blocked_v1(
             current_member.user_id,
             v_binder.owner_user_id
           )
          where raw.binder_id = v_binder.id
            and raw.state in ('pending', 'active')
            and raw.snapshot_card_print_id = s.card_print_id
            and (
              s.card_printing_id is null
              or raw.snapshot_card_printing_id = s.card_printing_id
            )
            and exists (
              select 1
              from public.vault_item_instances vii
              left join public.slab_certs slab on slab.id = vii.slab_cert_id
              where vii.id = raw.vault_item_instance_id
                and vii.user_id = raw.contributor_user_id
                and vii.archived_at is null
                and public.binder_gvvi_valid_v1(vii.user_id, vii.gv_vi_id)
                and vii.gv_vi_id = raw.snapshot_gv_vi_id
                and coalesce(vii.card_print_id, slab.card_print_id)
                      is not distinct from raw.snapshot_card_print_id
                and vii.card_printing_id
                      is not distinct from raw.snapshot_card_printing_id
                and (
                  vii.card_printing_id is null
                  or exists (
                    select 1
                    from public.card_printings cpn
                    where cpn.id = vii.card_printing_id
                      and cpn.card_print_id = coalesce(
                        vii.card_print_id,
                        slab.card_print_id
                      )
                  )
                )
            )
        ) eligible
      ) c
    ) contrib on true
    left join lateral (
      select
        count(*) filter (
          where public.binder_gvvi_valid_v1(vii.user_id, vii.gv_vi_id)
            and (
              s.card_printing_id is null
              or vii.card_printing_id = s.card_printing_id
            )
        ) as owned_eligible_count,
        count(*) filter (
          where s.card_printing_id is not null and vii.card_printing_id is null
        ) as unresolved_count
      from public.vault_item_instances vii
      left join public.slab_certs slab on slab.id = vii.slab_cert_id
      where vii.user_id = v_uid
        and vii.archived_at is null
        and coalesce(vii.card_print_id, slab.card_print_id) = s.card_print_id
    ) owned on true
  ),
  filtered as (
    select *
    from enriched e
    where v_filter = 'all'
       or (v_filter = 'in_binder' and e.active_quantity >= e.required_quantity)
       or (v_filter = 'missing' and e.active_quantity < e.required_quantity)
       or (v_filter = 'in_your_vault' and e.owned_eligible_count > 0)
       or (v_filter = 'contributed_by_you' and e.contributed_by_you_count > 0)
       or (v_filter = 'needs_review' and e.needs_review)
    order by e.position
    limit v_limit + 1
  ),
  page as (
    select *
    from filtered
    order by position
    limit v_limit
  )
  select
    coalesce(jsonb_agg(jsonb_strip_nulls(
      jsonb_build_object(
        'slot_id', p.slot_id,
        'slot_public_id', p.slot_id,
        'position', p.position,
        'card_print_id', p.card_print_id,
        'card_printing_id', p.card_printing_id,
        'card', p.card,
        'name', p.card ->> 'name',
        'title', p.card ->> 'name',
        'set_label', p.card ->> 'set_name',
        'subtitle', concat_ws(' · ', p.card ->> 'set_name', p.card ->> 'number', p.card ->> 'finish_label'),
        'number', p.card ->> 'number',
        'finish_label', p.card ->> 'finish_label',
        'image_url', p.card ->> 'image_url',
        'required_quantity', p.required_quantity,
        'active_quantity', p.active_quantity,
        'satisfied_quantity', least(p.active_quantity, p.required_quantity),
        'satisfied', p.active_quantity >= p.required_quantity,
        'status', case when p.active_quantity >= p.required_quantity then 'in_binder' else 'missing' end,
        'owned_eligible_count', p.owned_eligible_count,
        'in_your_vault', p.owned_eligible_count > 0,
        'contributed_by_you_count', p.contributed_by_you_count,
        'contributed_by_you', p.contributed_by_you_count > 0,
        'pending_count', p.pending_count,
        'contributions_has_more', p.contributions_has_more,
        'needs_review', p.needs_review,
        'contributions', p.contributions,
        'contribution_ids', p.contribution_ids,
        'pending_contribution_ids', p.pending_contribution_ids,
        'own_contribution_ids', p.own_contribution_ids,
        'removable_contribution_ids', p.removable_contribution_ids,
        'attribution_labels', p.attribution_labels,
        'viewer_contribution_id', p.viewer_contribution_id,
        'contribution_state', p.viewer_contribution_state
      )
    ) order by p.position), '[]'::jsonb),
    case when (select count(*) from filtered) > v_limit
      then (select position from page order by position desc limit 1)
      else null
    end
  into v_items, v_next_position
  from page p;

  if v_member.role in ('owner', 'manager') then
    with rows as (
      select *
      from public.binder_contributions
      where binder_id = v_binder.id and state = 'pending'
      order by created_at desc, id desc
      limit 51
    ),
    page as (
      select * from rows order by created_at desc, id desc limit 50
    )
    select
      coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
        'contribution_id', c.id,
        'contribution_public_id', c.id,
        'member_id', c.contributor_member_id,
        'contributor_member_id', c.contributor_member_id,
        'title', public.binder_card_json_v1(
          c.snapshot_card_print_id,
          c.snapshot_card_printing_id
        ) ->> 'name',
        'member_label', public.binder_member_label_v1(
          c.contributor_member_id,
          v_uid,
          'member'
        ),
        'can_decide', c.contributor_user_id <> v_uid,
        'can_remove', c.contributor_user_id <> v_uid,
        'created_at', c.created_at
      )) order by c.created_at desc, c.id desc), '[]'::jsonb),
      (select count(*) from rows) > 50,
      case when (select count(*) from rows) > 50 then (
        select jsonb_build_object('created_at', created_at, 'id', id)
        from page order by created_at asc, id asc limit 1
      ) else null end
    into v_pending, v_pending_has_more, v_pending_next
    from page c;
  end if;

  return jsonb_build_object(
    'ok', true,
    'items', v_items,
    'pending_contributions', v_pending,
    'pending_contributions_has_more', v_pending_has_more,
    'pending_contributions_next_cursor', v_pending_next,
    'member_completed_slots', coalesce(v_progress.member_completed_slots, 0),
    'total_slots', coalesce(v_progress.total_slots, 0),
    'unit', coalesce(v_progress.unit, 'card_prints'),
    'next_position', v_next_position,
    'next_cursor', case when v_next_position is null then null
      else jsonb_build_object('position', v_next_position)
    end
  );
end;
$$;

create or replace function public.binder_activity_message_v1(p_event_type text)
returns text
language sql
immutable
set search_path = pg_catalog
as $$
  select case lower(btrim(coalesce(p_event_type, '')))
    when 'binder_created' then 'Binder created.'
    when 'metadata_updated' then 'Binder details updated.'
    when 'policy_updated' then 'Binder sharing settings updated.'
    when 'binder_archived' then 'Binder archived.'
    when 'binder_restored' then 'Binder restored.'
    when 'binder_deleted' then 'Binder deleted.'
    when 'checklist_updated' then 'The Binder checklist was updated.'
    when 'milestone_crossed' then 'The Binder reached a progress milestone.'
    when 'milestone_shared_to_pulse' then 'A Binder milestone was shared to Pulse.'
    when 'member_joined' then 'A member joined the Binder.'
    when 'member_left' then 'A member left the Binder.'
    when 'member_removed' then 'A member was removed.'
    when 'member_suspended' then 'A member was suspended.'
    when 'member_reinstated' then 'A member was reinstated.'
    when 'member_role_changed' then 'A member role changed.'
    when 'member_preferences_updated' then 'A member updated Binder preferences.'
    when 'member_blocked' then 'A member was blocked.'
    when 'contribution_added' then 'A card was added.'
    when 'contribution_submitted' then 'A card is awaiting approval.'
    when 'contribution_approved' then 'A card was approved.'
    when 'contribution_rejected' then 'A card was rejected.'
    when 'contribution_withdrawn' then 'A card was withdrawn.'
    when 'contribution_removed' then 'A card was removed from the Binder.'
    when 'contribution_invalidated' then 'A card link is no longer eligible.'
    when 'invitation_created' then 'A Binder invitation was created.'
    when 'invitation_accepted' then 'A Binder invitation was accepted.'
    when 'invitation_declined' then 'A Binder invitation was declined.'
    when 'invitation_revoked' then 'A Binder invitation was revoked.'
    when 'invitation_expired' then 'A Binder invitation expired.'
    when 'join_request_created' then 'A collector requested to join.'
    when 'join_request_approved' then 'A join request was approved.'
    when 'join_request_rejected' then 'A join request was rejected.'
    when 'join_request_withdrawn' then 'A join request was withdrawn.'
    when 'owner_transfer_offered' then 'Ownership transfer was offered.'
    when 'owner_transfer_expired' then 'An ownership transfer offer expired.'
    when 'owner_transfer_revoked' then 'An ownership transfer offer was revoked.'
    when 'owner_transferred' then 'Binder ownership was transferred.'
    when 'view_link_created' then 'A view-only link was created.'
    when 'view_link_rotated' then 'A view-only link was rotated.'
    when 'view_link_revoked' then 'A view-only link was revoked.'
    when 'view_link_expired' then 'A view-only link expired.'
    when 'template_submitted' then 'A Binder Template was submitted.'
    when 'template_published' then 'A Binder Template was published.'
    when 'template_rejected' then 'A Binder Template submission was rejected.'
    when 'moderation_changed' then 'Binder moderation status changed.'
    when 'retention_finalized' then 'Binder retention processing was finalized.'
    else 'Binder updated.'
  end;
$$;

create or replace function public.binder_activity_v1(
  p_public_id uuid,
  p_limit integer default 50,
  p_before_created_at timestamptz default null,
  p_before_id uuid default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := public.binder_require_user_v1();
  v_context record;
  v_limit integer := least(greatest(coalesce(p_limit, 50), 1), 50);
  v_items jsonb;
  v_next jsonb;
begin
  select * into v_context from public.binder_member_context_v1(p_public_id);
  with rows as (
    select
      e.id,
      e.created_at,
      jsonb_strip_nulls(jsonb_build_object(
        'id', e.id,
        'event_id', e.id,
        'event_public_id', e.id,
        'kind', e.event_type,
        'event_type', e.event_type,
        'message', public.binder_activity_message_v1(e.event_type),
        'summary', public.binder_activity_message_v1(e.event_type),
        'actor_kind', e.actor_kind,
        'actor_label', case
          when e.actor_kind = 'service' then 'Grookai'
          when actor_member.id is null then 'A Binder member'
          else public.binder_member_label_v1(actor_member.id, v_uid, 'member')
        end,
        'created_at', e.created_at
      )) as item
    from public.binder_activity_events e
    left join public.binder_members actor_member
      on actor_member.binder_id = e.binder_id
     and actor_member.user_id = e.actor_user_id
    where e.binder_id = v_context.binder_id
      and (
        p_before_created_at is null
        or (e.created_at, e.id) < (p_before_created_at, p_before_id)
      )
    order by e.created_at desc, e.id desc
    limit v_limit + 1
  ),
  page as (
    select * from rows order by created_at desc, id desc limit v_limit
  )
  select
    coalesce(jsonb_agg(item order by created_at desc, id desc), '[]'::jsonb),
    case when (select count(*) from rows) > v_limit then (
      select jsonb_build_object('created_at', created_at, 'id', id)
      from page order by created_at asc, id asc limit 1
    ) else null end
  into v_items, v_next
  from page;

  return jsonb_build_object('ok', true, 'items', v_items, 'next_cursor', v_next);
end;
$$;

create or replace function public.binder_members_v1(
  p_public_id uuid,
  p_limit integer default 50,
  p_after_member_id uuid default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := public.binder_require_user_v1();
  v_context record;
  v_actor public.binder_members%rowtype;
  v_binder public.binders%rowtype;
  v_limit integer := least(greatest(coalesce(p_limit, 50), 1), 50);
  v_items jsonb;
  v_requests jsonb := '[]'::jsonb;
  v_next jsonb;
begin
  select * into v_context from public.binder_member_context_v1(p_public_id);
  select * into v_actor from public.binder_members where id = v_context.member_id;
  select * into v_binder from public.binders where id = v_context.binder_id;

  with rows as (
    select
      m.id,
      jsonb_strip_nulls(jsonb_build_object(
        'id', m.id,
        'membership_id', m.id,
        'membership_public_id', m.id,
        'role', m.role,
        'state', m.state,
        'status', m.state,
        'display_label', public.binder_member_label_v1(m.id, v_uid, 'member'),
        'display_name', public.binder_member_label_v1(m.id, v_uid, 'member'),
        'alias', case
          when public.binder_member_label_v1(m.id, v_uid, 'member') = 'A Binder member'
            then null
          else public.binder_member_label_v1(m.id, v_uid, 'member')
        end,
        'is_current_user', m.user_id = v_uid,
        'content_consent_scope', m.content_scope,
        'identity_consent_scope', m.identity_scope,
        'content_scope', m.content_scope,
        'identity_scope', m.identity_scope,
        'joined_at', m.joined_at,
        'active_contribution_count', (
          select count(*)
          from public.binder_contributions c
          where c.contributor_member_id = m.id and c.state = 'active'
        ),
        'can_manage',
          v_binder.lifecycle = 'active'
          and v_binder.moderation_state not in ('frozen', 'removed')
          and m.id <> v_actor.id
          and m.role <> 'owner'
          and (
            v_actor.role = 'owner'
            or (v_actor.role = 'manager' and m.role in ('contributor', 'viewer'))
          )
      )) as item
    from public.binder_members m
    where m.binder_id = v_binder.id
      and m.state in ('active', 'suspended')
      and (p_after_member_id is null or m.id > p_after_member_id)
    order by m.id
    limit v_limit + 1
  ),
  page as (
    select * from rows order by id limit v_limit
  )
  select
    coalesce(jsonb_agg(item order by id), '[]'::jsonb),
    case when (select count(*) from rows) > v_limit then (
      select jsonb_build_object('member_id', id, 'id', id)
      from page order by id desc limit 1
    ) else null end
  into v_items, v_next
  from page;

  if v_actor.role in ('owner', 'manager') then
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', r.id,
      'request_id', r.id,
      'request_public_id', r.id,
      'state', r.status,
      'requested_role', r.requested_role_ceiling,
      'member_label', coalesce(nullif(btrim(pp.display_name), ''), 'Collector'),
      'requester_label', coalesce(nullif(btrim(pp.display_name), ''), 'Collector'),
      'created_at', r.requested_at
    ) order by r.requested_at, r.id), '[]'::jsonb)
    into v_requests
    from (
      select *
      from public.binder_join_requests
      where binder_id = v_binder.id and status = 'pending'
      order by requested_at, id
      limit 50
    ) r
    left join public.public_profiles pp
      on pp.user_id = r.requester_user_id
     and pp.public_profile_enabled is true
    where r.requester_user_id is null
       or not public.binder_pair_blocked_v1(r.requester_user_id, v_uid);
  end if;

  return jsonb_build_object(
    'ok', true,
    'items', v_items,
    'pending_join_requests', v_requests,
    'join_requests', v_requests,
    'next_cursor', v_next,
    'next_member_id', v_next ->> 'member_id'
  );
end;
$$;

create or replace function public.binder_copy_item_json_v1(
  p_binder_id uuid,
  p_user_id uuid,
  p_vault_item_instance_id uuid
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with copy as (
    select
      vii.id,
      vii.user_id,
      vii.gv_vi_id,
      coalesce(vii.card_print_id, slab.card_print_id) as card_print_id,
      vii.card_printing_id,
      vii.created_at,
      public.binder_gvvi_valid_v1(vii.user_id, vii.gv_vi_id) as gvvi_valid,
      (
        vii.card_printing_id is null
        or exists (
          select 1
          from public.card_printings cpn
          where cpn.id = vii.card_printing_id
            and cpn.card_print_id = coalesce(vii.card_print_id, slab.card_print_id)
        )
      ) as printing_valid
    from public.vault_item_instances vii
    left join public.slab_certs slab on slab.id = vii.slab_cert_id
    where vii.id = p_vault_item_instance_id
      and vii.user_id = p_user_id
      and vii.archived_at is null
  ),
  classified as (
    select
      c.*,
      public.binder_contribution_matches_v1(
        p_binder_id,
        c.card_print_id,
        c.card_printing_id
      ) as target_matches,
      live.id as contribution_id
    from copy c
    left join lateral (
      select bc.id
      from public.binder_contributions bc
      where bc.binder_id = p_binder_id
        and bc.vault_item_instance_id = c.id
        and bc.state in ('pending', 'active')
      limit 1
    ) live on true
  )
  select jsonb_strip_nulls(jsonb_build_object(
    'instance_id', c.id,
    'vault_item_instance_id', c.id,
    'copy_reference', c.id,
    'created_at', c.created_at,
    'card_print_id', c.card_print_id,
    'card_printing_id', c.card_printing_id,
    'card', public.binder_card_json_v1(c.card_print_id, c.card_printing_id),
    'name', public.binder_card_json_v1(c.card_print_id, c.card_printing_id) ->> 'name',
    'title', public.binder_card_json_v1(c.card_print_id, c.card_printing_id) ->> 'name',
    'set_label', public.binder_card_json_v1(c.card_print_id, c.card_printing_id) ->> 'set_name',
    'number', public.binder_card_json_v1(c.card_print_id, c.card_printing_id) ->> 'number',
    'finish_label', public.binder_card_json_v1(c.card_print_id, c.card_printing_id) ->> 'finish_label',
    'image_url', public.binder_card_json_v1(c.card_print_id, c.card_printing_id) ->> 'image_url',
    'eligibility', case
      when not c.gvvi_valid or c.card_print_id is null or not c.printing_valid then 'unresolved'
      when not c.target_matches then 'ineligible'
      when c.contribution_id is not null then 'duplicate'
      else 'eligible'
    end,
    'eligible',
      c.gvvi_valid
      and c.card_print_id is not null
      and c.printing_valid
      and c.target_matches
      and c.contribution_id is null,
    'reason', case
      when not c.gvvi_valid then 'Copy identity needs repair.'
      when c.card_print_id is null then 'Canonical card identity is unavailable.'
      when not c.printing_valid then 'Finish identity needs review.'
      when not c.target_matches then 'Copy is outside this Binder checklist.'
      when c.contribution_id is not null then 'Copy is already linked to this Binder.'
      else null
    end,
    'contribution_id', c.contribution_id
  ))
  from classified c;
$$;

create or replace function public.binder_eligible_copies_v1(
  p_public_id uuid,
  p_limit integer default 50,
  p_after_created_at timestamptz default null,
  p_after_instance_id uuid default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := public.binder_require_user_v1();
  v_context record;
  v_binder public.binders%rowtype;
  v_member public.binder_members%rowtype;
  v_limit integer := least(greatest(coalesce(p_limit, 50), 1), 50);
  v_items jsonb;
  v_next jsonb;
begin
  select * into v_context from public.binder_member_context_v1(p_public_id);
  select * into v_binder from public.binders where id = v_context.binder_id;
  select * into v_member from public.binder_members where id = v_context.member_id;
  if v_binder.lifecycle <> 'active'
     or v_binder.moderation_state in ('frozen', 'removed')
     or v_member.role = 'viewer'
     or (
       v_binder.contribution_policy = 'owner_only'
       and v_member.role <> 'owner'
     ) then
    return jsonb_build_object('ok', true, 'items', '[]'::jsonb, 'next_cursor', null);
  end if;

  with candidates as (
    select
      vii.id,
      vii.created_at,
      public.binder_copy_item_json_v1(v_binder.id, v_uid, vii.id) as item
    from public.vault_item_instances vii
    where vii.user_id = v_uid
      and vii.archived_at is null
      and (
        p_after_created_at is null
        or (vii.created_at, vii.id) > (p_after_created_at, p_after_instance_id)
      )
      and public.binder_gvvi_valid_v1(vii.user_id, vii.gv_vi_id)
      and public.binder_contribution_matches_v1(
        v_binder.id,
        coalesce(
          vii.card_print_id,
          (select slab.card_print_id from public.slab_certs slab where slab.id = vii.slab_cert_id)
        ),
        vii.card_printing_id
      )
    order by vii.created_at, vii.id
    limit v_limit + 1
  ),
  page as (
    select * from candidates order by created_at, id limit v_limit
  )
  select
    coalesce(jsonb_agg(item order by created_at, id), '[]'::jsonb),
    case when (select count(*) from candidates) > v_limit then (
      select jsonb_build_object('created_at', created_at, 'instance_id', id, 'id', id)
      from page order by created_at desc, id desc limit 1
    ) else null end
  into v_items, v_next
  from page;

  return jsonb_build_object('ok', true, 'items', v_items, 'next_cursor', v_next);
end;
$$;

create or replace function public.binder_bulk_preview_v1(
  p_public_id uuid,
  p_limit integer default 100,
  p_after_created_at timestamptz default null,
  p_after_instance_id uuid default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := public.binder_require_user_v1();
  v_context record;
  v_binder public.binders%rowtype;
  v_member public.binder_members%rowtype;
  v_limit integer := least(greatest(coalesce(p_limit, 100), 1), 100);
  v_items jsonb;
  v_next jsonb;
  v_eligible integer;
  v_duplicate integer;
  v_unresolved integer;
  v_ineligible integer;
begin
  select * into v_context from public.binder_member_context_v1(p_public_id);
  select * into v_binder from public.binders where id = v_context.binder_id;
  select * into v_member from public.binder_members where id = v_context.member_id;
  if v_binder.lifecycle <> 'active'
     or v_binder.moderation_state in ('frozen', 'removed')
     or v_member.role = 'viewer'
     or (v_binder.contribution_policy = 'owner_only' and v_member.role <> 'owner') then
    raise exception 'unavailable' using errcode = 'P0001';
  end if;

  with candidates as (
    select
      vii.id,
      vii.created_at,
      public.binder_copy_item_json_v1(v_binder.id, v_uid, vii.id) as item
    from public.vault_item_instances vii
    where vii.user_id = v_uid
      and vii.archived_at is null
      and (
        p_after_created_at is null
        or (vii.created_at, vii.id) > (p_after_created_at, p_after_instance_id)
      )
    order by vii.created_at, vii.id
    limit v_limit + 1
  ),
  page as (
    select * from candidates order by created_at, id limit v_limit
  )
  select
    coalesce(jsonb_agg(item order by created_at, id), '[]'::jsonb),
    count(*) filter (where item ->> 'eligibility' = 'eligible')::integer,
    count(*) filter (where item ->> 'eligibility' = 'duplicate')::integer,
    count(*) filter (where item ->> 'eligibility' = 'unresolved')::integer,
    count(*) filter (where item ->> 'eligibility' = 'ineligible')::integer,
    case when (select count(*) from candidates) > v_limit then (
      select jsonb_build_object('created_at', created_at, 'instance_id', id, 'id', id)
      from page order by created_at desc, id desc limit 1
    ) else null end
  into v_items, v_eligible, v_duplicate, v_unresolved, v_ineligible, v_next
  from page;

  return jsonb_build_object(
    'ok', true,
    'preview_id', md5(concat_ws(':', v_binder.id, v_uid, p_after_created_at, p_after_instance_id))::uuid,
    'eligible_count', coalesce(v_eligible, 0),
    'duplicate_count', coalesce(v_duplicate, 0),
    'unresolved_count', coalesce(v_unresolved, 0),
    'ineligible_count', coalesce(v_ineligible, 0),
    'items', v_items,
    'sample', v_items,
    'next_cursor', v_next,
    'resume_cursor', v_next,
    'expires_at', now() + interval '10 minutes'
  );
end;
$$;

create or replace function public.binder_invitation_preview_v1(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := public.binder_require_user_v1();
  v_invitation public.binder_invitations%rowtype;
  v_binder public.binders%rowtype;
  v_inviter_member public.binder_members%rowtype;
begin
  if not public.binder_feature_enabled_v1('shared')
     or char_length(btrim(coalesce(p_token, ''))) not between 20 and 256 then
    raise exception 'unavailable' using errcode = 'P0001';
  end if;
  select *
  into v_invitation
  from public.binder_invitations
  where token_hash = public.binder_token_hash_v1(btrim(p_token))
  limit 1;
  if not found
     or v_invitation.status <> 'pending'
     or v_invitation.expires_at <= now()
     or (v_invitation.is_account_targeted and v_invitation.intended_user_id <> v_uid) then
    raise exception 'unavailable' using errcode = 'P0001';
  end if;
  select * into v_binder
  from public.binders
  where id = v_invitation.binder_id;
  if not found
     or v_binder.lifecycle <> 'active'
     or v_binder.moderation_state in ('frozen', 'removed')
     or v_binder.join_policy <> 'invite_only'
     or not public.binder_target_enabled_v1(v_binder.id)
     or public.binder_pair_blocked_v1(v_uid, v_binder.owner_user_id)
     or (
       v_invitation.inviter_user_id is not null
       and public.binder_pair_blocked_v1(v_uid, v_invitation.inviter_user_id)
     )
     or exists (
       select 1
       from public.binder_members m
       where m.binder_id = v_binder.id
         and m.user_id = v_uid
         and m.state in ('active', 'suspended')
     ) then
    raise exception 'unavailable' using errcode = 'P0001';
  end if;
  select * into v_inviter_member
  from public.binder_members
  where binder_id = v_binder.id
    and user_id = v_invitation.inviter_user_id
    and state = 'active';
  if v_inviter_member.id is null
     or v_inviter_member.role not in ('owner', 'manager')
     or (
       v_invitation.max_role = 'manager'
       and v_inviter_member.role <> 'owner'
     ) then
    raise exception 'unavailable' using errcode = 'P0001';
  end if;

  return jsonb_build_object(
    'ok', true,
    'state', 'active',
    'maximum_role', v_invitation.max_role,
    'binder_public_id', v_binder.public_id,
    'binder_title', v_binder.title,
    'inviter_label', public.binder_member_label_v1(v_inviter_member.id, v_uid, 'member'),
    'expires_at', v_invitation.expires_at,
    'is_account_targeted', v_invitation.is_account_targeted,
    'invitation', jsonb_build_object(
      'state', 'active',
      'status', 'active',
      'role', v_invitation.max_role,
      'maximum_role', v_invitation.max_role,
      'inviter_label', public.binder_member_label_v1(v_inviter_member.id, v_uid, 'member'),
      'expires_at', v_invitation.expires_at
    ),
    'binder', jsonb_build_object(
      'public_id', v_binder.public_id,
      'title', v_binder.title
    ),
    'privacy_copy',
      'Cards stay in each collector''s Vault. The Binder combines only the copies members choose to contribute.'
  );
end;
$$;

create or replace function public.binder_external_checklist_page_v1(
  p_binder_id uuid,
  p_audience text,
  p_viewer_user_id uuid,
  p_limit integer default 50,
  p_after_position integer default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_binder public.binders%rowtype;
  v_audience text := lower(btrim(coalesce(p_audience, '')));
  v_limit integer := least(greatest(coalesce(p_limit, 50), 1), 50);
  v_items jsonb;
  v_next integer;
begin
  if v_audience not in ('link', 'public') then
    raise exception 'unavailable' using errcode = 'P0001';
  end if;
  select * into v_binder from public.binders where id = p_binder_id;
  if not found
     or v_binder.lifecycle <> 'active'
     or v_binder.moderation_state in ('frozen', 'removed')
     or not public.binder_target_enabled_v1(v_binder.id) then
    raise exception 'unavailable' using errcode = 'P0001';
  end if;

  with slots as (
    select *
    from public.binder_slot_rows_v1(v_binder.id)
    where p_after_position is null or position > p_after_position
    order by position
    limit v_limit + 1
  ),
  enriched as (
    select
      s.*,
      public.binder_card_json_v1(s.card_print_id, s.card_printing_id) as card,
      coalesce(coverage.active_quantity, 0)::integer as active_quantity,
      coalesce(coverage.attribution_labels, '[]'::jsonb) as attribution_labels,
      coalesce(coverage.contributors, '[]'::jsonb) as contributors,
      coalesce(coverage.contribution_actions, '[]'::jsonb) as contribution_actions,
      coalesce(coverage.contribution_actions_has_more, false)
        as contribution_actions_has_more
    from slots s
    left join lateral (
      select
        count(*) as active_quantity,
        coalesce(jsonb_agg(distinct to_jsonb(public.binder_member_label_v1(
          eligible.member_id,
          p_viewer_user_id,
          v_audience
        ))), '[]'::jsonb) as attribution_labels,
        coalesce(jsonb_agg(distinct jsonb_strip_nulls(jsonb_build_object(
          'alias', case
            when public.binder_member_label_v1(
                   eligible.member_id,
                   p_viewer_user_id,
                   v_audience
                 )
                   = 'A Binder member'
              then null
            else public.binder_member_label_v1(
              eligible.member_id,
              p_viewer_user_id,
              v_audience
            )
          end,
          'identity_visible',
            public.binder_member_label_v1(
              eligible.member_id,
              p_viewer_user_id,
              v_audience
            ) <> 'A Binder member',
          'member_action_ref', case
            when eligible.actionable then eligible.member_action_ref
            else null
          end,
          'permissions', jsonb_build_object(
            'can_report', eligible.actionable,
            'can_block', eligible.actionable
          )
        ))), '[]'::jsonb) as contributors,
        coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
          'contribution_action_ref', eligible.contribution_action_ref,
          'member_action_ref', eligible.member_action_ref,
          'alias', case
            when public.binder_member_label_v1(
                   eligible.member_id,
                   p_viewer_user_id,
                   v_audience
                 ) = 'A Binder member'
              then null
            else public.binder_member_label_v1(
              eligible.member_id,
              p_viewer_user_id,
              v_audience
            )
          end,
          'identity_visible',
            public.binder_member_label_v1(
              eligible.member_id,
              p_viewer_user_id,
              v_audience
            ) <> 'A Binder member',
          'permissions', jsonb_build_object(
            'can_report', true,
            'can_block', true
          )
        )) order by eligible.created_at, eligible.contribution_id)
          filter (
            where eligible.actionable
              and eligible.action_rank <= 20
          ), '[]'::jsonb) as contribution_actions,
        count(*) filter (where eligible.actionable) > 20
          as contribution_actions_has_more
      from (
        select
          c.id as contribution_id,
          c.public_action_ref as contribution_action_ref,
          c.created_at,
          m.id as member_id,
          m.public_action_ref as member_action_ref,
          (
            v_audience = 'public'
            and p_viewer_user_id is not null
            and m.user_id <> p_viewer_user_id
            and not public.binder_pair_blocked_v1(
              p_viewer_user_id,
              m.user_id
            )
          ) as actionable,
          row_number() over (
            partition by (
              v_audience = 'public'
              and p_viewer_user_id is not null
              and m.user_id <> p_viewer_user_id
              and not public.binder_pair_blocked_v1(
                p_viewer_user_id,
                m.user_id
              )
            )
            order by c.created_at, c.id
          ) as action_rank
        from public.binder_contributions c
        join public.binder_members m
          on m.id = c.contributor_member_id
         and m.binder_id = c.binder_id
         and m.user_id = c.contributor_user_id
         and m.state = 'active'
         and m.role <> 'viewer'
         and m.membership_epoch = c.contributor_membership_epoch
        where c.binder_id = v_binder.id
          and c.state = 'active'
          and c.snapshot_card_print_id = s.card_print_id
          and (
            s.card_printing_id is null
            or c.snapshot_card_printing_id = s.card_printing_id
          )
          and exists (
            select 1
            from public.vault_item_instances vii
            left join public.slab_certs slab on slab.id = vii.slab_cert_id
            where vii.id = c.vault_item_instance_id
              and vii.user_id = c.contributor_user_id
              and vii.archived_at is null
              and public.binder_gvvi_valid_v1(vii.user_id, vii.gv_vi_id)
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
                    and cpn.card_print_id = coalesce(
                      vii.card_print_id,
                      slab.card_print_id
                    )
                )
              )
          )
          and public.binder_audience_rank_v1(m.content_scope)
                >= public.binder_audience_rank_v1(v_audience)
          and m.content_consent_epoch = m.membership_epoch
          and m.content_consent_revision
                = v_binder.external_projection_revision
          and not public.binder_pair_blocked_v1(
            m.user_id,
            v_binder.owner_user_id
          )
      ) eligible
    ) coverage on true
  ),
  page as (
    select * from enriched order by position limit v_limit
  )
  select
    coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
      'slot_id', p.slot_id,
      'slot_public_id', p.slot_id,
      'position', p.position,
      'card_print_id', p.card_print_id,
      'card_printing_id', p.card_printing_id,
      'card', p.card,
      'name', p.card ->> 'name',
      'title', p.card ->> 'name',
      'set_label', p.card ->> 'set_name',
      'subtitle', concat_ws(' · ', p.card ->> 'set_name', p.card ->> 'number', p.card ->> 'finish_label'),
      'number', p.card ->> 'number',
      'finish_label', p.card ->> 'finish_label',
      'image_url', p.card ->> 'image_url',
      'required_quantity', p.required_quantity,
      'active_quantity', p.active_quantity,
      'satisfied_quantity', least(p.active_quantity, p.required_quantity),
      'satisfied', p.active_quantity >= p.required_quantity,
      'status', case when p.active_quantity >= p.required_quantity then 'in_binder' else 'missing' end,
      'attribution_labels', p.attribution_labels,
      'contributors', p.contributors,
      'contribution_actions', p.contribution_actions,
      'contribution_actions_has_more', p.contribution_actions_has_more,
      'needs_review', false
    )) order by p.position), '[]'::jsonb),
    case when (select count(*) from slots) > v_limit then (
      select position from page order by position desc limit 1
    ) else null end
  into v_items, v_next
  from page p;

  return jsonb_build_object(
    'items', v_items,
    'next_position', v_next,
    'next_cursor', case when v_next is null then null else jsonb_build_object('position', v_next) end
  );
end;
$$;

create or replace function public.binder_external_contributor_count_v1(
  p_binder_id uuid,
  p_audience text
)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(distinct m.id)::integer
  from public.binders b
  join public.binder_contributions c
    on c.binder_id = b.id
   and c.state = 'active'
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
   and public.binder_gvvi_valid_v1(vii.user_id, vii.gv_vi_id)
   and vii.gv_vi_id = c.snapshot_gv_vi_id
  left join public.slab_certs slab on slab.id = vii.slab_cert_id
  where b.id = p_binder_id
    and p_audience in ('link', 'public')
    and b.lifecycle = 'active'
    and b.moderation_state not in ('frozen', 'removed')
    and public.binder_audience_rank_v1(m.content_scope)
          >= public.binder_audience_rank_v1(p_audience)
    and m.content_consent_epoch = m.membership_epoch
    and m.content_consent_revision = b.external_projection_revision
    and not public.binder_pair_blocked_v1(m.user_id, b.owner_user_id)
    and coalesce(vii.card_print_id, slab.card_print_id)
          is not distinct from c.snapshot_card_print_id
    and vii.card_printing_id
          is not distinct from c.snapshot_card_printing_id
    and (
      vii.card_printing_id is null
      or exists (
        select 1
        from public.card_printings printing
        where printing.id = vii.card_printing_id
          and printing.card_print_id = coalesce(vii.card_print_id, slab.card_print_id)
      )
    )
    and public.binder_contribution_matches_v1(
      b.id,
      coalesce(vii.card_print_id, slab.card_print_id),
      vii.card_printing_id
    );
$$;

create or replace function public.binder_external_detail_v1(
  p_binder_id uuid,
  p_audience text,
  p_viewer_user_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_binder public.binders%rowtype;
  v_progress public.binder_progress_state%rowtype;
  v_page jsonb;
  v_completed integer;
  v_contributor_count integer;
  v_request public.binder_join_requests%rowtype;
  v_can_request boolean := false;
begin
  select * into v_binder from public.binders where id = p_binder_id;
  if not found
     or p_audience not in ('link', 'public')
     or v_binder.lifecycle <> 'active'
     or v_binder.moderation_state in ('frozen', 'removed')
     or not public.binder_target_enabled_v1(v_binder.id) then
    raise exception 'unavailable' using errcode = 'P0001';
  end if;
  select * into v_progress from public.binder_progress_state where binder_id = v_binder.id;
  v_completed := case p_audience
    when 'public' then coalesce(v_progress.public_completed_slots, 0)
    else coalesce(v_progress.link_completed_slots, 0)
  end;
  v_page := public.binder_external_checklist_page_v1(
    v_binder.id,
    p_audience,
    p_viewer_user_id,
    50,
    null
  );
  v_contributor_count := public.binder_external_contributor_count_v1(
    v_binder.id,
    p_audience
  );

  if p_audience = 'public' and p_viewer_user_id is not null then
    select * into v_request
    from public.binder_join_requests
    where binder_id = v_binder.id
      and requester_user_id = p_viewer_user_id
    order by requested_at desc
    limit 1;
    v_can_request :=
      public.binder_feature_enabled_v1('community')
      and v_binder.read_access = 'public'
      and v_binder.discoverability = 'listed'
      and v_binder.moderation_state = 'clear'
      and v_binder.join_policy = 'request_to_join'
      and v_binder.contribution_policy = 'approval_required'
      and not public.binder_pair_blocked_v1(p_viewer_user_id, v_binder.owner_user_id)
      and not exists (
        select 1 from public.binder_members m
        where m.binder_id = v_binder.id
          and m.user_id = p_viewer_user_id
          and m.state in ('active', 'suspended')
      )
      and coalesce(v_request.status, '') <> 'pending';
  end if;

  return jsonb_build_object(
    'ok', true,
    'binder', jsonb_strip_nulls(jsonb_build_object(
      'id', v_binder.public_id,
      'public_id', v_binder.public_id,
      'title', v_binder.title,
      'description', v_binder.description,
      'target_kind', v_binder.target_kind,
      'target', public.binder_target_json_v1(v_binder.id),
      'target_label', public.binder_target_json_v1(v_binder.id) ->> 'label',
      'checklist_mode', v_binder.checklist_mode,
      'read_access', v_binder.read_access,
      'discoverability', case
        when v_binder.moderation_state = 'forced_unlisted' then 'unlisted'
        else v_binder.discoverability
      end,
      'lifecycle', v_binder.lifecycle,
      'moderated', v_binder.moderation_state = 'clear',
      'moderation_approved', v_binder.moderation_state = 'clear',
      'cover_image_url', public.binder_card_json_v1(v_binder.cover_card_print_id, null) ->> 'image_url',
      'is_external_projection', true
    )),
    'progress', jsonb_build_object(
      'completed_slots', v_completed,
      'total_slots', coalesce(v_progress.total_slots, 0),
      'unit', coalesce(v_progress.unit, 'card_prints'),
      'external', jsonb_build_object(
        'completed_slots', v_completed,
        'total_slots', coalesce(v_progress.total_slots, 0),
        'unit', coalesce(v_progress.unit, 'card_prints')
      )
    ),
    'member_summary', jsonb_build_object(
      'contributor_count', coalesce(v_contributor_count, 0),
      'member_count', coalesce(v_contributor_count, 0)
    ),
    'viewer', jsonb_build_object(
      'can_request_to_join', v_can_request,
      'join_request_status', coalesce(v_request.status, 'none'),
      'join_request_id', v_request.id
    ),
    'permissions', jsonb_build_object(
      'can_report',
      p_viewer_user_id is not null
        and p_audience = 'public'
        and p_viewer_user_id <> v_binder.owner_user_id
        and not public.binder_pair_blocked_v1(
          p_viewer_user_id,
          v_binder.owner_user_id
        ),
      'can_block_owner',
      p_viewer_user_id is not null
        and p_audience = 'public'
        and p_viewer_user_id <> v_binder.owner_user_id
        and not public.binder_pair_blocked_v1(
          p_viewer_user_id,
          v_binder.owner_user_id
        )
    ),
    'checklist', v_page -> 'items',
    'checklist_items', v_page -> 'items',
    'checklist_page', v_page,
    'next_position', v_page -> 'next_position'
  );
end;
$$;

create or replace function public.binder_public_detail_v1(p_public_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := case
    when auth.role() = 'authenticated'
      or current_setting('role', true) = 'authenticated'
      then auth.uid()
    else null
  end;
  v_binder public.binders%rowtype;
begin
  if not public.binder_feature_enabled_v1('public') then
    raise exception 'unavailable' using errcode = 'P0001';
  end if;
  select * into v_binder
  from public.binders
  where public_id = p_public_id
    and read_access = 'public'
    and lifecycle = 'active'
    and moderation_state not in ('frozen', 'removed');
  if not found
     or not public.binder_target_enabled_v1(v_binder.id)
     or (
       v_uid is not null
       and public.binder_pair_blocked_v1(v_uid, v_binder.owner_user_id)
     ) then
    raise exception 'unavailable' using errcode = 'P0001';
  end if;
  return public.binder_external_detail_v1(v_binder.id, 'public', v_uid);
end;
$$;

create or replace function public.binder_view_link_detail_v1(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := case
    when auth.role() = 'authenticated'
      or current_setting('role', true) = 'authenticated'
      then auth.uid()
    else null
  end;
  v_link public.binder_view_links%rowtype;
  v_binder public.binders%rowtype;
begin
  if not public.binder_feature_enabled_v1('view_links')
     or char_length(btrim(coalesce(p_token, ''))) not between 20 and 256 then
    raise exception 'unavailable' using errcode = 'P0001';
  end if;
  select * into v_link
  from public.binder_view_links
  where token_hash = public.binder_token_hash_v1(btrim(p_token))
    and status = 'active'
    and (expires_at is null or expires_at > now())
  limit 1;
  if not found then
    raise exception 'unavailable' using errcode = 'P0001';
  end if;
  select * into v_binder from public.binders where id = v_link.binder_id;
  if not found
     or v_binder.read_access not in ('link', 'public')
     or v_binder.lifecycle <> 'active'
     or v_binder.moderation_state in ('frozen', 'removed')
     or not public.binder_target_enabled_v1(v_binder.id)
     or (
       v_uid is not null
       and public.binder_pair_blocked_v1(v_uid, v_binder.owner_user_id)
     ) then
    raise exception 'unavailable' using errcode = 'P0001';
  end if;
  return public.binder_external_detail_v1(v_binder.id, 'link', v_uid);
end;
$$;

create or replace function public.binder_public_checklist_v1(
  p_public_id uuid,
  p_limit integer default 50,
  p_after_position integer default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := case
    when auth.role() = 'authenticated'
      or current_setting('role', true) = 'authenticated'
      then auth.uid()
    else null
  end;
  v_binder public.binders%rowtype;
begin
  if not public.binder_feature_enabled_v1('public') then
    raise exception 'unavailable' using errcode = 'P0001';
  end if;
  select * into v_binder
  from public.binders
  where public_id = p_public_id
    and read_access = 'public'
    and lifecycle = 'active'
    and moderation_state not in ('frozen', 'removed');
  if not found
     or (
       v_uid is not null
       and public.binder_pair_blocked_v1(v_uid, v_binder.owner_user_id)
     ) then
    raise exception 'unavailable' using errcode = 'P0001';
  end if;
  return public.binder_external_checklist_page_v1(
    v_binder.id, 'public', v_uid, p_limit, p_after_position
  );
end;
$$;

create or replace function public.binder_view_link_checklist_v1(
  p_token text,
  p_limit integer default 50,
  p_after_position integer default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := case
    when auth.role() = 'authenticated'
      or current_setting('role', true) = 'authenticated'
      then auth.uid()
    else null
  end;
  v_link public.binder_view_links%rowtype;
  v_binder public.binders%rowtype;
begin
  if not public.binder_feature_enabled_v1('view_links')
     or char_length(btrim(coalesce(p_token, ''))) not between 20 and 256 then
    raise exception 'unavailable' using errcode = 'P0001';
  end if;
  select * into v_link
  from public.binder_view_links
  where token_hash = public.binder_token_hash_v1(btrim(p_token))
    and status = 'active'
    and (expires_at is null or expires_at > now())
  limit 1;
  if not found then raise exception 'unavailable' using errcode = 'P0001'; end if;
  select * into v_binder from public.binders where id = v_link.binder_id;
  if not found
     or v_binder.read_access not in ('link', 'public')
     or v_binder.lifecycle <> 'active'
     or v_binder.moderation_state in ('frozen', 'removed')
     or (
       v_uid is not null
       and public.binder_pair_blocked_v1(v_uid, v_binder.owner_user_id)
     ) then
    raise exception 'unavailable' using errcode = 'P0001';
  end if;
  return public.binder_external_checklist_page_v1(
    v_binder.id, 'link', v_uid, p_limit, p_after_position
  );
end;
$$;

create or replace function public.binder_explore_v1(
  p_limit integer default 20,
  p_before_created_at timestamptz default null,
  p_before_id uuid default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := case
    when auth.role() = 'authenticated'
      or current_setting('role', true) = 'authenticated'
      then auth.uid()
    else null
  end;
  v_limit integer := least(greatest(coalesce(p_limit, 20), 1), 20);
  v_items jsonb;
  v_next jsonb;
begin
  if not public.binder_feature_enabled_v1('public')
     or not public.binder_feature_enabled_v1('community') then
    return jsonb_build_object('ok', true, 'items', '[]'::jsonb, 'next_cursor', null);
  end if;
  with rows as (
    select
      b.id,
      b.created_at,
      jsonb_strip_nulls(jsonb_build_object(
        'id', b.public_id,
        'public_id', b.public_id,
        'title', b.title,
        'description', b.description,
        'target_kind', b.target_kind,
        'target_label', public.binder_target_json_v1(b.id) ->> 'label',
        'target_key', public.binder_target_json_v1(b.id) ->> 'key',
        'checklist_mode', b.checklist_mode,
        'completed_slots', coalesce(ps.public_completed_slots, 0),
        'total_slots', coalesce(ps.total_slots, 0),
        'member_count', public.binder_external_contributor_count_v1(b.id, 'public'),
        'read_access', 'public',
        'discoverability', 'listed',
        'lifecycle', 'active',
        'moderation_state', b.moderation_state,
        'cover_image_url', public.binder_card_json_v1(b.cover_card_print_id, null) ->> 'image_url',
        'created_at', b.created_at,
        'updated_at', b.updated_at,
        'binder', jsonb_strip_nulls(jsonb_build_object(
          'public_id', b.public_id,
          'title', b.title,
          'description', b.description,
          'target_kind', b.target_kind,
          'target', public.binder_target_json_v1(b.id),
          'checklist_mode', b.checklist_mode,
          'discoverability', 'listed',
          'moderated', true,
          'cover_image_url', public.binder_card_json_v1(b.cover_card_print_id, null) ->> 'image_url'
        )),
        'progress', jsonb_build_object(
          'completed_slots', coalesce(ps.public_completed_slots, 0),
          'total_slots', coalesce(ps.total_slots, 0),
          'unit', coalesce(ps.unit, 'card_prints')
        ),
        'member_summary', jsonb_build_object(
          'contributor_count', public.binder_external_contributor_count_v1(b.id, 'public')
        ),
        'viewer', jsonb_build_object('can_request_to_join', false),
        'checklist', '[]'::jsonb
      )) as item
    from public.binders b
    left join public.binder_progress_state ps on ps.binder_id = b.id
    where b.read_access = 'public'
      and b.discoverability = 'listed'
      and b.lifecycle = 'active'
      and b.moderation_state = 'clear'
      and public.binder_target_enabled_v1(b.id)
      and (
        v_uid is null
        or not public.binder_pair_blocked_v1(v_uid, b.owner_user_id)
      )
      and (
        p_before_created_at is null
        or (b.created_at, b.id) < (p_before_created_at, p_before_id)
      )
    order by b.created_at desc, b.id desc
    limit v_limit + 1
  ),
  page as (
    select * from rows order by created_at desc, id desc limit v_limit
  )
  select
    coalesce(jsonb_agg(item order by created_at desc, id desc), '[]'::jsonb),
    case when (select count(*) from rows) > v_limit then (
      select jsonb_build_object('created_at', created_at, 'id', id)
      from page order by created_at asc, id asc limit 1
    ) else null end
  into v_items, v_next
  from page;
  return jsonb_build_object('ok', true, 'items', v_items, 'next_cursor', v_next);
end;
$$;

create or replace function public.binder_template_checklist_page_v1(
  p_template_id uuid,
  p_version integer,
  p_limit integer default 50,
  p_after_position integer default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_definition jsonb;
  v_limit integer := least(greatest(coalesce(p_limit, 50), 1), 50);
  v_items jsonb;
  v_next integer;
begin
  select tv.definition into v_definition
  from public.binder_template_versions tv
  join public.binder_templates t on t.id = tv.template_id
  where tv.template_id = p_template_id
    and tv.version_number = p_version
    and tv.published_at is not null
    and t.status = 'published'
    and t.moderation_state = 'clear';
  if not found
     or jsonb_typeof(v_definition -> 'slots') <> 'array' then
    raise exception 'unavailable' using errcode = 'P0001';
  end if;

  with slots as (
    select
      (ordinality - 1)::integer as position,
      value as slot
    from jsonb_array_elements(v_definition -> 'slots')
      with ordinality as elements(value, ordinality)
    where p_after_position is null or (ordinality - 1) > p_after_position
    order by ordinality
    limit v_limit + 1
  ),
  page as (
    select * from slots order by position limit v_limit
  )
  select
    coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
      'slot_id', coalesce(p.slot ->> 'slot_id', p.slot ->> 'card_print_id'),
      'slot_public_id', coalesce(p.slot ->> 'slot_id', p.slot ->> 'card_print_id'),
      'position', p.position,
      'card_print_id', p.slot ->> 'card_print_id',
      'card_printing_id', p.slot ->> 'card_printing_id',
      'card', public.binder_card_json_v1(
        (p.slot ->> 'card_print_id')::uuid,
        nullif(p.slot ->> 'card_printing_id', '')::uuid
      ),
      'name', public.binder_card_json_v1(
        (p.slot ->> 'card_print_id')::uuid,
        nullif(p.slot ->> 'card_printing_id', '')::uuid
      ) ->> 'name',
      'title', public.binder_card_json_v1(
        (p.slot ->> 'card_print_id')::uuid,
        nullif(p.slot ->> 'card_printing_id', '')::uuid
      ) ->> 'name',
      'set_label', public.binder_card_json_v1(
        (p.slot ->> 'card_print_id')::uuid,
        nullif(p.slot ->> 'card_printing_id', '')::uuid
      ) ->> 'set_name',
      'number', public.binder_card_json_v1(
        (p.slot ->> 'card_print_id')::uuid,
        nullif(p.slot ->> 'card_printing_id', '')::uuid
      ) ->> 'number',
      'finish_label', public.binder_card_json_v1(
        (p.slot ->> 'card_print_id')::uuid,
        nullif(p.slot ->> 'card_printing_id', '')::uuid
      ) ->> 'finish_label',
      'image_url', public.binder_card_json_v1(
        (p.slot ->> 'card_print_id')::uuid,
        nullif(p.slot ->> 'card_printing_id', '')::uuid
      ) ->> 'image_url',
      'required_quantity', greatest(coalesce((p.slot ->> 'required_quantity')::integer, 1), 1),
      'active_quantity', 0,
      'satisfied_quantity', 0,
      'satisfied', false,
      'status', 'missing',
      'contributors', '[]'::jsonb
    )) order by p.position), '[]'::jsonb),
    case when (select count(*) from slots) > v_limit then (
      select position from page order by position desc limit 1
    ) else null end
  into v_items, v_next
  from page p;
  return jsonb_build_object(
    'items', v_items,
    'next_position', v_next,
    'next_cursor', case when v_next is null then null else jsonb_build_object('position', v_next) end
  );
end;
$$;

create or replace function public.binder_templates_v1(
  p_limit integer default 20,
  p_before_created_at timestamptz default null,
  p_before_id uuid default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_limit integer := least(greatest(coalesce(p_limit, 20), 1), 20);
  v_items jsonb;
  v_next jsonb;
begin
  if not public.binder_feature_enabled_v1('templates') then
    return jsonb_build_object('ok', true, 'items', '[]'::jsonb, 'next_cursor', null);
  end if;
  with rows as (
    select
      t.id,
      t.created_at,
      jsonb_strip_nulls(jsonb_build_object(
        'id', t.public_id,
        'template_id', t.public_id,
        'template_public_id', t.public_id,
        'public_id', t.public_id,
        'title', t.title,
        'description', t.description,
        'target_kind', t.target_kind,
        'checklist_mode', t.checklist_mode,
        'slot_count', jsonb_array_length(tv.definition -> 'slots'),
        'checklist_slot_count', jsonb_array_length(tv.definition -> 'slots'),
        'version', tv.version_number,
        'version_number', tv.version_number,
        'adoption_count', case
          when (
            select count(distinct a.adopter_user_id)
            from public.binder_template_adoptions a
            where a.template_version_id = tv.id
          ) >= 5 then (
            select count(distinct a.adopter_user_id)
            from public.binder_template_adoptions a
            where a.template_version_id = tv.id
          )
          else null
        end,
        'is_system', t.authority_kind = 'system',
        'cover_image_url', public.binder_card_json_v1(
          nullif(tv.definition #>> '{slots,0,card_print_id}', '')::uuid,
          nullif(tv.definition #>> '{slots,0,card_printing_id}', '')::uuid
        ) ->> 'image_url',
        'created_at', t.created_at
      )) as item
    from public.binder_templates t
    join public.binder_template_versions tv
      on tv.template_id = t.id
     and tv.version_number = t.latest_version
     and tv.published_at is not null
    where t.status = 'published'
      and t.moderation_state = 'clear'
      and jsonb_typeof(tv.definition -> 'slots') = 'array'
      and (
        p_before_created_at is null
        or (t.created_at, t.id) < (p_before_created_at, p_before_id)
      )
    order by t.created_at desc, t.id desc
    limit v_limit + 1
  ),
  page as (
    select * from rows order by created_at desc, id desc limit v_limit
  )
  select
    coalesce(jsonb_agg(item order by created_at desc, id desc), '[]'::jsonb),
    case when (select count(*) from rows) > v_limit then (
      select jsonb_build_object('created_at', created_at, 'id', id)
      from page order by created_at asc, id asc limit 1
    ) else null end
  into v_items, v_next
  from page;
  return jsonb_build_object('ok', true, 'items', v_items, 'next_cursor', v_next);
end;
$$;

create or replace function public.binder_template_detail_v1(p_public_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_template public.binder_templates%rowtype;
  v_version public.binder_template_versions%rowtype;
  v_page jsonb;
  v_adoptions integer;
  v_template_json jsonb;
begin
  if not public.binder_feature_enabled_v1('templates') then
    raise exception 'unavailable' using errcode = 'P0001';
  end if;
  select * into v_template
  from public.binder_templates
  where public_id = p_public_id
    and status = 'published'
    and moderation_state = 'clear';
  if not found then raise exception 'unavailable' using errcode = 'P0001'; end if;
  select * into v_version
  from public.binder_template_versions
  where template_id = v_template.id
    and version_number = v_template.latest_version
    and published_at is not null;
  if not found or jsonb_typeof(v_version.definition -> 'slots') <> 'array' then
    raise exception 'unavailable' using errcode = 'P0001';
  end if;
  select count(distinct adopter_user_id) into v_adoptions
  from public.binder_template_adoptions
  where template_version_id = v_version.id;
  v_page := public.binder_template_checklist_page_v1(
    v_template.id, v_version.version_number, 50, null
  );
  v_template_json := jsonb_strip_nulls(jsonb_build_object(
    'id', v_template.public_id,
    'template_id', v_template.public_id,
    'template_public_id', v_template.public_id,
    'public_id', v_template.public_id,
    'title', v_template.title,
    'description', v_template.description,
    'target_kind', v_template.target_kind,
    'checklist_mode', v_template.checklist_mode,
    'target_label', v_version.definition ->> 'target_label',
    'target', v_version.definition -> 'target',
    'slot_count', jsonb_array_length(v_version.definition -> 'slots'),
    'checklist_slot_count', jsonb_array_length(v_version.definition -> 'slots'),
    'version', v_version.version_number,
    'version_number', v_version.version_number,
    'adoption_count', case when v_adoptions >= 5 then v_adoptions else null end,
    'is_system', v_template.authority_kind = 'system',
    'cover_image_url', public.binder_card_json_v1(
      nullif(v_version.definition #>> '{slots,0,card_print_id}', '')::uuid,
      nullif(v_version.definition #>> '{slots,0,card_printing_id}', '')::uuid
    ) ->> 'image_url'
  ));
  return jsonb_build_object(
    'ok', true,
    'template', v_template_json,
    'checklist', v_page -> 'items',
    'checklist_page', v_page,
    'next_position', v_page -> 'next_position'
  );
end;
$$;

create or replace function public.binder_template_checklist_v1(
  p_public_id uuid,
  p_version integer default null,
  p_limit integer default 50,
  p_after_position integer default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_template public.binder_templates%rowtype;
  v_version integer;
begin
  if not public.binder_feature_enabled_v1('templates') then
    raise exception 'unavailable' using errcode = 'P0001';
  end if;
  select * into v_template
  from public.binder_templates
  where public_id = p_public_id
    and status = 'published'
    and moderation_state = 'clear';
  if not found then raise exception 'unavailable' using errcode = 'P0001'; end if;
  v_version := coalesce(p_version, v_template.latest_version);
  return public.binder_template_checklist_page_v1(
    v_template.id, v_version, p_limit, p_after_position
  );
end;
$$;

create or replace function public.binder_legacy_candidates_v1()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := public.binder_require_user_v1();
  v_items jsonb;
begin
  if not public.binder_feature_enabled_v1('personal') then
    return jsonb_build_object('ok', true, 'items', '[]'::jsonb);
  end if;
  select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
    'watch_id', candidate.id,
    'source_watch_id', candidate.id,
    'target_kind', case when candidate.subject_type = 'character' then 'species' else 'set' end,
    'target_id', candidate.subject_id,
    'title', case
      when candidate.subject_type = 'character' then candidate.species_name
      else coalesce(nullif(btrim(candidate.set_name), ''), nullif(btrim(candidate.set_code), ''), 'Tracked set')
    end,
    'route_key', case
      when candidate.subject_type = 'character' then candidate.species_slug
      else candidate.set_code
    end,
    'image_url', case
      when candidate.subject_type = 'character' then (
        select public.binder_card_json_v1(cps.card_print_id, null) ->> 'image_url'
        from public.card_print_species cps
        where cps.species_id = candidate.subject_id
          and cps.active is true
          and cps.counts_for_completion is true
        order by cps.created_at, cps.id
        limit 1
      )
      else null
    end
  )) order by candidate.created_at desc), '[]'::jsonb)
  into v_items
  from (
    select
      w.*,
      ps.display_name as species_name,
      ps.slug as species_slug,
      s.name as set_name,
      s.code as set_code
    from public.watches w
    left join public.pokemon_species ps
      on w.subject_type = 'character'
     and ps.id = w.subject_id
     and ps.active is true
    left join public.sets s
      on w.subject_type = 'set'
     and s.id = w.subject_id
    where w.user_id = v_uid
      and w.reason = 'manual'
      and w.subject_type in ('character', 'set')
      and (
        (w.subject_type = 'character' and ps.id is not null)
        or (
          w.subject_type = 'set'
          and s.id is not null
          and public.binder_feature_enabled_v1('set_binders')
          and to_regprocedure('public.binder_set_slots_authority_v1(uuid)') is not null
        )
      )
      and not exists (
        select 1
        from public.binder_legacy_watch_decisions d
        where d.source_watch_id = w.id
      )
    order by w.created_at desc, w.id desc
    limit 100
  ) candidate;
  return jsonb_build_object('ok', true, 'items', v_items, 'candidates', v_items);
end;
$$;

-- Private read helpers.
do $$
declare
  v_signature text;
begin
  foreach v_signature in array array[
    'public.binder_target_enabled_v1(uuid)',
    'public.binder_member_context_v1(uuid)',
    'public.binder_card_json_v1(uuid,uuid)',
    'public.binder_target_json_v1(uuid)',
    'public.binder_slot_rows_v1(uuid)',
    'public.binder_member_label_v1(uuid,uuid,text)',
    'public.binder_summary_json_v1(uuid,uuid)',
    'public.binder_activity_message_v1(text)',
    'public.binder_copy_item_json_v1(uuid,uuid,uuid)',
    'public.binder_external_checklist_page_v1(uuid,text,uuid,integer,integer)',
    'public.binder_external_contributor_count_v1(uuid,text)',
    'public.binder_external_detail_v1(uuid,text,uuid)',
    'public.binder_template_checklist_page_v1(uuid,integer,integer,integer)'
  ]
  loop
    execute 'revoke all on function ' || v_signature || ' from public, anon, authenticated';
  end loop;
end;
$$;

-- Authenticated member and secret-invitation reads.
do $$
declare
  v_signature text;
begin
  foreach v_signature in array array[
    'public.binder_dashboard_v1(integer,timestamptz,uuid)',
    'public.binder_suspended_binders_v1(integer,timestamptz,uuid)',
    'public.binder_invitation_inbox_v1(integer,timestamptz,uuid)',
    'public.binder_detail_v1(uuid)',
    'public.binder_pending_contributions_v1(uuid,integer,timestamptz,uuid)',
    'public.binder_join_requests_queue_v1(uuid,integer,timestamptz,uuid)',
    'public.binder_checklist_v1(uuid,text,integer,integer)',
    'public.binder_activity_v1(uuid,integer,timestamptz,uuid)',
    'public.binder_members_v1(uuid,integer,uuid)',
    'public.binder_eligible_copies_v1(uuid,integer,timestamptz,uuid)',
    'public.binder_bulk_preview_v1(uuid,integer,timestamptz,uuid)',
    'public.binder_invitation_preview_v1(text)',
    'public.binder_legacy_candidates_v1()'
  ]
  loop
    execute 'revoke all on function ' || v_signature || ' from public, anon';
    execute 'grant execute on function ' || v_signature || ' to authenticated, service_role';
  end loop;
end;
$$;

-- Dedicated sanitized external projections.
do $$
declare
  v_signature text;
begin
  foreach v_signature in array array[
    'public.binder_public_detail_v1(uuid)',
    'public.binder_view_link_detail_v1(text)',
    'public.binder_public_checklist_v1(uuid,integer,integer)',
    'public.binder_view_link_checklist_v1(text,integer,integer)',
    'public.binder_explore_v1(integer,timestamptz,uuid)',
    'public.binder_templates_v1(integer,timestamptz,uuid)',
    'public.binder_template_detail_v1(uuid)',
    'public.binder_template_checklist_v1(uuid,integer,integer,integer)'
  ]
  loop
    execute 'revoke all on function ' || v_signature || ' from public';
    execute 'grant execute on function ' || v_signature || ' to anon, authenticated, service_role';
  end loop;
end;
$$;

commit;
