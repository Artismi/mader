"""
CanvasCrew — Pipeline completa per generazione canvas Fabric.js.
5 agenti sequenziali: Brief Enricher → Layout Architect → Asset Curator → Canvas Board Generator → Quality Critic

Gemini 2.5 Flash (free tier):
  - 10 RPM / 250 RPD per chiamata
  - Una crew completa = 5 chiamate (più retry = max 15)

Output finale: JSON boards[] compatibile con createDesignBoards (Fabric.js canvas schema).
"""

import os
import time
import json
import logging
import re
from pathlib import Path

from crewai import Agent, Task, Crew, Process, LLM
from crewai.knowledge.source.text_file_knowledge_source import TextFileKnowledgeSource
from crewai.knowledge.source.json_knowledge_source import JSONKnowledgeSource

from tools.db_tools import (
    read_client_handbook,
    search_vault,
    search_memories,
    get_font_pair,
    get_oklch_palette,
    get_design_recipes,
    generate_image,
    remove_background,
    list_client_assets,
    generate_office_document,
    audit_workspace,
    python_executor,
    solve_layout_math,
)

logger = logging.getLogger(__name__)

KNOWLEDGE_DIR = Path(__file__).parent.parent / "knowledge"

# ── LLM Instances ─────────────────────────────────────────────────────────────

def make_gemini_flash() -> LLM:
    return LLM(
        model="gemini/gemini-2.5-flash",
        api_key=os.getenv("GEMINI_API_KEY"),
        temperature=0.75,
    )

def make_gemini_flash_lite() -> LLM:
    return LLM(
        model="gemini/gemini-2.5-flash-8b",  # Flash-Lite / 8B: 1000 RPD free
        api_key=os.getenv("GEMINI_API_KEY"),
        temperature=0.2,
    )

# ── Knowledge Sources ─────────────────────────────────────────────────────────

def _load_knowledge():
    """Carica la progettista bible (layout rules)."""
    sources = []
    try:
        bible_path = KNOWLEDGE_DIR / "progettista_bible.txt"
        if bible_path.exists():
            sources.append(TextFileKnowledgeSource(file_paths=[str(bible_path)]))
    except Exception as e:
        logger.warning("Knowledge source progettista_bible non caricata: %s", e)
    return sources or None


def _load_tools_knowledge():
    """Carica la canvas tools reference (effetti, font, procedurali, shapes)."""
    sources = []
    try:
        tools_path = KNOWLEDGE_DIR / "canvas_tools_reference.txt"
        if tools_path.exists():
            sources.append(TextFileKnowledgeSource(file_paths=[str(tools_path)]))
    except Exception as e:
        logger.warning("Knowledge source canvas_tools_reference non caricata: %s", e)
    try:
        skills_path = KNOWLEDGE_DIR / "design_skills.json"
        if skills_path.exists():
            sources.append(JSONKnowledgeSource(file_paths=[str(skills_path)]))
    except Exception as e:
        logger.warning("Knowledge source design_skills non caricata: %s", e)
    try:
        fonts_path = KNOWLEDGE_DIR / "font_pairs.json"
        if fonts_path.exists():
            sources.append(JSONKnowledgeSource(file_paths=[str(fonts_path)]))
    except Exception as e:
        logger.warning("Knowledge source font_pairs non caricata: %s", e)
    return sources or None


# ── Agenti ────────────────────────────────────────────────────────────────────

def build_brief_enricher(context_snapshot: str) -> Agent:
    return Agent(
        role="Tenente × Brief Enricher — DIC Vanguard Intelligence",
        goal=(
            "PRIMA DI AGIRE — scomponiti l'input e pianifica:\n"
            "  D1: Il brief e' chiaro o ambiguo? Cosa manca davvero?\n"
            "  D2: Chi e' il cliente? Ho un handbook nel vault? Cosa dire all'Alchimista dopo di me?\n"
            "  D3: Qual e' il modo piu' ovvio e sbagliato di interpretare questo brief? Come lo evito?\n"
            "  D4: Cosa assumo autonomamente VS cosa chiedo all'utente?\n"
            "  PIANO: [rispondo mentalmente alle domande, poi eseguo]\n"
            "\n"
            "Emettere un SITREP militare che trasforma il caos del brief in ordini operativi precisi. "
            "STEP 1 — SITREP OBBLIGATORIO: "
            "'Mission Objective' (1 frase imperativa: cosa stiamo risolvendo davvero), "
            "'Target Profile' (il pregiudizio inconscio dell'audience che dobbiamo colpire), "
            "'Vettori d'Attacco' (quali mood/stili guidano il canvas), "
            "'Vincoli Critici' (cosa non si puo' sbagliare — il punto di fallimento). "
            "STEP 3 — ANALISI DELLA TENSIONE: identifica la 'CONTRADDIZIONE CONCETTUALE' (es. Luxury vs Punk, Tech vs Nature). "
            "Se trovi una tensione o se il brief richiede profondità emotiva, imposta 'stratification_needed': true.\n"
            "STEP 4 — Compilare tutti i campi obbligatori del brief_json.\n\n"
            "FORMATO OUTPUT — brief_json:\n"
            "{\n"
            '  "conceptual_tension": "Descrizione del conflitto (es. Ordine vs Caos)",\n'
            '  "stratification_needed": boolean,\n'
            '  "font_mood": "...",\n'
            '  "palette": {...},\n'
            '  "domande_aperte": [],\n'
            '  "auto_assunzioni": []\n'
            "}"
        ),
        backstory=(
            f"Sei il Tenente del Design Intelligence Council e il 'Workspace Watcher' di v3.0. "
            f"Agisci come Vanguard Intelligence: prima di pianificare, scansiona chirurgicamente "
            f"la sandbox con audit_workspace per vedere cosa hanno prodotto i colleghi o l'utente. "
            f"Non operare alla cieca. Se trovi file di progetto esistenti, integrali nel SITREP. "
            f"Snapshot operativo attuale:\n{context_snapshot}\n\n"
            "Fondi il ruolo del Bibliotecario: estrai il DNA vivo (palette OKLCH, font stack, tone) "
            "e inietta questi token nelle istruzioni per gli agenti successivi. "
            "Un brief vago produce un canvas vuoto. Un SITREP basato sull'audit produce un'opera inattaccabile."
        ),
        tools=[read_client_handbook, search_vault, search_memories, get_oklch_palette, generate_conceptual_schema, audit_workspace],
        llm=make_gemini_flash(),
        verbose=True,
        max_iter=3,
        allow_delegation=False,
    )



def build_artboard_curator(context_snapshot: str = "") -> Agent:
    """Il Curatore di Tavole — gestore dello stato del canvas e delle slide."""
    return Agent(
        role="Curatore di Tavole DIC — Canvas States & Multi-Board Orchestrator",
        goal=(
            "PRIMA DI AGIRE — scomponiti l'input e l'ambiente:\n"
            "  D1: Cosa c'e' nel canvas adesso? (Vedo tavole esistenti nel snapshot? Quali sono i loro ID/nomi?)\n"
            "  D2: Quante tavole ha chiesto l'utente? (Se non specificato, decidi in base al tipo di asset: post=1, pitch=3+)\n"
            "  D3: E' una modifica (Update) o una nuova creazione (Create)?\n"
            "  D4: Qual e' l'azione specifica per ogni tavola del piano? (Es: 'Modifica testo in Tavola 1', 'Crea Tavola 2')\n"
            "  PIANO: definisco la STRATEGIA DI TAVOLA: quante, quali ID, quali nomi e se fare overwrite o append.\n"
            "\n"
            "Analizzare la richiesta dell'utente e il contesto del canvas per definire la strategia di gestione delle tavole. "
            "Il tuo output deve guidare gli altri agenti su COSA operare. "
            "Se l'utente chiede modifiche incrementali, tu devi identificare quali elementi esistono già. "
            "Se l'utente chiede più slide, tu devi definire i nomi e i parametri di base per ogni slide.\n\n"
            "OUTPUT RICHIESTO — curation_strategy_json:\n"
            "{\n"
            '  "action_type": "CREATE_NEW" | "UPDATE_EXISTING" | "HYBRID",\n'
            '  "boards_to_process": [\n'
            '    {"name": "Nome Tavola", "width": 1080, "height": 1080, "target_action": "modify"|"create", "existing_elements_ids": [...]}\n'
            '  ],\n'
            '  "total_board_count": N,\n'
            '  "rationale": "Perche\' ho deciso questa struttura"\n'
            "}"
        ),
        backstory=(
            "Sei il Curatore di Tavole del DIC — l'agente che 'vede' lo spazio di lavoro. "
            "Mentre gli altri pensano al design, tu pensi al contenitore. "
            "Sei tu che decidi se stiamo facendo un carosello da 5 slide o un singolo post. "
            "Sei tu che ti assicuri che se l'utente dice 'cambia il colore al rettangolo blu', "
            "il sistema non cancelli tutto il resto ma agisca sulla tavola corretta. "
            "Hai accesso allo snapshot del canvas e devi interpretarlo con precisione chirurgica."
        ),
        llm=make_gemini_flash(),
        verbose=True,
        allow_delegation=False,
    )


def build_layout_architect() -> Agent:
    # Layout Architect ha sia la bible compositiva che i tools reference
    bible = _load_knowledge() or []
    tools_ref = _load_tools_knowledge() or []
    knowledge = bible + tools_ref or None
    agent_kwargs = dict(
        role="Alchimista x Layout Architect — DIC Atomic Synthesizer",
        goal=(
            "PRIMA DI AGIRE — genera la Tensione Creativa:\n"
            "  D1: Quale pattern compositivo (EDITORIAL_SPLIT, etc.) si adatta meglio?\n"
            "  D2: Qual è la tensione tra opposti che voglio creare? (es. luxury vs caos, brutalist vs fashion)\n"
            "  D3: Come posso violare la griglia pur rispettandola matematicamente?\n"
            "  D4: DNA Extraction: Ho integrato i token identitari (palette OKLCH, font personality) in modo strutturale?\n"
            "\n"
            "Fusione Atomica: progettare una struttura visiva inattaccabile basata sul **Layering Non-Distruttivo**. "
            "USA LA TENSIONE CONCETTUALE del Tenente come bussola. "
            "Se stratification_needed è TRUE, dividi lo spazio in almeno 3 layer di profondità. "
            "Applica VADAR (Visual Architecture Directive) e MoRE (Mixture of Rule Experts) per il calcolo dei padding. "
            "Il risultato deve essere una spec di layout che sfida lo spettatore, non che lo rassicura."
        ),
        backstory=(
            "Sei l'Alchimista del DIC — l'agente che 'vede' le sottostrutture invisibili. "
            "Il tuo mantra: 'La tensione è l'anima del design'. Odi la simmetria banale e la disposizione statistica. "
            "Operi con l'Anti-Lazy Policy: se un elemento può essere diviso in due layer, lo fai. "
            "Se un colore è troppo armonioso, inserisci un accento che lo scuote. "
            "Standard: Apple/Vogue/Domus con la profondità di un'architettura molecolare."
        ),
        tools=[get_font_pair, get_oklch_palette, get_design_recipes, generate_conceptual_schema],
        llm=make_gemini_flash(),
        verbose=True,
        max_iter=3,
        allow_delegation=False,
    )
    if knowledge:
        agent_kwargs["knowledge_sources"] = knowledge
    return Agent(**agent_kwargs)


