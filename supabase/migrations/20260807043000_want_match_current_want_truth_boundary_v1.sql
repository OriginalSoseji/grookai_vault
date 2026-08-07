begin;

do $$
begin
  if to_regclass('public.user_card_intents') is null
     or to_regclass('public.want_matches') is null
     or to_regclass('public.card_events') is null then
    raise exception 'Want Match truth repair requires user_card_intents, want_matches, and card_events';
  end if;

  if to_regprocedure('public.local_community_visible_source_cards_v1(uuid)') is null
     or to_regprocedure('public.binder_pulse_base_eligible_events_for_viewer_v1(uuid)') is null
     or to_regprocedure('public.mark_stale_want_matches_v1(uuid,integer)') is null then
    raise exception 'Want Match truth repair requires the E3/E4/E5 read contracts';
  end if;
end;
$$;

create or replace function public.viewer_has_current_card_want_v1(
  p_user_id uuid,
  p_card_print_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    p_user_id is not null
    and p_card_print_id is not null
    and exists (
      select 1
      from public.user_card_intents uci
      where uci.user_id = p_user_id
        and uci.card_print_id = p_card_print_id
        and uci.want is true
    );
$$;

comment on function public.viewer_has_current_card_want_v1(uuid, uuid) is
'Canonical current-want truth boundary. A durable match, Pulse item, or local-community wishlist signal is current only while user_card_intents.want remains true for the exact card_print_id.';

revoke all on function public.viewer_has_current_card_want_v1(uuid, uuid)
from public, anon, authenticated;
grant execute on function public.viewer_has_current_card_want_v1(uuid, uuid)
to service_role;

-- Preserve the existing source-card implementation, then replace its exposed
-- wishlist boolean with the same current-want predicate used by the app.
alter function public.local_community_visible_source_cards_v1(uuid)
rename to legacy_local_community_visible_source_cards_v1;

create or replace function public.local_community_visible_source_cards_v1(
  p_viewer_user_id uuid
)
returns table (
  source_type text,
  owner_user_id uuid,
  owner_slug text,
  owner_display_name text,
  owner_avatar_path text,
  card_print_id uuid,
  gv_id text,
  card_name text,
  set_code text,
  set_name text,
  card_number text,
  intent text,
  image_url text,
  display_image_kind text,
  locality_label text,
  distance_bucket text,
  relationship_context text,
  viewer_wishlist_match boolean,
  created_at timestamptz,
  route_target text,
  vault_item_id uuid,
  instance_id uuid,
  score double precision,
  match_strength double precision,
  recommended_tier text,
  dedupe_key text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    src.source_type,
    src.owner_user_id,
    src.owner_slug,
    src.owner_display_name,
    src.owner_avatar_path,
    src.card_print_id,
    src.gv_id,
    src.card_name,
    src.set_code,
    src.set_name,
    src.card_number,
    src.intent,
    src.image_url,
    src.display_image_kind,
    src.locality_label,
    src.distance_bucket,
    src.relationship_context,
    public.viewer_has_current_card_want_v1(
      p_viewer_user_id,
      src.card_print_id
    ) as viewer_wishlist_match,
    src.created_at,
    src.route_target,
    src.vault_item_id,
    src.instance_id,
    src.score,
    src.match_strength,
    src.recommended_tier,
    src.dedupe_key
  from public.legacy_local_community_visible_source_cards_v1(
    p_viewer_user_id
  ) src;
$$;

comment on function public.local_community_visible_source_cards_v1(uuid) is
'Current-want truth wrapper around the preserved E5 local-community source implementation. viewer_wishlist_match is derived only from user_card_intents.want for the exact card print.';

revoke all on function public.legacy_local_community_visible_source_cards_v1(uuid)
from public, anon, authenticated;
revoke all on function public.local_community_visible_source_cards_v1(uuid)
from public, anon, authenticated;

create or replace function public.stale_want_matches_when_intent_removed_v1()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_should_stale boolean := false;
begin
  if tg_op = 'DELETE' then
    v_should_stale := old.want is true;
  elsif tg_op = 'UPDATE' then
    v_should_stale := old.want is true and (
      new.want is not true
      or new.user_id is distinct from old.user_id
      or new.card_print_id is distinct from old.card_print_id
    );
  end if;

  if v_should_stale then
    update public.want_matches wm
    set status = 'stale',
        stale_marked_at = coalesce(wm.stale_marked_at, now()),
        payload = wm.payload || jsonb_build_object(
          'stale_reason', 'canonical_want_removed',
          'stale_policy_version', 'WANT_MATCH_CURRENT_WANT_TRUTH_V1'
        )
    where wm.want_user_id = old.user_id
      and wm.card_print_id = old.card_print_id
      and wm.status = 'active';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_stale_want_matches_when_intent_removed_v1
on public.user_card_intents;
create trigger trg_stale_want_matches_when_intent_removed_v1
after update or delete on public.user_card_intents
for each row execute function public.stale_want_matches_when_intent_removed_v1();

comment on function public.stale_want_matches_when_intent_removed_v1() is
'Immediately marks active durable matches stale when the exact canonical want is turned off, deleted, or moved. Match and event history is retained.';

revoke all on function public.stale_want_matches_when_intent_removed_v1()
from public, anon, authenticated;

-- The Binder migration preserved the original card/watch Pulse function under
-- this name. Wrap it so every Pulse consumer, including unread and mark-seen,
-- excludes a Want Match that is not backed by a current exact-card want.
alter function public.binder_pulse_base_eligible_events_for_viewer_v1(uuid)
rename to legacy_binder_pulse_base_eligible_events_v1;

create or replace function public.binder_pulse_base_eligible_events_for_viewer_v1(
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
  select eligible.*
  from public.legacy_binder_pulse_base_eligible_events_v1(
    p_viewer_user_id
  ) eligible
  where eligible.event_type <> 'want_match_available'
     or exists (
       select 1
       from public.want_matches wm
       where wm.id = public.pulse_jsonb_uuid_v1(
           eligible.payload ->> 'want_match_id'
         )
         and wm.want_user_id = p_viewer_user_id
         and wm.card_print_id = eligible.card_print_id
         and wm.status = 'active'
         and public.viewer_has_current_card_want_v1(
           p_viewer_user_id,
           wm.card_print_id
         )
     );
$$;

comment on function public.binder_pulse_base_eligible_events_for_viewer_v1(uuid) is
'Pulse current-want truth wrapper. Historical Want Match events remain stored but are ineligible when the durable match is not active or the exact canonical want no longer exists.';

revoke all on function public.legacy_binder_pulse_base_eligible_events_v1(uuid)
from public, anon, authenticated;
revoke all on function public.binder_pulse_base_eligible_events_for_viewer_v1(uuid)
from public, anon, authenticated;
grant execute on function public.binder_pulse_base_eligible_events_for_viewer_v1(uuid)
to service_role;

-- Repair current drift without deleting any durable match or event rows.
update public.want_matches wm
set status = 'stale',
    stale_marked_at = coalesce(wm.stale_marked_at, now()),
    payload = wm.payload || jsonb_build_object(
      'stale_reason', 'canonical_want_not_current_at_truth_repair',
      'stale_policy_version', 'WANT_MATCH_CURRENT_WANT_TRUTH_V1'
    )
where wm.status = 'active'
  and not public.viewer_has_current_card_want_v1(
    wm.want_user_id,
    wm.card_print_id
  );

-- Existing cleanup covers owner-side availability changes after its seven-day
-- grace period. Schedule it as defense in depth; opt-outs are synchronous.
do $$
declare
  v_job_id bigint;
begin
  if to_regclass('cron.job') is not null then
    for v_job_id in
      select jobid
      from cron.job
      where jobname = 'grookai-want-match-stale-cleanup-v1'
    loop
      perform cron.unschedule(v_job_id);
    end loop;

    perform cron.schedule(
      'grookai-want-match-stale-cleanup-v1',
      '*/15 * * * *',
      'select count(*) from public.mark_stale_want_matches_v1(null, 1000);'
    );
  end if;
end;
$$;

commit;
