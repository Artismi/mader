/**
 * Chiamate ai servizi per il banco di confronto (solo Node: le chiavi non
 * vanno mai nella pagina). I modelli si leggono dagli elenchi dei servizi, non
 * si scrivono a mano: gli id vengono ritirati spesso.
 */
const GEMINI = 'https://generativelanguage.googleapis.com/v1beta'
const OPENROUTER = 'https://openrouter.ai/api/v1'
const OPENAI = 'https://api.openai.com/v1'

/** Il primo numero di versione nel nome ("gemini-3.1-flash-image" → 3.1). */
export const versione = id => Number(String(id).match(/(\d+(?:\.\d+)?)/)?.[1] ?? 0)

async function json(url, init = {}, ms = 180_000) {
  const r = await fetch(url, { ...init, signal: AbortSignal.timeout(ms) })
  const testo = await r.text()
  let j
  try { j = JSON.parse(testo) } catch { j = { error: { message: testo.slice(0, 300) } } }
  if (!r.ok || j.error) {
    const e = new Error(`${r.status} ${j.error?.message ?? j.error ?? ''}`.trim())
    e.status = r.status
    throw e
  }
  return j
}

/* ── elenchi dei modelli ──────────────────────────────────────────────── */
let cacheGemini, cacheOpenRouter
export async function modelliGemini(key) {
  cacheGemini ??= json(`${GEMINI}/models?pageSize=1000&key=${key}`).then(j => (j.models ?? [])
    .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
    .map(m => m.name.replace(/^models\//, '')))
  return cacheGemini
}
export async function modelliOpenRouter() {
  cacheOpenRouter ??= json(`${OPENROUTER}/models`).then(j => j.data)
  return cacheOpenRouter
}

/** Modelli d'immagine di Google, dal più recente: prima i non "lite", poi pro, poi i non anteprima. */
export async function immagineGoogle(key) {
  const tutti = (await modelliGemini(key)).filter(id => /image|banana/.test(id) && !/lite|tts/.test(id))
  const peso = id => (/banana/.test(id) ? 100 : 0) + versione(id) * 10 + (/pro/.test(id) ? 1 : 0) - (/preview/.test(id) ? 0.5 : 0)
  return tutti.sort((a, b) => peso(b) - peso(a))
}

/** Modelli GPT Image su OpenRouter, dal più recente (i "mini" in fondo). */
export async function immagineOpenRouter() {
  const tutti = (await modelliOpenRouter()).filter(m => m.id.startsWith('openai/') && m.architecture?.output_modalities?.includes('image'))
  const peso = m => versione(m.id.replace(/^openai\/gpt-/, '')) * 10 - (/mini/.test(m.id) ? 5 : 0)
  return tutti.sort((a, b) => peso(b) - peso(a)).map(m => m.id)
}

/** Modelli GPT Image con la chiave di OpenAI, dal più recente. */
export async function immagineOpenAI(key) {
  const j = await json(`${OPENAI}/models`, { headers: { Authorization: `Bearer ${key}` } })
  return j.data.map(m => m.id).filter(id => /^gpt-image/.test(id)).sort((a, b) => versione(b.replace('gpt-image-', '')) - versione(a.replace('gpt-image-', '')) || b.localeCompare(a))
}

/** Un modello con visione per famiglia su OpenRouter: il più recente non troppo caro (≤ 3 $ per milione di token). */
export async function visioneOpenRouter(famiglia) {
  const tutti = (await modelliOpenRouter()).filter(m => m.id.startsWith(`${famiglia}/`) && !m.id.includes(':')
    && m.architecture?.input_modalities?.includes('image') && m.architecture?.output_modalities?.join() === 'text'
    && !/pro|codex|nano|mini|guard|astra|chat|latest|thinking/.test(m.id) && Number(m.pricing?.prompt) > 0 && Number(m.pricing?.prompt) <= 3e-6)
  return tutti.sort((a, b) => versione(b.id.split('/')[1]) - versione(a.id.split('/')[1]) || Number(b.pricing.prompt) - Number(a.pricing.prompt))[0]?.id ?? null
}

/** Il Gemini con visione più recente della linea flash (non lite, non anteprima). */
export async function visioneGemini(key, escludi = []) {
  const tutti = (await modelliGemini(key)).filter(id => /^gemini-\d+(\.\d+)?-(flash|pro)$/.test(id) && !escludi.includes(id))
  return tutti.sort((a, b) => versione(b) - versione(a))
}

/* ── chiamate ─────────────────────────────────────────────────────────── */
const parteImmagine = img => ({ inline_data: { mime_type: img.mime, data: img.dati.toString('base64') } })
const dataUrl = img => `data:${img.mime};base64,${img.dati.toString('base64')}`

/** Immagine da Gemini. immagini: [{ mime, dati: Buffer }]. Restituisce { mime, dati } o lancia. */
export async function generaGemini(key, modello, prompt, immagini, formato) {
  const j = await json(`${GEMINI}/models/${modello}:generateContent?key=${key}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }, ...immagini.map(parteImmagine)] }],
      generationConfig: { responseModalities: ['TEXT', 'IMAGE'], imageConfig: { aspectRatio: formato } },
    }),
  }, 300_000)
  const p = j.candidates?.[0]?.content?.parts?.find(x => x.inlineData || x.inline_data)
  const d = p?.inlineData ?? p?.inline_data
  if (!d) throw new Error(`nessuna immagine nella risposta (${j.candidates?.[0]?.finishReason ?? 'senza motivo'})`)
  return { mime: d.mimeType ?? d.mime_type ?? 'image/png', dati: Buffer.from(d.data, 'base64') }
}

/** Immagine da un modello d'immagine su OpenRouter. */
export async function generaOpenRouter(key, modello, prompt, immagini, formato) {
  const j = await json(`${OPENROUTER}/chat/completions`, {
    method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', 'X-Title': 'Creative OS banco di confronto' },
    body: JSON.stringify({
      model: modello, modalities: ['image', 'text'], image_config: { aspect_ratio: formato },
      messages: [{ role: 'user', content: [{ type: 'text', text: prompt }, ...immagini.map(i => ({ type: 'image_url', image_url: { url: dataUrl(i) } }))] }],
    }),
  }, 300_000)
  const url = j.choices?.[0]?.message?.images?.[0]?.image_url?.url
  if (!url) throw new Error(`nessuna immagine nella risposta: ${String(j.choices?.[0]?.message?.content ?? '').slice(0, 160)}`)
  const m = url.match(/^data:([^;]+);base64,(.*)$/)
  if (m) return { mime: m[1], dati: Buffer.from(m[2], 'base64') }
  const r = await fetch(url)
  return { mime: r.headers.get('content-type') ?? 'image/png', dati: Buffer.from(await r.arrayBuffer()) }
}

/** Immagine dalla API di OpenAI: con la foto si usa "edits", senza "generations". Formati: solo 1:1 e 2:3. */
export async function generaOpenAI(key, modello, prompt, immagini, formato) {
  const size = formato === '1:1' ? '1024x1024' : '1024x1536'
  let j
  if (immagini.length) {
    const fd = new FormData()
    fd.set('model', modello); fd.set('prompt', prompt); fd.set('size', size)
    for (const [i, img] of immagini.entries()) fd.append('image[]', new Blob([img.dati], { type: img.mime }), `foto-${i}.${img.mime.split('/')[1]}`)
    j = await json(`${OPENAI}/images/edits`, { method: 'POST', headers: { Authorization: `Bearer ${key}` }, body: fd }, 300_000)
  } else {
    j = await json(`${OPENAI}/images/generations`, {
      method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: modello, prompt, size, n: 1 }),
    }, 300_000)
  }
  const b64 = j.data?.[0]?.b64_json
  if (!b64) throw new Error('nessuna immagine nella risposta')
  return { mime: 'image/png', dati: Buffer.from(b64, 'base64') }
}

/** Testo da Gemini con immagini (per la giuria). */
export async function chiediGemini(key, modello, prompt, immagini) {
  const j = await json(`${GEMINI}/models/${modello}:generateContent?key=${key}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }, ...immagini.map(parteImmagine)] }], generationConfig: { temperature: 0, responseMimeType: 'application/json' } }),
  })
  return (j.candidates?.[0]?.content?.parts ?? []).map(p => p.text ?? '').join('')
}

/** Testo da un modello con visione su OpenRouter (per la giuria). */
export async function chiediOpenRouter(key, modello, prompt, immagini) {
  const j = await json(`${OPENROUTER}/chat/completions`, {
    method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', 'X-Title': 'Creative OS banco di confronto' },
    body: JSON.stringify({ model: modello, temperature: 0, messages: [{ role: 'user', content: [{ type: 'text', text: prompt }, ...immagini.map(i => ({ type: 'image_url', image_url: { url: dataUrl(i) } }))] }] }),
  })
  return j.choices?.[0]?.message?.content ?? ''
}
