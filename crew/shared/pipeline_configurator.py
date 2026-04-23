"""
Pipeline Configurator — meta-agente che conosce TUTTE le pipeline disponibili
e assembla dinamicamente il team ottimale per ogni task.

PRINCIPIO FONDAMENTALE: usa TUTTI gli agenti rilevanti, non essere tirchio.
Gli agenti di design sono cross-cutting layer — entrano ogni volta che l'estetica ha importanza.

COOKBOOK COMPLETO:
Ogni pipeline è documentata con l'esatta successione degli agenti,
cosa produce/consuma ogni agente, e i vincoli di ordinamento.
"""

from dataclasses import dataclass, field

from .intent_classifier import PipelineType


# ── Agent Catalog ─────────────────────────────────────────────────────────────

AGENT_CATALOG = {
    # ── Cross-domain / Design Agents ─────────────────────────────────────────
    "brief_enricher": {
        "codename": "Tenente",
        "domain": "cross",
        "role": "SITREP + Brand DNA extraction",
        "description": (
            "Arricchisce il brief grezzo: legge il Brand Handbook del cliente, "
            "cerca memorie approvate, chiama get_oklch_palette per la palette OKLCH precisa, "
            "determina font_mood. "
            "PRODUCE: brief_json con {obiettivo, formato, tono, palette, palette_oklch, "
            "font_mood, cta, immagine_tipo, domande_aperte, auto_assunzioni, handbook_found}."
        ),
        "produces": "brief_json",
        "consumes": ["raw_brief", "client_name", "context_snapshot"],
        "tools": ["read_client_handbook", "search_memories", "search_vault", "get_oklch_palette"],
        "is_design": True,
        "order_priority": 1,
    },
    "artboard_curator": {
        "codename": "Curatore",
        "domain": "canvas",
        "role": "Canvas state analysis + multi-board strategy",
        "description": (
            "Analizza il canvas esistente e decide la strategia di curation. "
            "Determina: action_type (CREATE_NEW/UPDATE_EXISTING/HYBRID), total_board_count, "
            "nome e dimensioni di ogni tavola, narrative_role, design_directive per ciascuna. "
            "CRITICO: total_board_count è il numero ESATTO di tavole da produrre — "
            "tutti gli agenti downstream devono rispettarlo."
        ),
        "produces": "curation_strategy_json",
        "consumes": ["brief_json", "canvas_state"],
        "tools": [],
        "is_design": True,
        "order_priority": 2,
    },
    "layout_architect": {
        "codename": "Alchimista",
        "domain": "design",
        "role": "Compositional structure + visual pattern selection",
        "description": (
            "Sceglie il pattern visivo dalla bible: EDITORIAL_SPLIT, OVERLAY_CARD, "
            "BRUTALIST_GRID, LUXURY_CENTERED, STORY_VERTICAL. "
            "Chiama get_design_recipes per few-shot examples, get_font_pair per la coppia tipografica. "
            "Progetta le sezioni con 10+ zone distinte (struttura, immagine, testo, accenti). "
            "PRODUCE: layout_spec_json con {pattern_used, board dims, font_pair, palette, sections[]}."
        ),
        "produces": "layout_spec_json",
        "consumes": ["brief_json", "curation_strategy_json"],
        "tools": ["get_oklch_palette", "get_design_recipes", "get_font_pair"],
        "is_design": True,
        "order_priority": 3,
    },
    "asset_curator": {
        "codename": "Sperimentatore",
        "domain": "design",
        "role": "Image sourcing with material texture signatures",
        "description": (
            "Per ogni image_zone del layout_spec: cerca assets cliente con list_client_assets, "
            "oppure genera con generate_image (prompt materici: Kodak Portra 400, Risograph, linen weave). "
            "Se bg_remove=true: chiama remove_background. Nessuna zona image vuota. "
            "PRODUCE: assets_manifest con {zone_id, source, url, bg_removed, description} per ogni zona."
        ),
        "produces": "assets_manifest",
        "consumes": ["brief_json", "layout_spec_json", "curation_strategy_json"],
        "tools": ["list_client_assets", "search_vault", "generate_image", "remove_background"],
        "is_design": True,
        "order_priority": 4,
    },
    "strumentista": {
        "codename": "Strumentista",
        "domain": "design",
        "role": "Technical production planning — tool assignments per element",
        "description": (
            "Produce il PRODUCTION PLAN che assegna uno strumento tecnico a ogni elemento del canvas. "
            "Catalogo: effetti WebGL (grain/neon/glitch/glass/clay/3d/bloom/riso/holo/wavy/vhs/matrix), "
            "procedural (halftone/dot_grid/wave_lines), gradients, charSpacing, opacity stratificata. "
            "VINCOLO: ogni strumento del catalogo ha almeno 1 uso pianificato. "
            "Il Board Generator non dovrebbe chiedersi 'quale effetto?' — lo Strumentista risponde prima. "
            "PRODUCE: production_plan_json con {layer_stack, tool_assignments, tools_used, total_planned_elements >= 12}."
        ),
        "produces": "production_plan_json",
        "consumes": ["layout_spec_json", "assets_manifest", "curation_strategy_json"],
        "tools": [],
        "is_design": True,
        "order_priority": 5,
    },
    "canvas_board_generator": {
        "codename": "Ingegnere×Bambino",
        "domain": "canvas",
        "role": "Fabric.js JSON generation + human imperfection",
        "description": (
            "Traduce layout_spec + assets_manifest + production_plan in boards[] per Fabric.js. "
            "LAYER INGEGNERE: usa ogni parametro Fabric.js in modo off-label (effects architetturali, "
            "procedural come struttura visiva, opacity stratificata per profondità). "
            "LAYER BAMBINO: introduce 1 imperfezione umana (angle ±1.7°, offset 3-5px fuori griglia, "
            "colore intuitivo). "
            "REGOLE: min 12 elementi/tavola, heading fontSize >= 96px, "
            "rispetta ESATTAMENTE total_board_count dalla curation_strategy. "
            "PRODUCE: {boards: [{name, width, height, overwrite, elements[]}]}."
        ),
        "produces": "boards[]",
        "consumes": ["layout_spec_json", "assets_manifest", "production_plan_json", "curation_strategy_json"],
        "tools": [],
        "is_design": True,
        "order_priority": 6,
    },
    "massimalista": {
        "codename": "Massimalista",
        "domain": "design",
        "role": "Editorial complexity guardian — layer enforcer",
        "description": (
            "Verifica 7 checklist editoriali: BG strutturale (>=2 rect), texture layer, "
            "immagine con trattamento, overlay geometrico, gerarchia tipografica 3 livelli, "
            "totale elementi >= 12, nessun monolita full-bleed. "
            "Per ogni FAIL: AGGIUNGE l'elemento mancante — non rimuove MAI nulla. "
            "SKIP AUTOMATICO se il brief contiene: 'minimal', 'clean', 'semplice', 'essenziale'. "
            "PRODUCE: boards[] arricchito + MASSIMALISTA REPORT per ogni tavola."
        ),
        "produces": "enriched_boards[]",
        "consumes": ["boards[]", "brief_json", "curation_strategy_json"],
        "tools": [],
        "is_design": True,
        "order_priority": 7,
    },
    "geometra": {
        "codename": "Geometra",
        "domain": "design",
        "role": "Spatial audit — overlap correction, grid snap, breathing room",
        "description": (
            "Audit matematico in 4 fasi: "
            "1) Rileva sovrapposizioni (bounding box check per tutti gli elementi con zIndex >= 3), "
            "2) Verifica respiro minimo 16px tra testi/immagini, "
            "3) Grid snap 4pt (arrotonda x/y/w/h al multiplo di 4), "
            "4) Equilibrio visivo (center_x mass tra 35-65% della board width). "
            "CRITICO: modifica SOLO x/y/w/h — mai colori, font, testo, effects. "
            "Eccezione grid snap: elementi con angle != 0 (imperfezioni Bambino) non si toccano. "
            "PRODUCE: boards[] con coordinate corrette + GEOMETRA REPORT (4 righe)."
        ),
        "produces": "corrected_boards[]",
        "consumes": ["enriched_boards[]", "curation_strategy_json"],
        "tools": [],
        "is_design": True,
        "order_priority": 8,
    },
    "tribunale": {
        "codename": "Tribunale",
        "domain": "design",
        "role": "Adversarial quality council — 3-phase deliberation",
        "description": (
            "Protocollo a 3 fasi nel ragionamento interno: "
            "L'INDECISO attacca (trova le 3 debolezze più gravi, gravità X/10), "
            "IL CONVINTO risponde (difende scelte deliberate O ammette errori con fix esatto in px/valore), "
            "IL FORENSE misura (WCAG contrasto, griglia 8pt, type scale ratio, cognitive load, attention flow). "
            "Scoring 0-100 su 4 assi: brief_adherence, visual_quality, brand_coherence, completeness. "
            "approved = true SOLO se total_score >= 75. "
            "Issues: SEMPRE specifici con misure ('fontSize 72 -> 96px', 'x: 37 -> 40px'). "
            "PRODUCE: quality_report JSON con total_score, approved, issues[], suggestions[]."
        ),
        "produces": "quality_report",
        "consumes": ["corrected_boards[]", "brief_json", "curation_strategy_json"],
        "tools": [],
        "is_design": True,
        "order_priority": 9,
    },
    "artigiano": {
        "codename": "Artigiano",
        "domain": "design",
        "role": "Micro-perfection finalizer — applies Tribunale fixes + craft touches",
        "description": (
            "STEP 1: applica TUTTI i fix del Tribunale (ogni issue[] con valore esatto). "
            "STEP 2: max 3 micro-perfezioni artigianali: "
            "scalda grigi puri (#808080 → +5-8° verso giallo), "
            "varia borderRadius di ±2px su secondari, "
            "aggiungi letterSpacing: 0.10 alle label uppercase mancanti, "
            "1 rotazione off 1-3° su elemento decorativo se manca il tocco Bambino. "
            "PRODUCE: boards[] finale con fix Tribunale + micro-perfezioni. "
            "NOTA: usa canvas_board_generator come agente fisico ma con context Tribunale + Geometra."
        ),
        "produces": "final_boards[]",
        "consumes": ["corrected_boards[]", "quality_report", "curation_strategy_json"],
        "tools": [],
        "is_design": True,
        "order_priority": 10,
    },

    # ── Domain: Excel ─────────────────────────────────────────────────────────
    "business_analyst": {
        "codename": "Analista",
        "domain": "excel",
        "role": "Data model + formula architecture + KPI design",
        "description": (
            "Analizza il brief da economista: identifica il tipo di foglio (budget, P&L, analisi, dashboard), "
            "progetta le colonne con tipi (currency_eur, percentage, number, date, text), "
            "pianifica le formule necessarie (=SUM, =IF, =VLOOKUP, =AVERAGE, =COUNTIF), "
            "definisce i KPI da evidenziare, struttura la gerarchia dati (header, subtotali, totale). "
            "PRODUCE: excel_schema_json con {sheet_title, columns[], data_rows_description, "
            "formulas_plan[], kpis[], summary_row, styling_hints}."
        ),
        "produces": "excel_schema_json",
        "consumes": ["brief_json"],
        "tools": ["search_memories"],
        "is_design": False,
        "order_priority": 2,
    },
    "excel_architect": {
        "codename": "Architetto Excel",
        "domain": "excel",
        "role": "Cell-level Excel generation with HyperFormula-compatible formulas",
        "description": (
            "Genera il prompt ultra-dettagliato per office-engine: "
            "descrive ogni colonna con formato e formula Excel reale (=SUM(B2:B10), =B2*C2, =IF(D2>0,'Positivo','Negativo')), "
            "dati di esempio realistici e contestuali (NO 'dato1', 'valore2'), "
            "istruzioni zebra striping, freeze header, AutoFilter, colonne totale. "
            "CRITICO: HyperFormula valuterà deterministicamente tutte le formule =. "
            "PRODUCE: enriched_prompt per generate_office_document(doc_type='excel')."
        ),
        "produces": "excel_enriched_prompt",
        "consumes": ["excel_schema_json", "brief_json"],
        "tools": ["generate_office_document"],
        "is_design": False,
        "order_priority": 3,
    },

    # ── Domain: Word ──────────────────────────────────────────────────────────
    "researcher": {
        "codename": "Ricercatore",
        "domain": "word",
        "role": "Anti-slop content research — domain-specific facts",
        "description": (
            "Cerca nel vault e nelle memorie contenuti reali e specifici. "
            "MANDATO ANTI-SLOP: zero frasi generiche, zero paragrafi banali. "
            "Trova: dati numerici reali, citazioni specifiche, riferimenti di settore, "
            "dettagli del cliente che rendono il documento unico e credibile. "
            "PRODUCE: research_notes con {facts[], citations[], client_specifics[], "
            "key_messages[], tone_examples[]}."
        ),
        "produces": "research_notes",
        "consumes": ["brief_json"],
        "tools": ["search_vault", "search_memories"],
        "is_design": False,
        "order_priority": 2,
    },
    "writer": {
        "codename": "Scrittore",
        "domain": "word",
        "role": "Professional document writer — structured, specific, no slop",
        "description": (
            "Scrive il documento completo usando research_notes come base. "
            "Struttura: titolo, eventuali sezioni H2/H3, paragrafi, eventuali liste. "
            "Tono: dedotto dal brief_json.tono + handbook_found. "
            "REGOLA: ogni affermazione ha un fatto reale dalla research o dal contesto cliente. "
            "PRODUCE: enriched_prompt per generate_office_document(doc_type='word') "
            "con struttura esplicita {title, sections[], author, date, notes_to_formatter}."
        ),
        "produces": "word_enriched_prompt",
        "consumes": ["brief_json", "research_notes"],
        "tools": ["generate_office_document"],
        "is_design": False,
        "order_priority": 3,
    },

    # ── Domain: PowerPoint ────────────────────────────────────────────────────
    "narrative_architect": {
        "codename": "Narratore",
        "domain": "pptx",
        "role": "Presentation narrative + arc design",
        "description": (
            "Progetta la struttura narrativa della presentazione. "
            "Arc standard: Hook → Problema → Soluzione → Prova → CTA. "
            "Decide: N slide, titolo di ogni slide, tipo di contenuto (bullets/grafico/citazione/immagine), "
            "messaggio-chiave per slide, tono per audience. "
            "PRODUCE: narrative_structure_json con {total_slides, arc_type, "
            "slides[{index, title, content_type, key_message, transition_note}]}."
        ),
        "produces": "narrative_structure_json",
        "consumes": ["brief_json"],
        "tools": ["search_vault", "search_memories"],
        "is_design": False,
        "order_priority": 2,
    },
    "slide_copywriter": {
        "codename": "Copywriter Slide",
        "domain": "pptx",
        "role": "Slide-level content writing — titles, bullets, presenter notes",
        "description": (
            "Scrive il contenuto testuale di ogni slide seguendo l'arc narrativo. "
            "Per ogni slide: titolo (max 8 parole, impattante), "
            "3-5 bullet points (max 10 parole/bullet, concreti e specifici), "
            "presenter notes (2-3 frasi per l'oratore). "
            "ANTI-SLOP: zero frasi like 'Lavoriamo per il tuo successo'. "
            "PRODUCE: slides_content_json con {slides[{index, title, bullets[], notes, visual_hint}]}."
        ),
        "produces": "slides_content_json",
        "consumes": ["narrative_structure_json", "brief_json"],
        "tools": [],
        "is_design": False,
        "order_priority": 3,
    },
    "slide_designer": {
        "codename": "Designer Slide",
        "domain": "pptx",
        "role": "Visual layout design — palette, typography, pptxgenjs layout spec",
        "description": (
            "Applica l'identità visiva alla presentazione. "
            "Chiama get_oklch_palette(font_mood) per palette hex e get_font_pair(font_mood) per la tipografia. "
            "Assegna a ogni slide: layout pptxgenjs (TITLE/TITLE_AND_CONTENT/TWO_COLUMN/BLANK/IMAGE_AND_TEXT), "
            "colori background/testo/accento, font heading/body, "
            "eventuale elemento grafico di accento (barra colorata, forma geometrica). "
            "Slide cover e hero slide ottengono trattamento di design massimo (ispirato all'Alchimista). "
            "PRODUCE: enriched_prompt per generate_office_document(doc_type='powerpoint') "
            "con slides[] complete di layout+content+style."
        ),
        "produces": "pptx_enriched_prompt",
        "consumes": ["slides_content_json", "brief_json"],
        "tools": ["get_oklch_palette", "get_font_pair", "generate_office_document"],
        "is_design": True,
        "order_priority": 4,
    },

    # ── Domain: Contabile ─────────────────────────────────────────────────────
    "accountant": {
        "codename": "Contabile",
        "domain": "contabile",
        "role": "Italian accounting logic — invoice, P&L, expense reports",
        "description": (
            "Gestisce la logica contabile italiana: "
            "IVA 22% (o aliquota ridotta/esente se indicata), ritenuta d'acconto 20% (se professionista), "
            "calcolo netto/lordo/totale da pagare. "
            "Rispetta normativa: fattura elettronica obbligatoria sopra soglia, "
            "L. 132/2025 per metadata AI nei documenti, regime forfettario se applicabile. "
            "Struttura documento: intestazione mittente/destinatario, voci con qt×prezzo, IVA, totale. "
            "PRODUCE: accounting_doc_json con {doc_type, header, items[], subtotal, iva_amount, "
            "total_lordo, payment_terms, legal_notes, legge_ia_metadata}."
        ),
        "produces": "accounting_doc_json",
        "consumes": ["brief_json"],
        "tools": ["search_memories"],
        "is_design": False,
        "order_priority": 2,
    },
    "invoice_designer": {
        "codename": "Designer Fattura",
        "domain": "contabile",
        "role": "Document visual design — brand-compliant invoice layout",
        "description": (
            "Formatta il documento contabile con le brand guidelines del cliente. "
            "Legge il handbook per: logo URL, colori brand, font preferiti. "
            "Layout: header (logo + P.IVA + dati mittente | dati destinatario), "
            "tabella voci (descrizione, qt, prezzo unitario, totale), "
            "sezione IVA + totale finale, note di pagamento, footer. "
            "PRODUCE: enriched_prompt per generate_office_document(doc_type='word') "
            "con tutte le istruzioni di formattazione incorporate."
        ),
        "produces": "contabile_enriched_prompt",
        "consumes": ["accounting_doc_json", "brief_json"],
        "tools": ["read_client_handbook", "generate_office_document"],
        "is_design": True,
        "order_priority": 3,
    },
}


