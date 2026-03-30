'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function addIdea(text: string, clientId?: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Non autenticato')

    const { error } = await supabase.from('ideas').insert({
        user_id: user.id,
        text: text.trim(),
        client_id: clientId || null,
        assigned: false,
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

    const { error } = await supabase.from('clients').insert({
        user_id: user.id,
        name: data.name.trim(),
        email: data.email?.trim() || null,
        sector: data.sector || null,
        vault_path: `/_CLIENTI/${data.name.trim()}/`,
    })

    if (error) throw new Error(error.message)
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
