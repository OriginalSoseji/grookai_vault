-- Grookai Vault Baseline - Post Triggers
-- Extracted so trigger functions exist before CREATE TRIGGER runs.

CREATE TRIGGER trg_alerts_set_uid BEFORE INSERT ON public.alerts FOR EACH ROW EXECUTE FUNCTION public.set_auth_uid();

CREATE TRIGGER trg_append_price_tick AFTER INSERT OR UPDATE ON public.card_prices FOR EACH ROW EXECUTE FUNCTION public._append_price_tick();

CREATE TRIGGER trg_fill_price_obs_print_id BEFORE INSERT ON public.price_observations FOR EACH ROW EXECUTE FUNCTION public.fill_price_obs_print_id();

CREATE TRIGGER trg_listings_updated_at BEFORE UPDATE ON public.listings FOR EACH ROW EXECUTE FUNCTION public.set_timestamp_updated_at();

CREATE TRIGGER trg_queue_refresh_latest_card_prices AFTER INSERT OR DELETE OR UPDATE ON public.card_prices FOR EACH STATEMENT EXECUTE FUNCTION public.enqueue_refresh_latest_card_prices();

CREATE TRIGGER trg_scans_set_auth_uid BEFORE INSERT ON public.scans FOR EACH ROW EXECUTE FUNCTION public.set_auth_uid();

CREATE TRIGGER trg_vault_items_set_uid BEFORE INSERT ON public.vault_items FOR EACH ROW EXECUTE FUNCTION public.set_auth_uid();

CREATE TRIGGER trg_wall_refresh_listing_images AFTER INSERT OR DELETE OR UPDATE ON public.listing_images FOR EACH STATEMENT EXECUTE FUNCTION public._wall_refresh_mv();

CREATE TRIGGER trg_wall_refresh_listings AFTER INSERT OR DELETE OR UPDATE ON public.listings FOR EACH STATEMENT EXECUTE FUNCTION public._wall_refresh_mv();

CREATE TRIGGER vault_items_pricing_watch_user_vault_trg AFTER INSERT OR UPDATE OF card_id ON public.vault_items FOR EACH ROW EXECUTE FUNCTION public.vault_items_pricing_watch_user_vault_fn();

