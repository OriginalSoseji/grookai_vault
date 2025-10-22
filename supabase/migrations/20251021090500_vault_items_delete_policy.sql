-- Add owner delete policy for vault_items (idempotent)

alter table if exists public.vault_items enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='vault_items' and policyname='owner delete'
  ) then
    create policy "owner delete" on public.vault_items
      for delete using (auth.uid() = user_id);
  end if;
end
$$;

