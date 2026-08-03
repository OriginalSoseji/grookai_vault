-- CARD_INTERACTIONS_INSTANCE_AUTHORIZATION_V2
-- Authorizes collector messages from the same instance-backed contact state
-- exposed by v_card_contact_targets_v1. Legacy vault bucket intent is not an
-- authoritative contact signal after copies move to vault_item_instances.

begin;

create or replace function public.card_interaction_insert_authorized_v2(
  p_vault_item_id uuid,
  p_card_print_id uuid,
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
        where vii.legacy_vault_item_id = p_vault_item_id
          and vii.user_id = p_other_user_id
          and coalesce(vii.card_print_id, sc.card_print_id) = p_card_print_id
          and vii.archived_at is null
          and vii.intent in ('trade', 'sell', 'showcase')
          and pp.public_profile_enabled = true
          and pp.vault_sharing_enabled = true
      )
      or exists (
        select 1
        from public.card_interactions ci
        where ci.vault_item_id = p_vault_item_id
          and ci.card_print_id = p_card_print_id
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

revoke all on function public.card_interaction_insert_authorized_v2(uuid, uuid, uuid)
from public, anon, authenticated;
grant execute on function public.card_interaction_insert_authorized_v2(uuid, uuid, uuid)
to authenticated, service_role;

comment on function public.card_interaction_insert_authorized_v2(uuid, uuid, uuid) is
'Current-viewer authorization for opening or continuing a card-specific collector thread. New threads require an active contactable vault_item_instance; existing participant threads remain replyable. Two-way trust blocks always deny insertion.';

drop policy if exists card_interactions_insert_sender on public.card_interactions;
create policy card_interactions_insert_sender
on public.card_interactions
for insert
to authenticated
with check (
  auth.uid() = sender_user_id
  and public.card_interaction_insert_authorized_v2(
    vault_item_id,
    card_print_id,
    receiver_user_id
  )
);

notify pgrst, 'reload schema';

commit;
