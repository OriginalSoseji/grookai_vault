-- Grookai Vault Baseline - Late Views
-- Views that depend on other views are applied here.

CREATE VIEW public.wall_feed_view AS
 SELECT id AS listing_id,
    owner_id,
    card_id,
    title,
    price_cents,
    currency,
    condition,
    status,
    created_at,
    thumb_url
   FROM public.wall_thumbs_3x4 w
  ORDER BY created_at DESC;

CREATE VIEW public.v_wall_feed AS
 SELECT listing_id,
    owner_id,
    card_id,
    title,
    price_cents,
    currency,
    condition,
    status,
    created_at,
    thumb_url
   FROM public.wall_feed_view;

CREATE VIEW public.wall_feed_v AS
 SELECT listing_id,
    owner_id,
    card_id,
    title,
    price_cents,
    currency,
    condition,
    status,
    created_at,
    thumb_url
   FROM public.wall_feed_view;