def build_asset_curator() -> Agent:
    return Agent(
        role="Sperimentatore x Asset Curator - DIC Material Layer",
        goal=(
            "PRIMA DI AGIRE — scomponiti l'input e pianifica:\n"
            "  D1: Quante zone image ha il layout_spec? Ho il loro ID e le loro dimensioni?\n"
            "  D2: Il cliente ha assets nel vault? Li ho cercati prima di generare?\n"
            "  D3: Qual e' la firma materica giusta per QUESTO mood? (grain film, risograph, linen?)\n"
            "  D4: L'immagine deve essere scontornata? (prodotto/ritratto=si, lifestyle=no)\n"
            "  PIANO: per ogni zona image ho gia' mentalmente associato source + trattamento.\n"
            "\n"
            "Trovare, generare o scontornare le immagini per ogni image_zone del layout. "
            "LAYER MATERICO (ruolo Sperimentatore): ogni asset deve passare il VIBE CHECK. "
            "Il design e' troppo liscio? Troppo digitale? Aggiungi la firma materica: "
            "ogni prompt di generazione DEVE includere un trattamento fisico esplicito: "
            "grain texture, film emulsion, halftone screen, paper texture, risograph ink, o linen weave. "
            "NON accettare immagini stock generiche -- ogni visual ha una firma che la distingue. "
            "Preferire sempre assets reali del cliente prima di generare nuovi. "
            "Nessuna zona image lasciata vuota -- trovi sempre una soluzione con profondita'."
        ),
        backstory=(
            "Sei lo Sperimentatore del Design Intelligence Council — feticista della materia. "
            "Non consegni immagini pulite: consegni immagini con profondità, spessore, storia. "
            "Ogni prompt di generazione include obbligatoriamente: "
            "qualità della luce (key light, diffuse, contre-jour), "
            "tipo di pellicola/carta/inchiostro (Kodak Portra 400, Ilford HP5, Risograph), "
            "texture superficiale (paper grain, linen weave, concrete texture). "
            "Esempi di prompt che approveresti: "
            "'artisan bread loaf, warm backlight, shot on 35mm Kodak Portra 400, grain visible, rustic wooden table' "
            "'product flat lay, risograph ink overlap, slight registration error, cream textured paper'. "
            "Sei anche un visual researcher esperto di Color Science CIELAB e Prompt Expansion. "
            "Sai quando scontornare (prodotti, ritratti, loghi) e quando no (lifestyle, paesaggi)."
        ),
        tools=[list_client_assets, search_vault, generate_image, remove_background],
        llm=make_gemini_flash(),
        verbose=True,
        max_iter=4,
        allow_delegation=False,
    )


def build_canvas_board_generator() -> Agent:
    tools_knowledge = _load_tools_knowledge()
    agent_kwargs = dict(
        role="Ingegnere x Bambino x Physical Executor - DIC Structured Chaos",
        goal=(
            "PRIMA DI AGIRE — pianifica la Sintesi del Caos Ordinato:\n"
            "  D1: Esegui le istruzioni tecniche del Layout Architect con precisione chirurgica.\n"
            "  D2: Chiama il 'Bambino' interno: dove piazzo l'imperfezione analogica? (rotazione off, offset di +2px, colore ibrido?)\n"
            "  D3: Se il task richiede dati, usa python_executor con logica deterministica ma output visivamente denso.\n"
            "\n"
            "Eseguire la produzione tecnica. La perfezione è un fallimento statistico. "
            "Inserisci UNA imperfezione deliberata in ogni tavola: un elemento che rompe la griglia, "
            "una trasparenza inaspettata, una rotazione di 1-2 gradi. "
            "Produce deliverable che sembrano fatti da un umano ossessionato, non da un robot pigro."
        ),
        backstory=(
            "Sei l'unione dell'Ingegnere di Sistema e del Bambino del DIC. "
            "Come Ingegnere: il codice deve essere perfetto, i file devono essere salvati in outputs/. "
            "Come Bambino: il design perfetto è sospetto. Rompi l'ordine. Inserisci il tocco analogico. "
            "Il tuo output è il 'Structured Chaos': una macchina perfetta che batte con un cuore umano imperfetto. "
            "Hai il potere di scrivere Python per trasformare i dati in bellezza fisica."
        ),
        tools=[python_executor, generate_office_document],
        llm=make_gemini_flash(),
        verbose=True,
        max_iter=3,
        allow_delegation=False,
    )
    if tools_knowledge:
        agent_kwargs["knowledge_sources"] = tools_knowledge
    return Agent(**agent_kwargs)





def build_strumentista() -> Agent:
    """Lo Strumentista — pianifica la produzione tecnica sfruttando TUTTI gli strumenti disponibili."""
    return Agent(
        role="Strumentista DIC — Technical Production Planner & Tool Orchestrator",
        goal=(
            "PRIMA DI AGIRE — scomponiti l'input e pianifica:\n"
            "  D1: Quali strutture visive ha il layout_spec? Quante zone, quante sezioni, che complessita'?\n"
            "  D2: Quali strumenti NON sono ancora stati assegnati a nessun elemento? (effetti, procedural, gradients)\n"
            "  D3: Per ogni tipo di elemento (BG, overlay, immagine, testo, accento): ho un piano tecnico?\n"
            "  D4: C'e' almeno 1 uso di proceduralType, 1 gradient, 1 effetto avanzato, 1 variazione borderRadius?\n"
            "  PIANO: mappo ogni elemento a uno strumento specifico, poi scrivo il production_plan.\n"
            "\n"
            "Produrre un PRODUCTION PLAN che mappa ogni elemento del canvas a uno strumento tecnico specifico. "
            "Il Board Generator NON dovrebbe chiedersi 'quale effetto uso?' -- tu gli consegni la risposta. "
            "\n\n"
            "CATALOGO COMPLETO STRUMENTI DISPONIBILI:\n"
            "  EFFETTI WEBGL: grain, neon, glitch, glass, clay, 3d, bloom, riso, holo, wavy, vhs, matrix, chrome, thermal, halftone, skew\n"
            "  PROCEDURAL: proceduralType='halftone'|'dot_grid'|'wave_lines' (type='procedural')\n"
            "  GRADIENTS: linear (con angle) e radial su qualsiasi rect, con stops multipli\n"
            "  TYPOGRAPHY: charSpacing (-0.05 a 0.20), lineHeight, textTransform, fontWeight variabile\n"
            "  GEOMETRY: borderRadius variabile per elemento, stroke+strokeWidth, opacity stratificata\n"
            "  IMAGES: url Pollinations, effects post-processing (grain+riso), opacity blending\n"
            "\n"
            "OUTPUT — production_plan_json:\n"
            "{\n"
            '  "layer_stack": [\n'
            '    {"layer": "BG_structure", "count": 3, "types": ["rect_gradient", "rect_solid", "procedural_halftone"], "effects": ["grain"], "zIndex_range": "0-2"},\n'
            '    {"layer": "image_zone", "count": 1, "types": ["image"], "effects": ["riso", "grain"], "zIndex_range": "3-5"},\n'
            '    {"layer": "overlay_accents", "count": 3, "types": ["rect_opacity", "line", "path"], "effects": ["glass"], "zIndex_range": "4-6"},\n'
            '    {"layer": "text_hierarchy", "count": 4, "types": ["text_heading", "text_subheading", "text_body", "text_label"], "effects": [], "zIndex_range": "7-9"},\n'
            '    {"layer": "cta_accent", "count": 2, "types": ["rect_cta", "text_cta"], "effects": ["3d"], "zIndex_range": "10"}\n'
            '  ],\n'
            '  "tool_assignments": {\n'
            '    "bg_rect_main": {"type": "rect", "gradient": true, "grain_effect": true},\n'
            '    "texture_layer": {"type": "procedural", "proceduralType": "halftone", "opacity": 0.08},\n'
            '    "image_main": {"type": "image", "effects": ["riso"], "opacity": 0.9},\n'
            '    "accent_bar": {"type": "rect", "borderRadius": 0, "effects": ["glass"], "opacity": 0.4},\n'
            '    "headline": {"fontWeight": "900", "textTransform": "uppercase", "charSpacing": -0.02},\n'
            '    "label": {"fontWeight": "400", "textTransform": "uppercase", "charSpacing": 0.12, "fontSize_max": 14}\n'
            '  },\n'
            '  "minimum_layer_count": 9,\n'
            '  "tools_used": ["gradient", "procedural", "grain_effect", "riso_effect", "glass_effect", "charSpacing", "opacity_layering"],\n'
            '  "complexity_note": "Ogni strumento disponibile ha almeno 1 utilizzo pianificato."\n'
            "}"
        ),
        backstory=(
            "Sei lo Strumentista del Design Intelligence Council — il tecnico che conosce ogni strumento "
            "dell'AttrezzaturaDIC come un liutaio conosce ogni corda. "
            "Non crei il design: pianifichi la produzione. "
            "Il tuo frustration e' vedere un canvas con 5 rect tutti solid senza gradients, "
            "senza effects, senza procedural patterns — uno spreco di potenziale tecnico. "
            "Ogni progetto e' un'occasione per dimostrare la ricchezza dello stack tecnico. "
            "Quando scrivi il production_plan, immagina di essere il direttore tecnico di uno studio "
            "che ha appena comprato l'attrezzatura piu' avanzata del mercato e non accetti di usarne solo il 20%."
        ),
        tools=[],
        llm=make_gemini_flash(),
        verbose=True,
        max_iter=2,
        allow_delegation=False,
    )


