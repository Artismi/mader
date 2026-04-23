# Handbook: Gestione Dati PDF-to-Excel (Cervello v3.0)

Questo manuale definisce il protocollo di estrazione dati da documenti non strutturati (PDF) e la loro conversione in formati tabulari validati (Excel) tramite l'uso della **Python Sandbox**.

---

## 1. PROTOCOLLO DI ANALISI (The Vision Audit)
Prima di scrivere codice, l'agente deve analizzare il documento sorgente tramite Vision (Claude/Gemini) per identificare:
- **Anchor Columns**: Colonne fisse (es: "Data", "Descrizione", "Importo").
- **Data Types**: Identificare se i numeri usano il punto o la virgola come separatore decimale.
- **Totals/Checksums**: Trovare i totali nel documento da usare come validazione post-estrazione.

## 2. REGOLE DI SCRITTURA CODICE (Python Sandbox)
L'agente deve generare script Python che rispettino i seguenti vincoli tecnici:
- **Librerie**: Usare `pandas` per la manipolazione e `openpyxl` per la scrittura Excel.
- **I/O**: Leggere sempre i file dalla root della sandbox (`outputs/project_name/`).
- **Error Handling**: Inserire blocchi `try-except` che stampino messaggi di errore parlanti per facilitare il self-correction loop dell'agente.

### Template Base suggerito:
```python
import pandas as pd
import json

def process_data():
    try:
        # 1. Caricamento dati (da lista di dizionari estratti via Vision)
        raw_data = [...] 
        df = pd.DataFrame(raw_data)
        
        # 2. Pulizia (Conversione tipi, rimozione simboli valuta)
        df['Importo'] = df['Importo'].replace('€', '').str.replace(',', '.').astype(float)
        
        # 3. Validazione
        total_extracted = df['Importo'].sum()
        # Confronta con total_audit fornito dal manuale/brief
        
        # 4. Export
        output_path = "outputs/project_alpha/excel/bilancio_estratto.xlsx"
        df.to_excel(output_path, index=False)
        
        print(json.dumps({"success": True, "output_file": output_path, "total": total_extracted}))
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))

if __name__ == "__main__":
    process_data()
```

## 3. PROCEDURA DI VALIDAZIONE (Checksum Loop)
1. Eseguire lo script.
2. Leggere lo stdout.
3. Se `success` è `False`, analizzare l'errore, correggere lo script e riprovare (max 3 tentativi).
4. Se `success` è `True`, confrontare il `total` calcolato con il totale visivo del PDF originale. Se la discrepanza è > 0.01%, rieseguire l'estrazione con parametri di visione più granulari.

---
**Nota Operativa**: Se il PDF contiene tabelle complesse su più pagine, procedere per "Chunk" e concatenare i DataFrame prima dell'export finale.
