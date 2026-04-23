"""
Tool CrewAI per accesso ai dati Creative OS.
Tutte le chiamate vanno al Next.js API (localhost:3000) che ha accesso diretto a SQLite.
"""

import os
import json
import logging
import urllib.parse
import random

import httpx
from crewai.tools import tool
from .code_tools import audit_workspace, python_executor
from .spatial_tools import solve_layout_math as _solve_math

logger = logging.getLogger(__name__)

BASE_URL = os.getenv("NEXTJS_BASE_URL", "http://localhost:3000")
TIMEOUT = 15.0  # secondi


def _get(path: str, params: dict = None) -> dict | str:
    try:
        r = httpx.get(f"{BASE_URL}{path}", params=params, timeout=TIMEOUT)
        if r.status_code == 200:
            ct = r.headers.get("content-type", "")
            return r.json() if "json" in ct else r.text
        return {"error": f"HTTP {r.status_code}", "detail": r.text[:200]}
    except Exception as e:
        logger.error("GET %s errore: %s", path, e)
        return {"error": str(e)}


def _post(path: str, payload: dict) -> dict | str:
    try:
        r = httpx.post(f"{BASE_URL}{path}", json=payload, timeout=TIMEOUT)
        if r.status_code == 200:
            ct = r.headers.get("content-type", "")
            return r.json() if "json" in ct else r.text
        return {"error": f"HTTP {r.status_code}", "detail": r.text[:200]}
    except Exception as e:
        logger.error("POST %s errore: %s", path, e)
        return {"error": str(e)}


# ── Tool: Handbook Cliente ────────────────────────────────────────────────────

@tool("read_client_handbook")
def read_client_handbook(client_name: str) -> str:
    """
    Legge il Brand Handbook del cliente dal vault.
    Restituisce: palette colori, font mood, tono di voce, formati attivi, parole da evitare.
    Usa questo tool SEMPRE come prima azione quando hai il nome del cliente.
    """
    result = _get("/api/design/handbook", {"client": client_name})
    if isinstance(result, str) and len(result) > 50:
        return result
    return f"Handbook non trovato per '{client_name}'. Procedi con defaults: font_mood=minimal, palette=bianco/nero."


# ── Tool: Vault RAG ───────────────────────────────────────────────────────────

@tool("search_vault")
def search_vault(query: str) -> str:
    """
    Cerca nel vault Obsidian per trovare riferimenti rilevanti (note clienti, progetti, idee).
    Usa query specifiche: nome cliente + topic (es. "Mario Rossi brand guidelines").
    """
    result = _post("/api/ai/brain/search", {"query": query, "topK": 4})
    if isinstance(result, dict):
        chunks = result.get("chunks") or result.get("results") or []
        if chunks:
            return "\n---\n".join([c if isinstance(c, str) else c.get("content", "") for c in chunks])
    return "Nessun risultato nel vault per questa query."


# ── Tool: Memories ────────────────────────────────────────────────────────────

@tool("search_memories")
def search_memories(query: str) -> str:
    """
    Cerca nelle memorie persistenti del sistema (preferenze cliente, feedback passati, stili approvati).
    Usa per recuperare informazioni come "stile preferito di Mario Rossi" o "canvas approvati per Luca".
    """
    result = _post("/api/ai/memories/search", {"query": query, "topK": 3})
    if isinstance(result, dict):
        mems = result.get("memories", [])
        if mems:
            return "\n".join([m.get("content", "") if isinstance(m, dict) else str(m) for m in mems])
    return "Nessuna memoria trovata per questa query."


# ── Tool: Font Pair ───────────────────────────────────────────────────────────

@tool("get_font_pair")
def get_font_pair(mood: str) -> str:
    """
    Restituisce i dettagli completi di un font pair dato il mood.
    Moods disponibili: luxury, editorial, brutalist, minimal, fashion, tech, street, retro, cyber, calligraphy.
    Restituisce: heading/subheading/body/label families, weights, letterSpacing, palette suggerite.
    """
    result = _get("/api/design/font-pair", {"mood": mood})
    if isinstance(result, dict) and "error" not in result:
        return json.dumps(result, ensure_ascii=False, indent=2)
    # Fallback: leggi dal file JSON locale
    try:
        fp_path = os.path.join(os.path.dirname(__file__), "..", "knowledge", "font_pairs.json")
        with open(fp_path, "r", encoding="utf-8") as f:
            pairs = json.load(f)
        if mood in pairs:
            return json.dumps(pairs[mood], ensure_ascii=False, indent=2)
    except Exception:
        pass
    return f"Font pair '{mood}' non trovato. Usa 'minimal' come default."


