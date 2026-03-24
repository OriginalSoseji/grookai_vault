begin;

revoke update on table public.card_interactions from authenticated;

drop policy if exists card_interactions_update_participants on public.card_interactions;

commit;
