create or replace view public.v_vault_items as
select
  vi.id,
  vi.card_print_id,
  vi.qty,
  cp.name,
  cp.set_code,
  cs.name as set_name,
  cp.image_url
from public.vault_items vi
join public.card_prints cp on cp.id = vi.card_print_id
left join public.card_sets cs on cs.code = cp.set_code;

grant select on public.v_vault_items to anon, authenticated;

