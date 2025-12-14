-- Grookai Vault Baseline - Post Indexes
-- Extracted so tables exist before CREATE INDEX runs.

CREATE INDEX ai_decision_logs_card_print_id_idx ON public.ai_decision_logs USING btree (card_print_id);

CREATE INDEX ai_decision_logs_created_at_idx ON public.ai_decision_logs USING btree (created_at);

CREATE INDEX ai_decision_logs_raw_import_id_idx ON public.ai_decision_logs USING btree (raw_import_id);

CREATE INDEX alerts_card_idx ON public.alerts USING btree (card_id);

CREATE INDEX alerts_user_idx ON public.alerts USING btree (user_id);

CREATE INDEX card_embeddings_model_idx ON public.card_embeddings USING btree (model);

CREATE INDEX card_price_ticks_print_time_idx ON public.card_price_ticks USING btree (card_print_id, captured_at DESC);

CREATE INDEX card_prices_print_source_idx ON public.card_prices USING btree (card_print_id, source);

CREATE INDEX card_prices_updated_idx ON public.card_prices USING btree (last_updated);

CREATE INDEX card_print_price_curves_print_time_idx ON public.card_print_price_curves USING btree (card_print_id, created_at DESC);

CREATE INDEX card_print_traits_card_print_id_idx ON public.card_print_traits USING btree (card_print_id);

CREATE INDEX card_print_traits_trait_type_value_idx ON public.card_print_traits USING btree (trait_type, trait_value);

CREATE UNIQUE INDEX card_print_traits_unique_card_trait_source ON public.card_print_traits USING btree (card_print_id, trait_type, trait_value, source);

CREATE INDEX card_prints_name_ci ON public.card_prints USING btree (lower(name));

CREATE INDEX card_prints_name_gin ON public.card_prints USING gin (to_tsvector('simple'::regconfig, COALESCE(name, ''::text)));

CREATE INDEX card_prints_name_trgm_idx ON public.card_prints USING gin (lower(name) extensions.gin_trgm_ops);

CREATE UNIQUE INDEX card_prints_print_identity_key_uq ON public.card_prints USING btree (print_identity_key) WHERE (print_identity_key IS NOT NULL);

CREATE INDEX card_prints_set_code_ci ON public.card_prints USING btree (lower(set_code));

CREATE INDEX card_prints_set_code_number_plain_idx ON public.card_prints USING btree (set_code, number_plain);

CREATE INDEX card_prints_set_id_idx ON public.card_prints USING btree (set_id);

CREATE INDEX card_prints_tcgplayer_id_idx ON public.card_prints USING btree (tcgplayer_id);

CREATE INDEX cards_name_idx ON public.cards USING gin (to_tsvector('simple'::regconfig, COALESCE(name, ''::text)));

CREATE INDEX cards_set_idx ON public.cards USING btree (set_id);

CREATE INDEX condition_prices_card_condition_ts ON public.condition_prices USING btree (card_id, condition_label, currency, ts DESC);

CREATE INDEX cp_setnum_idx ON public.card_prints USING btree (set_code, number);

CREATE INDEX cpo_card_time_idx ON public.card_price_observations USING btree (card_print_id, observed_at DESC);

CREATE INDEX cpo_source_idx ON public.card_price_observations USING btree (source_id);

CREATE INDEX ebay_accounts_active_last_sync_idx ON public.ebay_accounts USING btree (is_active, last_sync_at);

CREATE INDEX ebay_accounts_user_id_idx ON public.ebay_accounts USING btree (user_id);

CREATE INDEX external_mappings_card_print_id_idx ON public.external_mappings USING btree (card_print_id);

CREATE INDEX external_mappings_source_external_id_idx ON public.external_mappings USING btree (source, external_id);

CREATE INDEX external_mappings_source_idx ON public.external_mappings USING btree (source);

CREATE INDEX graded_prices_card_grade_ts ON public.graded_prices USING btree (card_id, grade_company, grade_value, currency, ts DESC);

