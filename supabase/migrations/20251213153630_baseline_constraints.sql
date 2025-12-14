-- ?? Grookai Vault Baseline ? Post Constraints
-- Extracted so tables exist before ALTER TABLE ... ADD CONSTRAINT runs.

ALTER TABLE ONLY public.ai_decision_logs ALTER COLUMN id SET DEFAULT nextval('public.ai_decision_logs_id_seq'::regclass);

ALTER TABLE ONLY public.card_price_observations ALTER COLUMN id SET DEFAULT nextval('public.card_price_observations_id_seq'::regclass);

ALTER TABLE ONLY public.card_price_ticks ALTER COLUMN id SET DEFAULT nextval('public.card_price_ticks_id_seq'::regclass);

ALTER TABLE ONLY public.card_print_traits ALTER COLUMN id SET DEFAULT nextval('public.card_print_traits_id_seq'::regclass);

ALTER TABLE ONLY public.condition_prices ALTER COLUMN id SET DEFAULT nextval('public.condition_prices_id_seq'::regclass);

ALTER TABLE ONLY public.dev_audit ALTER COLUMN id SET DEFAULT nextval('public.dev_audit_id_seq'::regclass);

ALTER TABLE ONLY public.external_mappings ALTER COLUMN id SET DEFAULT nextval('public.external_mappings_id_seq'::regclass);

ALTER TABLE ONLY public.external_provider_stats ALTER COLUMN id SET DEFAULT nextval('public.external_provider_stats_id_seq'::regclass);

ALTER TABLE ONLY public.graded_prices ALTER COLUMN id SET DEFAULT nextval('public.graded_prices_id_seq'::regclass);

ALTER TABLE ONLY public.import_image_errors ALTER COLUMN id SET DEFAULT nextval('public.import_image_errors_id_seq'::regclass);

ALTER TABLE ONLY public.ingestion_jobs ALTER COLUMN id SET DEFAULT nextval('public.ingestion_jobs_id_seq'::regclass);

ALTER TABLE ONLY public.job_logs ALTER COLUMN id SET DEFAULT nextval('public.job_logs_id_seq'::regclass);

ALTER TABLE ONLY public.mapping_conflicts ALTER COLUMN id SET DEFAULT nextval('public.mapping_conflicts_id_seq'::regclass);

ALTER TABLE ONLY public.price_observations ALTER COLUMN id SET DEFAULT nextval('public.price_observations_id_seq'::regclass);

ALTER TABLE ONLY public.price_rollup_config ALTER COLUMN id SET DEFAULT nextval('public.price_rollup_config_id_seq'::regclass);

ALTER TABLE ONLY public.prices ALTER COLUMN id SET DEFAULT nextval('public.prices_id_seq'::regclass);

ALTER TABLE ONLY public.raw_imports ALTER COLUMN id SET DEFAULT nextval('public.raw_imports_id_seq'::regclass);

ALTER TABLE ONLY public.unmatched_price_rows ALTER COLUMN id SET DEFAULT nextval('public.unmatched_price_rows_id_seq'::regclass);

ALTER TABLE ONLY public.ai_decision_logs
    ADD CONSTRAINT ai_decision_logs_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.alerts
    ADD CONSTRAINT alerts_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.app_settings
    ADD CONSTRAINT app_settings_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.card_catalog
    ADD CONSTRAINT card_catalog_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.card_embeddings
    ADD CONSTRAINT card_embeddings_pkey PRIMARY KEY (card_print_id);

ALTER TABLE ONLY public.card_price_observations
    ADD CONSTRAINT card_price_observations_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.card_price_rollups
    ADD CONSTRAINT card_price_rollups_pkey PRIMARY KEY (card_print_id);

ALTER TABLE ONLY public.card_price_ticks
    ADD CONSTRAINT card_price_ticks_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.card_prices
    ADD CONSTRAINT card_prices_card_print_id_source_key UNIQUE (card_print_id, source);

