# Progettazione — navigazione e gerarchia

> Prima la struttura, poi lo stile. Questo documento sostituisce la parte di layout di `STRUTTURA_WORKSPACE.md`: il modello dati (nodi, tracce "nasce da") resta valido, la schermata a 3 colonne no.

---

## 1. I compiti (ricavati da quello che l'app fa oggi)

| # | Compito | Frequenza | Dove avviene oggi | Problema oggi |
|---|---|---|---|---|
| 1 | **Iniziare la giornata**: cosa richiede attenzione | ogni giorno | Dashboard | troppi widget, nessun ordine |
| 2 | **Rispondere a un cliente** (anche fissare appuntamento) | più volte al giorno | Inbox → Lancio | due sezioni separate per un solo gesto |
| 3 | **Seguire un cliente**: progetti, task, messaggi, file, preventivi | ogni giorno | Clienti + 5 altre sezioni | le informazioni di un cliente sono sparse |
| 4 | **Gestire task e scadenze** | ogni giorno | Incarichi, Calendario, Domini | tre posti diversi per "cosa scade" |
| 5 | **Progettare** (canvas, effetti, export) | spesso, a lungo | Progettazione / Studio | interfaccia piena di controlli |
| 6 | **Preventivo → invio** | settimanale | Finanze | scollegato da cliente e mail |
| 7 | **Piano contenuti social** | settimanale | Editoriale / Pubblica | doppione |
| 8 | **Ritrovare** note, idee, file | quando serve | Memoria / Cervello / Idee / Assets | quattro posti |
| 9 | **Chiedere all'AI** su ciò che sto guardando | spesso | widget chat flottante | non sa cosa sto guardando |

---

## 2. Mappa di navigazione

```
BARRA LATERALE (sempre uguale, silenziosa)
│
├── Oggi            ← si apre qui. Compito 1
├── Messaggi        ← Inbox. La risposta si scrive NELLA mail (Lancio sparisce come sezione). Compito 2
├── Clienti         ← lista → scheda cliente con tutto dentro. Compiti 3, 6, 7
├── Lavori          ← tutti i task e le scadenze: viste Lista · Calendario. Compito 4
├── Studio          ← design e asset. Il canvas si apre a schermo pieno. Compito 5
├── Archivio        ← note, idee, file del vault, con ricerca. Compito 8
│
└── (in basso) Amministrazione (preventivi, domini) · Impostazioni

SEMPRE DISPONIBILI
├── Ctrl+K          ← cerca qualsiasi cosa / fai qualsiasi azione
└── "Chiedi"        ← AI in pannello laterale, legge la pagina aperta. Compito 9
```

**Dove finisce ogni sezione di oggi:**

| Oggi | Domani |
|---|---|
| Dashboard | Oggi |
| Inbox + Lancio | Messaggi (risposta dentro la mail) |
| Clienti | Clienti → scheda cliente |
| Incarichi + Calendario + scadenze Domini | Lavori |
| Editoriale + Pubblica | Scheda cliente → scheda "Contenuti" (+ vista globale in Lavori) |
| Finanze | Scheda cliente → "Preventivi" (+ elenco in Amministrazione) |
| Progettazione + Studio + Assets | Studio |
| Memoria + Cervello + Idee | Archivio |
| Domini | Amministrazione (le scadenze compaiono in Oggi/Lavori) |
| Settings / Skill | Impostazioni |

Da ~20 voci a **6 + 2**.

**Il "ramo" diventa un percorso** in cima alla pagina: `Clienti › Rossi Srl › Mail "Preventivo logo"`. Un clic su un pezzo e torni lì. La traccia "da cosa nasce cosa" resta nei dati e si vede **dentro** le pagine ("Nato da: mail del 12/10").

---

## 2b. Il blocco che si trasforma (decisione dell'utente, 2026-10-09)
> Prototipo: `public/blocchi.html`. Superati `wireframe.html` (pagine) e `pannelli.html` (fila di pannelli).

- **Un solo blocco principale.** Quando vai avanti, il contenuto precedente sparisce: niente file, niente strisce.
- **← indietro** risale la *catena logica* (`Oggi › Preventivo logo › Risposta`). Ogni passo **conserva la memoria**: posizione di scroll, bozza, riga da cui eri entrato (evidenziata al ritorno).
- **Passo simile → il blocco si trasforma.** Cambia stato e funzione, ma resta lo stesso blocco:
  - elenco → elemento;
  - mail → risposta (la mail resta citata in alto);
  - cliente → progetto → task.

  I *contenitori* (elenchi, cliente, progetto) si trasformano sempre nei loro elementi.
