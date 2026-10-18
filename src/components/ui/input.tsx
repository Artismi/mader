import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps
    extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string
    error?: string
    leftIcon?: React.ReactNode
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, type, label, error, leftIcon, ...props }, ref) => {
        return (
            <div className="w-full space-y-1.5">
                {label && (
                    <label className="cos-kicker block pl-4">
                        {label}
                    </label>
                )}
                <div className="relative">
                    {leftIcon && (
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-ink-3">
                            {leftIcon}
                        </div>
                    )}
                    <input
                        type={type}
                        className={cn(
                            "cos-field flex disabled:cursor-not-allowed disabled:opacity-50",
                            leftIcon && "pl-11",
                            error && "!shadow-[inset_0_0_0_1.5px_var(--cos-err)]",
                            className
                        )}
                        ref={ref}
                        {...props}
                    />
                </div>
                {error && (
                    <p className="pl-4 text-xs text-[var(--cos-err)]" role="alert">{error}</p>
                )}
            </div>
        )
    }
)
Input.displayName = "Input"

export { Input }
