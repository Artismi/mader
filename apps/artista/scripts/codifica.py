"""
La codifica come compressione: la sagoma di una cosa (dal disegno tipico, con i suoi vuoti interni: occhi, finestre)
riprodotta col minor numero di primitive (ellisse, rettangolo, triangolo; piene o in negativo), scelte una alla volta
dove riducono di più l'errore. Ne esce il segno essenziale della cosa, come un pittogramma: pochi pezzi, puliti.
"""
import json, numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage
N=96
rng=np.random.default_rng(5)
def maschera(dr):
    im=Image.new('L',(N,N),0); g=ImageDraw.Draw(im); k=(N-1)/255
    for s in dr:
        pts=[(x*k,y*k) for x,y in zip(s[0],s[1])]
        if len(pts)>1: g.line(pts,255,3)
    m=np.asarray(im)>0
    fuori=ndimage.binary_fill_holes(m)
    pieno=fuori.copy()
    # vuoti interni: tratti chiusi piccoli dentro la sagoma (occhi, finestre)
    for s in dr:
        x=np.array(s[0])*k; y=np.array(s[1])*k
        if len(x)>4 and np.hypot(x[0]-x[-1],y[0]-y[-1])<6 and (x.max()-x.min())*(y.max()-y.min())<0.12*N*N:
            im2=Image.new('L',(N,N),0); ImageDraw.Draw(im2).polygon(list(zip(x,y)),255)
            v=np.asarray(im2)>0; v=ndimage.binary_erosion(v,iterations=1)
            pieno[v]=False
    return pieno
yy,xx=np.mgrid[0:N,0:N]
def prim(p):
    t,cx,cy,a,b,rot=p
    c,s=np.cos(rot),np.sin(rot); X=(xx-cx)*c+(yy-cy)*s; Y=-(xx-cx)*s+(yy-cy)*c
    if t==0: return (X/a)**2+(Y/b)**2<=1
    if t==1: return (abs(X)<=a)&(abs(Y)<=b)
    return (Y<=b)&(Y>=-b)&(abs(X)<=a*(b-Y)/(2*b))  # triangolo con la punta in alto
def fit(target,K=7):
    cur=np.zeros_like(target); P=[]
    err=lambda c:(c!=target).sum()
    for _ in range(K):
        best=None;be=err(cur)
        for t in (0,1,2):
            for neg in (False,True):
                for _ in range(120):
                    p=[t,rng.uniform(5,N-5),rng.uniform(5,N-5),rng.uniform(3,N/2),rng.uniform(3,N/2),rng.choice([0,0,0,np.pi/4,np.pi/2,rng.uniform(0,np.pi)])]
                    m=prim(p); c=(cur&~m) if neg else (cur|m); e=err(c)
                    if e<be: be,best=e,(p,neg)
        if not best: break
        p,neg=best
        # rifinitura locale
        for _ in range(150):
            q=list(p); i=rng.integers(1,6); q[i]=q[i]+rng.normal(0,[0,3,3,2,2,0.15][i])
            if q[3]<2 or q[4]<2: continue
            m=prim(q); c=(cur&~m) if neg else (cur|m); e=err(c)
            if e<be: be,p=e,q
        m=prim(p); cur=(cur&~m) if neg else (cur|m); P.append(dict(t=['ellisse','rettangolo','triangolo'][p[0]],cx=round(p[1]/N,3),cy=round(p[2]/N,3),a=round(p[3]/N,3),b=round(p[4]/N,3),rot=round(float(p[5]),3),neg=bool(neg)))
        if err(cur)<target.sum()*0.08: break
    return P,cur
F=json.load(open('forme.json'))['forme']
cose=['albero','mano','pesce','casa','uccello','farfalla','teschio','fungo','cavallo','faro','chiave','occhio','sedia','fiore','luna','montagna','ombrello','clessidra']
out={}; S=Image.new('RGB',(len(cose)*100,3*100),(240,234,222)); g=ImageDraw.Draw(S)
for i,c in enumerate(cose):
    res=[]
    for k in range(3):
        t=maschera(F[c]['tipici'][k]); P,cur=fit(t)
        res.append(P)
        im=Image.fromarray(np.where(cur,30,240).astype(np.uint8)).convert('RGB'); S.paste(im,(i*100+2,k*100+2))
    out[c]=res
json.dump(out,open('codifiche.json','w'),separators=(',',':'))
S.save('/tmp/fr/codifiche.png')
