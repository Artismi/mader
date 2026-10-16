/**
 * Dominio task (K1): incarichi e impegni ricorrenti. Una sola implementazione
 * per i pulsanti (actions.ts), la chat, runAgent, il guscio /os e Ctrl+K.
 */
import { z } from 'zod'
import { tasks, type Task } from '@/lib/db'
import { budget, clienteEsiste, dataIso, tutti } from '@/lib/agent/checks'
import { defineAction } from '../actions'
import { clientIdOf } from './client'

const DAY_MAP: Record<string, number> = {
  lunedi: 1, lun: 1, monday: 1, martedi: 2, mar: 2, tuesday: 2,
  mercoledi: 3, mer: 3, wednesday: 3, giovedi: 4, gio: 4, thursday: 4,
  venerdi: 5, ven: 5, friday: 5, sabato: 6, sab: 6, saturday: 6,
  domenica: 0, dom: 0, sunday: 0,
}

/** Trova un incarico da ID completo, corto (almeno 8 caratteri) o "task:<id>". */
export function findTask(ref: string): Task | undefined {
  const id = ref.replace(/^task:/, '')
  return tasks.getById(id) ?? (id.length >= 8 ? tasks.getAll({ limit: 1000 }).find(t => t.id.startsWith(id)) : undefined)
}

export const taskCreate = defineAction({
  id: 'task.create', title: 'Nuovo incarico', domain: 'task', group: 'lavoro', risk: 'write', toolName: 'createTask',
  description: 'Crea un nuovo incarico nel sistema.',
  input: z.object({
    title: z.string().describe("Il nome dell'incarico"),
    clientId: z.string().optional().describe('nome o ID del cliente, se menzionato'),
    category: z.string().default('general').describe('tipo: design | dev | bando | social | finanze | general'),
    deadlinePattern: z.string().optional().describe('scadenza, data AAAA-MM-GG (o AAAA-MM-GGTHH:MM)'),
    kind: z.enum(['task', 'engagement']).optional().describe('task (default) o impegno a orario'),
    durationMinutes: z.number().int().min(5).max(24 * 60).optional(),
  }),
  verify: ({ title, deadlinePattern, clientId }, ctx) => tutti(
    budget('title', title, 120, 2),
    // per l'IA la scadenza è obbligatoria e nel futuro; l'utente può registrare anche il passato
    dataIso('deadlinePattern', deadlinePattern, { futura: ctx.actor !== 'user', obbligatoria: ctx.actor !== 'user' }),
    clienteEsiste('clientId', clientId),
  ),
  run: ({ title, clientId, category, deadlinePattern, kind, durationMinutes }) => {
    const deadline = deadlinePattern ? new Date(deadlinePattern.length === 10 ? `${deadlinePattern}T18:00:00` : deadlinePattern) : undefined
    // il modello può passare il nome o l'ID corto: nel database va l'ID completo
    const t = tasks.create({
      client_id: clientIdOf(clientId),
      title: title.trim(),
      type: category,
      category: kind ?? 'task',
      status: 'todo',
      deadline: deadline && !isNaN(deadline.getTime()) ? deadline.toISOString() : undefined,
      duration_minutes: durationMinutes,
    })
    return { success: true, message: `Incarico "${title}" creato${deadline ? ` per il ${deadline.toLocaleDateString('it-IT')}` : ''}.`, id: t?.id }
  },
  after: ({ title }, out) => {
    const id = (out as { id?: string }).id
    return id && tasks.getById(id)?.title === title.trim() ? [] : [`l'incarico "${title}" non risulta salvato: rileggi con readTasks prima di dire che è fatto.`]
  },
})

