import json, re, collections, os
W='/tmp/wordnet'
LEX={0:'adj.all',1:'adj.pert',2:'adv.all',3:'noun.Tops',4:'noun.act',5:'noun.animal',6:'noun.artifact',7:'noun.attribute',8:'noun.body',9:'noun.cognition',10:'noun.communication',11:'noun.event',12:'noun.feeling',13:'noun.food',14:'noun.group',15:'noun.location',16:'noun.motive',17:'noun.object',18:'noun.person',19:'noun.phenomenon',20:'noun.plant',21:'noun.possession',22:'noun.process',23:'noun.quantity',24:'noun.relation',25:'noun.shape',26:'noun.state',27:'noun.substance',28:'noun.time',29:'verb.body',30:'verb.change',31:'verb.cognition',32:'verb.communication',33:'verb.competition',34:'verb.consumption',35:'verb.contact',36:'verb.creation',37:'verb.emotion',38:'verb.motion',39:'verb.perception',40:'verb.possession',41:'verb.social',42:'verb.stative',43:'verb.weather',44:'adj.ppl'}
IT={'adj.all':'qualità','adj.pert':'relativo a','adv.all':'modo','noun.Tops':'concetto','noun.act':'azione','noun.animal':'animale','noun.artifact':'oggetto fatto','noun.attribute':'proprietà','noun.body':'corpo','noun.cognition':'pensiero','noun.communication':'comunicazione','noun.event':'evento','noun.feeling':'sentimento','noun.food':'cibo','noun.group':'gruppo','noun.location':'luogo','noun.motive':'motivo','noun.object':'cosa naturale','noun.person':'persona','noun.phenomenon':'fenomeno','noun.plant':'pianta','noun.possession':'possesso','noun.process':'processo','noun.quantity':'quantità','noun.relation':'relazione','noun.shape':'forma','noun.state':'stato','noun.substance':'sostanza','noun.time':'tempo','verb.body':'gesto del corpo','verb.change':'cambiamento','verb.cognition':'pensare','verb.communication':'comunicare','verb.competition':'lottare','verb.consumption':'consumare','verb.contact':'toccare','verb.creation':'creare','verb.emotion':'sentire','verb.motion':'muoversi','verb.perception':'percepire','verb.possession':'possedere','verb.social':'vivere insieme','verb.stative':'essere','verb.weather':'tempo atmosferico','adj.ppl':'qualità'}
REL={'@':'h','@i':'h','%p':'p','%m':'p','%s':'p','#p':'w','#m':'w','#s':'w','!':'a','&':'s','>':'c','*':'e',';c':'d','=':'t'}
syn={}
for pos,fn in [('n','noun'),('v','verb'),('a','adj'),('r','adv')]:
  for line in open(f'{W}/data.{fn}',encoding='latin1'):
    if line.startswith('  '): continue
    body,_,gloss=line.partition('|')
    t=body.split()
    off,lexn,ss=t[0],int(t[1]),t[2]
    p='a' if ss in 'as' else ss
    sid=f'{off}-{p}'
    wc=int(t[3],16); i=4
    en=[t[i+2*k].replace('_',' ') for k in range(wc)]; i+=2*wc
    pc=int(t[i]); i+=1
    rels=collections.defaultdict(list)
    for k in range(pc):
      sym,o,pp,st=t[i:i+4]; i+=4
      if sym in REL:
        rels[REL[sym]].append(f"{o}-{'a' if pp in 'as' else pp}")
    syn[sid]={'en':en,'cat':IT.get(LEX.get(lexn,''),''),'r':rels}
it=collections.defaultdict(set)
for f in ['/tmp/omw/wns/ita/wn-data-ita.tab','/tmp/omw/wns/iwn/wn-data-ita.tab','/tmp/omw/wns/wikt/wn-wikt-ita.tab']:
  for line in open(f,encoding='utf8'):
    if line.startswith('#'): continue
    p=line.rstrip('\n').split('\t')
    if len(p)<3 or not p[1].endswith(':lemma'): continue
    sid=p[0].replace('-s','-a')
    lem=p[2].strip().lower().replace('_',' ')
    if sid in syn and lem and len(lem)<40: it[sid].add(lem)
# tieni: synset con italiano + antenati
keep=set(it)
def anc(s,seen):
  for h in syn[s]['r'].get('h',[]):
    if h in syn and h not in seen: seen.add(h); anc(h,seen)
extra=set()
for s in list(keep): anc(s,extra)
keep|=extra
ids=sorted(keep); idx={s:i for i,s in enumerate(ids)}
out_syn=[]
for s in ids:
  d=syn[s]; L=sorted(it.get(s,[]),key=len)[:6]
  rec=[L if L else ['('+d['en'][0]+')'], d['cat'], s[-1]]
  for k in 'hpwascedt':
    rec.append([idx[x] for x in d['r'].get(k,[]) if x in idx and (k=='h' or x in it)])
  out_syn.append(rec)
lex=collections.defaultdict(list)
for s,ls in it.items():
  for l in ls: lex[l].append(idx[s])
os.makedirs('/home/claude/lessico/out',exist_ok=True)
data={'v':1,'fonte':'MultiWordNet (CC BY 3.0), ItalWordNet, Wiktionary via Open Multilingual Wordnet; relazioni da Princeton WordNet 3.0','campi':['lemmi','categoria','pos','h=è un','p=ha parte','w=è parte di','a=contrario','s=simile','c=causa','e=comporta','d=ambito','t=attributo'],'syn':out_syn,'lex':dict(lex)}
s=json.dumps(data,ensure_ascii=False,separators=(',',':'))
open('/home/claude/lessico/out/lessico.json','w').write(s)
print(len(out_syn),'synset',len(lex),'lemmi',round(len(s)/1e6,2),'MB')
