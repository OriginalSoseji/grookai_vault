begin;

create table if not exists public.trust_blocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  blocked_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint trust_blocks_no_self_check check (user_id <> blocked_user_id),
  constraint trust_blocks_user_blocked_key unique (user_id, blocked_user_id)
);

create index if not exists idx_trust_blocks_user
on public.trust_blocks (user_id, created_at desc);

create index if not exists idx_trust_blocks_blocked_user
on public.trust_blocks (blocked_user_id, created_at desc);

create table if not exists public.trust_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_user_id uuid not null references auth.users(id) on delete cascade,
  reported_user_id uuid null references auth.users(id) on delete set null,
  surface text not null,
  surface_id text null,
  reason text not null default 'other',
  details text null,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trust_reports_surface_check check (
    surface in ('profile', 'message', 'wall_card', 'listing', 'card', 'gvvi', 'other')
  ),
  constraint trust_reports_reason_check check (
    reason in ('spam', 'harassment', 'scam', 'inappropriate', 'other')
  ),
  constraint trust_reports_status_check check (
    status in ('open', 'reviewing', 'actioned', 'dismissed')
  ),
  constraint trust_reports_no_self_check check (
    reported_user_id is null or reporter_user_id <> reported_user_id
  ),
  constraint trust_reports_details_length_check check (
    details is null or char_length(details) <= 2000
  )
);

create index if not exists idx_trust_reports_reporter
on public.trust_reports (reporter_user_id, created_at desc);

create index if not exists idx_trust_reports_reported
on public.trust_reports (reported_user_id, created_at desc)
where reported_user_id is not null;

create index if not exists idx_trust_reports_status
on public.trust_reports (status, created_at desc);

alter table public.trust_blocks enable row level security;
alter table public.trust_reports enable row level security;

revoke all on table public.trust_blocks from anon, authenticated;
revoke all on table public.trust_reports from anon, authenticated;

grant select, insert, delete on table public.trust_blocks to authenticated;
grant select, insert on table public.trust_reports to authenticated;
grant all on table public.trust_blocks to service_role;
grant all on table public.trust_reports to service_role;

drop policy if exists trust_blocks_select_owner on public.trust_blocks;
create policy trust_blocks_select_owner
on public.trust_blocks
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists trust_blocks_insert_owner on public.trust_blocks;
create policy trust_blocks_insert_owner
on public.trust_blocks
for insert
to authenticated
with check (auth.uid() = user_id and auth.uid() <> blocked_user_id);

drop policy if exists trust_blocks_delete_owner on public.trust_blocks;
create policy trust_blocks_delete_owner
on public.trust_blocks
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists trust_reports_select_reporter on public.trust_reports;
create policy trust_reports_select_reporter
on public.trust_reports
for select
to authenticated
using (auth.uid() = reporter_user_id);

drop policy if exists trust_reports_insert_reporter on public.trust_reports;
create policy trust_reports_insert_reporter
on public.trust_reports
for insert
to authenticated
with check (
  auth.uid() = reporter_user_id
  and (reported_user_id is null or auth.uid() <> reported_user_id)
);

create or replace function public.trust_block_exists_between_v1(
  p_user_id uuid,
  p_other_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.trust_blocks tb
    where (
      tb.user_id = p_user_id
      and tb.blocked_user_id = p_other_user_id
    )
    or (
      tb.user_id = p_other_user_id
      and tb.blocked_user_id = p_user_id
    )
  );
$$;

revoke all on function public.trust_block_exists_between_v1(uuid, uuid) from public, anon, authenticated;
grant execute on function public.trust_block_exists_between_v1(uuid, uuid) to anon, authenticated, service_role;

drop policy if exists card_interactions_insert_sender on public.card_interactions;
create policy card_interactions_insert_sender
on public.card_interactions
for insert
to authenticated
with check (
  auth.uid() = sender_user_id
  and auth.uid() <> receiver_user_id
  and not public.trust_block_exists_between_v1(auth.uid(), receiver_user_id)
  and exists (
    select 1
    from public.vault_items vi
    join public.public_profiles pp
      on pp.user_id = vi.user_id
    where vi.id = card_interactions.vault_item_id
      and vi.user_id = card_interactions.receiver_user_id
      and vi.card_id = card_interactions.card_print_id
      and vi.archived_at is null
      and vi.intent in ('trade', 'sell', 'showcase')
      and pp.public_profile_enabled = true
      and pp.vault_sharing_enabled = true
  )
);

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
  vii.created_at
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
  and not public.trust_block_exists_between_v1(auth.uid(), vii.user_id);

alter view if exists public.v_card_contact_targets_v1 set (security_invoker = false);

grant select on table public.v_card_contact_targets_v1 to anon;
grant select on table public.v_card_contact_targets_v1 to authenticated;

comment on table public.trust_blocks is
  'User-controlled trust/safety blocks. Either direction blocks new card_interactions and hides contact targets for authenticated viewers.';

comment on table public.trust_reports is
  'User-submitted safety reports for profiles, messages, Wall cards, listings, cards, and exact-copy pages.';

comment on view public.v_card_contact_targets_v1 is
  'Public contact targets for card-specific collector messaging. Definer view keeps public profile and vault-sharing gates and filters authenticated viewers blocked in either direction.';

commit;
