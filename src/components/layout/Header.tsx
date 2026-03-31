"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, LayoutDashboard, Briefcase, Lightbulb, Users, Library, FileText, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
    { name: "Daily Briefing", href: "/", icon: LayoutDashboard },
    { name: "Incarichi", href: "/incarichi", icon: Briefcase },
    { name: "Idee", href: "/idee", icon: Lightbulb },
    { name: "Clienti", href: "/clienti", icon: Users },
    { name: "Asset Library", href: "/assets", icon: Library },
    { name: "Documenti Finanziari", href: "/finanze", icon: FileText },
    { name: "Impostazioni", href: "/settings", icon: Settings },
];

export function Header() {
    const pathname = usePathname();
    const [mobileOpen, setMobileOpen] = useState(false);

    // Close drawer on route change
    useEffect(() => {
        setMobileOpen(false);
    }, [pathname]);

    // Prevent body scroll when drawer is open
    useEffect(() => {
        if (mobileOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [mobileOpen]);

    return (
        <>
            <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-5xl">
                <div className="glass-card flex h-12 items-center gap-x-4 px-4 sm:px-6 rounded-full">
                    {/* Hamburger — mobile only */}
                    <button
                        className="lg:hidden flex items-center justify-center w-8 h-8 rounded-full hover:bg-white/10 transition-colors text-white/60 hover:text-white"
                        onClick={() => setMobileOpen(true)}
                        aria-label="Menu"
                    >
                        <Menu className="w-4 h-4" />
                    </button>

                    <div className="flex flex-1 items-center">
                        <div className="flex w-full items-center text-xs tracking-wider uppercase text-white/50">
                            <span className="font-bold text-white mr-3 hidden sm:block">Creative OS</span>
                            <span className="font-bold text-white mr-3 sm:hidden">COS</span>
                            <span className="h-3 w-px bg-white/20 mx-3 hidden sm:block" />
                            <span className="hidden sm:block">Contesto: <span className="ml-2 font-medium text-white/80">Progetto Attivo</span></span>
                        </div>
                    </div>
                    <div className="flex items-center gap-x-4">
                        <div className="h-6 w-6 rounded-full bg-white/10 border border-white/20" />
                    </div>
                </div>
            </div>

            {/* Mobile drawer overlay */}
            {mobileOpen && (
                <div
                    className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm lg:hidden"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* Mobile drawer */}
            <div className={cn(
                "fixed inset-y-0 left-0 z-[201] w-72 bg-[#0F0F1A] border-r border-white/10 flex flex-col transform transition-transform duration-300 ease-in-out lg:hidden",
                mobileOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <div className="flex items-center justify-between px-5 h-16 border-b border-white/10">
                    <span className="text-lg font-bold text-white">Creative OS</span>
                    <button
                        onClick={() => setMobileOpen(false)}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <nav className="flex-1 overflow-y-auto px-3 py-4">
                    <ul className="space-y-1">
                        {navigation.map(item => {
                            const isActive = pathname === item.href;
                            return (
                                <li key={item.name}>
                                    <Link
                                        href={item.href}
                                        className={cn(
                                            "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                                            isActive
                                                ? "bg-accent/15 text-white"
                                                : "text-white/50 hover:text-white hover:bg-white/5"
                                        )}
                                    >
                                        <item.icon className={cn("w-5 h-5 shrink-0", isActive ? "text-accent" : "")} />
                                        {item.name}
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </nav>
            </div>
        </>
    );
}
