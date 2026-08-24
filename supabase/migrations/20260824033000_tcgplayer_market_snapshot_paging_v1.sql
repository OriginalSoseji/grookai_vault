-- Support bounded, resumable publication snapshot construction.
create index if not exists market_price_qualification_run_publish_id_idx
  on public.market_price_qualification_decisions(run_id, id)
  where eligible = true
    and decision = 'publish'
    and publication_lane = 'current';
