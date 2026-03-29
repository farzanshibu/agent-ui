'use client'

import { useState } from 'react'
import {
  Wrench,
  Cpu,
  Brain,
  Eye,
  Zap,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock3,
  MessageSquare,
  Database,
  BookOpen,
  Shield,
  AlertCircle
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import {
  formatDuration,
  formatNumber,
  formatDateTime,
  safeJson
} from '@/lib/studio/format'

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function CollapsibleSection({
  label,
  data,
  defaultOpen = false
}: {
  label: string
  data?: unknown
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  if (data === undefined || data === null) return null
  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 text-xs uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground"
      >
        {open ? (
          <ChevronDown className="h-3.5 w-3.5" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5" />
        )}
        {label}
      </button>
      {open && (
        <pre className="mt-1.5 max-h-64 overflow-auto rounded-lg bg-muted/20 p-3 font-dmmono text-xs leading-relaxed">
          {safeJson(data)}
        </pre>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status?: string }) {
  if (!status) return null
  const s = status.toLowerCase()
  if (s === 'completed' || s === 'success' || s === 'done')
    return (
      <Badge variant="success" className="gap-1">
        <CheckCircle2 className="h-3 w-3" /> {status}
      </Badge>
    )
  if (s === 'error' || s === 'failed')
    return (
      <Badge variant="danger" className="gap-1">
        <XCircle className="h-3 w-3" /> {status}
      </Badge>
    )
  return (
    <Badge variant="warning" className="gap-1">
      <Loader2 className="h-3 w-3 animate-spin" /> {status}
    </Badge>
  )
}

/* -------------------------------------------------------------------------- */
/*  EventTypeIcon                                                              */
/* -------------------------------------------------------------------------- */

export function EventTypeIcon({
  type,
  className
}: {
  type: string
  className?: string
}) {
  const cls = cn('h-4 w-4', className)
  switch (type.toUpperCase()) {
    case 'TOOL':
      return <Wrench className={cls} />
    case 'LLM':
      return <Cpu className={cls} />
    case 'MEMORY':
      return <Brain className={cls} />
    case 'REASONING':
      return <Eye className={cls} />
    case 'AGENT':
      return <Zap className={cls} />
    case 'WORKFLOW':
      return <Database className={cls} />
    case 'RUN':
      return <BookOpen className={cls} />
    case 'SHIELD':
    case 'GUARDRAIL':
      return <Shield className={cls} />
    default:
      return <MessageSquare className={cls} />
  }
}

/* -------------------------------------------------------------------------- */
/*  ToolCallCard                                                               */
/* -------------------------------------------------------------------------- */

export function ToolCallCard({
  name,
  args,
  result,
  status,
  durationMs,
  isExpanded = false
}: {
  name: string
  args?: unknown
  result?: unknown
  status?: string
  durationMs?: number
  isExpanded?: boolean
}) {
  const isPending =
    status &&
    !['completed', 'done', 'success', 'error', 'failed'].includes(
      status.toLowerCase()
    )

  return (
    <Card
      className={cn(
        'border-orange-500/20 bg-orange-500/5',
        isPending && 'animate-pulse'
      )}
    >
      <CardHeader className="flex flex-row items-center gap-3 p-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-500/15 text-orange-600 dark:text-orange-400">
          <Wrench className="h-4 w-4" />
        </div>
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <CardTitle className="text-sm font-semibold">{name}</CardTitle>
          <StatusBadge status={status} />
          {durationMs !== undefined && (
            <Badge variant="outline" className="gap-1 text-xs">
              <Clock3 className="h-3 w-3" /> {formatDuration(durationMs)}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0">
        <CollapsibleSection
          label="Arguments"
          data={args}
          defaultOpen={isExpanded}
        />
        <CollapsibleSection
          label="Result"
          data={result}
          defaultOpen={isExpanded}
        />
      </CardContent>
    </Card>
  )
}

/* -------------------------------------------------------------------------- */
/*  LLMSpanCard                                                                */
/* -------------------------------------------------------------------------- */

export function LLMSpanCard({
  model,
  provider,
  inputTokens,
  outputTokens,
  durationMs,
  prompts,
  response,
  isExpanded = false
}: {
  model?: string
  provider?: string
  inputTokens?: number
  outputTokens?: number
  durationMs?: number
  prompts?: unknown
  response?: unknown
  isExpanded?: boolean
}) {
  const total = (inputTokens ?? 0) + (outputTokens ?? 0)
  const inputPct = total > 0 ? ((inputTokens ?? 0) / total) * 100 : 50

  return (
    <Card className="border-purple-500/20 bg-purple-500/5">
      <CardHeader className="flex flex-row items-center gap-3 p-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-500/15 text-purple-600 dark:text-purple-400">
          <Cpu className="h-4 w-4" />
        </div>
        <div className="flex flex-1 flex-wrap items-center gap-2">
          {model && (
            <CardTitle className="text-sm font-semibold">{model}</CardTitle>
          )}
          {provider && <Badge variant="secondary">{provider}</Badge>}
          {durationMs !== undefined && (
            <Badge variant="outline" className="gap-1 text-xs">
              <Clock3 className="h-3 w-3" /> {formatDuration(durationMs)}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0">
        {total > 0 && (
          <div className="mb-3">
            <div className="mb-1 flex justify-between text-xs text-muted-foreground">
              <span>Input: {formatNumber(inputTokens)}</span>
              <span>Output: {formatNumber(outputTokens)}</span>
            </div>
            <div className="flex h-2 overflow-hidden rounded-full bg-muted/20">
              <div
                className="bg-purple-500/60 transition-all"
                style={{ width: `${inputPct}%` }}
              />
              <div className="flex-1 bg-purple-300/40" />
            </div>
          </div>
        )}
        <CollapsibleSection
          label="Prompts"
          data={prompts}
          defaultOpen={isExpanded}
        />
        <CollapsibleSection
          label="Response"
          data={response}
          defaultOpen={isExpanded}
        />
      </CardContent>
    </Card>
  )
}

/* -------------------------------------------------------------------------- */
/*  MemoryUpdateChip                                                           */
/* -------------------------------------------------------------------------- */

export function MemoryUpdateChip({
  type,
  memoryId,
  content
}: {
  type: 'started' | 'completed'
  memoryId?: string
  content?: string
}) {
  const isStarted = type === 'started'

  return (
    <span
      className={cn(
        'group relative inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors',
        isStarted
          ? 'animate-pulse bg-amber-500/15 text-amber-700 dark:text-amber-400'
          : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
      )}
    >
      <Brain className="h-3 w-3" />
      {memoryId ? `Memory ${memoryId}` : 'Memory'}
      {content && (
        <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 hidden max-w-xs -translate-x-1/2 whitespace-pre-wrap rounded-lg border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md group-hover:block">
          {content.length > 200 ? content.slice(0, 200) + '...' : content}
        </span>
      )}
    </span>
  )
}

/* -------------------------------------------------------------------------- */
/*  ReasoningBlock                                                             */
/* -------------------------------------------------------------------------- */

export function ReasoningBlock({
  content,
  isStreaming = false
}: {
  content: string
  isStreaming?: boolean
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <Card className="border-muted/30 bg-muted/10">
      <CardHeader className="flex flex-row items-center gap-2 p-3">
        <Eye className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
          Reasoning
        </span>
        {isStreaming && (
          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
        )}
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="ml-auto text-xs text-muted-foreground hover:text-foreground"
        >
          {expanded ? 'Collapse' : 'Expand'}
        </button>
      </CardHeader>
      <CardContent className="px-3 pb-3 pt-0">
        <div
          className={cn(
            'overflow-auto text-sm italic leading-relaxed text-muted-foreground',
            !expanded && 'max-h-32'
          )}
        >
          {content}
          {isStreaming && (
            <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-foreground/60 align-middle" />
          )}
        </div>
      </CardContent>
    </Card>
  )
}

/* -------------------------------------------------------------------------- */
/*  AgentSpanCard                                                              */
/* -------------------------------------------------------------------------- */

export function AgentSpanCard({
  name,
  input,
  output,
  status,
  durationMs,
  isExpanded = false
}: {
  name?: string
  input?: unknown
  output?: unknown
  status?: string
  durationMs?: number
  isExpanded?: boolean
}) {
  return (
    <Card className="border-blue-500/20 bg-blue-500/5">
      <CardHeader className="flex flex-row items-center gap-3 p-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/15 text-blue-600 dark:text-blue-400">
          <Zap className="h-4 w-4" />
        </div>
        <div className="flex flex-1 flex-wrap items-center gap-2">
          {name && (
            <CardTitle className="text-sm font-semibold">{name}</CardTitle>
          )}
          <StatusBadge status={status} />
          {durationMs !== undefined && (
            <Badge variant="outline" className="gap-1 text-xs">
              <Clock3 className="h-3 w-3" /> {formatDuration(durationMs)}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0">
        <CollapsibleSection
          label="Input"
          data={input}
          defaultOpen={isExpanded}
        />
        <CollapsibleSection
          label="Output"
          data={output}
          defaultOpen={isExpanded}
        />
      </CardContent>
    </Card>
  )
}

/* -------------------------------------------------------------------------- */
/*  RunEventTimeline                                                           */
/* -------------------------------------------------------------------------- */

const EVENT_DOT_COLORS: Record<string, string> = {
  RunStarted: 'bg-blue-500',
  RunContent: 'bg-gray-400 dark:bg-gray-500',
  ToolCallStarted: 'bg-orange-500',
  ToolCallDone: 'bg-emerald-500',
  MemoryUpdateStarted: 'bg-purple-500',
  MemoryUpdateCompleted: 'bg-purple-500',
  RunCompleted: 'bg-emerald-500',
  RunError: 'bg-red-500'
}

function getDotColor(event: string) {
  return EVENT_DOT_COLORS[event] ?? 'bg-gray-400 dark:bg-gray-500'
}

export function RunEventTimeline({
  events
}: {
  events: Array<{
    event: string
    timestamp?: string
    data?: Record<string, unknown>
  }>
}) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)

  return (
    <div className="relative space-y-0">
      {events.map((ev, idx) => {
        const isOpen = expandedIdx === idx
        return (
          <div key={idx} className="relative flex gap-3 pb-4 last:pb-0">
            {/* vertical line */}
            {idx < events.length - 1 && (
              <div className="absolute bottom-0 left-[7px] top-5 w-px bg-border" />
            )}
            {/* dot */}
            <div
              className={cn(
                'relative z-10 mt-1 h-[15px] w-[15px] shrink-0 rounded-full border-2 border-background',
                getDotColor(ev.event)
              )}
            />
            {/* content */}
            <div className="min-w-0 flex-1">
              <button
                type="button"
                onClick={() => setExpandedIdx(isOpen ? null : idx)}
                className="flex w-full items-center gap-2 text-left"
              >
                {isOpen ? (
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                )}
                <span className="text-sm font-medium">{ev.event}</span>
                {ev.timestamp && (
                  <span className="ml-auto text-xs text-muted-foreground">
                    {formatDateTime(ev.timestamp)}
                  </span>
                )}
              </button>
              {isOpen && ev.data && (
                <div className="mt-2">
                  <TimelineEventDetail event={ev.event} data={ev.data} />
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function TimelineEventDetail({
  event,
  data
}: {
  event: string
  data: Record<string, unknown>
}) {
  if (event === 'ToolCallStarted' || event === 'ToolCallDone') {
    return (
      <ToolCallCard
        name={(data.name as string) ?? 'tool'}
        args={data.args}
        result={data.result}
        status={event === 'ToolCallDone' ? 'completed' : 'pending'}
        durationMs={data.durationMs as number | undefined}
      />
    )
  }
  if (event === 'MemoryUpdateStarted' || event === 'MemoryUpdateCompleted') {
    return (
      <MemoryUpdateChip
        type={event === 'MemoryUpdateCompleted' ? 'completed' : 'started'}
        memoryId={data.memoryId as string | undefined}
        content={data.content as string | undefined}
      />
    )
  }
  if (event === 'RunError') {
    return (
      <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
        <AlertCircle className="h-4 w-4" />
        {(data.message as string) ?? safeJson(data)}
      </div>
    )
  }
  // Default: show raw data
  return (
    <pre className="max-h-48 overflow-auto rounded-lg bg-muted/20 p-3 font-dmmono text-xs leading-relaxed">
      {safeJson(data)}
    </pre>
  )
}
