import { Lightbulb } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { NuovaIdeaModal } from "@/components/ui/nuova-idea-modal";
import { IdeaBoard } from "@/components/ui/idea-board";

export default async function IdeePage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    let ideas: { id: string; text: string; title: string | null; assigned: boolean; created_at: string; idea_status: string | null; platforms: string[] | null; clients: { name: string } | null }[] = [];

    if (user) {
        const { data } = await supabase
            .from('ideas')
            .select('id, text, title, assigned, created_at, idea_status, platforms, clients(name)')
            .order('created_at', { ascending: false });
        ideas = (data as unknown as typeof ideas) || [];
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-primary">Idee</h1>
                    <p className="mt-2 text-sm text-primary/70">Cattura e organizza le tue idee creative.</p>
                </div>
                <NuovaIdeaModal />
            </div>

            {ideas.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-primary/40">
                    <Lightbulb className="w-12 h-12 mb-4 opacity-20" />
                    <p className="text-sm italic">Nessuna idea ancora. Premi + per aggiungerne una.</p>
                </div>
            ) : (
                <IdeaBoard ideas={ideas} />
            )}
        </div>
    );
}
