"""Banco sperimentale: lavorare sul codice dell'immagine, non sulla composizione.
1. databending JPEG (si corrompono i byte dopo l'intestazione)
2. pixel sorting dentro una maschera (soglia di luce)
3. datamosh simulato: il movimento di un reel trascina i pixel della tavola precedente
Uso: python3 banco.py <cartella_out> <tavola1> <tavola2> ... [--reel video.mp4]
"""
import io, sys, random
import numpy as np
from PIL import Image
import cv2

def carica(p, lato=900):
    im = Image.open(p).convert('RGB'); im.thumbnail((lato, lato)); return im

# 1. databending ----------------------------------------------------------------
def databend(im, seme, forza=12, modo='byte'):
    r = random.Random(seme)
    b = io.BytesIO(); im.save(b, 'JPEG', quality=88); d = bytearray(b.getvalue())
    sos = d.find(b'\xff\xda'); start = sos + 20
    for _ in range(40):  # alcuni guasti rendono il file illeggibile: si riprova
        x = bytearray(d)
        for _ in range(forza):
            i = r.randrange(start, len(x) - 4)
            if modo == 'byte': x[i] = r.randrange(0, 255) if x[i] != 0xff else x[i]
            elif modo == 'blocco':  # un tratto di dati ripetuto più avanti: righe che si ripetono
                n = r.randrange(16, 400); j = r.randrange(start, len(x) - n - 4); x[j:j + n] = x[i:i + n][:n]
            elif modo == 'eco':  # come un delay audio sui byte
                n = r.randrange(200, 2000); k = r.randrange(50, 600)
                for t in range(i, min(len(x) - 4, i + n)):
                    if x[t] != 0xff and x[t - k] != 0xff: x[t] = (x[t] + x[t - k]) // 2
        try:
            out = Image.open(io.BytesIO(bytes(x))); out.load(); return out.convert('RGB')
        except Exception:
            continue
    return im

# 2. pixel sorting ---------------------------------------------------------------
def pixelsort(im, basso=0.25, alto=0.8, verticale=True, chiave='luce'):
    a = np.asarray(im).astype(np.float32)
    if verticale: a = a.transpose(1, 0, 2)
    L = (0.2126 * a[..., 0] + 0.7152 * a[..., 1] + 0.0722 * a[..., 2]) / 255
    hsv = cv2.cvtColor(a.astype(np.uint8), cv2.COLOR_RGB2HSV)
    K = L if chiave == 'luce' else hsv[..., 0].astype(np.float32)
    M = (L > basso) & (L < alto)
    out = a.copy()
    for y in range(a.shape[0]):
        m = M[y]; x = 0; n = len(m)
        while x < n:
            if not m[x]: x += 1; continue
            e = x
            while e < n and m[e]: e += 1
            if e - x > 4:
                idx = np.argsort(K[y, x:e]); out[y, x:e] = a[y, x:e][idx]
            x = e
    if verticale: out = out.transpose(1, 0, 2)
    return Image.fromarray(out.astype(np.uint8))

# 3. datamosh simulato ------------------------------------------------------------
def datamosh(A, frames, guadagno=1.0):
    """A: immagine di partenza (la tavola che non se ne va); frames: fotogrammi da cui prendere il movimento"""
    h, w = frames[0].shape[:2]
    cur = cv2.resize(np.asarray(A), (w, h)).astype(np.float32)
    out = []
    g0 = cv2.cvtColor(frames[0], cv2.COLOR_RGB2GRAY)
    gx, gy = np.meshgrid(np.arange(w, dtype=np.float32), np.arange(h, dtype=np.float32))
    for f in frames[1:]:
        g1 = cv2.cvtColor(f, cv2.COLOR_RGB2GRAY)
        fl = cv2.calcOpticalFlowFarneback(g1, g0, None, 0.5, 3, 25, 3, 7, 1.5, 0)  # all'indietro: da dove arriva ogni pixel
        cur = cv2.remap(cur, gx + fl[..., 0] * guadagno, gy + fl[..., 1] * guadagno, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
        out.append(cur.clip(0, 255).astype(np.uint8)); g0 = g1
    return out

def leggi_video(p, da=0, n=90, lato=540):
    cap = cv2.VideoCapture(p); cap.set(cv2.CAP_PROP_POS_FRAMES, da); fr = []
    while len(fr) < n:
        ok, f = cap.read()
        if not ok: break
        f = cv2.cvtColor(f, cv2.COLOR_BGR2RGB); k = lato / max(f.shape[:2]); fr.append(cv2.resize(f, None, fx=k, fy=k))
    return fr

if __name__ == '__main__':
    out = sys.argv[1]; args = sys.argv[2:]
    reel = None
    if '--reel' in args: i = args.index('--reel'); reel = args[i + 1]; args = args[:i] + args[i + 2:]
    tav = [carica(p) for p in args]
    righe = []
    for k, t in enumerate(tav):
        v = [t, databend(t, k * 7 + 1, 10, 'byte'), databend(t, k * 7 + 2, 6, 'blocco'), databend(t, k * 7 + 3, 3, 'eco'),
             pixelsort(t, 0.3, 0.85, True, 'luce'), pixelsort(t, 0.15, 0.6, False, 'tinta')]
        righe.append([x.resize((300, 375)) for x in v])
    W = Image.new('RGB', (300 * 6, 375 * len(righe)), 'black')
    for y, r in enumerate(righe):
        for x, im in enumerate(r): W.paste(im, (x * 300, y * 375))
    W.save(f'{out}/banco.png')
    if reel and tav:
        fr = leggi_video(reel, 60, 110)
        mosh = datamosh(tav[0], fr, 1.0)
        h, w = mosh[0].shape[:2]
        vw = cv2.VideoWriter(f'{out}/datamosh-raw.mp4', cv2.VideoWriter_fourcc(*'mp4v'), 30, (w, h))
        for f in [cv2.resize(np.asarray(tav[0]), (w, h))] * 20 + mosh: vw.write(cv2.cvtColor(f, cv2.COLOR_RGB2BGR))
        vw.release()
    print('fatto')
