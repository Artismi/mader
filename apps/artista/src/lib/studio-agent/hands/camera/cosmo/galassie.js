// galassie.js — le galassie come CONSEGUENZA: dall'alone di materia oscura alle stelle del catalogo.
//
// Al posto delle formule di cosmo.js (tipo sorteggiato, stelle nate a caso uniforme nella storia, Z = una formula
// del tempo e del raggio, supernove da costanti) qui c'è una catena di cause, ognuna con la sua legge:
//   1. L'ALONE. Il picco del campo di densità (G.peso, in unità dello scarto del campo) dice quanto è densa la
//      regione; da lì la massa dell'alone (insiemi di escursione: in una regione più densa la soglia del collasso è
//      più vicina, e crollano masse più grandi). La sua storia di crescita e le sue fusioni vengono dalle leggi
//      misurate sulle simulazioni; il suo MOMENTO ANGOLARE dalle maree dei picchi vicini veri (teoria delle coppie
//      mareali): chi sente una marea più forte, e ha il proto-alone più storto rispetto a lei, gira di più.
//   2. IL GAS. Entra con la materia oscura (la frazione cosmica Ωb/Ωm), si scalda alla temperatura viriale e deve
//      RAFFREDDARSI per cadere: negli aloni piccoli lo fa subito, in quelli grandi ci mette più dell'età
//      dell'universo (e il buco nero centrale lo tiene caldo): per questo le galassie giganti smettono di fare
//      stelle. Cadendo conserva il momento angolare e si posa in un DISCO di scala λ·R_vir/√2 (Mo, Mao & White):
//      il gas di ogni passo porta il momento angolare che l'alone ha guadagnato in quel passo (ΔJ/ΔM, più della
//      media: viene da più lontano), e si posa più in fuori (il disco cresce dall'interno verso l'esterno).
//   3. LE STELLE. Anello per anello nasce stelle il gas MOLECOLARE, in circa due miliardi di anni; quanta parte del gas
//      sia molecolare lo decide la pressione a metà dello strato (il peso del gas nel campo suo e delle stelle): quasi
//      tutto dove il disco è denso, quasi niente ai bordi, senza soglie. Negli scoppi (gas molto denso) si fa più in
//      fretta, e torna la pendenza 1,4 di Kennicutt. Le supernove lanciano una parte del gas fuori dall'alone (il
//      vento, pagato con la loro energia), da dove ricade: presto in un alone grande, quasi mai in uno piccolo.
//   4. I METALLI. Ogni generazione, morendo (chi e quando: le vite e i resti di stelle.js sulla distribuzione
//      delle masse di leggi.js), restituisce al gas del suo anello il suo involucro e i metalli nuovi; il gas che
//      arriva da fuori è povero e diluisce; il vento ne porta via. Z(tempo, raggio) è il BILANCIO di tutto questo,
//      e ogni stella prende la Z del gas da cui nasce. Il bilancio è chiuso (forma.bilancio) e si controlla.
//   5. LE FUSIONI. Un compagno entrato nell'alone scende al centro per attrito dinamico; se pesa abbastanza
//      scompiglia il disco in uno SFEROIDE (il raggio dall'energia che si conserva) e il gas precipita al centro, dove
//      brucia in uno scoppio le cui stelle sono dello sferoide anche loro. Se pesa poco il disco resta, e al centro cade
//      solo il gas che la fusione priva del momento angolare (quello più interno: Hopkins et al.).
//      Il TIPO esce da qui: ellittica se più di quattro quinti delle stelle stanno nello sferoide, cioè una fusione
//      grande e tardiva, oppure tante fusioni in un alone grande dove il gas non si raffredda più a rifare il disco;
//      lenticolare se un disco c'è ma non ha più gas freddo per fare bracci; altrimenti spirale (anche con un grosso
//      rigonfiamento, se il disco è ricresciuto dopo la fusione).
//   6. I BRACCI. L'amplificazione di taglio: quanti bracci dal peso del disco rispetto alla curva di rotazione
//      (m = κ²R/4πGΣ), quanto avvolti dal taglio della curva (Michikoshi & Kokubo), quanto marcati da quanto è
//      freddo il disco (Q di Toomre); la barra se il disco pesa abbastanza (Efstathiou, Lake & Negroponte).
//      Una stella nasce nel braccio (lì il gas è più denso) e ci resta finché il braccio vive: mezzo giro.
//   7. LE SUPERNOVE DI OGGI: il ritmo è quello delle stelle massicce nate di recente più le nane bianche in
//      coppia delle generazioni passate; le ultime esplose sono stelle vere, e il resto sta dove stava la stella.
//
// IL CATALOGO È UN CAMPIONE. Una galassia ha 10⁹–10¹² stelle; stelleGalassia() ne dà `quante` (2500): ognuna è
// estratta tra TUTTE le stelle mai nate nella galassia (quando, dove e con che metalli: in proporzione alla massa
// nata in quell'anello in quel passo; la massa dalla distribuzione di Kroupa) e ne rappresenta `peso` (campo
// `peso` di ogni stella: le stelle vere che rappresenta, ~10⁸). La somma massa × peso torna con la massa in
// stelle e resti di forma (entro lo scarto del campione). Fanno eccezione le ULTIME SUPERNOVE (fino a 8, più
// giovani di 10⁵ anni): quelle da collasso sono stelle vere, una per una (peso 1), messe negli ultimi posti del
// catalogo come stella di neutroni o buco nero, e il loro resto sta su di loro.
//
// IN TRE DIMENSIONI E NEL TEMPO (per spazio3d.js): cinematica() dà, anello per anello, le dispersioni delle stelle, lo
// spessore del disco, la velocità con cui girano i bracci; motoStella() il moto di ogni stella del campione (cerchio
// guida, epiciclo, su e giù; nello sferoide la sua orbita); densitaGalassia() la forma continua (stelle, gas, polvere);
// galassiaAlTempo() com'era a un altro tempo. Le leggi sono dichiarate accanto a quelle funzioni.
//
// LA LUCE E IL COLORE (per chi disegna): colorePerTemperatura() e coloreCorpoNero() danno il colore vero di un corpo nero
// (Planck sulle curve dell'occhio, poi sRGB); popolazione() la luce di una generazione per ogni M☉ nata, passo d'età per
// passo (luce: in tutto, L☉; luceV: quella che l'occhio vede; tinta: rosso, verde e blu lineari); luceGenerazione(età) e
// luceNascite(τ) le stesse a un'età qualsiasi e per le stelle più giovani di τ. forma.anelli porta, anello per anello, la
// luce e il colore del disco (luce, luceV, colore) e la parte delle stelle più giovani della vita di un braccio
// (luceGiovani, luceVGiovani, coloreGiovani, vitaBraccio): è la luce dei bracci, senza fattori scelti.
//
// CHE COSA EMERGE (non è scritto: esce dalla catena): il tipo (spirale / lenticolare / ellittica), la massa in
// stelle e in gas, la scala del disco e la sua crescita dall'interno, la curva di rotazione, la storia della
// formazione stellare (presto e in fretta nelle giganti, lenta nelle piccole), Z(t, r) con la relazione
// età–metallicità e il gradiente radiale, la relazione massa–metallicità, il numero e il passo dei bracci, la
// barra, il ritmo delle supernove dei due tipi, il raggio dello sferoide, il colore, chi ha il buco nero grande.
//
// LEGGI MISURATE O PRESE DALLE SIMULAZIONI (usate così, non derivate; i numeri sono in LEGGI):
//   · lo spettro delle fluttuazioni: funzione di trasferimento di Bardeen et al. 1986 (BBKS) con il parametro di
//     forma di Sugiyama 1995, normalizzata a σ₈ (leggi.js COSMO); soglia del collasso sferico δc = 1,686;
//   · la sovradensità viriale: Bryan & Norman 1998 (18π² + 82x − 39x²);
//   · la concentrazione dell'alone: Bullock et al. 2001 (c = 4·a/a_c, con a_c quando è crollato l'1% della massa);
//   · la crescita media dell'alone e il ritmo delle fusioni: Fakhouri, Ma & Boylan-Kolchin 2010 (MNRAS 406, 2267,
//     eq. 1 e 2, simulazioni Millennium); il tempo di attrito dinamico: Boylan-Kolchin, Ma & Quataert 2008
//     (MNRAS 383, 93, eq. 5–6); la circolarità delle orbite: 0,5 ± 0,2 (Khochfar & Burkert 2006);
//   · lo spin: distribuzione log-normale, mediana 0,035 e larghezza 0,5 (Bullock et al. 2001); qui NON è
//     sorteggiato tutto: metà della varianza è il posto che la marea vera dei vicini ha tra quelle del cosmo;
//   · il disco: R_d = λ′·R_vir/√2·f_R (Mo, Mao & White 1998, MNRAS 295, 319, eq. 28 e 32 [V]). Lo spin di qui è λ′ di
//     Bullock et al. (J = √2·λ′·M·V·R), che vale λ·f_c^−½ con λ lo spin di Peebles che usano Mo, Mao & White (Bullock et al.
//     2001, ApJ 555, 240, §2 [V]): la correzione f_c^−½ dell'eq. 28 è quindi già dentro λ′ (prima era applicata due volte, e i
//     dischi venivano il 12% più piccoli), e in f_R entra λ = λ′·√f_c. Il gas che cade in un passo si distribuisce in raggio
//     come un disco esponenziale con quella scala;
//   · GLI ANELLI sono in unità di quella scala (R_d0: quella che avrebbe oggi un disco con lo spin dell'alone): da
//     0,079·R_d0 a 8·R_d0 (dentro il primo bordo e fuori dall'ultimo sta la stessa parte, lo 0,3%, di un disco
//     esponenziale), con i bordi in progressione geometrica: ogni anello è largo il 27% del suo raggio;
//   · il raffreddamento del gas caldo: curva di Sutherland & Dopita 1993, qui raccordata con potenze (a metalli
//     zero: frenamento 2,4·10⁻²⁷·√T più le righe dell'elio 5·10⁻²³·(T/10⁵)^−1,5 erg cm³/s; i metalli: 1,6·10⁻¹⁹·Z/√T,
//     McKee & Cowie 1977). È un raccordo fatto a memoria, buono entro un fattore ~1,5 tra 10⁵ e 10⁸ K;
//     il flusso di raffreddamento è quello di White & Frenk 1991 (gas isotermo, ρ ∝ r⁻²);
//   · il momento finale di un resto di supernova: 2,8·10⁵ M☉·km/s · n^−0,17 (Kim & Ostriker 2015, ApJ 802, 99,
//     simulazioni); la dispersione del gas neutro: 10 km/s (misurata nell'idrogeno delle galassie);
//   · il buco nero che scalda il gas caldo: Croton et al. 2006 (MNRAS 365, 11: ṁ = 6·10⁻⁶ M☉/anno ·
//     (M_bn/10⁸)·(f_caldo/0,1)·(V/200)³, resa 0,1). È una legge dei modelli semi-analitici, non una misura;
//   · il vento del nucleo attivo dopo una fusione: M_via = ε_wind·ε_r·Δm_bn·c/V_fuga, ε_wind = 0,5 (Somerville et al. 2008,
//     MNRAS 391, 481, §2.10, eq. 17: tarata sulle simulazioni di fusioni con il buco nero); Δm_bn è la crescita del buco nero
//     che segue lo sferoide (Kormendy & Ho), presa dal gas freddo del nucleo;
//   · la polvere del gas: G/D in funzione di Z, una spezzata (Rémy-Ruyer et al. 2014, A&A 563, A31, tabella 1);
//   · il gas lanciato fuori dall'alone ci ricade in 18 Ga·(10¹⁰ M☉/M_alone) (Henriques et al. 2013, MNRAS 431,
//     3373: anche questa dai modelli semi-analitici): subito in una galassia grande (una fontana), mai in una nana;
//   · LE NASCITE: Σ_SFR = ν₀·[1 + (Σ_gas/Σ₀)^q]·f_mol·Σ_gas. Il gas molecolare delle spirali fa stelle a ritmo costante,
//     ν₀ = 0,525 ± 0,25 per Ga (Leroy et al. 2008, AJ 136, 2782 [V]; Bigiel et al. 2008, AJ 136, 2846: 2 Ga [V]); la parte
//     molecolare viene dalla pressione, Σ_H2/Σ_HI = (P/P₀)^α con P₀/k_B = 10^4,23 K/cm³ e α = 0,80 (Leroy et al. 2008,
//     tabella 6, le spirali [V]: l'idea è di Blitz & Rosolowsky 2006, ApJ 650, 933, che con una pressione senza il peso del
//     gas trovano 10^4,54 e 0,92 [V]) e P = (π/2)·G·Σ_gas·(Σ_gas + Σ★·σ_g/σ★) (Elmegreen 1989 [R]; σ_g = 10 km/s, σ★ la
//     dispersione verticale delle stelle di cinematica(): è la stessa pressione di vuoto_mezzo.js). Ad alta densità il
//     fattore [1 + (Σ_gas/Σ₀)^q], Σ₀ = 200 M☉/pc² e q = 0,4, riporta alla pendenza 1,4 di Kennicutt 1998 (Lagos et al.
//     2011, MNRAS 416, 1566, eq. 9 [V]: numeri scelti da loro). Σ_gas è tutto il gas, elio compreso; le masse sono di
//     Kroupa (come in Leroy et al.). NIENTE SOGLIA: quella di Kennicutt 1989 (Σ_crit = 0,69·κ·σ_g/3,36G), che prima spegneva
//     le nascite, non si vede nei dati (Leroy et al. 2008 [V]: «no clear evidence for a Q_gas threshold»); un anello non fa
//     stelle solo se in un passo non arriva a farne una (una massa media di Kroupa) [D];
//   · le rese: metalli nuovi di una supernova da collasso m_Z = (0,0118 + 0,00548·m)·m M☉ (Bailin & Harris 2009,
//     ApJ 695, 1082; Bailin 2018, ApJ 863, 99, app. B: segue le tabelle di Nomoto et al. 2013 fino a 40 M☉);
//     energia 10⁴⁴ J per supernova; una Ia brucia in metalli tutta la nana bianca (la massa di Chandrasekhar); le
//     giganti asintotiche danno carbonio e azoto nuovi (Karakas 2010 [R], elementi.js); la ricetta di ogni canale, elemento per
//     elemento, è in elementi.js (Kobayashi et al. 2006, tabella 3 [V]: collasso e W7);
//   · le Ia: ritardi ∝ t^−1,1, in tutto 1,3 ogni 1000 M☉ di stelle nate (Maoz & Graur 2017, ApJ 848, 25), a
//     partire dalla morte della più grande stella che lascia una nana bianca (da stelle.js);
//   · le fusioni: «maggiore» se i barioni del compagno sono più di 0,3 di quelli della galassia (Hopkins et al.
//     2009): tutte le stelle nello sferoide, tutto il gas al centro in uno scoppio che fa stelle dello sferoide (Cole et
//     al. 2000 [R]); il raggio di ciò che resta: Cole et al. 2000 (energia conservata, c = 0,5, f_orb = 1). «Minore»: al
//     centro cade solo il gas dentro R_gas = α·F·(1 − f_gas)·f_disco·2μ/(1 + μ)·R_d, con α = 1 e F = 1,2 la media sulle
//     orbite (Hopkins et al. 2009, ApJ 691, 1168, eq. 7–9 e §5 [V]; dalle simulazioni); per il gas del compagno la stessa
//     legge vista da lui (2/(1 + μ) al posto di 2μ/(1 + μ)) [D], e ciò che non cade si posa sul disco (Cole et al. 2000);
//   · il buco nero: M_bn = 0,49·10⁹·(M_sferoide/10¹¹)^1,17 M☉, scarto 0,28 dex (Kormendy & Ho 2013); quanto è
//     acceso oggi: frazioni di Eddington distribuite come λ^−0,65 (Aird et al. 2012);
//   · i bracci: m = κ²R/(4πGΣ) (amplificatore di Toomre con X = 2: D'Onghia 2015); tan(passo) = (2/7)·√(4−2Γ)/Γ
//     (Michikoshi & Kokubo 2014, ApJ 787, 174, eq. 15); la barra se V_max/√(G·M_d/R_d) < 1,1 (Efstathiou, Lake
//     & Negroponte 1982); i bracci vivono circa un giro (Sellwood & Carlberg 1984; Baba et al. 2013);
//   · i resti di supernova: fine della fase di Sedov a 2,9·10⁴·n^(−9/17) anni (Blondin et al. 1998), 10% dell'energia
//     in raggi cosmici; le pulsar: periodo alla nascita 0,3 ± 0,15 s (Faucher-Giguère & Kaspi 2006), spinta
//     265 km/s (Hobbs et al. 2005); le nane bianche si raffreddano con la legge di Mestel (1952);
//   · da leggi.js e stelle.js: COSMO, la distribuzione di Kroupa (massaNascita), le vite e i resti delle stelle.
// PARAMETRI LIBERI (non misurati; nessuno decide le masse, le stelle o i tipi):
//   (Due scelte che prima erano tarate ora non lo sono più. L'altezza della fluttuazione che fa l'alone, LEGGI.raro, è
//   la mediana della legge della prima traversata, 0,6745: l'alone mediano di quella regione; ne viene un picco medio
//   con un alone di 1,3·10¹² M☉ e il più alto di 2·10¹³. E l'energia che le supernove lasciano al vento non è più una
//   frazione scelta: è quella che resta in moto in un resto quando ha rallentato fino alla velocità del gas, ½·p·σ_g
//   con p di Kim & Ostriker: il 3% a una particella per cm³. La Via Lattea e le frazioni dei tipi escono come escono.)
//   · LEGGI.germe = 10⁵ M☉: il buco nero di una galassia senza sferoide; LEGGI.getto = 10⁻³: la parte di ṁc² che
//     il getto dà ai raggi cosmici; LEGGI.Qstelle = 2: il Q a cui le stelle del disco si regolano da sole;
//   · il contrasto dei bracci nelle stelle: da 0 (Q = 2: l'amplificatore di Toomre non guadagna) a 0,45 (Q ≈ 1),
//     lineare in Q; nel gas il doppio. (Il guadagno vero dell'amplificatore qui non è calcolato.)
// SEMPLIFICAZIONI:
//   · il campo di cosmo.js ha due dimensioni e solo onde lunghe (fino a 9 per lato): è letto come il campo lineare
//     di oggi filtrato a quel numero d'onda; lo scarto σ del filtro è calcolato dallo spettro vero. I vicini sono
//     a decine di Mpc: non si fondono mai tra loro nel tempo che c'è stato (lo dice l'argomento dei tempi, che
//     qui dà solo la «prossima fusione»); le fusioni avvenute sono con compagni che non ci sono più, estratti
//     dalla legge del ritmo; ogni compagno è una galassia fatta con queste stesse leggi (senza fusioni sue);
//   · la storia dell'alone è quella media della sua massa (niente scarto da alone ad alone, tranne le fusioni);
//   · 20 anelli e 46 passi di 0,3 miliardi di anni: le stelle massicce muoiono «subito», lo scoppio di una
//     fusione dura un passo (le stelle nate nel passo di una fusione maggiore sono tutte dello sferoide, anche le poche
//     nate fuori dal centro); il gas dell'alone è isotermo, tutto alla stessa Z, e quello che si raffredda ha il
//     momento angolare medio di quello che c'è (non quello degli strati interni, che cadono prima);
//   · lo scoppio di una fusione avviene nell'anello centrale, qualunque sia la sua larghezza (0,079 scale del disco);
//     il gas del compagno che non cade al centro prende la scala del disco di qui (il suo momento angolare non è seguito);
//   · la pressione che fa le molecole conta le stelle del disco, non quelle dello sferoide;
//   · niente migrazione radiale delle stelle, niente flussi radiali del gas; Z è la somma dei metalli, e accanto a ogni
//     serbatoio di metalli c'è il suo vettore di CANALI (chi li ha fatti: le supernove da collasso di quattro metallicità, le Ia,
//     il carbonio e l'azoto delle giganti asintotiche; elementi.js), che si muove con lui nella stessa proporzione: da lì la
//     miscela di nascita di ogni stella (miscelaDiNascita), elemento per elemento. Le giganti restituiscono, oltre ai metalli
//     con cui sono nate, il carbonio e l'azoto nuovi (Karakas 2010, ricordati: elementi.js reseGigante);
//   · la curva di rotazione: alone di Navarro-Frenk-White non contratto dai barioni, disco esponenziale sottile
//     (Freeman) con la massa e il raggio medio degli anelli, sferoide di Hernquist;
//   · la galassia è disegnata di faccia; uno sferoide ha uno schiacciamento apparente estratto (0,7 ± 0,15);
//   · la luce è quella di sequenza principale (stelle.js non ha ancora le giganti): serve solo per il colore.
// CHE COSA NON TORNA (misurato in test/test_galassie.mjs, che stampa il confronto con la Via Lattea e i tipi). Niente
// qui è tarato sulla Via Lattea, e si vede:
//   · la Via Lattea della prova (alone 10¹², spin 0,04) fa 3,0·10¹⁰ M☉ di stelle (vera: 5–6) e gira a 183 km/s a 8 kpc
//     (vera: 220–240): il suo gas caldo resta quasi senza metalli (il vento ne porta su pochi) e si raffredda piano. Per
//     questo ha anche troppo gas rispetto alle stelle (1,2·10¹⁰ M☉: vero 0,7–1,2), e il disco a 8 kpc cresce tardi: lì,
//     4,6 Ga fa, il gas aveva 0,56 Z☉ (oggi 0,97; il gas vicino al Sole di allora ne aveva 0,7–0,9). Z = 1 allora c'era a
//     5,2 kpc: senza migrazione delle stelle, il Sole del modello nasce lì (quello vero è nato a 4,4–7,7 kpc: Minchev et
//     al. 2013). Il resto torna: scala 2,4 kpc, 2,6 M☉/anno, il massimo delle nascite a 5 kpc e il 95% entro 15, il
//     gradiente dei metalli −0,06 dex/kpc (vero −0,04…−0,07), 2,5 Z☉ al centro;
//   · gli aloni piccoli fanno troppe stelle: a 10¹¹ M☉ il 10% dell'alone è in stelle (nell'universo vero lo 0,5–1%), a
//     3·10¹¹ il 10% (vero: 2%); il massimo dell'efficienza cade lì invece che a 10¹². Il vento che esce dalla fisica dei
//     resti (3% dell'energia) è troppo debole per le galassie piccole; e le rese di stelle.js (sopra 23 M☉ il nucleo
//     ricade in un buco nero e non restituisce metalli: 0,74 Z☉ per M☉ nata) non ne lascerebbero perdere di più;
//   · IL GAS CHIUSO SI ARRICCHISCE TROPPO. Dove il gas non riceve altro gas e non ne perde (il centro dopo una fusione
//     maggiore; i dischi degli aloni grandi, che il buco nero tiene senza rifornimento) i metalli salgono come in una
//     scatola chiusa, Z = resa·ln(1/frazione di gas). Il vento del nucleo attivo dopo ogni fusione (passo 7 di evolvi:
//     Somerville et al. 2008) porta via una parte del gas rimasto dallo scoppio (le stelle che nascono oggi nelle ellittiche
//     scendono da 3,8 a 2,6 Z☉), ma il resto, nell'anello centrale, continua a fare stelle per 1–2 Ga e a riprendersi il gas
//     che loro restituiscono: nel primo anello di 40 galassie del cosmo 1 la mediana è 4,2 Z☉ (prima 4,5; le più ricche vere:
//     2–3). Le rese non c'entrano (0,77 Z☉ di metalli nuovi per M☉ nata, più bassa delle tabelle di Kroupa perché sopra 23 M☉
//     il nucleo ricade in un buco nero). TRE LEGGI PROVATE E TOLTE (21/11/2026; misure sul primo anello di 40 galassie del cosmo 1,
//     mediana 4,23 Z☉): ognuna, scritta senza numeri scelti, rompe un riscontro che oggi torna, e nessuna porta il centro sotto 3,6.
//     (a) i flussi viscosi di Lin & Pringle (1987, ApJ 320, L87; ν = r²/t★): nel cosmo la mediana scende a 3,6–3,8, ma la Via
//     Lattea di prova va da 2,6 a 3,6 Z☉ al centro, da 1,0 a 0,4 a 8 kpc e la scala del disco da 2,4 a 1,3 kpc: il
//     flusso porta verso il centro gas già arricchito e fa più ripido il gradiente, come in Lacey & Fall 1985 e Bilitewski &
//     Schönrich 2012, e con t_ν = t★ corre a 2r/t★ (5 km/s a 8 kpc, sopra quel che si misura); (b) il calore delle Ia dello
//     sferoide nel gas caldo (Ciotti et al. 1991; Ciotti & Ostriker 2007), con la legge del buco nero di Croton, L/(½V²): spegne
//     il raffreddamento (le ellittiche del cosmo 1 passano da 35 a 39 su 59, oltre il 65% della prova) e la Z del centro non si
//     muove (−0,01); (c) la marea della galassia di Martig et al. 2009 (ApJ 707, 250, eq. 5 [V]: una nube si stacca solo dove la
//     densità del disco supera −(3Ωr/2πG)·dΩ/dr), con lo strato di gas isotermo di Spitzer: presa intera spegne a metà le nascite
//     vicino al Sole (la densità media lì è appena sopra la marea), presa solo per la marea in più dello sferoide scende a 4,10,
//     ma lascia anelli con 200 M☉/pc² di gas e nessuna nascita, mentre le ellittiche vere fanno stelle con un'efficienza 2–5 volte
//     più bassa, non zero (Davis et al. 2014 [R]): il criterio sulla densità media è troppo netto per il gas a grumi. E il resto
//     del centro non lo ferma: le stelle che il gas fa nel passo dopo lo scoppio sono un disco nucleare denso che lo tiene sopra
//     la marea. Quello che manca
//     davvero è, con ogni probabilità, l'uscita dei metalli delle supernove dal centro prima che si mescolino (Mac Low & Ferrara
//     1999 [R]) o un buco nero che mangia e soffia via il gas restituito anche fuori dalle fusioni (Ciotti & Ostriker 2007 [R]);
//   · le ellittiche fanno ancora troppe stelle: per massa, un quinto delle spirali (0,007 contro 0,034 per Ga; vere:
//     meno di un decimo), tutte nell'anello centrale, dal gas restituito dalle stelle nate lì dopo l'ultima fusione;
//   · la legge di Kennicutt torna sull'intervallo intero (pendenza 1,41 da 3 a 10⁵ M☉/pc²), ma tra i soli scoppi è più
//     piatta (1,2) e nei dischi di oggi, contando il gas atomico dei bordi, più ripida (1,8; è 1,4 sopra 10 M☉/pc²);
//   · metà delle stelle di una galassia sta entro 1 kpc dal centro (nelle vere di questa massa entro 3–5): i dischi dei
//     primi 4 Ga, quando l'alone è piccolo, sono minuscoli, e ogni fusione maggiore porta tutto il gas al centro;
//   · tutte le galassie fanno le stelle presto (metà entro i primi 4 Ga; la Via Lattea vera a 5): le ellittiche non
//     si distinguono dalle spirali per l'età delle stelle, ma per quando si sono messe insieme;
//   · le galassie segnate sono le grandi (aloni da 4·10¹¹ a 2·10¹³ M☉, mediana 1,3·10¹²): metà sono ellittiche (44–53%
//     nei tre cosmi provati; tra le galassie grandi vere, ellittiche e lenticolari sono circa metà; tra tutte il 10–20%).
//     Nessuna lenticolare: un disco che resta tiene sempre abbastanza gas per i bracci. Qualche galassia detta «spirale»
//     ha solo un piccolo disco al centro, nato dopo l'ultima fusione (meno di quattro quinti delle stelle nello sferoide);
//   · senza fusioni (la Via Lattea della prova) non c'è sferoide e il buco nero resta il germe: 10⁵ invece di 4·10⁶ M☉;
//   · la legge del raffreddamento è un raccordo: da lei dipende quante stelle fa un alone di 10¹²;
//   · le pulsar vengono debolissime (il campo delle stelle alla nascita, conservando il flusso, dà 10⁵–10⁹ T ma il
//     periodo di 0,3 s frena poco): nei raggi cosmici contano i resti e il getto.

