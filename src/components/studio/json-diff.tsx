'use client'

import { useMemo } from 'react'
import { Minus, Plus, Equal } from 'lucide-react'

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { safeJson } from '@/lib/studio/format'

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface JsonDiffViewerProps {
  before: unknown
  after: unknown
  beforeLabel?: string
  afterLabel?: string
}

interface JsonValueHighlightProps {
  value: unknown
}

type DiffLineKind = 'added' | 'removed' | 'unchanged'

interface DiffLine {
  kind: DiffLineKind
  beforeLineNo: number | null
  afterLineNo: number | null
  text: string
}

/* ------------------------------------------------------------------ */
/*  Simple LCS diff                                                   */
/* ------------------------------------------------------------------ */

function computeLcs(a: string[], b: string[]): DiffLine[] {
  const m = a.length
  const n = b.length

  // Build LCS table
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array<number>(n + 1).fill(0)
  )
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1] + 1
          : Math.max(dp[i - 1][j], dp[i][j - 1])
    }
  }

  // Backtrack to produce diff lines
  const result: DiffLine[] = []
  let i = m
  let j = n

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      result.push({
        kind: 'unchanged',
        beforeLineNo: i,
        afterLineNo: j,
        text: a[i - 1]
      })
      i--
      j--
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.push({
        kind: 'added',
        beforeLineNo: null,
        afterLineNo: j,
        text: b[j - 1]
      })
      j--
    } else {
      result.push({
        kind: 'removed',
        beforeLineNo: i,
        afterLineNo: null,
        text: a[i - 1]
      })
      i--
    }
  }

  return result.reverse()
}

/* ------------------------------------------------------------------ */
/*  JsonDiffViewer                                                    */
/* ------------------------------------------------------------------ */

export function JsonDiffViewer({
  before,
  after,
  beforeLabel = 'Before',
  afterLabel = 'After'
}: JsonDiffViewerProps) {
  const diff = useMemo(() => {
    const aLines = safeJson(before).split('\n')
    const bLines = safeJson(after).split('\n')
    return computeLcs(aLines, bLines)
  }, [before, after])

  const stats = useMemo(() => {
    let additions = 0
    let deletions = 0
    let unchanged = 0
    for (const line of diff) {
      if (line.kind === 'added') additions++
      else if (line.kind === 'removed') deletions++
      else unchanged++
    }
    return { additions, deletions, unchanged }
  }, [diff])

  return (
    <div className="space-y-3">
      {/* Summary header */}
      <div className="flex items-center gap-3 text-xs">
        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
          <Plus className="h-3 w-3" />
          {stats.additions} addition{stats.additions !== 1 ? 's' : ''}
        </span>
        <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
          <Minus className="h-3 w-3" />
          {stats.deletions} deletion{stats.deletions !== 1 ? 's' : ''}
        </span>
        <span className="flex items-center gap-1 text-muted-foreground">
          <Equal className="h-3 w-3" />
          {stats.unchanged} unchanged
        </span>
      </div>

      <Tabs defaultValue="side-by-side" className="w-full">
        <TabsList>
          <TabsTrigger value="side-by-side">Side by Side</TabsTrigger>
          <TabsTrigger value="unified">Unified</TabsTrigger>
        </TabsList>

        {/* Side-by-side view */}
        <TabsContent value="side-by-side">
          <div className="grid grid-cols-2 gap-2">
            {/* Labels */}
            <p className="mb-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">
              {beforeLabel}
            </p>
            <p className="mb-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">
              {afterLabel}
            </p>

            {/* Before pane */}
            <div className="max-h-96 overflow-auto rounded-2xl border bg-muted/10">
              <pre className="font-dmmono text-xs leading-5">
                {diff.map((line, idx) => {
                  if (line.kind === 'added') return null
                  const bg =
                    line.kind === 'removed' ? 'bg-red-500/10' : undefined
                  return (
                    <div key={idx} className={cn('flex', bg)}>
                      <span className="inline-block w-10 shrink-0 select-none pr-2 text-right text-muted-foreground/60">
                        {line.beforeLineNo ?? ''}
                      </span>
                      <span className="whitespace-pre">{line.text}</span>
                    </div>
                  )
                })}
              </pre>
            </div>

            {/* After pane */}
            <div className="max-h-96 overflow-auto rounded-2xl border bg-muted/10">
              <pre className="font-dmmono text-xs leading-5">
                {diff.map((line, idx) => {
                  if (line.kind === 'removed') return null
                  const bg =
                    line.kind === 'added' ? 'bg-green-500/10' : undefined
                  return (
                    <div key={idx} className={cn('flex', bg)}>
                      <span className="inline-block w-10 shrink-0 select-none pr-2 text-right text-muted-foreground/60">
                        {line.afterLineNo ?? ''}
                      </span>
                      <span className="whitespace-pre">{line.text}</span>
                    </div>
                  )
                })}
              </pre>
            </div>
          </div>
        </TabsContent>

        {/* Unified view */}
        <TabsContent value="unified">
          <div className="max-h-96 overflow-auto rounded-2xl border bg-muted/10">
            <pre className="font-dmmono text-xs leading-5">
              {diff.map((line, idx) => {
                let bg: string | undefined
                let prefix = ' '
                let textColor = ''

                if (line.kind === 'removed') {
                  bg = 'bg-red-500/10'
                  prefix = '-'
                  textColor = 'text-red-600 dark:text-red-400'
                } else if (line.kind === 'added') {
                  bg = 'bg-green-500/10'
                  prefix = '+'
                  textColor = 'text-emerald-600 dark:text-emerald-400'
                }

                return (
                  <div key={idx} className={cn('flex', bg)}>
                    <span className="inline-block w-10 shrink-0 select-none pr-2 text-right text-muted-foreground/60">
                      {line.beforeLineNo ?? ''}
                    </span>
                    <span className="inline-block w-10 shrink-0 select-none pr-2 text-right text-muted-foreground/60">
                      {line.afterLineNo ?? ''}
                    </span>
                    <span className={cn('whitespace-pre', textColor)}>
                      {prefix} {line.text}
                    </span>
                  </div>
                )
              })}
            </pre>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  JsonValueHighlight                                                */
/* ------------------------------------------------------------------ */

export function JsonValueHighlight({ value }: JsonValueHighlightProps) {
  if (value === null || value === undefined) {
    return <span className="italic text-muted-foreground">null</span>
  }

  if (typeof value === 'string') {
    return (
      <span className="text-emerald-600 dark:text-emerald-400">
        &quot;{value}&quot;
      </span>
    )
  }

  if (typeof value === 'number') {
    return (
      <span className="text-blue-600 dark:text-blue-400">{String(value)}</span>
    )
  }

  if (typeof value === 'boolean') {
    return (
      <span className="text-purple-600 dark:text-purple-400">
        {String(value)}
      </span>
    )
  }

  // Objects and arrays - render key/value pairs
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
    return (
      <span className="font-dmmono text-xs">
        {'{'}
        {entries.map(([key, val], idx) => (
          <span key={key} className="block pl-4">
            <span className="font-bold">&quot;{key}&quot;</span>
            {': '}
            <JsonValueHighlight value={val} />
            {idx < entries.length - 1 ? ',' : ''}
          </span>
        ))}
        {'}'}
      </span>
    )
  }

  return <span>{String(value)}</span>
}
