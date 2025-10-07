create table if not exists public.vault_items(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  card_id text not null,
  grade text,
  condition text check (condition in ('NM','LP','MP','HP','DMG')),
  created_at timestamptz default now()
);
alter table public.vault_items enable row level security;
create policy "owner read"   on public.vault_items for select using (auth.uid() = user_id);
create policy "owner insert" on public.vault_items for insert with check (auth.uid() = user_id);
create policy "owner update" on public.vault_items for update using (auth.uid() = user_id);

create or replace function public.vault_add_item(p_user_id uuid, p_card_id text, p_grade text, p_condition text)
returns uuid
language plpgsql
security definer
as $$
declare v_id uuid;
begin
  insert into public.vault_items(user_id, card_id, grade, condition)
  values (p_user_id, p_card_id, p_grade, p_condition)
  returning id into v_id;
  return v_id;
end $$;
grant execute on function public.vault_add_item(uuid,text,text,text) to authenticated;