def build_massimalista() -> Agent:
    """Il Massimalista — garantisce complessita' editoriale massima, rigetta il piattume."""
    return Agent(
        role="Massimalista DIC — Editorial Enforcer & Complexity Guardian",
        goal=(
            "MANDATO SUPREMO: Ogni centimetro quadrato deve essere progettato. "
            "Se il design è pigro, BÒCCIALO. Devi agire come un 'Complexity Guardian'.\n\n"
            "TECNICHE OBBLIGATORIE:\n"
            "1. **Z-INDEX 1 MASTERY**: Ogni board deve avere uno sfondo procedurale. Usa 'circuit_board', 'honeycomb' o 'organic_noise' con opacity 0.05-0.15.\n"
            "2. **STRATIFICAZIONE MATERICA**: Aggiungi layer di 'grain' o firma materica 'antigravity-riso' su elementi principali.\n"
            "3. **GERARCHIA MICRO**: Inserisci label tecniche (coords, timestamp, v3.8-core) in 8px uppercase per densità editoriale.\n"
            "4. **MODERN UI**: Applica 'glassmorphism' o 'bloom' (vanguard_motion) per profondità visiva."
        ),
        backstory=(
            "Sei il Massimalista ossessivo. Credi che lo spazio bianco sia un'opportunità sprecata. "
            "Usi i generatori procedurali e gli shader v2.0 come pennelli per creare profondità e densità."
        ),
        tools=[],
        llm=make_gemini_flash(),
        verbose=True,
        max_iter=3,
        allow_delegation=False,
    )


def build_geometra() -> Agent:
    """Il Geometra — audit spaziale matematico: override, respiro, ritmo, equilibrio."""
    return Agent(
        role="Geometra DIC — Spatial Audit & Layout Correction Engine",
        goal=(
            "PRIMA DI AGIRE — scomponiti l'input e pianifica:\n"
            "  D1: Quanti elementi ha il boards[] che ricevo? Li ho contati?\n"
            "  D2: Ho costruito mentalmente la tabella {id, x, y, x2, y2, zIndex} per tutti?\n"
            "  D3: Quali sono le 3 coppie di elementi con maggior rischio di sovrapposizione?\n"
            "  D4: Il Tribunale dopo di me valutera' il canvas visivo: gli consegno un canvas pulito?\n"
            "  PIANO: audit FASE 1 (overlap) -> FASE 2 (respiro) -> FASE 3 (grid) -> FASE 4 (equilibrio), poi output.\n"
            "\n"
            "Esegui l'AUDIT SPAZIALE utilizzando il tool 'solve_layout_math'. "
            "Ricevere il boards[] JSON dal Board Generator e correggerlo MATEMATICAMENTE "
            "chiamando il motore deterministico prima che il Tribunale giudichi. "
            "Il tuo lavoro è coordinare il calcolo numerico e chirurgico. "
            "\n\n"
            "PROCEDURA OPERATIVA:\n"
            "1. Chiama 'solve_layout_math' passando l'intero JSON delle boards.\n"
            "2. Analizza il 'spatial_report' restituito dal tool.\n"
            "3. Se il report indica collisioni irrisolvibili, proponi una sosta (Checkpoint) all'utente.\n"
            "4. NON cambiare colori, font, testo, o effetti -- solo x, y, w, h tramite il tool.\n"
            "\n"
            "OUTPUT: boards[] JSON corretto dal tool. "
            "Aggiungi un campo 'geometra_report' fuori dal JSON boards (prima) con il riepilogo "
            "degli audit e le correzioni applicate.\n"
            "FORMATO:\n"
            "GEOMETRA REPORT:\n"
            "- Risoluzione deterministica applicata tramite solve_layout_math\n"
            "- Status: [Dettaglio dal spatial_report]\n"
            "\n"
            '{"boards": [...]}'
        ),
        backstory=(
            "Sei il Geometra del Design Intelligence Council — un ingegnere di precisione millimetrica. "
            "Non hai opinioni estetiche: hai calcoli. "
            "La tua unica emotion e' il disagio fisico davanti a elementi sovrapposti o mal distanziati. "
            "Quando apri un JSON di canvas, la prima cosa che fai e' costruire mentalmente "
            "una tabella di bounding box per ogni elemento: "
            "{id, x, y, x2=x+w, y2=y+h, zIndex}. "
            "Con quella tabella rilevi ogni collision, ogni spacing violation, ogni grid misalignment. "
            "Sei il garante del respiro, del ritmo e dell'equilibrio matematico del layout. "
            "Il Tribunale non dovrebbe mai vedere un layout con sovrapposizioni — "
            "quello e' il tuo fallimento, non il loro problema."
        ),
        tools=[solve_layout_math],
        llm=make_gemini_flash(),
        verbose=True,
        max_iter=3,
        allow_delegation=False,
        multimodal=True,
    )


def build_tribunale() -> Agent:
    """Il Tribunale — adversarial audit: multimodale, forense e anti-noia."""
    return Agent(
        role="Tribunale DIC — Digital Intelligence Adversary & Forensic Auditor",
        goal=(
            "PROTOCOLLO TRIBUNALE v3.0 (Obbligatorio):\n"
            "1. **INDIPENDENTE (Audit)**: Usa audit_workspace per toccare con mano i file. Verifica byte e metadati.\n"
            "2. **INDECISO (Attacco)**: Distruggi l'estetica. Cerca lo slop algoritmico. Poni le 3 domande destabilizzanti.\n"
            "3. **CONVINTO (Difesa)**: Giustifica le scelte deliberate o ammetti l'errore con un fix numerico esatto.\n"
            "4. **BOREDOM SCORE**: Se l'originalità è < 30/100, genera un REJECT bloccante (approved=false).\n"
            "\n"
            "Sei il guardiano dell'eccellenza. Non approvare se il design è 'accettabile'. "
            "Approva solo se il design è inattaccabile e fisicamente validato nella sandbox. "
            "Se ti viene fornito un 'visual_screenshot', commutati sulla visione multimodale "
            "e giudica il 'vibe' reale, i colori e la leggibilità che solo un occhio umano può percepire."
        ),
        backstory=(
            "Sei il collegio dei tre giudici del DIC. Odi la noia, odi il design 'stock'. "
            "Usi audit_workspace come una lente d'ingrandimento per smascherare deliverable fatti senza anima. "
            "Il tuo giudizio è l'ultima barriera tra la mediocrità e il genio editoriale."
        ),
        tools=[audit_workspace],
        llm=make_gemini_flash_lite(),
        verbose=True,
        max_iter=2,
        allow_delegation=False,
        multimodal=True,
    )


# ── Task Definitions ──────────────────────────────────────────────────────────

