"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Menu,
  X,
  LogOut,
  Home,
  Inbox,
  Send,
  Calendar,
  Brain,
  Briefcase,
  Lightbulb,
  Users,
  LayoutGrid,
  Palette,
  FileText,
  Globe,
  Library,
  Settings,
  FolderOpen,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useSidebar } from "@/components/layout/SidebarContext";

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
      { name: "Progettazione", href: "/progettazione", icon: Palette },
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

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isVaultOpen, isCoPilotOpen, toggleVault, toggleCoPilot } = useSidebar();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <>
      <header
        className="shrink-0 z-30 flex h-16 items-center gap-2 px-3 sm:gap-3 sm:px-4"
        role="banner"
      >
        <button
          type="button"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-paper text-ink shadow-[inset_0_0_0_1.5px_var(--cos-line)] transition-shadow hover:shadow-[inset_0_0_0_1.5px_var(--cos-ink)]"
          onClick={() => setMobileOpen(true)}
          aria-label="Apri menu navigazione"
        >
          <Menu className="h-4 w-4" />
        </button>

        <div className="min-w-0 flex-1">
          <p className="cos-kicker hidden truncate sm:block">Creative OS</p>
          <p className="truncate font-display text-[15px] font-semibold capitalize leading-tight text-ink">
            {pathname === "/" ? "Oggi" : pathname.replace(/^\//, "").split("/")[0] || "—"}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            title="Vault asset"
            aria-pressed={isVaultOpen}
            onClick={toggleVault}
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-full transition-colors",
              isVaultOpen
                ? "bg-ink text-paper"
                : "text-ink-2 hover:bg-sunk hover:text-ink",
            )}
          >
            <FolderOpen className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="Co-Pilot AI"
            aria-pressed={isCoPilotOpen}
            onClick={toggleCoPilot}
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-full transition-colors",
              isCoPilotOpen
                ? "bg-ink text-hot"
                : "text-ink-2 hover:bg-sunk hover:text-ink",
            )}
          >
            <Sparkles className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleLogout}
            title="Esci"
            className="flex h-10 w-10 items-center justify-center rounded-full text-ink-3 transition-colors hover:bg-sunk hover:text-ink"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-[200] bg-desk/70 backdrop-blur-[6px]"
          onClick={() => setMobileOpen(false)}
          aria-hidden
        />
      )}

      <div
        className={cn(
          "fixed inset-y-2 left-2 z-[201] flex w-[min(20rem,calc(100vw-16px))] max-w-full flex-col overflow-hidden rounded-[30px] bg-paper shadow-[var(--cos-shadow-2)] transition-transform duration-300 ease-[var(--cos-ease)]",
          mobileOpen ? "translate-x-0" : "-translate-x-[110%]",
        )}
      >
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 px-4">
          <span className="font-display text-lg font-bold text-ink">Menu</span>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-white/40 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Chiudi menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav
          className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-3 py-3"
          aria-label="Sezioni app"
        >
          <div className="space-y-5">
            {sections.map((section) => (
              <div key={section.label}>
                <p className="cos-kicker mb-1.5 px-3">
                  {section.label}
                </p>
                <ul className="space-y-0.5">
                  {section.items.map((item) => {
                    const active = isActive(item.href);
                    return (
                      <li key={item.name}>
                        <Link
                          href={item.href}
                          className={cn(
                            "flex min-w-0 items-center gap-3 rounded-full px-3 py-2 text-sm font-medium transition-colors",
                            active
                              ? "bg-ink text-paper"
                              : "text-ink-2 hover:bg-sunk hover:text-ink",
                          )}
                        >
                          <item.icon
                            className={cn(
                              "h-4 w-4 shrink-0",
                              active ? "text-hot" : "",
                            )}
                          />
                          <span className="min-w-0 truncate">{item.name}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </nav>

        <div className="shrink-0 border-t border-white/10 px-3 py-3">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full min-w-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/40 transition-colors hover:bg-white/5 hover:text-white"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span className="truncate">Esci</span>
          </button>
        </div>
      </div>
    </>
  );
}
