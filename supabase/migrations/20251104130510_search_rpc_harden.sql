-- Remove older overload to avoid PostgREST ambiguity
-- Keep only: public.search_cards(q text, limit int, offset int)

DO $$
BEGIN
  BEGIN
    EXECUTE 'drop function if exists public.search_cards(text, integer)';
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END $$;

