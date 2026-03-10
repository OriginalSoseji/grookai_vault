-- Source: remote schema dump (public)
-- Command used:
--   supabase db dump --linked --schema public --file docs/release/logs/tmp_remote_public_schema.sql
-- This file captures the raw DDL statements for the printing-layer objects only.

CREATE TABLE IF NOT EXISTS "public"."card_printings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "card_print_id" "uuid" NOT NULL,
    "finish_key" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE "public"."card_printings" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."external_printing_mappings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "card_printing_id" "uuid" NOT NULL,
    "source" "text" NOT NULL,
    "external_id" "text" NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "synced_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "meta" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL
);

ALTER TABLE "public"."external_printing_mappings" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."finish_keys" (
    "key" "text" NOT NULL,
    "label" "text" NOT NULL,
    "sort_order" integer NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "meta" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL
);

ALTER TABLE "public"."finish_keys" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."premium_parallel_eligibility" (
    "set_code" "text" NOT NULL,
    "number" "text" NOT NULL,
    "finish_key" "text" DEFAULT 'pokeball'::"text" NOT NULL
);

ALTER TABLE "public"."premium_parallel_eligibility" OWNER TO "postgres";

ALTER TABLE ONLY "public"."card_printings"
    ADD CONSTRAINT "card_printings_card_print_id_finish_key_key" UNIQUE ("card_print_id", "finish_key");

ALTER TABLE ONLY "public"."card_printings"
    ADD CONSTRAINT "card_printings_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."external_printing_mappings"
    ADD CONSTRAINT "external_printing_mappings_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."external_printing_mappings"
    ADD CONSTRAINT "external_printing_mappings_source_external_id_key" UNIQUE ("source", "external_id");

ALTER TABLE ONLY "public"."finish_keys"
    ADD CONSTRAINT "finish_keys_pkey" PRIMARY KEY ("key");

ALTER TABLE ONLY "public"."premium_parallel_eligibility"
    ADD CONSTRAINT "premium_parallel_eligibility_pkey" PRIMARY KEY ("set_code", "number", "finish_key");

ALTER TABLE ONLY "public"."card_printings"
    ADD CONSTRAINT "card_printings_card_print_id_fkey" FOREIGN KEY ("card_print_id") REFERENCES "public"."card_prints"("id") ON DELETE RESTRICT;

ALTER TABLE ONLY "public"."card_printings"
    ADD CONSTRAINT "card_printings_finish_key_fkey" FOREIGN KEY ("finish_key") REFERENCES "public"."finish_keys"("key") ON DELETE RESTRICT;

ALTER TABLE ONLY "public"."external_printing_mappings"
    ADD CONSTRAINT "external_printing_mappings_card_printing_id_fkey" FOREIGN KEY ("card_printing_id") REFERENCES "public"."card_printings"("id") ON DELETE RESTRICT;
