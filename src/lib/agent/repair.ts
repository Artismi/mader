/**
 * A1 (docs/cosa-manca.md): riparare, non sostituire. I modelli deboli spesso
 * sbagliano la forma della chiamata, non la sostanza: la scrivono come testo
 * (`<tool_call>` alla Hermes, `<default_api:…>` o `print(default_api.…)` alla
 * Gemini) oppure mandano JSON rotto. Tre analizzatori la recuperano:
 *
 *   - `parseHermes`  → `<tool_call>{"name":…,"arguments":{…}}</tool_call>`
 *   - `parseGemini`  → `<default_api:nome a="1"/>`, `print(default_api.nome(a=1))`
 *   - `repairJson`   → apici singoli, chiavi senza virgolette, True/None,
 *                      virgole finali, parentesi non chiuse, recinti ```json
 *
 * `createToolCallRepair` li usa dentro `experimental_repairToolCall` dell'AI
 * SDK (nome con prefisso, ingresso non valido); `parseTextToolCalls` serve a
 * runAgent per le chiamate rimaste nel testo. Il modello si cambia solo dopo
 * la seconda riparazione fallita (`RepairBudget`).
 */
import { InvalidToolInputError, NoSuchToolError, type ToolCallRepairFunction, type ToolSet } from 'ai'

export interface TextToolCall { toolName: string; input: Record<string, unknown> }

/* ── JSON rotto ────────────────────────────────────────────────────────── */

const PY: Record<string, string> = { True: 'true', False: 'false', None: 'null' }

/** Rende JSON valido un testo "quasi JSON". `undefined` se non c'è niente da salvare. */
export function repairJson(raw: string): unknown {
  let s = raw.trim().replace(/^```[a-z]*\s*/i, '').replace(/```\s*$/, '').trim()
  if (!s) return {}
  try { return JSON.parse(s) } catch { /* si ripara */ }
  const start = s.search(/[{[]/)
  if (start < 0) return undefined
  s = s.slice(start)
  let out = ''
  const stack: string[] = []
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]
    if (ch === '"' || ch === "'") {
      // stringa: si riscrive sempre tra virgolette doppie
      let j = i + 1, body = ''
      while (j < s.length && s[j] !== ch) {
        if (s[j] === '\\' && j + 1 < s.length) { body += s[j] + s[j + 1]; j += 2; continue }
        body += ch === "'" && s[j] === '"' ? '\\"' : s[j]
        j++
      }
      out += `"${ch === "'" ? body.replace(/\\'/g, "'") : body}"`
      i = j
      continue
    }
    if (ch === '{' || ch === '[') { stack.push(ch === '{' ? '}' : ']'); out += ch; continue }
    if (ch === '}' || ch === ']') {
      if (!stack.length) break // testo dopo la fine dell'oggetto
      out = out.replace(/,\s*$/, '') + stack.pop()
      if (!stack.length) break
      continue
    }
    const word = /^[A-Za-z_$][\w$]*/.exec(s.slice(i))?.[0]
    if (word) {
      const next = s.slice(i + word.length).match(/^\s*:/)
      out += next ? `"${word}"` : (PY[word] ?? word)
      i += word.length - 1
      continue
    }
    out += ch
  }
  out = out.replace(/,\s*$/, '')
  while (stack.length) out += stack.pop()
  try { return JSON.parse(out) } catch { return undefined }
}

const asObject = (v: unknown): Record<string, unknown> | undefined =>
  v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : undefined

/* ── formato Hermes ────────────────────────────────────────────────────── */

export function parseHermes(text: string): TextToolCall[] {
  const out: TextToolCall[] = []
  for (const m of text.matchAll(/<(tool_call|function_call)>([\s\S]*?)(?:<\/\1>|$)/gi)) {
    const o = asObject(repairJson(m[2]))
    const name = o && (o.name ?? (asObject(o.function)?.name))
    if (!o || typeof name !== 'string') continue
    let args = o.arguments ?? o.parameters ?? asObject(o.function)?.arguments ?? {}
    if (typeof args === 'string') args = repairJson(args) ?? {}
    out.push({ toolName: name, input: asObject(args) ?? {} })
  }
  return out
}

/* ── formato Gemini ────────────────────────────────────────────────────── */