import { COSTANTI, COSMO, ANNO, MSOLE, LSOLE, TSOLE, KPC, MPC, DELTA_C, inversaNormale, etaUniverso, massaNascita, massaChandrasekhar } from './leggi.js';
import * as ST from './stelle.js';
import { sorgente } from './eventi.js';
import { reseGigante, CANALI, abbondanzeDaCanali } from './elementi.js'; // (i canali dei metalli: chi li ha fatti, per la catena degli elementi)

// ---------- LE LEGGI E I PARAMETRI (vedi l'intestazione)
export const LEGGI = {
  deltaC: DELTA_C, // la soglia del collasso sferico (in sovradensità lineare): (3/20)(12π)^(2/3), calcolata in leggi.js
  raro: inversaNormale(3 / 4), // (Φ⁻¹(¾) = 0,6745, calcolata) l'altezza, in scarti, della fluttuazione piccola che ha fatto l'alone: la MEDIANA della legge della prima traversata (|campana|: metà della materia di quella regione sta in aloni più grandi, metà in più piccoli). Non è tarato
  spin: [0.035, 0.5], // mediana e larghezza (in logaritmo naturale) del parametro di spin (Bullock et al. 2001)
  concentrazione: [4, 0.01], // Bullock et al. 2001: c = K·a/a_c, con a_c quando è crollata la frazione F della massa
  crescita: [46.1, 1.1, 1.11], // Fakhouri et al. 2010, eq. 2 (media): M☉/anno a 10¹² M☉, esponente, pendenza in z
  fusioni: { A: 0.0104, xi: 9.72e-3, alfa: 0.133, beta: -1.995, gamma: 0.263, eta: 0.0993 }, // Fakhouri et al. 2010, eq. 1
  attrito: [0.216, 1.3, 1.9], // Boylan-Kolchin et al. 2008: τ/τ_dyn = A·(M/m)^b/ln(1+M/m)·exp(c·circolarità)
  circolarita: [0.5, 0.2],
  maggiore: 0.3, // sopra questo rapporto di barioni la fusione scompiglia il disco
  cole: 0.5, // Cole et al. 2000: l'energia dell'orbita nella fusione, f_orb/c con c = 0,5
  KS: [2.5e-4, 1.4], // Kennicutt 1998 (ApJ 498, 541): Σ_SFR = 2,5·10⁻⁴·Σ_gas^1,4 M☉/anno/kpc², la media su un disco intero (idrogeno soltanto, masse di Salpeter). Qui NON è più la legge delle nascite: resta come riscontro (la prova la misura sugli anelli)
  molecole: [10 ** 4.23, 0.8], // Σ_H2/Σ_HI = (P/P₀)^α: P₀/k_B (K·cm⁻³) e α. [V] Leroy et al. 2008 (AJ 136, 2782), tabella 6, «spirali, insieme»: misurati con la pressione di Elmegreen che si usa qui (con quella senza il peso del gas, Blitz & Rosolowsky 2006 trovano 10^4,54 e 0,92)
  nascite: [0.525, 200, 0.4], // Σ_SFR = ν₀·[1 + (Σ_gas/Σ₀)^q]·f_mol·Σ_gas. ν₀ (Ga⁻¹): [V] Leroy et al. 2008, il gas molecolare delle spirali fa stelle in 1,9 Ga (5,25 ± 2,5·10⁻¹⁰ per anno; Bigiel et al. 2008: 2 Ga); Σ₀ (M☉/pc²) e q: [V] Lagos et al. 2011 (MNRAS 416, 1566), eq. 9, scelti da loro perché ad alta densità torni la pendenza 1,4 di Kennicutt
  scoppio: [1, 1.2], // R_gas/R_d = α·F·(1 − f_gas)·f_disco·2μ/(1 + μ): [V] Hopkins et al. 2009 (ApJ 691, 1168), eq. 7–9 e §5: α «∼ 1», F ≈ 1,2 la media sulle orbite
  soglia: [0.69, 6, 3.36], // Kennicutt 1989: Σ_crit = α·κ·σ_g/(3,36·G). NON è più un interruttore delle nascite (Leroy et al. 2008 non trovano soglie in Q). Resta il secondo numero, 6 km/s: la dispersione del gas freddo, con cui nascono le stelle (cinematica, vuoto_mezzo.js)
  sigmaGas: 10, // (km/s) la dispersione del gas neutro, per il Q dei bracci
  Qstelle: 2, // PARAMETRO LIBERO
  resa: [0.0118, 0.00548], // m_Z = (B + C·m)·m (Bailin & Harris 2009)
  energiaSN: 1e44, // joule
  momentoSN: [2.8e5, -0.17], // (M☉·km/s, esponente della densità in cm⁻³) il momento che un resto di supernova lascia al gas quando ha irradiato il suo calore (Kim & Ostriker 2015, ApJ 802, 99)
  ritorno: 18, // (Ga) il gas soffiato fuori dall'alone ci ricade in ritorno·(10¹⁰ M☉/M_alone) (Henriques et al. 2013)
  Ia: [1.3e-3, -1.1], // per M☉ nata, e pendenza dei ritardi (Maoz & Graur 2017)
  bucoNero: [0.49e9, 1.17, 0.28], // Kormendy & Ho 2013
  germe: 1e5, // PARAMETRO LIBERO: (M☉) il buco nero di partenza, in una galassia senza sferoide
  radio: [6e-6, 0.1], // Croton et al. 2006: κ (M☉/anno) e resa
  quasar: 0.5, // ε_wind: la parte della spinta della luce del buco nero acceso che passa al vento del nucleo, M_via·V_fuga = ε_wind·ε_r·Δm·c (Somerville et al. 2008, MNRAS 391, 481, §2.10, eq. 16–17 [V]: il numero con cui la legge ridà il gas soffiato via nelle simulazioni di fusioni con il buco nero, la loro fig. 1)
  eddington: -0.65, // Aird et al. 2012
  getto: 1e-3, // PARAMETRO LIBERO
  barra: 1.1, // Efstathiou, Lake & Negroponte 1982
  sedov: [2.9e4, -9 / 17], cosmici: 0.1, // Blondin et al. 1998; la parte dell'energia di un resto che va in raggi cosmici
  pulsar: [0.3, 0.15, 265], // periodo alla nascita (s), suo scarto, spinta (km/s)
  spessoreGas: 0.1, // (kpc) la mezza altezza dello strato di gas, per la densità attorno a un resto
  assi: [0.7, 0.15], // lo schiacciamento apparente di uno sferoide (Lambas et al. 1992)
  rapportoVerticale: 0.5, // σ_z/σ_R delle stelle del disco (misurato vicino al Sole: Dehnen & Binney 1998)
  corotazione: 1.2, // la corotazione di una barra, in lunghezze della barra (misurato: Aguerri et al. 2003)
  polvere: 0.5, // la parte dei metalli che sta nei grani nella Via Lattea (Draine 2011): la usa ancora il mezzo tra le stelle (vuoto_mezzo.js, vuoto_oggetti.js); la galassia usa polvereZ
  polvereZ: [2.21, 0.96, 3.1, 8.1 - 8.69], // il gas per la polvere in funzione dei metalli, una spezzata in log: log(G/D) = a − log(Z/Z☉) sopra la rottura, b − α_L·log(Z/Z☉) sotto; a, b, α_L e la rottura in log(Z/Z☉) (12 + log(O/H) = 8,10, con il Sole a 8,69). [V] Rémy-Ruyer et al. 2014 (A&A 563, A31), tabella 1, il caso con X_CO che dipende da Z: 126 galassie da 1/50 a 2 Z☉. Al Sole G/D = 162, la polvere è il 43% dei metalli (prima: la metà fissa di Draine 2011); sotto 1/4 Z☉ cala come Z³
};
export const ANELLI = 20, PASSI = 46, RESTI = 8;

// ---------- le unità: masse solari, kpc, miliardi di anni (Ga), km/s. Il kpc e il Mpc vengono da leggi.js (IAU). I numeri
// scritti qui già in kpc o in pc sono misure in quelle unità, e lo dicono: LEGGI.spessoreGas (kpc), LEGGI.KS (per kpc²),
// LEGGI.nascite[1] (M☉/pc², portato a kpc² con (KPC/PC)² = 10⁶), sigma8 (sfere di 8 Mpc/h), i bordi dello spettro (h/Mpc). Per
// questo cambiare il kpc da solo sposta la luce (Δ = 4,9 nel rapporto «Numeri a mano»): non è una scala libera, è il metro
const GA = 1e9 * ANNO, KMS = (1e3 * GA) / KPC; // 1 km/s in kpc/Ga
const GK = (COSTANTI.G * MSOLE) / (KPC * 1e6); // G in kpc·(km/s)²/M☉
const C_KMS = COSTANTI.c / 1e3, ZSOLE = ST.DATI?.ZSOLE ?? 0.0142, YPRIMO = ST.DATI?.YPRIMO ?? 0.247;
// il raggio che contiene metà della massa di un disco esponenziale, in lunghezze di scala: 1 − (1 + x)·e^(−x) = ½ (1,678)
const META_ESPONENZIALE = (() => { let x = 1.7; for (let k = 0; k < 6; k++) x -= (1 - (1 + x) * Math.exp(-x) - 0.5) / (x * Math.exp(-x)); return x; })();
const T0 = etaUniverso() / GA, DT = T0 / PASSI, PI4 = 4 * Math.PI;
const stringi = (x, a, b) => Math.max(a, Math.min(b, x));
const campana = inversaNormale; // l'inversa della distribuzione a campana (leggi.js: esatta)

