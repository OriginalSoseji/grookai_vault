-- Grookai Vault Baseline - Post Policies
-- Extracted so tables exist before CREATE POLICY runs.

CREATE POLICY "anon can read card_prints" ON public.card_prints FOR SELECT TO anon USING (true);

CREATE POLICY "anon can update card_prints (dev)" ON public.card_prints FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "anyone can read prices" ON public.market_prices FOR SELECT TO authenticated USING (true);

CREATE POLICY card_price_ticks_read ON public.card_price_ticks FOR SELECT USING (true);

CREATE POLICY card_prices_read ON public.card_prices FOR SELECT USING (true);

CREATE POLICY card_prints_read ON public.card_prints FOR SELECT USING (true);

CREATE POLICY "catalog readable" ON public.sets FOR SELECT TO authenticated USING (true);

CREATE POLICY "catalog readable 2" ON public.card_prints FOR SELECT TO authenticated USING (true);

CREATE POLICY gv_alerts_delete ON public.alerts FOR DELETE TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY gv_alerts_insert ON public.alerts FOR INSERT TO authenticated WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY gv_alerts_select ON public.alerts FOR SELECT TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY gv_alerts_update ON public.alerts FOR UPDATE TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY gv_scans_delete ON public.scans FOR DELETE TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY gv_scans_insert ON public.scans FOR INSERT TO authenticated WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY gv_scans_select ON public.scans FOR SELECT TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY gv_scans_update ON public.scans FOR UPDATE TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY gv_vault_items_delete ON public.vault_items FOR DELETE TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY gv_vault_items_insert ON public.vault_items FOR INSERT TO authenticated WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY gv_vault_items_select ON public.vault_items FOR SELECT TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY gv_vault_items_update ON public.vault_items FOR UPDATE TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY listing_images_owner_write ON public.listing_images USING ((EXISTS ( SELECT 1
   FROM public.listings l
  WHERE ((l.id = listing_images.listing_id) AND (l.owner_id = public.auth_uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.listings l
  WHERE ((l.id = listing_images.listing_id) AND (l.owner_id = public.auth_uid())))));

CREATE POLICY listing_images_read_public ON public.listing_images FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.listings l
  WHERE ((l.id = listing_images.listing_id) AND (l.visibility = 'public'::text) AND (l.status = 'active'::text)))));

CREATE POLICY listings_owner_delete ON public.listings FOR DELETE USING ((owner_id = public.auth_uid()));

CREATE POLICY listings_owner_insert ON public.listings FOR INSERT WITH CHECK ((owner_id = public.auth_uid()));

CREATE POLICY listings_owner_read ON public.listings FOR SELECT USING ((owner_id = public.auth_uid()));

CREATE POLICY listings_owner_update ON public.listings FOR UPDATE USING ((owner_id = public.auth_uid())) WITH CHECK ((owner_id = public.auth_uid()));

CREATE POLICY listings_read_public ON public.listings FOR SELECT USING (((visibility = 'public'::text) AND (status = 'active'::text)));

CREATE POLICY "owner delete vault_items" ON public.vault_items FOR DELETE TO authenticated USING ((user_id = auth.uid()));

CREATE POLICY "owner insert" ON public.vault_items FOR INSERT WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "owner insert vault_items" ON public.vault_items FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));

CREATE POLICY "owner read" ON public.vault_items FOR SELECT USING ((auth.uid() = user_id));

CREATE POLICY "owner select vault_items" ON public.vault_items FOR SELECT TO authenticated USING ((user_id = auth.uid()));

CREATE POLICY "owner update" ON public.vault_items FOR UPDATE USING ((auth.uid() = user_id));

CREATE POLICY "owner update vault_items" ON public.vault_items FOR UPDATE TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));

CREATE POLICY price_obs_read_any ON public.price_observations FOR SELECT USING (true);

CREATE POLICY price_obs_write_service_only ON public.price_observations USING ((auth.role() = 'service_role'::text)) WITH CHECK ((auth.role() = 'service_role'::text));

CREATE POLICY "read all" ON public.card_prices FOR SELECT USING (true);

CREATE POLICY "read audit" ON public.set_sync_audit FOR SELECT TO authenticated USING (true);

CREATE POLICY read_all_card_prints ON public.card_prints FOR SELECT TO anon USING (true);

CREATE POLICY refdata_read ON public.card_catalog FOR SELECT TO authenticated USING (true);

CREATE POLICY refdata_read ON public.card_prints FOR SELECT TO authenticated USING (true);

CREATE POLICY refdata_read ON public.cards FOR SELECT TO authenticated USING (true);

CREATE POLICY refdata_read ON public.games FOR SELECT TO authenticated USING (true);

CREATE POLICY refdata_read ON public.prices FOR SELECT TO authenticated USING (true);

CREATE POLICY refdata_read ON public.sets FOR SELECT TO authenticated USING (true);

CREATE POLICY unmatched_read_auth ON public.unmatched_price_rows FOR SELECT USING ((auth.role() = ANY (ARRAY['authenticated'::text, 'service_role'::text])));

CREATE POLICY unmatched_write_service_only ON public.unmatched_price_rows USING ((auth.role() = 'service_role'::text)) WITH CHECK ((auth.role() = 'service_role'::text));

CREATE POLICY "update via function" ON public.card_prices FOR UPDATE USING (true);

CREATE POLICY "vault_items owner delete" ON public.vault_items FOR DELETE USING ((auth.uid() = user_id));

CREATE POLICY "vault_items owner read" ON public.vault_items FOR SELECT USING ((auth.uid() = user_id));

CREATE POLICY "vault_items owner update" ON public.vault_items FOR UPDATE USING ((auth.uid() = user_id));

CREATE POLICY "vault_items owner write" ON public.vault_items USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));

CREATE POLICY waitlist_insert_public ON public.waitlist FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY wl_rw ON public.wishlist_items USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "write via function" ON public.card_prices FOR INSERT WITH CHECK (true);

