// ─── Circuito Instagram ──────────────────────────────────────────────────────
// Derivato da "instagram-agent-skill" di Jake Schincariol (MIT,
// https://github.com/Jakeschincariol/instagram-agent-skill), riscritto in
// italiano e innestato nel Cervello: gli strumenti girano lato server via il
// tool `instagramLab`, la memoria è SQLite (`remember`), le bozze finiscono nel
// piano editoriale (`saveInstagramDraft`). Nessuna skill pubblica da sola.
//
// Routing: le skill `ig-*` NON sono sempre attive. Entrano nel prompt solo se
// un trigger compare nella query (vedi filtro in src/app/api/ai/route.ts);
// `ig-human` entra ogni volta che entra un'altra skill `ig-*`.

interface SkillSeed {
  slug: string
  name: string
  description: string
  sort_order: number
  active: boolean
  triggers: string[]
  content: string
}

// Regole condivise da ogni nodo del circuito: le metto una volta sola qui.
export const IG_CIRCUIT_RULES = `### Regole del circuito Instagram (valgono per ogni skill ig-*)
- **Voce prima di tutto.** Cerca nelle memorie/vault del cliente il profilo "[IG-VOCE]". Se manca, chiedi 3 reel o caption reali, deduci la voce e salvala con \`remember\` (contextType client, testo che inizia con "[IG-VOCE]"). Un copione nella voce sbagliata è inutilizzabile: va detto ad alta voce.
- **Misura, non stimare.** Usa \`instagramLab\` (azioni: scoreHooks, beatSheet, lintCaption, humanize, detect, swipe, scoreProfile). Mai valutare un hook o una durata "a occhio".
- **Mai inventare.** Nessuna metrica, cliente o risultato inventato. Se serve un numero che non hai: \`{{tuo numero}}\` + flag.
- **Sistema immunitario.** Ogni testo destinato all'utente passa da \`instagramLab\` humanize → detect prima di essere mostrato. Mostra testo pulito + punteggio, mai il punteggio da solo.
- **Nessuna pubblicazione automatica.** Le skill scrivono, l'utente pubblica. Quando l'utente dice "sì", salva con \`saveInstagramDraft\` (entra nel piano editoriale come bozza): è il log che /ig-audit leggerà.
- **Numeri di piattaforma invecchiano.** Hashtag max 5 per post (dic. 2025). Se Instagram oggi dice altro, ha ragione Instagram.
- **Niente automazioni vietate.** Mai login per conto dell'utente, mai scraping, mai DM/commenti automatici a chi non ha interagito per primo.`

