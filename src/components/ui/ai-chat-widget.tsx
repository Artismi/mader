'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, getToolName, isTextUIPart, isToolUIPart, type UIMessage } from 'ai';
import { Input } from "@/components/ui/input";
import { Send, Bot, Sparkles, Trash2 } from "lucide-react";
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { cn } from "@/lib/utils";
import { useSidebar } from '@/components/layout/SidebarContext';
import { useApp } from '@/components/layout/AppContext';

type ModelId = 'claude' | 'gemini';

interface ActiveContext {
    clientId?: string
    clientName?: string
    files: { id: string; name: string; webViewLink: string; instructions: string; source?: string }[]
}

function userMessageDisplayText(m: UIMessage): string {
    const raw = m.parts.filter(isTextUIPart).map(p => p.text).join('');
    return m.role === 'user'
        ? raw.replace(/^\[Soggetto: .+?\]( \[File attivi: .+?\])?\n/, '')
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
                        <p className="text-xs text-accent">Attivo</p>
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

export function AIChatWidget() {
    const router = useRouter();
    const { pushAiCommand, canvasSnapshot } = useSidebar();
    const { clients, selectedClientId } = useApp();
    const context = useMemo<ActiveContext>(() => {
        const c = clients.find(x => x.id === selectedClientId);
        return {
            clientId: c?.id,
            clientName: c?.name,
            files: [],
        };
    }, [clients, selectedClientId]);
    const [selectedModel, setSelectedModel] = useState<ModelId>('claude');
    const [input, setInput] = useState('');
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
                body: { modelId: selectedModel },
            }),
        [selectedModel],
    );

    const onFinish = useCallback(
        ({ message }: { message: UIMessage }) => {
            for (const part of message.parts) {
                if (!isToolUIPart(part)) continue;
                const toolName = getToolName(part);

                if (CANVAS_TOOLS.has(toolName) && (part.state === 'input-available' || part.state === 'output-available')) {
                    // Push to the sequence queue to allow multiple commands in one turn
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
        [router, pushAiCommand],
    );

    const { messages, status, sendMessage, setMessages, error } = useChat({
        transport,
        onFinish,
    });

    const isLoading = status === 'submitted' || status === 'streaming';

    const handleManualSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        let textToSend = input;
        const contextParts: string[] = [];
        if (context.clientName) contextParts.push(`[Soggetto: ${context.clientName}]`);
        if (context.files.length > 0) {
            contextParts.push(`[File attivi: ${context.files.map(f =>
                f.instructions ? `${f.name} (${f.instructions})` : f.name
            ).join(', ')}]`);
        }
        if (contextParts.length > 0) {
            textToSend = `${contextParts.join(' ')}\n${input}`;
        }

        setInput('');
        await sendMessage({ text: textToSend }, { body: { modelId: selectedModel, canvasSnapshot: canvasSnapshot ?? undefined } });
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

    return (
        <div className="glass-card flex flex-col h-full overflow-hidden rounded-2xl border-white/10 bg-[#090909]/40 backdrop-blur-md">
            {/* Header */}
            <div className="p-4 border-b border-white/10 bg-white/5 flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-accent animate-pulse shadow-[0_0_10px_rgba(124,58,237,0.8)]" />
                <span className="text-xs font-black tracking-widest uppercase text-white/50 flex-1">Co-Pilot</span>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={handleReset}
                        className="p-1.5 rounded-lg text-white/20 hover:text-white hover:bg-white/5 transition-all"
                        title="Reset Chat"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <div className="flex items-center gap-1 bg-black/30 rounded-lg p-0.5 border border-white/10">
                        <button
                            onClick={() => setSelectedModel('claude')}
                            className={cn(
                                "px-2 py-1 rounded-md text-[10px] font-bold tracking-wide transition-all",
                                selectedModel === 'claude'
                                    ? "bg-accent/30 text-accent border border-accent/30"
                                    : "text-white/30 hover:text-white/60"
                            )}
                        >
                            Claude
                        </button>
                        <button
                            onClick={() => setSelectedModel('gemini')}
                            className={cn(
                                "px-2 py-1 rounded-md text-[10px] font-bold tracking-wide transition-all",
                                selectedModel === 'gemini'
                                    ? "bg-blue-500/30 text-blue-400 border border-blue-500/30"
                                    : "text-white/30 hover:text-white/60"
                            )}
                        >
                            Gemini
                        </button>
                    </div>
                </div>
            </div>

            {/* Context Header (Now managed by Global Assembler) */}
            <div className="px-4 py-2 border-b border-white/[0.06] bg-accent/5 flex items-center justify-between">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-accent/60">Contesto Cablato in Rete</p>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
                {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center text-white/30 text-xs space-y-4">
                        <Bot className="w-8 h-8 opacity-20" />
                        <p className="max-w-[200px] leading-relaxed italic">
                            {context.clientName
                                ? `Contesto: ${context.clientName}. Come posso aiutarti?`
                                : 'Seleziona un cliente dall’app o scrivi direttamente.'
                            }
                        </p>
                    </div>
                ) : (
                    messages.map(m => {
                        const displayText =
                            m.role === 'user' ? userMessageDisplayText(m) : assistantMessageDisplayText(m);
                        if (!displayText) return null;
                        return (
                            <div key={m.id} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                <div className={cn(
                                    "rounded-xl px-4 py-2 max-w-[85%] text-sm shadow-sm",
                                    m.role === 'user'
                                        ? "bg-accent/20 text-white rounded-tr-none border border-accent/20"
                                        : "bg-white/5 border border-white/10 text-white/80 rounded-tl-none"
                                )}>
                                    {m.role === 'assistant' && displayText.includes('{"type":') ? (
                                        <GenerativeUI data={JSON.parse(displayText.match(/\{.*\}/)?.[0] || '{}')} />
                                    ) : (
                                        <p className="whitespace-pre-wrap">{displayText}</p>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}

                {/* Engine Reports (Artistic Brain Phase 2) - Only show latest */}
                {lastEngineReport && (
                    <div key={lastEngineReport.id} className="flex flex-col gap-2 border-l-2 border-accent/30 pl-4 py-2 my-2 bg-accent/5 rounded-r-lg">
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-3 h-3 text-accent" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-accent/80">Artistic Brain • Correzione Layout</span>
                        </div>
                        <ul className="space-y-1">
                            {lastEngineReport.items.map((item, i) => (
                                <li key={i} className="text-[11px] text-white/60 leading-tight flex gap-2">
                                    <span className="text-accent/40">•</span>
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {error && (
                    <p className="text-xs text-red-400/90 px-1">{error.message}</p>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-white/10 bg-white/5">
                <form onSubmit={handleManualSubmit} className="flex gap-2 bg-black/20 rounded-xl p-1 border border-white/5">
                    <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={context.clientName ? `Chiedi per ${context.clientName}...` : 'Comando...'}
                        className="flex-1 bg-transparent border-none text-white placeholder:text-white/20 focus-visible:ring-0 text-xs h-9"
                        disabled={isLoading}
                    />
                    <Button
                        type="submit"
                        size="sm"
                        className="rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all h-9 w-9 p-0"
                        disabled={isLoading}
                    >
                        {isLoading
                            ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            : <Send className="w-4 h-4" />
                        }
                    </Button>
                </form>
            </div>
        </div>
    );
}
