-- Grookai Vault — Grants for unified search + wall feed

-- Function grants (RPC)
grant execute on function public.search_cards(text, integer) to anon, authenticated;
grant execute on function public.search_cards_in_set(text, text, integer) to anon, authenticated;

-- View grants
grant select on table public.v_cards_search_v2 to anon, authenticated;
grant select on table public.wall_feed_view to anon, authenticated;

