begin;

-- Public collector messaging needs to resolve another collector's active
-- public vault item before inserting a card_interactions row. The view itself
-- is already public-safe because it only exposes rows for profiles with both
-- public_profile_enabled and vault_sharing_enabled enabled.
alter view if exists public.v_card_contact_targets_v1 set (security_invoker = false);

comment on view public.v_card_contact_targets_v1 is
  'Public contact targets for card-specific collector messaging. Runs as definer so authenticated viewers can resolve active public vault items while the view keeps public profile and vault-sharing gates.';

commit;
