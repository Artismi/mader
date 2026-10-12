#!/usr/bin/env python3
"""
Importa i pack di asset (zip) nella libreria dello Studio.

Uso:  python3 scripts/import-packs.py <cartella-dei-zip> [zip ...]
Senza elenco di zip prende tutti i .zip della cartella indicati in PACKS.

Scrive in public/library/:
  <pack>/<file>.webp        versione per il canvas (lato lungo max 2400px)
  <pack>/t/<file>.webp      miniatura (lato lungo 360px)
  manifest.json             elenco di pack e asset letto dallo Studio
I caratteri vanno in public/fonts/pack/ (versionati).
Le immagini sono rigenerabili, per questo public/library/ è in .gitignore
(tranne manifest.json).
"""
import sys, os, io, json, re, zipfile, hashlib, time
from concurrent.futures import ProcessPoolExecutor
from PIL import Image, ImageOps

Image.MAX_IMAGE_PIXELS = None
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'public', 'library')
MAX, THUMB = 2400, 360
IMG = ('.png', '.jpg', '.jpeg', '.webp')
FONT = ('.otf', '.ttf')

# Pack noti: nome del file/cartella sorgente -> (id, nome nello Studio, categoria, fusione)
# categoria: texture | luce | elementi | pattern | foto ; fusione: modalità di fusione proposta
# None = pack da saltare (anteprime di PSD/azioni, non asset)
PACKS = {
  '190 free assets-20261011T212949Z-1-001.zip': ('tech-circuiti', 'Tech e circuiti', 'foto', None),
  'Abstract Logo Elemetns Shapes Pack V.02 Free Pack.zip': ('abstract-logo-shapes', 'Abstract Logo Shapes', 'elementi', None),
  'Chromatic Type.zip': None, 'DEMO PACK.zip': None, 'Free Pack (1).zip': None, 'Free Pack (25).zip': None,
  'DEMO Y2k PACK.zip': ('y2k-forme', 'Y2K forme (foglio)', 'elementi', None),
  'Egypt Textures - Free Pack .zip': ('egypt', 'Egypt Textures', 'texture', 'multiply'),
  'FREE ANIME PNG PACK.zip': ('anime', 'Anime PNG', 'elementi', None),
  'Free Pack (10).zip': ('plastica-nera', 'Plastica nera', 'luce', 'screen'),
  'Free Pack (11).zip': ('fulmini', 'Fulmini', 'luce', 'screen'),
  'Free Pack (15).zip': ('graffi', 'Graffi e usura', 'luce', 'screen'),
  'Free Pack (16).zip': ('fotocopia', 'Fotocopia e light leak', 'luce', 'screen'),
  'Free Pack (17).zip': ('grunge-ruggine', 'Grunge e ruggine', 'texture', 'multiply'),
  'Free Pack (18).zip': ('grana-colorata', 'Grana colorata', 'texture', 'multiply'),
  'Free Pack (2).zip': ('silhouette', 'Silhouette (foglio)', 'elementi', None),
  'Free Pack (21).zip': ('macchie', 'Macchie e colature', 'texture', 'multiply'),
  'Free Pack (22).zip': ('vetro-rotto', 'Vetro rotto', 'luce', 'screen'),
  'Free Pack (23).zip': ('carta-strappata', 'Carta strappata', 'luce', 'screen'),
  'Free Pack (24).zip': ('retini-fini', 'Retini fini', 'texture', 'overlay'),
  'Free Pack (3).zip': ('halftone', 'Halftone', 'texture', 'multiply'),
  'Free Pack (5).zip': ('y2k-simboli', 'Y2K simboli (foglio)', 'elementi', None),
  'Free Pack (6).zip': ('collage', 'Ritagli collage (foglio)', 'elementi', None),
  'Free Pack (7).zip': ('polvere', 'Polvere', 'luce', 'screen'),
  'Free Pack (8).zip': ('carte', 'Carte', 'texture', 'multiply'),
  'Free Pack (9).zip': ('strappi-fumo', 'Strappi e fumo', 'luce', 'screen'),
  'Logo Elements Hand-Drawn V.03 - Sample Pack.zip': ('logo-hand-drawn', 'Logo Elements Hand-Drawn', 'elementi', None),
  'Paper Textures Pack - Free Pack.zip': ('paper-print', 'Paper Print Textures', 'texture', 'multiply'),
  'Print Scanned Textures - Free Pack.zip': ('print-scanned', 'Print Scanned Textures', 'texture', 'multiply'),
  'Printed Paper Textures Kit - (PNG Version) Sample Pack.zip': ('printed-paper', 'Printed Paper Textures', 'texture', 'multiply'),
  'first png drop.zip': ('first-drop', 'First PNG Drop', 'elementi', None),
  'free assets pack.zip': ('free-assets', 'Free Assets Pack', 'elementi', None),
  'Patterns _ Textures – Century Library_files': ('century', 'Century Library', 'pattern', None),
}
CATS = [
  dict(id='texture', label='Texture'), dict(id='luce', label='Luci ed effetti'),
  dict(id='elementi', label='Elementi'), dict(id='pattern', label='Pattern'), dict(id='foto', label='Foto'),
]

