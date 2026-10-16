import { clients as clientsDb } from "@/lib/db";
import { PubblicaWindow } from "@/components/ui/pubblica-window";
import { Send } from "lucide-react";

export default async function PubblicaPage() {
    const clients = clientsDb.getAll().map(c => ({ id: c.id, name: c.name }));

    return (
        <div className="h-[calc(100vh-10rem)] flex flex-col">
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-3">
                        <Send className="w-7 h-7 text-accent" />
                        Finestra di Pubblicazione
                    </h1>
                    <p className="mt-1 text-sm text-primary/60">
                        Scrivi una volta. Declina su ogni canale. Conferma e pubblica.
                    </p>
                </div>
            </div>
            <div className="flex-1 min-h-0">
                <PubblicaWindow clients={clients} />
            </div>
        </div>
    );
}
