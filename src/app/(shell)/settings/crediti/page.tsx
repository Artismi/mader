import fs from "node:fs";
import path from "node:path";
import { PageHeader } from "@/components/ui/page-header";
import { LICENZE, type LicenzaId } from "@/components/studio/designer/asset/catalogo";
import CARATTERI from "@/components/studio/designer/asset/caratteri.json";
import ALTRI from "@/components/studio/designer/asset/altri.json";

export const dynamic = "force-static";

type Voce = { licenza: string; autore?: string; fonte?: string; nome?: string; tipo?: string };
type Set = { name: string; author?: { name: string; url?: string }; license?: { title: string; spdx?: string; url?: string } };

// set di icone usati dallo Studio (route /api/icons): la licenza si legge dal pacchetto stesso
const SET_ICONE = ["game-icons", "streamline-emojis", "tabler", "ph", "fluent-emoji-flat"];

function setIcone(): Set[] {
    return SET_ICONE.flatMap(id => {
        try {
            return [JSON.parse(fs.readFileSync(path.join(process.cwd(), "node_modules", "@iconify-json", id, "info.json"), "utf8")) as Set];
        } catch { return [] }
    });
}

/** Autori raggruppati per licenza: chi chiede l'attribuzione viene prima */
function perLicenza(voci: Voce[]) {
    const gruppi = new Map<string, Map<string, number>>();
    for (const v of voci) {
        const lic = LICENZE[v.licenza as LicenzaId];
        if (!lic?.commerciale) continue;               // nelle tavole entra solo ciò che si può usare
        const chi = v.autore || v.fonte || "autori vari";
        const g = gruppi.get(v.licenza) ?? new Map<string, number>();
        g.set(chi, (g.get(chi) ?? 0) + 1);
        gruppi.set(v.licenza, g);
    }
    return [...gruppi.entries()]
        .map(([id, autori]) => ({ id: id as LicenzaId, autori: [...autori.entries()].sort((a, b) => a[0].localeCompare(b[0], "it")) }))
        .sort((a, b) => Number(LICENZE[b.id].attribuzione) - Number(LICENZE[a.id].attribuzione));
}

export default function CreditiPage() {
    const icone = setIcone();
    const voci = [...(CARATTERI as unknown as Voce[]), ...(ALTRI as unknown as Voce[])];
    const gruppi = perLicenza(voci);

    return (
        <div className="cos-page is-narrow">
            <PageHeader kicker="Impostazioni" title="Crediti e licenze" lead="Caratteri, icone e immagini che Creative OS usa nelle tavole, con chi li ha fatti e a che condizioni." />

            <section className="cos-card p-6 sm:p-7">
                <h2 className="cos-kicker mb-4">Icone</h2>
                <ul className="grid gap-3 text-sm">
                    {icone.map(s => (
                        <li key={s.name} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4">
                            <span className="text-ink">
                                <b className="font-semibold">{s.name}</b>
                                {s.author && <> di {s.author.url ? <a className="underline underline-offset-4" href={s.author.url} target="_blank" rel="noreferrer">{s.author.name}</a> : s.author.name}</>}
                            </span>
                            {s.license && <a className="text-ink-2 underline underline-offset-4" href={s.license.url} target="_blank" rel="noreferrer">{s.license.title}</a>}
                        </li>
                    ))}
                </ul>
                <p className="mt-4 text-[13px] text-ink-3">Le icone in CC BY si possono usare anche per lavori commerciali, a condizione di citare l&apos;autore nel lavoro che le contiene.</p>
            </section>

            {gruppi.map(g => {
                const lic = LICENZE[g.id];
                return (
                    <section key={g.id} className="cos-card p-6 sm:p-7">
                        <h2 className="cos-kicker mb-1">{lic.nome}</h2>
                        <p className="mb-4 text-[13px] text-ink-3">
                            {lic.attribuzione ? "Richiede di citare l'autore." : "Uso libero, anche commerciale, senza obbligo di citazione."}
                            {lic.url && <> <a className="underline underline-offset-4" href={lic.url} target="_blank" rel="noreferrer">Testo della licenza</a></>}
                        </p>
                        <p className="text-sm leading-6 text-ink">
                            {g.autori.map(([chi, n], i) => (
                                <span key={chi}>{chi}<span className="text-ink-3"> ({n})</span>{i < g.autori.length - 1 ? ", " : ""}</span>
                            ))}
                        </p>
                    </section>
                );
            })}
        </div>
    );
}
