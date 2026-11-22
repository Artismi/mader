export interface Sessione { tessera: { n: number; s: Float64Array; vel: Float32Array }; tratti: { n: number; s: Float64Array; vel: Float32Array }; finito: boolean; ogni: number; avanza: (n: number) => void; cristallo: unknown }
export function creaSorgente(p: unknown): { sessioni: Sessione[] }
