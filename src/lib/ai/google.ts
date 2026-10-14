import { createGoogleGenerativeAI } from '@ai-sdk/google'

/**
 * Gemini con la chiave di Google AI Studio, solo lato server.
 * La chiave va in .env.local come GEMINI_API_KEY (vale anche il nome
 * predefinito dell'SDK, GOOGLE_GENERATIVE_AI_API_KEY).
 */
export const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY,
})
