-- Subtasks (ARD §8.2 — fasi e task quotidiani)
CREATE TABLE IF NOT EXISTS public.subtasks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title text NOT NULL,
    done boolean NOT NULL DEFAULT false,
    sort_order integer NOT NULL DEFAULT 0,
    fase text,
    created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);
ALTER TABLE public.subtasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subtasks_own" ON public.subtasks FOR ALL USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS subtasks_task_id_idx ON public.subtasks(task_id);
