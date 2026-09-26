-- Support exact card dependency checks without scanning the pricing warehouse.
create index concurrently if not exists market_price_pipeline_candidates_card_print_id_idx
  on public.market_price_pipeline_candidates (card_print_id)
  where card_print_id is not null;
