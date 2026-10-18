import * as React from "react"
import { cn } from "@/lib/utils"

/** Intestazione di pagina del sistema Carta: etichetta in monospazio, titolo, una riga di contesto, azioni a destra */
export function PageHeader({ kicker, title, lead, actions, className }: {
    kicker?: React.ReactNode
    title: React.ReactNode
    lead?: React.ReactNode
    actions?: React.ReactNode
    className?: string
}) {
    return (
        <header className={cn("cos-enter flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between", className)}>
            <div className="min-w-0">
                {kicker && <p className="cos-kicker mb-2">{kicker}</p>}
                <h1 className="cos-title">{title}</h1>
                {lead && <p className="cos-lead mt-2.5">{lead}</p>}
            </div>
            {actions && <div className="flex shrink-0 flex-wrap items-center gap-2.5">{actions}</div>}
        </header>
    )
}

/** Stato vuoto: un cerchio di registro, una frase che dice cosa fare */
export function EmptyState({ icon, title, children, className }: {
    icon?: React.ReactNode
    title: React.ReactNode
    children?: React.ReactNode
    className?: string
}) {
    return (
        <div className={cn("cos-empty", className)}>
            <span className="cos-ring" aria-hidden>{icon}</span>
            <b>{title}</b>
            {children && <p className="max-w-[42ch] text-sm">{children}</p>}
        </div>
    )
}
