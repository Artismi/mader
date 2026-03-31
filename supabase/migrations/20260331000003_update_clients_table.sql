-- Migration to add missing columns to clients table
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS email text,
ADD COLUMN IF NOT EXISTS sector text,
ADD COLUMN IF NOT EXISTS drive_folder_id text;

-- Add description for safety
COMMENT ON COLUMN public.clients.drive_folder_id IS 'ID della cartella principale su Google Drive per questo cliente';
