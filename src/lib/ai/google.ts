import { createGoogleGenerativeAI } from '@ai-sdk/google'

/**
 * Gemini con la chiave di Google AI Studio, solo lato server.
 * La chiave va in .env.local come GEMINI_API_KEY (vale anche il nome
 * predefinito dell'SDK, GOOGLE_GENERATIVE_AI_API_KEY).
 */
if (process.env.GEMINI_API_KEY && !process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
  process.env.GOOGLE_GENERATIVE_AI_API_KEY = process.env.GEMINI_API_KEY
}

// Senza apiKey l'SDK legge GOOGLE_GENERATIVE_AI_API_KEY a ogni chiamata: così vale
// subito anche una chiave salvata dalla schermata Modelli (src/lib/ai/chiavi.ts)
export const google = createGoogleGenerativeAI({})
