--
-- PostgreSQL database dump
--


-- Dumped from database version 17.4
-- Dumped by pg_dump version 18.0


--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA IF NOT EXISTS public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: price_currency; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.price_currency AS ENUM (
    'USD',
    'EUR',
    'MXN'
);


--
-- Name: price_kind; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.price_kind AS ENUM (
    'listing',
    'sold',
    'floor',
    'median',
    'average',
    'low',
    'high',
    'shop_sale'
);


--
-- Name: _append_price_tick(); Type: FUNCTION; Schema: public; Owner: -
--



--
-- Name: card_history(text, text, text, integer); Type: FUNCTION; Schema: public; Owner: -
--



--
-- Name: compute_vault_values(integer); Type: FUNCTION; Schema: public; Owner: -
--



--
-- Name: enqueue_refresh_latest_card_prices(); Type: FUNCTION; Schema: public; Owner: -
--



--
-- Name: fill_price_obs_print_id(); Type: FUNCTION; Schema: public; Owner: -
--



--
-- Name: fix_mojibake_more(text); Type: FUNCTION; Schema: public; Owner: -
--



--
-- Name: get_all_prices_for_card(uuid); Type: FUNCTION; Schema: public; Owner: -
--



--
-- Name: get_market_price(uuid); Type: FUNCTION; Schema: public; Owner: -
--



--
-- Name: gv_norm_name(text); Type: FUNCTION; Schema: public; Owner: -
--



--
-- Name: gv_num_int(text); Type: FUNCTION; Schema: public; Owner: -
--



--
-- Name: list_missing_price_sets(); Type: FUNCTION; Schema: public; Owner: -
--



--
-- Name: list_set_codes(); Type: FUNCTION; Schema: public; Owner: -
--



--
-- Name: pricing_backfill_candidates(boolean, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--



--
-- Name: process_jobs(integer); Type: FUNCTION; Schema: public; Owner: -
--



--
-- Name: refresh_latest_card_prices_mv(); Type: FUNCTION; Schema: public; Owner: -
--



--
-- Name: refresh_latest_prices(); Type: FUNCTION; Schema: public; Owner: -
--



--
-- Name: refresh_vault_market_prices(); Type: FUNCTION; Schema: public; Owner: -
--



--
-- Name: refresh_vault_market_prices(uuid); Type: FUNCTION; Schema: public; Owner: -
--



--
-- Name: refresh_vault_market_prices_all(); Type: FUNCTION; Schema: public; Owner: -
--



--
-- Name: refresh_wall_thumbs_3x4(); Type: FUNCTION; Schema: public; Owner: -
--



--
-- Name: rpc_refresh_wall(); Type: FUNCTION; Schema: public; Owner: -
--



--
-- Name: rpc_set_item_condition(uuid, text, uuid, numeric); Type: FUNCTION; Schema: public; Owner: -
--





--
-- Name: card_prices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.card_prices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    card_print_id uuid NOT NULL,
    source text NOT NULL,
    currency text DEFAULT 'USD'::text NOT NULL,
    low numeric,
    mid numeric,
    high numeric,
    market numeric,
    last_updated timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT card_prices_source_check CHECK ((source = ANY (ARRAY['tcgplayer'::text, 'cardmarket'::text])))
);


--
-- Name: card_prints; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.card_prints (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    game_id uuid DEFAULT 'b5819e3f-0b2b-48c1-bf9a-0c87a57ea9b5'::uuid NOT NULL,
    set_id uuid NOT NULL,
    name text NOT NULL,
    number text,
    variant_key text DEFAULT ''::text NOT NULL,
    rarity text,
    image_url text,
    tcgplayer_id text,
    external_ids jsonb DEFAULT '{}'::jsonb,
    updated_at timestamp with time zone DEFAULT now(),
    set_code text,
    number_plain text GENERATED ALWAYS AS (regexp_replace(number, '[^0-9]'::text, ''::text, 'g'::text)) STORED,
    artist text,
    regulation_mark text,
    image_alt_url text,
    image_source text,
    variants jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    last_synced_at timestamp with time zone,
    print_identity_key text,
    ai_metadata jsonb,
    image_hash text,
    data_quality_flags jsonb,
    image_status text,
    image_res jsonb,
    image_last_checked_at timestamp with time zone,
    printed_set_abbrev text,
    printed_total integer,
    CONSTRAINT card_prints_image_source_check CHECK (((image_source IS NULL) OR (image_source = ANY (ARRAY['tcgdex'::text, 'ptcg'::text, 'pokemonapi'::text, 'identity'::text, 'user_photo'::text])))),
    CONSTRAINT card_prints_image_status_check CHECK (((image_status IS NULL) OR (image_status = ANY (ARRAY['ok'::text, 'placeholder'::text, 'missing'::text, 'user_uploaded'::text]))))
);


--
-- Name: COLUMN card_prints.print_identity_key; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.card_prints.print_identity_key IS 'Stable identity string for a print (e.g. set_code-number_plain-variant). Ideal for AI models to target.';


--
-- Name: COLUMN card_prints.ai_metadata; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.card_prints.ai_metadata IS 'JSON metadata for AI classification, OCR output, model hints, etc.';


--
-- Name: COLUMN card_prints.image_hash; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.card_prints.image_hash IS 'Optional perceptual hash for card image (duplicate detection, visual matching).';


--
-- Name: COLUMN card_prints.data_quality_flags; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.card_prints.data_quality_flags IS 'JSON object with data quality flags (missing_image, suspect_mapping, ai_low_confidence, needs_review, etc.).';


--
-- Name: COLUMN card_prints.image_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.card_prints.image_status IS 'lifecycle status of primary image (ok/placeholder/missing/user_uploaded)';


--
-- Name: COLUMN card_prints.image_res; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.card_prints.image_res IS 'JSON metadata for primary image (width, height, format, etc.)';


--
-- Name: COLUMN card_prints.image_last_checked_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.card_prints.image_last_checked_at IS 'last time image health was verified by a worker';


--
-- Name: latest_card_prices_v; Type: VIEW; Schema: public; Owner: -
--



--
-- Name: v_card_search; Type: VIEW; Schema: public; Owner: -
--



--
-- Name: VIEW v_card_search; Type: COMMENT; Schema: public; Owner: -
--