SKIP = re.compile(r'(^|/)(\._|__MACOSX)|read ?me|guide|license', re.I)

def slug(s):
    s = re.sub(r'\[.*?\]|\(png version\)|free pack|sample pack|- *$', ' ', s, flags=re.I)
    s = re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')
    return s or 'pack'

def has_alpha(im):
    if im.mode not in ('RGBA', 'LA', 'PA') and not (im.mode == 'P' and 'transparency' in im.info):
        return False
    a = im.convert('RGBA').getchannel('A').resize((64, 64))
    return min(a.getdata()) < 250

def process(job):
    src, member, pack, name = job
    dst = os.path.join(OUT, pack, name + '.webp')
    th = os.path.join(OUT, pack, 't', name + '.webp')
    try:
        if os.path.exists(dst) and os.path.exists(th):
            b = Image.open(dst)
            return dict(pack=pack, name=name, w=b.width, h=b.height, alpha=b.mode == 'RGBA' and has_alpha(b), member=member)
        data = None
        if member:
            with zipfile.ZipFile(src) as z: data = z.read(member)
        im = Image.open(io.BytesIO(data) if data else src)
        if im.format == 'JPEG':
            im.draft('RGB', (MAX, MAX))
        im = ImageOps.exif_transpose(im)
        alpha = has_alpha(im)
        im = im.convert('RGBA' if alpha else 'RGB')
        w, h = im.size
        os.makedirs(os.path.dirname(th), exist_ok=True)
        if not os.path.exists(dst):
            big = im.copy(); big.thumbnail((MAX, MAX), Image.LANCZOS)
            big.save(dst, 'WEBP', quality=86, method=4)
        else:
            big = Image.open(dst)
        t = im.copy(); t.thumbnail((THUMB, THUMB), Image.LANCZOS)
        t.save(th, 'WEBP', quality=78)
        bw, bh = big.size
        return dict(pack=pack, name=name, w=bw, h=bh, ow=w, oh=h, alpha=alpha, member=member)
    except Exception as e:
        return dict(pack=pack, name=name, error=str(e)[:200], member=member)