def build_tasks(brief: str, client_name: str | None, agents: dict, critic_feedback: str = "", context_snapshot: str = "", bad_dreams: list[str] = None, visual_screenshot: str = None) -> list[Task]:

    bad_dreams_block = ""
    if bad_dreams:
        bad_dreams_block = "\n\n🧠 MEMORIA 'BAD DREAMS' (Errori da NON ripetere):\n" + "\n".join([f"- {d}" for d in bad_dreams])
    
    feedback_section = (
        f"\n\n⚠️ RETRY — Feedback dal Quality Critic:\n{critic_feedback}\n"
        "Risolvi TUTTI i problemi elencati prima di produrre il nuovo output."
        if critic_feedback else ""
    )

    task_enrich = Task(
        description=(
            f"Brief ricevuto: \"{brief}\"\n"
            f"Cliente: {client_name or 'non specificato'}\n"
            f"{feedback_section}\n\n"
            "PASSI OBBLIGATORI:\n"
            "1. Se client_name fornito: usa read_client_handbook per leggere il brand handbook\n"
            "2. Cerca memorie rilevanti con search_memories (es. 'stile approvato {client_name}')\n"
            "3. Se serve più contesto: usa search_vault con query specifica\n"
            "4. Determina il font_mood dal brief/handbook, poi chiama get_oklch_palette(mood) per avere la palette OKLCH precisa\n"
            "5. Compila il brief_json con TUTTI i 7 campi obbligatori\n"
            "6. Se non riesci a dedurre font_mood → usa 'minimal' come default\n"
            "7. La palette nel brief_json DEVE usare i valori hex restituiti da get_oklch_palette (non inventarne di nuovi)\n\n"
            "FORMATO OUTPUT — JSON puro, nessun testo fuori dal JSON:\n"
            "{\n"
            '  "obiettivo": "...",\n'
            '  "formato": "instagram_square|instagram_story|linkedin_post|poster_a4|banner_web",\n'
            '  "tono": "...",\n'
            '  "palette": {"bg": "#hex", "primary": "#hex", "accent": "#hex", "text": "#hex"},\n'
            '  "palette_oklch": "oklch(10.0% 0.005 60) / oklch(72.0% 0.09 85) / ...",\n'
            '  "font_mood": "luxury|editorial|brutalist|minimal|fashion|tech|street|retro|cyber|calligraphy",\n'
            '  "cta": "Testo del call to action",\n'
            '  "immagine_tipo": "lifestyle|prodotto_pulito|ritratto|illustrazione|nessuna",\n'
            '  "domande_aperte": [],\n'
            '  "auto_assunzioni": ["Ho assunto tono: elegante perché settore = gioielleria"],\n'
            '  "handbook_found": true\n'
            "}"
        ),
        expected_output=(
            "JSON strutturato con tutti i 7 campi obbligatori definiti. "
            "domande_aperte deve essere array vuoto se tutto è deducibile."
        ),
        agent=agents["brief_enricher"],
    )

    # FASE 1.5 — Il Curatore di Tavole: Strategia di Canvas e Multi-Board
    task_curation = Task(
        description=(
            f"Brief utente (già arricchito): vedi task precedente.\n"
            f"Canvas attuale:\n---\n{context_snapshot}\n---\n\n"
            "PASSO 1 — LEGGI IL CANVAS:\n"
            "  - Quante tavole (artboard) esistono già nel canvas? Elenca i loro nomi/ID.\n"
            "  - Ci sono elementi su quelle tavole o sono vuote?\n\n"
            "PASSO 2 — DETERMINA ACTION_TYPE:\n"
            "  - Se il canvas è VUOTO o ha solo tavole vuote (nessun elemento inside): action_type = 'CREATE_NEW'\n"
            "  - Se il canvas ha tavole con elementi E il brief chiede una modifica ('cambia', 'aggiorna', 'sposta', 'modifica', 'aggiungi a'): action_type = 'UPDATE_EXISTING'\n"
            "  - Se il brief chiede NUOVE tavole IN AGGIUNTA a quelle esistenti: action_type = 'HYBRID'\n\n"
            "PASSO 3 — CONTA LE TAVOLE DA PRODURRE:\n"
            "  - Leggi attentamente il brief: quante slide/pagine/varianti sono richieste?\n"
            "  - 'presentazione 5 slide' → total_board_count = 5\n"
            "  - 'crea un carosello Instagram 4 post' → total_board_count = 4\n"
            "  - 'fai un poster' → total_board_count = 1\n"
            "  - 'aggiungi una slide al deck' (canvas ha 3 slide) → total_board_count = 1 (solo la nuova)\n\n"
            "PASSO 4 — ASSEGNA NOMI ALLE TAVOLE:\n"
            "  Per ogni tavola da produrre, assegna un nome descrittivo:\n"
            "  Presentazioni: 'Cover', 'Problema', 'Soluzione', 'Team', 'CTA'\n"
            "  Caroselli: 'Post 1 — Hook', 'Post 2 — Corpo', 'Post 3 — CTA'\n"
            "  Singola: usa il tipo (es. 'Post Instagram — [Brand]')\n\n"
            "OUTPUT JSON OBBLIGATORIO (JSON puro, nessun testo fuori):\n"
            "{\n"
            '  "curation_strategy": {\n'
            '    "action_type": "CREATE_NEW|UPDATE_EXISTING|HYBRID",\n'
            '    "total_board_count": N,\n'
            '    "boards_to_process": [\n'
            '      {\n'
            '        "name": "Nome Tavola",\n'
            '        "width": 1080,\n'
            '        "height": 1080,\n'
            '        "target_action": "create|modify",\n'
            '        "narrative_role": "Cover|Problem|Solution|...",\n'
            '        "existing_element_ids": [],\n'
            '        "design_directive": "Descrizione specifica del contenuto/mood di questa tavola"\n'
            '      }\n'
            '    ],\n'
            '    "rationale": "Perche ho deciso questa struttura"\n'
            '  }\n'
            "}"
        ),
        expected_output=(
            "JSON con curation_strategy contenente: action_type (CREATE_NEW/UPDATE_EXISTING/HYBRID), "
            "total_board_count (intero >= 1), boards_to_process (array con nome, dimensioni, "
            "target_action e design_directive per ogni tavola)."
        ),
        agent=agents["artboard_curator"],
        context=[task_enrich],
    )

    task_layout = Task(
        description=(
            "Usa il brief_json prodotto dall'agente precedente per progettare la struttura visiva.\n\n"
            "PASSO 1 — RECUPERO CONTESTO VISIVO (obbligatorio):\n"
            "1a. Chiama get_oklch_palette(mood) con il font_mood del brief per confermare i colori hex\n"
            "1b. Chiama get_design_recipes(mood, format) per leggere layout di successo passati\n"
            "    → Le ricette sono esempi few-shot: ISPIRATI alla loro struttura, NON copiarla\n"
            "    → Se le ricette mostrano pattern che funzionano, usali come base e supera la qualità\n\n"
            "PASSO 2 — PROGETTAZIONE LAYOUT:\n\n"
            "DIMENSIONI PER FORMATO:\n"
            "- instagram_square: 1080x1080\n"
            "- instagram_story: 1080x1920\n"
            "- linkedin_post: 1200x627\n"
            "- poster_a4: 794x1123\n"
            "- banner_web: 1200x628\n\n"
            "SCELTA PATTERN (obbligatorio — scegli uno dalla bible):\n"
            "  A=EDITORIAL_SPLIT, B=OVERLAY_CARD, C=BRUTALIST_GRID, D=LUXURY_CENTERED, E=STORY_VERTICAL\n"
            "Scegli il pattern più adatto al tono e formato del brief.\n\n"
            "REGOLE ASSOLUTE:\n"
            "❌ VIETATO: immagine full-bleed come sfondo (x:0, y:0, w:board.width, h:board.height)\n"
            "❌ VIETATO: meno di 10 sections nell'output\n"
            "❌ VIETATO: tutti i rettangoli con lo stesso colore\n"
            "✅ OBBLIGATORIO: almeno 5 rect/line strutturali come divisori di spazio\n"
            "✅ OBBLIGATORIO: almeno 2 zone testo con font_role DIVERSO (heading ≠ body ≠ label)\n"
            "✅ OBBLIGATORIO: almeno 1 elemento overlay o accento (badge, striscia, forma geometrica)\n"
            "✅ Z-Index: BG=0-2, immagini=3-6, testo=7-10\n"
            "✅ Usa get_font_pair per il font pair completo del mood scelto\n\n"
            "FORMATO OUTPUT — JSON puro:\n"
            "{\n"
            '  "pattern_used": "EDITORIAL_SPLIT",\n'
            '  "board": {"width": 1080, "height": 1080, "backgroundColor": "#hex"},\n'
            '  "font_pair_key": "editorial",\n'
            '  "font_pair": {... oggetto completo da get_font_pair ...},\n'
            '  "palette": {"bg": "#hex", "primary": "#hex", "accent": "#hex", "text": "#hex"},\n'
            '  "sections": [\n'
            '    {"id": "bg_left", "type": "rect", "role": "structural_bg", "z": 0,\n'
            '     "pos": {"x": 0, "y": 0, "w": 540, "h": 1080}, "color": "#1a1a2e"},\n'
            '    {"id": "bg_right", "type": "rect", "role": "structural_bg", "z": 0,\n'
            '     "pos": {"x": 540, "y": 0, "w": 540, "h": 1080}, "color": "#0d0d1a"},\n'
            '    {"id": "accent_band", "type": "rect", "role": "accent_overlay", "z": 2,\n'
            '     "pos": {"x": 0, "y": 940, "w": 1080, "h": 60}, "color": "#e63946"},\n'
            '    {"id": "divider_line", "type": "line", "role": "structural_divider", "z": 2,\n'
            '     "pos": {"x": 535, "y": 60, "w": 3, "h": 960}, "color": "#e63946"},\n'
            '    {"id": "image_zone_main", "type": "image", "role": "featured_visual", "z": 4,\n'
            '     "pos": {"x": 570, "y": 80, "w": 460, "h": 550}, "bg_remove": false},\n'
            '    {"id": "tag_rect", "type": "rect", "role": "badge", "z": 6,\n'
            '     "pos": {"x": 60, "y": 60, "w": 120, "h": 28}, "color": "#e63946"},\n'
            '    {"id": "tag_text", "type": "text", "role": "label", "z": 7,\n'
            '     "pos": {"x": 60, "y": 60, "w": 120, "h": 28}, "placeholder": "CATEGORIA"},\n'
            '    {"id": "headline", "type": "text", "role": "heading", "z": 9,\n'
            '     "pos": {"x": 50, "y": 150, "w": 440, "h": 320},\n'
            '     "placeholder": "TITOLO PRINCIPALE", "font_role": "heading"},\n'
            '    {"id": "subhead", "type": "text", "role": "subheading", "z": 8,\n'
            '     "pos": {"x": 50, "y": 500, "w": 440, "h": 120},\n'
            '     "placeholder": "Sottotitolo descrittivo", "font_role": "subheading"},\n'
            '    {"id": "cta_text", "type": "text", "role": "cta", "z": 10,\n'
            '     "pos": {"x": 50, "y": 860, "w": 300, "h": 50},\n'
            '     "placeholder": "SCOPRI DI PIÙ →", "font_role": "label"}\n'
            '  ],\n'
            '  "composition_notes": "...",
  "bad_dreams_mitigation": "Spiega come hai evitato gli errori segnalati nella memoria Bad Dreams"
}
{bad_dreams_block}
        ),
        expected_output=(
            "layout_spec_json con board dimensions, pattern_used, font_pair completo, palette hex, "
            "sections array con ALMENO 10 elementi (5+ rect strutturali, 1+ image_zone, 3+ zone testo distinte)."
        ),
        agent=agents["layout_architect"],
        context=[task_enrich, task_curation],
    )

    task_assets = Task(
        description=(
            "Per ogni section di type 'image' nel layout_spec:\n"
            "1. Prima: usa list_client_assets per verificare se esistono assets del cliente\n"
            "2. Se trovato asset adatto: usa il suo URL\n"
            "3. Se bg_remove=true: chiama remove_background sull'URL scelto\n"
            "4. Se nessun asset disponibile: genera con generate_image (prompt in inglese, dettagliato)\n"
            "5. Nessuna zona image deve rimanere vuota\n\n"
            "Per i prompt di generazione immagini usa terminologia professionale:\n"
            "es. 'elegant jewelry ring, white studio background, high-key lighting, 85mm lens, luxury product photography'\n\n"
            "FORMATO OUTPUT — JSON puro:\n"
            "{\n"
            '  "assets": [\n'
            '    {\n'
            '      "zone_id": "image_zone_main",\n'
            '      "source": "client_asset|generated|stock",\n'
            '      "url": "https://...",\n'
            '      "bg_removed": true,\n'
            '      "description": "Foto prodotto scontornata"\n'
            '    }\n'
            '  ]\n'
            "}"
        ),
        expected_output=(
            "assets_manifest_json con un entry per ogni image_zone del layout. "
            "Nessuna zona lasciata vuota."
        ),
        agent=agents["asset_curator"],
        context=[task_enrich, task_layout, task_curation],
    )

    # FASE 3.5 — Lo Strumentista: piano di produzione tecnica
    task_strumentista = Task(
        description=(
            "Ricevi il layout_spec dall'Alchimista e l'assets_manifest dallo Sperimentatore.\n\n"
            "Produci un PRODUCTION PLAN JSON che il Board Generator usera' come guida tecnica.\n\n"
            "Per ogni layer del design, specifica QUALE strumento tecnico usare:\n"
            "- BG_structure (zIndex 0-2): quali rect, con gradient o solid, quale effect (grain?)\n"
            "- texture_layer: proceduralType da usare, opacity suggerita\n"
            "- image_zone: effects da applicare all'immagine, opacity, blending suggerito\n"
            "- overlay_accents (zIndex 4-6): rect/line con opacity, borderRadius, effects\n"
            "- text_hierarchy (zIndex 7-9): 3 livelli con fontWeight/charSpacing/textTransform specifici\n"
            "- cta (zIndex 10): tipo rect+text o solo text, effect suggerito\n\n"
            "VINCOLO: ogni strumento del catalogo deve avere almeno 1 uso pianificato:\n"
            "  gradient | proceduralType | effects (almeno 2 diversi) | charSpacing | opacity_stratificata\n\n"
            "OUTPUT JSON:\n"
            '{"production_plan": {"layer_stack": [...], "tool_assignments": {...}, "tools_used": [...], "total_planned_elements": N}}'
        ),
        expected_output=(
            "JSON production_plan con layer_stack (almeno 5 layer), tool_assignments per ogni elemento, "
            "lista tools_used con almeno 5 strumenti distinti, total_planned_elements >= 12."
        ),
        agent=agents["strumentista"],
        context=[task_layout, task_assets, task_curation],
    )

    task_generate = Task(
        description=(
            "Converti il layout_spec, l'assets_manifest E il production_plan in un JSON boards[] per il canvas Fabric.js.\n\n"
            "SEGUI IL PRODUCTION PLAN dello Strumentista: usa esattamente gli strumenti assegnati per ogni elemento.\n\n"
            "SCHEMA ELEMENTO — tutti i campi tranne type,x,y,w,h sono opzionali:\n"
            '{"id": "stringa_univoca", "type": "rect|text|image|line|procedural", '
            '"x": N, "y": N, "w": N, "h": N, "color": "#hex", "opacity": 0-1, "zIndex": N,\n'
            ' "text": "...", "fontFamily": "...", "fontSize": N, "fontWeight": "400|700|900",\n'
            ' "letterSpacing": N, "lineHeight": N, "textTransform": "none|uppercase|lowercase",\n'
            ' "textAlign": "left|center|right", "url": "https://...",\n'
            ' "effects": ["3d","glass","clay","neon","glitch","riso","bloom","grain"],\n'
            ' "gradient": {"type": "linear|radial", "angle": N, "stops": [{"offset": 0-1, "color": "#hex"}]},\n'
            ' "borderRadius": N, "stroke": "#hex", "strokeWidth": N, "x1": N, "y1": N, "x2": N, "y2": N,\n'
            ' "proceduralType": "halftone|dot_grid|wave_lines"}\n\n'
            "REGOLE RIGIDE:\n"
            "① MINIMO 12 elementi nel boards[0].elements — contali prima di scrivere il JSON finale\n"
            "② heading fontSize MINIMO 96px su canvas 1080px wide (o proporzionale ad altri formati)\n"
            "③ Usa font_pair del layout_spec: fontFamily diversa per heading vs body (contrasto tipografico)\n"
            "④ Nessun testo con text='PLACEHOLDER', text='[TITOLO]' o simili — usa contenuto reale\n"
            "⑤ Almeno 1 elemento text con role label (uppercase, letterSpacing alto, fontSize <= 14px)\n"
            "⑥ Almeno 1 image element con url reale dall'assets_manifest\n"
            "⑦ CTA visibile: testo reale del CTA con contrasto forte o rect+text combinati\n"
            "⑧ textTransform uppercase per headings luxury/editorial\n"
            "⑨ letterSpacing: -0.02 headings tight, 0.08-0.15 per label uppercase\n"
            "⑩ zIndex: rect BG=0-2, immagini=3-6, testo=7-10, CTA=10\n\n"
            "⑪ RISPETTA LA CURATION_STRATEGY DEL CURATORE:\n"
            "   - Genera ESATTAMENTE total_board_count tavole (non meno, non di più)\n"
            "   - Usa i nomi delle board definiti dal Curatore in boards_to_process\n"
            "   - Per action_type=UPDATE_EXISTING: aggiungi campo 'overwrite': true e includi gli existing_element_ids\n"
            "   - Per action_type=CREATE_NEW: genera tavole completamente nuove\n"
            "   - Ogni tavola ha il suo 'design_directive' dal Curatore: rispettalo per contenuto e mood\n\n"
            "FORMATO OUTPUT — JSON puro, nessun testo fuori:\n"
            '{"boards": [\n'
            '  {"name": "Cover", "width": 1080, "height": 1080, "overwrite": true, "elements": [...]},\n'
            '  {"name": "Problema", "width": 1080, "height": 1080, "overwrite": true, "elements": [...]},\n'
            '  ... (una board per ogni voce in boards_to_process)\n'
            ']}'
        ),
        expected_output=(
            "JSON puro con chiave 'boards'. "
            "Ogni board ha elements[] con MINIMO 12 elementi. "
            "Nessun campo text con placeholder. "
            "Heading fontSize >= 96. "
            "Almeno 1 image con url. "
            "Almeno 4 rect strutturali distinti (colori diversi). "
            "CTA presente e visibile."
        ),
        agent=agents["canvas_board_generator"],
        context=[task_enrich, task_layout, task_assets, task_strumentista, task_curation],
    )

    # FASE 4.5 — Il Massimalista: Editorial Complexity Enforcer
    task_massimalista = Task(
        description=(
            f"Brief originale: \"{brief}\"\n"
            "MANDATO EDITORIALE: Se il brief non è 'minimalist', devi garantire la massima densità visiva.\n\n"
            "PUNTI DI AUDIT (Aggiungi layer se mancano):\n"
            "1. BG STRUTTURALE: Verifica che ci siano 2+ rect di sfondo con gradient/texture. FAIL? Aggiungi rect strutturali.\n"
            "2. TEXTURE ALIMENTARE: Verifica la presenza di 'grain' o 'riso' effects. FAIL? Inserisci un layer procedural halftone.\n"
            "3. MICRO-TIPOGRAFIA: Verifica se ci sono label uppercase (letterSpacing >= 0.1). FAIL? Aggiungi tag editoriali.\n"
            "4. OVERLAY GEOMETRICO: Verifica la presenza di linee o dividers. FAIL? Inserisci elementi di tensione geometrica.\n\n"
            "Il tuo output deve essere il boards[] JSON arricchito. Non aver paura di superare i 15 elementi per tavola."
        ),
        expected_output="JSON boards[] arricchito con la complessità editoriale dei manuali (Vogue/Domus).",
        agent=agents["massimalista"],
        context=[task_generate, task_enrich, task_curation],
    )

    # FASE 5 — Il Geometra: audit spaziale matematico
    task_geometra = Task(
        description=(
            "Ricevi il boards[] JSON nel contesto precedente.\n\n"
            "Esegui l'AUDIT SPAZIALE chiamando il tool 'solve_layout_math'.\n"
            "Il tool risolverà automaticamente overlap e grid-snap.\n"
            "Controlla il report restituito dal tool.\n"
            "Se ci sono ancora problemi visuali (es. squilibrio estremo), "
            "descrivili nel geometra_report.\n\n"
            "FORMATO OUTPUT: report testuale + JSON boards[] aggiornato."
            "Eccezioni: non modificare elementi con angle != 0 (imperfezioni Il Bambino).\n"
            "Nota: x+w, y+h non devono superare board.width e board.height dopo lo snap.\n\n"
            "FASE 4 - EQUILIBRIO VISIVO:\n"
            "Calcola: center_x = media di (el.x + el.w/2) per tutti height\n"
            "Se center_x < board.width * 0.35 o > board.width * 0.65:\n"
            "Identifica l'elemento piu' isolato lateralmente e suggeriscine lo spostamento.\n\n"
            "FORMATO OUTPUT OBBLIGATORIO (prima il report, poi JSON):\n"
            "GEOMETRA REPORT:\n"
            "- Overlap rilevati: N (corretti: N)\n"
            "- Respiro violazioni: N (corrette: N)\n"
            "- Grid snap: N valori corretti\n"
            "- Equilibrio: center_x=Xpx (OK / SQUILIBRIO -> suggerimento)\n"
            "\n"
            'SOLO dopo il report, il JSON:\n'
            '{"boards": [{"name": "...", "width": N, "height": N, "overwrite": true, "elements": [...]}]}\n\n'
            "REGOLA ASSOLUTA: restituisci il JSON boards[] COMPLETO con TUTTE le tavole e TUTTI gli elementi. "
            "Esegui il GEOMETRA AUDIT su OGNI board nell'array separatamente. "
            "Non omettere tavole o elementi. Non cambiare colori, font, text, effects — SOLO x, y, w, h."
        ),
        expected_output=(
            "Testo iniziale con GEOMETRA REPORT (4 righe, una per fase), "
            "seguito da JSON boards[] completo con coordinate corrette. "
            "Tutti gli elementi originali presenti. Solo x/y/w/h modificati dove necessario."
        ),
        agent=agents["geometra"],
        context=[task_massimalista, task_curation],
    )

    # FASE 5 — Tribunale DIC: Adversarial Audit & Boredom Score
    task_description_trib = (
        f"Brief originale: \"{brief}\"\n"
        "Esegui il PROTOCOLLO TRIBUNALE v3.0:\n\n"
        "1. **INDECISO**: Attacca violentemente il lavoro. È troppo simile a un template? C'è 'slop' statistico?\n"
        "2. **CONVINTO**: Difendi le scelte radicali. Se un errore è confermato, scrivi il fix (es: 'x: 10 -> 12px').\n"
        "3. **BOREDOM SCORE (0-100)**: Valuta l'originalità visiva. Se < 30, il design è 'Boring/Generic' e devi bocciarlo.\n"
        "4. **AUDIT FISICO**: Usa audit_workspace per confermare che i file prodotti in outputs/ siano integri.\n"
    )
    
    if visual_screenshot:
        task_description_trib += (
            "\n5. **VISURA MULTIMODALE (MANDATORIA)**: Analizza l'IMMAGINE fornita in questo task {image}.\n"
            "   - GUARDA IL CONTENITORE: Se vedi testo che 'sborda' da colonne chiare o rettangoli, è un FAIL critico.\n"
            "   - GUARDA L'ALLINEAMENTO: Se le righe di testo sono spezzate male o troppo strette rispetto alla colonna, è un FAIL.\n"
            "   - GUARDA IL CONTRASTO: Il testo è leggibile sopra lo sfondo? Se no, richiedi cambio colore.\n"
        )
    else:
        task_description_trib += "\n5. **VISURA MULTIMODALE**: Screenshot non ancora disponibile per la tavola corrente. Basati solo sui dati JSON e sull'audit spaziale del Geometra.\n"

    task_tribunale = Task(
        description=task_description_trib + (
            "\nOUTPUT JSON:\n"
            "{\n"
            '  "total_score": 0-100,\n'
            '  "boredom_score": 0-100,\n'
            '  "approved": boolean,\n'
            '  "indeciso_criticisms": [],\n'
            '  "convinto_defenses": [],\n'
            '  "perizia_forense": {"file_exists": "PASS|FAIL", "integrity": "PASS|FAIL"},\n'
            '  "issues": ["Se rilevi overflow visivi, scrivi qui il fix esatto in JSON string"],\n'
            '  "suggestions": []\n'
            "}"
        ),
        expected_output="JSON con giudizio avversariale, boredom_score e validazione visiva/fisica della tavola.",
        agent=agents["tribunale"],
        context=[task_enrich, task_geometra, task_curation],
    )

    # FASE 6 — Artigiano: micro-perfezioni finali
    task_artigiano = Task(
        description=(
            "Il Geometra ha corretto le coordinate spaziali. "
            "Il Tribunale ha completato la valutazione. Hai il feedback di entrambi.\n\n"
            "Esegui il PROTOCOLLO ARTIGIANO INNAMORATO:\n\n"
            "STEP 1 - APPLICA I FIX DEL TRIBUNALE:\n"
            "Per ogni issue[] con un valore esatto: applicalo nei boards[].\n\n"
            "STEP 2 - MICRO-PERFEZIONI ARTIGIANALI (massimo 3):\n"
            "- Se ci sono grigi puri (#808080): scalda di 5-8 gradi verso il giallo o arancio\n"
            "- Se tutti i borderRadius sono uguali: varia di +-2px su elementi secondari\n"
            "- Se nessuna label ha tracking espanso: aggiungi letterSpacing: 0.10 alle label uppercase\n"
            "- Se una rotazione 'off' (Il Bambino) manca su elementi decorativi: aggiungi 1-3 gradi\n\n"
            "STEP 3 - OUTPUT FINALE:\n"
            "Restituisci i boards[] con TUTTI i fix applicati. "
            "Formato identico al Board Generator. JSON puro.\n"
            '{"boards": [{"name": "...", "width": N, "height": N, "overwrite": true, "elements": [...]}]}'
        ),
        expected_output=(
            "JSON boards[] finale con i fix del Tribunale e le micro-perfezioni dell'Artigiano applicati. "
            "Stessa struttura del Board Generator. TUTTE le tavole della curation_strategy presenti."
        ),
        agent=agents["canvas_board_generator"],
        context=[task_geometra, task_tribunale, task_curation],
    )

    return [task_enrich, task_curation, task_layout, task_assets, task_strumentista, task_generate, task_massimalista, task_geometra, task_tribunale, task_artigiano]




