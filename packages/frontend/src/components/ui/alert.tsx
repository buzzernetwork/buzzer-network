import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { AlertCircle, CheckCircle, AlertTriangle, Info } from "lucide-react"
import { cn } from "@/lib/utils"

const alertVariants = cva(
  "flex items-start gap-3 px-4 py-3 rounded-2xl backdrop-blur-sm border transition-all duration-200 animate-in fade-in slide-in-from-top-2",
  {
    variants: {
      variant: {
        default: "bg-white/10 border-white/20 text-white",
        error:
          "bg-red-500/10 border-red-500/30 text-red-200",
        success:
          "bg-green-500/10 border-green-500/30 text-green-200",
        warning:
          "bg-yellow-500/10 border-yellow-500/30 text-yellow-200",
        info:
          "bg-blue-500/10 border-blue-500/30 text-blue-200",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const alertIcons = {
  default: Info,
  error: AlertCircle,
  success: CheckCircle,
  warning: AlertTriangle,
  info: Info,
}

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {
  title?: string
  showIcon?: boolean
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant, title, showIcon = true, children, ...props }, ref) => {
    const Icon = variant ? alertIcons[variant] : alertIcons.default

    return (
      <div
        ref={ref}
        role="alert"
        className={cn(alertVariants({ variant }), className)}
        {...props}
      >
        {showIcon && (
          <Icon className="w-5 h-5 mt-0.5 flex-shrink-0" aria-hidden="true" />
        )}
        <div className="flex-1 min-w-0">
          {title && (
            <h4 className="font-semibold mb-1 text-sm">{title}</h4>
          )}
          <div className="text-sm">{children}</div>
        </div>
      </div>
    )
  }
)
Alert.displayName = "Alert"

export { Alert, alertVariants }