# ── Tool: Genera Immagine ─────────────────────────────────────────────────────

@tool("generate_image")
def generate_image(prompt: str) -> str:
    """
    Genera un'immagine AI tramite Pollinations (gratuito, nessuna API key).
    Il prompt deve essere in inglese, dettagliato: soggetto + stile + illuminazione + mood.
    Esempio: "elegant jewelry ring, white studio background, high-key lighting, 85mm lens, luxury product photography"
    Restituisce: URL dell'immagine generata (usabile direttamente nel canvas).
    """
    seed = random.randint(0, 999_999_999)
    encoded = urllib.parse.quote(prompt)
    url = f"https://image.pollinations.ai/prompt/{encoded}?seed={seed}&width=1080&height=1080&nologo=true"
    logger.info("Immagine generata: %s", url[:80])
    return url


# ── Tool: Rimuovi Sfondo ──────────────────────────────────────────────────────

@tool("remove_background")
def remove_background(image_url_or_path: str) -> str:
    """
    Rimuove lo sfondo da un'immagine (scontornamento).
    Usare per: foto prodotti, ritratti, loghi su sfondo bianco.
    Input: URL dell'immagine o path locale.
    Restituisce: URL dell'immagine scontornata con sfondo trasparente (PNG).
    """
    result = _post("/api/assets/remove-bg", {"source": image_url_or_path})
    if isinstance(result, dict):
        out = result.get("outputUrl") or result.get("outputPath")
        if out:
            return out
        if "error" in result:
            logger.warning("remove_background fallito: %s — uso immagine originale", result["error"])
    return image_url_or_path  # fallback: usa immagine originale


# ── Tool: OKLCH Palette ───────────────────────────────────────────────────────

@tool("get_oklch_palette")
def get_oklch_palette(mood: str) -> str:
    """
    Restituisce la palette OKLCH per un mood dato, con valori hex pronti per Fabric.js.
    OKLCH è lo spazio colore percettivo: l'AI ragiona in OKLCH, converte in hex per il canvas.
    Moods: luxury, editorial, brutalist, minimal, tech, fashion, retro.
    Output: valori oklch() CSS + hex equivalenti + stringa pronta per il prompt.
    Usa questo tool per garantire palette visivamente coerenti e matematicamente corrette.
    """
    result = _get("/api/design/oklch", {"mood": mood})
    if isinstance(result, dict) and "hex" in result:
        hex_p = result["hex"]
        ps = result.get("prompt_string", "")
        out = [f"=== Palette OKLCH per mood '{mood}' ===", "Valori hex (usa questi per Fabric.js):"]
        for k, v in hex_p.items():
            out.append(f"  {k}: {v}")
        if ps:
            out.append("\nDettaglio OKLCH:")
            out.append(ps)
        return "\n".join(out)
    # Fallback: leggi dal design_skills.json locale
    try:
        ds_path = os.path.join(os.path.dirname(__file__), "..", "knowledge", "design_skills.json")
        with open(ds_path, "r", encoding="utf-8") as f:
            skills = json.load(f)
        key = f"design-{mood}"
        if key in skills and "oklch_palette" in skills[key]:
            pal = skills[key]["oklch_palette"]
            lines = [f"=== Palette OKLCH per mood '{mood}' (fallback locale) ==="]
            for k, v in pal.items():
                lines.append(f"  {k}: {v}")
            return "\n".join(lines)
    except Exception:
        pass
    return f"Palette OKLCH per '{mood}' non trovata. Usa hex: bg=#111111 primary=#ffffff accent=#ff4400."


# ── Tool: Design Recipes ──────────────────────────────────────────────────────

@tool("get_design_recipes")
def get_design_recipes(mood: str, format: str) -> str:
    """
    Recupera ricette di design (layout di successo passati) per il mood e formato richiesti.
    Le ricette sono esempi few-shot: strutture visive già approvate che devono ispirare il layout corrente.
    mood: luxury|editorial|brutalist|minimal|tech|fashion|retro
    format: instagram_square|instagram_story|linkedin_post|poster_a4|banner_web
    Usa come riferimento per NON ricominciare da zero — un buon layout rispetta e supera le ricette esistenti.
    """
    result = _get("/api/design/recipes", {"mood": mood, "format": format, "few_shot": "1", "limit": "3"})
    if isinstance(result, str) and len(result) > 30:
        return result
    if isinstance(result, dict) and "error" not in result:
        return json.dumps(result, ensure_ascii=False, indent=2)[:800]
    return f"Nessuna ricetta disponibile per mood='{mood}', format='{format}'. Crea un layout originale di alta qualità."


