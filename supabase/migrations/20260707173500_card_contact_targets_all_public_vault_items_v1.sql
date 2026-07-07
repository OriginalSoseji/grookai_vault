begin;

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
  and pp.vault_sharing_enabled = true;

alter view if exists public.v_card_contact_targets_v1 set (security_invoker = true);

grant select on table public.v_card_contact_targets_v1 to anon;
grant select on table public.v_card_contact_targets_v1 to authenticated;

comment on view public.v_card_contact_targets_v1 is
  'Public contact targets for card-specific collector messaging. Includes every active public vault item, not only trade/sell/showcase intent rows.';

commit;