// ---------- IL COSMO: tempo, espansione, crescita delle fluttuazioni, σ(M). Tutto da leggi.js COSMO.
const U = (() => {
  const { Om, OL, Ob, ns, sigma8 } = COSMO, h = COSMO.H0 / 100, H0 = ((COSMO.H0 * 1e3) / MPC) * GA; // Ga⁻¹
  const E = (a) => Math.sqrt(Om / a ** 3 + OL), tempo = (a) => (2 / (3 * H0 * Math.sqrt(OL))) * Math.asinh(Math.sqrt(OL / Om) * a ** 1.5);
  const scala = (t) => Math.cbrt(Om / OL) * Math.sinh(1.5 * H0 * Math.sqrt(OL) * t) ** (2 / 3);
  // la crescita lineare D(a) ∝ E(a)·∫da/(aE)³, esatta per un cosmo piatto con materia e costante cosmologica
  const NA = 600, AMAX = 3, Dt = new Float64Array(NA + 1); let I = 0;
  for (let i = 1; i <= NA; i++) { const m = (AMAX * (i - 0.5)) / NA; I += AMAX / NA / (m * E(m)) ** 3; Dt[i] = E((AMAX * i) / NA) * I; }
  const D1 = Dt[NA / AMAX], D = (a) => { const x = (stringi(a, 0, AMAX) * NA) / AMAX, i = Math.min(NA - 1, Math.floor(x)); return (Dt[i] + (x - i) * (Dt[i + 1] - Dt[i])) / D1; };
  const Dinv = (d) => { let lo = 0, hi = AMAX; for (let k = 0; k < 40; k++) { const m = 0.5 * (lo + hi); if (D(m) < d) lo = m; else hi = m; } return 0.5 * (lo + hi); };
  const rhoC = (3 * H0 * H0) / (8 * Math.PI * GK * KMS * KMS), fb = Ob / Om; // M☉/kpc³
  const delta = (a) => { const x = Om / a ** 3 / E(a) ** 2 - 1; return 18 * Math.PI ** 2 + 82 * x - 39 * x * x; };
  // lo spettro: P(k) ∝ k^ns·T²(k), k in h/Mpc
  const Gam = Om * h * Math.exp(-Ob * (1 + Math.sqrt(2 * h) / Om));
  const Tk = (k) => { const q = k / Gam; return (Math.log(1 + 2.34 * q) / (2.34 * q)) * Math.pow(1 + 3.89 * q + (16.1 * q) ** 2 + (5.46 * q) ** 3 + (6.71 * q) ** 4, -0.25); };
  const NK = 700, LK0 = Math.log(1e-4), LK1 = Math.log(3e3), dlk = (LK1 - LK0) / NK, kk = new Float64Array(NK), d2 = new Float64Array(NK);
  for (let i = 0; i < NK; i++) { const k = Math.exp(LK0 + (i + 0.5) * dlk); kk[i] = k; d2[i] = k ** (3 + ns) * Tk(k) ** 2; }
  const W = (x) => (x < 1e-2 ? 1 - x * x / 10 : (3 * (Math.sin(x) - x * Math.cos(x))) / x ** 3);
  const s2 = (R) => { let s = 0; for (let i = 0; i < NK; i++) { const w = W(kk[i] * R); s += d2[i] * w * w; } return s * dlk; };
  const norma = sigma8 ** 2 / s2(8);
  const rhoM = (Om * rhoC * 1e9) / h ** 3; // M☉ per (Mpc/h)³
  const NM = 56, LM0 = Math.log(1e5), LM1 = Math.log(1e16), lS = new Float64Array(NM + 1);
  for (let i = 0; i <= NM; i++) lS[i] = 0.5 * Math.log(norma * s2(Math.cbrt((3 * Math.exp(LM0 + (i * (LM1 - LM0)) / NM)) / (PI4 * rhoM))));
  const sigma = (M) => { const x = (stringi(Math.log(M), LM0, LM1) - LM0) / ((LM1 - LM0) / NM), i = Math.min(NM - 1, Math.floor(x)); return Math.exp(lS[i] + (x - i) * (lS[i + 1] - lS[i])); };
  const massaDi = (s) => { let lo = LM0, hi = LM1; for (let k = 0; k < 40; k++) { const m = 0.5 * (lo + hi); if (sigma(Math.exp(m)) > s) lo = m; else hi = m; } return Math.exp(0.5 * (lo + hi)); };
  // lo scarto del campo filtrato a un numero d'onda (in 1/Mpc): solo le onde più lunghe
  const sigmaOnde = (kMpc) => { let s = 0; const kc = kMpc / h; for (let i = 0; i < NK && kk[i] < kc; i++) s += d2[i]; return Math.sqrt(norma * s * dlk); };
  // la potenza per unità di ln k, Δ²(k) = k³P(k)/2π² (k in 1/Mpc): lo spettro vero della materia, oggi
  const potenza = (kMpc) => { const k = kMpc / h; return norma * k ** (3 + ns) * Tk(k) ** 2; };
  // quanti aloni più pesanti di M per Mpc³ (Press & Schechter 1974: dn/dlnM = √(2/π)·(ρ̄/M)·(δc/σ)·|dlnσ/dlnM|·e^(−δc²/2σ²))
  const aloni = (M) => { let n = 0; const l0 = Math.log(M), l1 = LM1, N = 80, dl = (l1 - l0) / N, rho = Om * rhoC * 1e9; for (let i = 0; i < N; i++) { const l = l0 + (i + 0.5) * dl, m = Math.exp(l), sg = sigma(m), p = -(Math.log(sigma(m * 1.05)) - Math.log(sigma(m / 1.05))) / (2 * Math.log(1.05)), nu = LEGGI.deltaC / sg; n += Math.sqrt(2 / Math.PI) * (rho / m) * nu * p * Math.exp(-nu * nu / 2) * dl; } return n; };
  return { Om, OL, h, H0, E, tempo, scala, D, Dinv, rhoC, fb, delta, sigma, massaDi, sigmaOnde, potenza, aloni };
})();
const raggioViriale = (M, a) => Math.cbrt((3 * M) / (PI4 * U.delta(a) * U.rhoC * U.E(a) ** 2));
const concentrazione = (M, a) => Math.max(3, (LEGGI.concentrazione[0] * a) / U.Dinv(LEGGI.deltaC / U.sigma(LEGGI.concentrazione[1] * M)));
const nfw = (x) => Math.log(1 + x) - x / (1 + x);
// il disco esponenziale sottile (Freeman 1970): V² = (2GM/R_d)·F(y), F = y²·[I₀K₀ − I₁K₁], y = r/2R_d. Le funzioni di
// Bessel sono integrate (I_n = ∫e^{x cos θ}cos nθ/π, K_n = ∫e^{−x cosh t}cosh nt), una volta, in una tabella
const FREEMAN = (() => {
  const N = 160, YMAX = 12, F = new Float64Array(N + 1);
  for (let i = 1; i <= N; i++) {
    const y = (YMAX * i) / N, n = 160; let i0 = 0, i1 = 0, k0 = 0, k1 = 0; const tm = Math.acosh(1 + 36 / y);
    for (let j = 0; j < n; j++) { const th = (Math.PI * (j + 0.5)) / n, e = Math.exp(y * (Math.cos(th) - 1)); i0 += e; i1 += e * Math.cos(th); const t = (tm * (j + 0.5)) / n, f = Math.exp(-y * (Math.cosh(t) - 1)); k0 += f; k1 += f * Math.cosh(t); }
    F[i] = y * y * ((i0 / n) * ((k0 * tm) / n) - (i1 / n) * ((k1 * tm) / n));
  }
  return (y) => { const x = (stringi(y, 0, YMAX) * N) / YMAX, i = Math.min(N - 1, Math.floor(x)); const v = F[i] + (x - i) * (F[i + 1] - F[i]); return y > YMAX ? (v * YMAX) / y : v; };
})();
// la velocità circolare (km/s) a r (kpc): alone + disco + sferoide. m = { Mh, c, Rv, Md, Rd, Ms, as }
function velocita(m, r) {
  const x = r / m.Rv; let v2 = (GK * m.Mh * nfw(m.c * x)) / (nfw(m.c) * r);
  if (m.Md > 0 && m.Rd > 0) v2 += ((2 * GK * m.Md) / m.Rd) * FREEMAN(r / (2 * m.Rd));
  if (m.Ms > 0) v2 += (GK * m.Ms * r) / (r + m.as) ** 2;
  return Math.sqrt(v2);
}
// la velocità di fuga (km/s): il potenziale dell'alone più quello dei barioni (come un punto ammorbidito su 2R_d)
function fuga2(m, r) {
  const x = r / m.Rv;
  return 2 * ((GK * m.Mh * Math.log(1 + m.c * x)) / (nfw(m.c) * r) + (GK * m.Md) / Math.hypot(r, 2 * m.Rd) + (GK * m.Ms) / (r + m.as));
}
// il raffreddamento del gas caldo (W·m³, per n_e·n_H): vedi l'intestazione
const lambda = (T, Z) => 1e-13 * (2.4e-27 * Math.sqrt(T) + 5e-23 * Math.pow(Math.max(T, 1e5) / 1e5, -1.5) + (T < 4e7 ? (1.6e-19 * Z) / Math.sqrt(Math.max(T, 1e5)) : 0));
const MU_CALDO = 1 / (2 * (1 - YPRIMO) + ((1 + 2) / 4) * YPRIMO), /* (le particelle per massa di protone del gas ionizzato del tutto: 2 per l'idrogeno, protone ed elettrone; 3 su 4 per l'elio, il nucleo e due elettroni) */ T_VIR = (MU_CALDO * COSTANTI.mp * 1e6) / (2 * COSTANTI.kB); // T = T_VIR·V² (K, V in km/s)
// la pressione a metà dello strato di gas, in unità di P₀: P/P₀ = C_PRESS·Σg·(Σg + Σ★·σg/σ★), con Σ in M☉/kpc² (Elmegreen 1989)
const C_PRESS = (0.5 * Math.PI * COSTANTI.G * (MSOLE / KPC ** 2) ** 2) / (LEGGI.molecole[0] * 1e6 * COSTANTI.kB);
const K_COOL = (1.5 * COSTANTI.kB * COSTANTI.mp) / (MU_CALDO * (1 + YPRIMO / (2 * (1 - YPRIMO))) * (1 - YPRIMO) ** 2); // t = K·T/(ρ·Λ)

// ---------- LE POPOLAZIONI DI STELLE: per ogni M☉ nata con la distribuzione di Kroupa, quanto gas torna, quanti
// metalli nuovi, quante supernove, in funzione del tempo passato (in passi di DT). Le vite e i resti: stelle.js.
const Z_TAB = [0.02, 0.2, 1, 2.5];
const tabellaZ = (Z) => (Z < 0.063 ? 0 : Z < 0.45 ? 1 : Z < 1.6 ? 2 : 3);
// IL COLORE VERO DI UN CORPO NERO (delle stelle, e della luce di una generazione). Lo spettro di Planck [D] pesato con le
// tre curve di sensibilità dell'occhio (CIE 1931, nell'approssimazione a campane di Wyman, Sloan & Shirley 2013, J. Comput.
// Graph. Tech. 2, 1 [R]: gli stessi numeri di `occhio` in vuoto_mezzo.js, che sta a valle e non si può leggere da qui), poi
// da XYZ a rosso, verde e blu LINEARI con la matrice dello standard sRGB (IEC 61966-2-1) [R]. Nessun numero scelto: a
// 5772 K (il Sole) viene un bianco appena caldo, a 9500 K un bianco azzurro, a 3000 K un arancio.
const H_PLANCK = 2 * Math.PI * COSTANTI.hbar, campanaCIE = (l, mu, s1, s2) => Math.exp(-0.5 * ((l - mu) / (l < mu ? s1 : s2)) ** 2);
const occhioCIE = (nm) => [1.056 * campanaCIE(nm, 599.8, 37.9, 31.0) + 0.362 * campanaCIE(nm, 442.0, 16.0, 26.7) - 0.065 * campanaCIE(nm, 501.1, 20.4, 26.2),
  0.821 * campanaCIE(nm, 568.8, 46.9, 40.5) + 0.286 * campanaCIE(nm, 530.9, 16.3, 31.1), 1.217 * campanaCIE(nm, 437.0, 11.8, 36.0) + 0.681 * campanaCIE(nm, 459.0, 26.0, 13.8)];
const aLineare = (X, Y, Zc) => [3.2406 * X - 1.5372 * Y - 0.4986 * Zc, -0.9689 * X + 1.8758 * Y + 0.0415 * Zc, 0.0557 * X - 0.204 * Y + 1.057 * Zc];
// X, Y, Z di un corpo nero per ogni watt che irradia in tutto (σT⁴): la parte della sua luce che l'occhio vede, nei tre
// canali. Una tabella in ln T (da 800 a 200 000 K), fatta una volta: l'integrale di π·B_λ·x̄ da 360 a 830 nm
const xyzNero = (() => {
  const N = 220, L0 = Math.log(800), L1 = Math.log(2e5), tab = new Float64Array(3 * (N + 1)), NL = 94, occhi = Array.from({ length: NL }, (_, i) => occhioCIE(362.5 + 5 * i));
  for (let j = 0; j <= N; j++) {
    const T = Math.exp(L0 + ((L1 - L0) * j) / N), x0 = (H_PLANCK * COSTANTI.c) / (COSTANTI.kB * T); let X = 0, Y = 0, Zc = 0;
    for (let i = 0; i < NL; i++) { const l = (362.5 + 5 * i) * 1e-9, b = (2 * Math.PI * H_PLANCK * COSTANTI.c ** 2 * 5e-9) / (l ** 5 * Math.expm1(x0 / l)) / (COSTANTI.sigma * T ** 4); X += b * occhi[i][0]; Y += b * occhi[i][1]; Zc += b * occhi[i][2]; }
    tab[3 * j] = Math.log(X); tab[3 * j + 1] = Math.log(Y); tab[3 * j + 2] = Math.log(Zc);
  }
  return (T) => { const x = ((stringi(Math.log(T), L0, L1) - L0) / (L1 - L0)) * N, j = Math.min(N - 1, Math.floor(x)), u = x - j; return [0, 1, 2].map((c) => Math.exp(tab[3 * j + c] * (1 - u) + tab[3 * j + 3 + c] * u)); };
})();
const Y_SOLE = xyzNero(TSOLE)[1]; // la parte visibile (pesata con la curva dell'occhio) della luce di un corpo nero come il Sole
// da rosso, verde e blu lineari (anche negativi: un colore fuori dal triangolo sRGB) a un colore che si può mostrare: si
// stinge verso il grigio di pari luminanza finché entra nel triangolo (come coloreVero di vuoto_mezzo.js), poi il canale più forte a 1
const nelTriangolo = (rgb) => { const Y = 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2], m0 = Math.min(rgb[0], rgb[1], rgb[2]), v = m0 < 0 && Y > m0 ? rgb.map((x) => x + (Y - x) * (m0 / (m0 - Y))) : rgb, mx = Math.max(v[0], v[1], v[2], 1e-300); return v.map((x) => Math.max(0, x) / mx); };
const gammaSRGB = (v) => (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055), a255 = (lin) => nelTriangolo(lin).map((v) => Math.round(255 * gammaSRGB(v)));
// → [rosso, verde, blu] LINEARI, il più forte a 1 (per chi somma luce o la dà a una scheda grafica)
export const coloreCorpoNero = (T) => nelTriangolo(aLineare(...xyzNero(T)));
// → [rosso, verde, blu] da 0 a 255, già con la curva dello schermo (per chi lo mostra così com'è: il campo `colore` delle stelle)
export const colorePerTemperatura = (T) => a255(aLineare(...xyzNero(T)));
const resaCollasso = (m) => (LEGGI.resa[0] + LEGGI.resa[1] * m) * m;
let POP = null;
export function popolazione() {
  if (POP) return POP;
  // le masse: fitte dove sono rare (u = 1 − e^−s), ognuna con il suo peso in numero
  const N = 360, S = 15, ds = S / N, m = new Float64Array(N), w = new Float64Array(N), MCH = massaChandrasekhar() / MSOLE; let mm = 0, ww = 0;
  for (let i = 0; i < N; i++) { const s = (i + 0.5) * ds; m[i] = massaNascita(1 - Math.exp(-s)); w[i] = Math.exp(-s) * ds; ww += w[i]; }
  for (let i = 0; i < N; i++) { w[i] /= ww; mm += w[i] * m[i]; }
  const tab = Z_TAB.map((Z) => {
    const vita = new Float64Array(N), reso = new Float64Array(N), metalli = new Float64Array(N), sn = new Uint8Array(N), agbC = new Float64Array(N), agbN = new Float64Array(N); let tIa = Infinity, nSN = 0, uSN = 1;
    for (let i = 0; i < N; i++) {
      vita[i] = ST.stella(m[i], { Z }).vita / 1e9; if (!(vita[i] < 1e4)) { vita[i] = Infinity; continue; }
      const f = ST.fine(m[i], 1e-4, { Z }); reso[i] = Math.max(0, m[i] - f.massa); sn[i] = f.supernova ? 1 : 0;
      // i metalli nuovi escono solo se l'esplosione riesce (resta una stella di neutroni); se il nucleo ricade in un
      // buco nero (stelle.js) si porta dietro tutto ciò che ha fuso, e torna al gas solo l'involucro
      if (f.supernova && f.tipo === 'stella di neutroni') metalli[i] = Math.min(resaCollasso(m[i]), 0.9 * reso[i]);
      // LE GIGANTI ASINTOTICHE (le stelle che lasciano una nana bianca): il carbonio del terzo dragaggio e l'azoto della
      // combustione alla base dell'involucro, nuovi (elementi.js reseGigante: Karakas 2010, ricordato). Il carbonio che
      // una gigante calda brucia in azoto non è nuovo: lo si toglie dall'azoto che fa, e la somma resta ≥ 0
      if (!f.supernova && f.tipo === 'nana bianca') { const y = reseGigante(m[i], Z); agbN[i] = Math.max(0, y.N + Math.min(0, y.C)); agbC[i] = Math.max(0, y.C); metalli[i] = Math.min(agbC[i] + agbN[i], 0.9 * reso[i]); const k = agbC[i] + agbN[i] > 0 ? metalli[i] / (agbC[i] + agbN[i]) : 0; agbC[i] *= k; agbN[i] *= k; }
      if (f.supernova) { nSN += w[i]; if (uSN === 1) uSN = 1 - Math.exp(-i * ds); } else if (f.tipo === 'nana bianca') tIa = Math.min(tIa, vita[i]);
    }
    // per ritardo L (la generazione nata nel passo j, vista alla fine del passo j + L): le frazioni cumulate
    // (cP: i metalli nuovi in tutto; cPcc, cPc, cPn: quelli delle supernove da collasso, il carbonio e l'azoto delle giganti)
    const cR = new Float64Array(PASSI + 2), cP = new Float64Array(PASSI + 2), cN = new Float64Array(PASSI + 2), cI = new Float64Array(PASSI + 2), cPcc = new Float64Array(PASSI + 2), cPc = new Float64Array(PASSI + 2), cPn = new Float64Array(PASSI + 2);
    const [nIa, pIa] = LEGGI.Ia, R1 = nIa / ((Math.pow(tIa, pIa + 1) - Math.pow(T0, pIa + 1)) / -(pIa + 1)), Ia = (t) => (t <= tIa ? 0 : (R1 * (Math.pow(tIa, pIa + 1) - Math.pow(t, pIa + 1))) / -(pIa + 1));
    for (let L = 0; L <= PASSI; L++) {
      let r = 0, p = 0, n = 0, ia = 0, pc = 0, pn = 0;
      for (let i = 0; i < N; i++) { const f = stringi(L + 1 - vita[i] / DT, 0, 1); if (f > 0) { r += w[i] * reso[i] * f; p += w[i] * metalli[i] * f; n += w[i] * sn[i] * f; pc += w[i] * agbC[i] * f; pn += w[i] * agbN[i] * f; } }
      for (let q = 0; q < 12; q++) ia += Ia((L + (q + 0.5) / 12) * DT) / 12;
      cR[L + 1] = r / mm; cP[L + 1] = p / mm; cN[L + 1] = n / mm; cI[L + 1] = ia; cPc[L + 1] = pc / mm; cPn[L + 1] = pn / mm; cPcc[L + 1] = (p - pc - pn) / mm; // (l'indice è L + 1: cX[0] = 0 è «prima di nascere»)
    }
    // ciò che una generazione restituisce NEL passo di ritardo L (tra L − 1 e L), per M☉ nata: [gas in tutto, la parte che porta i
    // metalli di nascita, i metalli nuovi, le supernove da collasso, le Ia]; e i metalli nuovi per canale (kc: collasso, Ia,
    // carbonio delle giganti, azoto delle giganti)
    const k5 = new Float64Array(5 * (PASSI + 1)), kc = new Float64Array(4 * (PASSI + 1));
    for (let L = 0; L <= PASSI; L++) { const g = cR[L + 1] - cR[L], p = cP[L + 1] - cP[L], ia = cI[L + 1] - cI[L]; k5[5 * L] = g + ia * MCH; k5[5 * L + 1] = g - p; k5[5 * L + 2] = p + ia * MCH; k5[5 * L + 3] = cN[L + 1] - cN[L]; k5[5 * L + 4] = ia;
      kc[4 * L] = cPcc[L + 1] - cPcc[L]; kc[4 * L + 1] = ia * MCH; kc[4 * L + 2] = cPc[L + 1] - cPc[L]; kc[4 * L + 3] = cPn[L + 1] - cPn[L]; }
    return { Z, vita, reso, sn, cR, cP, cN, cI, cPcc, cPc, cPn, k5, kc, tIa, nSN: nSN / mm, uSN };
  });
  // LA LUCE E IL COLORE DI UNA GENERAZIONE, per ogni M☉ nata (a metà della vita di ogni stella, metalli del Sole; solo la
  // sequenza principale). Di ogni massa: L1 la luce in tutto (L☉), V1 quella che l'occhio vede (in unità di quella del Sole:
  // L·Y(T)/Y(5772 K)), C1 la stessa divisa in rosso, verde e blu lineari (si sommano come si somma la luce).
  // Per passo d'età L (la generazione nata nel passo j, vista nel passo j + L): luce[L], luceV[L], tinta[3L…] (lineari).
  const luce = new Float64Array(PASSI + 1), luceV = new Float64Array(PASSI + 1), tinta = new Float64Array(3 * (PASSI + 1)), L1 = new Float64Array(N), V1 = new Float64Array(N), C1 = new Float64Array(3 * N), vita1 = tab[2].vita;
  for (let i = 0; i < N; i++) { const s = ST.stella(m[i], { Z: 1 }), q = xyzNero(s.T), c = aLineare(q[0], q[1], q[2]); L1[i] = (w[i] * s.L) / mm; V1[i] = (L1[i] * q[1]) / Y_SOLE; for (let d = 0; d < 3; d++) C1[3 * i + d] = (L1[i] * c[d]) / Y_SOLE; }
  for (let L = 0; L <= PASSI; L++) for (let i = 0; i < N; i++) { const viva = 1 - stringi(L + 1 - vita1[i] / DT, 0, 1); luce[L] += L1[i] * viva; luceV[L] += V1[i] * viva; for (let c = 0; c < 3; c++) tinta[3 * L + c] += C1[3 * i + c] * viva; }
  // la luce di tutte le stelle più giovani di τ dove le nascite vanno a ritmo costante, per ogni M☉/Ga di nascite: ∫₀^τ della
  // luce di una generazione = Σ L·min(vita, τ). Una tabella in ln τ (da 10⁵ anni all'età dell'universo): [luce, visibile, r, g, b]
  const NG = 96, G0 = Math.log(1e-4), G1 = Math.log(T0), giovani = new Float64Array(5 * (NG + 1));
  for (let a = 0; a <= NG; a++) { const tau = Math.exp(G0 + ((G1 - G0) * a) / NG); for (let i = 0; i < N; i++) { const d = Math.min(vita1[i], tau); giovani[5 * a] += L1[i] * d; giovani[5 * a + 1] += V1[i] * d; for (let c = 0; c < 3; c++) giovani[5 * a + 2 + c] += C1[3 * i + c] * d; } }
  // (fino a τ, canale q: sotto 10⁵ anni cresce in proporzione, perché nessuna stella è ancora morta)
  const finoA = (tau, q) => { if (!(tau > 0)) return 0; const lt = Math.log(tau); if (lt <= G0) return giovani[q] * (tau / 1e-4); const x = ((Math.min(lt, G1) - G0) / (G1 - G0)) * NG, a = Math.min(NG - 1, Math.floor(x)); return giovani[5 * a + q] + (x - a) * (giovani[5 * a + 5 + q] - giovani[5 * a + q]); };
  return (POP = { N, m, w, massaMedia: mm, tab, MCH, luce, luceV, tinta, L1, V1, C1, finoA });
}
// LA LUCE DI UNA GENERAZIONE di età data (Ga), per ogni M☉ nata: la somma sulle stelle ancora vive (sequenza principale,
// metalli del Sole) → { luce (L☉/M☉, in tutto), visibile (in unità di quella del Sole), colore: [r, g, b] lineari (il più forte a 1) }
export function luceGenerazione(etaGa) {
  const P = popolazione(), v = P.tab[2].vita, c = [0, 0, 0]; let l = 0, y = 0;
  for (let i = 0; i < P.N; i++) if (v[i] > etaGa) { l += P.L1[i]; y += P.V1[i]; c[0] += P.C1[3 * i]; c[1] += P.C1[3 * i + 1]; c[2] += P.C1[3 * i + 2]; }
  return { luce: l, visibile: y, colore: nelTriangolo(c) };
}
// LA LUCE DELLE STELLE PIÙ GIOVANI DI τ (Ga) dove le nascite vanno a ritmo costante, per ogni M☉/anno di nascite
// → { luce (L☉), visibile (in unità di quella del Sole), colore: [r, g, b] lineari }. (I bracci: τ = bracci.vita(r).)
export function luceNascite(tauGa) { const P = popolazione(); return { luce: P.finoA(tauGa, 0) * 1e9, visibile: P.finoA(tauGa, 1) * 1e9, colore: nelTriangolo([P.finoA(tauGa, 2), P.finoA(tauGa, 3), P.finoA(tauGa, 4)]) }; }