# ── Pipeline Succession Protocols ─────────────────────────────────────────────

PIPELINE_PROTOCOLS: dict[PipelineType, dict] = {

    PipelineType.CANVAS: {
        "name": "Canvas Creative Pipeline — DIC Full Stack",
        "description": (
            "Pipeline grafica completa. 10 agenti sequenziali per Fabric.js canvas. "
            "Standard editoriale: Vogue/Wired/Domus."
        ),
        "agents": [
            "brief_enricher", "artboard_curator", "layout_architect", "asset_curator",
            "strumentista", "canvas_board_generator", "massimalista", "geometra",
            "tribunale", "artigiano",
        ],
        "succession_rules": [
            "brief_enricher [1] → produce brief_json: OGNI agente riceve in context",
            "artboard_curator [2] → total_board_count VINCOLANTE per tutti gli agenti downstream",
            "layout_architect [3] → richiede brief_json + curation_strategy_json",
            "asset_curator [4] → richiede layout_spec per conoscere image_zones",
            "strumentista [5] → DEVE precedere canvas_board_generator: assegna tools prima dell'esecuzione",
            "canvas_board_generator [6] → usa layout_spec + assets_manifest + production_plan in context",
            "massimalista [7] → AGGIUNGE, mai rimuove. SKIP se 'minimal'/'clean'/'essenziale' nel brief",
            "geometra [8] → modifica SOLO x/y/w/h. Mai colori/font/text/effects. Skip angle!=0",
            "tribunale [9] → approved = total_score >= 75",
            "artigiano [10] → task finale, usa canvas_board_generator come agente, context = Geometra+Tribunale",
        ],
        "quality_threshold": 75,
        "output_type": "boards_json",
        "output_event": "done",
        "design_intensity": "maximum",
    },

    PipelineType.SCHEMA: {
        "name": "Schema Conceptual Pipeline",
        "description": "Branch leggero SVG per schemi concettuali, mind map, diagrammi di flusso.",
        "agents": ["brief_enricher"],
        "succession_rules": [
            "Single-agent: bypassa la canvas pipeline a 10 agenti",
            "brief_enricher analizza tipo di schema (network/tree/flow/matrix)",
            "Chiama generate_conceptual_schema con il brief arricchito",
            "Emette schema_ready con SVG + metadata",
        ],
        "quality_threshold": 0,
        "output_type": "schema_svg",
        "output_event": "schema_ready",
        "design_intensity": "minimal",
    },

    PipelineType.EXCEL: {
        "name": "Excel Business Pipeline — Economist Stack",
        "description": (
            "Pipeline economica per fogli di calcolo professionali. "
            "HyperFormula valuta deterministicamente tutte le formule prima del salvataggio."
        ),
        "agents": ["brief_enricher", "business_analyst", "excel_architect"],
        "succession_rules": [
            "brief_enricher [1] → identifica tipo foglio: budget/P&L/analisi/dashboard/tracker",
            "business_analyst [2] → pensa da economista: KPI, formule, struttura dati gerarchica",
            "business_analyst [2] → produce excel_schema con colonne tipizzate e piano formule",
            "excel_architect [3] → genera prompt dettagliato con formule Excel reali (=SUM, =IF, =VLOOKUP)",
            "excel_architect [3] → chiama generate_office_document(doc_type='excel', prompt=enriched)",
            "office-engine.ts → HyperFormula valuta TUTTE le formule → exceljs scrive {formula, result}",
            "Emette office_ready con download_url",
        ],
        "quality_threshold": 0,
        "output_type": "excel_file",
        "output_event": "office_ready",
        "design_intensity": "low",
    },

    PipelineType.WORD: {
        "name": "Word Document Pipeline — Anti-Slop Stack",
        "description": (
            "Pipeline per documenti Word professionali. "
            "Researcher garantisce contenuti specifici e reali — zero frasi generiche."
        ),
        "agents": ["brief_enricher", "researcher", "writer"],
        "succession_rules": [
            "brief_enricher [1] → determina formato, tono, audience del documento",
            "researcher [2] → cerca nel vault contenuti specifici del cliente/settore",
            "researcher [2] → produce research_notes con fatti reali, zero slop",
            "writer [3] → usa research_notes come base: ogni affermazione ha un dato reale",
            "writer [3] → chiama generate_office_document(doc_type='word', prompt=enriched)",
            "Emette office_ready con download_url",
        ],
        "quality_threshold": 0,
        "output_type": "word_file",
        "output_event": "office_ready",
        "design_intensity": "low",
    },

    PipelineType.PPTX: {
        "name": "PowerPoint Presentation Pipeline — Narrative + Design Stack",
        "description": (
            "Pipeline per presentazioni professionali. "
            "Narrative Architect progetta l'arc, il Designer applica l'identità visiva DIC."
        ),
        "agents": ["brief_enricher", "narrative_architect", "slide_copywriter", "slide_designer"],
        "succession_rules": [
            "brief_enricher [1] → estrae brand DNA: palette, font_mood, tono per slide design",
            "narrative_architect [2] → progetta arc (Hook/Problema/Soluzione/Prova/CTA), N slide, struttura",
            "slide_copywriter [3] → scrive: titolo (max 8 parole), 3-5 bullet (max 10 parole), presenter notes",
            "slide_copywriter [3] → ANTI-SLOP: ogni bullet è concreto e specifico",
            "slide_designer [4] → chiama get_oklch_palette + get_font_pair per identità visiva",
            "slide_designer [4] → assegna layout pptxgenjs a ogni slide (TITLE/CONTENT/TWO_COLUMN/BLANK)",
            "slide_designer [4] → slide cover e hero ottengono design massimo (ispirato Alchimista DIC)",
            "slide_designer [4] → chiama generate_office_document(doc_type='powerpoint', prompt=enriched)",
            "Emette office_ready con download_url",
        ],
        "quality_threshold": 0,
        "output_type": "pptx_file",
        "output_event": "office_ready",
        "design_intensity": "high",
    },

    PipelineType.CONTABILE: {
        "name": "Contabile Document Pipeline — Italian Tax Compliance",
        "description": (
            "Pipeline per documenti contabili italiani: fatture, preventivi, note spese, bilanci. "
            "Compliance: IVA 22%, fattura elettronica, L. 132/2025."
        ),
        "agents": ["brief_enricher", "accountant", "invoice_designer"],
        "succession_rules": [
            "brief_enricher [1] → identifica tipo: fattura|preventivo|nota_spese|bilancio|piano_conti",
            "accountant [2] → calcola: IVA 22% (o aliquota corretta), ritenuta 20% se prof., netto/lordo",
            "accountant [2] → rispetta: fattura elettronica obbligatoria, L. 132/2025 metadata AI",
            "accountant [2] → struttura: intestazione, voci (qt×prezzo), IVA, totale, condizioni pagamento",
            "invoice_designer [3] → legge handbook cliente per logo/colori brand",
            "invoice_designer [3] → formatta: header brand, tabella voci, sezione IVA, footer legale",
            "invoice_designer [3] → chiama generate_office_document(doc_type=output_format, prompt=enriched)",
            "Bilanci → Excel, tutti gli altri → Word. Emette office_ready.",
        ],
        "quality_threshold": 0,
        "output_type": "contabile_file",
        "output_event": "office_ready",
        "design_intensity": "medium",
    },
}


