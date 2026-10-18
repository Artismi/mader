import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
    "cos-badge",
    {
        variants: {
            variant: {
                default: "",
                success: "is-ok",
                warning: "is-hot",
                destructive: "is-err",
                danger: "is-err",
                info: "is-hot is-plain",
                outline: "is-plain !bg-transparent shadow-[inset_0_0_0_1px_var(--cos-line)]",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    }
)

export interface BadgeProps
    extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> { }

function Badge({ className, variant, ...props }: BadgeProps) {
    return (
        <div className={cn(badgeVariants({ variant }), className)} {...props} />
    )
}

export { Badge, badgeVariants }
