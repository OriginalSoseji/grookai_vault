create table if not exists public.master_sets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  lang text default 'en',
  created_at timestamptz default now()
);

create table if not exists public.master_set_prints (
  master_set_id uuid references public.master_sets(id) on delete cascade,
  set_code text not null,
  number text not null,
  lang text default 'en',
  primary key (master_set_id, set_code, number, lang)
);

create or replace view public.v_master_set_progress as
select
  m.id as master_set_id,
  m.name,
  m.lang,
  count(distinct msp.set_code || ':' || msp.number) as total,
  count(distinct case when vi.card_print_id is not null then msp.set_code || ':' || msp.number end) as have
from public.master_sets m
join public.master_set_prints msp on msp.master_set_id = m.id and coalesce(msp.lang,'en') = coalesce(m.lang,'en')
left join public.card_prints cp on cp.set_code = msp.set_code and (cp.number = msp.number or cp.number_norm = msp.number)
left join public.vault_items vi on vi.card_print_id = cp.id
group by 1,2,3;

grant select on public.master_sets, public.master_set_prints, public.v_master_set_progress to anon, authenticated;

