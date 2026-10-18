import { PageHeader } from "@/components/ui/page-header";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigurato } from "@/lib/supabase/config";
import { LogOut, User, Sparkles, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { AiProviderCard } from "@/components/settings/ai-provider-card";

export default async function SettingsPage() {
    const online = supabaseConfigurato();
    const user = online
        ? (await (await createClient()).auth.getUser()).data.user
        : null;

    return (
        <div className="cos-page is-narrow">
            <PageHeader kicker="Creative OS" title="Impostazioni" lead="Account, modelli e preferenze." />

            {/* Profilo */}
            <section className="cos-card p-6 sm:p-7">
                <h2 className="cos-kicker mb-4 flex items-center gap-2"><User className="h-3.5 w-3.5" aria-hidden /> Profilo</h2>
                {online ? (
                    <dl className="grid grid-cols-[6rem_1fr] gap-x-4 gap-y-2 text-sm">
                        <dt className="text-ink-3">Email</dt><dd className="min-w-0 truncate text-ink">{user?.email || '—'}</dd>
                        <dt className="text-ink-3">Accesso</dt><dd className="text-ink">Google</dd>
                        <dt className="text-ink-3">ID</dt><dd className="min-w-0 truncate font-mono text-xs leading-5 text-ink-2">{user?.id || '—'}</dd>
                    </dl>
                ) : (
                    <p className="text-sm text-ink-2">Nessun account online collegato: i dati restano su questo computer.</p>
                )}
            </section>

            {/* Modelli AI (OpenRouter) */}
            <Suspense fallback={<div className="cos-card cos-loading"><span className="cos-reg" />Carico i modelli</div>}>
                <AiProviderCard />
            </Suspense>

            {/* AI */}
            <Link href="/settings/skills" className="cos-card cos-crop group flex items-center justify-between gap-4 p-6 sm:p-7">
                <div className="flex items-center gap-4">
                    <span className="grid h-11 w-11 place-items-center rounded-full bg-ink text-hot">
                        <Sparkles className="h-4 w-4" aria-hidden />
                    </span>
                    <div>
                        <h2 className="text-[15px] font-semibold text-ink">Skill e architettura AI</h2>
                        <p className="mt-0.5 text-[13px] text-ink-3">Personalizza il comportamento del Co-Pilot</p>
                    </div>
                </div>
                <ChevronRight className="h-5 w-5 text-ink-3 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
            </Link>

            {/* Logout */}
            {online && <section className="cos-card p-6 sm:p-7">
                <h2 className="cos-kicker mb-4 flex items-center gap-2"><LogOut className="h-3.5 w-3.5" aria-hidden /> Sessione</h2>
                <form action="/auth/signout" method="POST">
                    <button type="submit" className="cos-btn cos-btn-danger cos-btn-sm">
                        Disconnetti account
                    </button>
                </form>
            </section>}
        </div>
    );
}