ALTER TABLE ONLY public.card_prices
    ADD CONSTRAINT card_prices_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.card_print_file_paths
    ADD CONSTRAINT card_print_file_paths_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.card_print_price_curves
    ADD CONSTRAINT card_print_price_curves_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.card_print_traits
    ADD CONSTRAINT card_print_traits_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.card_prints
    ADD CONSTRAINT card_prints_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.cards
    ADD CONSTRAINT cards_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.condition_multipliers
    ADD CONSTRAINT condition_multipliers_pkey PRIMARY KEY (condition_label);

ALTER TABLE ONLY public.condition_prices
    ADD CONSTRAINT condition_prices_card_id_condition_label_currency_ts_key UNIQUE (card_id, condition_label, currency, ts);

ALTER TABLE ONLY public.condition_prices
    ADD CONSTRAINT condition_prices_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.dev_audit
    ADD CONSTRAINT dev_audit_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.ebay_accounts
    ADD CONSTRAINT ebay_accounts_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.ebay_active_price_snapshots
    ADD CONSTRAINT ebay_active_price_snapshots_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.ebay_active_prices_latest
    ADD CONSTRAINT ebay_active_prices_latest_pkey PRIMARY KEY (card_print_id);

ALTER TABLE ONLY public.external_cache
    ADD CONSTRAINT external_cache_pkey PRIMARY KEY (cache_key);

ALTER TABLE ONLY public.external_mappings
    ADD CONSTRAINT external_mappings_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.external_mappings
    ADD CONSTRAINT external_mappings_source_external_id_key UNIQUE (source, external_id);

ALTER TABLE ONLY public.external_provider_stats
    ADD CONSTRAINT external_provider_stats_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.fx_daily
    ADD CONSTRAINT fx_daily_pkey PRIMARY KEY (d);

ALTER TABLE ONLY public.games
    ADD CONSTRAINT games_code_key UNIQUE (code);

ALTER TABLE ONLY public.games
    ADD CONSTRAINT games_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.games
    ADD CONSTRAINT games_slug_key UNIQUE (slug);

ALTER TABLE ONLY public.graded_prices
    ADD CONSTRAINT graded_prices_card_id_grade_company_grade_value_currency_ts_key UNIQUE (card_id, grade_company, grade_value, currency, ts);

ALTER TABLE ONLY public.graded_prices
    ADD CONSTRAINT graded_prices_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.import_image_errors
    ADD CONSTRAINT import_image_errors_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.ingestion_jobs
    ADD CONSTRAINT ingestion_jobs_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.job_logs
    ADD CONSTRAINT job_logs_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT jobs_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.listing_images
    ADD CONSTRAINT listing_images_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.listings
    ADD CONSTRAINT listings_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.mapping_conflicts
    ADD CONSTRAINT mapping_conflicts_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.market_prices
    ADD CONSTRAINT market_prices_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.price_observations
    ADD CONSTRAINT price_observations_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.price_observations
    ADD CONSTRAINT price_observations_print_id_condition_grade_agency_grade_va_key UNIQUE (print_id, condition, grade_agency, grade_value, source, observed_at);

ALTER TABLE ONLY public.price_rollup_config
    ADD CONSTRAINT price_rollup_config_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.price_sources
    ADD CONSTRAINT price_sources_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.prices
    ADD CONSTRAINT prices_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.pricing_jobs
    ADD CONSTRAINT pricing_jobs_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.pricing_watch
    ADD CONSTRAINT pricing_watch_card_print_reason_key UNIQUE (card_print_id, watch_reason);

ALTER TABLE ONLY public.pricing_watch
    ADD CONSTRAINT pricing_watch_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.raw_imports
    ADD CONSTRAINT raw_imports_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.scans
    ADD CONSTRAINT scans_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.set_code_classification
    ADD CONSTRAINT set_code_classification_pkey PRIMARY KEY (set_code);

ALTER TABLE ONLY public.set_sync_audit
    ADD CONSTRAINT set_sync_audit_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.sets
    ADD CONSTRAINT sets_game_code_key UNIQUE (game, code);

