-- CARD_INTERACTIONS_EXACT_PRINTING_V1
-- Preserves the exact child printing selected by a collector when a
-- card-specific conversation is created. Existing parent-only conversations
-- remain valid and are not backfilled or inferred.

begin;

alter table public.card_interactions
  add column if not exists card_printing_id uuid
  references public.card_printings(id) on delete set null;

create index if not exists idx_card_interactions_card_printing_created
on public.card_interactions (card_printing_id, created_at desc)
where card_printing_id is not null;

alter table public.card_interaction_group_states
  add column if not exists card_printing_id uuid
  references public.card_printings(id) on delete set null;

alter table public.card_interaction_group_states
  drop constraint if exists card_interaction_group_states_user_card_counterpart_key;

alter table public.card_interaction_group_states
  add constraint card_interaction_group_states_identity_key
  unique nulls not distinct (
    user_id,
    card_print_id,
    card_printing_id,
    counterpart_user_id
  );

create index if not exists idx_card_interaction_group_states_user_printing_latest
on public.card_interaction_group_states (
  user_id,
  card_print_id,
  card_printing_id,
  latest_message_at desc
);

create or replace function public.card_interactions_enforce_printing_parent_v1()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if new.card_printing_id is not null
     and not exists (
       select 1
       from public.card_printings printing
       where printing.id = new.card_printing_id
         and printing.card_print_id = new.card_print_id
     ) then
    raise exception using
      errcode = '23514',
      message = 'card_interaction_printing_parent_mismatch';
  end if;

  return new;
end;
$$;

revoke all on function public.card_interactions_enforce_printing_parent_v1()
from public, anon, authenticated;

drop trigger if exists card_interactions_enforce_printing_parent_v1
on public.card_interactions;
create trigger card_interactions_enforce_printing_parent_v1
before insert or update of card_print_id, card_printing_id
on public.card_interactions
for each row
execute function public.card_interactions_enforce_printing_parent_v1();

create or replace function public.sync_card_interaction_group_states_v1()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  insert into public.card_interaction_group_states as group_states (
    user_id,
    card_print_id,
    card_printing_id,
    counterpart_user_id,
    has_unread,
    last_read_at,
    latest_message_at,
    archived_at,
    closed_at,
    created_at,
    updated_at
  )
  values (
    new.sender_user_id,
    new.card_print_id,
    new.card_printing_id,
    new.receiver_user_id,
    false,
    new.created_at,
    new.created_at,
    null,
    null,
    new.created_at,
    new.created_at
  )
  on conflict (
    user_id,
    card_print_id,
    card_printing_id,
    counterpart_user_id
  )
  do update set
    has_unread = false,
    last_read_at = greatest(
      coalesce(group_states.last_read_at, '-infinity'::timestamptz),
      excluded.latest_message_at
    ),
    latest_message_at = excluded.latest_message_at,
    archived_at = null,
    closed_at = null,
    updated_at = excluded.updated_at;

  insert into public.card_interaction_group_states as group_states (
    user_id,
    card_print_id,
    card_printing_id,
    counterpart_user_id,
    has_unread,
    last_read_at,
    latest_message_at,
    archived_at,
    closed_at,
    created_at,
    updated_at
  )
  values (
    new.receiver_user_id,
    new.card_print_id,
    new.card_printing_id,
    new.sender_user_id,
    true,
    null,
    new.created_at,
    null,
    null,
    new.created_at,
    new.created_at
  )
  on conflict (
    user_id,
    card_print_id,
    card_printing_id,
    counterpart_user_id
  )
  do update set
    has_unread = true,
    latest_message_at = excluded.latest_message_at,
    archived_at = null,
    closed_at = null,
    updated_at = excluded.updated_at;

  return new;
end;
$$;

revoke all on function public.sync_card_interaction_group_states_v1()
from public, anon, authenticated;

create or replace view public.v_card_contact_targets_v1 as
select
  vii.id as instance_id,
  vii.legacy_vault_item_id as vault_item_id,
  vii.user_id as owner_user_id,
  pp.slug as owner_slug,
  pp.display_name as owner_display_name,
  coalesce(vii.card_print_id, sc.card_print_id) as card_print_id,
  vii.intent,
  vii.condition_label,
  vii.is_graded,
  vii.grade_company,
  vii.grade_value,
  vii.grade_label,
  vii.created_at,
  vii.card_printing_id
from public.vault_item_instances vii
left join public.slab_certs sc
  on sc.id = vii.slab_cert_id
join public.public_profiles pp
  on pp.user_id = vii.user_id
where vii.archived_at is null
  and vii.legacy_vault_item_id is not null
  and coalesce(vii.card_print_id, sc.card_print_id) is not null
  and pp.public_profile_enabled = true
  and pp.vault_sharing_enabled = true
  and not public.trust_block_exists_for_current_viewer_v1(vii.user_id);

alter view public.v_card_contact_targets_v1 set (security_invoker = false);
revoke all on table public.v_card_contact_targets_v1
from public, anon, authenticated;
grant select on table public.v_card_contact_targets_v1 to anon, authenticated;

comment on column public.card_interactions.card_printing_id is
'Exact child printing captured from the contacted vault instance. Null means the interaction predates exact-printing capture or the source copy itself was unassigned; null never authorizes inference.';

comment on column public.card_interaction_group_states.card_printing_id is
'Exact child printing for this conversation state. Null identifies only legacy or explicitly unassigned conversations and never authorizes inference.';

comment on function public.card_interactions_enforce_printing_parent_v1() is
'Rejects any interaction whose optional child printing does not belong to its canonical parent card.';

comment on function public.sync_card_interaction_group_states_v1() is
'Maintains independent per-user conversation state for each parent card, exact child printing, and counterpart tuple.';

comment on view public.v_card_contact_targets_v1 is
'Public contact targets for card-specific collector messaging, including exact child-printing identity when the shared vault instance has one. Anonymous reads avoid viewer-specific block evaluation; authenticated reads preserve two-way block filtering.';

notify pgrst, 'reload schema';

commit;
