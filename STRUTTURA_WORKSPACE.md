# Struttura — lo spazio di lavoro modulare ad albero

> Una sola schermata. Compare quello che serve. Ogni passaggio è un ramo, e ogni cosa sa da dove nasce.

---

## 1. Cinque concetti (e solo questi)

| Concetto | Cos'è |
|---|---|
| **Nodo** | Una cosa: cliente, messaggio, task, design, preventivo… Ha un tipo e un id (`client:42`). |
| **Modulo** | Il modo in cui un nodo si mostra. Lo stesso nodo ha 3 taglie: **chip** (nell'albero), **scheda** (nel contesto), **piena** (in focus). |
| **Ramo** | Il percorso che hai fatto: cliente → mail → risposta → task. È l'albero a sinistra. |
| **Traccia** | Il legame permanente "nasce da". Se dal messaggio crei un task, il task resta legato al messaggio per sempre. |
| **Lavoro** | Un ramo salvato con un nome ("Restyling Rossi"). Lo riapri e ritrovi tutto com'era. |

I due alberi da non confondere:
- **Ramo**: *come ci sei arrivato* (navigazione, temporaneo, salvabile).
- **Traccia**: *da cosa nasce cosa* (dati, permanente). Ogni volta che **crei** qualcosa da un nodo, il ramo lascia una traccia.

---

## 2. Lo schermo

```
┌──────────────────────────────────────────────────────────────────┐
│ ✦ artismi        [ Ctrl+K  apri · crea · chiedi ]   ● sync  SILENZIO │
├────────────┬──────────────────────────────────────┬──────────────┤
│ RAMO       │ ┌ CLIENTE ─ Rossi Srl ──── [AZIONE] ⋯┐│ CONTESTO     │
│            │ │                                    ││              │
│ ◇ Oggi     │ │       modulo in focus              ││ ▢ 3 messaggi │
│ └◇ Rossi   │ │       (uno solo)                   ││ ▢ 2 task     │
│   └◆ Mail  │ │                                    ││ ▢ scadenza   │
│     └◇ …   │ │                                    ││              │
│            │ ├────────────────────────────────────┤│  ✦ fissati   │
│ ─────────  │ │ RAMI POSSIBILI: + rispondi  + task ││              │
│ LAVORI ✦   │ │  + preventivo  + design            ││              │
└────────────┴──────────────────────────────────────┴──────────────┘
```

- **Sinistra: Ramo.** Si vede la posizione attuale (◆) e cliccando un nodo ci si torna. In fondo ci sono i *Lavori* salvati.
- **Centro: Focus.** Un solo modulo, a taglia piena.
- **Destra: Contesto.** Al massimo 3 schede scelte da sole, più quelle fissate (✦).
- **In fondo al focus: Rami possibili.** Le azioni che generano un figlio. È la parte più importante: invece di cercare un pulsante tra cento, vedi 3–5 passi successivi sensati per *quel* nodo.

### Varianti dello stesso schermo (non sono pagine diverse)
- **Immersivo** (`F`): albero e contesto si chiudono. Si usa per canvas, editor del Lancio e lettura lunga.
- **Affiancato** (`Shift+clic`): due moduli in focus fianco a fianco, per esempio una mail accanto alla risposta.
- **Panoramica** (`G`): l'intero grafo delle tracce, cioè l'attuale grafo nexus della Memoria.

---

## 3. Anatomia di un modulo

```
┌ TIPO ─ Titolo ─────────── ● stato ── [ AZIONE PRINCIPALE ] ⋯ ┐
│ corpo: solo l'essenziale                                     │
│ ▸ Dettagli   (espandibile)                                    │
│ ▸ Avanzate   (espandibile)                                    │
├───────────────────────────────────────────────────────────────┤
│ rami possibili:  + …   + …   + …                              │
└───────────────────────────────────────────────────────────────┘
```
- **Un'azione principale** (bottone ocra), sempre nella stessa posizione.
- **`⋯`** contiene tutte le altre azioni. Le stesse si trovano anche con `Ctrl+K`.
- **Mostrare per gradi.** Prima il corpo, poi "Dettagli", poi "Avanzate".
- Ogni tipo di modulo dichiara in un registro: taglie, azione principale, rami possibili e regole di contesto.

---

## 4. Regole: cosa compare e quando

| Evento | Effetto |
|---|---|
| Clic su un nodo dentro un modulo | Si apre **come figlio** e diventa il focus; il padre resta nel ramo |
| `Shift+clic` | Si apre affiancato |
| `Alt+clic` | Va nel contesto senza cambiare il focus |
| "Rami possibili" → crea | Crea il nodo, lo apre come figlio e **scrive la traccia** |
| Trascinare una scheda sul focus | Collega i due nodi (es. un file trascinato su un task) |
| `Ctrl+K` | Apre o crea qualsiasi cosa e la innesta nel ramo attivo |
| `Alt+←` / `Alt+→` | Su e giù nel ramo |
| Ramo più profondo di 6 | I livelli alti si comprimono in "…" |

**Scelta del contesto.** Per ogni nodo in focus si ordinano i nodi collegati per *urgenza* (scadenze, non letti), poi *traccia diretta*, poi *recenza*, e se ne mostrano 3. Ciò che fissi resta.

**L'AI** è un modulo come gli altri. Si apre nel contesto o con `Ctrl+K` → "chiedi", e riceve automaticamente **il ramo attivo** come contesto. Quando crea qualcosa, lascia una traccia marcata ✦.

---

## 5. Il tronco: "Oggi"
"Oggi" non è una dashboard da guardare: è il **punto di partenza dei rami**.
- **Da rispondere:** messaggi non letti, raggruppati per cliente.
- **In scadenza:** task, milestone, domini, preventivi in attesa.
- **In corso:** gli ultimi *Lavori* aperti, da riprendere con un clic.
- **Agenda:** gli eventi di oggi.
Ogni riga è un chip: con un clic diventa un ramo.

---

## 6. Tipi di nodo (dalle tabelle che esistono già)

| Famiglia | Tipi di nodo (tabella) | Rami possibili tipici |
|---|---|---|
| **Persone** | client, client_channels | + messaggio, + progetto, + preventivo, + nota |
| **Comunicazione** | messages, bookings, availability_slots | + rispondi (Lancio), + task, + evento |
| **Lavoro** | briefs, milestones, tasks, subtasks, deliverables | + subtask, + design, + consegna |
| **Studio** | design_projects, creative_assets | + variante, + esporta, + post |
| **Editoriale** | editorial_plans, editorial_posts, social_posts, post_analytics | + post, + programma, + analisi |
| **Memoria** | memories, ideas, file del vault | + idea, + collega a cliente |
| **Amministrazione** | quotes, domains | + PDF, + invia, + rinnova |
| *(Sistema)* | skills, system_config, user_tokens… | non sono nodi: stanno in Impostazioni (`Ctrl+K → impostazioni`) |

---

## 7. Dove finisce ogni sezione di oggi (nessuna funzione persa)

| Oggi (pagina) | Domani |
|---|---|
| Dashboard | Tronco "Oggi" |
| Inbox | Gruppo "Da rispondere" in Oggi + modulo messaggio |
| Lancio | Ramo "rispondi" di un messaggio (modulo editor, immersivo) |
| Calendario | Modulo agenda (in contesto o in focus) + nodi evento |
| Clienti | Nodo cliente (`Ctrl+K` → nome) |
| Incarichi | Nodi task; "tutti i task" è un modulo-lista filtrabile |
| Editoriale / Pubblica | Nodo piano editoriale → post |
| Progettazione / Studio | Nodo design → modulo canvas (immersivo, 3 modalità) |
| Assets | Modulo-lista asset; ogni asset è un nodo |
| Cervello / Memoria / Idee | Famiglia Memoria + Panoramica (`G`) |
| Finanze | Nodo preventivo (nasce da cliente o progetto) |
| Domini | Nodi dominio; le scadenze compaiono in Oggi |
| Overlay | Mini-versione: `Ctrl+K` + "Oggi" compatto |
| Settings | `Ctrl+K → impostazioni`, si apre come modulo |

I **moduli-lista** (tutti i task, tutti i clienti, tutti gli asset…) sono la rete di sicurezza: tutto resta raggiungibile anche senza un ramo.

---

## 8. Dati e stato

```sql
-- traccia permanente "nasce da / collegato a"
CREATE TABLE IF NOT EXISTS links (
  id TEXT PRIMARY KEY,
  from_ref TEXT NOT NULL,     -- 'message:abc'
  to_ref   TEXT NOT NULL,     -- 'task:xyz'
  rel      TEXT NOT NULL,     -- 'origin' | 'related' | 'attachment' | 'ai'
  created_at TEXT NOT NULL
);
-- rami salvati = Lavori
CREATE TABLE IF NOT EXISTS trails (
  id TEXT PRIMARY KEY,
  title TEXT,
  tree TEXT NOT NULL,         -- JSON: nodi del ramo, focus, fissati
  pinned INTEGER DEFAULT 0,
  updated_at TEXT NOT NULL
);
```
- Esiste già `memory_links`: va verificato se si può generalizzare invece di duplicarlo.
- **Stato di lavoro** in uno store zustand (`useWorkspace`): `ramo`, `focus`, `affiancato`, `contesto`, `fissati`, `modalità`.
- **URL** = `/?w=<trailId>&f=<nodeRef>`. Ricaricando l'app si torna esattamente al punto in cui eri.
- **Registro dei moduli** `modules/registry.ts`: `{ tipo → componente, taglie, azione principale, rami, regole di contesto }`.

---

## 9. Come ci arriviamo senza rompere niente
1. **Guscio:** workspace store, registro, layout a 3 colonne, `Ctrl+K`. Le vecchie rotte continuano a esistere.
2. **Adattatori:** ogni pagina attuale si **avvolge** in un modulo così com'è. Funziona subito, anche se è brutta.
3. **Tracce:** tabella `links` e "rami possibili" per i 4 tipi principali (cliente, messaggio, task, preventivo).
4. **Oggi** come tronco.
5. **Restyling modulo per modulo** con il design system, che sostituisce l'adattatore.
6. Spegnimento delle vecchie rotte quando nessuna è più usata.
