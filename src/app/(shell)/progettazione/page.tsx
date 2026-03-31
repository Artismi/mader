import { createClient } from "@/lib/supabase/server";
import { DesignWindow } from "@/components/ui/design-window";

export default async function ProgettazionePage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    let clients: { id: string; name: string; figjam_board_id: string | null }[] = [];
    if (user) {
        const { data } = await supabase
            .from('clients')
            .select('id, name, figjam_board_id')
            .order('name');
        clients = data || [];
    }

    return (
        <div className="h-[calc(100vh-10rem)] flex flex-col">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-primary">Finestra di Progettazione</h1>
                    <p className="mt-1 text-sm text-primary/60">Editor testo strutturato + FigJam. Stessa sessione, stesso contesto AI.</p>
                </div>
            </div>
            <DesignWindow clients={clients} />
        </div>
    );
}
