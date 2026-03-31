'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getDriveClient, createClientVault } from '@/lib/google/drive'

export async function addIdea(text: string, clientId?: string, title?: string, platforms?: string[]) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Non autenticato')

    const { error } = await supabase.from('ideas').insert({
        user_id: user.id,
        text: text.trim(),
        client_id: clientId || null,
        assigned: false,
        title: title?.trim() || null,
        platforms: platforms || null,
        idea_status: 'idea',
    })

    if (error) throw new Error(error.message)
    revalidatePath('/')
    revalidatePath('/idee')
}

export async function addTask(data: {
    title: string
    client_id?: string
    type: string
    deadline?: string
    notes?: string
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Non autenticato')

    const { error } = await supabase.from('tasks').insert({
        user_id: user.id,
        title: data.title.trim(),
        type: data.type,
        status: 'todo',
        client_id: data.client_id || null,
        deadline: data.deadline ? new Date(data.deadline).toISOString() : null,
        notes: data.notes?.trim() || null,
    })

    if (error) throw new Error(error.message)
    revalidatePath('/')
    revalidatePath('/incarichi')
}

export async function addClient(data: {
    name: string
    email?: string
    sector?: string
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Non autenticato')

    // 1. Creazione record base in Supabase
    const { data: newClient, error: sbError } = await supabase.from('clients').insert({
        user_id: user.id,
        name: data.name.trim(),
        email: data.email?.trim() || null,
        sector: data.sector || null,
        vault_path: `/_CLIENTI/${data.name.trim()}/`,
    }).select().single()

    if (sbError || !newClient) throw new Error(sbError?.message || "Errore nella creazione del cliente")

    // 2. Automazione Google Drive
    try {
        const drive = await getDriveClient()
        const { folderId } = await createClientVault(drive, data.name.trim())

        // 3. Aggiorna il record con l'ID cartella reale
        await supabase
            .from('clients')
            .update({ drive_folder_id: folderId })
            .eq('id', newClient.id)

    } catch (driveError: unknown) {
        console.error("[Drive Automation Error]", driveError)
        // Non blocchiamo la creazione del cliente se Drive fallisce dopo l'inserimento nel DB,
        // ma logghiamo l'errore per il debug o futuri retry.
    }

    revalidatePath('/clienti')
}

export async function updateTaskStatus(taskId: string, status: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Non autenticato')

    const { error } = await supabase
        .from('tasks')
        .update({ status })
        .eq('id', taskId)
        .eq('user_id', user.id)

    if (error) throw new Error(error.message)
    revalidatePath('/incarichi')
    revalidatePath('/')
}

export async function deleteTask(taskId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Non autenticato')

    const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)
        .eq('user_id', user.id)

    if (error) throw new Error(error.message)
    revalidatePath('/incarichi')
    revalidatePath('/')
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
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Non autenticato')

    const { error } = await supabase
        .from('tasks')
        .update(data)
        .eq('id', taskId)
        .eq('user_id', user.id)

    if (error) throw new Error(error.message)
    revalidatePath('/')
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
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Non autenticato')

    const { error } = await supabase.from('tasks').insert({
        user_id: user.id,
        title: data.title,
        type: data.type,
        category: data.category,
        status: 'todo',
        client_id: data.client_id,
        deadline: data.deadline,
        duration_minutes: data.duration_minutes || 60,
    })

    if (error) throw new Error(error.message)
    revalidatePath('/')
    revalidatePath('/incarichi')
}

// ─── SUBTASK ACTIONS ──────────────────────────────────────────────────────────

export async function addSubtask(taskId: string, title: string, fase?: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Non autenticato')

    const { data: existing } = await supabase
        .from('subtasks')
        .select('sort_order')
        .eq('task_id', taskId)
        .order('sort_order', { ascending: false })
        .limit(1)

    const sort_order = (existing?.[0]?.sort_order ?? -1) + 1

    const { error } = await supabase.from('subtasks').insert({
        task_id: taskId,
        user_id: user.id,
        title: title.trim(),
        done: false,
        sort_order,
        fase: fase || null,
    })

    if (error) throw new Error(error.message)
    revalidatePath(`/incarichi/${taskId}`)
}

export async function toggleSubtask(subtaskId: string, done: boolean, taskId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Non autenticato')

    const { error } = await supabase
        .from('subtasks')
        .update({ done })
        .eq('id', subtaskId)
        .eq('user_id', user.id)

    if (error) throw new Error(error.message)
    revalidatePath(`/incarichi/${taskId}`)
    revalidatePath('/')
}

export async function deleteSubtask(subtaskId: string, taskId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Non autenticato')

    const { error } = await supabase
        .from('subtasks')
        .delete()
        .eq('id', subtaskId)
        .eq('user_id', user.id)

    if (error) throw new Error(error.message)
    revalidatePath(`/incarichi/${taskId}`)
}

// ─── CLIENT ACTIONS ────────────────────────────────────────────────────────────

export async function updateClient(clientId: string, data: {
    name?: string
    email?: string
    sector?: string
    canva_brand_kit_id?: string
    figjam_board_id?: string
    vault_md_content?: string
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Non autenticato')

    const { error } = await supabase
        .from('clients')
        .update(data)
        .eq('id', clientId)
        .eq('user_id', user.id)

    if (error) throw new Error(error.message)
    revalidatePath('/clienti')
    revalidatePath(`/clienti/${clientId}`)
}

// ─── IDEA ACTIONS ──────────────────────────────────────────────────────────────

export async function updateIdea(ideaId: string, data: {
    idea_status?: string
    platforms?: string[]
    description?: string
    title?: string
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Non autenticato')

    const { error } = await supabase
        .from('ideas')
        .update(data)
        .eq('id', ideaId)
        .eq('user_id', user.id)

    if (error) throw new Error(error.message)
    revalidatePath('/idee')
}

export async function deleteIdea(ideaId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Non autenticato')

    const { error } = await supabase
        .from('ideas')
        .delete()
        .eq('id', ideaId)
        .eq('user_id', user.id)

    if (error) throw new Error(error.message)
    revalidatePath('/idee')
    revalidatePath('/')
}

export async function upsertSkill(data: {
    slug: string; name: string; description: string;
    content: string; triggers: string[]; active: boolean; sort_order: number;
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Non autenticato')
    const { error } = await supabase.from('skills').upsert({
        user_id: user.id, ...data, updated_at: new Date().toISOString()
    }, { onConflict: 'user_id,slug' })
    if (error) throw new Error(error.message)
    revalidatePath('/settings/skills')
}

export async function upsertArchitecture(content: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Non autenticato')
    const { error } = await supabase.from('system_config').upsert({
        user_id: user.id, key: 'architecture', value: content, updated_at: new Date().toISOString()
    }, { onConflict: 'user_id,key' })
    if (error) throw new Error(error.message)
    revalidatePath('/settings/skills')
}
