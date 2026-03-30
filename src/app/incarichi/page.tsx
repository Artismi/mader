import { Plus, Search, Filter, MoreHorizontal } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

export default async function IncarichiPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let tasks: any[] = [];
    if (user) {
        const { data } = await supabase
            .from('tasks')
            .select(`*, clients(name)`)
            .order('deadline', { ascending: true });

        tasks = data || [];
    }

    // Calcolo helper per determinare visivamente lo status
    const getBadgeStatus = (status: string, deadline: string) => {
        const today = new Date().getTime();
        const tDeadline = new Date(deadline).getTime();

        if (status === 'done') return <Badge variant="success">Completato</Badge>;
        if (status === 'in_progress') return <Badge variant="warning">In Corso</Badge>;

        // Se todo
        if (tDeadline < today) return <Badge variant="destructive">In Ritardo</Badge>;
        return <Badge variant="default">Da Iniziare</Badge>;
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-primary">Incarichi</h1>
                    <p className="mt-2 text-sm text-primary/70">Gestisci i tuoi progetti attivi, scadenze e pianificazioni.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="primary">
                        <Plus className="-ml-0.5 mr-1.5 h-5 w-5" aria-hidden="true" />
                        Nuovo Incarico
                    </Button>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-surface p-4 rounded-lg border border-border shadow-sm">
                <div className="relative w-full sm:max-w-xs flex items-center">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <Search className="h-5 w-5 text-primary/50" aria-hidden="true" />
                    </div>
                    <Input
                        type="text"
                        className="pl-10"
                        placeholder="Cerca per titolo o cliente..."
                    />
                </div>
                <Button variant="secondary" className="w-full sm:w-auto text-primary/70">
                    <Filter className="-ml-0.5 mr-1.5 h-4 w-4" aria-hidden="true" />
                    Filtri Attivi: Nessuno
                </Button>
            </div>

            <Card className="overflow-hidden">
                <ul role="list" className="divide-y divide-border">
                    {tasks.length === 0 ? (
                        <div className="p-8 text-center text-primary/60 italic">Nessun incarico presente nel sistema.</div>
                    ) : (
                        tasks.map((task) => (
                            <li key={task.id} className="relative flex items-center space-x-4 px-4 py-4 sm:px-6 hover:bg-black/5 cursor-pointer transition-colors">
                                <div className="min-w-0 flex-auto">
                                    <div className="flex items-center gap-x-3">
                                        <h2 className="min-w-0 text-sm font-semibold leading-6 text-primary">
                                            <a href={`/incarichi/${task.id}`} className="flex gap-x-2">
                                                <span className="truncate">{task.title}</span>
                                                <span className="absolute inset-0" />
                                            </a>
                                        </h2>
                                        {getBadgeStatus(task.status, task.deadline)}
                                    </div>
                                    <div className="mt-1 flex items-center gap-x-2 text-xs leading-5 text-primary/60">
                                        <p className="truncate">Cliente: <span className="font-medium text-primary">{task.clients?.name || 'Sconosciuto'}</span></p>
                                        <svg viewBox="0 0 2 2" className="h-0.5 w-0.5 fill-current"><circle cx={1} cy={1} r={1} /></svg>
                                        <p className="truncate">Scadenza: <span className={`font-medium ${new Date(task.deadline).getTime() < new Date().getTime() && task.status !== 'done' ? 'text-red-600' : 'text-primary'}`}>
                                            {task.deadline ? new Date(task.deadline).toLocaleDateString('it-IT') : 'N/D'}
                                        </span></p>
                                        <svg viewBox="0 0 2 2" className="h-0.5 w-0.5 fill-current"><circle cx={1} cy={1} r={1} /></svg>
                                        <p className="truncate">Tipo: <span className="font-medium uppercase text-primary text-[10px] tracking-wider">{task.type}</span></p>
                                    </div>
                                </div>
                                <div className="flex shrink-0 items-center justify-end">
                                    <MoreHorizontal className="h-5 w-5 text-primary/40 group-hover:text-primary/70" aria-hidden="true" />
                                </div>
                            </li>
                        ))
                    )}
                </ul>
            </Card>
        </div>
    );
}
