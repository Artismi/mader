import json
import logging

logger = logging.getLogger(__name__)

def solve_layout_math(boards_json: str, grid_size: int = 8, padding: int = 16) -> str:
    """
    Risolve matematicamente i problemi di sovrapposizione e allineamento di uno o più board.
    
    Args:
        boards_json: Stringa JSON contenente l'oggetto {"boards": [...]}
        grid_size: Dimensione della griglia per lo snap (default 8pt)
        padding: Spazio minimo tra elementi non sovrapposti
        
    Returns:
        Stringa JSON aggiornata con le coordinate corrette e un report tecnico.
    """
    try:
        data = json.loads(boards_json)
        boards = data.get("boards", [])
        
        report = {
            "total_collisions_resolved": 0,
            "grid_snaps": 0,
            "visual_balance": []
        }

        for board in boards:
            elements = board.get("elements", [])
            width = board.get("width", 1080)
            height = board.get("height", 1080)
            
            # 1. Snap alla griglia
            for el in elements:
                orig_x, orig_y = el.get("x", 0), el.get("y", 0)
                el["x"] = round(el["x"] / grid_size) * grid_size
                el["y"] = round(el["y"] / grid_size) * grid_size
                el["w"] = round(el.get("w", 100) / grid_size) * grid_size
                el["h"] = round(el.get("h", 100) / grid_size) * grid_size
                
                if el["x"] != orig_x or el["y"] != orig_y:
                    report["grid_snaps"] += 1

            # 2. Risoluzione Collisioni (Iterativa)
            # Solo per elementi con zIndex >= 3 (non-background)
            iterations = 0
            max_iterations = 10
            while iterations < max_iterations:
                collisions_found = False
                for i in range(len(elements)):
                    for j in range(i + 1, len(elements)):
                        A = elements[i]
                        B = elements[j]
                        
                        # Salta se uno dei due è background (zIndex <= 2)
                        if A.get("zIndex", 0) <= 2 or B.get("zIndex", 0) <= 2:
                            continue
                            
                        # Box A
                        ax1, ay1 = A["x"], A["y"]
                        ax2, ay2 = ax1 + A["w"], ay1 + A["h"]
                        
                        # Box B
                        bx1, by1 = B["x"], B["y"]
                        bx2, by2 = bx1 + B["w"], by1 + B["h"]
                        
                        # Check Overlap
                        if (ax1 < bx2 and ax2 > bx1 and ay1 < by2 and ay2 > by1):
                            collisions_found = True
                            report["total_collisions_resolved"] += 1
                            
                            # Risoluzione: sposta l'elemento con zIndex più alto (o il secondo)
                            target = B if B.get("zIndex", 0) >= A.get("zIndex", 0) else A
                            
                            # Calcola direzione minima di uscita
                            dx1 = bx2 - ax1 + padding # sposta B a destra di A
                            dy1 = by2 - ay1 + padding # sposta B sotto A
                            
                            if (target["y"] + target["h"] + dy1) < height:
                                target["y"] += dy1
                            elif (target["x"] + target["w"] + dx1) < width:
                                target["x"] += dx1
                            else:
                                target["w"] = max(50, target["w"] - 20)
                                target["h"] = max(50, target["h"] - 20)
                
                if not collisions_found:
                    break
                iterations += 1

            # 2.5 Boundary Enforcement (Contenimento su Colonne/BG)
            # Se un elemento (text/image) è sopra un rect di sfondo (container), deve starci dentro.
            for el in [e for e in elements if e.get("zIndex", 0) > 2]:
                el_x1, el_x2 = el["x"], el["x"] + el["w"]
                el_y1, el_y2 = el["y"], el["y"] + el["h"]
                
                # Cerca il container (rect zIndex <= 2) con cui ha più overlap
                best_container = None
                max_overlap = 0
                for cont in [e for e in elements if e.get("zIndex", 0) <= 2 and e.get("type") == "rect"]:
                    cx1, cx2 = cont["x"], cont["x"] + cont["w"]
                    cy1, cy2 = cont["y"], cont["y"] + cont["h"]
                    
                    # Calcola area di overlap
                    ox1 = max(el_x1, cx1)
                    ox2 = min(el_x2, cx2)
                    oy1 = max(el_y1, cy1)
                    oy2 = min(el_y2, cy2)
                    
                    if ox1 < ox2 and oy1 < oy2:
                        area = (ox2 - ox1) * (oy2 - oy1)
                        if area > max_overlap:
                            max_overlap = area
                            best_container = cont
                
                # Se l'elemento è prevalentemente sopra un container (es. colonna bianca)
                if best_container and max_overlap > (el["w"] * el["h"] * 0.5):
                    cx1, cx2 = best_container["x"], best_container["x"] + best_container["w"]
                    
                    # Se il testo esce lateralmente dalla colonna
                    if el_x1 < cx1 + padding:
                        el["x"] = cx1 + padding
                        el_x1 = el["x"]
                    if el_x2 > cx2 - padding:
                        # Se è troppo largo, riduci la larghezza per farlo stare nella colonna
                        el["w"] = max(100, (cx2 - padding) - el["x"])
                        report["total_collisions_resolved"] += 1
                        logger.info(f"Boundary Enforcement: Elemento {el.get('id')} ridimensionato per stare nel container {best_container.get('id')}")

            # 3. Analisi Equilibrio Visivo
            if elements:
                cx = sum(e["x"] + e["w"]/2 for e in elements) / len(elements)
                cy = sum(e["y"] + e["h"]/2 for e in elements) / len(elements)
                balance_x = "LEFT" if cx < width * 0.4 else ("RIGHT" if cx > width * 0.6 else "CENTER")
                report["visual_balance"].append({
                    "board": board.get("name", "unnamed"),
                    "center_x": round(cx),
                    "center_y": round(cy),
                    "balance": balance_x
                })

        data["spatial_report"] = report
        return json.dumps(data, indent=2, ensure_ascii=False)

    except Exception as e:
        logger.error("Errore solve_layout_math: %s", e)
        return json.dumps({"error": str(e), "original_input": boards_json})
