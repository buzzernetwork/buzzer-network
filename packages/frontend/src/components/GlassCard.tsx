import * as React from "react"
import { cn } from "@/lib/utils"

export interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "light" | "dark"
  blur?: "xl" | "2xl" | "3xl"
}

const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, variant = "default", blur = "xl", children, ...props }, ref) => {
    const variantClasses = {
      default: "bg-black/40 backdrop-blur-xl border-white/10",
      light: "bg-white/30 backdrop-blur-xl border-white/20",
      dark: "bg-black/50 backdrop-blur-2xl border-white/15",
    }

    const blurClasses = {
      xl: "backdrop-blur-xl",
      "2xl": "backdrop-blur-2xl",
      "3xl": "backdrop-blur-3xl",
    }

    return (
      <div
        ref={ref}
        className={cn(
          "rounded-2xl border shadow-2xl transition-all duration-300 ease-out",
          variantClasses[variant],
          blurClasses[blur],
          "hover:scale-[1.02] hover:shadow-3xl hover:border-white/20",
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)
GlassCard.displayName = "GlassCard"

export { GlassCard }

