/**
 * Il nucleo di Creative OS (docs/sistema-centrale.md). Importare da qui:
 * carica tutti i domini, così il registro delle azioni è completo.
 */
export * from './actions'
export * from './domains/client'
export * from './domains/task'
export * from './domains/idea'
export * from './domains/post'
export * from './events'

import { wireEvents } from './events'
// ogni azione che cambia qualcosa lascia un evento e, se nasce da un nodo, il link di provenienza
wireEvents()
