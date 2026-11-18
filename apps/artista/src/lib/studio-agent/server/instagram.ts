/**
 * Instagram, lato server (sul tuo PC).
 *
 * - CONFIG: il token di Instagram sta in un file nella tua cartella utente
 *   (~/.artista-osservatore/instagram.json), non nel browser e non nello zip.
 * - MEDIA: le immagini e i video da pubblicare vengono salvati in ~/.artista-osservatore/media
 *   e serviti da questo server. Instagram però deve poterli scaricare da internet: per questo
 *   il server apre un "tunnel" gratuito di Cloudflare (cloudflared, nessun account) che dà al
 *   tuo PC un indirizzo pubblico temporaneo. Il programma cloudflared lo scarica da solo la
 *   prima volta, dal sito ufficiale su GitHub.
 * - PUBBLICAZIONE: contenitori per ogni elemento → contenitore carosello → pubblica.
 *   API "Instagram con login Instagram" (graph.instagram.com): non serve una pagina Facebook.
 */
import { spawn, type ChildProcess } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync, createWriteStream, chmodSync, readdirSync, statSync, unlinkSync } from 'node:fs'
import { homedir, platform } from 'node:os'
import { join } from 'node:path'

const DIR = join(homedir(), '.artista-osservatore')
const MEDIA = join(DIR, 'media')
const CONF = join(DIR, 'instagram.json')
mkdirSync(MEDIA, { recursive: true })

const G = 'https://graph.instagram.com/v22.0'
export interface Conf { token?: string; userId?: string; username?: string; tokenDel?: number }
export const leggiConf = (): Conf => { try { return JSON.parse(readFileSync(CONF, 'utf8')) } catch { return {} } }
const scriviConf = (c: Conf) => writeFileSync(CONF, JSON.stringify(c, null, 2))

async function ig(path: string, params: Record<string, string> = {}, method: 'GET' | 'POST' = 'GET') {
  const c = leggiConf()
  const u = new URL(`${G}/${path}`)
  const body = new URLSearchParams({ ...params, access_token: c.token ?? '' })
  const res = method === 'GET' ? await fetch(`${u}?${body}`) : await fetch(u, { method: 'POST', body })
  const j = await res.json().catch(() => ({}))
  if (!res.ok || j.error) throw new Error(j.error?.message ?? `Instagram ha risposto ${res.status}`)
  return j
}

/** salva il token e verifica a chi appartiene; se ha più di 50 giorni lo rinnova */
export async function salvaToken(token: string) {
  scriviConf({ token: token.trim(), tokenDel: Date.now() })
  return stato()
}
export async function rinnovaSeServe() {
  const c = leggiConf()
  if (!c.token || !c.tokenDel || Date.now() - c.tokenDel < 50 * 86400e3) return
  const j = await ig('refresh_access_token', { grant_type: 'ig_refresh_token' }).catch(() => null)
  const nuovo = j as { access_token?: string } | null
  if (nuovo?.access_token) scriviConf({ ...c, token: nuovo.access_token, tokenDel: Date.now() })
}
export async function stato() {
  const c = leggiConf()
  if (!c.token) return { collegato: false, tunnel: tunnelUrl }
  await rinnovaSeServe()
  const me = await ig('me', { fields: 'user_id,username' }) as { user_id?: string; id?: string; username?: string }
  const userId = String(me.user_id ?? me.id)
  scriviConf({ ...leggiConf(), userId, username: me.username })
  const lim = await ig(`${userId}/content_publishing_limit`, { fields: 'quota_usage,config' }).catch(() => null) as { data?: { quota_usage?: number; config?: { quota_total?: number } }[] } | null
  return { collegato: true, username: me.username, userId, tunnel: tunnelUrl, usati24h: lim?.data?.[0]?.quota_usage, limite24h: lim?.data?.[0]?.config?.quota_total }
}

// ─── media e tunnel ─────────────────────────────────────────────────────────
export function salvaMedia(nome: string, dati: ArrayBuffer) {
  const sicuro = nome.replace(/[^a-z0-9._-]/gi, '_')
  writeFileSync(join(MEDIA, sicuro), Buffer.from(dati))
  // pulizia: via i file più vecchi di 2 giorni (Instagram se li è già copiati)
  for (const f of readdirSync(MEDIA)) { const p = join(MEDIA, f); if (Date.now() - statSync(p).mtimeMs > 2 * 86400e3) unlinkSync(p) }
  return sicuro
}
export function leggiMedia(nome: string): { dati: Buffer; tipo: string } | null {
  const p = join(MEDIA, nome.replace(/[^a-z0-9._-]/gi, '_'))
  if (!existsSync(p)) return null
  return { dati: readFileSync(p), tipo: p.endsWith('.mp4') ? 'video/mp4' : 'image/jpeg' }
}

