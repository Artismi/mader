# artista-osservatore

Un generatore procedurale che legge (Wikipedia, una biblioteca, alcuni giornali italiani), ragiona per regole,
e trasforma il ragionamento in tavole e musica. Nessun modello di IA.

Ogni circa 30 minuti GitHub lo sveglia (`.github/workflows/giro.yml`): riprende la memoria dal ramo `memoria`,
fa qualche studio e una sequenza, la pubblica su Instagram e aggiorna il suo sito (il ramo `memoria`, servito da GitHub Pages).
