'use client'

import { useCompletion } from '@ai-sdk/react';
import { useState } from 'react';
import { Sparkles, Loader2, RefreshCw } from 'lucide-react';

export function PlannerWidget() {
    const [customPrompt, setCustomPrompt] = useState('');

    const { completion, complete, isLoading, error } = useCompletion({
        api: '/api/ai/planner',
    });

    const handleGenerate = () => {
        complete(customPrompt || '');
    };

    return (
        <div className="glass-card p-6 border-white/5 bg-white/[0.02] space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" /> Piano Intelligente
                </h2>
                {completion && !isLoading && (
                    <button
                        onClick={handleGenerate}
                        className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white/30 hover:text-white/60"
                        title="Rigenera"
                    >
                        <RefreshCw className="w-3 h-3" />
                    </button>
                )}
            </div>

            {!completion && !isLoading && (
                <div className="space-y-3">
                    <textarea
                        value={customPrompt}
                        onChange={e => setCustomPrompt(e.target.value)}
                        placeholder="Domanda specifica… (es. 'Cosa faccio oggi?') oppure lascia vuoto per l'analisi completa"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white/70 placeholder:text-white/20 resize-none focus:outline-none focus:border-accent/40 transition-colors"
                        rows={2}
                    />
                    <button
                        onClick={handleGenerate}
                        className="w-full py-2.5 bg-accent/20 hover:bg-accent/30 border border-accent/20 rounded-xl text-xs font-bold text-accent transition-all tracking-widest uppercase"
                    >
                        Analizza Settimana
                    </button>
                </div>
            )}

            {isLoading && !completion && (
                <div className="flex items-center gap-2 text-white/30 text-xs py-4 justify-center">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Analisi in corso…</span>
                </div>
            )}

            {completion && (
                <div className="space-y-3">
                    <div className="text-xs text-white/60 leading-relaxed whitespace-pre-wrap max-h-[340px] overflow-y-auto scrollbar-hide">
                        {completion}
                        {isLoading && <span className="inline-block w-1.5 h-3 bg-accent/60 animate-pulse ml-0.5 rounded-sm" />}
                    </div>
                    {!isLoading && (
                        <button
                            onClick={() => {
                                setCustomPrompt('');
                                complete('');
                            }}
                            className="text-[10px] text-white/20 hover:text-white/50 transition-colors uppercase tracking-widest"
                        >
                            Nuova analisi
                        </button>
                    )}
                </div>
            )}

            {error && (
                <p className="text-xs text-red-400/70">Errore: {error.message}</p>
            )}
        </div>
    );
}