# ── Tool: Genera Schema Concettuale ──────────────────────────────────────────

@tool("generate_conceptual_schema")
def generate_conceptual_schema(prompt: str) -> str:
    """
    Genera uno schema concettuale visivo strutturato (nodi, connessioni, gruppi, etichette) in formato SVG.
    Usa questo tool quando il brief richiede: mappe concettuali, flussi di processo, diagrammi di sistema,
    architetture, mind maps, schemi relazionali.
    Input: descrizione testuale dello schema da generare.
    Restituisce: JSON con { svg, title, layout_type, node_count, edge_count } oppure { error }.
    Il campo 'svg' contiene la stringa SVG completa pronta per essere caricata nel canvas.
    """
    result = _post("/api/ai/schema", {"prompt": prompt})
    if isinstance(result, dict):
        if "error" in result:
            return f"Errore generazione schema: {result['error']}"
        svg = result.get("svg", "")
        title = result.get("title", "Schema")
        layout = result.get("layout_type", "network")
        nodes = result.get("node_count", 0)
        edges = result.get("edge_count", 0)
        # Restituisce un summary + il token speciale per il frontend
        return json.dumps({
            "schema_ready": True,
            "svg": svg,
            "title": title,
            "layout_type": layout,
            "node_count": nodes,
            "edge_count": edges,
        }, ensure_ascii=False)
    return f"Risposta inattesa dal servizio schema: {str(result)[:200]}"


@tool("generate_office_document")
def generate_office_document(prompt: str, doc_type: str = "auto") -> str:
    """
    Genera un documento Office strutturato (Excel, Word o PowerPoint) a partire da una descrizione testuale.
    doc_type può essere: 'excel', 'word', 'powerpoint', oppure 'auto' per rilevamento automatico.
    Input: prompt = descrizione del contenuto; doc_type = tipo di documento.
    Restituisce: JSON con { office_ready, doc_type, title, download_url, preview_text } oppure { error }.
    Usa quando il brief richiede: fogli calcolo, tabelle dati, report Word, presentazioni PowerPoint.
    """
    result = _post("/api/ai/office", {"prompt": prompt, "doc_type": doc_type})
    if isinstance(result, dict):
        if "error" in result:
            return f"Errore generazione documento Office: {result['error']}"
        return json.dumps({
            "office_ready": True,
            "doc_type": result.get("doc_type", doc_type),
            "title": result.get("title", "Documento"),
            "download_url": result.get("download_url", ""),
            "preview_text": result.get("preview_text", ""),
        }, ensure_ascii=False)
    return f"Risposta inattesa dal servizio office: {str(result)[:200]}"


# ── Tool: Lista Assets Cliente ────────────────────────────────────────────────

@tool("list_client_assets")
def list_client_assets(client_name: str) -> str:
    """
    Lista gli assets (immagini, loghi) disponibili per un cliente specifico.
    Usa questo tool prima di generate_image — meglio usare materiali reali del cliente.
    """
    result = _get("/api/creative-assets", {"clientName": client_name, "limit": "10"})
    if isinstance(result, dict):
        assets = result.get("assets", [])
        if assets:
            lines = []
            for a in assets:
                name = a.get("name", "senza nome")
                url = a.get("url") or a.get("path", "")
                atype = a.get("type", "")
                lines.append(f"- {name} ({atype}): {url}")
            return "\n".join(lines)
    return f"Nessun asset trovato per '{client_name}'."


@tool("solve_layout_math")
def solve_layout_math(boards_json: str) -> str:
    """
    Risolve matematicamente i problemi di sovrapposizione (overlap) e allineamento (grid-snap) del layout.
    Input: un JSON string che contiene {"boards": [...]}.
    Output: il JSON aggiornato con le coordinate corrette e un report tecnico delle correzioni effettuate.
    Usa questo tool SEMPRE dopo che il Generator ha prodotto la bozza o se il Geometra rileva errori di collisione.
    """
    return _solve_math(boards_json)


# Esponiamo i tool di code_tools per facilità di import
audit_workspace = audit_workspace
python_executor = python_executor
