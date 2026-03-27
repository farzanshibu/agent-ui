'use client'

import { useEffect } from 'react'
import { useQueryState } from 'nuqs'

import { ChatArea } from '@/components/chat/ChatArea'
import useSessionLoader from '@/hooks/useSessionLoader'
import { useStore } from '@/store'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { SectionCard } from '@/components/studio/shared'

export function RunWorkbench({
  type,
  id,
  dbId
}: {
  type: 'agent' | 'team'
  id: string
  dbId?: string
}) {
  const [, setAgentId] = useQueryState('agent')
  const [, setTeamId] = useQueryState('team')
  const [sessionId, setSessionId] = useQueryState('session')
  const [, setDbId] = useQueryState('db_id')
  const setMode = useStore((state) => state.setMode)
  const setMessages = useStore((state) => state.setMessages)
  const sessionsData = useStore((state) => state.sessionsData)
  const isSessionsLoading = useStore((state) => state.isSessionsLoading)
  const { getSession, getSessions } = useSessionLoader()

  useEffect(() => {
    setMode(type)
    setDbId(dbId || '')
    setMessages([])
    if (type === 'agent') {
      setAgentId(id)
      setTeamId(null)
    } else {
      setTeamId(id)
      setAgentId(null)
    }
    void getSessions({
      entityType: type,
      agentId: type === 'agent' ? id : null,
      teamId: type === 'team' ? id : null,
      dbId: dbId || null
    })
  }, [
    dbId,
    getSessions,
    id,
    setAgentId,
    setDbId,
    setMessages,
    setMode,
    setTeamId,
    type
  ])

  return (
    <SectionCard
      title="Run"
      description="Use the existing streaming workbench for live execution against this component."
      action={
        <div className="flex items-center gap-2">
          <Select
            value={sessionId || 'new'}
            onValueChange={(value) => {
              if (value === 'new') {
                setSessionId(null)
                setMessages([])
                return
              }
              setSessionId(value)
              void getSession(
                {
                  entityType: type,
                  agentId: type === 'agent' ? id : null,
                  teamId: type === 'team' ? id : null,
                  dbId: dbId || null
                },
                value
              )
            }}
          >
            <SelectTrigger className="w-[220px]">
              <SelectValue
                placeholder={
                  isSessionsLoading ? 'Loading sessions...' : 'Select session'
                }
              />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="new">New session</SelectItem>
                {(sessionsData || []).map((session) => (
                  <SelectItem
                    key={session.session_id}
                    value={session.session_id}
                  >
                    {session.session_name || session.session_id}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={() => {
              setSessionId(null)
              setMessages([])
            }}
          >
            Reset
          </Button>
        </div>
      }
      className="overflow-hidden p-0"
    >
      <div className="h-[760px] rounded-b-2xl border-t bg-background">
        <ChatArea />
      </div>
    </SectionCard>
  )
}