// ---------- L'ALONE: dal picco alla massa; la storia; le fusioni; lo spin dalle maree dei vicini
// La regione del picco ha sovradensità lineare δ = peso·σ_onde. Dentro, una fluttuazione piccola alta `raro` scarti
// crolla alla massa M per cui σ²(M) = σ_onde² + ((δc − δ)/raro)²: è la prima traversata della soglia di un cammino
// che parte da (σ_onde², δ) (Bond et al. 1991), con l'altezza fissata invece che estratta.
const ondeMemo = new Map();
const sigmaCampo = (toroM, onde) => { const k = `${toroM}|${onde}`; if (!ondeMemo.has(k)) ondeMemo.set(k, U.sigmaOnde((2 * Math.PI * onde) / (toroM / MPC))); return ondeMemo.get(k); };
export function massaAlone(peso, { toroM = 3.7e25, onde = 9 } = {}) {
  const sb = sigmaCampo(toroM, onde), d = Math.min(peso * sb, 0.9 * LEGGI.deltaC);
  return U.massaDi(Math.hypot(sb, (LEGGI.deltaC - d) / LEGGI.raro));
}
// (Sulla carta piatta di cosmo.js; la velocità vera, con lo spettro vero e in tre dimensioni, è in cosmo3d.js: è quella
// che motiDi usa. Questa resta per confronto.)
// LA VELOCITÀ PECULIARE di un punto del cosmo (km/s, nel piano della mappa): la teoria lineare. La materia cade verso
// dove ce n'è di più: ∇·v = −H₀·f·δ, con f = dlnD/dlna (≈ Ωm^0,55) il ritmo di crescita. Il campo di cosmo.js è una
// somma di onde, δ = (σ_onde/σ)·Σ a·cos(2π k·x + φ) (letto come per le masse: lo scarto del campo è σ_onde), e per ogni
// onda la velocità è lungo k: v = −H₀·f·(L/2π)·Σ A·(k/k²)·sin(2π k·x + φ).
// (Il campo di cosmo.js ha però le onde lunghe troppo forti rispetto allo spettro vero: le velocità vengono di qualche
// migliaio di km/s invece dei ~600 del Gruppo Locale. È ciò che quel campo dà, non una misura dell'universo vero.)
export function velocitaPeculiare(C, pos, { toroM = 3.7e25, onde = 9 } = {}) {
  const L = toroM / MPC, f = Math.log(U.D(1.01) / U.D(0.99)) / Math.log(1.01 / 0.99), k0 = (sigmaCampo(toroM, onde) / C.sigma) * COSMO.H0 * f * (L / (2 * Math.PI));
  let vx = 0, vy = 0; for (const m of C.modi) { const q = (-k0 * m.a * Math.sin(2 * Math.PI * (m.kx * pos[0] + m.ky * pos[1]) + m.fi)) / (m.kx * m.kx + m.ky * m.ky); vx += q * m.kx; vy += q * m.ky; }
  return [vx, vy];
}
// LA STORIA DELL'ALONE, ricostruita all'indietro da M0 (al passo nt): a ogni passo, con la massa che ha lì, si chiede
// se è entrato un compagno (un evento per ogni classe di rapporto, con la probabilità della legge di Fakhouri et al.
// 2010); il resto della crescita è liscio, al ritmo medio della stessa legge meno la parte che in media portano i
// compagni. Così la storia di ogni alone è coerente con le sue fusioni, e in media è quella misurata.
// caso: la sorgente degli eventi (null: nessun compagno, tutta la crescita è liscia); date: fusioni già decise
// ([{ quando (Ga), rapporto, attrito? }]: per le prove e per i compagni). → Mh[0…nt], con Mh.inizio e Mh.fusioni
const CLASSI = [['minore', 0.1, 0.3], ['maggiore', 0.3, 1]];
const integraleFusioni = (() => { const m = new Map(); return (a, b, massa = false) => { const k = `${a}|${b}|${massa}`; if (!m.has(k)) { const F = LEGGI.fusioni, n = 200, dl = Math.log(b / a) / n; let s = 0; for (let i = 0; i < n; i++) { const x = a * Math.exp((i + 0.5) * dl); s += x * dl * F.A * Math.pow(x, F.beta) * Math.exp(Math.pow(x / F.xi, F.gamma)) * (massa ? x / (1 + x) : 1); } m.set(k, s); } return m.get(k); }; })();
function storiaAlone(M0, nt, caso = null, date = null) {
  const Mh = new Float64Array(nt + 1), [A, esp, pz] = LEGGI.crescita, F = LEGGI.fusioni, [fA, fb, fc] = LEGGI.attrito, fusioni = [], L12 = Math.log(1e12);
  const ritmo = (lm, t) => { const a = U.scala(t); return A * 1e-3 * Math.exp((esp - 1) * (lm - L12)) * (1 + pz * (1 / a - 1)) * U.E(a); }; // d ln M/dt (1/Ga)
  // la parte che in media arriva nei compagni sopra 1:10 (per unità di tempo: dz/dt = (1+z)·H)
  const inCompagni = (lm, t) => { const a = U.scala(t); return integraleFusioni(CLASSI[0][1], 1, true) * Math.exp(F.alfa * (lm - L12)) * Math.pow(1 / a, F.eta + 1) * U.H0 * U.E(a); };
  const liscio = caso ? (lm, t) => { const r = ritmo(lm, t); return Math.max(0.2 * r, r - inCompagni(lm, t)); } : ritmo;
  const entra = (j, M, nome, rapporto, circ, attritoDato) => {
    const tauDyn = 0.1 / (U.H0 * U.E(U.scala(j * DT))), attrito = attritoDato ?? ((fA * Math.pow(1 / rapporto, fb)) / Math.log(1 + 1 / rapporto)) * Math.exp(fc * circ) * tauDyn; // (τ_dyn = R/V a 200 volte la densità critica)
    fusioni.push({ passo: j, quando: j * DT, classe: nome, rapporto, massaAlone: (M * rapporto) / (1 + rapporto), circolarita: circ, attrito, arrivo: j * DT + attrito }); return M / (1 + rapporto);
  };
  let lm = Math.log(M0); Mh[nt] = M0;
  for (let j = nt; j > 1; j--) {
    let M = Math.exp(lm); const minimo = M / 3; // (in un passo non può essere arrivato più di due terzi dell'alone)
    if (caso) {
      const z1 = 1 / U.scala((j - 1) * DT) - 1, z2 = 1 / U.scala(j * DT) - 1, zm = 0.5 * (z1 + z2);
      for (const [nome, xa, xb] of CLASSI) {
        const attese = integraleFusioni(xa, xb) * Math.pow(M / 1e12, F.alfa) * Math.pow(1 + zm, F.eta) * (z1 - z2);
        if (!(caso(`fusione ${j}/${nome}`) < attese)) continue;
        // il rapporto delle masse: dentro la classe segue ξ⁻² (la pendenza della legge); l'orbita: quanto è circolare
        const rapporto = 1 / (1 / xa - caso(`fusione ${j}/${nome}/rapporto`) * (1 / xa - 1 / xb));
        if (M / (1 + rapporto) >= minimo) M = entra(j, M, nome, rapporto, stringi(LEGGI.circolarita[0] + LEGGI.circolarita[1] * caso.normale(`fusione ${j}/${nome}/orbita`), 0.1, 1));
      }
    } else if (date) for (const f of date) if (stringi(Math.round(f.quando / DT), 2, nt) === j && M / (1 + f.rapporto) >= minimo) M = entra(j, M, f.rapporto >= CLASSI[1][1] ? 'maggiore' : 'minore', f.rapporto, f.circolarita ?? LEGGI.circolarita[0], f.attrito);
    lm = Math.log(M);
    const n = Math.max(2, Math.ceil(ritmo(lm, (j - 1) * DT) * DT * 8)), h = DT / n; let t = j * DT;
    for (let s = 0; s < n; s++) { const k1 = liscio(lm, t), k2 = liscio(lm - 0.5 * h * k1, t - 0.5 * h); lm -= h * k2; t -= h; }
    Mh[j - 1] = Math.exp(lm);
  }
  // quando comincia: quando l'alone è abbastanza grande da tenere gas a 10⁴ K, che l'idrogeno atomico sa raffreddare
  // (prima il gas non cade: niente stelle). Si continua all'indietro dentro il primo passo
  let t = Math.min(nt, 1) * DT; for (let s = 0; s < 80 && t > 0.03; s++) { const M = Math.exp(lm), a = U.scala(t); if ((GK * M) / raggioViriale(M, a) < 1e4 / T_VIR) break; lm -= 0.004 * liscio(lm, t); t -= 0.004; }
  Mh.inizio = t; Mh.fusioni = fusioni.reverse(); return Mh;
}
// le maree: ogni vicino tira il proto-alone lungo la retta che li unisce, con forza ∝ M/d³. Si sommano i vicini veri
// (posizioni sul toro, masse dal loro picco): ne escono l'intensità e la direzione della marea in quel punto
const mareeMemo = new WeakMap();
function maree(vicini, opz) {
  let m = mareeMemo.get(vicini); if (m) return m;
  const n = vicini.length, L = (opz.toroM ?? 3.7e25) / MPC, M = vicini.map((g) => g.alone?.massa ?? massaAlone(g.peso, opz)), tau = new Float64Array(n), dir = new Float64Array(n), vicino = new Float64Array(n).fill(Infinity), chi = new Int32Array(n).fill(-1);
  for (let i = 0; i < n; i++) {
    let c = 0, s = 0;
    for (let j = 0; j < n; j++) {
      if (j === i) continue;
      let dx = vicini[j].pos[0] - vicini[i].pos[0], dy = vicini[j].pos[1] - vicini[i].pos[1]; dx -= Math.round(dx); dy -= Math.round(dy);
      const d = Math.max(Math.hypot(dx, dy) * L, 0.3), a = 2 * Math.atan2(dy, dx), f = M[j] / d ** 3; c += f * Math.cos(a); s += f * Math.sin(a);
      if (d < vicino[i]) { vicino[i] = d; chi[i] = j; }
    }
    tau[i] = Math.hypot(c, s); dir[i] = 0.5 * Math.atan2(s, c);
  }
  mareeMemo.set(vicini, (m = { M, tau, dir, vicino, chi, ordinate: Float64Array.from(tau).sort() })); return m;
}
// l'argomento dei tempi (Kahn & Woltjer 1959): due masse partite insieme all'inizio, su un'orbita radiale di Keplero,
// oggi a distanza d: r = a(1 − cos η), t = √(a³/GM)·(η − sin η). Se sono legate, tra quanto tornano insieme (Ga)
function tempoIncontro(M, dKpc) {
  const q = dKpc ** 3 / (GK * KMS * KMS * M * T0 * T0); if (!(q < 4.5)) return Infinity;
  let lo = 1e-3, hi = 2 * Math.PI; for (let k = 0; k < 50; k++) { const e = 0.5 * (lo + hi); if ((1 - Math.cos(e)) ** 3 / (e - Math.sin(e)) ** 2 > q) lo = e; else hi = e; }
  const e = 0.5 * (lo + hi); return T0 * ((2 * Math.PI) / (e - Math.sin(e)) - 1);
}
// L'ALONE DI UNA GALASSIA: massa dal picco, spin dalle maree dei vicini, fusioni dalla sua storia.
// G: { pos, peso } (com'è in cosmo(n).galassie); vicini: TUTTE le galassie del cosmo (G compresa o no);
// se G porta già G.alone = { massa, spin, fusioni } lo si usa così com'è (per le prove).
export function aloneGalassia(G, vicini = [], caso = sorgente('galassia'), opz = {}) {
  const dato = G.alone || {}, massa = dato.massa ?? massaAlone(G.peso, opz);
  let zMarea = 0, direzione = caso.tra('alone/asse', 0, Math.PI), vicino = null, prossima = null, marea = 0;
  if (vicini.length >= 3 && G.pos) {
    const T = maree(vicini, opz), L = (opz.toroM ?? 3.7e25) / MPC; let i = vicini.indexOf(G), tau, dir, dmin = Infinity, chi = -1;
    if (i < 0 && G.id != null && vicini[G.id]?.pos === G.pos) i = G.id;
    if (i >= 0) { tau = T.tau[i]; dir = T.dir[i]; dmin = T.vicino[i]; chi = T.chi[i]; }
    else { let c = 0, s = 0; vicini.forEach((v, j) => { let dx = v.pos[0] - G.pos[0], dy = v.pos[1] - G.pos[1]; dx -= Math.round(dx); dy -= Math.round(dy); const d = Math.max(Math.hypot(dx, dy) * L, 0.3), a = 2 * Math.atan2(dy, dx), f = T.M[j] / d ** 3; c += f * Math.cos(a); s += f * Math.sin(a); if (d < dmin) { dmin = d; chi = j; } }); tau = Math.hypot(c, s); dir = 0.5 * Math.atan2(s, c); }
    // il posto della sua marea tra quelle di tutte le galassie del cosmo, come scarto di una campana
    let sotto = 0; while (sotto < T.ordinate.length && T.ordinate[sotto] < tau) sotto++;
    zMarea = campana((sotto + 0.5) / (T.ordinate.length + (i >= 0 ? 0 : 1))); direzione = dir; marea = tau / (U.Om * U.rhoC * 1e9);
    if (chi >= 0) { vicino = { id: vicini[chi].id ?? chi, distanzaMpc: dmin }; const tra = tempoIncontro(massa + T.M[chi], dmin * 1e3); if (isFinite(tra)) prossima = { con: vicino.id, tra }; }
  }
  // lo spin: metà della varianza dalla marea vera, metà da quanto il proto-alone era storto rispetto a lei (un evento: la
  // coppia è nulla se sono allineati, massima a 45°; il verso in cui gira è il segno dello scarto)
  const zForma = caso.normale('alone/forma'), asse = direzione + (Math.PI / 4) * Math.tanh(zForma); // l'asse del proto-alone
  const spin = dato.spin ?? LEGGI.spin[0] * Math.exp((LEGGI.spin[1] * (zMarea + zForma)) / Math.SQRT2);
  const sb = sigmaCampo(opz.toroM ?? 3.7e25, opz.onde ?? 9);
  return { massa, spin, picco: G.peso ?? null, sovradensita: G.peso != null ? G.peso * sb : null, marea, zMarea, direzioneMarea: direzione, asse, verso: zForma >= 0 ? 1 : -1, vicino, prossimaFusione: prossima, fusioni: dato.fusioni ?? null };
}

