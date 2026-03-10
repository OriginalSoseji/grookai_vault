ALTER TABLE public.card_prints
ADD COLUMN gv_id TEXT;

CREATE UNIQUE INDEX card_prints_gv_id_uq
ON public.card_prints (gv_id)
WHERE gv_id IS NOT NULL;
