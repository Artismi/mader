-- ideas: campi aggiuntivi (ARD §8.3)
ALTER TABLE public.ideas
    ADD COLUMN IF NOT EXISTS title text,
    ADD COLUMN IF NOT EXISTS description text,
    ADD COLUMN IF NOT EXISTS platforms text[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS idea_status text NOT NULL DEFAULT 'idea',
    ADD COLUMN IF NOT EXISTS task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS output_links text[] DEFAULT '{}';

ALTER TABLE public.ideas
    ADD CONSTRAINT ideas_status_check
    CHECK (idea_status IN ('idea', 'in_lavorazione', 'pronto', 'pubblicato', 'archiviato'));