// ---------- L'EVOLUZIONE: alone → gas → disco → stelle → metalli, su ANELLI anelli e nt passi di DT
// GLI ANELLI: in unità della scala R_d0 che avrebbe oggi un disco con lo spin dell'alone (Mo, Mao & White). Il bordo esterno
// a FUORI = 8 scale (oltre resta 9·e⁻⁸ = 0,3% di un disco esponenziale); il primo bordo dove la STESSA parte sta all'interno
// (1 − (1 + x)·e⁻ˣ = 9·e⁻⁸: x = DENTRO = 0,079); in mezzo i bordi sono in progressione geometrica (ogni anello è largo la
// stessa frazione del suo raggio: con 20 anelli il 27%), perché i dischi di ogni epoca, piccoli e grandi, siano risolti
const FUORI = 8, DENTRO = (() => { const f = (1 + FUORI) * Math.exp(-FUORI); let x = Math.sqrt(2 * f); for (let i = 0; i < 30; i++) x -= (1 - (1 + x) * Math.exp(-x) - f) / (x * Math.exp(-x)); return x; })();
const satelliti = new Map();
function satellite(Malone, passo) { // un compagno: la stessa fisica, senza fusioni sue, fermata quando entra nell'alone
  const lg = Math.round(Math.log10(Malone) * 5) / 5, k = `${lg}|${passo}`;
  let s = satelliti.get(k); if (!s) { if (satelliti.size > 600) satelliti.delete(satelliti.keys().next().value); s = evolvi(storiaAlone(10 ** lg, passo), LEGGI.spin[0], passo, [], 0, true); satelliti.set(k, s); }
  return { s, scala: Malone / 10 ** lg };
}
function evolvi(Mh, spin, nt, fusioni, scartoBuco, compagno = false) {
  const P = popolazione(), NR = ANELLI, M0 = Mh[nt], aN = U.scala(nt * DT), fb = U.fb;
  // la scala del disco in cui si posa gas con momento angolare specifico jg (kpc·km/s): R = jg/(2V), cioè λ·R_vir/√2
  // per il gas che ha lo spin dell'alone, con le correzioni di Mo, Mao & White per la concentrazione e il peso del disco
  const cadutaDi = (jg, Rv, Vv, c, md) => { const lB = stringi(jg / (Math.SQRT2 * Rv * Vv), 0.005, 0.2), l = lB * Math.sqrt(2 / 3 + Math.pow(c / 21.5, 0.7)), fR = Math.pow(l / 0.1, -0.06 + 2.71 * md + 0.0047 / l) * (1 - 3 * md + 5.2 * md * md) * (1 - 0.019 * c + 0.00025 * c * c + 0.52 / c); return ((lB * Rv) / Math.SQRT2) * fR; };
  const momento = (M, a) => { const Rv = raggioViriale(M, a); return Math.SQRT2 * spin * M * Rv * Math.sqrt((GK * M) / Rv); }; // il momento angolare dell'alone
  // gli anelli: fino a 8 volte la scala che avrebbe oggi un disco con lo spin medio dell'alone, più fitti al centro
  const RvN = raggioViriale(M0, aN), Rd0 = cadutaDi(momento(M0, aN) / M0, RvN, Math.sqrt((GK * M0) / RvN), concentrazione(M0, aN), 0.05), Rg = FUORI * Rd0, Rin = DENTRO * Rd0;
  const bordo = Float64Array.from({ length: NR + 1 }, (_, k) => (k === 0 ? 0 : Rin * Math.pow(Rg / Rin, (k - 1) / (NR - 1)))), rc = new Float64Array(NR), area = new Float64Array(NR), lrc = new Float64Array(NR);
  for (let k = 0; k < NR; k++) { area[k] = Math.PI * (bordo[k + 1] ** 2 - bordo[k] ** 2); rc[k] = ((2 / 3) * (bordo[k + 1] ** 3 - bordo[k] ** 3)) / (bordo[k + 1] ** 2 - bordo[k] ** 2); lrc[k] = Math.log(rc[k]); }
  const gas = new Float64Array(NR), met = new Float64Array(NR), nati = new Float64Array((nt + 1) * NR), Zn = new Float32Array((nt + 1) * NR), iz = new Uint8Array((nt + 1) * NR), Sg = new Float32Array((nt + 1) * NR); // (Sg: il gas, in M☉/kpc², da cui sono nate le stelle di quel passo in quell'anello: per misurare la legge delle nascite)
  // (le stelle portate dalle fusioni: per passo di nascita e per tabella di metalli, perché ognuna continui a vivere con le sue vite)
  const NE = nt + 1, est = new Float64Array(4 * NE), estZ = new Float64Array(4 * NE), haEst = new Uint8Array(NE), Zt = new Float32Array((nt + 1) * NR), V2 = new Float64Array(NR), F2 = new Float64Array(NR), dove = new Float64Array(NR);
  const S = { sfr: new Float64Array(nt + 1), gas: new Float64Array(nt + 1), stelle: new Float64Array(nt + 1), caldo: new Float64Array(nt + 1), collasso: new Float64Array(nt + 1), Ia: new Float64Array(nt + 1), freddo: new Uint8Array(nt + 1) };
  const B = { caduto: 0, cadutoZ: 0, vento: 0, ventoZ: 0, prodotti: 0, alCaldo: 0, alCaldoZ: 0, fusioniStelle: 0, fusioniStelleZ: 0, fusioniGas: 0, fusioniGasZ: 0, resi: 0, buco: 0, bucoZ: 0, quasar: 0 };
  const [, aMol] = LEGGI.molecole, [nu0, S0, qS] = LEGGI.nascite, lS0 = Math.log(S0 * 1e6), S0k = S0 * 1e6, sFreddo = LEGGI.soglia[1], kSigZ = LEGGI.rapportoVerticale * LEGGI.Qstelle * 3.36 * GK, mUna = P.massaMedia, ESN = LEGGI.energiaSN / MSOLE / 1e6, eSN = P.tab[2].nSN * ESN; // l'energia di una supernova in M☉·(km/s)², e per unità di massa nata in (km/s)²
  // (per il vento: la densità del gas in cm⁻³ è Σ·e^lnGas, non meno di 10⁻³; la parte dell'energia che resta in moto è cResta·n^esponente)
  const lnGas = Math.log(MSOLE / KPC ** 2 / (2 * LEGGI.spessoreGas * KPC) / (1.4 * COSTANTI.mp) / 1e6), LN_RADO = Math.log(1e-3), cResta = (LEGGI.momentoSN[0] * LEGGI.sigmaGas) / (2 * ESN);
  // (le stelle nate nel disco, anello per anello; e, passo per passo e per tabella di metalli, tutte le nate qui e i loro metalli)
  const nd = new Float64Array(NR), natiQ = new Float64Array(4 * NE), natiQZ = new Float64Array(4 * NE), NK = 5 * (nt + 1), K5 = new Float64Array(4 * NK); for (let q = 0; q < 4; q++) K5.set(P.tab[q].k5.subarray(0, NK), q * NK);
  // I CANALI DEI METALLI (elementi.js CANALI: le supernove da collasso delle quattro tabelle, le Ia, il carbonio e l'azoto
  // delle giganti): ogni serbatoio di metalli ha accanto il suo vettore di canali, che si muove con lui nella stessa
  // proporzione e la cui somma è il serbatoio (metC con met, caldoC con caldoZ, fuoriC con fuoriZ, natiQZC con natiQZ, estZC
  // con estZ); ZnC è la miscela di nascita (in parti dei metalli) di ogni generazione. Nessun conto di prima cambia.
  const NC = CANALI.length, IA = 4, AGC = 5, AGN = 6, metC = new Float64Array(NR * NC), caldoC = new Float64Array(NC), fuoriC = new Float64Array(NC), ZnC = new Float64Array((nt + 1) * NR * NC);
  const natiQZC = new Float64Array(4 * NE * NC), estZC = new Float64Array(4 * NE * NC), NKC = 4 * (nt + 1), KC = new Float64Array(4 * NKC), tR = new Float64Array(NC), tE = new Float64Array(NC), frC = new Float64Array(NC);
  for (let q = 0; q < 4; q++) KC.set(P.tab[q].kc.subarray(0, NKC), q * NKC);
  // i metalli NUOVI per canale di una generazione (massa m, tabella q) tra i ritardi L0 e L1, in dest[off…]; e con loro quelli di
  // nascita restituiti, zb·(gas − nuovi) come in rende(), nella miscela di nascita fa[fo…] (normalizzata)
  const nuoviC = (dest, off, m, q, L0, L1) => { const T = P.tab[q]; dest[off + q] += m * (T.cPcc[L1 + 1] - T.cPcc[L0 + 1]); dest[off + IA] += m * (T.cI[L1 + 1] - T.cI[L0 + 1]) * P.MCH; dest[off + AGC] += m * (T.cPc[L1 + 1] - T.cPc[L0 + 1]); dest[off + AGN] += m * (T.cPn[L1 + 1] - T.cPn[L0 + 1]); };
  const rendeC = (dest, off, m, q, L0, L1, zb, fa, fo) => { const T = P.tab[q], g = m * (T.cR[L1 + 1] - T.cR[L0 + 1]), nuovi = m * (T.cP[L1 + 1] - T.cP[L0 + 1]), b = zb * (g - nuovi); let sf = 0; for (let c = 0; c < NC; c++) sf += fa[fo + c]; if (sf > 0 && b !== 0) for (let c = 0; c < NC; c++) dest[off + c] += (b * fa[fo + c]) / sf; nuoviC(dest, off, m, q, L0, L1); };
  let Mbn = LEGGI.germe, caldo = 0, caldoZ = 0, caldoJ = 0, fuori = 0, fuoriZ = 0, fuoriJ = 0, sferoideFino = 0, Mdisco = 0, Msfer = 0, Rsfer = 0, Rd = 0.05 * Rg, ultimaMaggiore = 0, Jprima = 0;
  const arrivi = fusioni.filter((f) => f.passoArrivo <= nt), entrate = fusioni.filter((f) => f.passo <= nt);
  // ciò che una generazione di massa m nata al passo i (tabella q) restituisce tra il ritardo L0 e il ritardo L1
  // (zb: i metalli con cui era nata, in frazione di massa). R = [gas, metalli che porta, supernove da collasso, Ia, metalli NUOVI]
  const R = [0, 0, 0, 0, 0];
  const rende = (m, q, L0, L1, zb) => { const T = P.tab[q], ia = m * (T.cI[L1 + 1] - T.cI[L0 + 1]), mia = ia * P.MCH, nuovi = m * (T.cP[L1 + 1] - T.cP[L0 + 1]), g = m * (T.cR[L1 + 1] - T.cR[L0 + 1]); R[0] = g + mia; R[1] = zb * (g - nuovi) + nuovi + mia; R[2] = m * (T.cN[L1 + 1] - T.cN[L0 + 1]); R[3] = ia; R[4] = (nuovi + mia) * (1 - zb); };
  const metaMassa = (dove) => { let tot = 0, s = 0; for (let k = 0; k < NR; k++) tot += dove[k]; if (!(tot > 0)) return Rd * META_ESPONENZIALE; for (let k = 0; k < NR; k++) { if (s + dove[k] >= 0.5 * tot) return bordo[k] + ((0.5 * tot - s) / dove[k]) * (bordo[k + 1] - bordo[k]); s += dove[k]; } return bordo[NR]; };
  for (let j = 1; j <= nt; j++) {
    const t = j * DT, a = U.scala(t), Rv = raggioViriale(Mh[j], a), Vv = Math.sqrt((GK * Mh[j]) / Rv), c = concentrazione(Mh[j], a);
    // 1. la materia che entra: liscia, oppure in un compagno (che porta il suo gas caldo all'alone e resta in orbita)
    // Il gas porta il momento angolare che l'alone guadagna in quel passo (ΔJ/ΔM: la materia che arriva dopo, da più
    // lontano, ne ha di più della media): è la crescita del disco dall'interno verso l'esterno
    const Jh = momento(Mh[j], a), dMh = Mh[j] - Mh[j - 1], jGuscio = dMh > 0 ? (Jh - Jprima) / dMh : 0; Jprima = Jh;
    let dM = dMh;
    for (const f of entrate) if (f.passo === j) { const { s, scala } = satellite(f.massaAlone, j); dM -= f.massaAlone; caldo += (s.caldo + s.fuori) * scala; caldoZ += (s.caldoZ + s.fuoriZ) * scala; for (let c = 0; c < NC; c++) caldoC[c] += (s.caldoC[c] + s.fuoriC[c]) * scala; caldoJ += ((s.caldo + s.fuori) * scala * Jh) / Mh[j]; }
    dM = Math.max(0, dM);
    caldo += fb * dM; caldoJ += fb * dM * jGuscio;
    // il gas soffiato fuori dall'alone ci ricade, tanto prima quanto più l'alone è grande (Henriques et al. 2013)
    { const torna = 1 - Math.exp((-DT * Mh[j]) / (LEGGI.ritorno * 1e10)); caldo += fuori * torna; caldoZ += fuoriZ * torna; caldoJ += fuoriJ * torna; fuori *= 1 - torna; fuoriZ *= 1 - torna; fuoriJ *= 1 - torna; for (let c = 0; c < NC; c++) { caldoC[c] += fuoriC[c] * torna; fuoriC[c] *= 1 - torna; } }
    // 2. le fusioni che arrivano al centro in questo passo
    for (const f of arrivi) {
      if (f.passoArrivo !== j) continue;
      const { s, scala } = satellite(f.massaAlone, f.passo); let ms = 0, msZ = 0;
      // le sue stelle vanno nello sferoide (ciò che hanno restituito da quando è entrato nell'alone è finito nel gas caldo)
      // (per passo di nascita e per tabella di metalli, le stesse con cui hanno vissuto là: così la massa torna esatta)
      for (let q = 0; q < 4; q++) for (let i = 1; i <= f.passo; i++) {
        const m = s.natiQ[q * (f.passo + 1) + i] * scala; if (m <= 0) continue;
        const zb = (s.natiQZ[q * (f.passo + 1) + i] * scala) / m, La = f.passo - i, Lb = j - 1 - i, vive = 1 - P.tab[q].cR[Lb + 1] - P.tab[q].cI[Lb + 1] * P.MCH;
        est[q * NE + i] += m; estZ[q * NE + i] += m * zb; haEst[i] = 1; if (Lb > La) { rende(m, q, La, Lb, zb); caldo += R[0]; caldoZ += R[1]; }
        { const so = (q * (f.passo + 1) + i) * NC; for (let c = 0; c < NC; c++) estZC[(q * NE + i) * NC + c] += s.natiQZC[so + c] * scala; if (Lb > La) rendeC(caldoC, 0, m, q, La, Lb, zb, s.natiQZC, so); }
        ms += m * vive; msZ += m * zb * vive;
      }
      const mg = s.gasTot * scala, barioni = Mdisco + Msfer + gas.reduce((x, y) => x + y, 0), rb = (ms + mg) / Math.max(barioni, 1e-9);
      f.rapportoBarioni = rb; f.avvenuta = true; f.massaStelle = ms;
      B.fusioniStelle += ms; B.fusioniStelleZ += msZ; B.fusioniGas += mg; B.fusioniGasZ += s.gasZ * scala;
      const Rs = Math.max(s.raggioMeta * Math.cbrt(scala), 1e-3), unisci = (M1, R1, M2, R2) => (M1 + M2) ** 2 / (M1 * M1 / R1 + M2 * M2 / R2 + (M1 * M2) / (LEGGI.cole * (R1 + R2)));
      if (rb >= LEGGI.maggiore) {
        // MAGGIORE (Cole et al. 2000): il disco è distrutto. Tutte le stelle di prima finiscono nello sferoide; il gas di tutti gli
        // anelli, e quello del compagno, precipita al centro e lì brucia in uno scoppio, le cui stelle sono dello sferoide anche
        // loro (lo scoppio dura un passo: sono dello sferoide le nate fino a questo passo compreso, sferoideFino = j + 1)
        const M1 = Mdisco + Msfer, R1 = M1 > 0 ? (Mdisco * metaMassa(nd) + Msfer * Rsfer) / M1 : Rs;
        Rsfer = M1 > 0 ? unisci(M1, Math.max(R1, 1e-3), Math.max(ms, 1e-9), Rs) : Rs; Msfer += Mdisco + ms; Mdisco = 0; sferoideFino = j + 1; ultimaMaggiore = t; f.tipo = 'maggiore'; nd.fill(0);
        let g = mg, z = s.gasZ * scala; for (let k = 0; k < NR; k++) { g += gas[k]; z += met[k]; gas[k] = 0; met[k] = 0; } gas[0] = g; met[0] = z;
        for (let c = 0; c < NC; c++) { let zc = s.gasZC[c] * scala; for (let k = 0; k < NR; k++) { zc += metC[k * NC + c]; metC[k * NC + c] = 0; } metC[c] = zc; }
      } else {
        // MINORE: il disco resta. Le stelle del compagno vanno nello sferoide. IL GAS (Hopkins et al. 2009): perde il momento
        // angolare, e cade al centro, solo quello dentro R_gas = α·F·(1 − f_gas)·f_disco·G(μ)·R_d (f_gas: la parte del disco che è
        // gas; f_disco: la parte dei barioni che è disco; μ il rapporto dei barioni); il resto resta dov'è. Vale per il disco di
        // qui, G = 2μ/(1 + μ), e per quello del compagno (un disco esponenziale senza sferoide, che sente un compagno 1/μ:
        // G = 2/(1 + μ)); il gas del compagno che non cade si posa sul disco di qui, con la sua scala
        Rsfer = Msfer > 0 ? unisci(Msfer, Rsfer, Math.max(ms, 1e-9), Rs) : Rs; Msfer += ms; f.tipo = 'minore';
        const [aH, fH] = LEGGI.scoppio, mu = rb, dT = barioni - (Msfer - ms), gT = dT - Mdisco;
        if (gT > 0) { const Rgas = aH * fH * (1 - gT / dT) * (dT / barioni) * ((2 * mu) / (1 + mu)) * Rd; for (let k = 1; k < NR && bordo[k] < Rgas; k++) { if (!(gas[k] > 0)) continue; const w = Math.min(1, (Rgas * Rgas - bordo[k] ** 2) / (bordo[k + 1] ** 2 - bordo[k] ** 2)), m = w * gas[k], mz = w * met[k]; gas[k] -= m; met[k] -= mz; gas[0] += m; met[0] += mz; for (let c = 0; c < NC; c++) { const x = w * metC[k * NC + c]; metC[k * NC + c] -= x; metC[c] += x; } } }
        if (mg > 0) { const x = aH * fH * (1 - mg / (mg + ms)) * (2 / (1 + mu)), giu = 1 - (1 + x) * Math.exp(-x), zc = (s.gasZ * scala) / mg; let prima = 0; gas[0] += mg * giu; met[0] += mg * giu * zc; for (let c = 0; c < NC; c++) metC[c] += giu * s.gasZC[c] * scala;
          for (let k = 0; k < NR; k++) { const y = bordo[k + 1] / Rd, Fk = k === NR - 1 ? 1 : 1 - Math.exp(-y) * (1 + y), m = mg * (1 - giu) * (Fk - prima); gas[k] += m; met[k] += m * zc; for (let c = 0; c < NC; c++) metC[k * NC + c] += s.gasZC[c] * scala * (1 - giu) * (Fk - prima); prima = Fk; } }
      }
    }
    // 3. il gas restituito dalle generazioni passate: agli anelli dov'erano nate, o all'alone caldo se ora sono nello sferoide
    let ncc = 0, nia = 0;
    // (le somme su tutta la galassia si fanno per passo di nascita e tabella di metalli; anello per anello solo il gas e i suoi
    // metalli, e solo per le generazioni del disco. Intanto si tiene il conto di ciò che resta in stelle e resti: Mdisco, Msfer)
    for (let i = 1; i < j; i++) {
      const L = j - i, o = i * NR, b = 5 * L, bc = 4 * L; let rG = 0, rZ = 0, eG = 0, eZ = 0; tR.fill(0); tE.fill(0);
      for (let q = 0; q < 4; q++) {
        const m = natiQ[q * NE + i], a = q * NK + b, ac = q * NKC + bc; if (m > 0) { const mz = natiQZ[q * NE + i]; rG += m * K5[a]; rZ += mz * K5[a + 1] + m * K5[a + 2]; B.prodotti += (m - mz) * K5[a + 2]; ncc += m * K5[a + 3]; nia += m * K5[a + 4];
          for (let c = 0; c < NC; c++) tR[c] += natiQZC[(q * NE + i) * NC + c] * K5[a + 1]; tR[q] += m * KC[ac]; tR[IA] += m * KC[ac + 1]; tR[AGC] += m * KC[ac + 2]; tR[AGN] += m * KC[ac + 3]; }
        if (haEst[i]) { const me = est[q * NE + i]; if (me > 0) { const mz = estZ[q * NE + i]; eG += me * K5[a]; eZ += mz * K5[a + 1] + me * K5[a + 2]; B.prodotti += (me - mz) * K5[a + 2]; ncc += me * K5[a + 3]; nia += me * K5[a + 4];
          for (let c = 0; c < NC; c++) tE[c] += estZC[(q * NE + i) * NC + c] * K5[a + 1]; tE[q] += me * KC[ac]; tE[IA] += me * KC[ac + 1]; tE[AGC] += me * KC[ac + 2]; tE[AGN] += me * KC[ac + 3]; } }
      }
      if (i >= sferoideFino) { Mdisco -= rG; for (let k = 0; k < NR; k++) { const m = nati[o + k]; if (m > 0) { const q = iz[o + k], a = q * NK + b, ac = q * NKC + bc, zb = Zn[o + k] * ZSOLE * K5[a + 1]; gas[k] += m * K5[a]; met[k] += m * (Zn[o + k] * ZSOLE * K5[a + 1] + K5[a + 2]);
        const oc = k * NC, zo = (o + k) * NC, w = m * zb; // (la miscela di nascita ZnC somma a 1: i sette canali scritti uno per uno, è il giro più caldo)
        metC[oc] += w * ZnC[zo]; metC[oc + 1] += w * ZnC[zo + 1]; metC[oc + 2] += w * ZnC[zo + 2]; metC[oc + 3] += w * ZnC[zo + 3]; metC[oc + 4] += w * ZnC[zo + 4] + m * KC[ac + 1]; metC[oc + 5] += w * ZnC[zo + 5] + m * KC[ac + 2]; metC[oc + 6] += w * ZnC[zo + 6] + m * KC[ac + 3]; metC[oc + q] += m * KC[ac]; } } }
      else { eG += rG; eZ += rZ; for (let c = 0; c < NC; c++) tE[c] += tR[c]; }
      if (eG > 0) { Msfer -= eG; caldo += eG; caldoZ += eZ; B.alCaldo += eG; B.alCaldoZ += eZ; for (let c = 0; c < NC; c++) caldoC[c] += tE[c]; }
      B.resi += i >= sferoideFino ? rG + eG : eG;
    }
    // 4. il raffreddamento: quanto gas caldo cade sul disco in questo passo
    const T = T_VIR * Vv * Vv, rhoV = (caldo / (PI4 * Rv ** 3)) * (MSOLE / KPC ** 3), tcool = rhoV > 0 ? (K_COOL * T) / (rhoV * lambda(T, caldo > 0 ? caldoZ / caldo / ZSOLE : 0)) / GA : Infinity;
    const x = Math.sqrt(t / tcool), tdyn = Rv / (Vv * KMS); let cade;
    if (x >= 1) { cade = caldo * (1 - Math.exp(-DT / tdyn)); S.freddo[j] = 1; } // si raffredda prima di fermarsi: cade in caduta libera
    else {
      const Mbn = Math.max(LEGGI.germe, LEGGI.bucoNero[0] * Math.pow(Msfer / 1e11, LEGGI.bucoNero[1]) * 10 ** scartoBuco);
      const scalda = 2 * LEGGI.radio[1] * LEGGI.radio[0] * 1e9 * (Mbn / 1e8) * (caldo / Mh[j] / 0.1) * (Vv / 200) ** 3 * (C_KMS / Vv) ** 2; // M☉/Ga tenute calde dal buco nero
      cade = Math.min(caldo, Math.max(0, (caldo * x) / (2 * t) - scalda) * DT);
    }
    if (cade > 0) {
      const zc = caldoZ / caldo, jc = caldoJ / caldo, md = stringi((Mdisco + Msfer) / Mh[j], 0.005, 0.1), Ra = cadutaDi(jc, Rv, Vv, c, md), fc = cade / caldo; let prima = 0;
      for (let k = 0; k < NR && prima < 1; k++) { const y = bordo[k + 1] / Ra, F = k === NR - 1 || y > 40 ? 1 : 1 - Math.exp(-y) * (1 + y); gas[k] += cade * (F - prima); met[k] += cade * zc * (F - prima); for (let cc = 0; cc < NC; cc++) metC[k * NC + cc] += caldoC[cc] * fc * (F - prima); prima = F; }
      caldo -= cade; caldoZ -= cade * zc; caldoJ -= cade * jc; B.caduto += cade; B.cadutoZ += cade * zc; for (let cc = 0; cc < NC; cc++) caldoC[cc] -= caldoC[cc] * fc;
    }
    // 5. la curva di rotazione di adesso, anello per anello
    let mg = 0, mr = 0, ms = 0; for (let k = 0; k < NR; k++) { mg += gas[k]; mr += gas[k] * rc[k]; ms += nd[k]; }
    const fr = ms > 0 ? Mdisco / ms : 0; for (let k = 0; k < NR; k++) mr += fr * nd[k] * rc[k]; ms *= fr; // (delle stelle nate conta ciò che ne resta)
    // (la scala del disco esponenziale equivalente: metà del raggio medio di gas e stelle, pesato con la massa)
    if (mg + ms > 0) Rd = Math.max(0.5 * (mr / (mg + ms)), 1e-3);
    const mod = { Mh: Mh[j], c, Rv, Md: mg + Mdisco, Rd, Ms: Msfer, as: Math.max(Rsfer, 1e-3) / 2.414 };
    // (le formule di velocita() e di fuga2(), con il logaritmo dell'alone calcolato una volta sola per anello: V² e la fuga²)
    const hN = (GK * mod.Mh) / nfw(c), cRv = c / Rv, dK = mod.Md > 0 ? (2 * GK * mod.Md) / Rd : 0, gMd = GK * mod.Md, gMs = GK * mod.Ms;
    for (let k = 0; k < NR; k++) { const r = rc[k], cx = cRv * r, l1 = Math.log(1 + cx); let v2 = (hN * (l1 - cx / (1 + cx))) / r; if (dK > 0) v2 += dK * FREEMAN(r / (2 * Rd)); if (gMs > 0) v2 += (gMs * r) / (r + mod.as) ** 2; V2[k] = v2; F2[k] = 2 * ((hN * l1) / r + gMd / Math.sqrt(r * r + 4 * Rd * Rd) + gMs / (r + mod.as)); }
    // 6. le stelle: dal gas molecolare, che è la parte del gas decisa dalla pressione a metà dello strato; il vento
    let sfr = 0, gasOra = 0;
    for (let k = 0; k < NR; k++) {
      const o = j * NR + k; let formate = 0;
      if (gas[k] > mUna) {
        // la frequenza degli epicicli κ² = 2·(V/r)²·(1 + dlnV/dlnr), e con lei la dispersione verticale delle stelle (come cinematica());
        // la pressione a metà strato (Elmegreen 1989): il gas nel campo suo e in quello delle stelle. x = P/P₀
        const r = rc[k], k0 = Math.max(0, k - 1), k1 = Math.min(NR - 1, k + 1), pend = (V2[k1] - V2[k0]) / (2 * V2[k] * (lrc[k1] - lrc[k0])), kappa = Math.sqrt(2 * V2[k] * Math.max(0.05, 1 + pend)) / r;
        const sig = gas[k] / area[k], sst = (fr * nd[k]) / area[k], pst = (sst * LEGGI.sigmaGas) / Math.max(sFreddo, (kSigZ * sst) / kappa), x = C_PRESS * sig * (sig + pst);
        // (se nemmeno il ritmo più alto possibile — sotto P₀ e sotto Σ₀ è f_mol < √x e la parentesi < 2 — fa una stella in questo passo, basta così)
        if (!(x < 1 && sig < S0k && 2 * nu0 * DT * gas[k] * Math.sqrt(x) < mUna)) {
          // il vento: di ogni supernova resta in moto l'energia del suo guscio quando ha rallentato fino alla velocità del gas
          // attorno (½·p·σ_g, con p il momento finale del resto in gas di quella densità); con quella il gas esce dall'alone
          const ls = Math.log(sig), resta = cResta * Math.exp(LEGGI.momentoSN[1] * Math.max(LN_RADO, ls + lnGas)), eta = (resta * 2 * eSN) / F2[k], c1 = (1 + eta) * nu0 * DT;
          // le nascite: dΣg/dt = −(1 + η)·ν₀·[1 + (Σg/Σ₀)^q]·f_mol·Σg, con f_mol = 1/(1 + (P₀/P)^α). Il ritmo cala col gas: dove in
          // un passo se ne andrebbe più di un ventesimo, si prende il ritmo a metà passo
          let pm = Math.exp(aMol * Math.log(x)), kk = c1 * (1 + Math.exp(qS * (ls - lS0))) * (pm / (1 + pm));
          if (kk > 0.05) { const sm = sig * Math.exp(-0.5 * kk); pm = Math.exp(aMol * Math.log(C_PRESS * sm * (sm + pst))); kk = c1 * (1 + Math.exp(qS * (ls - 0.5 * kk - lS0))) * (pm / (1 + pm)); }
          const tolto = gas[k] * -Math.expm1(-kk), z = met[k] / gas[k]; formate = tolto / (1 + eta);
          if (formate < mUna) formate = 0; // (meno di una stella in un passo: niente)
          else {
            { let sc = 0; for (let c = 0; c < NC; c++) sc += metC[k * NC + c]; for (let c = 0; c < NC; c++) frC[c] = sc > 0 ? metC[k * NC + c] / sc : 0; } // (la miscela dei metalli del gas di quell'anello: le parti, che sommano a 1)
            gas[k] -= tolto; met[k] -= tolto * z; B.vento += tolto - formate; B.ventoZ += (tolto - formate) * z; fuori += tolto - formate; fuoriZ += (tolto - formate) * z; fuoriJ += (tolto - formate) * r * Math.sqrt(V2[k]);
            nati[o] = formate; Sg[o] = sig; Zn[o] = z / ZSOLE; iz[o] = tabellaZ(z / ZSOLE); if (j >= sferoideFino) nd[k] += formate; natiQ[iz[o] * NE + j] += formate; natiQZ[iz[o] * NE + j] += formate * Zn[o] * ZSOLE;
            for (let c = 0; c < NC; c++) { metC[k * NC + c] -= tolto * z * frC[c]; fuoriC[c] += (tolto - formate) * z * frC[c]; ZnC[o * NC + c] = frC[c]; natiQZC[(iz[o] * NE + j) * NC + c] += formate * Zn[o] * ZSOLE * frC[c]; }
            // ciò che la generazione appena nata restituisce già in questo passo (le stelle massicce)
            rende(formate, iz[o], -1, 0, z); gas[k] += R[0]; met[k] += R[1]; B.prodotti += R[4]; B.resi += R[0]; ncc += R[2]; nia += R[3]; if (j >= sferoideFino) Mdisco += formate - R[0]; else Msfer += formate - R[0];
            rendeC(metC, k * NC, formate, iz[o], -1, 0, z, ZnC, o * NC);
          }
        }
      }
      sfr += formate; gasOra += gas[k]; Zt[o] = gas[k] > 0 ? met[k] / gas[k] / ZSOLE : 0;
    }
    // 7. IL NUCLEO ATTIVO DOPO UNA FUSIONE (il «modo quasar» dei modelli semi-analitici: Di Matteo, Springel & Hernquist 2005;
    // Croton et al. 2006, §3.4; Somerville et al. 2008, MNRAS 391, 481, §2.9–2.10 [V]). Il buco nero segue lo sferoide (Kormendy &
    // Ho): quando lo sferoide cresce (le stelle di un compagno, uno scoppio) cresce anche lui, e la massa la prende dal gas freddo
    // del nucleo (l'anello centrale). Acceso, irradia ε_r·Δm·c² (ε_r = 0,1, la resa del disco di accrescimento: LEGGI.radio[1]);
    // la spinta di quella luce, per la parte ε_wind (LEGGI.quasar), porta fuori dalla galassia il gas del nucleo alla velocità di
    // fuga: M_via = ε_wind·ε_r·Δm·c/V_fuga (Somerville et al. 2008, eq. 17). Va dove va il vento delle supernove, e ne ricade allo
    // stesso modo (Henriques et al. 2013). Prima il gas rimasto dallo scoppio restava freddo al centro, e lì, senza altro gas che
    // lo diluisse, saliva a 4–6 Z☉ come in una scatola chiusa
    { const dovuto = Math.max(LEGGI.germe, LEGGI.bucoNero[0] * Math.pow(Msfer / 1e11, LEGGI.bucoNero[1]) * 10 ** scartoBuco);
      if (dovuto > Mbn && gas[0] > 0) {
        // (quando il buco e il vento si prendono tutto il gas del nucleo, il nucleo resta vuoto: gas e metalli a zero, non il
        // resto di gas − preso − via e di met − (preso + via)·z, che è un errore di arrotondamento — in una ellittica del cosmo 1
        // restavano 3·10⁻⁹ M☉ di metalli senza gas, che i canali, svuotati per moltiplicazione, non avevano: Σ canali / metalli
        // del gas sbagliava dell'8,6 % su un gas che non c'è; «tutto» si decide prima della somma, perché (gas − preso) + preso
        // può differire da gas di un'unità dell'ultima cifra)
        const preso = Math.min(dovuto - Mbn, gas[0]), z = met[0] / gas[0], spinto = (LEGGI.quasar * LEGGI.radio[1] * preso * C_KMS) / Math.sqrt(F2[0]), tutto = preso >= gas[0] || spinto >= gas[0] - preso, via = tutto ? gas[0] - preso : spinto, fr = tutto ? 1 : (preso + via) / gas[0];
        Mbn += preso; B.buco += preso; B.bucoZ += preso * z; B.quasar += via; if (tutto) { gas[0] = 0; met[0] = 0; } else { gas[0] -= preso + via; met[0] -= (preso + via) * z; }
        B.vento += via; B.ventoZ += via * z; fuori += via; fuoriZ += via * z; fuoriJ += via * rc[0] * Math.sqrt(V2[0]);
        for (let c = 0; c < NC; c++) { const x = metC[c] * fr; metC[c] -= x; fuoriC[c] += (x * via) / (preso + via); }
        gasOra -= preso + via; Zt[j * NR] = gas[0] > 0 ? met[0] / gas[0] / ZSOLE : 0;
      } else Mbn = Math.max(Mbn, dovuto); }
    S.sfr[j] = sfr / DT / 1e9; S.gas[j] = gasOra; S.stelle[j] = Mdisco + Msfer; S.caldo[j] = caldo; S.collasso[j] = ncc / DT / 1e9; S.Ia[j] = nia / DT / 1e9;
  }
  // ---------- com'è oggi
  const sigStelle = new Float64Array(NR), sigGas = new Float64Array(NR), natiTot = new Float64Array(nt + 1), natiZ = new Float64Array(nt + 1), venute = new Float64Array(NE), venuteZ = new Float64Array(NE), venuteZC = new Float64Array(NE * NC); let nateTutte = 0, metStelle = 0;
  for (let i = 1; i <= nt; i++) {
    const L = nt - i; let m1 = 0, z1 = 0;
    for (let k = 0; k < NR; k++) { const m = nati[i * NR + k]; if (!(m > 0)) continue; const T = P.tab[iz[i * NR + k]], v = m * (1 - T.cR[L + 1] - T.cI[L + 1] * P.MCH); m1 += m; z1 += m * Zn[i * NR + k] * ZSOLE; metStelle += Zn[i * NR + k] * ZSOLE * v; if (i >= sferoideFino) sigStelle[k] += v / area[k]; }
    for (let q = 0; q < 4 && haEst[i]; q++) { metStelle += estZ[q * NE + i] * (1 - P.tab[q].cR[L + 1] - P.tab[q].cI[L + 1] * P.MCH); venute[i] += est[q * NE + i]; venuteZ[i] += estZ[q * NE + i]; for (let c = 0; c < NC; c++) venuteZC[i * NC + c] += estZC[(q * NE + i) * NC + c]; }
    natiTot[i] = m1; natiZ[i] = m1 > 0 ? z1 / m1 : 0; nateTutte += m1 + venute[i];
  }
  let gasTot = 0, gasZ = 0; for (let k = 0; k < NR; k++) { sigGas[k] = gas[k] / area[k]; gasTot += gas[k]; gasZ += met[k]; dove[k] = sigStelle[k] * area[k] + gas[k]; }
  const aO = U.scala(nt * DT), RvO = raggioViriale(M0, aO), mod = { Mh: M0, c: concentrazione(M0, aO), Rv: RvO, Md: gasTot + Mdisco, Rd, Ms: Msfer, as: Math.max(Rsfer, 1e-3) / 2.414 };
  const raggioMeta = Mdisco + Msfer > 0 ? ((Mdisco + gasTot) * metaMassa(dove) + Msfer * Rsfer) / (Mdisco + gasTot + Msfer) : Rd;
  const gasZC = new Float64Array(NC); for (let k = 0; k < NR; k++) for (let c = 0; c < NC; c++) gasZC[c] += metC[k * NC + c];
  if (compagno) return { natiTot, natiZ, natiQ, natiQZ, natiQZC, gasTot, gasZ, gasZC, caldo, caldoZ, caldoC, fuori, fuoriZ, fuoriC, raggioMeta, massaStelle: Mdisco + Msfer };
  return { M0, spin, nt, Mh, inizio: Mh.inizio, bordo, rc, area, nati, Sg, Zn, ZnC, iz, est: venute, estZ: venuteZ, estZC: venuteZC, Zt, S, B, gas, met, metC, gasZC, caldoC, fuoriC, sigStelle, sigGas, caldo, caldoZ, fuori, fuoriZ, sferoideFino, ultimaMaggiore, Mdisco, Msfer, Rsfer, mod, gasTot, gasZ, nateTutte, metStelle, fusioni };
}

