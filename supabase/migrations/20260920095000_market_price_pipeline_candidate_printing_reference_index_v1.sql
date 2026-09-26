-- Support exact printing dependency checks without scanning the pricing warehouse.
create index concurrently if not exists market_price_pipeline_candidates_card_printing_id_idx
  on public.market_price_pipeline_candidates (card_printing_id)
  where card_printing_id is not null;
