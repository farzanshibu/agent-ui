'use client'

import { useState } from 'react'
import { Filter, X, Plus, Loader2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

interface FilterField {
  name: string
  type?: 'string' | 'enum' | 'datetime' | 'number'
  operators?: string[]
  values?: string[]
}

interface FilterClause {
  field: string
  operator: string
  value: string
}

interface AdvancedFilterBuilderProps {
  schema: FilterField[]
  clauses: FilterClause[]
  onClausesChange: (clauses: FilterClause[]) => void
  logicalOperator: 'AND' | 'OR'
  onLogicalOperatorChange: (op: 'AND' | 'OR') => void
  onApply: () => void
  onReset: () => void
  isLoading?: boolean
}

interface FilterChipProps {
  label: string
  onRemove: () => void
}

const DEFAULT_OPERATORS = ['EQ', 'CONTAINS', 'IN', 'GTE', 'LTE']

export function FilterChip({ label, onRemove }: FilterChipProps) {
  return (
    <Badge
      variant="secondary"
      className="inline-flex items-center gap-1.5 rounded-2xl px-2.5 py-1 text-xs"
    >
      <span className="max-w-[180px] truncate">{label}</span>
      <button
        type="button"
        onClick={onRemove}
        className="ml-0.5 rounded-full p-0.5 transition-colors hover:bg-muted/40"
        aria-label={`Remove filter: ${label}`}
      >
        <X className="h-3 w-3" />
      </button>
    </Badge>
  )
}

export function AdvancedFilterBuilder({
  schema,
  clauses,
  onClausesChange,
  logicalOperator,
  onLogicalOperatorChange,
  onApply,
  onReset,
  isLoading = false
}: AdvancedFilterBuilderProps) {
  const [collapsed, setCollapsed] = useState(false)
  const uniqueSchema = schema.filter(
    (field, index, fields) =>
      fields.findIndex((candidate) => candidate.name === field.name) === index
  )

  const activeCount = clauses.filter((c) => c.field && c.value).length

  /* helpers */
  const fieldMeta = (name: string) => schema.find((f) => f.name === name)

  const updateClause = (idx: number, patch: Partial<FilterClause>) => {
    const next = clauses.map((c, i) => (i === idx ? { ...c, ...patch } : c))
    onClausesChange(next)
  }

  const addClause = () =>
    onClausesChange([...clauses, { field: '', operator: '', value: '' }])

  const removeClause = (idx: number) => {
    const next = clauses.filter((_, i) => i !== idx)
    onClausesChange(
      next.length ? next : [{ field: '', operator: '', value: '' }]
    )
  }

  const removeByIndex = (idx: number) => {
    const active = clauses.filter((c) => c.field && c.value)
    if (idx < 0 || idx >= active.length) return
    const target = active[idx]
    const realIdx = clauses.indexOf(target)
    if (realIdx !== -1) removeClause(realIdx)
  }

  /* render value input */
  const renderValueInput = (clause: FilterClause, idx: number) => {
    const meta = fieldMeta(clause.field)

    if (meta?.type === 'enum' && meta.values?.length) {
      return (
        <Select
          value={clause.value}
          onValueChange={(v) => updateClause(idx, { value: v })}
        >
          <SelectTrigger className="h-8 min-w-[140px] rounded-2xl text-xs">
            <SelectValue placeholder="Value" />
          </SelectTrigger>
          <SelectContent>
            {meta.values.map((v, valueIndex) => (
              <SelectItem key={`${v}-${valueIndex}`} value={v}>
                {v}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    }

    return (
      <Input
        type={meta?.type === 'datetime' ? 'datetime-local' : 'text'}
        placeholder="Value"
        value={clause.value}
        onChange={(e) => updateClause(idx, { value: e.target.value })}
        className="h-8 min-w-[140px] rounded-2xl text-xs"
      />
    )
  }

  return (
    <div className="space-y-3">
      {/* Header / collapse toggle */}
      <button
        type="button"
        onClick={() => setCollapsed((p) => !p)}
        className="flex w-full items-center gap-2 text-left"
      >
        <Filter className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
          Filters
        </span>
        {activeCount > 0 && (
          <Badge variant="outline" className="ml-1 rounded-2xl text-xs">
            {activeCount}
          </Badge>
        )}
      </button>

      {/* Builder rows */}
      {!collapsed && (
        <div className="space-y-2 rounded-2xl border bg-muted/10 p-4">
          {clauses.map((clause, idx) => (
            <div key={idx} className="flex flex-wrap items-center gap-2">
              {/* AND / OR badge between rows */}
              {idx > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    onLogicalOperatorChange(
                      logicalOperator === 'AND' ? 'OR' : 'AND'
                    )
                  }
                  className={cn(
                    'rounded-2xl px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider transition-colors',
                    logicalOperator === 'AND'
                      ? 'bg-primary/10 text-primary'
                      : 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
                  )}
                >
                  {logicalOperator}
                </button>
              )}

              {/* Field select */}
              <Select
                value={clause.field}
                onValueChange={(v) =>
                  updateClause(idx, { field: v, operator: '', value: '' })
                }
              >
                <SelectTrigger className="h-8 min-w-[130px] rounded-2xl text-xs">
                  <SelectValue placeholder="Field" />
                </SelectTrigger>
                <SelectContent>
                  {uniqueSchema.map((f) => (
                    <SelectItem key={f.name} value={f.name}>
                      {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Operator select */}
              <Select
                value={clause.operator}
                onValueChange={(v) => updateClause(idx, { operator: v })}
              >
                <SelectTrigger className="h-8 min-w-[110px] rounded-2xl text-xs">
                  <SelectValue placeholder="Operator" />
                </SelectTrigger>
                <SelectContent>
                  {(
                    fieldMeta(clause.field)?.operators ?? DEFAULT_OPERATORS
                  ).map((op) => (
                    <SelectItem key={op} value={op}>
                      {op}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Value */}
              {renderValueInput(clause, idx)}

              {/* Remove */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => removeClause(idx)}
                aria-label="Remove clause"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={addClause}
              className="rounded-2xl text-xs"
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              Add filter
            </Button>

            <div className="ml-auto flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={onReset}
                className="rounded-2xl text-xs"
                disabled={isLoading}
              >
                Reset
              </Button>
              <Button
                size="sm"
                onClick={onApply}
                className="rounded-2xl text-xs"
                disabled={isLoading}
              >
                {isLoading && (
                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                )}
                Apply
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Active filter chips */}
      {activeCount > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {clauses
            .filter((c) => c.field && c.value)
            .map((c, i) => (
              <FilterChip
                key={`${c.field}-${c.operator}-${c.value}-${i}`}
                label={`${c.field} ${c.operator} ${c.value}`}
                onRemove={() => removeByIndex(i)}
              />
            ))}
        </div>
      )}
    </div>
  )
}