// ---------- LA FORMA DI UNA GALASSIA, dal suo alone e dai suoi vicini.
// G: l'oggetto di cosmo(n).galassie ({ pos, peso, id }); vicini: tutte le galassie di quel cosmo; caso: la sorgente
// degli eventi della galassia (eventi.js: sorgente('cosmo 1/galassia 3', rami)). opz: { toroM, onde } del campo.
// → vedi in fondo alla funzione che cosa restituisce (masse in M☉, lunghezze in kpc, tempi in Ga se non detto).
export function formaGalassia(G, vicini = [], caso = sorgente('galassia'), opz = {}) {
  return formaDaAlone(aloneGalassia(G, vicini, caso, opz), caso);
}
export function formaDaAlone(alone, caso = sorgente('galassia')) {
  // la storia dell'alone con le sue fusioni: estratte dalla legge, oppure date (per le prove: [{ quando (Ga), rapporto }])
  const P = popolazione(), nt = PASSI, NR = ANELLI, Mh = alone.fusioni ? storiaAlone(alone.massa, nt, null, alone.fusioni) : storiaAlone(alone.massa, nt, caso);
  // (un compagno arriva al centro quando l'attrito dinamico ce l'ha portato; se non ha fatto in tempo è ancora in orbita)
  const fusioni = Mh.fusioni.map((f) => ({ ...f, passoArrivo: Math.max(f.passo + 1, Math.ceil(f.arrivo / DT - 1e-9)), avvenuta: false, tipo: 'in orbita' }));
  const scartoBuco = LEGGI.bucoNero[2] * caso.normale('buco/scarto');
  const e = evolvi(Mh, alone.spin, nt, fusioni, scartoBuco), { bordo, rc, area, sigStelle, sigGas, mod, S } = e;
  // ---- le masse e il tipo
  const massaDisco = e.Mdisco, massaSferoide = e.Msfer, massaStelle = massaDisco + massaSferoide, frazioneSferoide = massaStelle > 0 ? massaSferoide / massaStelle : 0;
  // ---- il disco: la scala (retta in ln Σ★ tra 1 e 4 scale, fuori dal centro, come si misura nelle galassie vere; si
  // parte da metà del raggio medio delle stelle e si ripete), e il raggio che tiene il 97% delle stelle del disco
  let raggioDisco = mod.Rd, cum = 0, r97 = bordo[NR];
  { const mD = sigStelle.reduce((a, s, k) => a + s * area[k], 0); if (mD > 0) raggioDisco = 0.5 * sigStelle.reduce((a, s, k) => a + s * area[k] * rc[k], 0) / mD;
    for (let giro = 0; giro < 3 && mD > 0; giro++) {
      let sx = 0, sy = 0, sxx = 0, sxy = 0, n = 0;
      for (let k = 0; k < NR; k++) if (rc[k] > raggioDisco && rc[k] < 4 * raggioDisco && sigStelle[k] > 0) { const y = Math.log(sigStelle[k]); sx += rc[k]; sy += y; sxx += rc[k] ** 2; sxy += rc[k] * y; n++; }
      if (n >= 3) { const p = (n * sxy - sx * sy) / (n * sxx - sx * sx); if (p < 0) raggioDisco = -1 / p; }
    }
    for (let k = 0; k < NR && mD > 0; k++) { const m = sigStelle[k] * area[k]; if (cum + m >= 0.97 * mD) { r97 = bordo[k] + ((0.97 * mD - cum) / m) * (bordo[k + 1] - bordo[k]); break; } cum += m; } }
  const raggioSferoide = e.Rsfer, aSfer = Math.max(raggioSferoide, 1e-3) / 2.414; // raggio di metà massa; scala di Hernquist
  const unitaKpc = Math.max(0.5, frazioneSferoide > 0.97 ? 0 : r97, frazioneSferoide > 0.3 ? 5 * raggioSferoide : 0);
  // ---- la curva di rotazione di oggi e ciò che ne discende: i bracci, la barra
  const R22 = 2.2 * raggioDisco, v = (r) => velocita(mod, r), sigmaA = (r) => { let k = 0; while (k < NR - 1 && bordo[k + 1] < r) k++; return [sigStelle[k], sigGas[k]]; };
  const gamma = (r) => stringi(1 - Math.log(v(1.1 * r) / v(0.9 * r)) / Math.log(1.1 / 0.9), 0.2, 1.8), omega = (r) => v(r) / r; // Γ = −dlnΩ/dlnr
  const kappa = (r) => omega(r) * Math.sqrt(2 * (2 - gamma(r)));
  const [s22, g22] = sigmaA(R22), Qgas = g22 > 0 ? (LEGGI.sigmaGas * kappa(R22)) / (Math.PI * GK * g22) : Infinity, Q = 1 / (1 / Qgas + 1 / LEGGI.Qstelle);
  const mBracci = (kappa(R22) ** 2 * R22) / (PI4 * GK * Math.max(s22 + g22, 1)), passoDi = (r) => { const g = gamma(r); return Math.atan(((2 / 7) * Math.sqrt(4 - 2 * g)) / g); };
  // il contrasto dell'onda nella densità delle stelle: da 0 (Q = Qstelle: l'amplificatore non guadagna) a 0,45 (Q ≈ 1);
  // il gas, più freddo, risponde di più: il doppio
  const contrasto = massaDisco > 0 && frazioneSferoide <= 0.8 ? 0.45 * stringi((LEGGI.Qstelle - Q) / (LEGGI.Qstelle - 1), 0, 1) : 0, contrastoGas = Math.min(0.95, 2 * contrasto);
  const numero = Math.round(stringi(mBracci, 2, 12));
  // la fase dei bracci anello per anello: dφ/dln r = 1/tan(passo), con il passo che segue il taglio locale
  const fase = new Float64Array(NR); for (let k = 1; k < NR; k++) fase[k] = fase[k - 1] + Math.log(rc[k] / rc[k - 1]) / Math.tan(passoDi(0.5 * (rc[k] + rc[k - 1])));
  // dove sta una stella rispetto al braccio (da −½ a ½ dell'intervallo tra due bracci; 0 è la cresta): le vecchie come la
  // densità dell'onda, 1 + A·cos; le giovani dove sono nate: la densità del gas, 1 + A_gas·cos, alla potenza con cui le nascite
  // seguono il gas LÌ. È la pendenza della legge delle nascite a 2,2 scale, d ln Σ_SFR/d ln Σ_gas con le stelle ferme [D]:
  // 1 + q·u/(1 + u) + α·(1 − f_mol)·(1 + Σg/(Σg + Σ★·σg/σ★)), con u = (Σg/Σ₀)^q (1 dove il gas è tutto molecolare e rado,
  // 1,4 negli scoppi, fino a 2,6 dove è quasi tutto atomico)
  const esponente = (() => { if (!(g22 > 0)) return 1; const pst = (s22 * LEGGI.sigmaGas) / Math.max(LEGGI.soglia[1], (LEGGI.rapportoVerticale * LEGGI.Qstelle * 3.36 * GK * s22) / kappa(R22)), pm = Math.pow(C_PRESS * g22 * (g22 + pst), LEGGI.molecole[1]), u = Math.pow(g22 / (LEGGI.nascite[1] * 1e6), LEGGI.nascite[2]); return 1 + (LEGGI.nascite[2] * u) / (1 + u) + (LEGGI.molecole[1] / (1 + pm)) * (1 + g22 / (g22 + pst)); })();
  const NC = 48, ripartizione = (A, n) => { const c = new Float64Array(NC + 1); for (let i = 0; i < NC; i++) c[i + 1] = c[i] + Math.pow(1 + A * Math.cos((2 * Math.PI * (i + 0.5)) / NC - Math.PI), n); for (let i = 0; i <= NC; i++) c[i] /= c[NC]; return c; };
  const cdf = ripartizione(contrastoGas, esponente), cdfVecchie = ripartizione(contrasto, 1);
  let vmax = 0, rmax = 0; for (let k = 0; k < NR; k++) { const x = v(rc[k]); if (x > vmax) { vmax = x; rmax = rc[k]; } }
  const massaGas = e.gasTot, instabile = massaDisco > 0 && frazioneSferoide < 0.5 && vmax / Math.sqrt((GK * (massaDisco + massaGas)) / raggioDisco) < LEGGI.barra;
  // la barra arriva fin dove il disco, da solo, fa più di metà della forza
  let rBarra = 0; if (instabile) { for (let k = 0; k < NR; k++) { const r = rc[k], vd2 = ((2 * GK * mod.Md) / mod.Rd) * FREEMAN(r / (2 * mod.Rd)); if (vd2 > 0.5 * v(r) ** 2) rBarra = bordo[k + 1]; else if (rBarra > 0) break; } rBarra = Math.min(rBarra, 2 * raggioDisco); }
  // la classe: ellittica se quasi tutto è sferoide; lenticolare se c'è un disco ma senza gas freddo abbastanza da fare bracci
  const classe = frazioneSferoide > 0.8 ? 'ellittica' : contrasto < 0.05 ? 'lenticolare' : rBarra > 0 ? 'spirale barrata' : 'spirale';
  const tipo = classe.startsWith('spirale') ? 'spirale' : 'ellittica'; // (i due nomi che cosmo.js e la mappa conoscono)
  // ---- il buco nero: dalla massa dello sferoide (Kormendy & Ho), o il germe; quanto mangia oggi
  const Mbn = Math.max(LEGGI.germe, LEGGI.bucoNero[0] * Math.pow(massaSferoide / 1e11, LEGGI.bucoNero[1]) * 10 ** scartoBuco);
  // in media cresce al passo delle stelle che ha attorno (l'anello centrale): ṁ/M_bn = ritmo di nascita/massa lì; in più,
  // in un alone caldo, il modo «radio» di Croton. Poi è acceso a tratti: la frazione di Eddington di oggi è un evento
  const m0 = sigStelle[0] * area[0] + massaSferoide * (bordo[1] / (bordo[1] + aSfer)) ** 2, sfr0 = e.nati[nt * NR] / DT / 1e9;
  const Vv = Math.sqrt((GK * alone.massa) / mod.Rv), radio = S.freddo[nt] ? 0 : LEGGI.radio[0] * (Mbn / 1e8) * (e.caldo / alone.massa / 0.1) * (Vv / 200) ** 3;
  const mediaBn = (m0 > 0 ? (Mbn * sfr0) / m0 : 0) + radio, mEdd = Mbn / (0.1 * 4.5e8); // M☉/anno (tempo di Salpeter: 4,5·10⁸ anni a resa 1)
  const p = -LEGGI.eddington, lMedia = Math.min(0.3, mediaBn / mEdd), lMin = Math.pow((lMedia * (1 - p)) / p, 1 / p), eddington = lMedia > 0 ? Math.min(1, lMin * Math.pow(1 - caso('buco/acceso') * (1 - Math.pow(lMin, p)), -1 / p)) : 0;
  const accrescimento = eddington * mEdd, attivita = eddington > 0 ? stringi(1 + Math.log10(eddington) / 6, 0, 1) : 0;
  // ---- le supernove di oggi; il colore (la luce di ogni generazione ancora viva)
  const ritmoSN = { collasso: S.collasso[nt], Ia: S.Ia[nt], totale: S.collasso[nt] + S.Ia[nt] };
  let luce = 0; const tinta = [0, 0, 0];
  for (let i = 1; i <= nt; i++) { let m = e.est[i]; for (let k = 0; k < NR; k++) m += e.nati[i * NR + k]; const L = nt - i; luce += m * P.luce[L]; for (let c = 0; c < 3; c++) tinta[c] += m * P.tinta[3 * L + c]; }
  const colore = a255(tinta);
  // LA LUCE DEL DISCO, ANELLO PER ANELLO (per chi lo disegna): quella di tutte le generazioni nate lì e ancora nel disco
  // (luce, in L☉/kpc²; luceV, quella che l'occhio vede, in unità di quella del Sole per kpc²; colore, da 0 a 255), e la parte
  // delle stelle più giovani della vita di un braccio a quel raggio (vitaBraccio, Ga), che stanno ancora dove sono nate:
  // luceGiovani, luceVGiovani, coloreGiovani. Tutto dalle popolazioni (popolazione(): luce, luceV, tinta, finoA) e dalle nascite
  const luceA = new Float64Array(NR), luceVA = new Float64Array(NR), luceG = new Float64Array(NR), luceVG = new Float64Array(NR), vitaBraccio = new Float64Array(NR), coloreA = [], coloreG = [], i0 = Math.max(1, e.sferoideFino);
  for (let k = 0; k < NR; k++) {
    const ca = [0, 0, 0], cg = [0, 0, 0], tau = Math.PI / (omega(rc[k]) * KMS); vitaBraccio[k] = tau;
    for (let i = i0; i <= nt; i++) { const m = e.nati[i * NR + k]; if (!(m > 0)) continue; const L = nt - i; luceA[k] += m * P.luce[L]; luceVA[k] += m * P.luceV[L]; ca[0] += m * P.tinta[3 * L]; ca[1] += m * P.tinta[3 * L + 1]; ca[2] += m * P.tinta[3 * L + 2]; }
    for (let i = nt; i >= i0 && (nt - i) * DT < tau; i--) { const m = e.nati[i * NR + k] / DT; if (!(m > 0)) continue; const a0 = (nt - i) * DT, a1 = Math.min(a0 + DT, tau); luceG[k] += m * (P.finoA(a1, 0) - P.finoA(a0, 0)); luceVG[k] += m * (P.finoA(a1, 1) - P.finoA(a0, 1)); for (let c = 0; c < 3; c++) cg[c] += m * (P.finoA(a1, 2 + c) - P.finoA(a0, 2 + c)); }
    luceA[k] /= area[k]; luceVA[k] /= area[k]; luceG[k] /= area[k]; luceVG[k] /= area[k]; coloreA.push(luceVA[k] > 0 ? a255(ca) : [0, 0, 0]); coloreG.push(luceVG[k] > 0 ? a255(cg) : [0, 0, 0]);
  }
  // ---- il bilancio (in M☉): ciò che è entrato = ciò che c'è + ciò che è uscito; i metalli fatti = i metalli che ci sono
  const B = e.B;
  const bilancio = {
    entrato: B.caduto + B.fusioniGas + B.fusioniStelle, gas: massaGas, stelle: massaStelle, vento: B.vento, alCaldo: B.alCaldo, restituito: B.resi, nate: e.nateTutte,
    metalliProdotti: B.prodotti, metalliEntrati: B.cadutoZ + B.fusioniGasZ + B.fusioniStelleZ, metalliGas: e.gasZ, metalliStelle: e.metStelle, metalliVento: B.ventoZ, metalliCaldo: B.alCaldoZ, buco: B.buco, metalliBuco: B.bucoZ, quasar: B.quasar, dettaglio: B,
  };
  const formazione = e.inizio; // (Ga) quando l'alone ha cominciato a raffreddare gas: nessuna stella è più vecchia
  const schiacciata = tipo === 'ellittica' ? stringi(LEGGI.assi[0] + LEGGI.assi[1] * caso.normale('sferoide/assi'), 0.35, 1) : 1;
  // gli angoli sulla mappa: i bracci partono dalla direzione della marea; la barra è lungo l'asse del proto-alone; il getto,
  // che esce lungo l'asse di rotazione, è disegnato di traverso alla barra (la galassia è vista di faccia)
  const angolo = alone.direzioneMarea ?? 0, asse = ((alone.asse ?? 0) % Math.PI + Math.PI) % Math.PI, getto = (asse + Math.PI / 2) % Math.PI;
  const buco = { M: Mbn, attivita, eddington, accrescimento, potenzaW: LEGGI.getto * accrescimento * (MSOLE / ANNO) * COSTANTI.c ** 2 };
  return {
    alone: { ...alone, raggioViriale: mod.Rv, velocitaViriale: Vv, concentrazione: mod.c, storia: Mh }, ambiente: alone.massa >= 1e14 ? 'ammasso' : alone.massa >= 1e13 ? 'gruppo' : 'campo',
    tipo, classe, massaStelle, massaGas, massaDisco, massaSferoide, frazioneSferoide, massaCalda: e.caldo, massaFuori: e.fuori,
    raggioDisco, raggioSferoide, scalaSferoide: aSfer, unitaKpc, unitaM: unitaKpc * KPC,
    velocita: v(R22), velocitaMassima: vmax, raggioVelocitaMassima: rmax,
    bracci: { numero, m: mBracci, passo: passoDi(R22), contrasto, contrastoGas, esponente, Q, angolo, verso: alone.verso ?? 1, fase, cdf, cdfVecchie, vita: (r) => Math.PI / (omega(r) * KMS) },
    barra: rBarra > 0 ? { raggio: rBarra, angolo: asse, forza: 0.6 } : null,
    buco, ritmoSN, fusioni: e.fusioni.map((f) => ({ quando: f.quando, rapporto: f.rapporto, arrivo: f.arrivo, avvenuta: f.avvenuta, tipo: f.tipo, rapportoBarioni: f.rapportoBarioni ?? null, massaStelle: f.massaStelle ?? null })),
    ultimaFusioneMaggiore: e.ultimaMaggiore || null, prossimaFusione: alone.prossimaFusione ?? null,
    storia: { dt: DT, t: Float64Array.from({ length: nt + 1 }, (_, j) => j * DT), sfr: S.sfr, gas: S.gas, stelle: S.stelle, caldo: S.caldo, collasso: S.collasso, Ia: S.Ia, freddo: S.freddo, alone: Mh },
    anelli: { bordo, r: rc, area, sigmaStelle: sigStelle, sigmaGas: sigGas, Z: e.Zt.subarray(nt * NR, (nt + 1) * NR), luce: luceA, luceV: luceVA, colore: coloreA, luceGiovani: luceG, luceVGiovani: luceVG, coloreGiovani: coloreG, vitaBraccio },
    bilancio, luce, tinta: colore, formazione: formazione * GA, eta: T0,
    // i campi che cosmo(n) mette sulla galassia (gli stessi nomi di oggi)
    perG: { tipo, bracci: numero, angolo, passo: passoDi(R22), schiacciata, attivita, getto, tinta: colore, formazione: formazione * GA },
    schiacciata, modello: mod, interno: e,
  };
}