ALTER TABLE ONLY public.sets
    ADD CONSTRAINT sets_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.tcgdex_cards
    ADD CONSTRAINT tcgdex_cards_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.tcgdex_cards
    ADD CONSTRAINT tcgdex_cards_tcgdex_card_id_lang_key UNIQUE (tcgdex_card_id, lang);

ALTER TABLE ONLY public.tcgdex_set_audit
    ADD CONSTRAINT tcgdex_set_audit_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.tcgdex_set_audit
    ADD CONSTRAINT tcgdex_set_audit_tcgdex_set_id_lang_key UNIQUE (tcgdex_set_id, lang);

ALTER TABLE ONLY public.tcgdex_sets
    ADD CONSTRAINT tcgdex_sets_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.tcgdex_sets
    ADD CONSTRAINT tcgdex_sets_tcgdex_set_id_lang_key UNIQUE (tcgdex_set_id, lang);

ALTER TABLE ONLY public.unmatched_price_rows
    ADD CONSTRAINT unmatched_price_rows_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.card_prints
    ADD CONSTRAINT uq_card_prints_identity UNIQUE (game_id, set_id, number_plain, variant_key);

ALTER TABLE ONLY public.vault_items
    ADD CONSTRAINT uq_user_card UNIQUE (user_id, card_id);

ALTER TABLE ONLY public.vault_items
    ADD CONSTRAINT uq_vault_user_card UNIQUE (user_id, card_id);

ALTER TABLE ONLY public.user_card_images
    ADD CONSTRAINT user_card_images_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.user_card_images
    ADD CONSTRAINT user_card_images_vault_item_side_key UNIQUE (vault_item_id, side);

ALTER TABLE ONLY public.user_card_photos
    ADD CONSTRAINT user_card_photos_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.vault_items
    ADD CONSTRAINT vault_items_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.waitlist
    ADD CONSTRAINT waitlist_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.wishlist_items
    ADD CONSTRAINT wishlist_items_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.wishlist_items
    ADD CONSTRAINT wishlist_items_user_id_card_id_key UNIQUE (user_id, card_id);

