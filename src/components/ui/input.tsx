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
            <div className="w-full space-y-1">
                {label && (
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        {label}
                    </label>
                )}
                <div className="relative">
                    {leftIcon && (
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                            {leftIcon}
                        </div>
                    )}
                    <input
                        type={type}
                        className={cn(
                            "flex w-full bg-white border border-purple-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent transition-shadow disabled:cursor-not-allowed disabled:opacity-50",
                            leftIcon && "pl-10",
                            error && "border-red-400 focus:ring-red-400",
                            className
                        )}
                        ref={ref}
                        {...props}
                    />
                </div>
                {error && (
                    <p className="text-xs text-red-600">{error}</p>
                )}
            </div>
        )
    }
)
Input.displayName = "Input"

export { Input }