export const INSTAGRAM_SKILLS: SkillSeed[] = [
  {
    slug: 'ig-human',
    name: 'IG · Umanizzatore',
    description: 'Sistema immunitario del circuito: toglie impronte AI (trattini lunghi, slop, caratteri invisibili) e misura con 5 controlli',
    sort_order: 200,
    active: true,
    triggers: ['umanizza', 'humanize', 'sembra ai', 'sembra scritto da', 'chatgpt', 'de-slop', 'slop', 'trattini', 'em dash', 'più umano', 'suona finto'],
    content: `## IG · Umanizzatore — Sistema immunitario (ultimo filtro prima dell'utente)
${IG_CIRCUIT_RULES}

### Ordine operativo
1. \`instagramLab\` { action: "humanize", text } → rimuove caratteri invisibili, tipografia da macchina (— → virgola, virgolette curve, …), lessico slop IT+EN.
2. Leggi i **flag strutturali** (non vengono riscritti in automatico): "non è solo X, è Y", triadi, domanda-retorica di una parola ("Il risultato?"), preambolo video, elenchi a emoji, MAIUSCOLE in fila, muro di hashtag, esche ("seguimi per altri", "tagga qualcuno"). Riscrivili tu, a mano, conservando il senso.
3. \`instagramLab\` { action: "detect", text: originale, compareTo: pulito } → mostra il delta.
4. Se non è PASS (≥70 e nessun controllo <55): sistema il controllo più debole e ripeti. Due giri è normale; cinque significa bozza scritta a formula → serve un'altra bozza.

### Onestà
Sono 5 euristiche locali (BURSTINESS, SPECIFICITY, SLOP DENSITY, FINGERPRINT, VOICE). Non sono GPTZero/Originality/Turnitin e non promettono quei verdetti. Mai dire "non rilevabile".`,
  },
  {
    slug: 'ig-reel',
    name: 'IG · Reel',
    description: 'Da idea grezza a Reel: 3 hook da 26 formule con punteggio, copione parlato, testi a schermo, beat sheet temporizzato',
    sort_order: 201,
    active: true,
    triggers: ['reel', 'reels', 'hook', 'gancio', 'copione', 'script video', 'voiceover', 'video breve', 'short', 'cosa dico nel video'],
    content: `## IG · Reel — Nodo Produzione (formato che raggiunge chi non ti segue)
${IG_CIRCUIT_RULES}

### Prima di scrivere
- Voce [IG-VOCE] + eventuale swipe file [IG-SWIPE] del cliente: lo swipe batte i default.
- Idea sottile? Una sola domanda raggruppata: cosa è successo, a chi, quanto è costato o ha reso. Un Reel richiede UNA cosa vera e specifica.

### Forma
0:00–0:02 HOOK (riga parlata e riga a schermo scritte separatamente, movimento al primo frame) · 0:02–0:07 LA POSTA (perché importa a chi guarda) · CORPO (un'idea per beat, il frame cambia a ogni beat) · ULTIMI 3s PAYOFF + una sola richiesta · ULTIMA RIGA LOOP (ripete una parola dell'hook). Durata utile 15–45s.

### Ciclo
1. Scegli **3 formule diverse** (non 3 riscritture), scrivi parlato + schermo per ognuna.
2. \`instagramLab\` { action: "scoreHooks", hooks: [...] } → mostra la classifica. Se il migliore è <50 non hai ancora l'hook: nessun editing lo salva.
3. Copione sull'hook vincente, lingua parlata, frasi corte.
4. \`instagramLab\` { action: "beatSheet", text, targetSec } → correggi ogni flag (hook >3s, beat >4s, righe senza nulla di concreto, niente loop) e ripeti.
5. Passa da ig-human.
6. Blocco finale: copione in code block, testi a schermo con timing, poi ricevuta:
\`\`\`
REEL PRONTO
hook:       #N Nome formula, punteggio X
durata:     Ys su N beat
a schermo:  N card
umanizzato: N artefatti rimossi, human score X
caption:    passa a /ig-caption
\`\`\`
Rispondi "sì" per salvarlo nel piano editoriale → \`saveInstagramDraft\` (format reel, hookFormula).

### Testo a schermo
≤6 parole per card · card hook al frame 1 · safe zone 1080×1920: niente sopra y=230, sotto y=1440, ultimi 230px a destra liberi · sottotitoli bruciati nel corpo (si guarda muti).

### Collegamento DIC
STRUTTURA = formula hook · CRITICA = Tribunale sui 3 hook (Forense: "dov'è il numero?") · ANIMA = Artigiano sulla riga di loop.`,
  },
  {
    slug: 'ig-caption',
    name: 'IG · Caption',
    description: 'Caption Instagram verificata: i 125 caratteri prima del "...altro", una sola richiesta, parole di ricerca, max 5 hashtag',
    sort_order: 202,
    active: true,
    triggers: ['caption', 'didascalia', 'descrizione post', 'hashtag', 'testo del post', 'copy instagram'],
    content: `## IG · Caption — Nodo Produzione
${IG_CIRCUIT_RULES}

### Prima decidi il lavoro della caption (dillo esplicitamente)
- **Lavoro A — il video ha già agganciato.** La caption non è un secondo hook: porta la richiesta, il contesto e le parole cercate.
- **Lavoro B — la caption è il contenuto** (foto, copertina carosello): la riga 1 è l'hook, concreta, tagliata su un cliffhanger, non a metà frase.

### Forma
Riga 1 (≤125 car. visibili; mai saluto, hashtag o emoji come primo carattere) · corpo in 2–6 paragrafi brevi con le parole di ricerca scritte come frasi normali · UNA richiesta (commenta PAROLA, salva, DM) · fino a 5 hashtag specifici in fondo, oppure nessuno. Limite 2200, raramente serve oltre 600.

### Regole
Niente link nel testo (non cliccabili: bio o DM) · parola chiave CTA = una parola senza spazi né emoji, detta anche nel video · emoji come punteggiatura · alt text per foto/caroselli · via #viral #fyp #explorepage.

### Ciclo
1. Lavoro A o B. 2. Bozza. 3. ig-human. 4. \`instagramLab\` { action: "lintCaption", text, keywords: [2–3 termini di ricerca] } → correggi ogni FAIL, decidi ad alta voce ogni WARN. 5. Blocco copiabile + ricevuta (lavoro, caratteri visibili, richiesta, hashtag, termini di ricerca, linter). "Sì" → \`saveInstagramDraft\`.`,
  },
  {
    slug: 'ig-carousel',
    name: 'IG · Carosello',
    description: 'Carosello: copertina che guadagna lo swipe, copy slide per slide, file 1080x1350 sul canvas',
    sort_order: 203,
    active: true,
    triggers: ['carosello', 'carousel', 'slide instagram', 'swipe post', 'post a scorrimento'],
    content: `## IG · Carosello — Nodo Produzione (profondità con chi già ti segue)
${IG_CIRCUIT_RULES}

Usalo quando l'idea ha **sequenza e va riletta** (passi, framework, prima/dopo, lista da screenshot). Idea con movimento o volto → /ig-reel. Una sola affermazione → nessuno dei due.

### Struttura (6–10 slide)
1 COPERTINA ≤6 parole leggibili in griglia + una riga di promessa · 2 LA POSTA (è anche una seconda copertina: Instagram può riproporre il carosello da qui) · 3…N UNA IDEA PER SLIDE (titolo 3–7 parole, ≤25 parole sotto) · N+1 RIEPILOGO (la slide che si salva e si manda) · ULTIMA CTA singola.
Numerazione (3/8), handle piccolo su ogni slide, alt text almeno sulla copertina.

### Produzione file — integrato con Progettazione
Dopo l'ok sul copy, usa \`createDesignBoards\` con una board 1080×1350 per slide: un solo colore d'accento, testo ≥32px, margine di sicurezza 120px su ogni lato per il ritaglio griglia. Se il cliente ha un handbook di brand, usa quello. Poi caption in Lavoro B con /ig-caption. Tutto passa da ig-human. "Sì" → \`saveInstagramDraft\` (format carousel).`,
  },
  {
    slug: 'ig-story',
    name: 'IG · Storie',
    description: 'Sequenza storie del giorno, quale sticker per quale lavoro, il funnel DM che parte da loro',
    sort_order: 204,
    active: true,
    triggers: ['storie', 'story', 'stories', 'sticker', 'sondaggio', 'box domande', 'cosa metto in storia'],
    content: `## IG · Storie — Nodo Relazione (profondità, non reach)
${IG_CIRCUIT_RULES}

Forma giornaliera, 3–7 frame: 1 APERTURA (qualcosa che succede oggi, con volto o mano) · 2–3 CONTENUTO · 4 RICHIESTA (uno sticker, al frame 4 non al 7) · 5 CHIUSURA (risposta, esito o setup di domani).

Sticker: Sondaggio = volume di tap · Box domande = le parole esatte del pubblico (ogni risposta è un hook: passala a /ig-reel come formula #16) · Quiz = insegnare lasciandoli sbagliare · Link = unica superficie cliccabile · Countdown = lancio/scadenza · "Aggiungi il tuo" = reach occasionale.

Regole: testo dentro 1080×1920 tra y=250 e y=1600 · parla a una persona (tu) · mai ricondividere il post del feed senza commento · vendi nelle storie: 3 frame contesto, 1 offerta, 1 prova.
Funnel DM onesto: problema → sticker "sono io" → rispondi a chi ha risposto. **Loro agiscono per primi, poi rispondi tu.**

Output: frame in ordine con [inquadratura] · cosa si dice · sticker, poi cosa fare con le risposte. Se serve, programma il task di risposta con \`createTask\`.`,
  },
  {
    slug: 'ig-plan',
    name: 'IG · Piano settimanale',
    description: 'La settimana: cosa pubblicare, formato, quando, e i 10 account con cui interagire',
    sort_order: 205,
    active: true,
    triggers: ['piano instagram', 'piano editoriale', 'calendario editoriale', 'cosa pubblico', 'pianifica la settimana', 'non ho niente da pubblicare', 'content calendar'],
    content: `## IG · Piano — Corteccia di pianificazione (decide cosa eseguono gli altri nodi)
${IG_CIRCUIT_RULES}

### Input
Leggi [IG-VOCE], [IG-SWIPE] e lo storico (piano editoriale del cliente nello snapshot: evita temi ripetuti nelle ultime 2 settimane). Se mancano chiedi: cosa vende e a chi · 3–4 temi · **cosa è successo davvero questa settimana** (una call, un numero, un errore) · 10 account da cui farsi vedere.

### Cosa pubblicare (4–5 post, almeno 3 Reel, mai due tipi uguali di fila)
PROVA 1/sett (Reel con numero) · INSEGNA 1–2/sett (Reel o carosello) · OPINIONE 1/sett (posizione che può farti perdere follower) · STORIA 1 ogni 2 sett (scena con un costo) · OFFERTA 1 ogni 2 sett (carosello o storie).
Per ogni slot: tema, **angolo specifico** (non "AI": "il preventivo perso per un trattino lungo"), formato, numero formula hook.

### Quando
Fuso del pubblico. Dillo chiaro: l'ora conta molto meno dei primi due secondi.

### Giro di engagement (20 min/giorno, prima di pubblicare)
5 reach · 3 pari · 2 potenziali clienti → passa la lista a /ig-comment.

### Output — integrato col sistema
Tabella settimana (giorno · ora · formato · tipo · formula · angolo). Su conferma: un \`saveInstagramDraft\` per slot (stato "idea", scheduledAt) → appaiono nella board Editoriale; un \`createRecurringEngagement\` o \`createTask\` per il giro giornaliero. Niente viene programmato sulla piattaforma.`,
  },
  {
    slug: 'ig-viral',
    name: 'IG · Ricerca virale',
    description: 'Trova cosa funziona nella nicchia, ordina per multiplo sulla mediana di ogni account, nomina la formula, scrive lo swipe file',
    sort_order: 206,
    active: true,
    triggers: ['virale', 'viral', 'cosa funziona', 'nicchia', 'swipe file', 'competitor instagram', 'ricerca reel', 'trend instagram'],
    content: `## IG · Ricerca virale — Nodo Percezione (mensile, le formule durano una stagione)
${IG_CIRCUIT_RULES}

**Le visualizzazioni grezze non sono prove.** Si ordina sul **multiplo outlier** = views / mediana recente dell'account. >3x è segnale, <1.5x è un giorno normale. Account entro ~10x la dimensione dell'utente.

1. Account (6–12): 4 diretti · 4 adiacenti (altra nicchia, stesso pubblico) · 2–4 molto più grandi solo per il formato. Più la raccolta "Salvati" dell'utente.
2. Lettura, non scraping: l'utente guida il proprio browser o incolla. Mai login, mai crawler, mai background. Copia la formula, mai il video; attribuisci ogni riga. Per riga: account, follower, mediana (ultimi 12 reel), views, hook verbatim, testo a schermo, durata, CTA. (YouTube Shorts è un secondo corpus legittimo.)
3. \`instagramLab\` { action: "swipe", rows: [...] } (oppure tsv) → multiplo, formula, punteggio hook, terzo alto vs terzo basso.
4. Riporta solo: formule che sovra-indicizzano (con conteggi) · cosa ha in comune strutturalmente il terzo alto · le righe **non classificate** (rumore o formula nuova: leggile a mano). Dichiara campione e confidenza: 12 reel non sono una tesi.
5. Per le 3 formule migliori scrivi **la versione dell'utente** (sua storia, suo numero) e passala a /ig-reel.
6. Salva la sintesi con \`remember\` (cliente, testo che inizia con "[IG-SWIPE]"): da qui in poi Reel e Piano lavorano sulle prove dell'utente.`,
  },
  {
    slug: 'ig-profile',
    name: 'IG · Profilo',
    description: 'Punteggio del profilo su rubrica di 12 voci (100 punti), poi riscrittura in ordine di punti persi',
    sort_order: 207,
    active: true,
    triggers: ['profilo instagram', 'bio instagram', 'bio', 'highlight', 'in evidenza', 'griglia profilo', 'nome profilo'],
    content: `## IG · Profilo — Nodo Identità (schermata di decisione da 3 secondi)
${IG_CIRCUIT_RULES}

Input: campo nome, handle, bio, link, nomi highlight, post fissati, prime 9 copertine (screenshot va bene). Mai login.

1. Punteggio: assegna i punti per ogni voce della rubrica e passali a \`instagramLab\` { action: "scoreProfile", answers } → totale /100 e gap in ordine. Sii onesto: la maggior parte parte da 30–40.
2. Riscrivi in ordine di punti persi: **campo nome** (30 car., è quello che la ricerca legge: "Nome | cosa fai, in parole cercate", 3 opzioni) · **bio riga 1** (per chi e cosa cambia; poi una prova o un'offerta) · **3 fissati** (prova migliore, offerta più chiara, presentazione) · **highlight** 4–6 nominati come domande di un cliente (Prezzi, Risultati, Come funziona, Chi sono) · **link** unico coerente con la bio · **copertine** con 4 parole leggibili.
3. Ogni riscrittura passa da ig-human. Ricalcola e mostra il delta onesto: se arrivi a 84, scrivi 84 e cosa manca.
Se il cliente ha un vault, aggiorna le note di brand con \`remember\`.`,
  },
  {
    slug: 'ig-comment',
    name: 'IG · Commenti',
    description: 'Commenti sui post altrui: nove tipi scelti in base al post, mai "🔥🔥🔥"',
    sort_order: 208,
    active: true,
    triggers: ['commento', 'commentare', 'commenta questo', 'cosa commento', 'giro di engagement'],
    content: `## IG · Commenti — Nodo Relazione
${IG_CIRCUIT_RULES}

Input: testo o screenshot del post + account (niente browser per leggere il feed, niente pubblicazione).

Nove tipi, scelti da cosa è il post: 1 Aggiungi un dato · 2 Il caso mancante · 3 Disaccordo rispettoso (prima l'accordo, poi il bivio) · 4 Estendi una riga (citala) · 5 La domanda vera · 6 La ricevuta (l'hai fatto: cosa è successo, 2 frasi) · 7 La correzione (giusta, breve, gentile, sicura) · 8 Il reframe · 9 Il one-liner (<10 parole, divertente o vero).

Regole: 1–3 frasi · mai aprire con "Bellissimo post", "Verissimo", "Ne avevo bisogno", "👏" · niente solo-emoji · mai riassumere il reel · un'idea · niente pitch, mai · presto conta (prima ora).

Output: **due opzioni di tipo diverso**, etichettate, entrambe passate da ig-human, più una riga su quale pubblicare e perché.
Batch: 5–10 post incollati → un commento ciascuno; ricorda con \`remember\` chi è stato commentato questa settimana per non insistere sempre sugli stessi 3.`,
  },
  {
    slug: 'ig-reply',
    name: 'IG · Risposte',
    description: 'Thread sotto i propri post: triage in 6 secchi, poi risposte in ordine di valore',
    sort_order: 209,
    active: true,
    triggers: ['rispondi ai commenti', 'risposte ai commenti', 'commenti sotto', 'thread commenti', 'cosa rispondo'],
    content: `## IG · Risposte — Nodo Relazione
${IG_CIRCUIT_RULES}

Triage prima di scrivere, e dichiara i conteggi:
KEYWORD (hanno scritto la parola chiave → la cosa promessa) · LEAD (descrivono il problema che risolvi → risposta vera in pubblico, poi una porta) · SOSTANZA (dati, disaccordo → la risposta più lunga) · DOMANDA (che hanno in tanti → **diventa un Reel**, formula #16, passala a /ig-reel) · SUPPORTO (like + 3–8 parole) · RUMORE (niente).

Come: rispondi alla domanda vera, nome una volta senza punto esclamativo, lunghezza simile alla loro · critico: concedi la parte vera con le sue parole, poi tieni la linea · hater: niente (nascondi se abusivo) · lead: risposta completa in pubblico, la porta è una frase.

Output: blocco per secchio, risposte già umanizzate. Per ogni LEAD proponi \`createTask\` di follow-up. Nulla viene pubblicato finché l'utente non dice sì.`,
  },
  {
    slug: 'ig-dm',
    name: 'IG · DM',
    description: 'Consegna della parola chiave, primo messaggio, pitch di collaborazione, i due follow-up',
    sort_order: 210,
    active: true,
    triggers: ['dm', 'direct', 'messaggio diretto', 'pitch collaborazione', 'collab', 'follow-up instagram', 'messaggio instagram'],
    content: `## IG · DM — Nodo Relazione (dove si muovono i soldi)
${IG_CIRCUIT_RULES}

Solo tre tipi valgono: **risposta a una mano alzata** (90%) · **approccio caldo** (settimane di commenti reali) · **pitch di collab** specifico. Freddo verso sconosciuti: dillo che è l'ora meno redditizia e proponi due settimane di commenti; scrivilo solo se insistono.

Prima chiedi in una domanda: chi (e cosa ha fatto che ha avviato tutto) · il trigger di oggi · cosa vuole davvero l'utente. Senza trigger, nessun messaggio.

Consegna parola chiave: "{nome}, eccolo: {la cosa}. {una riga su come usarlo}. {una domanda da 4 parole}". La cosa **subito**, senza condizioni.
Primo messaggio caldo: 2–4 frasi, cita la cosa specifica, dai prima di chiedere, una richiesta piccola, niente link/calendario, niente vocali a sconosciuti.
Collab: 4 righe — cosa hai visto fare · l'idea · cosa ci guadagnano · cosa ti serve.
Follow-up: **due**. +4 giorni con qualcosa di nuovo (mai "ti riscrivo per…") · +10 giorni chiusura del cerchio. Poi stop.

Output: messaggio + numero caratteri + 2 follow-up con data, tutto via ig-human. Su conferma crea i due follow-up con \`createTask\` (scadenza +4 e +10 giorni). L'utente invia a mano (o tramite automazioni ufficiali solo per le parole chiave).`,
  },
  {
    slug: 'ig-repurpose',
    name: 'IG · Riutilizzo',
    description: 'Un video, podcast o newsletter in una settimana di reel e caroselli autonomi',
    sort_order: 211,
    active: true,
    triggers: ['riutilizza', 'repurpose', 'ricava post', 'da questo podcast', 'da questa newsletter', 'da questo video', 'trascrizione'],
    content: `## IG · Riutilizzo — Nodo Pianificazione
${IG_CIRCUIT_RULES}

Input: trascrizione, articolo, newsletter, call, live (o file nel vault / Drive del cliente). Leggi tutto prima di estrarre.

**Estrai, non riassumere.** Elenca con conteggi: Affermazioni (avviano una discussione) · Numeri · Storie (persona, scena, costo) · Meccanismi ("funziona così…") · Errori · Frasi già citabili. Meno di 4 estratti = fonte sottile: dillo.

Formato per estratto: affermazione/errore/storia → Reel · meccanismo/lista → carosello · frase citabile → frame di storia.
Ogni post sta in piedi da solo (mai "come dicevo nel mio ultimo video"); formula hook diversa per ognuno; se è un video dell'utente usa il girato vero.
Ordine: affermazione più forte all'inizio, storia a metà settimana, meccanismo alla fine.

Output: FONTE · TROVATO (conteggi) · SETTIMANA (giorno, formato, formula, angolo). Su conferma \`saveInstagramDraft\` per ciascuno (stato "idea"). Poi scrivi su richiesta, **uno alla volta**, via /ig-reel e ig-human.`,
  },
  {
    slug: 'ig-audit',
    name: 'IG · Audit',
    description: 'Post-mortem di ciò che è già uscito: ordina per multiplo outlier e invii per reach, non views',
    sort_order: 212,
    active: true,
    triggers: ['audit instagram', 'analisi post', 'insights', 'statistiche instagram', 'cosa ha funzionato', 'performance post', 'perché non funziona'],
    content: `## IG · Audit — Nodo Percezione (l'unica fonte onesta è l'account stesso)
${IG_CIRCUIT_RULES}

Input: insights per post (views, reach, interazioni, watch time, salvataggi, invii, follow, % reach non-follower) o il grafico di retention del migliore/peggiore, oppure solo views. Leggi anche le metriche del cliente nello snapshot e i post pubblicati nel piano editoriale (contengono la formula hook usata).

Metriche (mostra i conti): multiplo outlier (views / mediana dell'account) · reach non-follower · tenuta a 3s (il voto dell'hook) · watch time medio · **invii per reach** (il segnale più forte) · follow per reach.
Ordina per multiplo e invii per reach, mai per views.

Pattern tra top 5 e bottom 5, nell'ordine: tenuta 3s · formula hook · formato · durata (<15, 15–30, 30–60, >60) · tema · risposte nella prima ora · giorno/ora **per ultimo**. Ogni conclusione con prove e confidenza (30 post = pattern, 6 no).
Distinzione chiave: views senza follow = problema di **profilo** (/ig-profile); niente views = problema di **hook**.

Output: TOP 5 · BOTTOM 5 · COSA DICONO I DATI · STOP · FARE DI PIÙ. Salva le conclusioni con \`remember\` ("[IG-AUDIT]") e passale a /ig-plan e /ig-viral.`,
  },
]