ALTER TABLE ONLY public.ai_decision_logs
    ADD CONSTRAINT ai_decision_logs_card_print_id_fkey FOREIGN KEY (card_print_id) REFERENCES public.card_prints(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.ai_decision_logs
    ADD CONSTRAINT ai_decision_logs_raw_import_id_fkey FOREIGN KEY (raw_import_id) REFERENCES public.raw_imports(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.alerts
    ADD CONSTRAINT alerts_card_id_fkey FOREIGN KEY (card_id) REFERENCES public.cards(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.alerts
    ADD CONSTRAINT alerts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.card_embeddings
    ADD CONSTRAINT card_embeddings_card_print_id_fkey FOREIGN KEY (card_print_id) REFERENCES public.card_prints(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.card_price_observations
    ADD CONSTRAINT card_price_observations_card_print_id_fkey FOREIGN KEY (card_print_id) REFERENCES public.card_prints(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.card_price_observations
    ADD CONSTRAINT card_price_observations_source_id_fkey FOREIGN KEY (source_id) REFERENCES public.price_sources(id);

ALTER TABLE ONLY public.card_price_rollups
    ADD CONSTRAINT card_price_rollups_card_print_id_fkey FOREIGN KEY (card_print_id) REFERENCES public.card_prints(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.card_price_ticks
    ADD CONSTRAINT card_price_ticks_card_print_id_fkey FOREIGN KEY (card_print_id) REFERENCES public.card_prints(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.card_prices
    ADD CONSTRAINT card_prices_card_print_id_fkey FOREIGN KEY (card_print_id) REFERENCES public.card_prints(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.card_print_file_paths
    ADD CONSTRAINT card_print_file_paths_card_print_id_fkey FOREIGN KEY (card_print_id) REFERENCES public.card_prints(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.card_print_price_curves
    ADD CONSTRAINT card_print_price_curves_card_print_id_fkey FOREIGN KEY (card_print_id) REFERENCES public.card_prints(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.card_print_traits
    ADD CONSTRAINT card_print_traits_card_print_id_fkey FOREIGN KEY (card_print_id) REFERENCES public.card_prints(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.card_prints
    ADD CONSTRAINT card_prints_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.games(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.card_prints
    ADD CONSTRAINT card_prints_set_id_fkey FOREIGN KEY (set_id) REFERENCES public.sets(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.cards
    ADD CONSTRAINT cards_set_id_fkey FOREIGN KEY (set_id) REFERENCES public.sets(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.ebay_accounts
    ADD CONSTRAINT ebay_accounts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.ebay_active_price_snapshots
    ADD CONSTRAINT ebay_active_price_snapshots_card_print_id_fkey FOREIGN KEY (card_print_id) REFERENCES public.card_prints(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.ebay_active_prices_latest
    ADD CONSTRAINT ebay_active_prices_latest_card_print_id_fkey FOREIGN KEY (card_print_id) REFERENCES public.card_prints(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.external_mappings
    ADD CONSTRAINT external_mappings_card_print_id_fkey FOREIGN KEY (card_print_id) REFERENCES public.card_prints(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.vault_items
    ADD CONSTRAINT fk_vault_items_card FOREIGN KEY (card_id) REFERENCES public.card_prints(id) DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE ONLY public.job_logs
    ADD CONSTRAINT job_logs_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.listing_images
    ADD CONSTRAINT listing_images_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES public.listings(id) NOT VALID;

ALTER TABLE ONLY public.listings
    ADD CONSTRAINT listings_card_print_id_fkey FOREIGN KEY (card_print_id) REFERENCES public.card_prints(id) NOT VALID;

ALTER TABLE ONLY public.listings
    ADD CONSTRAINT listings_owner_id_users_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) NOT VALID;

ALTER TABLE ONLY public.listings
    ADD CONSTRAINT listings_vault_item_id_fkey FOREIGN KEY (vault_item_id) REFERENCES public.vault_items(id) NOT VALID;

ALTER TABLE ONLY public.mapping_conflicts
    ADD CONSTRAINT mapping_conflicts_raw_import_id_fkey FOREIGN KEY (raw_import_id) REFERENCES public.raw_imports(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.market_prices
    ADD CONSTRAINT market_prices_card_id_fkey FOREIGN KEY (card_id) REFERENCES public.card_prints(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.price_observations
    ADD CONSTRAINT price_observations_print_id_fkey FOREIGN KEY (print_id) REFERENCES public.card_prints(id) DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE ONLY public.prices
    ADD CONSTRAINT prices_card_id_fkey FOREIGN KEY (card_id) REFERENCES public.card_prints(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.pricing_jobs
    ADD CONSTRAINT pricing_jobs_card_print_id_fkey FOREIGN KEY (card_print_id) REFERENCES public.card_prints(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.pricing_watch
    ADD CONSTRAINT pricing_watch_card_print_id_fkey FOREIGN KEY (card_print_id) REFERENCES public.card_prints(id);

ALTER TABLE ONLY public.scans
    ADD CONSTRAINT scans_vault_item_id_fkey FOREIGN KEY (vault_item_id) REFERENCES public.vault_items(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.user_card_images
    ADD CONSTRAINT user_card_images_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.user_card_images
    ADD CONSTRAINT user_card_images_vault_item_id_fkey FOREIGN KEY (vault_item_id) REFERENCES public.vault_items(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.user_card_photos
    ADD CONSTRAINT user_card_photos_card_print_id_fkey FOREIGN KEY (card_print_id) REFERENCES public.card_prints(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.vault_items
    ADD CONSTRAINT vault_items_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.wishlist_items
    ADD CONSTRAINT wishlist_items_card_id_fkey FOREIGN KEY (card_id) REFERENCES public.card_prints(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.wishlist_items
    ADD CONSTRAINT wishlist_items_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

