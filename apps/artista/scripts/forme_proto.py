import json, base64, numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage
IT = {'tree':'albero','house':'casa','hand':'mano','bridge':'ponte','mountain':'montagna','river':'fiume','door':'porta','eye':'occhio','bird':'uccello','fish':'pesce','chair':'sedia','stairs':'scala','cloud':'nuvola','flower':'fiore','leaf':'foglia','moon':'luna','sun':'sole','star':'stella','face':'volto','foot':'piede','ear':'orecchio','mouth':'bocca','key':'chiave','ladder':'scala a pioli','light bulb':'lampadina','lightning':'fulmine','rain':'pioggia','snowflake':'fiocco di neve','ocean':'mare','castle':'castello','church':'chiesa','windmill':'mulino','lighthouse':'faro','tent':'tenda','cactus':'cactus','mushroom':'fungo','palm tree':'palma','bush':'cespuglio','grass':'erba','snake':'serpente','butterfly':'farfalla','spider':'ragno','octopus':'polpo','horse':'cavallo','cat':'gatto','dog':'cane','sailboat':'barca','bicycle':'bicicletta','umbrella':'ombrello','book':'libro','clock':'orologio','cup':'tazza','knife':'coltello','wheel':'ruota','hourglass':'clessidra','compass':'bussola','fence':'recinto','table':'tavolo','bed':'letto','lantern':'lanterna','candle':'candela','anvil':'incudine','hammer':'martello','feather':'piuma','skull':'teschio','brain':'cervello','tooth':'dente','hurricane':'uragano','tornado':'tromba d\'aria','campfire':'fuoco','fireplace':'camino','garden':'giardino','pond':'stagno','beach':'spiaggia','house plant':'pianta','streetlight':'lampione','bench':'panchina','envelope':'busta','camera':'macchina fotografica','television':'televisore','telephone':'telefono','map':'mappa','circle':'cerchio','square':'quadrato','triangle':'triangolo','hexagon':'esagono','zigzag':'zigzag','line':'linea','squiggle':'scarabocchio','octagon':'ottagono'}
N=64
def raster(d, size=N, w=2):
    im=Image.new('L',(size,size),0); g=ImageDraw.Draw(im); k=(size-1)/255
    for s in d:
        pts=list(zip([x*k for x in s[0]],[y*k for y in s[1]]))
        if len(pts)==1: g.point(pts,255)
        else: g.line(pts,255,w)
    return np.asarray(im,dtype=np.float32)/255
def norm(d):
    xs=[x for s in d for x in s[0]]; ys=[y for s in d for y in s[1]]
    x0,x1,y0,y1=min(xs),max(xs),min(ys),max(ys); k=235/max(1,x1-x0,y1-y0)
    ox=(255-(x1-x0)*k)/2; oy=(255-(y1-y0)*k)/2
    return [[[int(round((x-x0)*k+ox)) for x in s[0]],[int(round((y-y0)*k+oy)) for y in s[1]]] for s in d]
def pieno(r):
    m=ndimage.binary_closing(r>0.3, iterations=2)
    return ndimage.binary_fill_holes(m).astype(np.float32)
d=json.load(open('quickdraw.json'))['forme']
out={}
for en,ds in d.items():
    if not ds: continue
    ds=[norm(x) for x in ds]
    R=np.stack([raster(x) for x in ds]); P=np.stack([pieno(r) for r in R])
    mR=R.mean(0); mP=P.mean(0)
    # i più tipici: i medoidi (più simili a tutti gli altri per sagoma), tra i disegni non troppo poveri di tratto
    inch=np.array([r.sum() for r in R]); ok=inch>=np.percentile(inch,40)
    F=P.reshape(len(ds),-1)>0.5
    inter=F.astype(np.float32)@F.T.astype(np.float32); area=F.sum(1)
    iou=inter/np.maximum(1,area[:,None]+area[None,:]-inter)
    sc=iou.mean(1)*ok
    tip=[ds[i] for i in np.argsort(sc)[::-1][:12]]
    # dove si comincia: il baricentro del primo tratto
    primi=[[float(np.mean(x[0][0])),float(np.mean(x[0][1]))] for x in ds]
    p0=np.mean(primi,0)/255
    q=lambda a: base64.b64encode((np.clip(a/max(a.max(),1e-6),0,1)*255).astype(np.uint8).tobytes()).decode()
    ys,xs=np.nonzero(mP>0.3)
    out[IT.get(en,en)]={'en':en,'n':N,'mappa':q(mR),'pieno':q(mP),'tipici':[[[list(map(int,s[0])),list(map(int,s[1]))] for s in x] for x in tip],'inizio':[round(float(p0[0]),3),round(float(p0[1]),3)],
      'proporzione': round(float((xs.max()-xs.min()+1)/(ys.max()-ys.min()+1)),3) if len(xs) else 1}
json.dump({'fonte':'Quick, Draw! Dataset — Google, CC BY 4.0 (https://github.com/googlecreativelab/quickdraw-dataset)','forme':out}, open('forme.json','w'), separators=(',',':'))
import os; print(len(out), os.path.getsize('forme.json'))
# foglio di prova: mappa e pieno per 24 cose
names=list(out)[:90]
S=Image.new('L',(10*130,9*68*1),255)
for i,k in enumerate(names):
    a=np.frombuffer(base64.b64decode(out[k]['mappa']),np.uint8).reshape(N,N); b=np.frombuffer(base64.b64decode(out[k]['pieno']),np.uint8).reshape(N,N)
    x=(i%10)*130; y=(i//10)*68
    S.paste(Image.fromarray(255-a),(x,y)); S.paste(Image.fromarray(255-b//2),(x+64,y))
S.save('/tmp/fr/prototipi.png')
