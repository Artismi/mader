import { Lightbulb } from "lucide-react";
import { ideas as ideasRepo } from "@/lib/db";
import { NuovaIdeaModal } from "@/components/ui/nuova-idea-modal";
import { IdeaBoard } from "@/components/ui/idea-board";
import { PageHeader, EmptyState } from "@/components/ui/page-header";

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
        <div className="cos-page">
            <PageHeader
                kicker={`${ideas.length} ${ideas.length === 1 ? 'idea' : 'idee'}`}
                title="Idee"
                lead="Cattura e organizza le tue idee creative."
                actions={<NuovaIdeaModal />}
            />

            {ideas.length === 0 ? (
                <EmptyState icon={<Lightbulb className="h-6 w-6" strokeWidth={1.5} />} title="Il quaderno è vuoto">
                    Annota la prima idea con «+ Idea»: anche mezza frase basta, la sviluppi dopo.
                </EmptyState>
            ) : (
                <IdeaBoard ideas={ideas} />
            )}
        </div>
    );
}
