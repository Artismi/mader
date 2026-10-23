import { PageHeader } from "@/components/ui/page-header";
import { googleStatus } from "@/lib/google/auth";
import { signOut } from "@/app/actions";
import { LogOut, User, Sparkles, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { AiProviderCard } from "@/components/settings/ai-provider-card";
import { ModelKeysCard } from "@/components/settings/model-keys-card";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
    // l'account è il collegamento Google salvato in SQLite: niente servizi online di mezzo
    const google = googleStatus();
    const expires = google.expiresAt ? new Date(google.expiresAt).toLocaleString("it-IT") : null;

    return (
        <div className="cos-page is-narrow">
            <PageHeader kicker="Creative OS" title="Impostazioni" lead="Account, modelli e preferenze." />

            {/* Profilo */}
            <section className="cos-card p-6 sm:p-7">
                <h2 className="cos-kicker mb-4 flex items-center gap-2"><User className="h-3.5 w-3.5" aria-hidden /> Profilo</h2>
                <dl className="grid grid-cols-[8rem_1fr] gap-x-4 gap-y-2 text-sm">
                    <dt className="text-ink-3">Google</dt>
                    <dd className="text-ink">
                        {google.connected ? "collegato" : "non collegato"}
                        {google.connected && (google.renewable ? " · rinnovo automatico" : " · senza rinnovo: scade")}
                    </dd>
                    {expires && <>
                        <dt className="text-ink-3">{google.expired ? "Scaduto il" : "Valido fino a"}</dt>
                        <dd className="font-mono text-xs leading-5 text-ink-2">{expires}</dd>
                    </>}
                </dl>
                {!google.connected && (
                    <p className="mt-4 text-sm text-ink-2">
                        <Link href="/login" className="font-semibold text-ink underline underline-offset-4">Accedi con Google</Link> per collegare Drive, Gmail e Calendar. I dati restano su questo computer.
                    </p>
                )}
            </section>

            {/* Modelli: chiavi dell'utente, cifrate */}
            <ModelKeysCard />

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

            {/* Licenze di caratteri, icone e immagini */}
            <Link href="/settings/crediti" className="cos-card cos-crop group flex items-center justify-between gap-4 p-6 sm:p-7">
                <div>
                    <h2 className="text-[15px] font-semibold text-ink">Crediti e licenze</h2>
                    <p className="mt-0.5 text-[13px] text-ink-3">Chi ha fatto caratteri, icone e immagini usati nelle tavole</p>
                </div>
                <ChevronRight className="h-5 w-5 text-ink-3 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
            </Link>

            {/* Scollega Google */}
            {google.connected && <section className="cos-card p-6 sm:p-7">
                <h2 className="cos-kicker mb-4 flex items-center gap-2"><LogOut className="h-3.5 w-3.5" aria-hidden /> Sessione</h2>
                <form action={signOut}>
                    <button type="submit" className="cos-btn cos-btn-danger cos-btn-sm">
                        Scollega l&apos;account Google
                    </button>
                </form>
            </section>}
        </div>
    );
}