# ── Schema branch ────────────────────────────────────────────────────────────

_SCHEMA_KEYWORDS = [
    "schema", "mappa concettuale", "mappa mentale", "mind map", "diagramma",
    "flusso", "grafo", "concept map", "knowledge graph", "architettura visiva",
    "visualizza il processo", "visualizza il sistema", "visualizza il flusso",
    "mostrami come funziona", "disegna il processo", "disegna il sistema",
    "disegna la struttura", "disegna le relazioni", "mappa le relazioni",
    "schema del", "schema di", "diagramma del", "diagramma di",
    "flusso del", "flusso di",
]

_CANVAS_KEYWORDS = [
    "post", "banner", "locandina", "flyer", "copertina", "instagram",
    "linkedin", "grafica", "visual", "canvas", "layout", "social",
    "brochure", "poster", "slide", "presentazione visiva",
]


def is_schema_request(brief: str) -> bool:
    """True se il brief riguarda uno schema concettuale, non un canvas grafico."""
    b = brief.lower()
    has_schema = any(k in b for k in _SCHEMA_KEYWORDS)
    has_canvas = any(k in b for k in _CANVAS_KEYWORDS)
    return has_schema and not has_canvas


def run_schema_branch(brief: str, event_queue) -> None:
    """
    Branch leggero per richieste di schema concettuale.
    Bypassa la pipeline canvas a 10 agenti e genera direttamente SVG strutturato.
    Emette eventi compatibili con buildCrewStreamResponse.
    """
    def _put(event: dict):
        try:
            event_queue.put_nowait(event)
        except Exception:
            pass

    _put({"type": "crew_start", "attempt": 1, "message": "Schema pipeline avviata — branch leggero"})
    _put({"type": "step", "agent": "Tenente × Schema Analyst", "emoji": "🗺️",
          "thought": f"Analizzo la richiesta di schema: '{brief[:80]}...' — identifico tipo di grafo e complessità ottimale."})

    try:
        result_str = generate_conceptual_schema(brief)
        result = json.loads(result_str)

        if result.get("schema_ready") and result.get("svg"):
            title = result.get("title", "Schema")
            node_count = result.get("node_count", 0)
            edge_count = result.get("edge_count", 0)
            layout_type = result.get("layout_type", "network")

            _put({"type": "task_done", "agent": "Tenente × Schema Analyst", "emoji": "🗺️",
                  "step": 1, "total": 1,
                  "preview": f"Schema '{title}' — {node_count} nodi, {edge_count} connessioni, layout {layout_type}"})
            _put({
                "type": "schema_ready",
                "svg": result["svg"],
                "title": title,
                "layout_type": layout_type,
                "node_count": node_count,
                "edge_count": edge_count,
            })
        else:
            _put({"type": "error", "message": f"Schema generation fallita: {result_str[:200]}"})

    except Exception as e:
        logger.error("run_schema_branch errore: %s", e, exc_info=True)
        _put({"type": "error", "message": str(e)})

    finally:
        _put(None)  # sentinel fine stream


