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

const G = 'https://graph.instagram.com/v27.0'
export interface Conf { token?: string; userId?: string; username?: string; tokenDel?: number; upKey?: string; upUser?: string }
export const leggiConf = (): Conf => { try { return JSON.parse(readFileSync(CONF, 'utf8')) } catch { return {} } }
const scriviConf = (c: Conf) => writeFileSync(CONF, JSON.stringify(c, null, 2))

async function ig(path: string, params: Record<string, string> = {}, method: 'GET' | 'POST' = 'GET') {
  const c = leggiConf()
  const u = new URL(`${G}/${path}`)
  const body = new URLSearchParams({ ...params, access_token: c.token ?? '' })
  const res = method === 'GET' ? await fetch(`${u}?${body}`) : await fetch(u, { method: 'POST', body })
  const j = await res.json().catch(() => ({}))
  if (!res.ok || j.error) {
    const e = j.error ?? {}
    if (e.code === 190) throw new Error('Il token non vale più (scaduto o revocato): generane uno nuovo nella dashboard di Meta e incollalo qui.')
    if (e.code === 10 || e.code === 200) throw new Error(`Instagram nega il permesso (${e.message}). Controlla che il token sia stato generato con instagram_business_content_publish.`)
    if (e.code === 4 || e.code === 17 || e.code === 32 || e.code === 613) throw new Error('Troppe richieste a Instagram: riprovo più tardi.')
    if (e.code === 9 && /limit/i.test(e.message ?? '')) throw new Error('Raggiunto il limite di post nelle 24 ore.')
    const err = new Error(`${e.error_user_msg ?? e.message ?? `Instagram ha risposto ${res.status}`}${e.code ? ` [${e.code}${e.error_subcode ? '/' + e.error_subcode : ''}]` : ''}`) as Error & { scarico?: boolean }
    // Instagram non è riuscito a scaricare il file: quasi sempre il tunnel
    if (e.error_subcode === 2207052 || e.code === 9004 || /download|fetch|media uri/i.test(e.message ?? '')) err.scarico = true
    throw err
  }
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
  if (c.upKey && c.upUser) return { collegato: true, via: 'upload-post', username: c.upUser }
  if (!c.token) return { collegato: false, tunnel: tunnelUrl }
  await rinnovaSeServe()
  const me = await ig('me', { fields: 'user_id,username' }) as { user_id?: string; id?: string; username?: string }
  const userId = String(me.user_id ?? me.id)
  scriviConf({ ...leggiConf(), userId, username: me.username })
  const lim = await ig(`${userId}/content_publishing_limit`, { fields: 'quota_usage,config' }).catch(() => null) as { data?: { quota_usage?: number; config?: { quota_total?: number } }[] } | null
  const c2 = leggiConf()
  return { collegato: true, username: me.username, userId, tunnel: tunnelUrl, usati24h: lim?.data?.[0]?.quota_usage, limite24h: lim?.data?.[0]?.config?.quota_total, scade: c2.tokenDel ? new Date(c2.tokenDel + 60 * 86400e3).toISOString() : undefined }
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
  return { dati: readFileSync(p), tipo: p.endsWith('.mp4') ? 'video/mp4' : p.endsWith('.txt') ? 'text/plain' : 'image/jpeg' }
}

const pausa = (ms: number) => new Promise(r => setTimeout(r, ms))
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
  }).then(async (u) => {
    // prova dall'esterno: il tunnel deve servire davvero i file (a volte ci mette qualche secondo)
    const prova = `ok-${Date.now()}`
    writeFileSync(join(MEDIA, 'ping.txt'), prova)
    for (let i = 0; i < 12; i++) {
      const t = await fetch(`${u}/api/studio-agent/media/ping.txt`, { cache: 'no-store' }).then(r => (r.ok ? r.text() : '')).catch(() => '')
      if (t === prova) return u as string
      await pausa(2500)
    }
    throw new Error('Il tunnel si è aperto ma da internet non risponde (firewall o antivirus? prova a consentire cloudflared).')
  })
}
export function chiudiTunnel() { tunnel?.kill(); tunnel = null; tunnelUrl = null }

// ─── pubblicazione ──────────────────────────────────────────────────────────
/** aspetta che Instagram abbia scaricato ed elaborato tutti i file (i video possono metterci minuti) */
async function aspettaPronto(ids: string | string[], minuti = 12) {
  const resto = new Set(Array.isArray(ids) ? ids : [ids])
  const stati = new Map<string, string>()
  const fine = Date.now() + minuti * 60e3
  while (resto.size && Date.now() < fine) {
    for (const id of [...resto]) {
      const j = await ig(id, { fields: 'status_code,status' }) as { status_code?: string; status?: string }
      stati.set(id, `${j.status_code ?? '?'}${j.status ? ` (${j.status})` : ''}`)
      if (j.status_code === 'FINISHED') resto.delete(id)
      else if (j.status_code === 'ERROR' || j.status_code === 'EXPIRED') { const e = new Error(`Instagram non ha accettato un file: ${stati.get(id)}`) as Error & { scarico?: boolean }; e.scarico = true; throw e }
    }
    if (resto.size) await pausa(6000)
  }
  if (resto.size) throw new Error(`Instagram ci mette troppo a elaborare i video (${resto.size} non pronti: ${[...resto].map(i => stati.get(i)).join(', ')})`)
}

