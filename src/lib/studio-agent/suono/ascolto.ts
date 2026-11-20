/**
 * L'orecchio: misura un beat già suonato, come farebbe chi mixa.
 *  - bilanciamento delle bande rispetto a una curva di riferimento (circa -5 dB per ottava, tipica dei mix commerciali)
 *  - quanto la cassa e il rullante escono da quello che hanno intorno (punch): energia nei 20 ms dopo il colpo contro i 60 ms prima
 *  - il baricentro spettrale (sotto i 250 Hz è fango)
 *  - la dinamica (quanto respira) e la larghezza stereo
 * Il voto finale serve a scegliere tra più beat candidati e a premiare gli stili che suonano meglio.
 */
export interface Orecchio { voto: number; punchCassa: number; punchRullante: number; baricentro: number; bande: number[]; scarto: number; stereo: number; dinamica: number }

export function ascoltaBeat(a: AudioBuffer, cassa: number[], rullante: number[]): Orecchio {
  const sr = a.sampleRate, L = a.getChannelData(0), R = a.getChannelData(Math.min(1, a.numberOfChannels - 1)), n = L.length
  const m = new Float32Array(n); for (let i = 0; i < n; i++) m[i] = (L[i] + R[i]) / 2
  // bande con filtri a un polo in cascata (passa-basso progressivi): energia per ottava da 40 Hz a 10 kHz
  const tagli = [40, 80, 160, 320, 640, 1280, 2560, 5120, 10240]
  const lp = (x: Float32Array, fc: number) => { const out = new Float32Array(x.length), k = Math.exp(-2 * Math.PI * fc / sr); let y = 0; for (let i = 0; i < x.length; i++) { y = (1 - k) * x[i] + k * y; out[i] = y } return out }
  const strati = tagli.map(f => lp(m, f))
  const en = (x: Float32Array) => { let s = 0; for (let i = 0; i < x.length; i += 4) s += x[i] * x[i]; return s / (x.length / 4) }
  const bande: number[] = []
  for (let k = 1; k < tagli.length; k++) { const b = new Float32Array(n); for (let i = 0; i < n; i += 4) b[i] = strati[k][i] - strati[k - 1][i]; bande.push(10 * Math.log10(en(b) + 1e-12)) }
  const tot = Math.max(...bande)
  const rel = bande.map(b => b - tot)
  // la curva di riferimento: dalla banda più forte (80-160 Hz) scende di 5 dB per ottava
  const rif = rel.map((_, i) => -Math.max(0, i - 1) * 5)
  const scarto = rel.reduce((a2, v, i) => a2 + Math.abs(v - rif[i]), 0) / rel.length
  // baricentro: media pesata delle frequenze centrali delle bande
  const centri = tagli.slice(1).map((f, i) => Math.sqrt(f * tagli[i]))
  const pot = bande.map(b => Math.pow(10, b / 10))
  const baricentro = pot.reduce((a2, p, i) => a2 + p * centri[i], 0) / pot.reduce((a2, p) => a2 + p, 0)
  // punch: energia subito dopo il colpo contro il livello medio della banda (o quello appena prima, se più alto)
  const punch = (ts: number[], banda: Float32Array) => {
    const v: number[] = [], media = en(banda)
    for (const t of ts) { const i = Math.floor(t * sr); const dopo = banda.subarray(i, Math.min(n, i + Math.floor(0.02 * sr))), prima = banda.subarray(Math.max(0, i - Math.floor(0.06 * sr)), i); if (dopo.length && prima.length) v.push(10 * Math.log10((en(dopo) + 1e-9) / (Math.max(en(prima), media) + 1e-9))) }
    v.sort((a2, b) => a2 - b); return v.length ? v[Math.floor(v.length / 2)] : 0
  }
  const basso = strati[2] // sotto i 160 Hz
  const alto = new Float32Array(n); for (let i = 0; i < n; i++) alto[i] = m[i] - strati[5][i] // sopra 1.3 kHz circa
  const punchCassa = punch(cassa, basso), punchRullante = punch(rullante, alto)
  // stereo: energia del lato rispetto al centro
  let ss = 0, mm = 0; for (let i = 0; i < n; i += 8) { const s = (L[i] - R[i]) / 2, c = (L[i] + R[i]) / 2; ss += s * s; mm += c * c }
  const stereo = 10 * Math.log10(ss / (mm + 1e-12) + 1e-12)
  // dinamica: differenza tra i picchi e la media su finestre di 50 ms
  const hop = Math.floor(sr * 0.05); const cre: number[] = []
  for (let i = 0; i + hop < n; i += hop) { let p = 0, e = 0; for (let j = i; j < i + hop; j += 2) { const a2 = Math.abs(m[j]); if (a2 > p) p = a2; e += m[j] * m[j] } cre.push(20 * Math.log10(p / (Math.sqrt(e / (hop / 2)) + 1e-9) + 1e-9)) }
  cre.sort((a2, b) => a2 - b); const dinamica = cre.length ? cre[Math.floor(cre.length / 2)] : 0
  // il voto: punch (cassa e rullante devono uscire), bilanciamento vicino alla curva, niente fango, un po' di stereo e di respiro
  const voto = Math.min(1, Math.max(0, punchCassa / 10)) * 1.2 + Math.min(1, Math.max(0, punchRullante / 12)) * 1.2
    - scarto / 8 - Math.max(0, 300 - baricentro) / 300 + (stereo > -25 ? 0.2 : 0) + Math.min(1, Math.max(0, (dinamica - 3) / 6)) * 0.5
  return { voto, punchCassa, punchRullante, baricentro, bande: rel, scarto, stereo, dinamica }
}
