BEGIN;

CREATE TABLE public.public_profiles (
    user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    slug text NOT NULL UNIQUE,
    display_name text NOT NULL,
    public_profile_enabled boolean NOT NULL DEFAULT false,
    vault_sharing_enabled boolean NOT NULL DEFAULT false,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT public_profiles_slug_lowercase_check CHECK (slug = lower(slug))
);

CREATE TABLE public.shared_cards (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    card_id uuid NOT NULL REFERENCES public.card_prints(id) ON DELETE CASCADE,
    gv_id text NOT NULL,
    is_shared boolean NOT NULL DEFAULT true,
    share_intent text NOT NULL DEFAULT 'shared',
    show_personal_front boolean NOT NULL DEFAULT false,
    show_personal_back boolean NOT NULL DEFAULT false,
    show_condition boolean NOT NULL DEFAULT false,
    show_quantity boolean NOT NULL DEFAULT false,
    public_note text,
    public_condition_label text,
    public_quantity integer,
    public_front_image_path text,
    public_back_image_path text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT shared_cards_share_intent_check CHECK (share_intent IN ('shared', 'trade', 'sell', 'trade_sell')),
    CONSTRAINT shared_cards_public_quantity_check CHECK (public_quantity IS NULL OR public_quantity >= 1),
    CONSTRAINT shared_cards_user_card_key UNIQUE (user_id, card_id),
    CONSTRAINT shared_cards_user_gv_id_key UNIQUE (user_id, gv_id)
);

CREATE INDEX shared_cards_user_id_idx
ON public.shared_cards (user_id);

CREATE INDEX shared_cards_share_intent_idx
ON public.shared_cards (share_intent);

CREATE INDEX shared_cards_gv_id_idx
ON public.shared_cards (gv_id);

CREATE TRIGGER trg_public_profiles_updated_at
BEFORE UPDATE ON public.public_profiles
FOR EACH ROW
EXECUTE FUNCTION public.set_timestamp_updated_at();

CREATE TRIGGER trg_shared_cards_updated_at
BEFORE UPDATE ON public.shared_cards
FOR EACH ROW
EXECUTE FUNCTION public.set_timestamp_updated_at();

ALTER TABLE public.public_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_cards ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.public_profiles FROM anon;
REVOKE ALL ON TABLE public.public_profiles FROM authenticated;
REVOKE ALL ON TABLE public.shared_cards FROM anon;
REVOKE ALL ON TABLE public.shared_cards FROM authenticated;

GRANT SELECT ON TABLE public.public_profiles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.public_profiles TO authenticated;
GRANT SELECT ON TABLE public.shared_cards TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.shared_cards TO authenticated;

CREATE POLICY public_profiles_public_read_enabled
ON public.public_profiles
FOR SELECT
TO anon, authenticated
USING (public_profile_enabled = true);

CREATE POLICY public_profiles_owner_select
ON public.public_profiles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY public_profiles_owner_insert
ON public.public_profiles
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY public_profiles_owner_update
ON public.public_profiles
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY public_profiles_owner_delete
ON public.public_profiles
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY shared_cards_public_read_enabled
ON public.shared_cards
FOR SELECT
TO anon, authenticated
USING (
    is_shared = true
    AND EXISTS (
        SELECT 1
        FROM public.public_profiles pp
        WHERE pp.user_id = shared_cards.user_id
          AND pp.public_profile_enabled = true
          AND pp.vault_sharing_enabled = true
    )
);

CREATE POLICY shared_cards_owner_select
ON public.shared_cards
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY shared_cards_owner_insert
ON public.shared_cards
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY shared_cards_owner_update
ON public.shared_cards
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY shared_cards_owner_delete
ON public.shared_cards
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

COMMIT;