// ---------- I RISCONTRI
// le supernove all'anno, oggi: { collasso, Ia, totale }
export const ritmoSupernove = (forma) => forma.ritmoSN;
// LA MISCELA DI NASCITA di una stella (la catena degli elementi): le parti dei suoi metalli per canale (elementi.js CANALI),
// quelle del gas dell'anello e del passo in cui è nata (o, per le stelle venute con le fusioni, della loro generazione), e la
// miscela in massa di tutti gli elementi che ne viene. → { canali: Float64Array (somma 1, o tutti 0 se il gas non aveva
// metalli), abbondanze: { simbolo: frazione in massa } }. Senza «nascita» (una stella fatta a mano): null.
export function miscelaDiNascita(forma, stella) {
  const nas = stella?.nascita, e = forma?.interno; if (!nas || !e?.ZnC) return null;
  const NC = CANALI.length, f = new Float64Array(NC), { passo: i, anello: k } = nas;
  if (k < ANELLI) { const o = (i * ANELLI + k) * NC; for (let c = 0; c < NC; c++) f[c] = e.ZnC[o + c]; }
  else { let t = 0; for (let c = 0; c < NC; c++) { f[c] = e.estZC[i * NC + c]; t += f[c]; } if (t > 0) for (let c = 0; c < NC; c++) f[c] /= t; }
  return { canali: f, abbondanze: abbondanzeDaCanali(stella.Z ?? 1, f) };
}
// la metallicità del gas (in unità solari) al tempo t (ANNI dall'inizio) e al raggio r (kpc): è la Z con cui nasce una stella lì e allora
export function metallicita(forma, t, r) {
  const e = forma.interno, NR = ANELLI, x = stringi(t / 1e9 / DT, 1, e.nt), j = Math.min(e.nt - 1, Math.floor(x)), u = x - j;
  let k = 0; while (k < NR - 2 && e.rc[k + 1] < r) k++; const w = stringi((r - e.rc[k]) / (e.rc[k + 1] - e.rc[k]), 0, 1), z = (jj) => e.Zt[jj * NR + k] * (1 - w) + e.Zt[jj * NR + k + 1] * w;
  return z(j) * (1 - u) + z(j + 1) * u;
}
// la Z (in unità solari) con cui è nata una stella al tempo t (ANNI dall'inizio) nell'anello che contiene il raggio r (kpc):
// quella del gas di quell'anello quando le stelle di quel passo si sono formate (senza interpolare: è il conto del modello)
export function metallicitaDiNascita(forma, t, r) {
  const e = forma.interno, j = stringi(Math.floor(t / 1e9 / DT) + 1, 1, e.nt); let k = 0; while (k < ANELLI - 1 && e.bordo[k + 1] < r) k++;
  return e.Zn[j * ANELLI + k];
}
// l'angolo (radianti) a cui passa la cresta di un braccio al raggio r (kpc): gli altri sono a 2π/numero l'uno dall'altro
export function faseBraccio(forma, r) {
  const rc = forma.anelli.r, B = forma.bracci, NR = rc.length; let q = 0; while (q < NR - 2 && rc[q + 1] < r) q++;
  return B.angolo + B.verso * (B.fase[q] + stringi(Math.log(Math.max(r, 1e-6) / rc[q]) / Math.log(rc[q + 1] / rc[q]), -1, 2) * (B.fase[q + 1] - B.fase[q]));
}
// la velocità di rotazione (km/s) al raggio r (kpc), oggi; con `parti`: { alone, disco, sferoide }
export function curvaRotazione(forma, r, parti = false) {
  const m = forma.modello; if (!parti) return velocita(m, r);
  return { totale: velocita(m, r), alone: velocita({ ...m, Md: 0, Ms: 0 }, r), disco: Math.sqrt(Math.max(0, velocita({ ...m, Ms: 0 }, r) ** 2 - velocita({ ...m, Md: 0, Ms: 0 }, r) ** 2)), sferoide: Math.sqrt((GK * m.Ms * r) / (r + m.as) ** 2) };
}

// ---------- LA GALASSIA IN TRE DIMENSIONI E NEL TEMPO: come si muove ogni stella, quanto è spesso il disco, come girano i bracci.
// Unità: kpc, km/s, e il tempo in Ga (miliardi di anni) da oggi. Il riferimento è quello della galassia: x, y il piano
// della mappa, z la normale; il disco gira nel verso in cui i bracci restano indietro.
// LE LEGGI (dichiarate):
//   · le stelle del disco si regolano da sole a Q = Qstelle (lo stesso numero che decide i bracci): la dispersione
//     radiale è σ_R = Q·3,36·G·Σ★/κ, anello per anello; quella verticale ne è la metà (σ_z/σ_R ≈ 0,5: misurato vicino
//     al Sole, Dehnen & Binney 1998);
//   · IL RISCALDAMENTO DEL DISCO: una stella nasce con la dispersione del gas freddo (6 km/s: quella della soglia di
//     Toomre) e gli incontri con nubi e bracci la scaldano con l'età, σ ∝ √età (Wielen 1977; Nordström et al. 2004
//     trovano esponenti 0,3–0,5): qui σ(età) = σ_anello·√(età/età media dell'anello), così la media torna quella sopra;
//   · lo spessore: uno strato isotermo che si regge da solo, ρ ∝ sech²(z/z₀) con z₀ = σ_z²/(πGΣ) (Spitzer 1942);
//     una stella sale e scende con la frequenza ν² = 2πGΣ/z₀ (oscillazione armonica: vale per le ampiezze piccole);
//   · nel piano: l'orbita è un cerchio più un epiciclo (Lindblad): la stella oscilla attorno al suo cerchio guida con
//     la frequenza κ della curva di rotazione, in un'ellisse allungata lungo il moto (2Ω/κ);
//   · lo sferoide: velocità in ogni direzione con dispersione σ = V/√2 (sfera isoterma), tre eventi per stella; il moto
//     nel tempo è un cerchio nel piano di posizione e velocità (SEMPLIFICAZIONE: le orbite vere sono rosette);
//   · I BRACCI girano tutti insieme, come un'onda, con una velocità angolare loro: quella del disco alla corotazione.
//     Con una barra la corotazione sta a 1,2 volte la sua lunghezza (misurato: 1,2 ± 0,2, Aguerri et al. 2003, e i
//     bracci che ne partono girano con lei); senza, dove l'amplificazione di taglio è massima, a 2,2 scale (scelta
//     dichiarata: lì si contano i bracci). Dentro la corotazione le stelle superano i bracci, fuori restano indietro.
const cinematiche = new WeakMap();
export function cinematica(forma) {
  let c = cinematiche.get(forma); if (c) return c;
  const NR = ANELLI, { r, sigmaStelle, sigmaGas } = forma.anelli, e = forma.interno, m = forma.modello;
  const omega = new Float64Array(NR), kappa = new Float64Array(NR), sigR = new Float64Array(NR), sigZ = new Float64Array(NR), z0 = new Float64Array(NR), nu = new Float64Array(NR), eta = new Float64Array(NR);
  for (let k = 0; k < NR; k++) {
    const v = velocita(m, r[k]), g = stringi(1 - Math.log(velocita(m, 1.1 * r[k]) / velocita(m, 0.9 * r[k])) / Math.log(1.1 / 0.9), 0.2, 1.8);
    omega[k] = v / r[k]; kappa[k] = omega[k] * Math.sqrt(2 * (2 - g));
    // l'età media delle stelle del disco in quell'anello (pesata con la massa nata)
    let mm = 0, me = 0; for (let i = Math.max(1, e.sferoideFino); i <= e.nt; i++) { const x = e.nati[i * NR + k]; mm += x; me += x * (e.nt - i + 0.5) * DT; } eta[k] = mm > 0 ? me / mm : 0.5 * T0;
    const tot = sigmaStelle[k] + sigmaGas[k];
    sigR[k] = Math.max(LEGGI.soglia[1], (LEGGI.Qstelle * 3.36 * GK * sigmaStelle[k]) / kappa[k]); sigZ[k] = Math.max(LEGGI.soglia[1], LEGGI.rapportoVerticale * sigR[k]);
    z0[k] = tot > 0 ? sigZ[k] ** 2 / (Math.PI * GK * tot) : LEGGI.spessoreGas; nu[k] = tot > 0 ? Math.sqrt((2 * Math.PI * GK * tot) / z0[k]) : kappa[k];
  }
  const corotazione = forma.barra ? LEGGI.corotazione * forma.barra.raggio : 2.2 * forma.raggioDisco;
  c = { omega, kappa, sigR, sigZ, z0, nu, eta, corotazione, velocitaBracci: velocita(m, corotazione) / corotazione, verso: -(forma.bracci.verso || 1) };
  cinematiche.set(forma, c); return c;
}
// l'angolo della cresta di un braccio al raggio r (kpc) a t Ga da oggi: l'onda gira tutta insieme
export const faseBraccioAlTempo = (forma, r, t = 0) => { const c = cinematica(forma); return faseBraccio(forma, r) + c.verso * c.velocitaBracci * KMS * t; };
// IL MOTO DI UNA STELLA del catalogo. S: la stella ({ pos, eta, componente }); caso: la sorgente della stella («…/stella 12»).
// → { componente, stato(t): { pos: [x, y, z] (kpc), vel: [vx, vy, vz] (km/s) } a t Ga da oggi; a t = 0 la posizione, vista
//     dall'alto, è quella del catalogo }
export function motoStella(forma, S, caso) {
  const U1 = forma.unitaKpc, x0 = S.pos[0] * U1, y0 = S.pos[1] * U1, m = forma.modello;
  if (S.componente === 'sferoide') {
    const q = forma.schiacciata || 1, R = Math.hypot(x0, y0), u = 2 * caso('inclinazione') - 1, z = (q * R * u) / Math.sqrt(Math.max(1e-9, 1 - u * u)), p = [x0, y0, z], r3 = Math.hypot(x0, y0, z) || 1e-6; // (z = q·r·cosθ: l'ellissoide di nelloSferoide)
    const sig = velocita(m, Math.max(r3, 1e-3)) / Math.SQRT2, v = [sig * caso.normale('moto/x'), sig * caso.normale('moto/y'), sig * caso.normale('moto/z')];
    // il moto: un cerchio nel piano di posizione e velocità, con la parte della velocità che non punta al centro
    const vr = (v[0] * p[0] + v[1] * p[1] + v[2] * p[2]) / r3, vt = [v[0] - (vr * p[0]) / r3, v[1] - (vr * p[1]) / r3, v[2] - (vr * p[2]) / r3], vtn = Math.hypot(...vt) || 1e-9, w = (vtn / r3) * KMS;
    return { componente: 'sferoide', stato: (t = 0) => { const c = Math.cos(w * t), s = Math.sin(w * t); return { pos: [0, 1, 2].map((d) => p[d] * c + ((vt[d] * r3) / vtn) * s), vel: [0, 1, 2].map((d) => vt[d] * c - ((p[d] * vtn) / r3) * s) }; } };
  }
  const C = cinematica(forma), rc = forma.anelli.r, NR = rc.length, r0 = Math.max(Math.hypot(x0, y0), 1e-6), fi0 = Math.atan2(y0, x0); let k = 0; while (k < NR - 1 && forma.anelli.bordo[k + 1] < r0) k++;
  // quanto è calda: nata con la dispersione del gas, scaldata con l'età
  const eta = Math.max(0, S.eta / 1e9), caldo = Math.sqrt(eta / Math.max(C.eta[k], 1e-3)), sR = Math.max(LEGGI.soglia[1], C.sigR[k] * caldo), sZ = Math.max(LEGGI.soglia[1], C.sigZ[k] * caldo);
  const psi = 2 * Math.PI * caso('moto/fase'), zeta = 2 * Math.PI * caso('moto/altezza'), kap = C.kappa[k];
  const a = Math.min(0.15 * r0 /* (l'epiciclo vale per le oscillazioni piccole: chi è più caldo, al centro, è tagliato qui) */, (sR * Math.abs(caso.normale('moto/raggio'))) / kap), rg = r0 - a * Math.cos(psi), Om = velocita(m, rg) / rg, s = C.verso;
  // in altezza: con la velocità v₀ con cui attraversa il piano sale fin dove il potenziale dello strato, 2σ²·ln cosh(z/z₀), la
  // ferma: z_max = z₀·acosh(exp(v₀²/4σ²)); poi va su e giù (come un'onda semplice: la forma vera è un po' più squadrata)
  const fg = fi0 + s * ((2 * Om) / kap) * (a / rg) * Math.sin(psi), v0 = sZ * caso.normale('moto/z'), Zm = C.z0[k] * Math.acosh(Math.exp(Math.min(20, (v0 * v0) / (4 * C.sigZ[k] ** 2)))), Z = Math.sign(v0) * Zm, nuZ = Zm > 0 ? Math.abs(v0) / Zm : C.nu[k];
  return { componente: 'disco', guida: rg, epiciclo: a, altezza: Zm, stato: (t = 0) => {
    const e = kap * KMS * t + psi, v = nuZ * KMS * t + zeta, r = rg + a * Math.cos(e), fi = fg + s * (Om * KMS * t - ((2 * Om) / kap) * (a / rg) * Math.sin(e));
    const vr = -a * kap * Math.sin(e), vf = r * s * Om * (1 - 2 * (a / rg) * Math.cos(e)), c = Math.cos(fi), sn = Math.sin(fi);
    return { pos: [r * c, r * sn, Z * Math.sin(v)], vel: [vr * c - vf * sn, vr * sn + vf * c, Z * nuZ * Math.cos(v)] };
  } };
}
// LA FORMA CONTINUA, per la luce diffusa: quanta materia c'è in un punto (R, z in kpc, fi in radianti; t in Ga da oggi).
// → { stelle, gas, polvere } in M☉/kpc³. Il disco: la densità di superficie dell'anello, spessa sech²(z/z₀), con l'onda dei
// bracci; il gas e la polvere in uno strato più sottile (LEGGI.spessoreGas), con l'onda più marcata; la polvere è il gas
// per il rapporto polvere/gas misurato in funzione dei metalli (polvereDelGas, Rémy-Ruyer et al. 2014: LEGGI.polvereZ); lo
// sferoide: Hernquist. `colonne` dà gli stessi numeri anello per anello, per chi li vuole disegnare a strati.
// LA POLVERE PER OGNI M☉ DI GAS, data la Z del gas (in unità del Sole): Rémy-Ruyer et al. 2014 (LEGGI.polvereZ). Sopra la rottura
// la polvere va con i metalli (D/Z costante: i grani crescono nel gas denso quanto le supernove li distruggono); sotto, dove
// la crescita è lenta, cala molto più in fretta dei metalli
export function polvereDelGas(Z) {
  if (!(Z > 0)) return 0; const [a, b, aL, xt] = LEGGI.polvereZ, l = Math.log10(Z);
  return Math.pow(10, -(l > xt ? a - l : b - aL * l));
}
export function densitaGalassia(forma) {
  const C = cinematica(forma), A = forma.anelli, NR = ANELLI, B = forma.bracci, as = forma.scalaSferoide, Ms = forma.massaSferoide, q = forma.schiacciata || 1;
  const anello = (R) => { let k = 0; while (k < NR - 1 && A.bordo[k + 1] < R) k++; return k; }, sech2 = (x) => { const c = Math.cosh(Math.min(Math.abs(x), 30)); return 1 / (c * c); };
  const onda = (R, fi, t, ampiezza) => (ampiezza > 0 ? 1 + ampiezza * Math.cos(B.numero * (fi - faseBraccioAlTempo(forma, R, t))) : 1);
  const in3d = (R, z, fi, t = 0) => {
    // (lo sferoide schiacciato lungo la normale: le superfici di pari densità sono ellissoidi omotetici, m² = R² + (z/q)²,
    // e la densità di Hernquist in m divisa per q: la massa resta la stessa. Prima r3 = √(R² + z²) e il /q da solo: la forma
    // restava tonda e la massa disegnata cresceva di 1/q)
    const k = anello(R), fuori = R > A.bordo[NR] ? 0 : 1, hg = LEGGI.spessoreGas, r3 = Math.hypot(R, z / q) || 1e-6;
    const disco = (fuori * A.sigmaStelle[k] * sech2(z / C.z0[k])) / (2 * C.z0[k]) * onda(R, fi, t, B.contrasto), gas = (fuori * A.sigmaGas[k] * sech2(z / hg)) / (2 * hg) * onda(R, fi, t, B.contrastoGas);
    return { stelle: disco + (Ms > 0 ? (Ms * as) / (2 * Math.PI * q * r3 * (r3 + as) ** 3) : 0), gas, polvere: gas * polvereDelGas(A.Z[k]) };
  };
  return { in3d, colonne: { r: A.r, bordo: A.bordo, stelle: A.sigmaStelle, gas: A.sigmaGas, Z: A.Z, spessore: C.z0, spessoreGas: LEGGI.spessoreGas }, sferoide: { massa: Ms, scala: as, schiacciata: q },
    bracci: { numero: B.numero, contrasto: B.contrasto, contrastoGas: B.contrastoGas, fase: (R, t = 0) => faseBraccioAlTempo(forma, R, t), velocita: C.velocitaBracci, corotazione: C.corotazione, verso: C.verso }, barra: forma.barra };
}