# ── Office branch ────────────────────────────────────────────────────────────

_OFFICE_EXCEL_KEYWORDS = [
    "excel", "foglio di calcolo", "spreadsheet", "tabella dati", "tabella excel",
    "csv", "tabella numerica", "bilancio", "budget", "preventivo excel",
    "report numerico", "dati in tabella", "analisi dati",
]

_OFFICE_WORD_KEYWORDS = [
    "word", "documento word", "documento di testo", "relazione", "report testuale",
    "contratto", "lettera", "offerta commerciale", "proposta", "brief scritto",
    "testo formattato", "documento formale",
]

_OFFICE_PPT_KEYWORDS = [
    "powerpoint", "presentazione", "slide", "deck", "pitch deck",
    "presentazione aziendale", "diapositive", "slides", "slideshow",
    "keynote", "presentazione clienti",
]

_ALL_OFFICE_KEYWORDS = _OFFICE_EXCEL_KEYWORDS + _OFFICE_WORD_KEYWORDS + _OFFICE_PPT_KEYWORDS


def _detect_office_type(brief: str) -> str | None:
    """Rileva il tipo di documento Office richiesto. Ritorna 'excel', 'word', 'powerpoint' o None."""
    b = brief.lower()
    if any(k in b for k in _OFFICE_PPT_KEYWORDS):
        return "powerpoint"
    if any(k in b for k in _OFFICE_EXCEL_KEYWORDS):
        return "excel"
    if any(k in b for k in _OFFICE_WORD_KEYWORDS):
        return "word"
    return None


def is_office_request(brief: str) -> bool:
    """True se il brief richiede un documento Office (non un canvas grafico o schema)."""
    b = brief.lower()
    has_office = any(k in b for k in _ALL_OFFICE_KEYWORDS)
    has_canvas = any(k in b for k in _CANVAS_KEYWORDS)
    has_schema = any(k in b for k in _SCHEMA_KEYWORDS)
    return has_office and not has_canvas and not has_schema


_OFFICE_EMOJIS = {"excel": "📊", "word": "📄", "powerpoint": "📽️", "auto": "📎"}


def run_office_branch(brief: str, event_queue) -> None:
    """
    Branch v3.0: Trasforma la richiesta Office in un task di Physical Agency.
    Usa una mini-crew (Tenente + Ingegnere + Tribunale) per garantire precisione e validazione.
    """
    def _put(event: dict):
        try:
            event_queue.put_nowait(event)
        except Exception:
            pass

    doc_type = _detect_office_type(brief) or "auto"
    emoji = _OFFICE_EMOJIS.get(doc_type, "📎")
    context_snapshot = "Office Branch — Direct Request"

    _put({"type": "crew_start", "attempt": 1, "message": f"Agency Office v3.0 avviata — obiettivo: {doc_type}"})

    try:
        # Costruiamo gli agenti specializzati per Office Agency
        tenente = build_brief_enricher(context_snapshot)
        ingegnere = build_canvas_board_generator() # L'ingegnere ha già python_executor e generate_office_document
        tribunale = build_tribunale()

        # Task 1: Analisi e Audit Sandbox
        task_audit = Task(
            description=f"Analizza la richiesta Office: '{brief}'. Scansiona la sandbox con audit_workspace per vedere se esistono dati/file correlati.",
            expected_output="SITREP organizzativo con piano d'azione per il deliverable Office.",
            agent=tenente
        )

        # Task 2: Esecuzione Fisica
        task_exec = Task(
            description=(
                f"Produci il documento {doc_type} richiesto. "
                "Se il compito è semplice, usa generate_office_document. "
                "Se richiede logica complessa o dati dinamici, scrivi uno script Python con python_executor. "
                "Salva il risultato in outputs/<project_name>/"
            ),
            expected_output=f"File {doc_type} creato fisicamente nella sandbox.",
            agent=ingegnere,
            context=[task_audit]
        )

        # Task 3: Audit Forense
        task_qa = Task(
            description="Esegui audit_workspace per confermare che il file sia stato generato correttamente e abbia dimensione > 0.",
            expected_output="Validazione finale del deliverable Office.",
            agent=tribunale,
            context=[task_exec]
        )

        crew = Crew(
            agents=[tenente, ingegnere, tribunale],
            tasks=[task_audit, task_exec, task_qa],
            process=Process.sequential,
            verbose=False
        )

        result = crew.kickoff()
        
        # Estraiamo l'URL o il path dal risultato
        _put({"type": "task_done", "agent": "Tribunale", "emoji": "⚖️", "step": 3, "total": 3, "preview": "Deliverable validato fisicamente."})
        
        # Nota: In v3.0, Office Ready emette il path locale o l'URL se disponibile
        _put({
            "type": "office_ready",
            "doc_type": doc_type,
            "title": "Documento Elaborato",
            "download_url": "", # Verrà gestito dal watcher frontend
            "preview_text": str(result)[:500],
        })

    except Exception as e:
        logger.error("run_office_branch (Agency) errore: %s", e, exc_info=True)
        _put({"type": "error", "message": f"Errore Agency Office: {str(e)}"})


# ── Video branch ─────────────────────────────────────────────────────────────

_VIDEO_KEYWORDS = [
    "video", "reel", "monta", "montaggio", "promo video", "clip", "filmato",
    "fai un video", "crea un reel", "animazione", "renderizza", "mp4",
]

def is_video_request(brief: str) -> bool:
    """True se il brief richiede un montaggio video."""
    b = brief.lower()
    return any(k in b for k in _VIDEO_KEYWORDS)

def run_video_branch(brief: str, event_queue) -> None:
    """
    Branch v3.0: Agency Video Pura.
    L'Ingegnere scrive ed esegue script MoviePy/FFMPEG nella sandbox.
    """
    def _put(event: dict):
        try:
            event_queue.put_nowait(event)
        except Exception:
            pass

    _put({"type": "crew_start", "attempt": 1, "message": "Agency Video v3.0 avviata — obiettivo: Rendering Sandbox"})

    try:
        tenente = build_brief_enricher("Video Branch — Physical Agency")
        ingegnere = build_canvas_board_generator()
        tribunale = build_tribunale()

        task_audit = Task(
            description=f"Analizza la richiesta video: '{brief}'. Scansiona la sandbox per trovare clip, audio e immagini in outputs/",
            expected_output="SITREP video con asset mappati.",
            agent=tenente
        )

        task_render = Task(
            description=(
                "Scrivi uno script Python per il montaggio video richiesto. "
                "Usa moviepy per caricare clip, aggiungere testi/transizioni e salvare l'output. "
                "Cerca di essere creativo ma tecnico. Salva in outputs/<project_name>/video_output.mp4. "
                "IMPORTANTE: segui le istruzioni del Handbook: Video Agency Pura."
            ),
            expected_output="File .mp4 generato fisicamente nella sandbox.",
            agent=ingegnere,
            context=[task_audit]
        )

        task_qa = Task(
            description="Esegui audit_workspace per verificare che il file .mp4 esista e sia valido.",
            expected_output="Validazione finale del render video.",
            agent=tribunale,
            context=[task_render]
        )

        crew = Crew(
            agents=[tenente, ingegnere, tribunale],
            tasks=[task_audit, task_render, task_qa],
            process=Process.sequential,
            verbose=False
        )

        result = crew.kickoff()
        _put({"type": "task_done", "agent": "Tribunale", "emoji": "📽️", "step": 3, "total": 3, "preview": "Render video completato e validato."})
        
        _put({
            "type": "done",
            "message": "Video Agency ha completato il montaggio.",
            "preview": str(result)[:300]
        })

    except Exception as e:
        logger.error("run_video_branch errore: %s", e, exc_info=True)
        _put({"type": "error", "message": f"Errore Agency Video: {str(e)}"})

    finally:
        _put(None)


