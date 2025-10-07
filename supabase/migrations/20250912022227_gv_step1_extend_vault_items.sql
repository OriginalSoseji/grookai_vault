ALTER TABLE public.vault_items ADD COLUMN IF NOT EXISTS condition_label text;
ALTER TABLE public.vault_items ADD COLUMN IF NOT EXISTS is_graded boolean NOT NULL DEFAULT false;
ALTER TABLE public.vault_items ADD COLUMN IF NOT EXISTS grade_company text;
ALTER TABLE public.vault_items ADD COLUMN IF NOT EXISTS grade_value numeric(3,1);
ALTER TABLE public.vault_items ADD COLUMN IF NOT EXISTS grade_label text;
