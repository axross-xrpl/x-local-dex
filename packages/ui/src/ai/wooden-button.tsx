import { type ButtonHTMLAttributes, forwardRef } from "react"
import { cn } from "@repo/utils"

interface WoodenButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary"
}

const WoodenButton = forwardRef<HTMLButtonElement, WoodenButtonProps>(
  ({ className, variant = "primary", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          // Base styles - wooden look with carved appearance
          "relative px-6 py-3 font-bold text-lg rounded-lg transition-all duration-150",
          "shadow-[0_6px_0_0] active:shadow-[0_2px_0_0] active:translate-y-1",
          "border-2 font-mono tracking-wide",
          // Primary variant - warm brown wood
          variant === "primary" &&
            "bg-gradient-to-b from-amber-600 to-amber-800 border-amber-900 text-amber-50 shadow-amber-950 hover:from-amber-500 hover:to-amber-700",
          // Secondary variant - darker wood
          variant === "secondary" &&
            "bg-gradient-to-b from-stone-600 to-stone-800 border-stone-900 text-stone-50 shadow-stone-950 hover:from-stone-500 hover:to-stone-700",
          // Disabled state
          "disabled:opacity-60 disabled:cursor-not-allowed disabled:active:translate-y-0 disabled:active:shadow-[0_6px_0_0]",
          className,
        )}
        {...props}
      >
        {/* Wood grain texture overlay */}
        <span
          className="absolute inset-0 rounded-lg opacity-20 pointer-events-none"
          style={{
            backgroundImage: `repeating-linear-gradient(
              90deg,
              transparent,
              transparent 2px,
              rgba(0,0,0,0.1) 2px,
              rgba(0,0,0,0.1) 4px
            )`,
          }}
        />
        {/* Button content */}
        <span className="relative z-10 drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)]">{children}</span>
      </button>
    )
  },
)

WoodenButton.displayName = "WoodenButton"

export { WoodenButton }
