/**
 * Chiavi per gli script che usano il registro dei modelli (vetrina --idee-modello, banco):
 * le trova scripts/confronto/chiavi.mjs (.env.local e OpenRouter collegato nel database,
 * anche da un worktree) e qui si mettono nell'ambiente di questo processo. Mai stampate.
 * Restituisce solo quali fornitori sono disponibili.
 */
import { chiavi } from '../confronto/chiavi.mjs'

export async function caricaChiavi() {
  const k = await chiavi()
  if (k.gemini) { process.env.GEMINI_API_KEY ??= k.gemini; process.env.GOOGLE_GENERATIVE_AI_API_KEY ??= k.gemini }
  if (k.openrouter) process.env.OPENROUTER_API_KEY ??= k.openrouter
  return { google: !!k.gemini, openrouter: !!k.openrouter, anthropic: !!process.env.ANTHROPIC_API_KEY }
}
