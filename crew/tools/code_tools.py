import os
import subprocess
import json
import logging
import pathlib
from crewai.tools import tool

logger = logging.getLogger(__name__)

# Definizione della radice della Sandbox (Creative OS root / outputs)
# Assumiamo che questo script corra in crew/tools/
ROOT_DIR = pathlib.Path(__file__).parent.parent.parent.resolve()
SANDBOX_ROOT = ROOT_DIR / "outputs"

@tool("audit_workspace")
def audit_workspace(project_name: str | None = None) -> str:
    """
    Esegue una scansione ricorsiva della sandbox degli output.
    Utile per capire cosa hanno prodotto i 'colleghi' agenti in precedenza.
    restituisce un albero di file con metadati (dimensione, data).
    """
    if not SANDBOX_ROOT.exists():
        SANDBOX_ROOT.mkdir(parents=True, exist_ok=True)
    
    # Se project_name è fornito, scansiona solo quella sottocartella
    target_dir = SANDBOX_ROOT
    if project_name:
        target_dir = SANDBOX_ROOT / project_name
        if not target_dir.exists():
            return f"Sandbox per il progetto '{project_name}' non trovata."
    
    files_info = []
    for root, dirs, files in os.walk(target_dir):
        for file in files:
            path = pathlib.Path(root) / file
            rel_path = path.relative_to(SANDBOX_ROOT)
            stat = path.stat()
            files_info.append({
                "path": str(rel_path),
                "size_kb": round(stat.st_size / 1024, 2),
                "modified": stat.st_mtime
            })
    
    if not files_info:
        return "La sandbox è attualmente vuota."
    
    return json.dumps(files_info, indent=2)

@tool("python_executor")
def python_executor(code: str, project_name: str | None = None) -> str:
    """
    Esegue codice Python all'interno della sandbox del progetto.
    Puo' usare pandas e openpyxl. Il codice deve leggere/scrivere file 
    relativi alla root 'outputs/'.
    Esempio output: {"stdout": "...", "stderr": "...", "exit_code": 0}
    """
    # Assicura che la directory di progetto esista
    if project_name:
        (SANDBOX_ROOT / project_name).mkdir(parents=True, exist_ok=True)
    elif not SANDBOX_ROOT.exists():
        SANDBOX_ROOT.mkdir(parents=True, exist_ok=True)

    # Scrivi il codice in un file temporaneo all'interno di scratch/ (per non sporcare outputs)
    scratch_dir = ROOT_DIR / "scratch"
    scratch_dir.mkdir(exist_ok=True)
    script_path = scratch_dir / f"agent_script_{os.getpid()}.py"
    
    with open(script_path, "w", encoding="utf-8") as f:
        f.write(code)
    
    try:
        # Eseguiamo il processo. CWD impostato alla root del progetto per coerenza percorsi outputs/
        result = subprocess.run(
            ["python", str(script_path)],
            cwd=str(ROOT_DIR),
            capture_output=True,
            text=True,
            timeout=30 # Safety timeout
        )
        
        output = {
            "stdout": result.stdout,
            "stderr": result.stderr,
            "exit_code": result.returncode
        }
        return json.dumps(output, indent=2)
    except subprocess.TimeoutExpired:
        return json.dumps({"error": "Timeout: esecuzione interrotta dopo 30 secondi."})
    except Exception as e:
        return json.dumps({"error": str(e)})
    finally:
        if script_path.exists():
            script_path.unlink()