// COM'ERA LA GALASSIA a t Ga dall'inizio (regola 6: la stessa storia, guardata prima): le stelle e il gas che aveva, quante
// ne nascevano, la sua luce e il suo colore (le generazioni nate fino ad allora, ognuna con l'età di allora)
export function galassiaAlTempo(forma, tGa) {
  const P = popolazione(), e = forma.interno, NR = ANELLI, S = forma.storia, x = stringi(tGa / DT, 0, e.nt), j = Math.min(e.nt, Math.floor(x)), u = x - j, tra = (A) => (j >= e.nt ? A[e.nt] : A[j] * (1 - u) + A[j + 1] * u);
  let luce = 0; const tinta = [0, 0, 0];
  for (let i = 1; i <= j; i++) { let m = e.est[i]; for (let k = 0; k < NR; k++) m += e.nati[i * NR + k]; const L = j - i; luce += m * P.luce[L]; for (let c = 0; c < 3; c++) tinta[c] += m * P.tinta[3 * L + c]; }
  return { esiste: tGa >= e.inizio, massaStelle: tra(S.stelle), massaGas: tra(S.gas), sfr: tra(S.sfr), massaAlone: tra(S.alone), luce /* L☉ */, tinta: luce > 0 ? a255(tinta) : [0, 0, 0] };
}

// ---------- IL CATALOGO: `quante` stelle come campione della galassia, più le ultime supernove (vedi l'intestazione)
// caso: la stessa sorgente della galassia; gli eventi di ogni stella stanno a «stella N/…», quelli delle ultime
// supernove a «supernova K/…»: cambiarne uno con un ramo non sposta le altre.
// → { stelle: [{ id, pos, massa, massaNascita, eta (anni), Z, stato, T, colore, raggioM, B, morta, peso, componente, venuta (se è nata in un compagno poi fuso) }],
//     sorgenti: [getto, resti, pulsar], buco, ritmoSN (all'anno), pesoCampione, stelleVere }
const MU0 = 4e-7 * Math.PI, POTENZA = 1e31; // le potenze delle sorgenti sono in unità di 10³¹ W (10³⁸ erg/s: un resto giovane)
export function stelleGalassia(forma, caso = sorgente('galassia'), { quante = 2500 } = {}) {
  const P = popolazione(), e = forma.interno, NR = ANELLI, nt = e.nt, U1 = forma.unitaKpc, B = forma.bracci;
  // (dove e quando è nata: il passo e l'anello — NR per le stelle venute con le fusioni —, non enumerabili: servono a
  // miscelaDiNascita, la catena degli elementi; chi elenca, stampa o confronta le stelle vede quelle di sempre)
  const nata = (st, passo, anello) => Object.defineProperty(st, 'nascita', { value: Object.freeze({ passo, anello }), enumerable: false });
  // le celle da cui si estrae: (passo, anello) delle stelle nate qui, più le stelle portate dalle fusioni, in massa
  const celle = new Float64Array(nt * (NR + 1) + 1); let tot = 0;
  for (let i = 1; i <= nt; i++) { for (let k = 0; k < NR; k++) { tot += e.nati[i * NR + k]; celle[(i - 1) * (NR + 1) + k + 1] = tot; } tot += e.est[i]; celle[(i - 1) * (NR + 1) + NR + 1] = tot; }
  const ora = new Float64Array(NR + 1); for (let k = 0; k < NR; k++) ora[k + 1] = ora[k] + e.nati[nt * NR + k]; // dove nascono le stelle adesso
  // un punto del disco nell'anello k (u, w: due eventi), per una stella di una certa età (Ga)
  const nelDisco = (k, u, w, eta) => {
    const r = Math.sqrt(e.bordo[k] ** 2 + u * (e.bordo[k + 1] ** 2 - e.bordo[k] ** 2)); let fi;
    if (forma.barra && r < forma.barra.raggio) { // dentro la barra le orbite sono allungate lungo di lei, a ogni età
      const A = forma.barra.forza; let x = w; for (let it = 0; it < 14; it++) x = w - (A * Math.sin(4 * Math.PI * x)) / (4 * Math.PI); fi = forma.barra.angolo + 2 * Math.PI * x;
    } else if (B.contrasto > 0) { // i bracci: una stella giovane è ancora dove è nata (nel gas denso), una vecchia segue l'onda
      const q = w * B.numero, braccio = Math.floor(q), f = q - braccio, cd = eta < B.vita(r) ? B.cdf : B.cdfVecchie; let c = 0; while (c < cd.length - 2 && cd[c + 1] < f) c++;
      fi = faseBraccio(forma, r) + (2 * Math.PI * (braccio + (c + (f - cd[c]) / (cd[c + 1] - cd[c])) / (cd.length - 1) - 0.5)) / B.numero;
    } else fi = 2 * Math.PI * w;
    return [r * Math.cos(fi), r * Math.sin(fi)];
  };
  const uMax = (U1 / (U1 + forma.scalaSferoide)) ** 2; // lo sferoide (Hernquist) è tagliato al bordo della mappa
  // (la stessa forma di densitaGalassia e di tre/universo.js: un ellissoide omotetico schiacciato lungo la normale, m² = R² + (z/q)²,
  // cioè un punto della sfera di Hernquist con z moltiplicata per q. Visto dall'alto è tondo; z la ricostruisce motoStella con lo
  // stesso numero, «inclinazione». Prima qui si schiacciava y, sul piano della mappa, e motoStella rifaceva z da una sfera)
  const nelloSferoide = (u, w, q) => { const s = Math.sqrt(u * uMax), r = (forma.scalaSferoide * s) / (1 - s), R = r * Math.sqrt(1 - (2 * q - 1) ** 2), fi = 2 * Math.PI * w; return [R * Math.cos(fi), R * Math.sin(fi)]; };
  // da quale generazione viene una Ia di oggi: in proporzione alla massa nata e al ritmo delle Ia a quel ritardo
  let pesiIa = null;
  const cellaIa = (u) => {
    if (!pesiIa) { pesiIa = new Float64Array(celle.length); let s = 0; for (let i = 1; i <= nt; i++) for (let k = 0; k <= NR; k++) { const m = k < NR ? e.nati[i * NR + k] : e.est[i]; if (m > 0) { const T = P.tab[k < NR ? e.iz[i * NR + k] : tabellaZ(e.estZ[i] / e.est[i] / ZSOLE)]; s += m * (T.cI[nt - i + 1] - T.cI[nt - i]); } pesiIa[(i - 1) * (NR + 1) + k + 1] = s; } }
    const x = u * pesiIa[pesiIa.length - 1]; let lo = 0, hi = pesiIa.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (pesiIa[m] <= x) lo = m; else hi = m; } return lo;
  };
  const campo0 = (u) => Math.pow(10, -5 + 3 * u); // il campo magnetico alla nascita (tesla): come in cosmo.js, da 10⁻⁵ a 10⁻²
  // ---- le ultime supernove: gli intervalli tra una e l'altra dal ritmo di oggi; chi era e dov'era
  const ritmo = forma.ritmoSN, resti = []; let tSN = 0;
  for (let k = 0; k < RESTI && ritmo.totale > 0; k++) {
    const c = caso.sotto(`supernova ${k + 1}`); tSN += -Math.log(1 - c('quando')) / ritmo.totale; if (tSN > 1e5) break;
    const ia = c('tipo') < ritmo.Ia / ritmo.totale; let pos, Z = 1, f = null, m0 = 0, vita = 0, B0 = 0, anello = 0;
    if (!ia && ora[NR] > 0) { // una stella massiccia nata da poco, dove il gas fa stelle adesso
      const x = c('dove') * ora[NR]; while (anello < NR - 1 && ora[anello + 1] < x) anello++;
      Z = Math.max(1e-4, e.Zn[nt * NR + anello]); const T = P.tab[tabellaZ(Z)]; m0 = massaNascita(T.uSN + (1 - T.uSN) * c('massa')); B0 = campo0(c('campo'));
      for (let it = 0; it < 40; it++) { f = ST.fine(m0, B0, { Z }); if (f.supernova) break; m0 *= 1.03; }
      vita = ST.stella(m0, { Z }).vita; pos = nelDisco(anello, c('raggio'), c('angolo'), vita / 1e9);
    } else { // una nana bianca di una generazione passata: scelta come le stelle del campione, pesata con i ritardi delle Ia
      const lo = cellaIa(c('dove')), i = Math.floor(lo / (NR + 1)) + 1, kk = lo % (NR + 1), eta = (nt - i + 0.5) * DT; anello = Math.min(kk, NR - 1);
      pos = kk < NR && i >= e.sferoideFino ? nelDisco(kk, c('raggio'), c('angolo'), eta) : nelloSferoide(c('raggio'), c('angolo'), c('inclinazione'));
    }
    resti.push({ k, t: tSN, ia, pos, Z, f, m0, vita, B0, anello, c });
  }
  const riservati = resti.filter((r) => !r.ia), campione = quante - riservati.length;
  const stelleVere = tot / P.massaMedia, peso = stelleVere / campione, stelle = [];
  for (let s = 0; s < quante; s++) {
    const rs = s >= quante - RESTI ? riservati.find((r) => r.k === s - (quante - RESTI)) : null;
    if (rs) { // la stella di una delle ultime supernove da collasso: una stella vera, non un campione
      const f = rs.f; stelle.push(nata({ id: s, pos: [rs.pos[0] / U1, rs.pos[1] / U1], massa: f.massa, massaNascita: rs.m0, eta: rs.vita + rs.t, T: 0, colore: f.tipo === 'buco nero' ? [20, 20, 30] : [150, 200, 255], stato: f.tipo, raggioM: f.raggio, B: f.B, morta: rs.t, Z: rs.Z, peso: 1, componente: 'disco', supernova: rs.k + 1 }, nt, rs.anello));
      continue;
    }
    const c = caso.sotto(`stella ${s}`);
    // quando e dove è nata: una cella, in proporzione alla massa nata lì
    let x = c('nascita') * tot, lo = 0, hi = celle.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (celle[m] <= x) lo = m; else hi = m; }
    const i = Math.floor(lo / (NR + 1)) + 1, k = lo % (NR + 1), da = i === 1 ? e.inizio : (i - 1) * DT, nascita = da + c('quando') * (i * DT - da), eta = (T0 - nascita) * 1e9;
    const esterna = k === NR, Z = Math.max(1e-4, esterna ? e.estZ[i] / e.est[i] / ZSOLE : e.Zn[i * NR + k]), componente = esterna || i < e.sferoideFino ? 'sferoide' : 'disco';
    const p = componente === 'disco' ? nelDisco(k, c('raggio'), c('angolo'), eta / 1e9) : nelloSferoide(c('raggio'), c('angolo'), c('inclinazione')), pos = [p[0] / U1, p[1] / U1];
    // chi è: la massa dalla distribuzione misurata, il campo; poi vive secondo stelle.js fino a oggi
    const m0 = massaNascita(c('massa')), B0 = campo0(c('campo')), vita = ST.stella(m0, { Z }).vita;
    if (eta < vita) {
      const adesso = ST.stella(m0, { Z, eta }), gigante = eta > 0.9 * vita, T = gigante ? Math.min(adesso.T, 4200) : adesso.T;
      stelle.push(nata({ id: s, pos, massa: m0, T, colore: colorePerTemperatura(T), stato: gigante ? 'gigante rossa' : 'in vita', eta, B: B0, Z, peso, componente, ...(esterna ? { venuta: true } : {}) }, i, k));
    } else {
      const f = ST.fine(m0, B0, { Z }), morta = eta - vita; let T = 0, colore = f.tipo === 'buco nero' ? [20, 20, 30] : [150, 200, 255];
      if (f.tipo === 'nana bianca') { // si raffredda irradiando il calore dei suoi ioni (Mestel 1952): L ∝ M·t^−7/5
        const L = LSOLE * Math.pow((8.8e6 * Math.pow(f.massa, 5 / 7)) / Math.max(morta, 1e4), 7 / 5); T = Math.min(1.5e5, Math.pow(L / (PI4 * f.raggio ** 2 * COSTANTI.sigma), 0.25)); colore = [225, 230, 255];
      }
      stelle.push(nata({ id: s, pos, massa: f.massa, massaNascita: m0, eta, T, colore, stato: f.tipo, raggioM: f.raggio, B: f.B, morta, Z, peso, componente, ...(esterna ? { venuta: true } : {}) }, i, k));
    }
  }
  // ---- le sorgenti dei raggi cosmici: il getto del buco nero, i resti delle ultime supernove, le loro pulsar
  const sorgenti = [{ tipo: 'getto', nome: 'il getto del buco nero', pos: [0, 0], potenza: forma.buco.potenzaW / POTENZA, potenzaW: forma.buco.potenzaW, angolo: forma.perG.getto }];
  for (const r of resti) {
    // il resto: prima si espande libero (v = √(2E/M)), poi come un'onda d'urto di Sedov-Taylor nel gas di quell'anello
    const E = LEGGI.energiaSN, espulsa = (r.ia ? P.MCH : r.m0 - r.f.massa) * MSOLE, n = Math.max(1e3, (forma.anelli.sigmaGas[r.anello] * MSOLE) / KPC ** 2 / (2 * LEGGI.spessoreGas * KPC) / (1.4 * COSTANTI.mp)), ts = r.t * ANNO;
    const raggio = Math.min(Math.sqrt((2 * E) / espulsa) * ts, 1.15 * Math.pow((E * ts * ts) / (1.4 * COSTANTI.mp * n), 0.2)), tau = LEGGI.sedov[0] * Math.pow(n / 1e6, LEGGI.sedov[1]);
    const potenzaW = ((LEGGI.cosmici * E) / (tau * ANNO)) * Math.exp(-r.t / tau), pos = [r.pos[0] / U1, r.pos[1] / U1];
    sorgenti.push({ tipo: 'supernova', nome: `il resto della supernova ${r.k + 1}`, pos, r: raggio / KPC / U1, raggioM: raggio, potenza: potenzaW / POTENZA, potenzaW, eta: r.t, resto: r.ia ? 'niente (è esplosa una nana bianca)' : r.f.tipo, stella: r.ia ? null : quante - RESTI + r.k });
    if (!r.ia && r.f.tipo === 'stella di neutroni') {
      // la pulsar: un magnete che gira e si frena irradiando (dipolo: L = 2π·B²R⁶Ω⁴/(3μ₀c³)); la supernova le ha dato una spinta
      const periodo = Math.max(0.01, LEGGI.pulsar[0] + LEGGI.pulsar[1] * r.c.normale('pulsar/periodo')), Om = (2 * Math.PI) / periodo, Lp = ((2 * Math.PI) / (3 * MU0 * COSTANTI.c ** 3)) * r.f.B ** 2 * r.f.raggio ** 6 * Om ** 4;
      const corsa = (LEGGI.pulsar[2] * 1e3 * Math.sqrt(-2 * Math.log(1 - r.c('pulsar/spinta'))) * ts) / KPC, ang = 2 * Math.PI * r.c('pulsar/verso');
      sorgenti.push({ tipo: 'pulsar', nome: `la ${r.f.B > 1e10 ? 'magnetar' : 'pulsar'} nel resto ${r.k + 1}`, pos: [pos[0] + (corsa * Math.cos(ang)) / U1, pos[1] + (corsa * Math.sin(ang)) / U1], potenza: Lp / POTENZA, potenzaW: Lp, B: r.f.B, periodo, eta: r.t });
    }
  }
  return { stelle, sorgenti, buco: forma.buco, ritmoSN: ritmo.totale, pesoCampione: peso, stelleVere };
}

// (per le prove e per chi vuole guardare dentro)
export const COSMOLOGIA = U, SIGMA_CAMPO = (toroM = 3.7e25, onde = 9) => sigmaCampo(toroM, onde);
export const dentro = { U, T0, DT, KPC, GA, GK, KMS, ZSOLE, raggioViriale, concentrazione, velocita, fuga2, C_PRESS, xyzNero, occhioCIE, aLineare, nelTriangolo, gammaSRGB, FREEMAN, lambda, storiaAlone, evolvi, tempoIncontro, maree, campana, resaCollasso };
