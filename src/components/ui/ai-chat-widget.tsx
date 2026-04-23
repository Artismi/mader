'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, getToolName, isTextUIPart, isToolUIPart, type UIMessage } from 'ai';
import { Input } from "@/components/ui/input";
import { Send, Bot, Sparkles, Trash2, ChevronDown, User, FolderOpen, X, Plus, FileText, Loader2, History, MessageSquare, ExternalLink, Settings2, CheckCircle2, Circle, Search, Library, PenTool, AlertCircle, RefreshCw } from "lucide-react";
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { cn } from "@/lib/utils";
import { useSidebar } from '@/components/layout/SidebarContext';
import { useApp } from '@/components/layout/AppContext';
import { useChatStore, ChatSession, Message } from '../studio/hooks/use-chat-store';

type ModelId = 'claude' | 'gemini';

// ── Tipi contesto ─────────────────────────────────────────────────────────────

interface VaultFile { name: string; relativePath: string; isDir: boolean }

interface ExtraVaultFile {
  path: string
  name: string
  note: string   // istruzione utente su come usare il file
}

// 'auto' = segue selectedClientId dall'AppContext (comportamento precedente)
// null   = nessun cliente (override esplicito)
// Client = cliente specifico scelto dall'utente
type ClientSetting = 'auto' | null | { id: string; name: string }

function userMessageDisplayText(m: UIMessage): string {
    const raw = m.parts.filter(isTextUIPart).map(p => p.text).join('');
    return m.role === 'user'
        ? raw.replace(/^\[Soggetto: .+?\]( \[File: .+?\])?\n/, '')
        : raw;
}

// Solo i tool che modificano il canvas — generateAIImage è un passo intermedio,
// non viene mostrato in chat come conferma finale.
const CANVAS_TOOL_LABELS: Record<string, string> = {
    createDesignBoards: 'Tavola creata nel canvas',
    updateCanvasElements: 'Canvas aggiornato',
    clearBoard: 'Tavola svuotata',
    deleteElements: 'Elementi eliminati',
    getCanvasState: 'Canvas letto',
};

function assistantMessageDisplayText(m: UIMessage): string | null {
    const text = m.parts.filter(isTextUIPart).map(p => p.text).join('').trim();
    if (text) return text;
    const toolLines = m.parts
        .filter(isToolUIPart)
        .filter(p => p.state === 'output-available' || p.state === 'input-available')
        .filter(p => getToolName(p) in CANVAS_TOOL_LABELS)  // solo tool canvas, non generateAIImage
        .map(p => {
            const name = getToolName(p);
            return CANVAS_TOOL_LABELS[name];
        });
    if (toolLines.length > 0) return toolLines.join('\n');
    return null;
}

function ProgressMeter({ status }: { status: { target: boolean, tone: boolean, assets: boolean } }) {
    const items = [
        { key: 'target', label: 'TGT', active: status.target },
        { key: 'tone', label: 'TNE', active: status.tone },
        { key: 'assets', label: 'AST', active: status.assets },
    ];

    return (
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-white/[0.03] border border-white/5">
            {items.map(item => (
                <div key={item.key} className="flex items-center gap-1 px-1.5">
                    <div className={cn(
                        "w-1 h-1 rounded-full transition-all duration-700",
                        item.active 
                            ? "bg-accent shadow-[0_0_8px_#7c3aed] scale-110" 
                            : "bg-white/10"
                    )} />
                    <span className={cn(
                        "text-[8px] font-black tracking-tighter transition-colors duration-500",
                        item.active ? "text-white/80" : "text-white/10"
                    )}>
                        {item.label}
                    </span>
                </div>
            ))}
        </div>
    );
}