- **Passo diverso → blocco accessorio accanto.** Esempi: dalla mail, *Proponi appuntamento* apre il calendario; *Prepara preventivo* apre il preventivo; il nome del cliente apre la sua scheda. Il principale non cambia.
  - Al massimo **2 accessori** aperti insieme.
  - Ogni accessorio ha due comandi: ✕ chiude, ⤢ lo **porta al centro**, e da lì la catena continua.
- **Famiglie** (in base alla famiglia si decide "simile" o "diverso"):

  | Famiglia | Contenuto |
  |---|---|
  | comunicazione | mail, risposta, messaggi |
  | lavoro | progetto, task |
  | persone | clienti |
  | studio | design |
  | strumenti | calendario, preventivo |

- **Tastiera:** `Alt+←` torna indietro; `Esc` chiude prima l'accessorio, poi torna indietro.

**Domande aperte:**
1. Il design (Studio) si trasforma nel blocco principale a tutto schermo, o resta un accessorio?
2. Gli accessori stanno a destra in colonna (come nel prototipo) o sotto?
3. La barra laterale resta, o diventa anche lei un punto di partenza dentro "Oggi"?

---

## 3. Lo scheletro di ogni pagina (sempre identico)

```
┌────────────┬─────────────────────────────────────────────────┐
│            │ percorso piccolo grigio                         │
│  barra     │ TITOLO GRANDE                 [Azione principale]│
│  laterale  │ una riga di contesto grigia                     │
│            │                                                 │
│            │ (schede, se servono)                            │
│            │                                                 │
│            │ CONTENUTO                                       │
│            │                                                 │
└────────────┴─────────────────────────────────────────────────┘
```

- Il titolo è **l'unica cosa grande**.
- L'azione principale è **sempre in alto a destra**, sempre lì. **Una sola** per pagina.
- Le altre azioni stanno nel menu `⋯` accanto e in `Ctrl+K`.
- Il pannello laterale (AI, dettagli) è **chiuso** finché non lo apri.

---

## 4. Regole di gerarchia (perché l'occhio sappia dove andare)

1. **Un solo punto di attenzione per schermata**, cioè la cosa su cui lavori. Va scritto per ogni pagina (vedi §5).
2. **Tre livelli soltanto:**
   - **1° livello:** titolo e contenuto principale. Grande, scuro.
   - **2° livello:** navigazione e voci di elenco. Normale.
   - **3° livello:** date, stati, conteggi. Piccolo, grigio.
3. **La gerarchia si fa con dimensione, peso e spazio.** Mai con bordi spessi o maiuscolo ovunque.
4. **Neutri ovunque.** Il colore si usa solo per l'azione principale e gli stati urgenti (scaduto, da rispondere). Se tutto è colorato, niente lo è.
5. **Lo spazio raggruppa.** Si usano poche scatole, separatori sottili e righe al posto delle card.
6. **Elenchi prima delle griglie di card.** Una lista si legge dall'alto in basso; una griglia di card no.
7. **Al massimo 7 voci** in ogni gruppo visibile.

---

## 5. Le 4 schermate chiave: dove deve andare l'occhio

| Schermata | 1° sguardo (deve essere questo) | 2° | Azione principale |
|---|---|---|---|
| **Oggi** | La prima voce di "Da fare adesso" | agenda di oggi | — (nessuna: si parte dalle voci) |
| **Scheda cliente** | Nome del cliente + la sua "prossima cosa" | schede Lavori · Messaggi · File · Preventivi · Contenuti | Nuovo… (menu) |
| **Mail + risposta** | Il testo della mail | la risposta, che si apre sotto | Rispondi / Invia |
| **Studio (canvas)** | Il disegno | pochi strumenti ai bordi | Esporta |

Il test: si guarda ogni wireframe per 5 secondi. Se l'occhio non cade sulla colonna "1° sguardo", la schermata si rifà.

---

## 6. Prossimi passi
1. Wireframe grigi cliccabili delle 4 schermate (`public/wireframe.html`, provvisorio).
2. Test dei 5 secondi con te e correzioni.
3. Solo dopo: lo stile visivo, deciso insieme.
