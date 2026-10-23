import { googleStatus } from "@/lib/google/auth";
import { signOut } from "@/app/actions";
import { LogOut, User, Sparkles, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { AiProviderCard } from "@/components/settings/ai-provider-card";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
    const google = googleStatus();
    const expires = google.expiresAt ? new Date(google.expiresAt).toLocaleString("it-IT") : null;

    return (
        <div className="space-y-6 max-w-2xl">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-primary">Impostazioni</h1>
                <p className="mt-2 text-sm text-primary/70">Account e preferenze.</p>
            </div>

            {/* Profilo */}
            <div className="bg-white rounded-xl border border-border p-6 space-y-4">
                <h2 className="font-semibold text-primary flex items-center gap-2">
                    <User className="w-4 h-4" /> Profilo
                </h2>
                <div className="text-sm text-primary/70 space-y-1">
                    <p><span className="font-medium text-primary">Provider:</span> Google</p>
                    <p>
                        <span className="font-medium text-primary">Account Google:</span>{" "}
                        {google.connected ? "collegato" : "non collegato"}
                        {google.connected && (google.renewable ? " (rinnovo automatico)" : " (senza refresh token: scade)")}
                    </p>
                    {expires && (
                        <p><span className="font-medium text-primary">{google.expired ? "Token scaduto il:" : "Token valido fino a:"}</span> <span className="font-mono text-xs">{expires}</span></p>
                    )}
                    {!google.connected && (
                        <p className="text-xs">
                            <Link href="/login" className="text-accent hover:underline">Accedi con Google</Link> per collegare Drive, Gmail e Calendar.
                        </p>
                    )}
                </div>
            </div>

            {/* Modelli AI (OpenRouter) */}
            <Suspense fallback={null}>
                <AiProviderCard />
            </Suspense>

            {/* AI */}
            <Link href="/settings/skills" className="block">
                <div className="bg-white rounded-xl border border-border p-6 hover:border-accent/40 hover:shadow-sm transition-all">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-accent/10 rounded-xl flex items-center justify-center">
                                <Sparkles className="w-4 h-4 text-accent" />
                            </div>
                            <div>
                                <h2 className="font-semibold text-primary text-sm">Skill & Architettura AI</h2>
                                <p className="text-xs text-primary/50 mt-0.5">Personalizza il comportamento del Co-Pilot</p>
                            </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-primary/30" />
                    </div>
                </div>
            </Link>

            {/* Logout */}
            <div className="bg-white rounded-xl border border-border p-6">
                <h2 className="font-semibold text-primary flex items-center gap-2 mb-4">
                    <LogOut className="w-4 h-4" /> Sessione
                </h2>
                <form action={signOut}>
                    <button
                        type="submit"
                        className="text-sm font-medium text-red-600 hover:text-red-800 transition-colors"
                    >
                        Disconnetti account
                    </button>
                </form>
            </div>
        </div>
    );
}