function StepAccordion({ step, isStreaming }: { step: { agent: string, emoji: string, thought?: string, log?: string, tool?: { name: string, input: string } }, isStreaming?: boolean }) {
    const [isExpanded, setIsExpanded] = useState(true); // Sempre aperto di default per trasparenza

    return (
        <div className="mb-2 border-l border-white/5 pl-3 transition-all duration-500">
            <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center gap-2 py-1 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white/60 transition-all text-left group"
            >
                <span className="opacity-60">{step.emoji}</span>
                <span className="flex-1">{step.agent} <span className="text-[8px] opacity-20 font-normal ml-2">Trace-ID: {Math.random().toString(16).slice(2, 8)}</span></span>
                <ChevronDown className={cn("w-3 h-3 transition-transform duration-300", isExpanded ? "rotate-0" : "-rotate-90 opacity-20")} />
            </button>
            
            <div className={cn(
                "overflow-hidden transition-all duration-500 ease-in-out",
                isExpanded ? "max-h-[2000px] opacity-100 mt-2" : "max-h-0 opacity-0"
            )}>
                <div className="text-[10px] sm:text-[11px] leading-[1.6] font-mono text-white/60 bg-white/[0.02] p-4 rounded-xl border border-white/10 space-y-3 shadow-inner selection:bg-accent/20">
                    {step.thought && (
                        <div className="whitespace-pre-wrap">{step.thought}</div>
                    )}
                    {step.log && (
                        <div className="pt-2 border-t border-white/5 opacity-80 italic italic">
                            <p className="text-[8px] uppercase tracking-tighter mb-1 opacity-40">Reasoning Log (Internal)</p>
                            <div className="whitespace-pre-wrap">{step.log}</div>
                        </div>
                    )}
                    {step.tool && (
                        <div className="flex items-center gap-2 text-accent/50 py-1 px-2 bg-accent/5 rounded border border-accent/10 w-fit">
                            <PenTool className="w-3 h-3" />
                            <span>{step.tool.name}</span>
                            <span className="text-[8px] opacity-60 truncate max-w-[150px]">({step.tool.input})</span>
                        </div>
                    )}
                    {isStreaming && (
                        <div className="flex gap-1 items-center mt-2">
                            <span className="w-1 h-3 bg-accent/40 animate-pulse" />
                            <span className="text-[8px] font-black text-accent/40 uppercase animate-pulse">Processing Stream...</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function ForensicTimeline({ content, isStreaming }: { content: string, isStreaming?: boolean }) {
    const steps = useMemo(() => {
        // Regex più permissiva per catturare blocchi anche se lo stream non è ancora chiuso
        const stepBlocks = content.match(/<agent_step([\s\S]*?)(?:<\/agent_step>|$)/gi) || [];
        return stepBlocks.map(block => {
            const agentMatch = block.match(/agent="(.*?)"/);
            const emojiMatch = block.match(/emoji="(.*?)"/);
            const thoughtMatch = block.match(/\[THOUGHT\]([\s\S]*?)\[\/THOUGHT\]/i);
            const logMatch = block.match(/\[LOG\]([\s\S]*?)\[\/LOG\]/i);
            const toolMatch = block.match(/\[TOOL name="(.*?)"\]([\s\S]*?)\[\/TOOL\]/i);

            return {
                agent: agentMatch?.[1] || "Agente Ignoto",
                emoji: emojiMatch?.[1] || "💭",
                thought: thoughtMatch?.[1]?.trim(),
                log: logMatch?.[1]?.trim(),
                tool: toolMatch ? { name: toolMatch[1], input: toolMatch[2].trim() } : undefined
            };
        });
    }, [content]);

    if (steps.length === 0) return null;

    return (
        <div className="mb-6 animate-in fade-in slide-in-from-top-1 duration-700">
            <div className="flex items-center gap-3 mb-4 opacity-30">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                <span className="text-[9px] font-black uppercase tracking-[0.3em] whitespace-nowrap">Forensic Reasoning Branch</span>
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            </div>
            
            <div className="space-y-1">
                {steps.map((s, i) => (
                    <StepAccordion 
                        key={i} 
                        step={s} 
                        isStreaming={isStreaming && i === steps.length - 1} 
                    />
                ))}
            </div>
        </div>
    );
}

function ThinkingStages() {
    const [stage, setStage] = useState(0);
    const stages = [
        { icon: <Search className="w-3 h-3" />, text: "Analisi del contesto visivo..." },
        { icon: <Library className="w-3 h-3" />, text: "Consultazione Handbook DIC..." },
        { icon: <PenTool className="w-3 h-3" />, text: "Pianificazione bozza creativa..." }
    ];

    useEffect(() => {
        const timer = setInterval(() => {
            setStage(s => (s < stages.length - 1 ? s + 1 : s));
        }, 1500);
        return () => clearInterval(timer);
    }, [stages.length]);

    return (
        <div className="flex flex-col gap-3 p-4 bg-white/[0.02] border border-white/[0.05] rounded-2xl mx-1 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center gap-2 mb-1">
                <Loader2 className="w-3 h-3 animate-spin text-accent" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Inizializzazione Protocollo</span>
            </div>
            <div className="space-y-3">
                {stages.map((s, i) => (
                    <div key={i} className={cn(
                        "flex items-center gap-3 transition-all duration-500",
                        i <= stage ? "opacity-100" : "opacity-10"
                    )}>
                        <div className={cn(
                            "w-6 h-6 rounded-lg flex items-center justify-center border transition-all",
                            i === stage ? "bg-accent/20 border-accent/40 text-accent" : 
                            i < stage ? "bg-white/5 border-white/10 text-white/40" : "bg-transparent border-white/5 text-white/10"
                        )}>
                            {s.icon}
                        </div>
                        <span className={cn(
                            "text-[11px] font-medium tracking-wide",
                            i === stage ? "text-white animate-pulse" : "text-white/30"
                        )}>
                            {s.text}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

function QuizBadge({ label, active }: { label: string; active: boolean }) {
    return (
        <div className={cn(
            "flex items-center gap-1 text-[8px] font-black uppercase tracking-widest",
            active ? "text-accent" : "text-white/10"
        )}>
            {active ? <CheckCircle2 className="w-2 h-2" /> : <Circle className="w-2 h-2" />}
            {label}
        </div>
    )
}

function GenerativeUI({ data }: { data: any }) {
    if (data.type === 'client_card') {
        return (
            <div className="p-3 bg-white/5 rounded-lg border border-white/10 space-y-2">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold">
                        {data.name?.[0]}
                    </div>
                    <div>
                        <p className="text-xs font-bold text-white">{data.name}</p>
                        <p className="text-[10px] text-white/40">{data.sector}</p>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 bg-black/20 rounded border border-white/5">
                        <p className="text-[8px] uppercase text-white/30">Progetti</p>
                        <p className="text-xs font-mono">{data.projectsCount || 0}</p>
                    </div>
                    <div className="p-2 bg-black/20 rounded border border-white/5">
                        <p className="text-[8px] uppercase text-white/30">Status</p>
                        <p className="text-xs font-mono text-accent">{data.status || 'Active'}</p>
                    </div>
                </div>
            </div>
        )
    }
    if (data.type === 'design_audit') {
        return (
            <div className="p-3 bg-black/40 rounded-lg border border-white/10 space-y-3">
                <div className="flex items-center gap-2">
                    <div className={cn(
                        "w-2 h-2 rounded-full animate-pulse",
                        data.isValid ? "bg-green-500 shadow-[0_0_8px_#22c55e]" : "bg-yellow-500 shadow-[0_0_8px_#eab308]"
                    )} />
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/60">Design Audit Report</p>
                </div>
                <div className="space-y-1.5">
                    {data.issues?.map((issue: string, i: number) => (
                        <div key={i} className="flex gap-2 text-[11px] leading-relaxed text-white/80">
                            <span className="text-accent">•</span>
                            <p>{issue}</p>
                        </div>
                    ))}
                </div>
                <div className="pt-2 border-t border-white/5">
                    <p className="text-[10px] italic text-accent/80">{data.recommendation}</p>
                </div>
            </div>
        )
    }
    return <p className="text-xs italic text-white/40">Componente UI non supportato</p>
}

// Canvas tools are client-side (no execute on the server). Their UI state is
// 'input-available' (not 'output-available') so they need a dedicated check.
const CANVAS_TOOLS = new Set(['createDesignBoards', 'updateCanvasElements', 'clearBoard', 'deleteElements', 'getCanvasState']);

function QuickActions({ lastMessage, onAction, disabled, inputRef }: { 
    lastMessage?: UIMessage, 
    onAction: (text: string) => void,
    disabled: boolean,
    inputRef: React.RefObject<HTMLInputElement>
}) {
    const options = useMemo(() => {
        if (!lastMessage || lastMessage.role !== 'assistant') return [];
        const text = lastMessage.parts.filter(isTextUIPart).map(p => p.text).join(' ');
        const matches = text.match(/\[(.*?)\]/g);
        if (!matches) return [];
        return matches.map(m => m.slice(1, -1)).filter(m => m.length < 30);
    }, [lastMessage]);

    const showDefaultVai = !disabled && (!options || options.length === 0);

    return (
        <div className="flex flex-wrap gap-2 mb-3 px-1 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {showDefaultVai && (
                <button
                    onClick={() => onAction('vai')}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-accent/10 border border-accent/20 text-accent text-[10px] font-black uppercase tracking-widest hover:bg-accent hover:text-white transition-all shadow-[0_0_15px_rgba(124,58,237,0.2)]"
                >
                    <Sparkles className="w-3 h-3" /> Procedi (Vai)
                </button>
            )}
            
            {options.map((opt, i) => (
                <button
                    key={i}
                    onClick={() => onAction(opt)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white/60 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all"
                >
                    <CheckCircle2 className="w-3 h-3 text-accent/60" /> {opt}
                </button>
            ))}

            {!disabled && (
                <button
                    onClick={() => inputRef.current?.focus()}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.02] border border-dashed border-white/10 text-white/20 text-[10px] font-black uppercase tracking-widest hover:text-white/40 hover:border-white/20 transition-all"
                >
                    <Plus className="w-3 h-3" /> Altro...
                </button>
            )}
        </div>
    );
}

export function AIChatWidget() {
    const router = useRouter();
    const { pushAiCommand, canvasSnapshot } = useSidebar();
    const { clients, selectedClientId } = useApp();
    const { sessions, activeSessionId, createSession, addMessage, setActiveSession, deleteSession } = useChatStore();

    // ── Stato UI ──────────────────────────────────────────────────────────────
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [quizProgress, setQuizProgress] = useState({ target: true, tone: false, assets: false });

    // ── Stato contesto ────────────────────────────────────────────────────────
    const [clientSetting, setClientSetting] = useState<ClientSetting>('auto')
    const [extraFiles, setExtraFiles] = useState<ExtraVaultFile[]>([])
    const [clientPickerOpen, setClientPickerOpen] = useState(false)
    const [filePicker, setFilePicker] = useState(false)
    const [vaultFiles, setVaultFiles] = useState<VaultFile[]>([])
    const [vaultLoading, setVaultLoading] = useState(false)
    const [vaultSearch, setVaultSearch] = useState('')
    const [editingNoteIdx, setEditingNoteIdx] = useState<number | null>(null)

    // Client effettivo da usare (risolto da 'auto' a oggetto reale)
    const resolvedClient = useMemo(() => {
        if (clientSetting === 'auto') return clients.find(x => x.id === selectedClientId) ?? null
        if (clientSetting === null) return null
        return clientSetting
    }, [clientSetting, clients, selectedClientId])

    // Carica messaggi della sessione attiva
    const activeSession = useMemo(() => 
        sessions.find(s => s.id === activeSessionId), 
    [sessions, activeSessionId]);

    const initialMessages: UIMessage[] = useMemo(() => {
        if (!activeSession) return [];
        return activeSession.messages.map(m => ({
            id: m.id,
            role: m.role,
            content: m.content,
            parts: [{ type: 'text', text: m.content }]
        }));
    }, [activeSession]);

    // Inizializza sessione se vuota
    useEffect(() => {
        if (sessions.length === 0) {
            createSession('Nuova Idea Creativa');
        } else if (!activeSessionId) {
            setActiveSession(sessions[0].id);
        }
    }, [sessions, activeSessionId, createSession, setActiveSession]);

    // Apre il file picker e carica la lista vault
    const openFilePicker = async () => {
        setFilePicker(p => !p)
        if (vaultFiles.length > 0) return
        setVaultLoading(true)
        try {
            const res = await fetch('/api/vault/files?recursive=true')
            if (res.ok) {
                const data = await res.json()
                setVaultFiles(data.files ?? [])
            }
        } catch { /* vault non configurato */ }
        finally { setVaultLoading(false) }
    }

    const addVaultFile = (f: VaultFile) => {
        if (extraFiles.some(e => e.path === f.relativePath)) return
        setExtraFiles(prev => [...prev, { path: f.relativePath, name: f.name, note: '' }])
        setFilePicker(false)
        setVaultSearch('')
    }

    const removeVaultFile = (path: string) => setExtraFiles(prev => prev.filter(e => e.path !== path))
    const updateNote = (idx: number, note: string) =>
        setExtraFiles(prev => prev.map((e, i) => i === idx ? { ...e, note } : e))

    const clearContext = () => { setClientSetting('auto'); setExtraFiles([]) }

    const [selectedModel, setSelectedModel] = useState<ModelId>('gemini');
    const [input, setInput] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    const [lastEngineReport, setLastEngineReport] = useState<{ id: string, items: string[] } | null>(null);

    useEffect(() => {
        const handler = (e: Event) => {
            const detail = (e as CustomEvent).detail;
            if (detail?.report) {
                setLastEngineReport({ id: Date.now().toString(), items: detail.report });
            }
        };
        window.addEventListener('cervello:layout-report', handler);
        return () => window.removeEventListener('cervello:layout-report', handler);
    }, []);

    const transport = useMemo(
        () =>
            new DefaultChatTransport({
                api: '/api/ai',
                body: { 
                    modelId: selectedModel,
                    sessionId: activeSessionId 
                },
            }),
        [selectedModel, activeSessionId],
    );

    // Calcola clientOverride da mandare al server
    const clientOverrideValue: string | null | undefined = useMemo(() => {
        if (clientSetting === 'auto') return undefined          // default: auto-detect
        if (clientSetting === null) return 'none'               // esplicito: nessuno
        return clientSetting.name                               // esplicito: nome cliente
    }, [clientSetting])

    const onFinish = useCallback(
        ({ message }: { message: UIMessage }) => {
            // Salva nel ChatStore locale
            if (activeSessionId) {
                addMessage(activeSessionId, {
                    role: 'assistant',
                    content: assistantMessageDisplayText(message) || ''
                });
            }

            for (const part of message.parts) {
                if (!isToolUIPart(part)) continue;
                const toolName = getToolName(part);

                if (CANVAS_TOOLS.has(toolName) && (part.state === 'input-available' || part.state === 'output-available')) {
                    pushAiCommand({
                        toolName,
                        result: undefined,
                        args: part.input as Record<string, unknown> | undefined,
                        timestamp: Date.now(),
                    });
                }
            }
            router.refresh();
        },
        [router, pushAiCommand, activeSessionId, addMessage],
    );

    const { messages, status, sendMessage, setMessages, error, stop, reload } = useChat({
        transport,
        initialMessages,
        onFinish,
    });

    // Sincronizza messaggi AI con lo store quando cambiano
    useEffect(() => {
        if (activeSessionId && messages.length > initialMessages.length) {
            // Qui potremmo voler sincronizzare in modo più fine, 
            // ma onFinish copre l'assistant. User message lo salviamo nel submit.
        }
    }, [messages, activeSessionId, initialMessages.length]);

    const isLoading = status === 'submitted' || status === 'streaming';

    // Watchdog: se bloccato oltre 60s, sblocca automaticamente
    const loadingStartRef = useRef<number | null>(null)
    useEffect(() => {
        if (isLoading) {
            loadingStartRef.current = Date.now()
        } else {
            loadingStartRef.current = null
        }
    }, [isLoading])

    // Escape per annullare
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isLoading) stop()
        }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [isLoading, stop])

    const handleManualSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        // Salva l'utente nello store
        if (activeSessionId) {
            addMessage(activeSessionId, {
                role: 'user',
                content: input
            });
        }

        // Prefisso visibile nella chat (verrà rimosso in display)
        const prefixParts: string[] = [];
        if (resolvedClient) prefixParts.push(`[Soggetto: ${resolvedClient.name}]`);
        if (extraFiles.length > 0) prefixParts.push(`[File: ${extraFiles.map(f => f.name).join(', ')}]`);
        const textToSend = prefixParts.length > 0
            ? `${prefixParts.join(' ')}\n${input}`
            : input;

        setInput('');
        await sendMessage(
            { text: textToSend },
            {
                body: {
                    modelId: selectedModel,
                    canvasSnapshot: canvasSnapshot ?? undefined,
                    clientOverride: clientOverrideValue,
                    extraVaultFiles: extraFiles.map(f => ({ path: f.path, note: f.note || undefined })),
                    sessionId: activeSessionId
                }
            }
        );
    };

    const handleReset = () => {
        if (confirm('Vuoi resettare la conversazione?')) {
            setMessages([]);
        }
    };

    const messagesEndRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const filteredVaultFiles = vaultFiles.filter(f =>
        f.name.toLowerCase().includes(vaultSearch.toLowerCase())
    )

    const hasContextOverride = clientSetting !== 'auto' || extraFiles.length > 0

    return (
        <div className="relative flex h-full overflow-hidden rounded-2xl border border-white/10 bg-[#090909]/40 backdrop-blur-md shadow-2xl">
            
            {/* ── Sidebar History ── */}
            <div className={cn(
                "absolute inset-y-0 left-0 z-50 w-64 bg-[#0a0a0c] border-r border-white/10 transition-transform duration-300 ease-in-out transform",
                isHistoryOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <div className="p-4 border-b border-white/10 flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Cronologia Chat</span>
                    <button onClick={() => setIsHistoryOpen(false)} className="p-1 hover:bg-white/5 rounded">
                        <X className="w-4 h-4 text-white/30" />
                    </button>
                </div>
                <div className="p-3 space-y-1 overflow-y-auto h-full pb-20 scrollbar-hide">
                    <button 
                        onClick={() => createSession('Nuova Idea ' + (sessions.length + 1))}
                        className="w-full flex items-center gap-2 p-3 mb-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all group"
                    >
                        <Plus className="w-4 h-4 text-accent" />
                        <span className="text-[11px] font-bold text-white/80">Nuova Sessione</span>
                    </button>
                    {sessions.map(s => (
                        <div key={s.id} className="group relative">
                            <button
                                onClick={() => { setActiveSession(s.id); setIsHistoryOpen(false); }}
                                className={cn(
                                    "w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all",
                                    activeSessionId === s.id ? "bg-accent/20 border border-accent/20 text-white" : "hover:bg-white/5 text-white/40"
                                )}
                            >
                                <MessageSquare className={cn("w-3.5 h-3.5", activeSessionId === s.id ? "text-accent" : "text-white/20")} />
                                <span className="text-[11px] font-medium truncate flex-1 text-left">{s.title}</span>
                            </button>
                            <button 
                                onClick={(e) => { e.stopPropagation(); deleteSession(s.id); }}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all"
                            >
                                <Trash2 className="w-3 h-3" />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex-1 flex flex-col min-w-0">
                {/* ── Header ── */}
                <div className="px-4 py-3 border-b border-white/[0.06] bg-white/[0.02] flex items-center gap-3">
                    <button 
                        onClick={() => setIsHistoryOpen(true)}
                        className="p-1.5 rounded-lg text-white/20 hover:text-white/60 hover:bg-white/5 transition-all"
                    >
                        <History className="w-4 h-4" />
                    </button>
                    
                    <div className="flex-1 flex flex-col">
                        <div className="flex items-center gap-3">
                            <span className="text-[10px] font-black tracking-[0.2em] uppercase text-white/30">Creative Nexus v3.0</span>
                            <ProgressMeter status={{ 
                                target: messages.some(m => {
                                    const c = (m.content || '').toLowerCase();
                                    return c.includes('target') || c.includes('pubblico') || c.includes('soggetto') || c.includes('cliente') || c.includes('destinatari');
                                }), 
                                tone: messages.some(m => {
                                    const c = (m.content || '').toLowerCase();
                                    return c.includes('tono') || c.includes('vibe') || c.includes('mood') || c.includes('atmosfera') || c.includes('stile');
                                }), 
                                assets: messages.some(m => {
                                    const c = (m.content || '').toLowerCase();
                                    return c.includes('asset') || c.includes('logo') || c.includes('immagine') || c.includes('font') || c.includes('colori');
                                })
                            }} />
                        </div>
                        <p className="text-[9px] text-white/10 font-bold truncate uppercase tracking-widest leading-none mt-1.5 opacity-60">
                            {activeSession?.title || 'Generazione in corso...'}
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-0.5 bg-white/[0.03] rounded-lg p-0.5 border border-white/10 backdrop-blur-sm">
                            {(['gemini', 'claude'] as ModelId[]).map(m => (
                                <button key={m} onClick={() => setSelectedModel(m)} className={cn(
                                    "px-3 py-1 rounded-md text-[9px] font-black tracking-widest transition-all",
                                    selectedModel === m
                                        ? "bg-accent/80 text-white shadow-[0_0_15px_rgba(124,58,237,0.4)]"
                                        : "text-white/20 hover:text-white/40"
                                )}>
                                    {m.toUpperCase()}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

            {/* ── Barra Contesto ── */}
            <div className="relative px-3 py-2 border-b border-white/[0.06] bg-black/20 flex flex-wrap items-center gap-1.5">

                {/* Chip cliente */}
                <div className="relative">
                    <button
                        onClick={() => setClientPickerOpen(p => !p)}
                        className={cn(
                            "flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-[10px] font-bold transition-all",
                            resolvedClient
                                ? "bg-violet-500/10 border-violet-500/20 text-violet-300"
                                : clientSetting === null
                                    ? "bg-white/[0.04] border-white/10 text-white/30"
                                    : "bg-white/[0.03] border-white/[0.08] text-white/20 hover:text-white/40"
                        )}
                    >
                        <User className="w-3 h-3 flex-shrink-0" />
                        <span className="max-w-[120px] truncate">
                            {resolvedClient
                                ? resolvedClient.name
                                : clientSetting === null
                                    ? 'Nessun cliente'
                                    : 'Nessun cliente'
                            }
                        </span>
                        {clientSetting === 'auto' && resolvedClient && (
                            <span className="text-[8px] text-violet-400/50 font-mono">auto</span>
                        )}
                        <ChevronDown className={cn("w-3 h-3 text-white/20 transition-transform", clientPickerOpen && "rotate-180")} />
                    </button>

                    {/* Dropdown clienti */}
                    {clientPickerOpen && (
                        <div className="absolute top-full left-0 mt-1 z-50 bg-[#111115] border border-white/10 rounded-2xl py-1 min-w-[180px] shadow-2xl overflow-hidden">
                            {/* Nessun cliente */}
                            <button
                                onClick={() => { setClientSetting(null); setClientPickerOpen(false) }}
                                className={cn(
                                    "w-full flex items-center gap-2 px-3 py-2 text-[11px] text-left transition-all hover:bg-white/[0.04]",
                                    clientSetting === null ? "text-white/70 bg-white/[0.04]" : "text-white/30"
                                )}
                            >
                                <div className="w-1.5 h-1.5 rounded-full bg-white/15 flex-shrink-0" />
                                Nessun cliente
                            </button>
                            <div className="h-px bg-white/[0.04] my-1" />
                            {clients.map(c => (
                                <button
                                    key={c.id}
                                    onClick={() => { setClientSetting({ id: c.id, name: c.name }); setClientPickerOpen(false) }}
                                    className={cn(
                                        "w-full flex items-center gap-2 px-3 py-2 text-[11px] text-left transition-all hover:bg-white/[0.04]",
                                        resolvedClient?.id === c.id ? "text-violet-300 bg-violet-500/5" : "text-white/60"
                                    )}
                                >
                                    <div className={cn(
                                        "w-1.5 h-1.5 rounded-full flex-shrink-0",
                                        resolvedClient?.id === c.id ? "bg-violet-400" : "bg-white/15"
                                    )} />
                                    {c.name}
                                </button>
                            ))}
                            {clientSetting !== 'auto' && (
                                <>
                                    <div className="h-px bg-white/[0.04] my-1" />
                                    <button
                                        onClick={() => { setClientSetting('auto'); setClientPickerOpen(false) }}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-[10px] text-left text-white/20 hover:text-white/40 transition-all"
                                    >
                                        <span className="font-mono text-[8px]">⚡</span> Ripristina auto
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* Chips file vault selezionati */}
                {extraFiles.map((f, idx) => (
                    <div key={f.path} className="flex items-center gap-1 bg-sky-500/10 border border-sky-500/20 rounded-xl px-2 py-1">
                        <FileText className="w-3 h-3 text-sky-400/60 flex-shrink-0" />
                        <button
                            onClick={() => setEditingNoteIdx(editingNoteIdx === idx ? null : idx)}
                            className="text-[10px] text-sky-300/70 max-w-[80px] truncate hover:text-sky-300 transition-all"
                            title={f.note || 'Clicca per aggiungere nota'}
                        >
                            {f.name.replace('.md', '')}
                        </button>
                        <button onClick={() => removeVaultFile(f.path)} className="text-sky-500/40 hover:text-sky-400 transition-all ml-0.5">
                            <X className="w-2.5 h-2.5" />
                        </button>
                    </div>
                ))}

                {/* Nota file (espansibile inline) */}
                {editingNoteIdx !== null && extraFiles[editingNoteIdx] && (
                    <div className="w-full mt-1">
                        <input
                            autoFocus
                            value={extraFiles[editingNoteIdx].note}
                            onChange={e => updateNote(editingNoteIdx, e.target.value)}
                            onBlur={() => setEditingNoteIdx(null)}
                            onKeyDown={e => e.key === 'Enter' && setEditingNoteIdx(null)}
                            placeholder={`Come usare "${extraFiles[editingNoteIdx].name}"? (es. usa per lo stile tipografico)`}
                            className="w-full bg-sky-500/5 border border-sky-500/15 rounded-xl px-3 py-1.5 text-[11px] text-sky-300/70 placeholder:text-white/15 focus:outline-none focus:border-sky-500/30 transition-all"
                        />
                    </div>
                )}

                {/* Bottone aggiungi file vault */}
                <div className="relative">
                    <button
                        onClick={openFilePicker}
                        className="flex items-center gap-1 px-2 py-1 rounded-xl border border-dashed border-white/10 text-[10px] text-white/20 hover:text-sky-400 hover:border-sky-500/30 transition-all"
                    >
                        {vaultLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <FolderOpen className="w-3 h-3" />}
                        vault
                    </button>

                    {/* Dropdown file vault */}
                    {filePicker && (
                        <div className="absolute top-full left-0 mt-1 z-50 bg-[#111115] border border-white/10 rounded-2xl p-2 w-64 shadow-2xl">
                            <input
                                autoFocus
                                value={vaultSearch}
                                onChange={e => setVaultSearch(e.target.value)}
                                placeholder="Cerca file .md..."
                                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-3 py-1.5 text-[11px] text-white/60 placeholder:text-white/20 focus:outline-none focus:border-sky-500/30 transition-all mb-2"
                            />
                            {vaultLoading ? (
                                <div className="flex items-center justify-center py-4">
                                    <Loader2 className="w-4 h-4 animate-spin text-white/20" />
                                </div>
                            ) : filteredVaultFiles.length === 0 ? (
                                <p className="text-[10px] text-white/15 italic text-center py-3">
                                    {vaultFiles.length === 0 ? 'Vault non configurato' : 'Nessun file trovato'}
                                </p>
                            ) : (
                                <div className="max-h-48 overflow-y-auto space-y-0.5 scrollbar-hide">
                                    {filteredVaultFiles.map(f => (
                                        <button
                                            key={f.relativePath}
                                            onClick={() => addVaultFile(f)}
                                            className={cn(
                                                "w-full flex items-center gap-2 px-2 py-1.5 rounded-xl text-left text-[11px] transition-all hover:bg-white/[0.04]",
                                                extraFiles.some(e => e.path === f.relativePath)
                                                    ? "text-sky-400/60 cursor-default"
                                                    : "text-white/50 hover:text-white/80"
                                            )}
                                        >
                                            <FileText className="w-3 h-3 flex-shrink-0 opacity-40" />
                                            <span className="truncate">{f.name}</span>
                                            {extraFiles.some(e => e.path === f.relativePath) && (
                                                <span className="text-[8px] text-sky-400/40 ml-auto">✓</span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Bottone clear */}
                {hasContextOverride && (
                    <button
                        onClick={clearContext}
                        className="ml-auto text-[9px] text-white/15 hover:text-white/40 transition-all flex items-center gap-1"
                        title="Ripristina contesto automatico"
                    >
                        <X className="w-3 h-3" /> reset
                    </button>
                )}
            </div>

            {/* ── Messaggi ── */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
                {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center text-white/30 text-xs space-y-4">
                        <Bot className="w-8 h-8 opacity-20" />
                        <p className="max-w-[200px] leading-relaxed italic">
                            {resolvedClient
                                ? `Contesto: ${resolvedClient.name}. Come posso aiutarti?`
                                : 'Scrivi direttamente, oppure seleziona un cliente o file vault dal pannello sopra.'
                            }
                        </p>
                    </div>
                ) : (
                    messages.map(m => {
                        const rawText = m.role === 'user' ? userMessageDisplayText(m) : assistantMessageDisplayText(m);
                        if (!rawText) return null;

                        // Parsing per separare i ragionalmenti degli agenti dall'output finale
                        let reasoningContent = '';
                        let finalContent = rawText;

                        // Cerchiamo tutti i blocchi <agent_step>... (nuova logica v3.8)
                        const reasoningRegex = /<agent_step[\s\S]*?<\/agent_step>/gi;
                        const reasoningMatches = rawText.match(reasoningRegex);
                        
                        if (reasoningMatches) {
                            reasoningContent = reasoningMatches.join('\n');
                            finalContent = rawText.replace(reasoningRegex, '').trim();
                        } else {
                            // Fallback per vecchi thought (se presenti)
                            const thoughtMatch = rawText.match(/<thought>([\s\S]*?)(?:<\/thought>|$)/i);
                            if (thoughtMatch) {
                                reasoningContent = `<agent_step agent="Cognitive Engine" emoji="🧠">[THOUGHT]\n${thoughtMatch[1]}\n[/THOUGHT]</agent_step>`;
                                finalContent = rawText.replace(/<thought>([\s\S]*?)(?:<\/thought>|$)/i, '').trim();
                            }
                        }

                        const isCurrentlyStreamingThought = status === 'streaming' && m.id === messages[messages.length - 1].id && rawText.includes('<agent_step>') && !rawText.includes('</agent_step>');

                        const isLastAssistant = m.role === 'assistant' && m.id === messages[messages.length - 1].id;
                        const isStreaming = status === 'streaming' && isLastAssistant;

                        return (
                            <div key={m.id} className={cn(
                                "flex gap-3 w-full animate-in fade-in slide-in-from-bottom-2 duration-500",
                                m.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                            )}>
                                <div className={cn(
                                    "max-w-[92%] flex flex-col gap-2",
                                    m.role === 'user' ? "items-end" : "items-start"
                                )}>
                                    {/* User Message - Bold & Compact */}
                                    {m.role === 'user' && (
                                        <div className="rounded-2xl px-4 py-2.5 bg-accent/15 border border-accent/20 text-white shadow-[0_4px_12px_-4px_rgba(124,58,237,0.2)]">
                                            <p className="text-[13px] font-semibold leading-relaxed tracking-tight">{finalContent}</p>
                                        </div>
                                    )}

                                    {/* Assistant - Multi-Layered Forge UI */}
                                    {m.role === 'assistant' && (
                                        <div className="w-full space-y-3">
                                            {reasoningContent && (
                                                <ForensicTimeline content={reasoningContent} isStreaming={isStreaming && (rawText.includes('<agent_step>') && !rawText.includes('</agent_step>'))} />
                                            )}
                                            
                                            {/* Azioni in corso (Visual Tools Indicator) */}
                                            {isStreaming && !rawText.includes('</thought>') && (
                                                <div className="flex items-center gap-2 pl-2 opacity-40">
                                                    <Loader2 className="w-2.5 h-2.5 animate-spin text-accent" />
                                                    <span className="text-[9px] font-black uppercase tracking-[0.1em] text-white">Analisi spettrale...</span>
                                                </div>
                                            )}

                                            {finalContent && (
                                                <div className={cn(
                                                    "relative overflow-hidden rounded-2xl px-5 py-4 border transition-all duration-700",
                                                    isStreaming ? "bg-white/[0.03] border-white/5" : "bg-white/[0.05] border-white/10 shadow-2xl"
                                                )}>
                                                    {/* Background Glow */}
                                                    <div className="absolute -top-24 -left-24 w-48 h-48 bg-accent/5 rounded-full blur-[80px] pointer-events-none" />
                                                    
                                                    {m.role === 'assistant' && finalContent.includes('{"type":') ? (
                                                        <GenerativeUI data={JSON.parse(finalContent.match(/\{.*\}/)?.[0] || '{}')} />
                                                    ) : (
                                                        <div className="relative z-10 prose prose-invert max-w-none">
                                                            <p className="text-[13px] leading-[1.7] text-white/95 font-medium selection:bg-accent/40 whitespace-pre-wrap">
                                                                {finalContent}
                                                            </p>
                                                        </div>
                                                    )}

                                                    {isStreaming && (
                                                        <div className="mt-4 flex gap-1 items-center">
                                                            <div className="w-1 h-1 rounded-full bg-accent animate-bounce" style={{ animationDelay: '0ms' }} />
                                                            <div className="w-1 h-1 rounded-full bg-accent animate-bounce" style={{ animationDelay: '150ms' }} />
                                                            <div className="w-1 h-1 rounded-full bg-accent animate-bounce" style={{ animationDelay: '300ms' }} />
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}

                {status === 'submitted' && <ThinkingStages />}

                {lastEngineReport && (
                    <div key={lastEngineReport.id} className="flex flex-col gap-2 border-l-2 border-accent/30 pl-4 py-2 my-2 bg-accent/5 rounded-r-lg">
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-3 h-3 text-accent" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-accent/80">Artistic Brain • Correzione Layout</span>
                        </div>
                        <ul className="space-y-1">
                            {lastEngineReport.items.map((item, i) => (
                                <li key={i} className="text-[11px] text-white/60 leading-tight flex gap-2">
                                    <span className="text-accent/40">•</span>{item}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {error && (
                    <div className="flex flex-col gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl mx-1 animate-in fade-in zoom-in duration-300">
                        <div className="flex items-center gap-2 text-red-400">
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Errore di Sistema</span>
                        </div>
                        <p className="text-[11px] text-red-400/80 leading-relaxed font-medium">
                            {error.message.includes('demand') 
                                ? "Il modello è sovraccarico. Prova a cambiare modello in alto o riprova tra pochi secondi."
                                : error.message
                            }
                        </p>
                        <button 
                            onClick={() => {
                                if (typeof reload === 'function') {
                                    reload();
                                } else {
                                    const lastUserMsg = messages.filter(m => m.role === 'user').pop();
                                    if (lastUserMsg) sendMessage(lastUserMsg.content);
                                }
                            }}
                            className="w-fit mt-1 px-3 py-1.5 rounded-lg bg-red-400/10 hover:bg-red-400/20 text-red-400 text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2"
                        >
                            <RefreshCw className="w-3 h-3" /> Riprova ora
                        </button>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* ── Input ── */}
            <div className="p-3 border-t border-white/[0.06] bg-white/[0.02]">
                {!isLoading && messages.length > 0 && (
                    <QuickActions 
                        lastMessage={messages[messages.length - 1]} 
                        onAction={(txt) => {
                            setInput(txt);
                            setTimeout(() => {
                                const form = document.getElementById('chat-form') as HTMLFormElement;
                                form?.requestSubmit();
                            }, 10);
                        }}
                        disabled={isLoading}
                        inputRef={inputRef}
                    />
                )}
                <form id="chat-form" onSubmit={handleManualSubmit} className="flex gap-2 bg-black/20 rounded-xl p-1 border border-white/[0.06]">
                    <Input
                        ref={inputRef}
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        placeholder={isLoading ? 'Premi Esc per annullare...' : resolvedClient ? `Chiedi per ${resolvedClient.name}...` : 'Scrivi un comando...'}
                        className="flex-1 bg-transparent border-none text-white placeholder:text-white/20 focus-visible:ring-0 text-xs h-9"
                        disabled={isLoading}
                    />
                    {isLoading ? (
                        <button
                            type="button"
                            onClick={() => stop()}
                            title="Annulla (Esc)"
                            className="rounded-lg bg-red-500/10 hover:bg-red-500/25 border border-red-500/20 text-red-400/70 hover:text-red-400 transition-all h-9 w-9 p-0 flex items-center justify-center flex-shrink-0"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    ) : (
                        <Button type="submit" size="sm"
                            className="rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all h-9 w-9 p-0"
                        >
                            <Send className="w-4 h-4" />
                        </Button>
                    )}
                </form>
            </div>
            </div>
        </div>
    );
}
