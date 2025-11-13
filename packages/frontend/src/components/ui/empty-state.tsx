import * as React from "react"
import { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: LucideIcon
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
}

const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  ({ className, icon: Icon, title, description, action, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex flex-col items-center justify-center py-12 px-4 text-center",
          className
        )}
        {...props}
      >
        {Icon && (
          <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mb-4">
            <Icon className="w-8 h-8 text-white/40" aria-hidden="true" />
          </div>
        )}
        <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
        {description && (
          <p className="text-white/60 mb-6 max-w-sm">{description}</p>
        )}
        {action && (
          <Button
            variant="glass-dark"
            onClick={action.onClick}
            aria-label={action.label}
          >
            {action.label}
          </Button>
        )}
      </div>
    )
  }
)
EmptyState.displayName = "EmptyState"

export { EmptyState }


