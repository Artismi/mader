import { FileText } from "lucide-react";

export default function FinanzePage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-primary">Documenti Finanziari</h1>
                <p className="mt-2 text-sm text-primary/70">Preventivi, fatture e documenti fiscali.</p>
            </div>
            <div className="flex flex-col items-center justify-center py-24 text-primary/30">
                <FileText className="w-16 h-16 mb-6 opacity-20" />
                <p className="text-base font-semibold">In arrivo — Fase F8</p>
                <p className="text-sm mt-2 text-primary/40 max-w-sm text-center">
                    Preventivi automatici via Canva Doc → PDF → Drive → Gmail draft. Prossima versione.
                </p>
            </div>
        </div>
    );
}