/** pubblica un carosello (2–20 elementi) o un elemento singolo; i file sono già in ~/.artista-osservatore/media */
export async function pubblica(file: string[], didascalia: string): Promise<{ id: string; permalink?: string }> {
  const c = leggiConf()
  if (!c.token || !c.userId) throw new Error('Instagram non è collegato')
  const lim = await ig(`${c.userId}/content_publishing_limit`, { fields: 'quota_usage,config' }).catch(() => null) as { data?: { quota_usage?: number; config?: { quota_total?: number } }[] } | null
  const usati = lim?.data?.[0]?.quota_usage ?? 0, tot = lim?.data?.[0]?.config?.quota_total ?? 50
  if (usati >= tot) throw new Error(`Limite raggiunto: ${usati}/${tot} post nelle ultime 24 ore. Riprovo più tardi.`)
  try { return await pubblicaCon(await apriTunnel(), file, didascalia) }
  catch (e) {
    if (!(e as { scarico?: boolean }).scarico) throw e
    // Instagram non riusciva a scaricare: riapro il tunnel e riprovo una volta
    chiudiTunnel()
    return pubblicaCon(await apriTunnel(), file, didascalia)
  }
}
async function pubblicaCon(base: string, file: string[], didascalia: string): Promise<{ id: string; permalink?: string }> {
  const c = leggiConf() as Required<Conf>
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
    for (const f of file.slice(0, 20)) {
      const j = await ig(`${c.userId}/media`, video(f) ? { media_type: 'VIDEO', video_url: url(f), is_carousel_item: 'true' } : { image_url: url(f), is_carousel_item: 'true' }, 'POST') as { id: string }
      figli.push(j.id)
    }
    await aspettaPronto(figli)
    const j = await ig(`${c.userId}/media`, { media_type: 'CAROUSEL', children: figli.join(','), caption }, 'POST') as { id: string }
    contenitore = j.id
  }
  await aspettaPronto(contenitore)
  const pub = await ig(`${c.userId}/media_publish`, { creation_id: contenitore }, 'POST') as { id: string }
  const info = await ig(pub.id, { fields: 'permalink' }).catch(() => ({})) as { permalink?: string }
  return { id: pub.id, permalink: info.permalink }
}

// ─── modo semplice: Upload-Post (upload-post.com) ───────────────────────────
// Upload-Post ha già la sua app Meta approvata: colleghi Instagram con un clic sul loro sito,
// copi la chiave API, e da qui gli mandiamo direttamente i file. Niente token Meta, niente tunnel.
const UP = 'https://api.upload-post.com/api'
export async function salvaUploadPost(key: string, user: string) {
  key = key.trim(); user = user.trim()
  if (!key || !user) { scriviConf({ ...leggiConf(), upKey: undefined, upUser: undefined }); return stato() }
  // la chiave è buona se il server la riconosce (uno stato inesistente risponde "non trovato", non "non autorizzato")
  const r = await fetch(`${UP}/uploadposts/status?request_id=prova-chiave`, { headers: { Authorization: `Apikey ${key}` } })
  if (r.status === 401 || r.status === 403) throw new Error('Upload-Post non riconosce questa chiave API.')
  scriviConf({ ...leggiConf(), upKey: key, upUser: user })
  return stato()
}
export async function pubblicaUploadPost(file: string[], didascalia: string): Promise<{ id: string; permalink?: string }> {
  const c = leggiConf()
  if (!c.upKey || !c.upUser) throw new Error('Upload-Post non è collegato')
  const fd = new FormData()
  fd.append('user', c.upUser)
  fd.append('platform[]', 'instagram')
  fd.append('title', didascalia.slice(0, 2200))
  fd.append('async_upload', 'true')
  for (const f of file.slice(0, 10)) {
    const m = leggiMedia(f)
    if (!m) throw new Error(`manca il file ${f}`)
    fd.append('photos[]', new Blob([new Uint8Array(m.dati)], { type: m.tipo }), f)
  }
  const res = await fetch(`${UP}/upload_photos`, { method: 'POST', headers: { Authorization: `Apikey ${c.upKey}` }, body: fd })
  const j = await res.json().catch(() => ({})) as { request_id?: string; success?: boolean; message?: string; error?: string; results?: Record<string, { url?: string; post_url?: string }> }
  if (res.status === 429) throw new Error('Upload-Post: limite raggiunto (piano gratuito: 10 post al mese; Instagram: 50 al giorno).')
  if (!res.ok) throw new Error(`Upload-Post: ${j.message ?? j.error ?? res.status}`)
  const id = j.request_id ?? ''
  // aspetta che Instagram l'abbia pubblicato (fino a 10 minuti)
  for (let i = 0; i < 60 && id; i++) {
    await pausa(10000)
    const s = await fetch(`${UP}/uploadposts/status?request_id=${encodeURIComponent(id)}`, { headers: { Authorization: `Apikey ${c.upKey}` } }).then(r => r.json()).catch(() => null) as { status?: string; message?: string; results?: { platform?: string; success?: boolean; message?: string; post_url?: string | null }[] } | null
    if (!s) continue
    const ri = s.results?.find(x => x.platform === 'instagram')
    if (s.status === 'completed' || ri?.success) { if (ri && ri.success === false) throw new Error(`Instagram: ${ri.message ?? 'non pubblicato'}`); return { id, permalink: ri?.post_url ?? undefined } }
    if (s.status === 'failed') throw new Error(`Upload-Post: ${s.message ?? ri?.message ?? 'non pubblicato'}`)
  }
  return { id }
}
