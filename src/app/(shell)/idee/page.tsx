import { Lightbulb } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { NuovaIdeaModal } from "@/components/ui/nuova-idea-modal";
import { IdeaBoard } from "@/components/ui/idea-board";
import { PageHeader, EmptyState } from "@/components/ui/page-header";

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
