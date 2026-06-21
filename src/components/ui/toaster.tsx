"use client"

import { CheckCircle2, XCircle, AlertTriangle, Info } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"

const VARIANT_ICONS = {
  success: <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />,
  destructive: <XCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />,
  warning: <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />,
  info: <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />,
  default: null,
} as const

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        const icon = VARIANT_ICONS[(props.variant as keyof typeof VARIANT_ICONS) ?? "default"] ?? null
        return (
          <Toast key={id} {...props}>
            {icon}
            <div className="grid gap-0.5 flex-1 min-w-0">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}