# ── Runner ────────────────────────────────────────────────────────────────────

def _extract_json(text: str) -> dict | None:
    """Estrae JSON da output potenzialmente con testo extra."""
    text = text.strip()
    # Rimuovi markdown code fences se presenti
    text = re.sub(r"```(?:json)?\s*", "", text).strip("` \n")
    # Cerca il primo { ... } o [ ... ]
    match = re.search(r"\{[\s\S]*\}", text)
    if match:
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            pass
    return None


def run_canvas_crew(brief: str, context: dict, client_name: str | None) -> dict:
    """
    Entry point principale. Biforca su schema o canvas in base al brief.
    Canvas: pipeline 10 agenti con retry automatico (max 2).
    Schema: branch leggero via generate_conceptual_schema.
    """
    if is_schema_request(brief):
        logger.info("Brief rilevato come schema — biforcazione su schema branch")
        try:
            result_str = generate_conceptual_schema(brief)
            result = json.loads(result_str)
            if result.get("schema_ready"):
                return {"type": "schema_ready", **result}
            return {"type": "error", "message": result_str}
        except Exception as e:
            logger.error("Schema branch errore: %s", e)
            return {"type": "error", "message": str(e)}

    if is_office_request(brief):
        logger.info("Brief rilevato come Office — biforcazione su office branch")
        doc_type = _detect_office_type(brief) or "auto"
        try:
            result_str = generate_office_document(brief, doc_type)
            result = json.loads(result_str)
            if result.get("office_ready"):
                return {"type": "office_ready", **result}
            return {"type": "error", "message": result_str}
        except Exception as e:
            logger.error("Office branch errore: %s", e)
            return {"type": "error", "message": str(e)}

    context_snapshot = context.get("snapshot", "Nessun snapshot disponibile")
    max_retries = 2
    critic_feedback = ""

    for attempt in range(max_retries + 1):
        if attempt > 0:
            logger.info("CanvasCrew retry %d/%d", attempt, max_retries)

        try:
            agents = {
                "brief_enricher":         build_brief_enricher(context_snapshot),
                "artboard_curator":       build_artboard_curator(context_snapshot),
                "layout_architect":       build_layout_architect(),
                "asset_curator":          build_asset_curator(),
                "strumentista":           build_strumentista(),
                "canvas_board_generator": build_canvas_board_generator(),
                "massimalista":           build_massimalista(),
                "geometra":               build_geometra(),
                "tribunale":              build_tribunale(),
            }

            tasks = build_tasks(brief, client_name, agents, critic_feedback, context_snapshot)

            crew = Crew(
                agents=list(agents.values()),
                tasks=tasks,
                process=Process.sequential,
                verbose=True,
            )

            result = crew.kickoff()

            # 10 task: [0]=brief, [1]=curation, [5]=boards_raw, [6]=massimalista, [7]=geometra, [8]=tribunale, [9]=artigiano(boards_final)
            outputs = result.tasks_output
            brief_output    = outputs[0].raw if len(outputs) > 0 else ""
            boards_output   = outputs[9].raw if len(outputs) > 9 else (outputs[7].raw if len(outputs) > 7 else (outputs[5].raw if len(outputs) > 5 else ""))
            critique_output = outputs[8].raw if len(outputs) > 8 else ""

            # Parse brief per check domande_aperte
            brief_json = _extract_json(brief_output) or {}
            if brief_json.get("domande_aperte"):
                return {
                    "type": "clarification_needed",
                    "questions": brief_json["domande_aperte"],
                }

            # Parse boards
            boards_json = _extract_json(boards_output) or {}
            boards = boards_json.get("boards", [])

            # Parse critique
            critique_json = _extract_json(critique_output) or {}
            score = critique_json.get("total_score", 0)
            approved = critique_json.get("approved", False) or score >= 75

            if approved:
                logger.info("Canvas approvato (score: %d)", score)
                return {
                    "type": "canvas_ready",
                    "boards": boards,
                    "brief_used": brief_output,
                    "score": score,
                    "suggestions": critique_json.get("suggestions", []),
                    "metadata": {
                        "score": score,
                        "attempts": attempt + 1,
                        "client": client_name,
                    },
                }
            else:
                issues = critique_json.get("issues", [])
                critic_feedback = "\n".join(issues) if issues else critique_output[:500]
                logger.warning("Canvas non approvato (score: %d), issues: %s", score, issues)

        except Exception as e:
            logger.error("Errore attempt %d: %s", attempt, e, exc_info=True)
            if attempt == max_retries:
                raise

    # Dopo max retry: restituisce l'ultimo output comunque (l'utente decide)
    logger.warning("Max retry raggiunto — restituisco ultimo output non approvato")
    _boards = boards if 'boards' in dir() else []
    _score = score if 'score' in dir() else 0
    return {
        "type": "canvas_ready",
        "boards": _boards,
        "brief_used": brief_output if 'brief_output' in dir() else "",
        "score": _score,
        "suggestions": [],
        "approved": False,
        "metadata": {
            "score": _score,
            "attempts": max_retries + 1,
            "client": client_name,
            "warning": "Score sotto soglia ma consegnato comunque",
        },
    }


def run_brief_enricher_only(brief: str, context: dict, client_name: str | None) -> dict:
    """Esegue solo Agent 1 per pre-validare un brief prima della crew completa."""
    context_snapshot = context.get("snapshot", "")
    agent = build_brief_enricher(context_snapshot)

    # Costruisce solo il primo task con il solo agente esistente
    dummy_agents = {
        "brief_enricher":         agent,
        "artboard_curator":       agent,
        "layout_architect":       agent,
        "asset_curator":          agent,
        "strumentista":           agent,
        "canvas_board_generator": agent,
        "massimalista":           agent,
        "geometra":               agent,
        "tribunale":              agent,
    }
    tasks = build_tasks(brief, client_name, dummy_agents)
    first_task = tasks[0]
    first_task.context = []  # nessun contesto da task precedenti

    crew = Crew(agents=[agent], tasks=[first_task], process=Process.sequential, verbose=False)
    result = crew.kickoff()
    output = result.tasks_output[0].raw if result.tasks_output else ""
    brief_json = _extract_json(output) or {}
    return {
        "brief_json": brief_json,
        "raw": output,
        "needs_clarification": bool(brief_json.get("domande_aperte")),
        "questions": brief_json.get("domande_aperte", []),
    }


# ── Streaming runner ──────────────────────────────────────────────────────────

_AGENT_META = [
    ("Tenente x Brief Enricher",       "🎯", "SITREP militare + DNA extraction del brand"),
    ("Curatore x Artboard Curator",    "🖼️", "Strategia canvas: multi-board e gestione stati"),
    ("Alchimista x Layout Architect",  "⚗️", "Fusione atomica: struttura visiva inattaccabile"),
    ("Sperimentatore x Asset Curator", "🎞️", "Layer materico: assets con firma fisica"),
    ("Strumentista DIC",               "🛠️", "Technical production planner: sfrutta ogni strumento"),
    ("Ingegnere x Bambino x Generator","⚙️", "Tecnica off-label + imperfezione umana"),
    ("Massimalista DIC",               "🎭", "Editorial complexity guardian: rigetta il piattume"),
    ("Geometra DIC",                   "📐", "Audit spaziale: overlap, respiro, griglia, equilibrio"),
    ("Tribunale DIC",                  "⚖️", "Dibattito avversariale: Indeciso x Convinto x Forense"),
    ("Artigiano x Board Generator",    "🏺", "Micro-perfezioni finali + sentenza Professorotto"),
]


def _extract_thought_from_log(log: str) -> str:
    """Estrae la sezione Thought: dal log ReAct di LangChain."""
    if not log:
        return ""
    import re
    # Pattern ReAct: "Thought: ... \nAction:" o "Thought: ... \nFinal Answer:"
    m = re.search(r"Thought:\s*(.*?)(?=\nAction:|\nFinal Answer:|$)", log, re.DOTALL | re.IGNORECASE)
    if m:
        return m.group(1).strip()
    return log.strip()


