'use server'

import { revalidatePath } from 'next/cache'
import { tasks, ideas, clients, subtasks, skills, config, designProjects, briefs, milestones, deliverables } from '@/lib/db'
import { saveMemory } from '@/lib/vault'
import type { BriefStatus, MilestoneStatus, DeliverableStatus, DeliverableType } from '@/lib/db'
import { getDriveClient, createClientVault } from '@/lib/google/drive'

export async function addIdea(text: string, clientId?: string, title?: string, platforms?: string[]) {
  ideas.create({
    text: text.trim(),
    client_id: clientId || undefined,
    title: title?.trim() || undefined,
    description: undefined,
    platforms: platforms || [],
    idea_status: 'idea',
    assigned: false,
    task_id: undefined,
    output_links: [],
  })
  revalidatePath('/idee')
}

export async function addTask(data: {
  title: string
  client_id?: string
  type: string
  deadline?: string
}) {
  tasks.create({
    title: data.title.trim(),
    type: data.type,
    category: 'task',
    status: 'todo',
    client_id: data.client_id || undefined,
    deadline: data.deadline ? new Date(data.deadline).toISOString() : undefined,
  })
  revalidatePath('/incarichi')
}

export async function addClient(data: {
  name: string
  email?: string
  sector?: string
}) {
  const newClient = clients.create({
    name: data.name.trim(),
    email: data.email?.trim() || undefined,
    sector: data.sector || undefined,
    category: 'cliente',
    vault_path: `/_CLIENTI/${data.name.trim()}/`,
  })

  try {
    const drive = await getDriveClient()
    const { folderId } = await createClientVault(drive, data.name.trim())
    clients.update(newClient.id, { drive_folder_id: folderId })
  } catch (driveError: unknown) {
    console.error('[Drive Automation Error]', driveError)
  }

  revalidatePath('/clienti')
}

export async function updateTaskStatus(taskId: string, status: string) {
  tasks.update(taskId, { status })
  revalidatePath('/incarichi')
}

export async function deleteTask(taskId: string) {
  tasks.delete(taskId)
  revalidatePath('/incarichi')
}

export async function updateTask(
  taskId: string,
  data: {
    title?: string
    type?: string
    category?: 'task' | 'engagement'
    deadline?: string
    client_id?: string | null
    status?: string
  }
) {
  tasks.update(taskId, data as Parameters<typeof tasks.update>[1])
  revalidatePath('/incarichi')
}

export async function markTaskDone(taskId: string) {
  return updateTaskStatus(taskId, 'done')
}

export async function duplicateTask(data: {
  title: string
  type: string
  category: 'task' | 'engagement'
  deadline: string
  client_id: string | null
  duration_minutes?: number
}) {
  tasks.create({
    title: data.title,
    type: data.type,
    category: data.category,
    status: 'todo',
    client_id: data.client_id || undefined,
    deadline: data.deadline,
    duration_minutes: data.duration_minutes || 60,
  })
  revalidatePath('/incarichi')
}

// ─── SUBTASK ACTIONS ──────────────────────────────────────────────────────────

export async function addSubtask(taskId: string, title: string, fase?: string) {
  const existing = subtasks.getByTask(taskId)
  const sort_order = existing.length > 0 ? Math.max(...existing.map(s => s.sort_order)) + 1 : 0
  subtasks.create({
    task_id: taskId,
    title: title.trim(),
    done: false,
    sort_order,
    fase: fase || undefined,
  })
  revalidatePath(`/incarichi/${taskId}`)
}

export async function toggleSubtask(subtaskId: string, done: boolean, taskId: string) {
  subtasks.update(subtaskId, { done })
  revalidatePath(`/incarichi/${taskId}`)
  revalidatePath('/')
}

export async function deleteSubtask(subtaskId: string, taskId: string) {
  subtasks.delete(subtaskId)
  revalidatePath(`/incarichi/${taskId}`)
}

// ─── CLIENT ACTIONS ────────────────────────────────────────────────────────────

export async function updateClient(clientId: string, data: {
  name?: string
  email?: string
  sector?: string
  canva_brand_kit_id?: string
  figjam_board_id?: string
  canvas_state?: string
  vault_md_content?: string
}) {
  clients.update(clientId, data)
  revalidatePath('/clienti')
}

// ─── IDEA ACTIONS ──────────────────────────────────────────────────────────────

export async function updateIdea(ideaId: string, data: {
  idea_status?: string
  platforms?: string[]
  description?: string
  title?: string
}) {
  ideas.update(ideaId, data)
  revalidatePath('/idee')
}

export async function deleteIdea(ideaId: string) {
  ideas.delete(ideaId)
  revalidatePath('/idee')
  revalidatePath('/')
}

// ─── SKILLS / CONFIG ──────────────────────────────────────────────────────────

export async function upsertSkill(data: {
  slug: string; name: string; description: string;
  content: string; triggers: string[]; active: boolean; sort_order: number;
}) {
  skills.upsert(data)
  revalidatePath('/settings/skills')
}

