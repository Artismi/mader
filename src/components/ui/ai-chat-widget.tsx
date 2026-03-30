'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, isTextUIPart } from 'ai';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Send, Bot, User } from "lucide-react";
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

export function AIChatWidget() {
    const router = useRouter();
    const [input, setInput] = useState('');

    const { messages, sendMessage, status } = useChat({
        transport: new DefaultChatTransport({ api: '/api/ai' }),
        onFinish: () => {
            router.refresh();
        }
    });

    const isLoading = status === 'submitted' || status === 'streaming';

    const handleManualSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;
        const text = input;
        setInput('');
        await sendMessage({ text });
    };

    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    return (
        <div className="glass-card flex flex-col h-[500px] overflow-hidden rounded-2xl border-white/10">
            <div className="p-4 border-b border-white/10 bg-white/5 text-sm font-bold tracking-widest uppercase text-white/70 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-accent animate-pulse shadow-[0_0_8px_rgba(124,58,237,0.8)]" />
                Co-Pilot
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
                {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center text-white/30 text-xs space-y-4">
                        <Bot className="w-8 h-8 opacity-20" />
                        <p className="max-w-[200px] leading-relaxed italic">"Sono pronto ad aiutarti a organizzare la scrivania. Cosa facciamo oggi?"</p>
                    </div>
                ) : (
                    messages.map(m => {
                        const text = m.parts.filter(isTextUIPart).map(p => p.text).join('');
                        if (!text) return null;
                        return (
                            <div key={m.id} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                <div className={`rounded-xl px-4 py-2 max-w-[85%] text-sm ${
                                    m.role === 'user'
                                        ? 'bg-accent/20 text-white rounded-tr-none border border-accent/20'
                                        : 'bg-white/5 border border-white/10 text-white/80 rounded-tl-none'
                                }`}>
                                    {text}
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t border-white/10 bg-white/5">
                <form onSubmit={handleManualSubmit} className="flex gap-2 bg-black/20 rounded-xl p-1 border border-white/5">
                    <Input
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        placeholder="Comando..."
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
