import { Lightbulb } from "lucide-react";
import { ideas as ideasRepo } from "@/lib/db";
import { NuovaIdeaModal } from "@/components/ui/nuova-idea-modal";
import { IdeaBoard } from "@/components/ui/idea-board";

export const dynamic = "force-dynamic";

export default async function IdeePage() {
    const ideas = ideasRepo.getAllWithClient().map(i => ({
        id: i.id,
        text: i.text,
        title: i.title ?? null,
        assigned: i.assigned,
        created_at: i.created_at,
        idea_status: i.idea_status ?? null,
        platforms: i.platforms ?? null,
        clients: i.clients,
    }));

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