# ── Pipeline Configurator ─────────────────────────────────────────────────────

@dataclass
class PipelineConfig:
    """Configurazione assemblatada per un task specifico."""
    pipeline_type: PipelineType
    agent_ids: list
    protocol: dict
    brief: str
    client_name: str | None = None
    context: dict = field(default_factory=dict)
    notes: str = ""


def configure(brief: str, client_name: str | None = None, context: dict = None) -> PipelineConfig:
    """
    Assembla la configurazione pipeline ottimale per il task.

    Logica di selezione:
    1. Intent classifier determina il tipo base
    2. Per PPTX: sempre include il slide_designer (design intensity: high)
    3. Per CONTABILE: output_format (word vs excel) dipende dal tipo documento
    4. Default: CANVAS con tutti e 10 gli agenti

    PRINCIPIO: non essere tirchio. Usa tutti gli agenti rilevanti.
    """
    from .intent_classifier import classify

    context = context or {}
    pipeline_type = classify(brief)
    protocol = PIPELINE_PROTOCOLS[pipeline_type]
    agent_ids = list(protocol["agents"])

    notes = f"Pipeline selezionata: {pipeline_type.value} ({protocol['name']})"

    return PipelineConfig(
        pipeline_type=pipeline_type,
        agent_ids=agent_ids,
        protocol=protocol,
        brief=brief,
        client_name=client_name,
        context=context,
        notes=notes,
    )


