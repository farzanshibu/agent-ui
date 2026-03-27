'use client'

import { useState, useCallback, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'

// ---------------------------------------------------------------------------
// useStatusPolling
// ---------------------------------------------------------------------------

export function useStatusPolling<T>(
  queryKey: unknown[],
  fetchFn: () => Promise<T>,
  options: {
    isComplete: (data: T) => boolean
    intervalMs?: number
    enabled?: boolean
    onComplete?: (data: T) => void
  }
): { data: T | undefined; isLoading: boolean; error: unknown } {
  const { isComplete, intervalMs = 5000, enabled = true, onComplete } = options
  const [completed, setCompleted] = useState(false)

  const { data, isLoading, error } = useQuery<T>({
    queryKey,
    queryFn: fetchFn,
    enabled: enabled && !completed,
    refetchInterval: completed ? false : intervalMs,
  })

  if (data !== undefined && isComplete(data) && !completed) {
    setCompleted(true)
    onComplete?.(data)
  }

  return { data, isLoading, error }
}

// ---------------------------------------------------------------------------
// useBulkSelection
// ---------------------------------------------------------------------------

export function useBulkSelection<T>(
  items: T[],
  getId: (item: T) => string
): {
  selectedIds: Set<string>
  isSelected: (item: T) => boolean
  toggle: (item: T) => void
  selectAll: () => void
  deselectAll: () => void
  selectedCount: number
  selectedItems: T[]
} {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const isSelected = useCallback(
    (item: T) => selectedIds.has(getId(item)),
    [selectedIds, getId]
  )

  const toggle = useCallback(
    (item: T) => {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        const id = getId(item)
        if (next.has(id)) {
          next.delete(id)
        } else {
          next.add(id)
        }
        return next
      })
    },
    [getId]
  )

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(items.map(getId)))
  }, [items, getId])

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  const selectedCount = selectedIds.size

  const selectedItems = useMemo(
    () => items.filter((item) => selectedIds.has(getId(item))),
    [items, selectedIds, getId]
  )

  return { selectedIds, isSelected, toggle, selectAll, deselectAll, selectedCount, selectedItems }
}

// ---------------------------------------------------------------------------
// useFilterState
// ---------------------------------------------------------------------------

interface FilterClause {
  field: string
  operator: string
  value: string
}

export function useFilterState(initialField?: string) {
  const makeEmptyClause = useCallback(
    (field?: string): FilterClause => ({ field: field ?? '', operator: 'eq', value: '' }),
    []
  )

  const [clauses, setClauses] = useState<FilterClause[]>([makeEmptyClause(initialField)])
  const [logicalOperator, setLogicalOperator] = useState<'AND' | 'OR'>('AND')

  const addClause = useCallback(
    (field?: string) => {
      setClauses((prev) => [...prev, makeEmptyClause(field)])
    },
    [makeEmptyClause]
  )

  const removeClause = useCallback((index: number) => {
    setClauses((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const updateClause = useCallback(
    (index: number, updates: Partial<FilterClause>) => {
      setClauses((prev) =>
        prev.map((clause, i) => (i === index ? { ...clause, ...updates } : clause))
      )
    },
    []
  )

  const resetClauses = useCallback(() => {
    setClauses([makeEmptyClause(initialField)])
  }, [makeEmptyClause, initialField])

  const activeClauseCount = useMemo(
    () => clauses.filter((c) => c.value.trim() !== '').length,
    [clauses]
  )

  return {
    clauses,
    logicalOperator,
    setClauses,
    setLogicalOperator,
    addClause,
    removeClause,
    updateClause,
    resetClauses,
    activeClauseCount,
  }
}

// ---------------------------------------------------------------------------
// useCollapsible
// ---------------------------------------------------------------------------

export function useCollapsible(defaultOpen = false) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  const toggle = useCallback(() => setIsOpen((prev) => !prev), [])
  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])

  return { isOpen, toggle, open, close }
}