CREATE INDEX idx_card_prints_name ON public.card_prints USING btree (name);

CREATE INDEX idx_card_prints_name_trgm ON public.card_prints USING gin (name extensions.gin_trgm_ops);

CREATE INDEX idx_card_prints_set_no ON public.card_prints USING btree (set_id, number);

CREATE INDEX idx_card_prints_setnum ON public.card_prints USING btree (set_code, number);

CREATE INDEX idx_card_prints_setnumplain ON public.card_prints USING btree (set_code, number_plain);

CREATE INDEX idx_catalog_name_trgm ON public.card_catalog USING gin (name extensions.gin_trgm_ops);

CREATE INDEX idx_catalog_setname_trgm ON public.card_catalog USING gin (set_name extensions.gin_trgm_ops);

CREATE INDEX idx_cp_last_updated ON public.card_prices USING btree (last_updated DESC);

CREATE INDEX idx_cp_print_time ON public.card_prices USING btree (card_print_id, last_updated DESC) INCLUDE (low, mid, high, currency, source);

CREATE INDEX idx_eaps_card_print_time ON public.ebay_active_price_snapshots USING btree (card_print_id, captured_at DESC);

CREATE INDEX idx_external_cache_exp ON public.external_cache USING btree (expires_at);

CREATE INDEX idx_job_logs_job_time ON public.job_logs USING btree (job_id, at DESC);

CREATE INDEX idx_jobs_status_sched ON public.jobs USING btree (status, scheduled_at);

CREATE INDEX idx_latest_prices_print ON public.latest_prices USING btree (print_id);

CREATE INDEX idx_listing_images_listing ON public.listing_images USING btree (listing_id);

CREATE INDEX idx_listing_images_sort ON public.listing_images USING btree (listing_id, sort_order);

CREATE INDEX idx_listings_created_at ON public.listings USING btree (created_at);

CREATE INDEX idx_listings_owner ON public.listings USING btree (owner_id);

CREATE INDEX idx_listings_status ON public.listings USING btree (status);

CREATE INDEX idx_market_prices_card_source_time ON public.market_prices USING btree (card_id, source, fetched_at DESC);

CREATE INDEX idx_market_prices_card_time ON public.market_prices USING btree (card_id, fetched_at DESC);

CREATE INDEX idx_price_obs_dim ON public.price_observations USING btree (condition, grade_agency, grade_value);

CREATE INDEX idx_price_obs_lookup ON public.price_observations USING btree (set_code, number, variant, observed_at DESC);

CREATE INDEX idx_price_obs_print ON public.price_observations USING btree (print_id, observed_at DESC);

CREATE INDEX idx_price_obs_print_observed ON public.price_observations USING btree (print_id, observed_at DESC);

CREATE INDEX idx_prices_card_ts ON public.prices USING btree (card_id, ts DESC);

CREATE INDEX idx_pricing_jobs_status_priority ON public.pricing_jobs USING btree (status, priority, requested_at);

CREATE INDEX idx_provider_stats_time ON public.external_provider_stats USING btree (provider, observed_at DESC);

CREATE INDEX idx_sets_code ON public.sets USING btree (code);

CREATE INDEX idx_tcgdex_cards_set_lang_local ON public.tcgdex_cards USING btree (tcgdex_set_id, lang, local_number);

CREATE INDEX idx_tcgdex_cards_set_lang_rarity ON public.tcgdex_cards USING btree (tcgdex_set_id, lang, rarity);

CREATE INDEX idx_tcgdex_sets_lang_set_id ON public.tcgdex_sets USING btree (lang, tcgdex_set_id);

CREATE INDEX idx_user_card_images_user_id ON public.user_card_images USING btree (user_id);

CREATE INDEX idx_user_card_images_vault_item_id ON public.user_card_images USING btree (vault_item_id);

CREATE INDEX idx_vault_items_user_created ON public.vault_items USING btree (user_id, created_at DESC);

CREATE INDEX idx_vault_items_user_name ON public.vault_items USING btree (user_id, name);

