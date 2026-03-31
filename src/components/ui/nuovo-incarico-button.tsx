'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TaskFormModal } from '@/components/ui/nuovo-task-modal'

export function NuovoIncaricoButton() {
    const [open, setOpen] = useState(false)
    return (
        <>
            <Button variant="primary" onClick={() => setOpen(true)}>
                <Plus className="-ml-0.5 mr-1.5 h-5 w-5" />
                Nuovo Incarico
            </Button>
            <TaskFormModal open={open} onClose={() => setOpen(false)} />
        </>
    )
}