def get_agent_info(agent_id: str) -> dict:
    """Ritorna la scheda completa di un agente dal catalogo."""
    return AGENT_CATALOG.get(agent_id, {})


def get_protocol(pipeline_type: PipelineType) -> dict:
    """Ritorna il protocollo completo di una pipeline."""
    return PIPELINE_PROTOCOLS.get(pipeline_type, {})


def summarize_pipeline(pipeline_type: PipelineType) -> str:
    """Genera un summary human-readable della pipeline."""
    protocol = PIPELINE_PROTOCOLS.get(pipeline_type)
    if not protocol:
        return f"Pipeline {pipeline_type.value} non trovata."

    lines = [
        f"=== {protocol['name']} ===",
        protocol["description"],
        "",
        "AGENTI IN SUCCESSIONE:",
    ]
    for i, agent_id in enumerate(protocol["agents"], 1):
        agent = AGENT_CATALOG.get(agent_id, {})
        codename = agent.get("codename", agent_id)
        role = agent.get("role", "")
        produces = agent.get("produces", "")
        is_design = "🎨" if agent.get("is_design") else "📊"
        lines.append(f"  [{i}] {is_design} {codename} ({agent_id}) — {role}")
        lines.append(f"      → PRODUCE: {produces}")

    lines.append("")
    lines.append("REGOLE DI SUCCESSIONE:")
    for rule in protocol["succession_rules"]:
        lines.append(f"  • {rule}")

    lines.append("")
    lines.append(f"OUTPUT: {protocol['output_type']} | EVENT: {protocol['output_event']}")
    lines.append(f"DESIGN INTENSITY: {protocol['design_intensity']}")

    return "\n".join(lines)