let tunnel: ChildProcess | null = null
let tunnelUrl: string | null = null
const BIN = join(DIR, platform() === 'win32' ? 'cloudflared.exe' : 'cloudflared')
const URL_BIN: Record<string, string> = {
  win32: 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe',
  linux: 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64',
}
async function scaricaCloudflared() {
  if (existsSync(BIN)) return
  const url = URL_BIN[platform()]
  if (!url) throw new Error('Su questo sistema installa cloudflared a mano (su Mac: brew install cloudflared).')
  const res = await fetch(url, { redirect: 'follow' })
  if (!res.ok || !res.body) throw new Error('Non riesco a scaricare cloudflared')
  await new Promise<void>((ok, ko) => {
    const out = createWriteStream(BIN)
    const r = res.body!.getReader()
    const pump = () => r.read().then(({ done, value }) => { if (done) { out.end(); return } out.write(value); pump() }).catch(ko)
    out.on('finish', () => ok()); out.on('error', ko)
    pump()
  })
  if (platform() !== 'win32') chmodSync(BIN, 0o755)
}
/** apre il tunnel (se non è già aperto) e restituisce l'indirizzo pubblico */
export async function apriTunnel(porta = Number(process.env.PORT ?? 3123)): Promise<string> {
  if (tunnelUrl && tunnel && tunnel.exitCode === null) return tunnelUrl
  await scaricaCloudflared()
  tunnelUrl = null
  tunnel = spawn(BIN, ['tunnel', '--no-autoupdate', '--url', `http://127.0.0.1:${porta}`], { stdio: ['ignore', 'pipe', 'pipe'] })
  return new Promise((ok, ko) => {
    const t = setTimeout(() => ko(new Error('Il tunnel non si apre (controlla la connessione)')), 45000)
    const leggi = (b: Buffer) => { const m = b.toString().match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/); if (m && !tunnelUrl) { tunnelUrl = m[0]; clearTimeout(t); setTimeout(() => ok(tunnelUrl!), 4000) } }
    tunnel!.stdout?.on('data', leggi); tunnel!.stderr?.on('data', leggi)
    tunnel!.on('exit', () => { tunnelUrl = null })
  })
}

// ─── pubblicazione ──────────────────────────────────────────────────────────
const pausa = (ms: number) => new Promise(r => setTimeout(r, ms))
async function aspettaPronto(id: string) {
  for (let i = 0; i < 40; i++) {
    const j = await ig(id, { fields: 'status_code' }) as { status_code?: string }
    if (j.status_code === 'FINISHED') return
    if (j.status_code === 'ERROR' || j.status_code === 'EXPIRED') throw new Error(`Instagram non ha accettato un file (${j.status_code})`)
    await pausa(3000)
  }
  throw new Error('Instagram ci mette troppo a elaborare i video')
}

/** pubblica un carosello (2–10 elementi) o un elemento singolo; i file sono già in ~/.artista-osservatore/media */
export async function pubblica(file: string[], didascalia: string): Promise<{ id: string; permalink?: string }> {
  const c = leggiConf()
  if (!c.token || !c.userId) throw new Error('Instagram non è collegato')
  const base = await apriTunnel()
  const url = (f: string) => `${base}/api/studio-agent/media/${encodeURIComponent(f)}`
  const video = (f: string) => f.endsWith('.mp4')
  const caption = didascalia.slice(0, 2200)
  let contenitore: string
  if (file.length === 1) {
    const f = file[0]
    const j = await ig(`${c.userId}/media`, video(f) ? { media_type: 'REELS', video_url: url(f), caption } : { image_url: url(f), caption }, 'POST') as { id: string }
    contenitore = j.id
  } else {
    const figli: string[] = []
    for (const f of file.slice(0, 10)) {
      const j = await ig(`${c.userId}/media`, video(f) ? { media_type: 'VIDEO', video_url: url(f), is_carousel_item: 'true' } : { image_url: url(f), is_carousel_item: 'true' }, 'POST') as { id: string }
      figli.push(j.id)
    }
    for (const id of figli) await aspettaPronto(id)
    const j = await ig(`${c.userId}/media`, { media_type: 'CAROUSEL', children: figli.join(','), caption }, 'POST') as { id: string }
    contenitore = j.id
  }
  await aspettaPronto(contenitore)
  const pub = await ig(`${c.userId}/media_publish`, { creation_id: contenitore }, 'POST') as { id: string }
  const info = await ig(pub.id, { fields: 'permalink' }).catch(() => ({})) as { permalink?: string }
  return { id: pub.id, permalink: info.permalink }
}