CREATE INDEX idx_wall_thumbs_created_at ON public.wall_thumbs_3x4 USING btree (created_at);

CREATE INDEX ingestion_jobs_created_at_idx ON public.ingestion_jobs USING btree (created_at);

CREATE INDEX ingestion_jobs_job_type_idx ON public.ingestion_jobs USING btree (job_type);

CREATE INDEX ingestion_jobs_status_idx ON public.ingestion_jobs USING btree (status);

CREATE INDEX mapping_conflicts_candidate_print_uuids_gin_idx ON public.mapping_conflicts USING gin (candidate_print_uuids);

CREATE INDEX price_observations_condition_grade_agency_grade_value_idx ON public.price_observations USING btree (condition, grade_agency, grade_value);

CREATE INDEX price_observations_print_id_observed_at_idx ON public.price_observations USING btree (print_id, observed_at DESC);

CREATE INDEX prices_card_id_ts_idx ON public.prices USING btree (card_id, ts DESC);

CREATE INDEX prices_card_source_ts_idx ON public.prices USING btree (card_id, source, ts DESC);

CREATE INDEX prices_card_ts_idx ON public.prices USING btree (card_id, ts);

CREATE INDEX prices_set_number_idx ON public.prices USING btree (lower(set_code), lower(number));

CREATE INDEX prices_setnum_cur_ts_idx ON public.prices USING btree (lower(set_code), currency, ts DESC);

CREATE INDEX prices_setnum_currency_ts ON public.prices USING btree (lower(set_code), lower(regexp_replace(number, '[^0-9a-z]'::text, ''::text, 'g'::text)), currency, ts DESC);

CREATE INDEX pricing_watch_card_print_id_idx ON public.pricing_watch USING btree (card_print_id);

CREATE INDEX pricing_watch_next_run_at_idx ON public.pricing_watch USING btree (next_run_at);

CREATE INDEX pricing_watch_priority_next_run_idx ON public.pricing_watch USING btree (priority DESC, next_run_at);

CREATE INDEX raw_imports_ingested_at_idx ON public.raw_imports USING btree (ingested_at);

CREATE INDEX raw_imports_status_idx ON public.raw_imports USING btree (status);

CREATE INDEX scans_created_idx ON public.scans USING btree (created_at);

CREATE INDEX scans_vault_item_idx ON public.scans USING btree (vault_item_id);

CREATE UNIQUE INDEX set_code_classification_set_code_idx ON public.set_code_classification USING btree (set_code);

CREATE UNIQUE INDEX sets_unique_game_code ON public.sets USING btree (game, code);

CREATE UNIQUE INDEX uq_catalog_setnum ON public.card_catalog USING btree (set_code, card_number);

CREATE UNIQUE INDEX uq_latest_card_prices_mv ON public.latest_card_prices_mv USING btree (card_id, COALESCE(condition_label, ''::text));

CREATE UNIQUE INDEX uq_sets_code ON public.sets USING btree (code);

CREATE UNIQUE INDEX uq_vault_items_user_card ON public.vault_items USING btree (user_id, card_id);

CREATE UNIQUE INDEX ux_condition_prices_card_condition_currency ON public.condition_prices USING btree (card_id, condition_label, currency);

CREATE UNIQUE INDEX ux_graded_prices_card_grade_currency ON public.graded_prices USING btree (card_id, grade_company, grade_value, currency);

CREATE INDEX vault_items_card_id_idx ON public.vault_items USING btree (card_id);

CREATE INDEX vault_items_card_idx ON public.vault_items USING btree (card_id);

CREATE INDEX vault_items_created_idx ON public.vault_items USING btree (created_at DESC);

CREATE INDEX vault_items_user_created_idx ON public.vault_items USING btree (user_id, created_at DESC);

CREATE INDEX vault_items_user_idx ON public.vault_items USING btree (user_id);

CREATE UNIQUE INDEX waitlist_email_unique ON public.waitlist USING btree (lower(email));

CREATE INDEX wishlist_user_idx ON public.wishlist_items USING btree (user_id);