export async function upsertArchitecture(content: string) {
  config.set('architecture', content)
  revalidatePath('/settings/skills')
}

// ─── DESIGN PROJECTS ──────────────────────────────────────────────────────────

export async function upsertDesignProject(data: {
  id?: string
  clientId?: string | null
  name: string
  canvasState: string
  thumbnail?: string | null
  type?: 'board' | 'document' | 'presentation'
  metadata?: Record<string, any>
  semanticManifest?: string
  userDescription?: string
}): Promise<string> {
  // Update internal metadata to persist user description
  const meta = { 
    ...(data.metadata || {}), 
    userDescription: data.userDescription || data.metadata?.userDescription 
  }

  const project = designProjects.upsert({
    id: data.id,
    client_id: data.clientId ?? null,
    name: data.name,
    canvas_state: data.canvasState,
    thumbnail: data.thumbnail ?? null,
    type: data.type,
    metadata: meta,
  })

  // Index for AI if manifest or user description is provided
  if (data.semanticManifest || data.userDescription) {
    const combinedContent = `PROGETTO: ${data.name}\n` +
      (data.userDescription ? `DESCRIZIONE UTENTE: ${data.userDescription}\n` : '') +
      (data.semanticManifest ? `MANIFESTO TECNICO:\n${data.semanticManifest}` : '')

    // Use allowUpsert to replace old project memories
    await saveMemory(
      combinedContent,
      'progetto',
      project.id,
      'semantic',
      0.8,
      undefined,
      true
    )
  }

  revalidatePath('/progettazione')
  return project.id
}

export async function deleteDesignProject(id: string): Promise<void> {
  designProjects.delete(id)
  revalidatePath('/progettazione')
}

// ─── BRIEF ACTIONS ─────────────────────────────────────────────────────────────

export async function createBrief(data: {
  clientId: string
  title: string
  description?: string
  scope?: string
  budgetMin?: number
  budgetMax?: number
  deadline?: string
}): Promise<string> {
  const brief = briefs.create({
    client_id: data.clientId,
    title: data.title.trim(),
    description: data.description?.trim() || undefined,
    scope: data.scope?.trim() || undefined,
    budget_min: data.budgetMin,
    budget_max: data.budgetMax,
    deadline: data.deadline || undefined,
    status: 'draft',
  })
  revalidatePath('/clienti')
  revalidatePath('/')
  return brief.id
}

export async function updateBrief(id: string, data: {
  title?: string
  description?: string
  scope?: string
  budgetMin?: number
  budgetMax?: number
  deadline?: string
  status?: BriefStatus
}): Promise<void> {
  briefs.update(id, {
    title: data.title?.trim(),
    description: data.description?.trim(),
    scope: data.scope?.trim(),
    budget_min: data.budgetMin,
    budget_max: data.budgetMax,
    deadline: data.deadline,
    status: data.status,
  })
  revalidatePath('/clienti')
  revalidatePath('/')
}

export async function deleteBrief(id: string): Promise<void> {
  briefs.delete(id)
  revalidatePath('/clienti')
  revalidatePath('/')
}

// ─── MILESTONE ACTIONS ─────────────────────────────────────────────────────────

export async function addMilestone(data: {
  briefId: string
  title: string
  dueDate: string
  orderIndex?: number
}): Promise<string> {
  const ms = milestones.create({
    brief_id: data.briefId,
    title: data.title.trim(),
    due_date: data.dueDate,
    status: 'pending',
    order_index: data.orderIndex ?? 0,
  })
  revalidatePath('/clienti')
  return ms.id
}

export async function updateMilestoneStatus(id: string, status: MilestoneStatus): Promise<void> {
  milestones.updateStatus(id, status)
  revalidatePath('/clienti')
  revalidatePath('/')
}

export async function deleteMilestone(id: string): Promise<void> {
  milestones.delete(id)
  revalidatePath('/clienti')
}

// ─── DELIVERABLE ACTIONS ───────────────────────────────────────────────────────

export async function addDeliverable(data: {
  briefId: string
  type: DeliverableType
  title: string
  dueDate?: string
}): Promise<string> {
  const del = deliverables.create({
    brief_id: data.briefId,
    type: data.type,
    title: data.title.trim(),
    status: 'pending',
    due_date: data.dueDate || undefined,
  })
  revalidatePath('/clienti')
  return del.id
}

export async function updateDeliverableStatus(
  id: string,
  status: DeliverableStatus,
  link?: string,
): Promise<void> {
  deliverables.updateStatus(id, status, link)
  revalidatePath('/clienti')
  revalidatePath('/')
}

export async function deleteDeliverable(id: string): Promise<void> {
  deliverables.delete(id)
  revalidatePath('/clienti')
}

export async function linkDesignProjectToBrief(projectId: string, briefId: string | null): Promise<void> {
  // Direct update — upsert requires canvas_state, but here we only patch brief_id
  const { getDb } = await import('@/lib/db/client')
  getDb().prepare('UPDATE design_projects SET brief_id = ? WHERE id = ?').run(briefId, projectId)
  revalidatePath('/progettazione')
  revalidatePath('/clienti')
}
