"""
Creative OS — Crew Service
FastAPI microservice che esegue le CrewAI pipelines.
Avviato automaticamente da Electron main.js.
"""

import os
import sys
import asyncio
import json
import queue
import logging
import threading
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from dotenv import load_dotenv

# Carica .env dalla directory del file
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='[crew] %(asctime)s %(levelname)s %(message)s',
    datefmt='%H:%M:%S',
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Crew Service avviato su porta %s", os.getenv("CREW_PORT", "8765"))
    yield
    logger.info("Crew Service spento.")


app = FastAPI(title="Creative OS Crew Service", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request / Response Models ─────────────────────────────────────────────────

class CanvasRequest(BaseModel):
    brief: str
    context: dict = {}
    client_name: str | None = None


class SchemaRequest(BaseModel):
    prompt: str
    context: dict = {}


class ClarificationResponse(BaseModel):
    type: str = "clarification_needed"
    questions: list[str]


class CanvasResponse(BaseModel):
    type: str = "canvas_ready"
    html: str
    brief_used: str
    score_json: str
    approved: bool
    metadata: dict = {}


# ── Routes ───────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "service": "crew"}


@app.post("/canvas")
async def canvas_endpoint(req: CanvasRequest):
    """
    Esegue la CanvasCrew completa (5 agenti sequenziali).
    Ritorna HTML editabile pronto per il rendering in UI.
    """
    try:
        # Import lazy per evitare import circolari e caricare solo quando serve
        from crews.canvas_crew import run_canvas_crew

        result = await asyncio.to_thread(
            run_canvas_crew,
            brief=req.brief,
            context=req.context,
            client_name=req.client_name,
        )
        return result

    except Exception as e:
        logger.error("Errore CanvasCrew: %s", str(e), exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/canvas/stream")
async def canvas_stream_endpoint(req: CanvasRequest):
    """
    Esegue la CanvasCrew in streaming SSE.
    Emette un evento JSON per ogni step/task/risultato degli agenti.
    Il client legge questi eventi e li mostra in real-time nella chat.

    Formato eventi:
      {"type":"crew_start","attempt":1,"message":"..."}
      {"type":"step","agent":"...","emoji":"...","thought":"...","tool":"...","tool_input":"..."}
      {"type":"task_done","agent":"...","emoji":"...","step":N,"total":5,"preview":"..."}
      {"type":"retry","attempt":N,"score":N,"issues":["..."]}
      {"type":"done","boards":[...],"score":N,"suggestions":[...],"approved":true}
      {"type":"clarification_needed","questions":["..."]}
      {"type":"warning","message":"..."}
      {"type":"error","message":"..."}
    """
    event_queue: queue.Queue = queue.Queue()

    def run_in_thread():
        try:
            from crews.canvas_crew import run_canvas_crew_streaming
            run_canvas_crew_streaming(
                brief=req.brief,
                context=req.context,
                client_name=req.client_name,
                event_queue=event_queue,
            )
        except Exception as e:
            logger.error("Errore thread streaming: %s", e, exc_info=True)
            try:
                event_queue.put_nowait({"type": "error", "message": str(e)})
                event_queue.put_nowait(None)
            except Exception:
                pass

    thread = threading.Thread(target=run_in_thread, daemon=True)
    thread.start()

    async def generate():
        loop = asyncio.get_event_loop()
        while True:
            try:
                # Timeout corto per permettere al loop asyncio di respirare
                event = await loop.run_in_executor(
                    None,
                    lambda: event_queue.get(timeout=1.0),
                )
                if event is None:
                    break
                yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"
            except queue.Empty:
                # Keepalive: evita timeout del proxy/browser dopo 30s di silenzio
                yield ": keepalive\n\n"
                continue
            except Exception as e:
                logger.error("Errore generator SSE: %s", e)
                break

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",    # disabilita buffering nginx
            "Connection": "keep-alive",
        },
    )


@app.post("/schema")
async def schema_endpoint(req: SchemaRequest):
    """
    Genera uno schema concettuale SVG strutturato da un brief testuale.
    Endpoint leggero: chiama direttamente il tool generate_conceptual_schema
    senza avviare la crew completa. Usabile da qualsiasi agente o client.
    """
    try:
        from tools.db_tools import generate_conceptual_schema as _gen_schema
        import json as _json

        result_str = await asyncio.to_thread(_gen_schema, req.prompt)

        try:
            result = _json.loads(result_str)
        except Exception:
            raise HTTPException(status_code=500, detail=result_str)

        if "error" in result_str.lower() and not result.get("schema_ready"):
            raise HTTPException(status_code=500, detail=result_str)

        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Errore /schema: %s", str(e), exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/enrich-brief")
async def enrich_brief_endpoint(req: CanvasRequest):
    """
    Esegue solo il Brief Enricher (Agent 1).
    Usato per pre-validare brief prima di avviare la crew completa.
    """
    try:
        from crews.canvas_crew import run_brief_enricher_only

        result = await asyncio.to_thread(
            run_brief_enricher_only,
            brief=req.brief,
            context=req.context,
            client_name=req.client_name,
        )
        return result

    except Exception as e:
        logger.error("Errore Brief Enricher: %s", str(e), exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ── Entry Point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("CREW_PORT", "8765"))
    uvicorn.run(
        "main:app",
        host="127.0.0.1",
        port=port,
        reload=False,
        log_level="info",
    )
