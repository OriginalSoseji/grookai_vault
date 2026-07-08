begin;

create or replace function public.local_community_want_match_candidates_v1(
  p_viewer_user_id uuid,
  p_limit integer default 500
)
returns table (
  want_user_id uuid,
  owner_user_id uuid,
  owner_slug text,
  owner_display_name text,
  card_print_id uuid,
  gv_id text,
  card_name text,
  set_code text,
  set_name text,
  card_number text,
  source_type text,
  vault_item_id uuid,
  instance_id uuid,
  intent text,
  distance_bucket text,
  relationship_context text,
  locality_label text,
  display_image_url text,
  display_image_kind text,
  source_created_at timestamptz,
  score double precision,
  match_strength double precision,
  recommended_tier text,
  dedupe_key text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_limit integer := least(greatest(coalesce(p_limit, 500), 1), 1000);
  v_auth_role text := coalesce(auth.role(), '');
  v_auth_uid uuid := auth.uid();
begin
  if p_viewer_user_id is null then
    raise exception 'viewer_required' using errcode = '22023';
  end if;

  if v_auth_uid is null then
    if v_auth_role in ('authenticated', 'anon') then
      raise exception 'not_authorized' using errcode = '42501';
    end if;
  elsif v_auth_role <> 'service_role'
    and v_auth_uid is distinct from p_viewer_user_id then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  return query
  select
    p_viewer_user_id as want_user_id,
    src.owner_user_id,
    src.owner_slug,
    src.owner_display_name,
    src.card_print_id,
    src.gv_id,
    src.card_name,
    src.set_code,
    src.set_name,
    src.card_number,
    src.source_type,
    src.vault_item_id,
    src.instance_id,
    src.intent,
    src.distance_bucket,
    src.relationship_context,
    src.locality_label,
    src.image_url as display_image_url,
    src.display_image_kind,
    src.created_at as source_created_at,
    src.score,
    src.match_strength,
    src.recommended_tier,
    src.dedupe_key
  from public.local_community_visible_source_cards_v1(p_viewer_user_id) src
  where src.viewer_wishlist_match is true
  order by
    case src.distance_bucket when 'nearby' then 0 else 1 end,
    case coalesce(nullif(btrim(src.intent), ''), src.source_type)
      when 'trade' then 0
      when 'sell' then 1
      else 2
    end,
    case src.relationship_context when 'following' then 0 else 1 end,
    src.match_strength desc,
    src.created_at desc nulls last,
    src.owner_slug,
    src.gv_id,
    src.dedupe_key
  limit v_limit;
end;
$$;

comment on function public.local_community_want_match_candidates_v1(uuid, integer) is
'E3 shared want-match candidate RPC. Authenticated callers may request only their own viewer id; service role and scheduled database jobs may run without a JWT. Uses the same local-community predicate as local_community_feed_v2.';

revoke all on function public.local_community_want_match_candidates_v1(uuid, integer) from public, anon;
grant execute on function public.local_community_want_match_candidates_v1(uuid, integer) to authenticated, service_role;

commit;
