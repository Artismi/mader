-- Aggiunta colonna category per distinguere Task (progetti) da Engagement (lavoro quotidiano)
ALTER TABLE public.tasks ADD COLUMN category TEXT DEFAULT 'task' NOT NULL;

-- Aggiornamento RLS per la nuova colonna (già coperto dalle policy esistenti su public.tasks)
COMMENT ON COLUMN public.tasks.category IS 'Valori: task (default), engagement';