/** `a="x", n=3, f=True, l=[1, 2]` → oggetto (divide solo sulle virgole di primo livello). */
function parseKwargs(src: string): Record<string, unknown> | undefined {
  const parts: string[] = []
  let depth = 0, quote = '', cur = ''
  for (const ch of src) {
    if (quote) { if (ch === quote) quote = ''; cur += ch; continue }
    if (ch === '"' || ch === "'") quote = ch
    else if ('([{'.includes(ch)) depth++
    else if (')]}'.includes(ch)) depth--
    if (ch === ',' && depth === 0) { parts.push(cur); cur = ''; continue }
    cur += ch
  }
  if (cur.trim()) parts.push(cur)
  const out: Record<string, unknown> = {}
  for (const p of parts) {
    const m = /^\s*([A-Za-z_]\w*)\s*=\s*([\s\S]*)$/.exec(p)
    if (!m) return undefined
    const v = m[2].trim()
    const parsed = repairJson(`{"v": ${v}}`) as { v?: unknown } | undefined
    out[m[1]] = parsed && 'v' in parsed ? parsed.v : v.replace(/^['"]|['"]$/g, '')
  }
  return out
}

function attrValue(v: string): unknown {
  try { return JSON.parse(v) } catch { return v }
}

export function parseGemini(text: string): TextToolCall[] {
  const out: TextToolCall[] = []
  // <default_api:nome a="1" b="due"/> oppure <default_api:nome>{json}</default_api:nome>
  for (const m of text.matchAll(/<\s*default_api[:.](\w+)([^>]*?)\/?>(?:([\s\S]*?)<\/\s*default_api[:.]\1\s*>)?/g)) {
    const input: Record<string, unknown> = {}
    for (const a of m[2].matchAll(/(\w+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'/>]+))/g)) input[a[1]] = attrValue(a[2] ?? a[3] ?? a[4])
    const body = m[3]?.trim()
    if (body) Object.assign(input, asObject(repairJson(body)) ?? {})
    out.push({ toolName: m[1], input })
  }
  // print(default_api.nome(a=1)) dentro ```tool_code o nel testo
  for (const m of text.matchAll(/default_api\.(\w+)\(([\s\S]*?)\)\s*\)?\s*(?:\n|```|$)/g)) {
    const input = parseKwargs(m[2])
    if (input) out.push({ toolName: m[1], input })
  }
  return out
}

/* ── insieme ───────────────────────────────────────────────────────────── */

/** Nome scritto dal modello → nome vero (prefissi `default_api:`, `functions.`, maiuscole). */
export function matchToolName(name: string, names: string[]): string | undefined {
  if (names.includes(name)) return name
  const bare = name.replace(/^(default_api|functions|tools?)[:.]/i, '').trim()
  return names.find(n => n === bare) ?? names.find(n => n.toLowerCase() === bare.toLowerCase())
}

/**
 * Chiamate scritte nel testo, riconosciute con tutti gli analizzatori e
 * limitate agli strumenti che esistono. `scritte` dice se il testo ne conteneva
 * (anche quelle che non si sono potute leggere: sono le riparazioni fallite).
 */
export function parseTextToolCalls(text: string, names: string[]): { chiamate: TextToolCall[]; scritte: boolean } {
  const scritte = /<\s*(default_api[:.]|tool_call\b|function_call\b)|```tool_code|\bdefault_api\.\w+\(/i.test(text)
  const chiamate: TextToolCall[] = []
  for (const c of [...parseHermes(text), ...parseGemini(text)]) {
    const toolName = matchToolName(c.toolName, names)
    if (toolName) chiamate.push({ toolName, input: c.input })
  }
  return { chiamate, scritte }
}

/** Conta le riparazioni fallite: alla seconda si cambia modello. */
export interface RepairBudget { riuscite: number; fallite: number; readonly esaurito: boolean; ok(): void; ko(): void }

export function createRepairBudget(max = 2): RepairBudget {
  return {
    riuscite: 0,
    fallite: 0,
    get esaurito() { return this.fallite >= max },
    ok() { this.riuscite++ },
    ko() { this.fallite++ },
  }
}

/**
 * `experimental_repairToolCall`: nome con prefisso o sbagliato di maiuscole,
 * ingresso in JSON rotto o avvolto in un `<tool_call>`. Non chiama un altro
 * modello (costa): ripara a regole, altrimenti `null` e il modello riceve
 * l'errore per correggersi da solo.
 */
export function createToolCallRepair(budget?: RepairBudget, log?: (s: string) => void): ToolCallRepairFunction<ToolSet> {
  return async ({ toolCall, tools, error }) => {
    const names = Object.keys(tools)
    // il fallimento lo conta chi guida il ciclo, dalle chiamate `invalid` dei passi (anche quelle riparate male)
    const fail = (why: string) => { log?.(`riparazione fallita (${toolCall.toolName}): ${why}`); return null }
    let toolName = toolCall.toolName
    if (NoSuchToolError.isInstance(error)) {
      const found = matchToolName(toolName, names)
      if (!found) return fail('strumento inesistente')
      toolName = found
    } else if (!InvalidToolInputError.isInstance(error)) return fail('errore sconosciuto')
    const raw = typeof toolCall.input === 'string' ? toolCall.input : JSON.stringify(toolCall.input ?? {})
    let input = asObject(repairJson(raw))
    // l'intera chiamata Hermes messa nell'ingresso: {"name":…,"arguments":{…}}
    const wrapped = input && typeof input.name === 'string' && matchToolName(input.name, names) === toolName ? asObject(input.arguments) : undefined
    if (wrapped) input = wrapped
    if (!input) return fail('ingresso illeggibile')
    const fixed = JSON.stringify(input)
    if (fixed === raw && toolName === toolCall.toolName) return fail('niente da riparare (schema non rispettato)')
    budget?.ok()
    log?.(`riparata ${toolCall.toolName}${toolName !== toolCall.toolName ? ` → ${toolName}` : ''}`)
    return { ...toolCall, toolName, input: fixed }
  }
}
