export function creaFinestra(f: Record<string, unknown>): { L: number }
export function creaProiettore(fin: unknown, cristallo: unknown, conCopie?: boolean, maxTratti?: number): { pieno: boolean; proietta: (s: Float64Array, vel: Float32Array, da: number, a: number) => Float64Array }