--
-- Name: search_cards(text, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--



--
-- Name: set_auth_uid(); Type: FUNCTION; Schema: public; Owner: -
--



--
-- Name: set_timestamp_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--



--
-- Name: set_vault_item_grade(uuid, text, numeric, text); Type: FUNCTION; Schema: public; Owner: -
--



--
-- Name: squash_ws(text); Type: FUNCTION; Schema: public; Owner: -
--



--
-- Name: upsert_condition_price(uuid, text, numeric, numeric, text, text, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: -
--



--
-- Name: upsert_graded_price(uuid, text, numeric, text, numeric, numeric, text, text, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: -
--



--
-- Name: vault_add_item(uuid, uuid, text); Type: FUNCTION; Schema: public; Owner: -
--



--
-- Name: vault_inc_qty(uuid, integer); Type: FUNCTION; Schema: public; Owner: -
--



--
-- Name: vault_item_delete_user_photo(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--



--
-- Name: vault_item_set_image_mode(uuid, text, text); Type: FUNCTION; Schema: public; Owner: -
--



--
-- Name: vault_item_set_user_photo(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--



--
-- Name: vault_item_set_user_photo(uuid, text, text); Type: FUNCTION; Schema: public; Owner: -
--



--
-- Name: vault_items_pricing_watch_user_vault_fn(); Type: FUNCTION; Schema: public; Owner: -
--



--
-- Name: vault_post_to_wall(uuid, integer, integer, text, text, boolean); Type: FUNCTION; Schema: public; Owner: -
--



--
-- Name: wishlist_totals(); Type: FUNCTION; Schema: public; Owner: -
--



--
-- Name: wishlist_totals_for(uuid); Type: FUNCTION; Schema: public; Owner: -
--



--
-- Name: _import_card_prints; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._import_card_prints (
    game text NOT NULL,
    set_code text NOT NULL,
    external_id text,
    number text NOT NULL,
    name text NOT NULL,
    rarity text,
    supertype text,
    subtype text,
    image_url text
);


--
-- Name: _import_sets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._import_sets (
    game text NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    release_date date,
    logo_url text,
    symbol_url text
);


--
-- Name: ai_decision_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_decision_logs (
    id bigint NOT NULL,
    raw_import_id bigint,
    card_print_id uuid,
    model text,
    input jsonb,
    output jsonb,
    confidence numeric,
    explain text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE ai_decision_logs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.ai_decision_logs IS 'Detailed AI decision logs for mapping/import decisions (inputs, outputs, confidence, explanation).';


--
-- Name: COLUMN ai_decision_logs.model; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ai_decision_logs.model IS 'Name or identifier of the AI model used.';


--
-- Name: COLUMN ai_decision_logs.input; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ai_decision_logs.input IS 'Input payload provided to the model.';


--
-- Name: COLUMN ai_decision_logs.output; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ai_decision_logs.output IS 'Raw output from the model.';


--
-- Name: COLUMN ai_decision_logs.explain; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ai_decision_logs.explain IS 'Human-readable explanation of why the decision was made, if available.';


--
-- Name: ai_decision_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ai_decision_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ai_decision_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ai_decision_logs_id_seq OWNED BY public.ai_decision_logs.id;


--
-- Name: alerts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.alerts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    card_id uuid NOT NULL,
    rule jsonb NOT NULL,
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: app_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.app_settings (
    id boolean DEFAULT true NOT NULL,
    allow_client_condition_edits boolean DEFAULT false NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: backup_card_prints_null_utc; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.backup_card_prints_null_utc (
    id uuid,
    game_id uuid,
    set_id uuid,
    name text,
    number text,
    variant_key text,
    rarity text,
    image_url text,
    tcgplayer_id text,
    external_ids jsonb,
    updated_at timestamp with time zone,
    set_code text,
    number_plain text
);


--
-- Name: card_catalog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.card_catalog (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    set_code text NOT NULL,
    set_name text NOT NULL,
    card_number text NOT NULL,
    name text NOT NULL,
    rarity text,
    image_url text NOT NULL,
    released_at date
);


--
-- Name: card_embeddings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.card_embeddings (
    card_print_id uuid NOT NULL,
    embedding double precision[],
    model text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE card_embeddings; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.card_embeddings IS 'Numeric embedding vectors per card_print, for AI search/matching.';


--
-- Name: COLUMN card_embeddings.embedding; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.card_embeddings.embedding IS 'Array of float values representing the embedding vector (model-specific).';


--
-- Name: COLUMN card_embeddings.model; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.card_embeddings.model IS 'Name/identifier of the embedding model used.';


--
-- Name: card_price_observations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.card_price_observations (
    id bigint NOT NULL,
    card_print_id uuid NOT NULL,
    source_id text NOT NULL,
    observed_at timestamp with time zone DEFAULT now() NOT NULL,
    currency public.price_currency DEFAULT 'USD'::public.price_currency NOT NULL,
    value numeric(12,2) NOT NULL,
    kind public.price_kind NOT NULL,
    qty integer DEFAULT 1 NOT NULL,
    meta jsonb
);


--
-- Name: card_price_observations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.card_price_observations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: card_price_observations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.card_price_observations_id_seq OWNED BY public.card_price_observations.id;


--
-- Name: card_price_rollups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.card_price_rollups (
    card_print_id uuid NOT NULL,
    currency public.price_currency DEFAULT 'USD'::public.price_currency NOT NULL,
    vault_value numeric(12,2) NOT NULL,
    last_computed_at timestamp with time zone DEFAULT now() NOT NULL,
    sample_size integer DEFAULT 0 NOT NULL,
    method text NOT NULL,
    source_breakdown jsonb
);


--
-- Name: card_price_ticks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.card_price_ticks (
    id bigint NOT NULL,
    card_print_id uuid NOT NULL,
    source text NOT NULL,
    currency text DEFAULT 'USD'::text NOT NULL,
    market numeric,
    low numeric,
    mid numeric,
    high numeric,
    captured_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT card_price_ticks_source_check CHECK ((source = ANY (ARRAY['tcgplayer'::text, 'cardmarket'::text])))
);


--
-- Name: card_price_ticks_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.card_price_ticks_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: card_price_ticks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.card_price_ticks_id_seq OWNED BY public.card_price_ticks.id;


--
-- Name: ebay_active_prices_latest; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ebay_active_prices_latest (
    card_print_id uuid NOT NULL,
    source text DEFAULT 'ebay_browse'::text NOT NULL,
    nm_floor numeric(12,2),
    nm_median numeric(12,2),
    lp_floor numeric(12,2),
    lp_median numeric(12,2),
    listing_count integer DEFAULT 0 NOT NULL,
    confidence numeric(3,2) DEFAULT 0.20 NOT NULL,
    last_snapshot_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);


--
-- Name: card_print_active_prices; Type: VIEW; Schema: public; Owner: -
--



--
-- Name: card_print_file_paths; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.card_print_file_paths (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    card_print_id uuid NOT NULL,
    raw_storage_path text,
    normalized_storage_path text,
    source text DEFAULT 'user'::text NOT NULL,
    orientation text DEFAULT 'front'::text,
    is_promoted boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: card_print_price_curves; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.card_print_price_curves (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    card_print_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    nm_median numeric,
    nm_floor numeric,
    nm_samples integer,
    lp_median numeric,
    lp_floor numeric,
    lp_samples integer,
    mp_median numeric,
    mp_floor numeric,
    mp_samples integer,
    hp_median numeric,
    hp_floor numeric,
    hp_samples integer,
    dmg_median numeric,
    dmg_floor numeric,
    dmg_samples integer,
    confidence numeric,
    listing_count integer,
    raw_json jsonb
);


--
-- Name: card_print_latest_price_curve; Type: VIEW; Schema: public; Owner: -
--



--
-- Name: card_print_traits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.card_print_traits (
    id bigint NOT NULL,
    card_print_id uuid NOT NULL,
    trait_type text NOT NULL,
    trait_value text NOT NULL,
    source text DEFAULT 'manual'::text NOT NULL,
    confidence numeric,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    hp integer,
    national_dex integer,
    types text[],
    rarity text,
    supertype text,
    card_category text,
    legacy_rarity text
);


--
-- Name: TABLE card_print_traits; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.card_print_traits IS 'Generic traits for card_prints (stamp, holo pattern, promo tag, language, border, etc.), AI- and import-friendly.';


--
-- Name: COLUMN card_print_traits.trait_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.card_print_traits.trait_type IS 'Trait category (e.g. stamp, holo_pattern, promo_tag, language, border, misprint).';


--
-- Name: COLUMN card_print_traits.trait_value; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.card_print_traits.trait_value IS 'Trait value (e.g. pre-release, staff, reverse-holo, cosmos, english, etc.).';


--
-- Name: COLUMN card_print_traits.source; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.card_print_traits.source IS 'Origin of the trait: manual, ai, import.';


--
-- Name: COLUMN card_print_traits.confidence; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.card_print_traits.confidence IS 'Optional confidence score for AI- or import-derived traits.';


--
-- Name: COLUMN card_print_traits.hp; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.card_print_traits.hp IS 'Numeric HP for the card_print (Pokemon enrichment v1).';


--
-- Name: COLUMN card_print_traits.national_dex; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.card_print_traits.national_dex IS 'National PokÃ©dex number for the card_print (Pokemon enrichment v1).';


--
-- Name: COLUMN card_print_traits.types; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.card_print_traits.types IS 'Pokemon types (array) standardized from PokemonAPI.';


--
-- Name: COLUMN card_print_traits.rarity; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.card_print_traits.rarity IS 'Standardized rarity from PokemonAPI.';


--
-- Name: COLUMN card_print_traits.supertype; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.card_print_traits.supertype IS 'PokemonAPI supertype (Pokemon, Trainer, Energy).';


--
-- Name: COLUMN card_print_traits.card_category; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.card_print_traits.card_category IS 'Derived category/subtype (Basic, Stage 1, Item, Supporter, etc.).';


--
-- Name: COLUMN card_print_traits.legacy_rarity; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.card_print_traits.legacy_rarity IS 'Previous rarity value preserved when standardizing to PokemonAPI rarity.';


--
-- Name: card_print_traits_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.card_print_traits_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: card_print_traits_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.card_print_traits_id_seq OWNED BY public.card_print_traits.id;


--
-- Name: card_prints_backup_20251115; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.card_prints_backup_20251115 (
    id uuid,
    game_id uuid,
    set_id uuid,
    name text,
    number text,
    variant_key text,
    rarity text,
    image_url text,
    tcgplayer_id text,
    external_ids jsonb,
    updated_at timestamp with time zone,
    set_code text,
    number_plain text,
    artist text,
    regulation_mark text,
    image_alt_url text,
    image_source text,
    variants jsonb
);


--
-- Name: card_prints_clean; Type: VIEW; Schema: public; Owner: -
--



--
-- Name: VIEW card_prints_clean; Type: COMMENT; Schema: public; Owner: -
--



--
-- Name: card_prints_public; Type: VIEW; Schema: public; Owner: -
--



--
-- Name: cards; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cards (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    game text DEFAULT 'pokemon'::text NOT NULL,
    set_id uuid,
    number text,
    name text NOT NULL,
    variant text,
    tcgplayer_id text,
    image_url text,
    created_at timestamp with time zone DEFAULT now(),
    rarity text
);


--
-- Name: TABLE cards; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.cards IS 'LEGACY TABLE: superseded by card_prints. Do not build new features on this.';


--
-- Name: condition_multipliers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.condition_multipliers (
    condition_label text NOT NULL,
    multiplier numeric NOT NULL
);


--
-- Name: condition_prices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.condition_prices (
    id bigint NOT NULL,
    card_id uuid NOT NULL,
    condition_label text NOT NULL,
    currency text DEFAULT 'USD'::text NOT NULL,
    market_price numeric,
    last_sold_price numeric,
    source text,
    ts timestamp with time zone DEFAULT now()
);


--
-- Name: condition_prices_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.condition_prices_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: condition_prices_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.condition_prices_id_seq OWNED BY public.condition_prices.id;


--
-- Name: dev_audit; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dev_audit (
    id bigint NOT NULL,
    ts timestamp with time zone DEFAULT now(),
    actor text,
    endpoint text,
    payload jsonb,
    note text
);


--
-- Name: dev_audit_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.dev_audit_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: dev_audit_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.dev_audit_id_seq OWNED BY public.dev_audit.id;


--
-- Name: ebay_accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ebay_accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    ebay_username text,
    marketplace_id text DEFAULT 'EBAY_US'::text NOT NULL,
    access_token text NOT NULL,
    refresh_token text,
    access_token_expires_at timestamp with time zone,
    scopes text[],
    is_active boolean DEFAULT true NOT NULL,
    last_sync_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE ebay_accounts; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.ebay_accounts IS 'Per-user eBay OAuth credentials + metadata for Seller Sync.';


--
-- Name: COLUMN ebay_accounts.user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ebay_accounts.user_id IS 'FK to auth.users.id identifying the Grookai seller.';


--
-- Name: COLUMN ebay_accounts.marketplace_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ebay_accounts.marketplace_id IS 'eBay marketplace site code (e.g., EBAY_US).';


--
-- Name: COLUMN ebay_accounts.access_token; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ebay_accounts.access_token IS 'Current OAuth access token for the seller account.';


--
-- Name: COLUMN ebay_accounts.refresh_token; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ebay_accounts.refresh_token IS 'OAuth refresh token when granted by eBay.';


--
-- Name: COLUMN ebay_accounts.access_token_expires_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ebay_accounts.access_token_expires_at IS 'Timestamp when the current access token expires.';


--
-- Name: COLUMN ebay_accounts.last_sync_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ebay_accounts.last_sync_at IS 'Last successful order ingestion time for this seller.';


--
-- Name: ebay_active_price_snapshots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ebay_active_price_snapshots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    card_print_id uuid NOT NULL,
    source text DEFAULT 'ebay_browse'::text NOT NULL,
    captured_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    nm_floor numeric(12,2),
    nm_median numeric(12,2),
    lp_floor numeric(12,2),
    lp_median numeric(12,2),
    listing_count integer DEFAULT 0 NOT NULL,
    raw_sample_count_nm integer DEFAULT 0 NOT NULL,
    raw_sample_count_lp integer DEFAULT 0 NOT NULL
);


--
-- Name: external_cache; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.external_cache (
    cache_key text NOT NULL,
    provider text NOT NULL,
    endpoint text NOT NULL,
    query_hash text NOT NULL,
    payload jsonb NOT NULL,
    status integer NOT NULL,
    fetched_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone NOT NULL
);


--
-- Name: external_mappings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.external_mappings (
    id bigint NOT NULL,
    card_print_id uuid NOT NULL,
    source text NOT NULL,
    external_id text NOT NULL,
    meta jsonb,
    synced_at timestamp with time zone DEFAULT now() NOT NULL,
    active boolean DEFAULT true NOT NULL
);


--
-- Name: TABLE external_mappings; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.external_mappings IS 'Canonical mapping table for all external IDs (tcgplayer, justtcg, ebay, etc.) per card_print.';


--
-- Name: COLUMN external_mappings.source; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.external_mappings.source IS 'External system name: tcgplayer, justtcg, ebay, manual, etc.';


--
-- Name: external_mappings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.external_mappings_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: external_mappings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.external_mappings_id_seq OWNED BY public.external_mappings.id;


--
-- Name: external_provider_stats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.external_provider_stats (
    id bigint NOT NULL,
    provider text NOT NULL,
    metric text NOT NULL,
    value numeric NOT NULL,
    window_label text DEFAULT '1d'::text NOT NULL,
    observed_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: external_provider_stats_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.external_provider_stats_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: external_provider_stats_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.external_provider_stats_id_seq OWNED BY public.external_provider_stats.id;


--
-- Name: fx_daily; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fx_daily (
    d date NOT NULL,
    usd_per_eur numeric(12,6) NOT NULL,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: games; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.games (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    slug text
);


--
-- Name: graded_prices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.graded_prices (
    id bigint NOT NULL,
    card_id uuid NOT NULL,
    grade_company text NOT NULL,
    grade_value numeric NOT NULL,
    grade_label text,
    currency text DEFAULT 'USD'::text NOT NULL,
    market_price numeric,
    last_sold_price numeric,
    pop_total integer,
    source text,
    ts timestamp with time zone DEFAULT now()
);


--
-- Name: graded_prices_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.graded_prices_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: graded_prices_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.graded_prices_id_seq OWNED BY public.graded_prices.id;


--
-- Name: has_currency; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.has_currency (
    "exists" boolean
);


--
-- Name: has_high; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.has_high (
    "exists" boolean
);


--
-- Name: has_low; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.has_low (
    "exists" boolean
);


--
-- Name: has_mid; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.has_mid (
    "exists" boolean
);


--
-- Name: has_source; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.has_source (
    "exists" boolean
);


--
-- Name: import_image_errors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.import_image_errors (
    id bigint NOT NULL,
    card_print_id uuid,
    set_code text,
    number text,
    source text,
    attempted_url text,
    err text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: import_image_errors_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.import_image_errors_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: import_image_errors_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.import_image_errors_id_seq OWNED BY public.import_image_errors.id;


--
-- Name: ingestion_jobs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ingestion_jobs (
    id bigint NOT NULL,
    job_type text NOT NULL,
    payload jsonb,
    status text DEFAULT 'pending'::text NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    last_attempt_at timestamp with time zone,
    locked_by text,
    locked_at timestamp with time zone
);


--
-- Name: TABLE ingestion_jobs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.ingestion_jobs IS 'Generic ingestion job queue for backend workers (sets, prices, backfills, etc.).';


--
-- Name: COLUMN ingestion_jobs.job_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ingestion_jobs.job_type IS 'Logical job type (import_sets, import_prices, etc.).';


--
-- Name: COLUMN ingestion_jobs.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ingestion_jobs.status IS 'Job status: pending, running, succeeded, failed.';


--
-- Name: ingestion_jobs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ingestion_jobs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ingestion_jobs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ingestion_jobs_id_seq OWNED BY public.ingestion_jobs.id;


--
-- Name: job_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.job_logs (
    id bigint NOT NULL,
    job_id uuid NOT NULL,
    at timestamp with time zone DEFAULT now() NOT NULL,
    level text DEFAULT 'info'::text NOT NULL,
    message text,
    meta jsonb
);


--
-- Name: job_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.job_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: job_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.job_logs_id_seq OWNED BY public.job_logs.id;


--
-- Name: jobs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.jobs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    payload jsonb NOT NULL,
    status text DEFAULT 'queued'::text NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    max_attempts integer DEFAULT 5 NOT NULL,
    last_error text,
    scheduled_at timestamp with time zone DEFAULT now() NOT NULL,
    started_at timestamp with time zone,
    finished_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: latest_card_prices_mv; Type: MATERIALIZED VIEW; Schema: public; Owner: -
--



--
-- Name: price_observations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.price_observations (
    id bigint NOT NULL,
    print_id uuid,
    condition text,
    grade_agency text,
    grade_value text,
    grade_qualifier text,
    source text NOT NULL,
    listing_type text,
    currency text DEFAULT 'USD'::text NOT NULL,
    price_usd numeric(12,2) NOT NULL,
    quantity integer,
    observed_at timestamp with time zone NOT NULL,
    imported_at timestamp with time zone DEFAULT now() NOT NULL,
    set_code text DEFAULT ''::text NOT NULL,
    number text DEFAULT ''::text NOT NULL,
    variant text DEFAULT ''::text NOT NULL,
    price_market numeric,
    price_mid numeric,
    price_low numeric,
    price_high numeric,
    marketplace_id text,
    order_id text,
    order_line_item_id text,
    shipping_amount numeric(12,2),
    seller_location text,
    raw_payload jsonb,
    CONSTRAINT price_observations_condition_check CHECK ((condition = ANY (ARRAY['NM'::text, 'LP'::text, 'MP'::text, 'HP'::text, 'DMG'::text]))),
    CONSTRAINT price_observations_grade_agency_check CHECK ((grade_agency = ANY (ARRAY['PSA'::text, 'BGS'::text, 'CGC'::text, 'ACE'::text, 'AGS'::text]))),
    CONSTRAINT price_observations_listing_type_check CHECK (((listing_type IS NULL) OR (listing_type = ANY (ARRAY['sold'::text, 'list'::text, 'auction'::text, 'SOLD'::text, 'LIST'::text, 'AUCTION'::text, 'FIXED_PRICE'::text, 'BEST_OFFER'::text, 'AUCTION_WITH_BIN'::text])))),
    CONSTRAINT price_observations_price_usd_check CHECK ((price_usd >= (0)::numeric))
);


--
-- Name: COLUMN price_observations.marketplace_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.price_observations.marketplace_id IS 'Marketplace identifier for the observation (e.g., EBAY_US).';


--
-- Name: COLUMN price_observations.order_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.price_observations.order_id IS 'Source order identifier (e.g., eBay orderId).';


--
-- Name: COLUMN price_observations.order_line_item_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.price_observations.order_line_item_id IS 'Source line-level identifier for the order item.';


--
-- Name: COLUMN price_observations.shipping_amount; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.price_observations.shipping_amount IS 'Shipping amount (same currency as currency column).';


--
-- Name: COLUMN price_observations.seller_location; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.price_observations.seller_location IS 'Seller region/country code captured from the order.';


--
-- Name: COLUMN price_observations.raw_payload; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.price_observations.raw_payload IS 'Raw JSON payload for debugging/traceability.';


--
-- Name: latest_prices; Type: MATERIALIZED VIEW; Schema: public; Owner: -
--



--
-- Name: listing_images; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.listing_images (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    listing_id uuid NOT NULL,
    image_url text NOT NULL,
    thumb_3x4_url text,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: listings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.listings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    owner_id uuid NOT NULL,
    title text,
    description text,
    price_cents integer,
    currency text DEFAULT 'USD'::text,
    condition text,
    visibility text DEFAULT 'public'::text,
    status text DEFAULT 'active'::text,
    location_city text,
    location_region text,
    location_country text,
    primary_image_url text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    card_print_id uuid,
    vault_item_id uuid,
    condition_tier text,
    quantity integer DEFAULT 1,
    note text,
    image_url text
);


--
-- Name: mapping_conflicts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mapping_conflicts (
    id bigint NOT NULL,
    raw_import_id bigint,
    candidate_print_ids bigint[],
    ai_confidence numeric,
    reason text,
    requires_human boolean DEFAULT true NOT NULL,
    resolved_by text,
    resolved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    candidate_print_uuids uuid[]
);


--
-- Name: TABLE mapping_conflicts; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.mapping_conflicts IS 'Records unresolved/ambiguous mappings between raw imports and card_prints for review.';


--
-- Name: COLUMN mapping_conflicts.candidate_print_ids; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.mapping_conflicts.candidate_print_ids IS 'LEGACY: historical candidate IDs stored as bigint[] for older schemas; kept for backward compatibility. New code should use candidate_print_uuids.';


--
-- Name: COLUMN mapping_conflicts.requires_human; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.mapping_conflicts.requires_human IS 'True if this conflict currently requires human review.';


--
-- Name: COLUMN mapping_conflicts.candidate_print_uuids; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.mapping_conflicts.candidate_print_uuids IS 'Canonical candidate print IDs (uuid[]) for conflicts; new code should use this instead of candidate_print_ids (bigint[]).';


--
-- Name: mapping_conflicts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.mapping_conflicts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: mapping_conflicts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.mapping_conflicts_id_seq OWNED BY public.mapping_conflicts.id;


--
-- Name: market_prices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.market_prices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    card_id uuid NOT NULL,
    price numeric NOT NULL,
    source text DEFAULT 'manual'::text NOT NULL,
    fetched_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT market_prices_price_check CHECK ((price >= (0)::numeric))
);


--
-- Name: price_observations_backup_20251115; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.price_observations_backup_20251115 (
    id bigint,
    print_id uuid,
    condition text,
    grade_agency text,
    grade_value text,
    grade_qualifier text,
    source text,
    listing_type text,
    currency text,
    price_usd numeric(12,2),
    quantity integer,
    observed_at timestamp with time zone,
    imported_at timestamp with time zone,
    set_code text,
    number text,
    variant text,
    price_market numeric,
    price_mid numeric,
    price_low numeric,
    price_high numeric
);


--
-- Name: price_observations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.price_observations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: price_observations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.price_observations_id_seq OWNED BY public.price_observations.id;


--
-- Name: price_rollup_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.price_rollup_config (
    id integer NOT NULL,
    method text DEFAULT 'weighted_average'::text NOT NULL,
    currency public.price_currency DEFAULT 'USD'::public.price_currency NOT NULL,
    weights jsonb NOT NULL
);


--
-- Name: price_rollup_config_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.price_rollup_config_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: price_rollup_config_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.price_rollup_config_id_seq OWNED BY public.price_rollup_config.id;


--
-- Name: price_sources; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.price_sources (
    id text NOT NULL,
    display_name text NOT NULL,
    is_active boolean DEFAULT true NOT NULL
);


--
-- Name: prices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.prices (
    id bigint NOT NULL,
    card_id uuid NOT NULL,
    ts timestamp with time zone NOT NULL,
    market_price numeric(10,2),
    source text,
    set_code text,
    number text,
    mapped_via text,
    currency text DEFAULT 'USD'::text NOT NULL,
    name text,
    image_url text
);


--
-- Name: prices_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.prices_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: prices_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.prices_id_seq OWNED BY public.prices.id;


--
-- Name: pricing_jobs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pricing_jobs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    card_print_id uuid NOT NULL,
    priority text DEFAULT 'normal'::text NOT NULL,
    reason text,
    status text DEFAULT 'pending'::text NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    error text,
    requested_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    started_at timestamp with time zone,
    completed_at timestamp with time zone
);


--
-- Name: pricing_watch; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pricing_watch (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    card_print_id uuid NOT NULL,
    watch_reason text NOT NULL,
    priority integer NOT NULL,
    refresh_interval_seconds integer NOT NULL,
    last_run_at timestamp with time zone,
    next_run_at timestamp with time zone,
    failure_count integer DEFAULT 0 NOT NULL,
    backoff_until timestamp with time zone,
    is_active boolean DEFAULT true NOT NULL
);


--
-- Name: raw_imports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.raw_imports (
    id bigint NOT NULL,
    payload jsonb NOT NULL,
    source text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    ingested_at timestamp with time zone DEFAULT now() NOT NULL,
    processed_at timestamp with time zone,
    notes text
);


--
-- Name: TABLE raw_imports; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.raw_imports IS 'Raw import payloads from external sources or AI scans before normalization.';


--
-- Name: COLUMN raw_imports.source; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.raw_imports.source IS 'Origin of the payload: justtcg, ai_scan, csv, manual, etc.';


--
-- Name: COLUMN raw_imports.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.raw_imports.status IS 'Lifecycle status: pending, processed, failed, ai_review.';


--
-- Name: raw_imports_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.raw_imports_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: raw_imports_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.raw_imports_id_seq OWNED BY public.raw_imports.id;


--
-- Name: scans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    vault_item_id uuid NOT NULL,
    images jsonb NOT NULL,
    device_meta jsonb,
    score integer,
    label text,
    confidence numeric(4,2),
    defects jsonb,
    created_at timestamp with time zone DEFAULT now(),
    user_id uuid
);


--
-- Name: set_code_classification; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.set_code_classification (
    set_code text NOT NULL,
    is_canon boolean DEFAULT true NOT NULL,
    canon_source text DEFAULT 'unknown'::text NOT NULL,
    notes text,
    pokemonapi_set_id text,
    tcgdex_set_id text,
    canonical_set_code text,
    tcgdex_asset_code text
);


--
-- Name: set_sync_audit; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.set_sync_audit (
    id bigint NOT NULL,
    run_at timestamp with time zone DEFAULT now() NOT NULL,
    total_api integer NOT NULL,
    total_db integer NOT NULL,
    missing_count integer NOT NULL,
    extra_count integer NOT NULL,
    missing jsonb DEFAULT '[]'::jsonb NOT NULL,
    extra jsonb DEFAULT '[]'::jsonb NOT NULL,
    fix jsonb
);


--
-- Name: set_sync_audit_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.set_sync_audit ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.set_sync_audit_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: sets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    game text DEFAULT 'pokemon'::text NOT NULL,
    code text,
    name text,
    release_date date,
    source jsonb DEFAULT '{}'::jsonb,
    logo_url text,
    symbol_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    last_synced_at timestamp with time zone
);


--
-- Name: tcgdex_cards; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tcgdex_cards (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tcgdex_card_id text NOT NULL,
    tcgdex_set_id text NOT NULL,
    lang text DEFAULT 'en'::text NOT NULL,
    local_number text,
    printed_number text,
    name text,
    supertype text,
    subtypes text[],
    rarity text,
    image_url text,
    raw jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE tcgdex_cards; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tcgdex_cards IS 'Staging mirror of TCGdex cards for TCGDEX_CANON_REBUILD_V1; not user-facing.';


--
-- Name: COLUMN tcgdex_cards.tcgdex_set_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tcgdex_cards.tcgdex_set_id IS 'Logical relationship: (tcgdex_set_id, lang) -> public.tcgdex_sets(tcgdex_set_id, lang).';


--
-- Name: tcgdex_set_audit; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tcgdex_set_audit (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tcgdex_set_id text NOT NULL,
    set_code text NOT NULL,
    lang text DEFAULT 'en'::text NOT NULL,
    staging_count integer DEFAULT 0 NOT NULL,
    prints_count integer DEFAULT 0 NOT NULL,
    planned_inserts integer DEFAULT 0 NOT NULL,
    planned_updates integer DEFAULT 0 NOT NULL,
    conflict_count integer DEFAULT 0 NOT NULL,
    status text DEFAULT 'unknown'::text NOT NULL,
    notes text,
    last_run_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE tcgdex_set_audit; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tcgdex_set_audit IS 'Audit-only diagnostics for TCGDEX_CANON_REBUILD_V1. Not user-facing; summarizes staging vs canon alignment per set.';


--
-- Name: tcgdex_sets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tcgdex_sets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tcgdex_set_id text NOT NULL,
    lang text DEFAULT 'en'::text NOT NULL,
    name text,
    series text,
    printed_total jsonb,
    total integer,
    release_date date,
    raw jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE tcgdex_sets; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.tcgdex_sets IS 'Staging mirror of TCGdex sets for TCGDEX_CANON_REBUILD_V1; not user-facing.';


--
-- Name: unmatched_price_rows; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.unmatched_price_rows (
    id bigint NOT NULL,
    raw_payload jsonb NOT NULL,
    reason text NOT NULL,
    seen_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: unmatched_price_rows_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.unmatched_price_rows_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: unmatched_price_rows_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.unmatched_price_rows_id_seq OWNED BY public.unmatched_price_rows.id;


--
-- Name: user_card_images; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_card_images (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    vault_item_id uuid NOT NULL,
    storage_path text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    side text DEFAULT 'front'::text,
    CONSTRAINT user_card_images_side_check CHECK ((side = ANY (ARRAY['front'::text, 'back'::text])))
);


--
-- Name: user_card_photos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_card_photos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    card_print_id uuid NOT NULL,
    raw_storage_path text NOT NULL,
    normalized_storage_path text,
    status text DEFAULT 'pending'::text NOT NULL,
    source text DEFAULT 'manual'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    normalized_at timestamp with time zone,
    promoted_at timestamp with time zone
);


--
-- Name: v_best_prices_all; Type: VIEW; Schema: public; Owner: -
--



--
-- Name: v_card_images; Type: VIEW; Schema: public; Owner: -
--



--
-- Name: v_card_prices_usd; Type: VIEW; Schema: public; Owner: -
--



--
-- Name: v_card_prints; Type: VIEW; Schema: public; Owner: -
--



--
-- Name: v_card_prints_badges; Type: VIEW; Schema: public; Owner: -
--



--
-- Name: v_card_prints_canon; Type: VIEW; Schema: public; Owner: -
--



--
-- Name: v_card_prints_noncanon; Type: VIEW; Schema: public; Owner: -
--



--
-- Name: v_image_coverage_canon; Type: VIEW; Schema: public; Owner: -
--



--
-- Name: v_image_coverage_noncanon; Type: VIEW; Schema: public; Owner: -
--



--
-- Name: v_latest_price; Type: VIEW; Schema: public; Owner: -
--



--
-- Name: v_latest_price_by_card; Type: VIEW; Schema: public; Owner: -
--



--
-- Name: v_latest_price_clean; Type: VIEW; Schema: public; Owner: -
--



--
-- Name: v_latest_price_pref; Type: VIEW; Schema: public; Owner: -
--



--
-- Name: v_latest_prices; Type: VIEW; Schema: public; Owner: -
--



--
-- Name: v_pokemonapi_contract_audit; Type: VIEW; Schema: public; Owner: -
--



--
-- Name: v_vault_items; Type: VIEW; Schema: public; Owner: -
--



--
-- Name: v_recently_added; Type: VIEW; Schema: public; Owner: -
--



--
-- Name: v_tcgdex_contract_audit; Type: VIEW; Schema: public; Owner: -
--



--
-- Name: v_ticker_24h; Type: VIEW; Schema: public; Owner: -
--



--
-- Name: v_vault_items_ext; Type: VIEW; Schema: public; Owner: -
--



--
-- Name: wall_thumbs_3x4; Type: MATERIALIZED VIEW; Schema: public; Owner: -
--



--
-- Name: wall_feed_view; Type: VIEW; Schema: public; Owner: -
--



--
-- Name: v_wall_feed; Type: VIEW; Schema: public; Owner: -
--



--
-- Name: VIEW v_wall_feed; Type: COMMENT; Schema: public; Owner: -
--



--
-- Name: wishlist_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wishlist_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    card_id uuid NOT NULL,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: v_wishlist_items; Type: VIEW; Schema: public; Owner: -
--



--
-- Name: v_wishlist_value_by_user; Type: VIEW; Schema: public; Owner: -
--



--
-- Name: vault_items_backup_20251115; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vault_items_backup_20251115 (
    id uuid,
    user_id uuid,
    card_id uuid,
    qty integer,
    acquisition_cost numeric(10,2),
    condition_label text,
    condition_score integer,
    is_graded boolean,
    grade_company text,
    grade_value text,
    notes text,
    created_at timestamp with time zone,
    name text,
    set_name text,
    photo_url text,
    market_price numeric,
    last_price_update timestamp with time zone,
    grade_label text
);


--
-- Name: waitlist; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.waitlist (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    source text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT waitlist_email_check CHECK ((POSITION(('@'::text) IN (email)) > 1))
);


--
-- Name: wall_feed_v; Type: VIEW; Schema: public; Owner: -
--



--
-- Name: VIEW wall_feed_v; Type: COMMENT; Schema: public; Owner: -
--



--
-- Name: ai_decision_logs id; Type: DEFAULT; Schema: public; Owner: -
--



--
-- Name: card_price_observations id; Type: DEFAULT; Schema: public; Owner: -
--



--
-- Name: card_price_ticks id; Type: DEFAULT; Schema: public; Owner: -
--



--
-- Name: card_print_traits id; Type: DEFAULT; Schema: public; Owner: -
--



--
-- Name: condition_prices id; Type: DEFAULT; Schema: public; Owner: -
--



--
-- Name: dev_audit id; Type: DEFAULT; Schema: public; Owner: -
--



--
-- Name: external_mappings id; Type: DEFAULT; Schema: public; Owner: -
--



--
-- Name: external_provider_stats id; Type: DEFAULT; Schema: public; Owner: -
--



--
-- Name: graded_prices id; Type: DEFAULT; Schema: public; Owner: -
--



--
-- Name: import_image_errors id; Type: DEFAULT; Schema: public; Owner: -
--



--
-- Name: ingestion_jobs id; Type: DEFAULT; Schema: public; Owner: -
--



--
-- Name: job_logs id; Type: DEFAULT; Schema: public; Owner: -
--



--
-- Name: mapping_conflicts id; Type: DEFAULT; Schema: public; Owner: -
--



--
-- Name: price_observations id; Type: DEFAULT; Schema: public; Owner: -
--



--
-- Name: price_rollup_config id; Type: DEFAULT; Schema: public; Owner: -
--



--
-- Name: prices id; Type: DEFAULT; Schema: public; Owner: -
--



--
-- Name: raw_imports id; Type: DEFAULT; Schema: public; Owner: -
--



--
-- Name: unmatched_price_rows id; Type: DEFAULT; Schema: public; Owner: -
--



--
-- Name: ai_decision_logs ai_decision_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--



--
-- Name: alerts alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--



--
-- Name: app_settings app_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--



--
-- Name: card_catalog card_catalog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--



--
-- Name: card_embeddings card_embeddings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--



--
-- Name: card_price_observations card_price_observations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--



--
-- Name: card_price_rollups card_price_rollups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--



--
-- Name: card_price_ticks card_price_ticks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--



--
-- Name: card_prices card_prices_card_print_id_source_key; Type: CONSTRAINT; Schema: public; Owner: -
--



--
-- Name: card_prices card_prices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--



--
-- Name: card_print_file_paths card_print_file_paths_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--



--
-- Name: card_print_price_curves card_print_price_curves_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--



--
-- Name: card_print_traits card_print_traits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--



--
-- Name: card_prints card_prints_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--



--
-- Name: cards cards_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--



--
-- Name: condition_multipliers condition_multipliers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--



--
-- Name: condition_prices condition_prices_card_id_condition_label_currency_ts_key; Type: CONSTRAINT; Schema: public; Owner: -
--



--
-- Name: condition_prices condition_prices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--



--
-- Name: dev_audit dev_audit_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--



--
-- Name: ebay_accounts ebay_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--



--
-- Name: ebay_active_price_snapshots ebay_active_price_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--



--
-- Name: ebay_active_prices_latest ebay_active_prices_latest_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--



--
-- Name: external_cache external_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--



--
-- Name: external_mappings external_mappings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--



--
-- Name: external_mappings external_mappings_source_external_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--



--
-- Name: external_provider_stats external_provider_stats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--



--
-- Name: fx_daily fx_daily_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--



--
-- Name: games games_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--



--
-- Name: games games_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--



--
-- Name: games games_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--



--
-- Name: graded_prices graded_prices_card_id_grade_company_grade_value_currency_ts_key; Type: CONSTRAINT; Schema: public; Owner: -
--



--
-- Name: graded_prices graded_prices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--



--
-- Name: import_image_errors import_image_errors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--



--
-- Name: ingestion_jobs ingestion_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--



--
-- Name: job_logs job_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--



--
-- Name: jobs jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--



--
-- Name: listing_images listing_images_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--



--
-- Name: listings listings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--



--
-- Name: mapping_conflicts mapping_conflicts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--



--
-- Name: market_prices market_prices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--



--
-- Name: price_observations price_observations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--



--
-- Name: price_observations price_observations_print_id_condition_grade_agency_grade_va_key; Type: CONSTRAINT; Schema: public; Owner: -
--



--
-- Name: price_rollup_config price_rollup_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--



--
-- Name: price_sources price_sources_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--



--
-- Name: prices prices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--



--
-- Name: pricing_jobs pricing_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--



--
-- Name: pricing_watch pricing_watch_card_print_reason_key; Type: CONSTRAINT; Schema: public; Owner: -
--



--
-- Name: pricing_watch pricing_watch_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--



--
-- Name: raw_imports raw_imports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--



--
-- Name: scans scans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--



--
-- Name: set_code_classification set_code_classification_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--



--
-- Name: set_sync_audit set_sync_audit_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--



--
-- Name: sets sets_game_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--



--
-- Name: sets sets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--



--
-- Name: tcgdex_cards tcgdex_cards_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--



--
-- Name: tcgdex_cards tcgdex_cards_tcgdex_card_id_lang_key; Type: CONSTRAINT; Schema: public; Owner: -
--



--
-- Name: tcgdex_set_audit tcgdex_set_audit_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--



--
-- Name: tcgdex_set_audit tcgdex_set_audit_tcgdex_set_id_lang_key; Type: CONSTRAINT; Schema: public; Owner: -
--



--
-- Name: tcgdex_sets tcgdex_sets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--



--
-- Name: tcgdex_sets tcgdex_sets_tcgdex_set_id_lang_key; Type: CONSTRAINT; Schema: public; Owner: -
--



--
-- Name: unmatched_price_rows unmatched_price_rows_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--



--
-- Name: card_prints uq_card_prints_identity; Type: CONSTRAINT; Schema: public; Owner: -
--



--
-- Name: vault_items uq_user_card; Type: CONSTRAINT; Schema: public; Owner: -
--



--
-- Name: vault_items uq_vault_user_card; Type: CONSTRAINT; Schema: public; Owner: -
--



--
-- Name: user_card_images user_card_images_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--



--
-- Name: user_card_images user_card_images_vault_item_side_key; Type: CONSTRAINT; Schema: public; Owner: -
--



--
-- Name: user_card_photos user_card_photos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--



--
-- Name: vault_items vault_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--



--
-- Name: waitlist waitlist_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--



--
-- Name: wishlist_items wishlist_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--



--
-- Name: wishlist_items wishlist_items_user_id_card_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--



--
-- Name: ai_decision_logs_card_print_id_idx; Type: INDEX; Schema: public; Owner: -
--



--
-- Name: ai_decision_logs_created_at_idx; Type: INDEX; Schema: public; Owner: -
--



--
-- Name: ai_decision_logs_raw_import_id_idx; Type: INDEX; Schema: public; Owner: -
--



--
-- Name: alerts_card_idx; Type: INDEX; Schema: public; Owner: -
--



--
-- Name: alerts_user_idx; Type: INDEX; Schema: public; Owner: -
--



--
-- Name: card_embeddings_model_idx; Type: INDEX; Schema: public; Owner: -
--



--
-- Name: card_price_ticks_print_time_idx; Type: INDEX; Schema: public; Owner: -
--



--
-- Name: card_prices_print_source_idx; Type: INDEX; Schema: public; Owner: -
--



--
-- Name: card_prices_updated_idx; Type: INDEX; Schema: public; Owner: -
--



--
-- Name: card_print_price_curves_print_time_idx; Type: INDEX; Schema: public; Owner: -
--



--
-- Name: card_print_traits_card_print_id_idx; Type: INDEX; Schema: public; Owner: -
--



--
-- Name: card_print_traits_trait_type_value_idx; Type: INDEX; Schema: public; Owner: -
--



--
-- Name: card_print_traits_unique_card_trait_source; Type: INDEX; Schema: public; Owner: -
--



--
-- Name: card_prints_name_ci; Type: INDEX; Schema: public; Owner: -
--



--
-- Name: card_prints_name_gin; Type: INDEX; Schema: public; Owner: -
--



--
-- Name: card_prints_name_trgm_idx; Type: INDEX; Schema: public; Owner: -
--



--
-- Name: card_prints_print_identity_key_uq; Type: INDEX; Schema: public; Owner: -
--



--
-- Name: card_prints_set_code_ci; Type: INDEX; Schema: public; Owner: -
--



--
-- Name: card_prints_set_code_number_plain_idx; Type: INDEX; Schema: public; Owner: -
--



--
-- Name: card_prints_set_id_idx; Type: INDEX; Schema: public; Owner: -
--



--
-- Name: card_prints_tcgplayer_id_idx; Type: INDEX; Schema: public; Owner: -
--



--
-- Name: cards_name_idx; Type: INDEX; Schema: public; Owner: -
--



--
-- Name: cards_set_idx; Type: INDEX; Schema: public; Owner: -
--



--
-- Name: condition_prices_card_condition_ts; Type: INDEX; Schema: public; Owner: -
--



--
-- Name: cp_setnum_idx; Type: INDEX; Schema: public; Owner: -
--



--
-- Name: cpo_card_time_idx; Type: INDEX; Schema: public; Owner: -
--



--
-- Name: cpo_source_idx; Type: INDEX; Schema: public; Owner: -
--



--
-- Name: ebay_accounts_active_last_sync_idx; Type: INDEX; Schema: public; Owner: -
--



--
-- Name: ebay_accounts_user_id_idx; Type: INDEX; Schema: public; Owner: -
--



--
-- Name: external_mappings_card_print_id_idx; Type: INDEX; Schema: public; Owner: -
--



--
-- Name: external_mappings_source_external_id_idx; Type: INDEX; Schema: public; Owner: -
--



--
-- Name: external_mappings_source_idx; Type: INDEX; Schema: public; Owner: -
--



--
-- Name: graded_prices_card_grade_ts; Type: INDEX; Schema: public; Owner: -
--



--
-- Name: idx_card_prints_name; Type: INDEX; Schema: public; Owner: -
--



--
-- Name: idx_card_prints_name_trgm; Type: INDEX; Schema: public; Owner: -
--



--
-- Name: idx_card_prints_set_no; Type: INDEX; Schema: public; Owner: -
--



--
-- Name: idx_card_prints_setnum; Type: INDEX; Schema: public; Owner: -
--



--
-- Name: idx_card_prints_setnumplain; Type: INDEX; Schema: public; Owner: -
--



--
-- Name: idx_catalog_name_trgm; Type: INDEX; Schema: public; Owner: -
--



--
-- Name: idx_catalog_setname_trgm; Type: INDEX; Schema: public; Owner: -
--



--
-- Name: idx_cp_last_updated; Type: INDEX; Schema: public; Owner: -
--



--
-- Name: idx_cp_print_time; Type: INDEX; Schema: public; Owner: -
--



--
-- Name: idx_eaps_card_print_time; Type: INDEX; Schema: public; Owner: -
--



--
-- Name: idx_external_cache_exp; Type: INDEX; Schema: public; Owner: -
--



--
-- Name: idx_job_logs_job_time; Type: INDEX; Schema: public; Owner: -
--



--
-- Name: idx_jobs_status_sched; Type: INDEX; Schema: public; Owner: -
--



--
-- Name: idx_latest_prices_print; Type: INDEX; Schema: public; Owner: -
--



--
-- Name: idx_listing_images_listing; Type: INDEX; Schema: public; Owner: -
--



--
-- Name: idx_listing_images_sort; Type: INDEX; Schema: public; Owner: -
--



--
-- Name: idx_listings_created_at; Type: INDEX; Schema: public; Owner: -
--



--
-- Name: idx_listings_owner; Type: INDEX; Schema: public; Owner: -
--



--
-- Name: idx_listings_status; Type: INDEX; Schema: public; Owner: -
--



--
-- Name: idx_market_prices_card_source_time; Type: INDEX; Schema: public; Owner: -
--



--
-- Name: idx_market_prices_card_time; Type: INDEX; Schema: public; Owner: -
--



--
-- Name: idx_price_obs_dim; Type: INDEX; Schema: public; Owner: -
--



--
-- Name: idx_price_obs_lookup; Type: INDEX; Schema: public; Owner: -
--



--
-- Name: idx_price_obs_print; Type: INDEX; Schema: public; Owner: -
--



--
-- Name: idx_price_obs_print_observed; Type: INDEX; Schema: public; Owner: -
--



--
-- Name: idx_prices_card_ts; Type: INDEX; Schema: public; Owner: -
--



--
-- Name: idx_pricing_jobs_status_priority; Type: INDEX; Schema: public; Owner: -
--



--
-- Name: idx_provider_stats_time; Type: INDEX; Schema: public; Owner: -
--



--
-- Name: idx_sets_code; Type: INDEX; Schema: public; Owner: -
--



--
-- Name: idx_tcgdex_cards_set_lang_local; Type: INDEX; Schema: public; Owner: -
--



--
-- Name: idx_tcgdex_cards_set_lang_rarity; Type: INDEX; Schema: public; Owner: -
--



--
-- Name: idx_tcgdex_sets_lang_set_id; Type: INDEX; Schema: public; Owner: -
--



--
-- Name: idx_user_card_images_user_id; Type: INDEX; Schema: public; Owner: -
--



--
-- Name: idx_user_card_images_vault_item_id; Type: INDEX; Schema: public; Owner: -
--



--
-- Name: idx_vault_items_user_created; Type: INDEX; Schema: public; Owner: -
--



--
-- Name: idx_vault_items_user_name; Type: INDEX; Schema: public; Owner: -
--



--
-- Name: idx_wall_thumbs_created_at; Type: INDEX; Schema: public; Owner: -
--



--
-- Name: ingestion_jobs_created_at_idx; Type: INDEX; Schema: public; Owner: -
--



--
-- Name: ingestion_jobs_job_type_idx; Type: INDEX; Schema: public; Owner: -
--



--
-- Name: ingestion_jobs_status_idx; Type: INDEX; Schema: public; Owner: -
--



--
-- Name: mapping_conflicts_candidate_print_uuids_gin_idx; Type: INDEX; Schema: public; Owner: -
--



--
-- Name: price_observations_condition_grade_agency_grade_value_idx; Type: INDEX; Schema: public; Owner: -
--



--
-- Name: price_observations_print_id_observed_at_idx; Type: INDEX; Schema: public; Owner: -
--



--
-- Name: prices_card_id_ts_idx; Type: INDEX; Schema: public; Owner: -
--



--
-- Name: prices_card_source_ts_idx; Type: INDEX; Schema: public; Owner: -
--



--
-- Name: prices_card_ts_idx; Type: INDEX; Schema: public; Owner: -
--



--
-- Name: prices_set_number_idx; Type: INDEX; Schema: public; Owner: -
--



--
-- Name: prices_setnum_cur_ts_idx; Type: INDEX; Schema: public; Owner: -
--



--
-- Name: prices_setnum_currency_ts; Type: INDEX; Schema: public; Owner: -
--



--
-- Name: pricing_watch_card_print_id_idx; Type: INDEX; Schema: public; Owner: -
--



--
-- Name: pricing_watch_next_run_at_idx; Type: INDEX; Schema: public; Owner: -
--



--
-- Name: pricing_watch_priority_next_run_idx; Type: INDEX; Schema: public; Owner: -
--



--
-- Name: raw_imports_ingested_at_idx; Type: INDEX; Schema: public; Owner: -
--



--
-- Name: raw_imports_status_idx; Type: INDEX; Schema: public; Owner: -
--



--
-- Name: scans_created_idx; Type: INDEX; Schema: public; Owner: -
--



--
-- Name: scans_vault_item_idx; Type: INDEX; Schema: public; Owner: -
--



--
-- Name: set_code_classification_set_code_idx; Type: INDEX; Schema: public; Owner: -
--



--
-- Name: sets_unique_game_code; Type: INDEX; Schema: public; Owner: -
--



--
-- Name: uq_catalog_setnum; Type: INDEX; Schema: public; Owner: -
--



--
-- Name: uq_latest_card_prices_mv; Type: INDEX; Schema: public; Owner: -
--



--
-- Name: uq_sets_code; Type: INDEX; Schema: public; Owner: -
--



--
-- Name: uq_vault_items_user_card; Type: INDEX; Schema: public; Owner: -
--



--
-- Name: ux_condition_prices_card_condition_currency; Type: INDEX; Schema: public; Owner: -
--



--
-- Name: ux_graded_prices_card_grade_currency; Type: INDEX; Schema: public; Owner: -
--



--
-- Name: vault_items_card_id_idx; Type: INDEX; Schema: public; Owner: -
--



--
-- Name: vault_items_card_idx; Type: INDEX; Schema: public; Owner: -
--



--
-- Name: vault_items_created_idx; Type: INDEX; Schema: public; Owner: -
--



--
-- Name: vault_items_user_created_idx; Type: INDEX; Schema: public; Owner: -
--



--
-- Name: vault_items_user_idx; Type: INDEX; Schema: public; Owner: -
--



--
-- Name: waitlist_email_unique; Type: INDEX; Schema: public; Owner: -
--



--
-- Name: wishlist_user_idx; Type: INDEX; Schema: public; Owner: -
--



--
-- Name: alerts trg_alerts_set_uid; Type: TRIGGER; Schema: public; Owner: -
--



--
-- Name: card_prices trg_append_price_tick; Type: TRIGGER; Schema: public; Owner: -
--



--
-- Name: price_observations trg_fill_price_obs_print_id; Type: TRIGGER; Schema: public; Owner: -
--



--
-- Name: listings trg_listings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--



--
-- Name: card_prices trg_queue_refresh_latest_card_prices; Type: TRIGGER; Schema: public; Owner: -
--



--
-- Name: scans trg_scans_set_auth_uid; Type: TRIGGER; Schema: public; Owner: -
--



--
-- Name: vault_items trg_vault_items_set_uid; Type: TRIGGER; Schema: public; Owner: -
--



--
-- Name: listing_images trg_wall_refresh_listing_images; Type: TRIGGER; Schema: public; Owner: -
--



--
-- Name: listings trg_wall_refresh_listings; Type: TRIGGER; Schema: public; Owner: -
--



--
-- Name: vault_items vault_items_pricing_watch_user_vault_trg; Type: TRIGGER; Schema: public; Owner: -
--



--
-- Name: ai_decision_logs ai_decision_logs_card_print_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--



--
-- Name: ai_decision_logs ai_decision_logs_raw_import_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--



--
-- Name: alerts alerts_card_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--



--
-- Name: alerts alerts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--



--
-- Name: card_embeddings card_embeddings_card_print_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--



--
-- Name: card_price_observations card_price_observations_card_print_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--



--
-- Name: card_price_observations card_price_observations_source_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--



--
-- Name: card_price_rollups card_price_rollups_card_print_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--



--
-- Name: card_price_ticks card_price_ticks_card_print_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--



--
-- Name: card_prices card_prices_card_print_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--



--
-- Name: card_print_file_paths card_print_file_paths_card_print_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--



--
-- Name: card_print_price_curves card_print_price_curves_card_print_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--



--
-- Name: card_print_traits card_print_traits_card_print_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--



--
-- Name: card_prints card_prints_game_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--



--
-- Name: card_prints card_prints_set_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--



--
-- Name: cards cards_set_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--



--
-- Name: ebay_accounts ebay_accounts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--



--
-- Name: ebay_active_price_snapshots ebay_active_price_snapshots_card_print_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--



--
-- Name: ebay_active_prices_latest ebay_active_prices_latest_card_print_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--



--
-- Name: external_mappings external_mappings_card_print_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--



--
-- Name: vault_items fk_vault_items_card; Type: FK CONSTRAINT; Schema: public; Owner: -
--



--
-- Name: job_logs job_logs_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--



--
-- Name: listing_images listing_images_listing_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--



--
-- Name: listings listings_card_print_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--



--
-- Name: listings listings_owner_id_users_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--



--
-- Name: listings listings_vault_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--



--
-- Name: mapping_conflicts mapping_conflicts_raw_import_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--



--
-- Name: market_prices market_prices_card_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--



--
-- Name: price_observations price_observations_print_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--



--
-- Name: prices prices_card_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--



--
-- Name: pricing_jobs pricing_jobs_card_print_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--



--
-- Name: pricing_watch pricing_watch_card_print_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--



--
-- Name: scans scans_vault_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--



--
-- Name: user_card_images user_card_images_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--



--
-- Name: user_card_images user_card_images_vault_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--



--
-- Name: user_card_photos user_card_photos_card_print_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--



--
-- Name: vault_items vault_items_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--



--
-- Name: wishlist_items wishlist_items_card_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--



--
-- Name: wishlist_items wishlist_items_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--



--
-- Name: alerts; Type: ROW SECURITY; Schema: public; Owner: -
--


--
-- Name: card_prints anon can read card_prints; Type: POLICY; Schema: public; Owner: -
--



--
-- Name: card_prints anon can update card_prints (dev); Type: POLICY; Schema: public; Owner: -
--



--
-- Name: market_prices anyone can read prices; Type: POLICY; Schema: public; Owner: -
--



--
-- Name: card_catalog; Type: ROW SECURITY; Schema: public; Owner: -
--


--
-- Name: card_price_ticks; Type: ROW SECURITY; Schema: public; Owner: -
--


--
-- Name: card_price_ticks card_price_ticks_read; Type: POLICY; Schema: public; Owner: -
--



--
-- Name: card_prices; Type: ROW SECURITY; Schema: public; Owner: -
--


--
-- Name: card_prices card_prices_read; Type: POLICY; Schema: public; Owner: -
--



--
-- Name: card_prints; Type: ROW SECURITY; Schema: public; Owner: -
--


--
-- Name: card_prints card_prints_read; Type: POLICY; Schema: public; Owner: -
--



--
-- Name: cards; Type: ROW SECURITY; Schema: public; Owner: -
--


--
-- Name: sets catalog readable; Type: POLICY; Schema: public; Owner: -
--



--
-- Name: card_prints catalog readable 2; Type: POLICY; Schema: public; Owner: -
--



--
-- Name: games; Type: ROW SECURITY; Schema: public; Owner: -
--


--
-- Name: alerts gv_alerts_delete; Type: POLICY; Schema: public; Owner: -
--



--
-- Name: alerts gv_alerts_insert; Type: POLICY; Schema: public; Owner: -
--



--
-- Name: alerts gv_alerts_select; Type: POLICY; Schema: public; Owner: -
--



--
-- Name: alerts gv_alerts_update; Type: POLICY; Schema: public; Owner: -
--



--
-- Name: scans gv_scans_delete; Type: POLICY; Schema: public; Owner: -
--



--
-- Name: scans gv_scans_insert; Type: POLICY; Schema: public; Owner: -
--



--
-- Name: scans gv_scans_select; Type: POLICY; Schema: public; Owner: -
--



--
-- Name: scans gv_scans_update; Type: POLICY; Schema: public; Owner: -
--



--
-- Name: vault_items gv_vault_items_delete; Type: POLICY; Schema: public; Owner: -
--



--
-- Name: vault_items gv_vault_items_insert; Type: POLICY; Schema: public; Owner: -
--



--
-- Name: vault_items gv_vault_items_select; Type: POLICY; Schema: public; Owner: -
--



--
-- Name: vault_items gv_vault_items_update; Type: POLICY; Schema: public; Owner: -
--



--
-- Name: listing_images; Type: ROW SECURITY; Schema: public; Owner: -
--


--
-- Name: listing_images listing_images_owner_write; Type: POLICY; Schema: public; Owner: -
--



--
-- Name: listing_images listing_images_read_public; Type: POLICY; Schema: public; Owner: -
--



--
-- Name: listings; Type: ROW SECURITY; Schema: public; Owner: -
--


--
-- Name: listings listings_owner_delete; Type: POLICY; Schema: public; Owner: -
--



--
-- Name: listings listings_owner_insert; Type: POLICY; Schema: public; Owner: -
--



--
-- Name: listings listings_owner_read; Type: POLICY; Schema: public; Owner: -
--



--
-- Name: listings listings_owner_update; Type: POLICY; Schema: public; Owner: -
--



--
-- Name: listings listings_read_public; Type: POLICY; Schema: public; Owner: -
--



--
-- Name: market_prices; Type: ROW SECURITY; Schema: public; Owner: -
--


--
-- Name: vault_items owner delete vault_items; Type: POLICY; Schema: public; Owner: -
--



--
-- Name: vault_items owner insert; Type: POLICY; Schema: public; Owner: -
--



--
-- Name: vault_items owner insert vault_items; Type: POLICY; Schema: public; Owner: -
--



--
-- Name: vault_items owner read; Type: POLICY; Schema: public; Owner: -
--



--
-- Name: vault_items owner select vault_items; Type: POLICY; Schema: public; Owner: -
--



--
-- Name: vault_items owner update; Type: POLICY; Schema: public; Owner: -
--



--
-- Name: vault_items owner update vault_items; Type: POLICY; Schema: public; Owner: -
--



--
-- Name: price_observations price_obs_read_any; Type: POLICY; Schema: public; Owner: -
--



--
-- Name: price_observations price_obs_write_service_only; Type: POLICY; Schema: public; Owner: -
--



--
-- Name: price_observations; Type: ROW SECURITY; Schema: public; Owner: -
--


--
-- Name: prices; Type: ROW SECURITY; Schema: public; Owner: -
--


--
-- Name: card_prices read all; Type: POLICY; Schema: public; Owner: -
--



--
-- Name: set_sync_audit read audit; Type: POLICY; Schema: public; Owner: -
--



--
-- Name: card_prints read_all_card_prints; Type: POLICY; Schema: public; Owner: -
--



--
-- Name: card_catalog refdata_read; Type: POLICY; Schema: public; Owner: -
--



--
-- Name: card_prints refdata_read; Type: POLICY; Schema: public; Owner: -
--



--
-- Name: cards refdata_read; Type: POLICY; Schema: public; Owner: -
--



--
-- Name: games refdata_read; Type: POLICY; Schema: public; Owner: -
--



--
-- Name: prices refdata_read; Type: POLICY; Schema: public; Owner: -
--



--
-- Name: sets refdata_read; Type: POLICY; Schema: public; Owner: -
--



--
-- Name: scans; Type: ROW SECURITY; Schema: public; Owner: -
--


--
-- Name: set_sync_audit; Type: ROW SECURITY; Schema: public; Owner: -
--


--
-- Name: sets; Type: ROW SECURITY; Schema: public; Owner: -
--


--
-- Name: unmatched_price_rows; Type: ROW SECURITY; Schema: public; Owner: -
--


--
-- Name: unmatched_price_rows unmatched_read_auth; Type: POLICY; Schema: public; Owner: -
--



--
-- Name: unmatched_price_rows unmatched_write_service_only; Type: POLICY; Schema: public; Owner: -
--



--
-- Name: card_prices update via function; Type: POLICY; Schema: public; Owner: -
--



--
-- Name: vault_items; Type: ROW SECURITY; Schema: public; Owner: -
--


--
-- Name: vault_items vault_items owner delete; Type: POLICY; Schema: public; Owner: -
--



--
-- Name: vault_items vault_items owner read; Type: POLICY; Schema: public; Owner: -
--



--
-- Name: vault_items vault_items owner update; Type: POLICY; Schema: public; Owner: -
--



--
-- Name: vault_items vault_items owner write; Type: POLICY; Schema: public; Owner: -
--



--
-- Name: waitlist; Type: ROW SECURITY; Schema: public; Owner: -
--


--
-- Name: waitlist waitlist_insert_public; Type: POLICY; Schema: public; Owner: -
--



--
-- Name: wishlist_items; Type: ROW SECURITY; Schema: public; Owner: -
--


--
-- Name: wishlist_items wl_rw; Type: POLICY; Schema: public; Owner: -
--



--
-- Name: card_prices write via function; Type: POLICY; Schema: public; Owner: -
--



--
-- PostgreSQL database dump complete
--


