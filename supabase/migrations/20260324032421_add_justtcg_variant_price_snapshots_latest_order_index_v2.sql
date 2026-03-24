create index if not exists idx_justtcg_variant_price_snapshots_latest_order
on public.justtcg_variant_price_snapshots (
  variant_id asc,
  fetched_at desc,
  created_at desc,
  id desc
);