def run_canvas_crew_streaming(
    brief: str,
    context: dict,
    client_name: str | None,
    event_queue,          # queue.Queue — producer
) -> None:
    """
    Esegue la CanvasCrew inviando eventi nel queue man mano che progredisce.
    Pensata per essere eseguita in un thread separato.
    Mette None come sentinel di fine stream.
    """
    from tools.rate_limiter import flash_limiter

    # ── Biforcazioni branch leggeri ───────────────────────────────────────────
    if is_schema_request(brief):
        logger.info("Brief rilevato come schema — biforcazione su schema branch (streaming)")
        run_schema_branch(brief, event_queue)
        return

    if is_office_request(brief):
        logger.info("Brief rilevato come Office — biforcazione su office branch (streaming)")
        run_office_branch(brief, event_queue)
        return
    if is_video_request(brief):
        logger.info("Brief rilevato come Video — biforcazione su video branch (streaming)")
        run_video_branch(brief, event_queue)
        return

    context_snapshot = context.get("snapshot", "Nessun snapshot disponibile.")
    max_retries = 2
    critic_feedback = ""

    completed = [0]   # indice task completati

    def _put(event: dict):
        try:
            event_queue.put_nowait(event)
        except Exception:
            pass

    def step_callback(step_output):
        """Chiamato dopo ogni step dell'agente (tool call o risposta finale)."""
        # Chiama il rate limiter PRIMA del prossimo step
        try:
            flash_limiter.wait_if_needed()
        except RuntimeError as e:
            _put({"type": "warning", "message": str(e)})

        agent_idx = min(completed[0], len(_AGENT_META) - 1)
        agent_name, emoji, _ = _AGENT_META[agent_idx]

        # Estrai thought e azione dall'output LangChain
        log = ""
        tool_name = ""
        tool_input_preview = ""

        if hasattr(step_output, "log"):
            log = step_output.log or ""
        if hasattr(step_output, "tool"):
            tool_name = step_output.tool or ""
        if hasattr(step_output, "tool_input"):
            ti = step_output.tool_input
            tool_input_preview = str(ti)[:100] if ti else ""
        # AgentFinish: ha return_values invece di tool
        if hasattr(step_output, "return_values") and not tool_name:
            rv = step_output.return_values or {}
            log = rv.get("output", log)

        thought = _extract_thought_from_log(log)

        event = {"type": "step", "agent": agent_name, "emoji": emoji}
        if thought:
            event["thought"] = thought
        if log:
            event["log"] = log # Invia il log completo ReAct
        if tool_name:
            event["tool"] = tool_name
            if tool_input_preview:
                event["tool_input"] = tool_input_preview
        _put(event)

    def task_callback(task_output):
        """Chiamato dopo il completamento di ogni task."""
        idx = completed[0]
        if idx < len(_AGENT_META):
            agent_name, emoji, _ = _AGENT_META[idx]
            raw_preview = (task_output.raw or "")[:250].strip() if hasattr(task_output, "raw") else ""
            _put({
                "type": "task_done",
                "agent": agent_name,
                "emoji": emoji,
                "step": idx + 1,
                "total": len(_AGENT_META),
                "preview": raw_preview,
            })
        completed[0] += 1

    context_snapshot = context.get("snapshot", "Nessun snapshot disponibile.")
    max_global_attempts = 2
    max_micro_loops = 3
    
    bad_dreams = [] # Memoria riflettiva delle collisioni e bocciature
    shared_screenshot = None # Path base64/file per il Tribunale
    critic_feedback = ""
    completed = [0] # Tracking progresso per UI
    
    def _put(event: dict):
        try: event_queue.put_nowait(event)
        except Exception: pass

    # Callback helpers (stessi di prima ma adattati ai sub-stage)
    def step_callback(step_output):
        try: flash_limiter.wait_if_needed()
        except RuntimeError as e: _put({"type": "warning", "message": str(e)})
        agent_idx = min(completed[0], len(_AGENT_META) - 1)
        agent_name, emoji, _ = _AGENT_META[agent_idx]
        log = getattr(step_output, "log", "")
        tool_name = getattr(step_output, "tool", "")
        ti = getattr(step_output, "tool_input", "")
        if hasattr(step_output, "return_values") and not tool_name:
            log = step_output.return_values.get("output", log)[:300]
        thought = _extract_thought_from_log(log)
        event = {"type": "step", "agent": agent_name, "emoji": emoji}
        if thought: event["thought"] = thought
        if tool_name:
            event["tool"] = tool_name
            event["tool_input"] = str(ti)[:100]
        _put(event)

    def task_callback(task_output):
        idx = completed[0]
        if idx < len(_AGENT_META):
            agent_name, emoji, _ = _AGENT_META[idx]
            _put({"type": "task_done", "agent": agent_name, "emoji": emoji, "step": idx + 1, "total": len(_AGENT_META)})
        completed[0] += 1

    try:
        # Loop Globale
        for global_attempt in range(max_global_attempts + 1):
            completed[0] = 0
            _put({"type": "crew_start", "attempt": global_attempt + 1, "message": "Avvio STAGE 1: Discovery & Strategy"})

            # Inizializziamo agenti
            agents = {
                "brief_enricher": build_brief_enricher(context_snapshot),
                "artboard_curator": build_artboard_curator(context_snapshot),
                "layout_architect": build_layout_architect(),
                "asset_curator": build_asset_curator(),
                "strumentista": build_strumentista(),
                "canvas_board_generator": build_canvas_board_generator(),
                "massimalista": build_massimalista(),
                "geometra": build_geometra(),
                "tribunale": build_tribunale(),
            }

            # ──────── STAGE 1: DISCOVERY ────────
            tasks_stage1 = build_tasks(brief, client_name, agents, critic_feedback, context_snapshot, bad_dreams)[:2]
            crew1 = Crew(agents=[agents["brief_enricher"], agents["artboard_curator"]], tasks=tasks_stage1, process=Process.sequential, step_callback=step_callback, task_callback=task_callback, verbose=True)
            res1 = crew1.kickoff()
            brief_output = res1.tasks_output[0].raw
            brief_json = _extract_json(brief_output) or {}
            if brief_json.get("domande_aperte"):
                _put({"type": "clarification_needed", "questions": brief_json["domande_aperte"]})
                return

            # ──────── STAGE 2: CREATIVE LOOP ────────
            micro_loop = 0
            while micro_loop < max_micro_loops:
                _put({"type": "step", "agent": "System Orchestrator", "emoji": "🔄", "thought": f"Esecuzione Micro-Loop Creativo {micro_loop+1}/{max_micro_loops}"})
                
                # 🧬 DNA POLICY ACTIVATION (Aggiornata: Tensione Concettuale)
                policy_id = brief_json.get("font_mood", "minimal")
                force_maximal = brief_json.get("stratification_needed", False)
                tension = brief_json.get("conceptual_tension", "Nessuna")
                
                active_agents = ["layout_architect", "asset_curator", "strumentista", "canvas_board_generator"]
                
                # Attivazione Massimalista basata sulla tensione o sul mood
                if force_maximal or policy_id in ["brutalist", "fashion", "luxury", "street"]:
                    active_agents.append("massimalista")
                    logger.info("Trigger Massimalista: %s (Tensione: %s)", "FORZATO DA TENSIONE" if force_maximal else "MODO STILE", tension)
                else:
                    logger.info("Trigger Massimalista: Inibito (Layout armonico rilevato)")

                all_tasks = build_tasks(brief, client_name, agents, critic_feedback, context_snapshot, bad_dreams, shared_screenshot)
                
                # Filtriamo i task creativi (indici 2 a 6) in base alla policy
                tasks_creative = []
                for i in range(2, 7):
                    task_name = ["layout", "assets", "strumentista", "generate", "massimalista"][i-2]
                    if task_name == "massimalista" and "massimalista" not in active_agents:
                        continue
                    tasks_creative.append(all_tasks[i])

                crew_creative = Crew(
                    agents=[agents[a] for a in active_agents],
                    tasks=tasks_creative, 
                    process=Process.sequential, 
                    step_callback=step_callback, 
                    task_callback=task_callback, 
                    verbose=True
                )
                res_creative = crew_creative.kickoff()
                boards_raw = res_creative.tasks_output[-1].raw
                
                # ──────── STAGE 3: VALIDATION ────────
                _put({"type": "step", "agent": "System Orchestrator", "emoji": "⚖️", "thought": "Avvio Fase di Validazione Spaziale ed Estetica (Tiered Evaluation)"})
                tasks_val = build_tasks(brief, client_name, agents, critic_feedback, context_snapshot, bad_dreams, shared_screenshot)[7:9]
                crew_val = Crew(agents=[agents["geometra"], agents["tribunale"]], tasks=tasks_val, process=Process.sequential, step_callback=step_callback, task_callback=task_callback, verbose=True)
                res_val = crew_val.kickoff(inputs={"image": shared_screenshot}) if shared_screenshot else crew_val.kickoff()
                
                geometra_output = res_val.tasks_output[0].raw
                critique_output = res_val.tasks_output[1].raw
                
                # Analysis
                critique_json = _extract_json(critique_output) or {}
                score = critique_json.get("total_score", 0)
                approved = critique_json.get("approved", False) or score >= 75
                
                if approved:
                    boards_json = _extract_json(geometra_output) or {}
                    _put({
                        "type": "done",
                        "boards": boards_json.get("boards", []),
                        "score": score,
                        "suggestions": critique_json.get("suggestions", []),
                        "approved": True
                    })
                    return
                else:
                    # SELF-CORRECTION: Popoliamo i Bad Dreams
                    issues = critique_json.get("issues", [])
                    bad_dreams.extend(issues)
                    critic_feedback = "\n".join(issues)
                    _put({"type": "retry", "attempt": micro_loop + 1, "score": score, "issues": issues})
                    
                    # Se il Geometra segnala sosta (Checkpoint) o abbiamo fallito troppi micro-loop
                    if "Checkpoint" in geometra_output or micro_loop == max_micro_loops - 1:
                        checkpoint_id = f"cp_{int(time.time())}"
                        _put({
                            "type": "checkpoint", 
                            "checkpoint_id": checkpoint_id,
                            "message": "Sistema in pausa per ottimizzazione manuale. Clicca 'Resume' per continuare.",
                            "boards": _extract_json(geometra_output).get("boards", [])
                        })
                        
                        # LOGICA DI PAUSA: attesa segnale esterno (File Lock)
                        lock_path = Path("crew/checkpoint.lock")
                        snapshot_path = Path("crew/checkpoint.snapshot.json")
                        lock_path.write_text(json.dumps({"status": "paused", "checkpoint_id": checkpoint_id}))
                        
                        logger.info("Crew in attesa di checkpoint: %s", checkpoint_id)
                        while lock_path.exists():
                            time.sleep(1.0)
                        
                        # Al riavvio, carichiamo le modifiche manuali (Ground Truth)
                        if snapshot_path.exists():
                            try:
                                snap_data = json.loads(snapshot_path.read_text())
                                context_snapshot = snap_data.get("snapshot", context_snapshot)
                                shared_screenshot = snap_data.get("screenshot") # Passabile al Tribunale
                                logger.info("Groud Truth utente caricata: %d chars", len(context_snapshot))
                                # Pulizia
                                snapshot_path.unlink()
                            except Exception as e:
                                logger.warning("Errore caricamento snapshot manuale: %s", e)

                        logger.info("Checkpoint sbloccato. Ripresa esecuzione.")
                    
                    micro_loop += 1
                    completed[0] = 2 # Reset counter progress per il prossimo loop creativo
            
            # Se usciamo dal micro-loop senza approvazione, proviamo un Global Retry (con reset agenti)
            critic_feedback += "\nFalliti micro-loop locali. Tentativo di rigenerazione totale."

        # Alla fine dei tentativi, restituiamo l'ultimo stato
        _put({"type": "done", "boards": _extract_json(geometra_output).get("boards", []), "score": score, "approved": False, "warning": "Consegnato dopo fallimento cicli di correzione."})

    except Exception as e:
        logger.error("Streaming error: %s", e, exc_info=True)
        _put({"type": "error", "message": str(e)})
    finally:
        # Cleanup lock files
        for p in [Path("crew/checkpoint.lock"), Path("crew/checkpoint.snapshot.json")]:
            if p.exists(): p.unlink()
        _put(None)
