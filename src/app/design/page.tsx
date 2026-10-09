'use client'

import { useState } from 'react'
import { Search, Sparkles, Inbox } from 'lucide-react'
import {
  Badge, Button, Dialog, Disclosure, EmptyState, Field, IconButton, Input, Kbd, Module, NodeChip,
  QuietSwitch, Select, Skeleton, Tabs, Textarea, ThemeSwitch, Toggle, Tooltip, useDsPrefs,
} from '@/components/ds'

const swatches = [
  ['bg', 'Sfondo'], ['surface', 'Superficie'], ['surface-2', 'Superficie 2'], ['ink', 'Inchiostro'],
  ['accent', 'Accento'], ['accent-soft', 'Accento tenue'], ['primary', 'Azione'], ['ok', 'OK'],
  ['warn', 'Avviso'], ['danger', 'Errore'], ['info', 'Info'],
] as const

export default function DesignPage() {
  const { theme, setTheme, quiet, setQuiet } = useDsPrefs()
  const [tab, setTab] = useState<'messaggi' | 'task' | 'file'>('messaggi')
  const [notify, setNotify] = useState(true)
  const [dialog, setDialog] = useState(false)
  const [focus, setFocus] = useState('Mail · Preventivo logo')

  const ramo = ['Oggi', 'Rossi Srl', 'Mail · Preventivo logo', 'Risposta']

  return (
    // Scroll proprio: il body legacy (.desk-surface) ha overflow hidden
    <div className="ds-root h-screen overflow-y-auto overflow-x-hidden">
      {/* Barra superiore: marchio · Ctrl+K · stato · silenzio */}
      <header className="sticky top-0 z-20 flex items-center gap-4 border-b border-ds-line bg-ds-bg/90 px-4 sm:px-6 h-14 backdrop-blur">
        <span className="ds-shout text-ds-lg">✦ artismi</span>
        <button
          type="button"
          className="ml-2 hidden sm:flex flex-1 max-w-md items-center gap-2 h-9 px-3 rounded-ds-sm border border-ds-line bg-ds-surface text-ds-sm text-ds-muted hover:border-ds-ink/40"
        >
          <Search className="size-4" aria-hidden />
          Apri · crea · chiedi…
          <span className="ml-auto"><Kbd>Ctrl</Kbd> <Kbd>K</Kbd></span>
        </button>
        <div className="ml-auto flex items-center gap-2">
          <Badge tone="ok">sync</Badge>
          <ThemeSwitch theme={theme} onChange={setTheme} />
          <QuietSwitch quiet={quiet} onChange={setQuiet} />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-10 space-y-16">
        {/* Hero: qui lo stile osa */}
        <section className="space-y-3">
          <p className="ds-label">— Creative OS · design system</p>
          <h1 className="ds-shout text-[clamp(32px,6vw,var(--text-ds-display))] max-w-3xl">
            Ribelle nei dettagli.<br /><span className="text-ds-accent">Calmo dove si lavora.</span>
          </h1>
          <p className="max-w-xl text-ds-base text-ds-muted">
            Luce pastello, tipografia gridata, bordi neri netti. Una sola azione principale per schermata.
          </p>
        </section>

        {/* Lo spazio di lavoro in miniatura */}
        <Section title="Spazio di lavoro" note="Ramo a sinistra · un modulo in focus · contesto a destra">
          <div className="grid gap-4 lg:grid-cols-[220px_1fr_240px]">
            <nav aria-label="Ramo attivo" className="rounded-ds-md border border-ds-line bg-ds-surface p-2 space-y-0.5 h-fit">
              <p className="ds-label px-2 py-1.5">Ramo</p>
              {ramo.map((n, i) => (
                <div key={n} style={{ paddingLeft: i * 10 }}>
                  <NodeChip type={['', 'cliente', 'mail', 'bozza'][i]} title={n} active={n === focus} onClick={() => setFocus(n)} />
                </div>
              ))}
              <p className="ds-label px-2 pt-4 pb-1.5">Lavori ✦</p>
              <NodeChip type="lavoro" title="Restyling Rossi" />
            </nav>

            <Module
              type="Messaggio · Gmail"
              title={focus}
              status={<Badge tone="warn">da rispondere</Badge>}
              action={<Button variant="primary" shortcut="R">Rispondi</Button>}
              onMenu={() => setDialog(true)}
              branches={[
                { label: 'Task', onSelect: () => {}, shortcut: 'T' },
                { label: 'Preventivo', onSelect: () => {}, shortcut: 'P' },
                { label: 'Evento', onSelect: () => {}, shortcut: 'E' },
              ]}
            >
              <p className="text-ds-sm text-ds-muted">Da: mario@rossi.it · ieri 18:42</p>
              <p className="mt-3 max-w-prose">
                Ciao! Avremmo bisogno di un preventivo per il restyling del logo e delle grafiche social entro fine mese.
              </p>
              <div className="mt-5">
                <Disclosure label="Dettagli">Thread di 3 messaggi · 1 allegato (brief.pdf)</Disclosure>
                <Disclosure label="Avanzate">Etichette Gmail, intestazioni, ID thread</Disclosure>
              </div>
            </Module>

            <aside aria-label="Contesto" className="space-y-3">
              <Module size="card" type="Cliente" title="Rossi Srl" pinned status={<Badge tone="accent" dot={false}>VIP</Badge>}>
                <p className="text-ds-sm text-ds-muted">2 progetti attivi · ultimo contatto ieri</p>
              </Module>
              <Module size="card" type="Task" title="Moodboard logo">
                <p className="text-ds-sm text-ds-muted">Scade venerdì</p>
              </Module>
              <Module size="card" type="Scadenza" title="rossi.it" status={<Badge tone="danger">7 gg</Badge>} />
            </aside>
          </div>
        </Section>

        <Section title="Tipografia">
          <div className="space-y-3">
            <p className="ds-shout text-ds-2xl">Titolo modulo — Syne 800</p>
            <p className="text-ds-lg font-semibold">Sottotitolo 18 — leggibile</p>
            <p className="max-w-prose">
              Testo corrente 15px in Segoe UI: è il testo su cui si lavora per ore, quindi niente maiuscolo e niente grigio su vetro.
            </p>
            <p className="ds-label">Etichetta spaziata</p>
            <p className="font-ds-mono text-ds-sm">€ 1.240,00 · 12/10/2026 · #A3F2</p>
          </div>
        </Section>

        <Section title="Colori" note={`Tema ${theme === 'dark' ? 'prugna' : 'cipria'}`}>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {swatches.map(([k, name]) => (
              <div key={k} className="rounded-ds-sm border border-ds-line overflow-hidden bg-ds-surface">
                <div className="h-14 border-b border-ds-line" style={{ background: `var(--ds-${k})` }} />
                <p className="px-2 py-1.5 text-ds-xs"><span className="font-semibold">{name}</span> <span className="text-ds-muted">ds-{k}</span></p>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Azioni" note="L'ocra è riservato all'unica azione principale">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary">Scrivimi</Button>
            <Button>Secondaria</Button>
            <Button variant="ghost">Discreta</Button>
            <Button variant="danger">Elimina</Button>
            <Button size="sm" icon={<Sparkles className="size-3.5" />}>Chiedi all&apos;AI</Button>
            <Tooltip text="Cerca (Ctrl+K)">
              <IconButton label="Cerca"><Search className="size-4" /></IconButton>
            </Tooltip>
          </div>
        </Section>

        <Section title="Campi">
          <div className="grid gap-5 sm:grid-cols-2 max-w-3xl">
            <Field label="Nome cliente" hint="Come compare nelle mail">
              {p => <Input {...p} placeholder="Rossi Srl" />}
            </Field>
            <Field label="Email" error="Indirizzo non valido">
              {p => <Input {...p} defaultValue="mario@" />}
            </Field>
            <Field label="Canale">
              {p => <Select {...p}><option>Gmail</option><option>WhatsApp</option><option>Instagram</option></Select>}
            </Field>
            <div className="flex items-end pb-2">
              <Toggle checked={notify} onChange={setNotify} label="Avvisami alle scadenze" />
            </div>
            <Field label="Note" className="sm:col-span-2">
              {p => <Textarea {...p} placeholder="Scrivi…" />}
            </Field>
          </div>
        </Section>

        <Section title="Stati">
          <div className="flex flex-wrap gap-2">
            <Badge tone="ok">disponibile</Badge>
            <Badge tone="info">AI al lavoro</Badge>
            <Badge tone="warn">da rispondere</Badge>
            <Badge tone="danger">scaduto</Badge>
            <Badge tone="accent">✦ fissato</Badge>
            <Badge>bozza</Badge>
          </div>
          <div className="mt-6 max-w-md space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </Section>

        <Section title="Navigazione nel modulo">
          <div className="max-w-xl">
            <Tabs
              label="Contenuti del cliente"
              value={tab}
              onChange={setTab}
              tabs={[{ id: 'messaggi', label: 'Messaggi', count: 3 }, { id: 'task', label: 'Task', count: 2 }, { id: 'file', label: 'File' }]}
            />
            <p className="py-4 text-ds-sm text-ds-muted">Pannello: {tab}. Usa ← → per cambiare scheda.</p>
          </div>
        </Section>

        <Section title="Stato vuoto">
          <div className="rounded-ds-md border border-dashed border-ds-ink/40 bg-[radial-gradient(ellipse_at_top,var(--ds-accent-soft),transparent_70%)]">
            <EmptyState
              icon={<Inbox className="size-8" />}
              title="Inbox a zero"
              text="Niente da rispondere. Il tronco di oggi è libero: apri un lavoro o crea qualcosa di nuovo."
              action={<Button variant="primary">Nuovo lavoro</Button>}
            />
          </div>
        </Section>
      </main>

      <Dialog
        open={dialog}
        onClose={() => setDialog(false)}
        title="Altre azioni"
        footer={<><Button variant="ghost" onClick={() => setDialog(false)}>Annulla</Button><Button variant="primary" onClick={() => setDialog(false)}>Conferma</Button></>}
      >
        <p className="text-ds-sm text-ds-muted">Archivia, inoltra, segna come letto… Tutte queste azioni si trovano anche con <Kbd>Ctrl</Kbd> <Kbd>K</Kbd>.</p>
      </Dialog>
    </div>
  )
}

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-5">
      <div className="flex items-baseline gap-3 border-b border-ds-ink/80 pb-2">
        <h2 className="ds-shout text-ds-lg">{title}</h2>
        {note && <p className="text-ds-xs text-ds-muted">{note}</p>}
      </div>
      {children}
    </section>
  )
}
