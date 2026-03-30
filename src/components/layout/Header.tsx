"use client";

import { Menu } from "lucide-react";

export function Header() {
    return (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-5xl">
            <div className="glass-card flex h-12 items-center gap-x-4 px-6 rounded-full">
                <div className="flex flex-1 items-center">
                    <div className="flex w-full items-center text-xs tracking-wider uppercase text-white/50">
                        <span className="font-bold text-white mr-3">Creative OS</span>
                        <span className="h-3 w-px bg-white/20 mx-3" />
                        Contesto: <span className="ml-2 font-medium text-white/80">Progetto Attivo / Nessun file selezionato</span>
                    </div>
                </div>
                <div className="flex items-center gap-x-4">
                    <div className="h-6 w-6 rounded-full bg-white/10 border border-white/20" />
                </div>
            </div>
        </div>
    );
}
