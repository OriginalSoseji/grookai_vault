begin;

alter table public.card_print_identity enable row level security;

revoke all on table public.card_print_identity from public, anon, authenticated;
grant select on table public.card_print_identity to anon, authenticated;

drop policy if exists card_print_identity_reference_read on public.card_print_identity;
create policy card_print_identity_reference_read
on public.card_print_identity
for select
to anon, authenticated
using (true);

drop policy if exists card_print_identity_service_role_all on public.card_print_identity;
create policy card_print_identity_service_role_all
on public.card_print_identity
for all
to service_role
using (true)
with check (true);

commit;
