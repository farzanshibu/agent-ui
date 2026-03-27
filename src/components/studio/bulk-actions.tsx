'use client'

import {
  Loader2,
  RefreshCw,
  CheckSquare,
  Square,
  CheckCircle2,
  XCircle,
  Clock3
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface BulkAction {
  label: string
  onClick: () => void
  variant?: 'default' | 'destructive'
  disabled?: boolean
  loading?: boolean
}

interface BulkSelectionBarProps {
  selectedCount: number
  totalCount: number
  onSelectAll: () => void
  onDeselectAll: () => void
  actions: BulkAction[]
}

interface ProcessingStatusIndicatorProps {
  status: 'processing' | 'completed' | 'failed' | 'queued'
  label?: string
  onRefresh?: () => void
  pollingActive?: boolean
}

interface SelectableRowProps {
  selected: boolean
  onToggle: () => void
  children: React.ReactNode
}

/* ------------------------------------------------------------------ */
/*  BulkSelectionBar                                                   */
/* ------------------------------------------------------------------ */

export function BulkSelectionBar({
  selectedCount,
  totalCount,
  onSelectAll,
  onDeselectAll,
  actions
}: BulkSelectionBarProps) {
  if (selectedCount === 0) return null

  return (
    <div
      className={cn(
        'sticky bottom-4 z-40 mx-auto flex w-full max-w-4xl items-center justify-between',
        'rounded-2xl border bg-background/95 px-4 py-3 shadow-lg backdrop-blur-sm',
        'translate-y-0 opacity-100 transition-all duration-300 ease-out',
        'animate-in slide-in-from-bottom-4 fade-in-0'
      )}
    >
      {/* Left: selection info */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">
          {selectedCount}
          <span className="text-muted-foreground"> of </span>
          {totalCount}
          <span className="text-muted-foreground"> selected</span>
        </span>

        <div className="flex items-center gap-1">
          {selectedCount < totalCount && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onSelectAll}
              className="rounded-2xl text-xs"
            >
              <CheckSquare className="mr-1 h-3.5 w-3.5" />
              Select all
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onDeselectAll}
            className="rounded-2xl text-xs"
          >
            <Square className="mr-1 h-3.5 w-3.5" />
            Deselect
          </Button>
        </div>
      </div>

      {/* Right: action buttons */}
      <div className="flex items-center gap-2">
        {actions.map((action) => (
          <Button
            key={action.label}
            variant={action.variant ?? 'default'}
            size="sm"
            onClick={action.onClick}
            disabled={action.disabled || action.loading}
            className="rounded-2xl text-xs"
          >
            {action.loading && (
              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
            )}
            {action.label}
          </Button>
        ))}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  ProcessingStatusIndicator                                          */
/* ------------------------------------------------------------------ */

const statusConfig = {
  processing: {
    icon: Loader2,
    iconClass: 'animate-spin text-primary',
    bgClass: 'animate-pulse bg-primary/10',
    defaultLabel: 'Processing'
  },
  completed: {
    icon: CheckCircle2,
    iconClass: 'text-emerald-600 dark:text-emerald-400',
    bgClass: 'bg-emerald-500/10',
    defaultLabel: 'Completed'
  },
  failed: {
    icon: XCircle,
    iconClass: 'text-red-600 dark:text-red-400',
    bgClass: 'bg-red-500/10',
    defaultLabel: 'Failed'
  },
  queued: {
    icon: Clock3,
    iconClass: 'text-muted-foreground',
    bgClass: 'bg-muted/10',
    defaultLabel: 'Queued'
  }
} as const

export function ProcessingStatusIndicator({
  status,
  label,
  onRefresh,
  pollingActive
}: ProcessingStatusIndicatorProps) {
  const config = statusConfig[status]
  const Icon = config.icon
  const displayLabel = label ?? config.defaultLabel

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-2xl px-2.5 py-1 text-xs font-medium',
        config.bgClass
      )}
    >
      <Icon className={cn('h-3.5 w-3.5', config.iconClass)} />
      <span>{displayLabel}</span>

      {status === 'failed' && onRefresh && (
        <button
          type="button"
          onClick={onRefresh}
          className="ml-1 rounded-full p-0.5 transition-colors hover:bg-red-500/20"
          aria-label="Retry"
        >
          <RefreshCw className="h-3 w-3" />
        </button>
      )}

      {pollingActive && status === 'processing' && (
        <span className="ml-0.5 h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
      )}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/*  SelectableRow                                                      */
/* ------------------------------------------------------------------ */

export function SelectableRow({
  selected,
  onToggle,
  children
}: SelectableRowProps) {
  const CheckIcon = selected ? CheckSquare : Square

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-2xl px-3 py-2 transition-colors',
        selected ? 'bg-primary/5' : 'hover:bg-muted/10'
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
        aria-label={selected ? 'Deselect row' : 'Select row'}
      >
        <CheckIcon className="h-4 w-4" />
      </button>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}
