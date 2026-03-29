'use client'

import { useState } from 'react'
import {
  CheckCircle2,
  XCircle,
  ChevronRight,
  Timer,
  Calendar
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { formatDuration, safeJson } from '@/lib/studio/format'

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface WorkflowStep {
  id?: string
  name?: string
  description?: string
  step_type?: string
  type?: string
  status?: string
  duration_ms?: number
  output?: unknown
}

interface WorkflowStepGraphProps {
  steps: WorkflowStep[]
  activeStepIndex?: number
}

interface CronHumanizerProps {
  expression: string
  className?: string
}

interface StepResultAccordionProps {
  steps: Array<{
    name?: string
    status?: string
    output?: unknown
    duration_ms?: number
  }>
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function statusVariant(status?: string) {
  switch (status?.toLowerCase()) {
    case 'completed':
    case 'success':
      return 'success' as const
    case 'failed':
    case 'error':
      return 'danger' as const
    case 'running':
    case 'in_progress':
      return 'warning' as const
    default:
      return 'secondary' as const
  }
}

function statusIcon(status?: string) {
  switch (status?.toLowerCase()) {
    case 'completed':
    case 'success':
      return <CheckCircle2 className="h-4 w-4 text-emerald-500" />
    case 'failed':
    case 'error':
      return <XCircle className="h-4 w-4 text-red-500" />
    default:
      return null
  }
}

/* ------------------------------------------------------------------ */
/*  WorkflowStepGraph                                                 */
/* ------------------------------------------------------------------ */

export function WorkflowStepGraph({
  steps,
  activeStepIndex
}: WorkflowStepGraphProps) {
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set())

  const toggleStep = (index: number) => {
    setExpandedSteps((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  if (steps.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        No workflow steps to display.
      </p>
    )
  }

  return (
    <div className="relative space-y-0">
      {steps.map((step, index) => {
        const isActive = index === activeStepIndex
        const isCompleted =
          step.status?.toLowerCase() === 'completed' ||
          step.status?.toLowerCase() === 'success'
        const isFailed =
          step.status?.toLowerCase() === 'failed' ||
          step.status?.toLowerCase() === 'error'
        const isExpanded = expandedSteps.has(index)
        const isLast = index === steps.length - 1

        return (
          <div key={step.id ?? index} className="flex gap-4">
            {/* Left: step number circle + connector line */}
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-medium',
                  isCompleted &&
                    'border-emerald-500 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
                  isFailed &&
                    'border-red-500 bg-red-500/15 text-red-600 dark:text-red-400',
                  isActive &&
                    !isCompleted &&
                    !isFailed &&
                    'border-primary bg-primary/15 text-primary',
                  !isCompleted &&
                    !isFailed &&
                    !isActive &&
                    'border-muted-foreground/30 bg-muted/20 text-muted-foreground'
                )}
              >
                {isCompleted ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : isFailed ? (
                  <XCircle className="h-4 w-4" />
                ) : (
                  index + 1
                )}
              </div>
              {!isLast && (
                <div className="min-h-[1.5rem] w-px flex-1 bg-muted-foreground/20" />
              )}
            </div>

            {/* Right: step card */}
            <div className="flex-1 pb-4">
              <Card
                className={cn(
                  'rounded-2xl transition-shadow',
                  isActive &&
                    'border-primary shadow-[0_0_12px_-3px] shadow-primary/25'
                )}
              >
                <CardContent className="p-4">
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {step.name ?? `Step ${index + 1}`}
                      </p>
                      {step.description && (
                        <p className="text-xs text-muted-foreground">
                          {step.description}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {(step.step_type ?? step.type) && (
                        <Badge variant="outline" className="text-[10px]">
                          {step.step_type ?? step.type}
                        </Badge>
                      )}
                      {step.status && (
                        <Badge
                          variant={statusVariant(step.status)}
                          className="text-[10px]"
                        >
                          {step.status}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Duration */}
                  {step.duration_ms != null && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                      <Timer className="h-3 w-3" />
                      {formatDuration(step.duration_ms)}
                    </div>
                  )}

                  {/* Collapsible output */}
                  {step.output != null && (
                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={() => toggleStep(index)}
                        className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                      >
                        <ChevronRight
                          className={cn(
                            'h-3 w-3 transition-transform',
                            isExpanded && 'rotate-90'
                          )}
                        />
                        <span className="uppercase tracking-[0.18em]">
                          Output
                        </span>
                      </button>
                      {isExpanded && (
                        <pre className="mt-2 max-h-64 overflow-auto rounded-2xl bg-muted/20 p-3 font-dmmono text-xs leading-5">
                          {safeJson(step.output)}
                        </pre>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  CronHumanizer                                                     */
/* ------------------------------------------------------------------ */

function humanizeCron(expr: string): string | null {
  const parts = expr.trim().split(/\s+/)
  if (parts.length !== 5) return null

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts

  // Every minute
  if (expr.trim() === '* * * * *') return 'Every minute'

  // Every N minutes
  const everyNMin = minute.match(/^\*\/(\d+)$/)
  if (
    everyNMin &&
    hour === '*' &&
    dayOfMonth === '*' &&
    month === '*' &&
    dayOfWeek === '*'
  ) {
    const n = Number(everyNMin[1])
    return n === 1 ? 'Every minute' : `Every ${n} minutes`
  }

  // Every N hours
  const everyNHour = hour.match(/^\*\/(\d+)$/)
  if (
    minute === '0' &&
    everyNHour &&
    dayOfMonth === '*' &&
    month === '*' &&
    dayOfWeek === '*'
  ) {
    const n = Number(everyNHour[1])
    return n === 1 ? 'Every hour' : `Every ${n} hours`
  }

  // Every hour
  if (
    minute === '0' &&
    hour === '*' &&
    dayOfMonth === '*' &&
    month === '*' &&
    dayOfWeek === '*'
  ) {
    return 'Every hour'
  }

  // Specific time patterns
  if (
    dayOfMonth === '*' &&
    month === '*' &&
    minute.match(/^\d+$/) &&
    hour.match(/^\d+$/)
  ) {
    const h = Number(hour)
    const m = Number(minute)
    const ampm = h >= 12 ? 'PM' : 'AM'
    const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h
    const timeStr =
      h === 0 && m === 0
        ? 'midnight'
        : `${displayHour}:${String(m).padStart(2, '0')} ${ampm}`

    // Weekdays only
    if (dayOfWeek === '1-5') return `Weekdays at ${timeStr}`
    // Weekends
    if (dayOfWeek === '0,6' || dayOfWeek === '6,0')
      return `Weekends at ${timeStr}`
    // Every day
    if (dayOfWeek === '*') return `Every day at ${timeStr}`
  }

  // First day of every month
  if (
    minute === '0' &&
    hour === '0' &&
    dayOfMonth === '1' &&
    month === '*' &&
    dayOfWeek === '*'
  ) {
    return 'First day of every month'
  }

  return null
}

export function CronHumanizer({ expression, className }: CronHumanizerProps) {
  const humanized = humanizeCron(expression)

  return (
    <span
      className={cn('inline-flex items-center gap-1.5 text-sm', className)}
      title={expression}
    >
      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
      <span>{humanized ?? expression}</span>
    </span>
  )
}

/* ------------------------------------------------------------------ */
/*  StepResultAccordion                                               */
/* ------------------------------------------------------------------ */

export function StepResultAccordion({ steps }: StepResultAccordionProps) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set())

  const toggle = (index: number) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  if (steps.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        No step results.
      </p>
    )
  }

  return (
    <div className="divide-y rounded-2xl border bg-muted/10">
      {steps.map((step, index) => {
        const isOpen = expanded.has(index)

        return (
          <div key={index}>
            <button
              type="button"
              onClick={() => toggle(index)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/20"
            >
              <ChevronRight
                className={cn(
                  'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
                  isOpen && 'rotate-90'
                )}
              />
              <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  {statusIcon(step.status)}
                  <span className="truncate text-sm font-medium">
                    {step.name ?? `Step ${index + 1}`}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {step.duration_ms != null && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Timer className="h-3 w-3" />
                      {formatDuration(step.duration_ms)}
                    </span>
                  )}
                  {step.status && (
                    <Badge
                      variant={statusVariant(step.status)}
                      className="text-[10px]"
                    >
                      {step.status}
                    </Badge>
                  )}
                </div>
              </div>
            </button>

            {isOpen && step.output != null && (
              <div className="px-4 pb-4 pl-11">
                <pre className="max-h-64 overflow-auto rounded-2xl bg-muted/20 p-3 font-dmmono text-xs leading-5">
                  {safeJson(step.output)}
                </pre>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
