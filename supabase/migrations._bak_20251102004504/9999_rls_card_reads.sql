alter table if exists public.card_prints enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'card_prints' and policyname = 'Allow read card_prints'
  ) then
    create policy "Allow read card_prints"
      on public.card_prints
      for select
      to authenticated
      using (true);
  end if;
end $$;
