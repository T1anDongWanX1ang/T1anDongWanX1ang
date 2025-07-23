"use client"

import * as React from "react"
import { AlertTriangle, TrendingUp, Info, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { AIAlert } from "@/types"

interface AIAlertProps {
  alert: AIAlert
  onDismiss?: (id: string) => void
  className?: string
}

const iconMap = {
  warning: AlertTriangle,
  opportunity: TrendingUp,
  info: Info,
}

const colorMap = {
  warning: "bg-red-50 border-red-200 text-red-800",
  opportunity: "bg-green-50 border-green-200 text-green-800",
  info: "bg-blue-50 border-blue-200 text-blue-800",
}

export function AIAlertComponent({ alert, onDismiss, className }: AIAlertProps) {
  const Icon = iconMap[alert.type]
  
  return (
    <div
      className={cn(
        "relative rounded-lg border p-4 transition-all duration-300 animate-in slide-in-from-right-5",
        colorMap[alert.type],
        className
      )}
    >
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-4 w-4 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium">{alert.message}</p>
          <p className="mt-1 text-xs opacity-75">
            {new Date(alert.timestamp).toLocaleTimeString()}
          </p>
        </div>
        {onDismiss && (
          <button
            onClick={() => onDismiss(alert.id)}
            className="flex-shrink-0 rounded-md p-1 hover:bg-white/20 transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  )
}

interface AIAlertListProps {
  alerts: AIAlert[]
  onDismiss?: (id: string) => void
  className?: string
  maxItems?: number
}

export function AIAlertList({ 
  alerts, 
  onDismiss, 
  className, 
  maxItems = 3 
}: AIAlertListProps) {
  const displayedAlerts = alerts.slice(0, maxItems)
  
  if (displayedAlerts.length === 0) {
    return null
  }
  
  return (
    <div className={cn("space-y-2", className)}>
      {displayedAlerts.map((alert) => (
        <AIAlertComponent
          key={alert.id}
          alert={alert}
          onDismiss={onDismiss}
        />
      ))}
    </div>
  )
}