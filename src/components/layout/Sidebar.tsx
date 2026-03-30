"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    Home,
    Briefcase,
    Lightbulb,
    Users,
    Library,
    FileText
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
    { name: "Daily Briefing", href: "/", icon: Home },
    { name: "Incarichi", href: "/incarichi", icon: Briefcase },
    { name: "Idee", href: "/idee", icon: Lightbulb },
    { name: "Clienti", href: "/clienti", icon: Users },
    { name: "Asset Library", href: "/assets", icon: Library },
    { name: "Documenti Finanziari", href: "/finanze", icon: FileText },
];

export function Sidebar() {
    const pathname = usePathname();

    return (
        <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
            <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-border bg-surface px-6 pb-4">
                <div className="flex h-16 shrink-0 items-center">
                    <span className="text-xl font-bold tracking-tight text-primary">Creative OS</span>
                </div>
                <nav className="flex flex-1 flex-col">
                    <ul role="list" className="flex flex-1 flex-col gap-y-7">
                        <li>
                            <ul role="list" className="-mx-2 space-y-1">
                                {navigation.map((item) => {
                                    const isActive = pathname === item.href;
                                    return (
                                        <li key={item.name}>
                                            <Link
                                                href={item.href}
                                                className={cn(
                                                    isActive
                                                        ? "bg-accent/10 text-accent font-semibold"
                                                        : "text-primary/70 hover:text-primary hover:bg-black/5",
                                                    "group flex gap-x-3 rounded-md p-2 text-sm leading-6 transition-colors"
                                                )}
                                            >
                                                <item.icon
                                                    className={cn(
                                                        isActive ? "text-accent" : "text-primary/50 group-hover:text-primary",
                                                        "h-6 w-6 shrink-0 transition-colors"
                                                    )}
                                                    aria-hidden="true"
                                                />
                                                {item.name}
                                            </Link>
                                        </li>
                                    );
                                })}
                            </ul>
                        </li>
                        <li className="mt-auto">
                            <a
                                href="#"
                                className="group -mx-2 flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 text-primary/70 hover:bg-black/5 hover:text-primary transition-colors"
                            >
                                Impostazioni
                            </a>
                        </li>
                    </ul>
                </nav>
            </div>
        </div>
    );
}
