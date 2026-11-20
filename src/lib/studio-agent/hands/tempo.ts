/** il tempo dei generatori: comune a tutti gli strumenti */
/** quanto è cresciuto e in che fase vive: uguale per tutti gli strumenti */
export const tempoDi = (c?: { tempo?: { crescita: number; fase: number } }) => ({ crescita: Math.max(0, Math.min(1, c?.tempo?.crescita ?? 1)), fase: c?.tempo?.fase ?? 0, a: c?.tempo ? 1 : 0 }) // a = 0: tavola ferma, nessuna vibrazione
/** finestra di crescita di un elemento i su n (con un po' di sovrapposizione tra uno e il successivo) */
export const finestra = (cr: number, i: number, n: number, sovr = 0.5) => { const w = sovr + (1 - sovr) / Math.max(1, n), t0 = (i / Math.max(1, n)) * (1 - w); return Math.max(0, Math.min(1, (cr - t0) / w)) }
