"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Inbox,
  Send,
  Calendar,
  Brain,
  Briefcase,
  Lightbulb,
  Users,
  LayoutGrid,
  FileText,
  Globe,
  Library,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const sections = [
  {
    label: "Comunicazione",
    items: [
      { name: "Daily Briefing", href: "/", icon: Home },
      { name: "Inbox", href: "/inbox", icon: Inbox },
      { name: "Lancio", href: "/lancio", icon: Send },
      { name: "Calendario", href: "/calendario", icon: Calendar },
    ],
  },
  {
    label: "Contenuti",
    items: [
      { name: "Memoria", href: "/memoria", icon: Brain },
      { name: "Idee", href: "/idee", icon: Lightbulb },
      { name: "Editoriale", href: "/editoriale", icon: LayoutGrid },
    ],
  },
  {
    label: "Business",
    items: [
      { name: "Clienti", href: "/clienti", icon: Users },
      { name: "Incarichi", href: "/incarichi", icon: Briefcase },
      { name: "Finanze", href: "/finanze", icon: FileText },
      { name: "Web & Domini", href: "/domini", icon: Globe },
    ],
  },
  {
    label: "Strumenti",
    items: [
      { name: "Asset Library", href: "/assets", icon: Library },
      { name: "Impostazioni", href: "/settings", icon: Settings },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col">
      <div className="flex grow flex-col gap-y-4 overflow-y-auto border-r border-border bg-surface px-4 pb-4">
        <div className="flex h-16 shrink-0 items-center px-2">
          <span className="text-xl font-bold tracking-tight text-primary">Creative OS</span>
        </div>
        <nav className="flex flex-1 flex-col gap-y-5">
          {sections.map((section) => (
            <div key={section.label}>
              <p className="px-2 mb-1 text-[10px] font-black uppercase tracking-widest text-primary/30">
                {section.label}
              </p>
              <ul role="list" className="-mx-1 space-y-0.5">
                {section.items.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className={cn(
                          active
                            ? "bg-accent/10 text-accent font-semibold"
                            : "text-primary/60 hover:text-primary hover:bg-black/5",
                          "group flex gap-x-3 rounded-lg px-3 py-2 text-sm leading-6 transition-colors"
                        )}
                      >
                        <item.icon
                          className={cn(
                            active ? "text-accent" : "text-primary/40 group-hover:text-primary",
                            "h-4 w-4 shrink-0 transition-colors mt-0.5"
                          )}
                          aria-hidden="true"
                        />
                        {item.name}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </div>
    </div>
  );
}
