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
                <span className="cos-dot"><Plus className="h-4 w-4" strokeWidth={2.25} /></span>
                Nuovo incarico
            </Button>
            <TaskFormModal open={open} onClose={() => setOpen(false)} />
        </>
    )
}
