import { Lightbulb, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { NuovaIdeaModal } from "@/components/ui/nuova-idea-modal";
import { Badge } from "@/components/ui/badge";

export default async function IdeePage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    let ideas: { id: string; text: string; assigned: boolean; created_at: string; clients: { name: string } | null }[] = [];

    if (user) {
        const { data } = await supabase
            .from('ideas')
            .select('*, clients(name)')
            .order('created_at', { ascending: false });
        ideas = (data as typeof ideas) || [];
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

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {ideas.length === 0 ? (
                    <div className="col-span-full flex flex-col items-center justify-center py-20 text-primary/40">
                        <Lightbulb className="w-12 h-12 mb-4 opacity-20" />
                        <p className="text-sm italic">Nessuna idea ancora. Premi + per aggiungerne una.</p>
                    </div>
                ) : (
                    ideas.map(idea => (
                        <div key={idea.id} className="bg-white rounded-xl border border-border p-5 shadow-sm hover:shadow-md transition-shadow">
                            <p className="text-sm text-primary leading-relaxed">{idea.text}</p>
                            <div className="flex items-center justify-between mt-4">
                                <span className="text-xs text-primary/40">
                                    {new Date(idea.created_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}
                                </span>
                                <div className="flex items-center gap-2">
                                    {idea.clients?.name && (
                                        <span className="text-xs text-primary/50 font-medium">{idea.clients.name}</span>
                                    )}
                                    {idea.assigned && <Badge variant="success">Assegnata</Badge>}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
