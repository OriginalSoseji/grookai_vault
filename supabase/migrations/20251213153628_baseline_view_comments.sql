-- Grookai Vault Baseline - Post View Comments
-- Extracted so views exist before COMMENT ON VIEW runs.

COMMENT ON VIEW public.v_card_search IS 'Stable app-facing search view. Guarantees image_best, image_url, thumb_url, number(+variants), and latest prices when available.';
COMMENT ON VIEW public.card_prints_clean IS 'card_prints with sanitized name_display and unaccented name_search';
