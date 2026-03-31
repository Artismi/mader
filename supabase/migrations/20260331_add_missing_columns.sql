-- tasks: notes
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS notes text;

-- clients: email, sector, integrazioni esterne
ALTER TABLE public.clients
    ADD COLUMN IF NOT EXISTS email text,
    ADD COLUMN IF NOT EXISTS sector text,
    ADD COLUMN IF NOT EXISTS canva_brand_kit_id text,
    ADD COLUMN IF NOT EXISTS figjam_board_id text,
    ADD COLUMN IF NOT EXISTS vault_md_content text;

-- user_tokens: scadenza token
ALTER TABLE public.user_tokens ADD COLUMN IF NOT EXISTS expires_at timestamptz;