export const taskCreateRecurring = defineAction({
  id: 'task.create_recurring', title: 'Impegni ricorrenti', domain: 'task', group: 'lavoro', risk: 'write', toolName: 'createRecurringEngagement',
  description: 'Crea slot ricorrenti per impegni fissi settimanali.',
  input: z.object({
    title: z.string(),
    days: z.array(z.string()),
    startHour: z.number().int().min(0).max(23),
    endHour: z.number().int().min(1).max(24),
    startDate: z.string(),
    endDate: z.string(),
  }),
  verify: ({ title, days, startHour, endHour, startDate, endDate }, ctx) => tutti(
    budget('title', title, 120, 3),
    dataIso('startDate', startDate, { futura: ctx.actor !== 'user', obbligatoria: true }),
    dataIso('endDate', endDate, { futura: ctx.actor !== 'user', obbligatoria: true }),
    endDate < startDate ? ['endDate: viene prima di startDate.'] : [],
    endHour <= startHour ? ['endHour: deve essere dopo startHour.'] : [],
    (new Date(endDate).getTime() - new Date(startDate).getTime()) / 864e5 > 366 ? ["periodo: più di un anno di slot, chiedi conferma all'utente o accorcia."] : [],
    days.length ? [] : ['days: indica almeno un giorno della settimana.'],
  ),
  run: ({ title, days, startHour, endHour, startDate, endDate }) => {
    const targetDays = days
      .map(d => DAY_MAP[d.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')])
      .filter((d): d is number => d !== undefined)
    if (targetDays.length === 0) return { success: false, message: 'Giorni non riconosciuti' }
    const durationMinutes = (endHour - startHour) * 60
    let count = 0
    for (const d = new Date(startDate); d <= new Date(endDate); d.setDate(d.getDate() + 1)) {
      if (targetDays.includes(d.getDay())) {
        const deadline = new Date(d)
        deadline.setHours(startHour, 0, 0, 0)
        tasks.create({ title, type: 'general', category: 'engagement', status: 'todo', deadline: deadline.toISOString(), duration_minutes: durationMinutes })
        count++
      }
    }
    return { success: true, message: `Creati ${count} slot "${title}" (${startHour}:00–${endHour}:00) dal ${startDate} al ${endDate}.`, count }
  },
})

export const taskList = defineAction({
  id: 'task.list', title: 'Incarichi', domain: 'task', group: 'lavoro', risk: 'read', toolName: 'readTasks',
  description: 'Legge gli incarichi dal sistema con filtri opzionali.',
  input: z.object({
    status: z.enum(['todo', 'in_progress', 'done', 'all']).optional(),
    category: z.string().optional(),
    clientId: z.string().optional().describe('nome o ID del cliente'),
    limit: z.number().int().min(1).max(20).optional(),
  }),
  run: ({ status, category, clientId, limit }) => {
    const cid = clientIdOf(clientId) ?? clientId
    const all = tasks.getAll({ status: status === 'all' ? undefined : status, category, limit: cid ? 200 : limit || 10 })
      .filter(t => !cid || (t.client_id ?? '').startsWith(cid)).slice(0, limit || 10)
    if (all.length === 0) return { success: true, message: 'Nessun task trovato.' }
    return {
      success: true,
      tasks: all.map(t => `[${t.id.slice(0, 8)}] ${t.title} — ${t.client_name || '—'} → ${t.deadline ? new Date(t.deadline).toLocaleDateString('it-IT') : 'senza scadenza'} [${t.status}]`).join('\n'),
    }
  },
})

export const taskSetStatus = defineAction({
  id: 'task.set_status', title: 'Cambia lo stato di un incarico', domain: 'task', group: 'lavoro', risk: 'write', toolName: 'updateTaskStatus', palette: false,
  description: 'Aggiorna lo stato di un incarico esistente.',
  input: z.object({
    taskId: z.string().describe('ID parziale del task (almeno 8 caratteri)'),
    newStatus: z.enum(['todo', 'in_progress', 'done']),
  }),
  verify: ({ taskId }) => (findTask(taskId) ? [] : taskId.replace(/^task:/, '').length < 8 ? ['taskId: servono almeno gli 8 caratteri mostrati da readTasks.'] : [`taskId: l'incarico ${taskId} non esiste. Leggi gli ID con readTasks.`]),
  run: ({ taskId, newStatus }) => {
    const t = findTask(taskId)!
    tasks.update(t.id, { status: newStatus })
    return { success: true, id: t.id, message: `Task "${t.title}" aggiornato a ${newStatus}.` }
  },
  after: ({ taskId, newStatus }) => {
    const t = findTask(taskId)
    return t?.status === newStatus ? [] : [`lo stato dell'incarico ${taskId} risulta "${t?.status}", non "${newStatus}".`]
  },
})

export const taskUpdate = defineAction({
  id: 'task.update', title: 'Modifica un incarico', domain: 'task', group: 'lavoro', risk: 'write', toolName: 'updateTask', palette: false,
  description: 'Modifica titolo, tipo, scadenza, cliente o stato di un incarico (ID da readTasks).',
  input: z.object({
    taskId: z.string(),
    title: z.string().optional(), type: z.string().optional(), category: z.enum(['task', 'engagement']).optional(),
    deadline: z.string().optional(), clientId: z.string().nullable().optional(), status: z.string().optional(),
  }),
  verify: ({ taskId, deadline, clientId }) => tutti(
    findTask(taskId) ? [] : [`taskId: l'incarico ${taskId} non esiste.`],
    dataIso('deadline', deadline),
    clientId ? clienteEsiste('clientId', clientId) : [],
  ),
  run: ({ taskId, clientId, ...data }) => {
    const t = findTask(taskId)!
    const patch: Record<string, unknown> = { ...data }
    if (clientId !== undefined) patch.client_id = clientId === null ? null : clientIdOf(clientId)
    if (data.deadline) patch.deadline = new Date(data.deadline).toISOString()
    tasks.update(t.id, patch as Parameters<typeof tasks.update>[1])
    return { success: true, id: t.id, message: `Incarico "${t.title}" aggiornato.` }
  },
})

export const taskDelete = defineAction({
  id: 'task.delete', title: 'Elimina un incarico', domain: 'task', group: 'lavoro', risk: 'destructive', toolName: 'deleteTask', palette: false,
  description: 'Elimina un incarico. Chiede conferma all\'utente.',
  input: z.object({ taskId: z.string() }),
  verify: ({ taskId }) => (findTask(taskId) ? [] : [`taskId: l'incarico ${taskId} non esiste.`]),
  run: ({ taskId }) => { const t = findTask(taskId)!; tasks.delete(t.id); return { success: true, id: t.id, message: `Incarico "${t.title}" eliminato.` } },
})
