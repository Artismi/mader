"""
Intent Classifier — classifica il brief in un tipo di pipeline.
Priorità: CONTABILE > SCHEMA > EXCEL > WORD > PPTX > CANVAS (default).
"""

from enum import Enum


class PipelineType(str, Enum):
    CANVAS = "canvas"
    SCHEMA = "schema"
    EXCEL = "excel"
    WORD = "word"
    PPTX = "pptx"
    CONTABILE = "contabile"


_KEYWORDS: dict[PipelineType, list[str]] = {
    PipelineType.CONTABILE: [
        "fattura", "preventivo", "nota spese", "ricevuta", "partita doppia",
        "registro contabile", "estratto conto", "piano dei conti", "conto economico",
        "stato patrimoniale", "fatturazione", "emetti fattura", "genera preventivo",
    ],
    PipelineType.SCHEMA: [
        "schema", "mappa concettuale", "mappa mentale", "mind map", "diagramma",
        "flusso", "grafo", "concept map", "knowledge graph", "architettura visiva",
        "visualizza il processo", "visualizza il sistema", "disegna il processo",
        "disegna la struttura", "mappa le relazioni", "schema del", "diagramma del",
        "flusso del", "flusso di",
    ],
    PipelineType.EXCEL: [
        "excel", "foglio di calcolo", "spreadsheet", "csv",
        "tabella numerica", "bilancio excel", "budget excel", "analisi dati",
        "tabella dati", "report numerico", "kpi dashboard", "tabella kpi",
        "piano finanziario", "proiezioni finanziarie",
    ],
    PipelineType.WORD: [
        "documento word", "documento di testo", "relazione", "contratto",
        "lettera formale", "proposta commerciale", "brief scritto", "report testuale",
        "documento formale", "offerta commerciale", "piano editoriale scritto",
        "policy", "manuale", "capitolato",
    ],
    PipelineType.PPTX: [
        "powerpoint", "presentazione", "pitch deck", "slide deck", "diapositive",
        "slides", "slideshow", "keynote", "presentazione aziendale",
        "presentazione clienti", "deck", "presentazione in slide",
    ],
    PipelineType.CANVAS: [
        "post", "banner", "locandina", "flyer", "copertina", "instagram",
        "linkedin", "grafica", "visual", "canvas", "layout", "social",
        "brochure", "poster", "tavola", "board",
    ],
}

# Parole canvas che, se presenti con parole PPTX, non fanno scattare PPTX
_CANVAS_OVERRIDE_FOR_PPTX = {"visual", "grafica", "layout", "board", "canvas"}


def classify(brief: str) -> PipelineType:
    """Classifica il brief nel tipo di pipeline più appropriato."""
    b = brief.lower()

    if any(k in b for k in _KEYWORDS[PipelineType.CONTABILE]):
        return PipelineType.CONTABILE

    has_canvas = any(k in b for k in _KEYWORDS[PipelineType.CANVAS])
    has_pptx = any(k in b for k in _KEYWORDS[PipelineType.PPTX])

    # Schema: solo se non c'è canvas
    if any(k in b for k in _KEYWORDS[PipelineType.SCHEMA]):
        if not has_canvas:
            return PipelineType.SCHEMA

    if any(k in b for k in _KEYWORDS[PipelineType.EXCEL]):
        return PipelineType.EXCEL

    if any(k in b for k in _KEYWORDS[PipelineType.WORD]):
        return PipelineType.WORD

    # PPTX: ha priorità su canvas
    if has_pptx:
        return PipelineType.PPTX

    # Canvas o default
    return PipelineType.CANVAS
