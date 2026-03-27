'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'

import { COMMAND_CENTER_ITEMS } from '@/lib/studio/config'
import { useStudioClient } from '@/lib/studio/api'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut
} from '@/components/ui/command'

type SearchItem = {
  id: string
  label: string
  href: string
  group: string
}

export function CommandPalette({
  open,
  onOpenChange
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const { request } = useStudioClient()
  const [search, setSearch] = useState('')

  const { data: results = [] } = useQuery({
    queryKey: ['command-center', search],
    enabled: open,
    queryFn: async () => {
      const [agents, sessions, traces] = await Promise.allSettled([
        request<unknown[]>('/agents'),
        request<{ data?: unknown[] } | unknown[]>('/sessions', {
          query: { limit: 5, session_name: search || undefined }
        }),
        request<unknown[]>('/traces', { query: { limit: 5 } })
      ])

      const mapped: SearchItem[] = []
      COMMAND_CENTER_ITEMS.forEach((item) => {
        mapped.push({
          id: item.href,
          label: item.label,
          href: item.href,
          group: 'Navigate'
        })
      })

      const agentRows =
        agents.status === 'fulfilled' && Array.isArray(agents.value)
          ? (agents.value as Record<string, unknown>[])
          : []
      agentRows.slice(0, 5).forEach((agent) => {
        mapped.push({
          id: String(agent.id || agent.agent_id),
          label: String(agent.name || agent.id || 'Agent'),
          href: `/agents/${agent.id || agent.agent_id}`,
          group: 'Agents'
        })
      })

      const sessionPayload =
        sessions.status === 'fulfilled'
          ? (sessions.value as { data?: unknown[] } | unknown[])
          : []
      const sessionRows = Array.isArray(sessionPayload)
        ? (sessionPayload as Record<string, unknown>[])
        : Array.isArray(sessionPayload?.data)
          ? (sessionPayload.data as Record<string, unknown>[])
          : []
      sessionRows.slice(0, 5).forEach((session) => {
        mapped.push({
          id: String(session.session_id || session.id),
          label: String(session.session_name || session.id || 'Session'),
          href: `/sessions/${session.session_id || session.id}`,
          group: 'Sessions'
        })
      })

      const traceRows =
        traces.status === 'fulfilled' && Array.isArray(traces.value)
          ? (traces.value as Record<string, unknown>[])
          : []
      traceRows.slice(0, 5).forEach((trace) => {
        mapped.push({
          id: String(trace.trace_id || trace.id),
          label: String(trace.name || trace.trace_id || 'Trace'),
          href: `/traces/${trace.trace_id || trace.id}`,
          group: 'Traces'
        })
      })

      return mapped
    }
  })

  const groupedResults = useMemo(() => {
    return results
      .filter((item) => item.label.toLowerCase().includes(search.toLowerCase()))
      .reduce<Record<string, SearchItem[]>>((acc, item) => {
        acc[item.group] = [...(acc[item.group] || []), item]
        return acc
      }, {})
  }, [results, search])

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        value={search}
        onValueChange={setSearch}
        placeholder="Search agents, sessions, traces, and routes..."
      />
      <CommandList>
        <CommandEmpty>No matching results.</CommandEmpty>
        {Object.entries(groupedResults).map(([group, items], index) => (
          <div key={group}>
            {index ? <CommandSeparator /> : null}
            <CommandGroup heading={group}>
              {items.map((item) => (
                <CommandItem
                  key={`${group}-${item.id}`}
                  onSelect={() => {
                    onOpenChange(false)
                    router.push(item.href)
                  }}
                >
                  <span>{item.label}</span>
                  <CommandShortcut>↵</CommandShortcut>
                </CommandItem>
              ))}
            </CommandGroup>
          </div>
        ))}
      </CommandList>
    </CommandDialog>
  )
}
