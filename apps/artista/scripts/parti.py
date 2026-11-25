"""
Le parti delle cose, imparate dagli schizzi: ogni tratto di uno schizzo è (quasi sempre) una parte.
Raggruppa i tratti di tutti gli schizzi di una cosa per dove stanno, quanto sono grandi, che forma hanno
(chiusi o aperti, dritti o curvi, orientamento), e ne ricava i tipi di parte: frequenza, posizione e misura con la loro
variazione, e alcune forme esemplari (normalizzate sul riquadro della parte) da cui ridisegnarle sempre diverse.
"""
import json, numpy as np
from comune import IT, norm
rng=np.random.default_rng(3)
def feat(s):
    x=np.array(s[0],float); y=np.array(s[1],float)
    L=np.sum(np.hypot(np.diff(x),np.diff(y))) if len(x)>1 else 1.0
    x0,x1,y0,y1=x.min(),x.max(),y.min(),y.max()
    chi=np.hypot(x[0]-x[-1],y[0]-y[-1])/max(L,1)
    drit=np.hypot(x[0]-x[-1],y[0]-y[-1])/max(L,1)
    if len(x)>2:
        c=np.cov(np.vstack([x,y])); w,v=np.linalg.eigh(c); a=np.arctan2(v[1,1],v[0,1])
    else: a=np.arctan2(y[-1]-y[0],x[-1]-x[0])
    return dict(cx=(x0+x1)/2/255,cy=(y0+y1)/2/255,w=(x1-x0)/255,h=(y1-y0)/255,L=L/255,chiuso=float(chi<0.15 and L>40),dritto=float(drit),a=float(a))
def vec(f): return np.array([f['cx']*2,f['cy']*2,f['w'],f['h'],f['chiuso']*0.6,f['dritto']*0.5,np.cos(2*f['a'])*0.3,np.sin(2*f['a'])*0.3])
def kmeans(X,k,it=40):
    C=X[rng.choice(len(X),k,replace=False)]
    for _ in range(it):
        d=((X[:,None,:]-C[None])**2).sum(-1); l=d.argmin(1)
        for j in range(k):
            if (l==j).any(): C[j]=X[l==j].mean(0)
    return l,C
raw=json.load(open('quickdraw.json'))['forme']
out={}
for en,ds in raw.items():
    if not ds: continue
    ds=[norm(d) for d in ds]
    S=[];D=[]
    for di,d in enumerate(ds):
        for si,s in enumerate(d):
            if len(s[0])<2: continue
            f=feat(s); f['ordine']=si/max(1,len(d)-1); S.append((f,s)); D.append(di)
    if len(S)<20: continue
    X=np.stack([vec(f) for f,_ in S]); D=np.array(D)
    k=int(np.clip(np.median([len(d) for d in ds]),2,7))
    l,C=kmeans(X,k)
    parti=[]
    for j in sorted({j for j in range(k) if (l==j).sum()>=5}):
        idx=np.nonzero(l==j)[0]
        freq=len(set(D[idx]))/len(ds)
        F=[S[i][0] for i in idx]
        m=lambda key: float(np.mean([f[key] for f in F])); sd=lambda key: float(np.std([f[key] for f in F]))
        # esemplari: i tratti più vicini al centro del gruppo, normalizzati sul loro riquadro (0..1)
        dist=((X[idx]-C[j])**2).sum(1); sc=idx[np.argsort(dist)[:8]]
        es=[]
        for i in sc:
            s=S[i][1]; x=np.array(s[0],float); y=np.array(s[1],float)
            w=max(1,x.max()-x.min()); h=max(1,y.max()-y.min())
            es.append([[round(float(v),3) for v in (x-x.min())/w],[round(float(v),3) for v in (y-y.min())/h]])
        parti.append(dict(freq=round(freq,3),cx=round(m('cx'),3),cy=round(m('cy'),3),w=round(m('w'),3),h=round(m('h'),3),sdx=round(sd('cx'),3),sdy=round(sd('cy'),3),sdw=round(sd('w'),3),sdh=round(sd('h'),3),
            chiuso=round(m('chiuso'),2),dritto=round(m('dritto'),2),ordine=round(m('ordine'),2),esempi=es))
    # i disegni interi (i più tipici per sagoma), ogni tratto con il suo tipo di parte: la struttura da cui ripartire
    tipi_ok={j for j in range(k) if (l==j).sum()>=5}
    mappa={j:i for i,j in enumerate(sorted(tipi_ok))}
    # tipicità: quanto ogni disegno contiene i tipi di parte frequenti
    lab_per=[[] for _ in ds]
    for (f,s),di,lj in zip(S,D,l): lab_per[di].append((lj,s))
    fr={j:len(set(D[l==j]))/len(ds) for j in tipi_ok}
    sc=[sum(fr.get(lj,0) for lj,_ in lp)/max(1,len(lp))**0.3 for lp in lab_per]
    interi=[]
    for di in np.argsort(sc)[::-1][:40]:
        interi.append([[mappa.get(int(lj),-1),[int(v) for v in s[0]],[int(v) for v in s[1]]] for lj,s in lab_per[di] if lj in mappa])
    parti=[parti_by for parti_by in parti]
    out[IT.get(en,en)]={'en':en,'parti':parti,'interi':interi}
json.dump({'fonte':'Quick, Draw! Dataset — Google, CC BY 4.0','cose':out},open('parti.json','w'),separators=(',',':'))
import os; print(len(out), os.path.getsize('parti.json'))
for k in ['albero','mano','pesce','casa']: print(k,[(round(p['freq'],2),p['cx'],p['cy'],p['w'],p['h'],p['chiuso']) for p in out[k]['parti']])