def main():
    folder = sys.argv[1]
    zips = sys.argv[2:] or sorted(f for f in os.listdir(folder) if f.lower().endswith('.zip'))
    FONTS = os.path.join(ROOT, 'public', 'fonts', 'pack'); os.makedirs(FONTS, exist_ok=True)
    jobs, fonts, seen, packs = [], [], set(), {}
    for zf in zips:
        path = os.path.join(folder, zf)
        if PACKS.get(zf, 0) is None: continue
        pack = PACKS[zf][0] if zf in PACKS else slug(os.path.splitext(zf)[0])
        base = pack; i = 2
        while pack in packs and packs[pack] != zf: pack = f'{base}-{i}'; i += 1
        packs[pack] = zf
        with zipfile.ZipFile(path) as z:
            for info in z.infolist():
                fn = info.filename
                if info.is_dir() or SKIP.search(fn): continue
                ext = os.path.splitext(fn)[1].lower()
                key = (info.CRC, info.file_size)
                if key in seen: continue
                if ext in FONT:
                    seen.add(key)
                    out = os.path.join(FONTS, os.path.basename(fn))
                    with open(out, 'wb') as f: f.write(z.read(info))
                    fonts.append(dict(file=os.path.basename(fn), family=os.path.splitext(os.path.basename(fn))[0], pack=pack))
                elif ext in IMG:
                    seen.add(key)
                    rel = os.path.splitext(fn.split('/', 1)[-1])[0]
                    name = slug(rel) if rel else 'img'
                    jobs.append((path, fn, pack, name))
    # cartelle di pagine salvate (es. "…_files") passate come argomenti extra con prefisso dir:
    for d in os.environ.get('EXTRA_DIRS', '').split(';'):
        if not d: continue
        b = os.path.basename(d)
        pack = PACKS[b][0] if PACKS.get(b) else slug(b.replace('_files', ''))
        packs[pack] = os.path.basename(d)
        for f in sorted(os.listdir(d)):
            p = os.path.join(d, f)
            if f.lower().endswith(IMG) and os.path.getsize(p) > 40000:
                jobs.append((p, None, pack, slug(os.path.splitext(f)[0])))
    # nomi unici per pack
    used = set(); uj = []
    for src, m, pack, name in jobs:
        n, i = name, 2
        while (pack, n) in used: n = f'{name}-{i}'; i += 1
        used.add((pack, n)); uj.append((src, m, pack, n))
    print(f'{len(uj)} immagini, {len(fonts)} font da {len(packs)} pack', flush=True)
    res = []
    t0 = time.time()
    with ProcessPoolExecutor(int(os.environ.get('JOBS', '2'))) as ex:
        for k, r in enumerate(ex.map(process, uj, chunksize=1)):
            res.append(r)
            if k % 20 == 0: print(f'  {k}/{len(uj)}  {time.time()-t0:.0f}s', flush=True)
    json.dump(dict(packs=packs, items=res, fonts=fonts), open(os.path.join(OUT, '_raw.json'), 'w'), indent=1)
    print('fatto', sum('error' in r for r in res), 'errori', flush=True)
    manifest(packs, res, fonts)

def ahash(path):
    im = Image.open(path).convert('RGBA')
    bg = Image.new('RGBA', im.size, (255, 255, 255, 255)); bg.alpha_composite(im)
    px = list(bg.convert('L').resize((16, 16)).tobytes()); m = sum(px) / len(px)
    return int(''.join('1' if p > m else '0' for p in px), 2)

def manifest(packs, res, fonts):
    seen, items, counts = [], [], {}
    for r in res:
        if 'error' in r: continue
        h = ahash(os.path.join(OUT, r['pack'], 't', r['name'] + '.webp'))
        # doppione: stessa immagine risalvata in un altro pack
        if any(p != r['pack'] and bin(h ^ x).count('1') <= 8 for p, x in seen): continue
        seen.append((r['pack'], h))
        base = f"/library/{r['pack']}/"
        items.append(dict(id=f"{r['pack']}/{r['name']}", pack=r['pack'], name=r['name'].replace('-', ' '),
                          src=base + r['name'] + '.webp', thumb=base + 't/' + r['name'] + '.webp',
                          w=r['w'], h=r['h'], alpha=bool(r['alpha'])))
        counts[r['pack']] = counts.get(r['pack'], 0) + 1
    plist = []
    for src, pid in ((v, k) for k, v in packs.items()):
        if pid not in counts: continue
        c = PACKS.get(src)
        alpha = sum(i['alpha'] for i in items if i['pack'] == pid) > counts[pid] / 2
        name, cat, blend = (c[1], c[2], c[3]) if c else (src, 'elementi' if alpha else 'texture', None if alpha else 'multiply')
        plist.append(dict(id=pid, name=name, cat=cat, blend=blend, count=counts[pid], source=src))
    plist.sort(key=lambda p: ([c['id'] for c in CATS].index(p['cat']), p['name'].lower()))
    json.dump(dict(cats=CATS, packs=plist, items=items), open(os.path.join(OUT, 'manifest.json'), 'w'), ensure_ascii=False)
    print(f'manifest: {len(plist)} pack, {len(items)} asset', flush=True)

if __name__ == '__main__':
    if len(sys.argv) < 2: sys.exit(__doc__)
    main()
