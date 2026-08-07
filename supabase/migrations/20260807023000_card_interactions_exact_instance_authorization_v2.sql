-- CARD_INTERACTIONS_EXACT_INSTANCE_AUTHORIZATION_V2
-- Binds each new exact-printing conversation to the contacted vault instance.
-- Existing rows remain nullable and are never backfilled or inferred.

begin;

alter table public.card_interactions
  add column if not exists vault_item_instance_id uuid
  references public.vault_item_instances(id) on delete set null;

create index if not exists idx_card_interactions_vault_instance_created
on public.card_interactions (vault_item_instance_id, created_at desc)
where vault_item_instance_id is not null;

create or replace function public.card_interactions_enforce_instance_identity_v2()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_existing_legacy_thread boolean := false;
begin
  if new.vault_item_instance_id is null then
    select exists (
      select 1
      from public.card_interactions ci
      where ci.vault_item_id = new.vault_item_id
        and ci.vault_item_instance_id is null
        and ci.card_print_id = new.card_print_id
        and ci.card_printing_id is not distinct from new.card_printing_id
        and (
          (
            ci.sender_user_id = new.sender_user_id
            and ci.receiver_user_id = new.receiver_user_id
          )
          or (
            ci.sender_user_id = new.receiver_user_id
            and ci.receiver_user_id = new.sender_user_id
          )
        )
    ) into v_existing_legacy_thread;

    if not v_existing_legacy_thread then
      select vii.id
      into new.vault_item_instance_id
      from public.vault_item_instances vii
      left join public.slab_certs sc
        on sc.id = vii.slab_cert_id
      join public.public_profiles pp
        on pp.user_id = vii.user_id
      where vii.legacy_vault_item_id = new.vault_item_id
        and vii.user_id = new.receiver_user_id
        and coalesce(vii.card_print_id, sc.card_print_id) = new.card_print_id
        and vii.card_printing_id is not distinct from new.card_printing_id
        and vii.archived_at is null
        and pp.public_profile_enabled = true
        and pp.vault_sharing_enabled = true
      order by vii.created_at desc, vii.id desc
      limit 1;
    end if;
  end if;

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

  if new.vault_item_instance_id is not null
     and not exists (
       select 1
       from public.vault_item_instances vii
       left join public.slab_certs sc
         on sc.id = vii.slab_cert_id
       where vii.id = new.vault_item_instance_id
         and vii.legacy_vault_item_id = new.vault_item_id
         and vii.user_id in (new.sender_user_id, new.receiver_user_id)
         and coalesce(vii.card_print_id, sc.card_print_id) = new.card_print_id
         and vii.card_printing_id is not distinct from new.card_printing_id
     ) then
    raise exception using
      errcode = '23514',
      message = 'card_interaction_vault_instance_identity_mismatch';
  end if;

  return new;
end;
$$;

revoke all on function public.card_interactions_enforce_instance_identity_v2()
from public, anon, authenticated;

drop trigger if exists card_interactions_enforce_printing_parent_v1
on public.card_interactions;
drop trigger if exists card_interactions_enforce_instance_identity_v2
on public.card_interactions;
create trigger card_interactions_enforce_instance_identity_v2
before insert or update of
  vault_item_id,
  vault_item_instance_id,
  card_print_id,
  card_printing_id,
  sender_user_id,
  receiver_user_id
on public.card_interactions
for each row
execute function public.card_interactions_enforce_instance_identity_v2();

create or replace function public.card_interaction_insert_authorized_v4(
  p_vault_item_instance_id uuid,
  p_vault_item_id uuid,
  p_card_print_id uuid,
  p_card_printing_id uuid,
  p_other_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select
    auth.uid() is not null
    and auth.uid() <> p_other_user_id
    and not public.trust_block_exists_between_v1(auth.uid(), p_other_user_id)
    and (
      exists (
        select 1
        from public.vault_item_instances vii
        left join public.slab_certs sc
          on sc.id = vii.slab_cert_id
        join public.public_profiles pp
          on pp.user_id = vii.user_id
        where p_vault_item_instance_id is not null
          and vii.id = p_vault_item_instance_id
          and vii.legacy_vault_item_id = p_vault_item_id
          and vii.user_id = p_other_user_id
          and coalesce(vii.card_print_id, sc.card_print_id) = p_card_print_id
          and vii.card_printing_id is not distinct from p_card_printing_id
          and vii.archived_at is null
          and pp.public_profile_enabled = true
          and pp.vault_sharing_enabled = true
      )
      or exists (
        select 1
        from public.card_interactions ci
        where ci.vault_item_id = p_vault_item_id
          and ci.vault_item_instance_id is not distinct from p_vault_item_instance_id
          and ci.card_print_id = p_card_print_id
          and ci.card_printing_id is not distinct from p_card_printing_id
          and (
            (
              ci.sender_user_id = auth.uid()
              and ci.receiver_user_id = p_other_user_id
            )
            or (
              ci.sender_user_id = p_other_user_id
              and ci.receiver_user_id = auth.uid()
            )
          )
      )
    );
$$;

revoke all on function public.card_interaction_insert_authorized_v4(
  uuid,
  uuid,
  uuid,
  uuid,
  uuid
)
from public, anon, authenticated;
grant execute on function public.card_interaction_insert_authorized_v4(
  uuid,
  uuid,
  uuid,
  uuid,
  uuid
)
to authenticated, service_role;

revoke all on function public.card_interaction_insert_authorized_v2(uuid, uuid, uuid)
from authenticated, service_role;

drop policy if exists card_interactions_insert_sender
on public.card_interactions;
create policy card_interactions_insert_sender
on public.card_interactions
for insert
to authenticated
with check (
  auth.uid() = sender_user_id
  and public.card_interaction_insert_authorized_v4(
    vault_item_instance_id,
    vault_item_id,
    card_print_id,
    card_printing_id,
    receiver_user_id
  )
);

comment on column public.card_interactions.vault_item_instance_id is
'Exact contacted vault instance for new card conversations. Null identifies only legacy rows and is preserved solely for established legacy replies; null never authorizes printing inference.';

comment on function public.card_interactions_enforce_instance_identity_v2() is
'Resolves a compatibility insert to the active contacted owner instance, preserves null only for established legacy replies, and rejects any disagreement among instance, bucket, parent, child printing, or participants.';

comment on function public.card_interaction_insert_authorized_v4(uuid, uuid, uuid, uuid, uuid) is
'Authorizes new card conversations only against an active public owner instance with the same parent and exact child printing; replies must preserve the established instance and printing tuple. Two-way trust blocks always deny insertion.';

notify pgrst, 'reload schema';

commit;
