import { ArrowLeft, Clock, Calendar, ExternalLink } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { AggiornaStatoTask } from "@/components/ui/aggiorna-stato-task";
import { DriveFiles } from "@/components/ui/drive-files";
import { SubtaskList } from "@/components/ui/subtask-list";

export default async function IncaricoDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();

    const [{ data: task }, { data: subtasks }] = await Promise.all([
        supabase
            .from('tasks')
            .select('*, clients(name, vault_path, drive_folder_id)')
            .eq('id', id)
            .single(),
        supabase
            .from('subtasks')
            .select('*')
            .eq('task_id', id)
            .order('sort_order', { ascending: true }),
    ]);

    if (!task) notFound();

    const isOverdue = task.deadline && new Date(task.deadline) < new Date() && task.status !== 'done';

    const statusLabel: Record<string, string> = {
        todo: 'Da Iniziare',
        in_progress: 'In Corso',
        done: 'Completato',
    };

    const typeLabel: Record<string, string> = {
        design: 'Design',
        dev: 'Sviluppo',
        bando: 'Bando',
        social: 'Social',
        finanze: 'Finanze',
        general: 'Generale',
    };

    return (
        <div className="space-y-6 max-w-4xl">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-primary/50">
                <Link href="/incarichi" className="flex items-center hover:text-primary transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-1" /> Incarichi
                </Link>
                <span>/</span>
                <span className="text-primary font-medium truncate">{task.title}</span>
            </div>

            {/* Header */}
            <div className="bg-white rounded-xl border border-border p-6">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div className="space-y-3">
                        <h1 className="text-2xl font-bold text-primary">{task.title}</h1>
                        <div className="flex flex-wrap items-center gap-3">
                            {task.clients?.name && (
                                <span className="text-sm font-medium text-primary/70">{task.clients.name}</span>
                            )}
                            <Badge variant={task.status === 'done' ? 'success' : task.status === 'in_progress' ? 'warning' : isOverdue ? 'destructive' : 'default'}>
                                {isOverdue && task.status !== 'done' ? 'In Ritardo' : statusLabel[task.status] || task.status}
                            </Badge>
                            {task.type && (
                                <span className="text-xs font-bold uppercase tracking-wider text-primary/40">
                                    {typeLabel[task.type] || task.type}
                                </span>
                            )}
                        </div>
                    </div>
                    <AggiornaStatoTask taskId={task.id} currentStatus={task.status} />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Main */}
                <div className="md:col-span-2 space-y-6">

                    {/* Scadenza */}
                    <div className="bg-white rounded-xl border border-border p-6">
                        <h2 className="text-sm font-semibold text-primary/50 uppercase tracking-wider mb-4">Tempistiche</h2>
                        <div className="flex items-center gap-6">
                            {task.deadline && (
                                <div className="flex items-center gap-2 text-sm">
                                    <Clock className={`w-4 h-4 ${isOverdue ? 'text-red-500' : 'text-primary/40'}`} />
                                    <span className={`font-medium ${isOverdue ? 'text-red-600' : 'text-primary'}`}>
                                        Scadenza: {new Date(task.deadline).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                                    </span>
                                </div>
                            )}
                            <div className="flex items-center gap-2 text-sm text-primary/50">
                                <Calendar className="w-4 h-4" />
                                Creato il {new Date(task.created_at).toLocaleDateString('it-IT')}
                            </div>
                        </div>
                    </div>

                    {/* Subtask */}
                    <div className="bg-white rounded-xl border border-border p-6">
                        <h2 className="text-sm font-semibold text-primary/50 uppercase tracking-wider mb-4">Subtask</h2>
                        <SubtaskList taskId={task.id} initialSubtasks={subtasks || []} />
                    </div>

                    {/* Note */}
                    {task.notes && (
                        <div className="bg-white rounded-xl border border-border p-6">
                            <h2 className="text-sm font-semibold text-primary/50 uppercase tracking-wider mb-3">Note</h2>
                            <p className="text-sm text-primary/70 whitespace-pre-wrap">{task.notes}</p>
                        </div>
                    )}
                </div>

                {/* Sidebar */}
                <div className="space-y-4">
                    {/* Cliente e Vault */}
                    {task.clients && (
                        <div className="bg-white rounded-xl border border-border p-5">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-primary/40 mb-3">Cliente</h3>
                            <p className="font-semibold text-primary">{task.clients.name}</p>
                            {task.clients.vault_path && (
                                <a
                                    href={`https://drive.google.com/drive/search?q=${encodeURIComponent(task.clients.vault_path)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mt-2 flex items-center gap-1.5 text-xs text-accent hover:underline"
                                >
                                    <ExternalLink className="w-3 h-3" />
                                    Apri su Drive
                                </a>
                            )}
                        </div>
                    )}

                    {/* Drive Files */}
                    {task.clients?.drive_folder_id && (
                        <div className="bg-white rounded-xl border border-border p-5">
                            <DriveFiles
                                folderId={task.clients.drive_folder_id}
                                folderName={task.clients.name}
                            />
                        </div>
                    )}

                    {/* Azioni rapide */}
                    <div className="bg-white rounded-xl border border-border p-5">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-primary/40 mb-3">Azioni</h3>
                        <div className="space-y-2">
                            <Link
                                href={`https://www.canva.com/create/`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-sm text-primary/70 hover:text-accent transition-colors"
                            >
                                <ExternalLink className="w-4 h-4" />
                                Apri Canva
                            </Link>
                            <Link
                                href={`https://www.figma.com/`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-sm text-primary/70 hover:text-accent transition-colors"
                            >
                                <ExternalLink className="w-4 h-4" />
                                Apri Figma
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
