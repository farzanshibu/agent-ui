/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle
} from '@/components/ui/sheet'
import { TextArea } from '@/components/ui/textarea'
import { JsonBlock, StatusBadge } from '@/components/studio/shared'
import { useStudioClient } from '@/lib/studio/api'

type AnyRecord = Record<string, any>

function parseOptionalJson(input: string, fallback: AnyRecord = {}) {
  const trimmed = input.trim()
  if (!trimmed) return fallback
  return JSON.parse(trimmed) as AnyRecord
}

export function EvalRunDialog({
  open,
  onOpenChange
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { request } = useStudioClient()
  const queryClient = useQueryClient()
  const [targetType, setTargetType] = useState<'agent' | 'team'>('agent')
  const [targetId, setTargetId] = useState('')
  const [evalType, setEvalType] = useState('accuracy')
  const [form, setForm] = useState({
    name: '',
    input: '',
    expectedOutput: '',
    criteria: '',
    scoringStrategy: 'binary',
    threshold: '7',
    numIterations: '5',
    warmupRuns: '1',
    expectedToolCalls: '',
    modelId: '',
    modelProvider: '',
    additionalGuidelines: '',
    additionalContext: ''
  })

  const targetsQuery = useQuery({
    queryKey: ['eval-targets'],
    queryFn: async () => {
      const [agents, teams] = await Promise.all([
        request<AnyRecord[]>('/agents'),
        request<AnyRecord[]>('/teams')
      ])
      return { agents, teams }
    },
    enabled: open
  })

  useEffect(() => {
    if (!open) return
    setForm({
      name: '',
      input: '',
      expectedOutput: '',
      criteria: '',
      scoringStrategy: 'binary',
      threshold: '7',
      numIterations: '5',
      warmupRuns: '1',
      expectedToolCalls: '',
      modelId: '',
      modelProvider: '',
      additionalGuidelines: '',
      additionalContext: ''
    })
  }, [open])

  useEffect(() => {
    if (!open) return
    const targetList =
      targetType === 'agent'
        ? targetsQuery.data?.agents || []
        : targetsQuery.data?.teams || []
    const firstId =
      targetList[0]?.id ||
      targetList[0]?.agent_id ||
      targetList[0]?.team_id ||
      ''
    setTargetId((current) => current || firstId)
  }, [open, targetType, targetsQuery.data])

  const targetOptions = useMemo(
    () =>
      targetType === 'agent'
        ? targetsQuery.data?.agents || []
        : targetsQuery.data?.teams || [],
    [targetType, targetsQuery.data]
  )

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!targetId || !form.input.trim()) {
        throw new Error('Target and input prompt are required')
      }

      const payload: AnyRecord = {
        eval_type: evalType,
        input: form.input,
        name: form.name || undefined,
        model_id: form.modelId || undefined,
        model_provider: form.modelProvider || undefined,
        additional_guidelines: form.additionalGuidelines || undefined,
        additional_context: form.additionalContext || undefined
      }

      if (targetType === 'agent') {
        payload.agent_id = targetId
      } else {
        payload.team_id = targetId
      }

      if (evalType === 'accuracy') {
        payload.expected_output = form.expectedOutput
      }
      if (evalType === 'agent_as_judge') {
        payload.criteria = form.criteria
        payload.scoring_strategy = form.scoringStrategy
        payload.threshold = Number(form.threshold || 0)
      }
      if (evalType === 'performance') {
        payload.num_iterations = Number(form.numIterations || 1)
        payload.warmup_runs = Number(form.warmupRuns || 0)
      }
      if (evalType === 'reliability') {
        payload.expected_tool_calls = form.expectedToolCalls
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean)
      }

      return request('/eval-runs', { method: 'POST', body: payload })
    },
    onSuccess: async () => {
      toast.success('Evaluation submitted')
      await queryClient.invalidateQueries({ queryKey: ['eval-runs'] })
      onOpenChange(false)
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : 'Unable to create evaluation'
      )
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Run Evaluation</DialogTitle>
          <DialogDescription>
            Configure a new eval run against an agent or team.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Target type</label>
              <Select
                value={targetType}
                onValueChange={(value: 'agent' | 'team') => {
                  setTargetType(value)
                  setTargetId('')
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="agent">Agent</SelectItem>
                    <SelectItem value="team">Team</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Target</label>
              <Select value={targetId} onValueChange={setTargetId}>
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      targetsQuery.isLoading
                        ? 'Loading targets...'
                        : 'Select target'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {targetOptions.map((item) => {
                      const id = item.id || item.agent_id || item.team_id
                      return (
                        <SelectItem key={id} value={id}>
                          {item.name || id}
                        </SelectItem>
                      )
                    })}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Eval type</label>
              <Select value={evalType} onValueChange={setEvalType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="accuracy">Accuracy</SelectItem>
                    <SelectItem value="agent_as_judge">
                      Agent as judge
                    </SelectItem>
                    <SelectItem value="performance">Performance</SelectItem>
                    <SelectItem value="reliability">Reliability</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Name</label>
              <Input
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    name: event.target.value
                  }))
                }
                placeholder="Optional eval run name"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Input prompt</label>
              <TextArea
                value={form.input}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    input: event.target.value
                  }))
                }
                className="min-h-[140px]"
                placeholder="Prompt or test case input"
              />
            </div>
          </div>

          <div className="flex flex-col gap-4">
            {evalType === 'accuracy' ? (
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">Expected output</label>
                <TextArea
                  value={form.expectedOutput}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      expectedOutput: event.target.value
                    }))
                  }
                  className="min-h-[140px]"
                />
              </div>
            ) : null}

            {evalType === 'agent_as_judge' ? (
              <>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium">Criteria</label>
                  <TextArea
                    value={form.criteria}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        criteria: event.target.value
                      }))
                    }
                    className="min-h-[120px]"
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium">
                      Scoring strategy
                    </label>
                    <Select
                      value={form.scoringStrategy}
                      onValueChange={(value) =>
                        setForm((current) => ({
                          ...current,
                          scoringStrategy: value
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="binary">Binary</SelectItem>
                          <SelectItem value="numeric">Numeric</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium">Threshold</label>
                    <Input
                      value={form.threshold}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          threshold: event.target.value
                        }))
                      }
                    />
                  </div>
                </div>
              </>
            ) : null}

            {evalType === 'performance' ? (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium">Iterations</label>
                  <Input
                    value={form.numIterations}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        numIterations: event.target.value
                      }))
                    }
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium">Warmup runs</label>
                  <Input
                    value={form.warmupRuns}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        warmupRuns: event.target.value
                      }))
                    }
                  />
                </div>
              </div>
            ) : null}

            {evalType === 'reliability' ? (
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">
                  Expected tool calls
                </label>
                <Input
                  value={form.expectedToolCalls}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      expectedToolCalls: event.target.value
                    }))
                  }
                  placeholder="comma,separated,tool_names"
                />
              </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">Model provider</label>
                <Input
                  value={form.modelProvider}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      modelProvider: event.target.value
                    }))
                  }
                  placeholder="openai"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">Model ID</label>
                <Input
                  value={form.modelId}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      modelId: event.target.value
                    }))
                  }
                  placeholder="gpt-4o-mini"
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">
                Additional guidelines
              </label>
              <TextArea
                value={form.additionalGuidelines}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    additionalGuidelines: event.target.value
                  }))
                }
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? (
              <Loader2 className="animate-spin" data-icon="inline-start" />
            ) : null}
            Run evaluation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

type ScheduleFormState = {
  name: string
  endpoint: string
  method: string
  cronExpression: string
  timezone: string
  payload: string
  timeoutSeconds: string
  maxRetries: string
  retryDelaySeconds: string
  description: string
}

function createScheduleState(initial?: AnyRecord): ScheduleFormState {
  return {
    name: initial?.name || '',
    endpoint: initial?.endpoint || '',
    method: initial?.method || 'POST',
    cronExpression: initial?.cron_expression || initial?.cron || '0 9 * * *',
    timezone: initial?.timezone || 'UTC',
    payload: JSON.stringify(initial?.payload || {}, null, 2),
    timeoutSeconds: String(initial?.timeout_seconds ?? 3600),
    maxRetries: String(initial?.max_retries ?? 0),
    retryDelaySeconds: String(initial?.retry_delay_seconds ?? 60),
    description: initial?.description || ''
  }
}

export function ScheduleEditorDialog({
  open,
  onOpenChange,
  schedule,
  onSuccess
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  schedule?: AnyRecord | null
  onSuccess?: () => void
}) {
  const { request } = useStudioClient()
  const queryClient = useQueryClient()
  const [form, setForm] = useState<ScheduleFormState>(
    createScheduleState(schedule || undefined)
  )

  useEffect(() => {
    if (!open) return
    setForm(createScheduleState(schedule || undefined))
  }, [open, schedule])

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name,
        endpoint: form.endpoint,
        method: form.method,
        cron_expression: form.cronExpression,
        timezone: form.timezone,
        payload: parseOptionalJson(form.payload),
        timeout_seconds: Number(form.timeoutSeconds || 0),
        max_retries: Number(form.maxRetries || 0),
        retry_delay_seconds: Number(form.retryDelaySeconds || 0),
        description: form.description || undefined
      }

      if (schedule?.schedule_id || schedule?.id) {
        return request(`/schedules/${schedule.schedule_id || schedule.id}`, {
          method: 'PATCH',
          body: payload
        })
      }

      return request('/schedules', {
        method: 'POST',
        body: payload
      })
    },
    onSuccess: async () => {
      toast.success(schedule ? 'Schedule updated' : 'Schedule created')
      await queryClient.invalidateQueries({ queryKey: ['schedules'] })
      onSuccess?.()
      onOpenChange(false)
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : 'Unable to save schedule'
      )
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {schedule ? 'Edit Schedule' : 'Create Schedule'}
          </DialogTitle>
          <DialogDescription>
            Configure a cron-based API call against AgentOS.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Name</label>
            <Input
              value={form.name}
              onChange={(event) =>
                setForm((current) => ({ ...current, name: event.target.value }))
              }
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Method</label>
            <Select
              value={form.method}
              onValueChange={(value) =>
                setForm((current) => ({ ...current, method: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="POST">POST</SelectItem>
                  <SelectItem value="GET">GET</SelectItem>
                  <SelectItem value="PUT">PUT</SelectItem>
                  <SelectItem value="DELETE">DELETE</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2 md:col-span-2">
            <label className="text-sm font-medium">Endpoint</label>
            <Input
              value={form.endpoint}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  endpoint: event.target.value
                }))
              }
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Cron expression</label>
            <Input
              value={form.cronExpression}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  cronExpression: event.target.value
                }))
              }
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Timezone</label>
            <Input
              value={form.timezone}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  timezone: event.target.value
                }))
              }
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Timeout seconds</label>
            <Input
              value={form.timeoutSeconds}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  timeoutSeconds: event.target.value
                }))
              }
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Max retries</label>
            <Input
              value={form.maxRetries}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  maxRetries: event.target.value
                }))
              }
            />
          </div>
          <div className="flex flex-col gap-2 md:col-span-2">
            <label className="text-sm font-medium">Payload JSON</label>
            <TextArea
              value={form.payload}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  payload: event.target.value
                }))
              }
              className="min-h-[180px]"
            />
          </div>
          <div className="flex flex-col gap-2 md:col-span-2">
            <label className="text-sm font-medium">Description</label>
            <TextArea
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  description: event.target.value
                }))
              }
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? (
              <Loader2 className="animate-spin" data-icon="inline-start" />
            ) : null}
            {schedule ? 'Save changes' : 'Create schedule'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function ComponentCreateDialog({
  open,
  onOpenChange,
  onSuccess
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}) {
  const { request } = useStudioClient()
  const queryClient = useQueryClient()
  const [type, setType] = useState('agent')
  const [componentId, setComponentId] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [metadataText, setMetadataText] = useState('{}')
  const [configText, setConfigText] = useState('{}')

  useEffect(() => {
    if (!open) return
    setType('agent')
    setComponentId('')
    setName('')
    setDescription('')
    setMetadataText('{}')
    setConfigText('{}')
  }, [open])

  const mutation = useMutation({
    mutationFn: async () => {
      return request('/components', {
        method: 'POST',
        body: {
          type,
          component_id: componentId || undefined,
          name: name || undefined,
          description: description || undefined,
          metadata: parseOptionalJson(metadataText),
          config: parseOptionalJson(configText)
        }
      })
    },
    onSuccess: async () => {
      toast.success('Component created')
      await queryClient.invalidateQueries({ queryKey: ['components'] })
      onSuccess?.()
      onOpenChange(false)
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : 'Unable to create component'
      )
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Component</DialogTitle>
          <DialogDescription>
            Create a versioned agent, team, or workflow component definition.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Type</label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="agent">Agent</SelectItem>
                  <SelectItem value="team">Team</SelectItem>
                  <SelectItem value="workflow">Workflow</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Component ID</label>
            <Input
              value={componentId}
              onChange={(event) => setComponentId(event.target.value)}
              placeholder="Optional explicit component identifier"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Name</label>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Description</label>
            <Input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Metadata JSON</label>
            <TextArea
              value={metadataText}
              onChange={(event) => setMetadataText(event.target.value)}
              className="font-dmmono min-h-[220px]"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Initial Config JSON</label>
            <TextArea
              value={configText}
              onChange={(event) => setConfigText(event.target.value)}
              className="font-dmmono min-h-[220px]"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? (
              <Loader2 className="animate-spin" data-icon="inline-start" />
            ) : null}
            Create component
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function ComponentVersionDialog({
  open,
  onOpenChange,
  componentId,
  currentConfig,
  onSuccess
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  componentId: string
  currentConfig: unknown
  onSuccess?: () => void
}) {
  const { request } = useStudioClient()
  const queryClient = useQueryClient()
  const [version, setVersion] = useState('')
  const [label, setLabel] = useState('')
  const [notes, setNotes] = useState('')
  const [stage, setStage] = useState('draft')
  const [setCurrent, setSetCurrent] = useState(false)
  const [configText, setConfigText] = useState(
    JSON.stringify(currentConfig || {}, null, 2)
  )

  useEffect(() => {
    if (!open) return
    setVersion('')
    setLabel('')
    setNotes('')
    setStage('draft')
    setSetCurrent(false)
    setConfigText(JSON.stringify(currentConfig || {}, null, 2))
  }, [currentConfig, open])

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        version: version || undefined,
        label: label || undefined,
        notes: notes || undefined,
        stage,
        set_current: setCurrent,
        config: parseOptionalJson(configText)
      }

      return request(`/components/${componentId}/configs`, {
        method: 'POST',
        body: payload
      })
    },
    onSuccess: async () => {
      toast.success('Component version created')
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['components', componentId]
        }),
        queryClient.invalidateQueries({
          queryKey: ['components', componentId, 'configs']
        }),
        queryClient.invalidateQueries({ queryKey: ['components'] })
      ])
      onSuccess?.()
      onOpenChange(false)
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : 'Unable to create version'
      )
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Component Version</DialogTitle>
          <DialogDescription>
            Clone the current config, edit JSON, and create a new draft or
            published version.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Version override</label>
            <Input
              value={version}
              onChange={(event) => setVersion(event.target.value)}
              placeholder="Optional custom version"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Stage</label>
            <Select value={stage} onValueChange={setStage}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Label</label>
            <Input
              value={label}
              onChange={(event) => setLabel(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">
              Set current immediately
            </label>
            <Select
              value={setCurrent ? 'yes' : 'no'}
              onValueChange={(value) => setSetCurrent(value === 'yes')}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="no">No</SelectItem>
                  <SelectItem value="yes">Yes</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2 md:col-span-2">
            <label className="text-sm font-medium">Notes</label>
            <TextArea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2 md:col-span-2">
            <label className="text-sm font-medium">Config JSON</label>
            <TextArea
              value={configText}
              onChange={(event) => setConfigText(event.target.value)}
              className="font-dmmono min-h-[320px]"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? (
              <Loader2 className="animate-spin" data-icon="inline-start" />
            ) : null}
            Create version
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function ApprovalReviewSheet({
  approvalId,
  open,
  onOpenChange,
  onSuccess
}: {
  approvalId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}) {
  const { request } = useStudioClient()
  const queryClient = useQueryClient()
  const [resolvedBy, setResolvedBy] = useState('')
  const [resolutionData, setResolutionData] = useState('{}')

  useEffect(() => {
    if (!open) return
    setResolvedBy('')
    setResolutionData('{}')
  }, [open])

  const detailQuery = useQuery({
    queryKey: ['approvals', approvalId],
    queryFn: () => request<AnyRecord>(`/approvals/${approvalId}`),
    enabled: open && !!approvalId
  })

  const resolveMutation = useMutation({
    mutationFn: async (status: 'approved' | 'rejected') => {
      return request(`/approvals/${approvalId}/resolve`, {
        method: 'POST',
        body: {
          status,
          resolved_by: resolvedBy || undefined,
          resolution_data: parseOptionalJson(resolutionData)
        }
      })
    },
    onSuccess: async (_, status) => {
      toast.success(`Approval ${status}`)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['approvals'] }),
        queryClient.invalidateQueries({ queryKey: ['approvals-count'] }),
        queryClient.invalidateQueries({ queryKey: ['approvals-count', 'page'] })
      ])
      onSuccess?.()
      onOpenChange(false)
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : 'Unable to resolve approval'
      )
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return request(`/approvals/${approvalId}`, { method: 'DELETE' })
    },
    onSuccess: async () => {
      toast.success('Approval deleted')
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['approvals'] }),
        queryClient.invalidateQueries({ queryKey: ['approvals-count'] }),
        queryClient.invalidateQueries({ queryKey: ['approvals-count', 'page'] })
      ])
      onSuccess?.()
      onOpenChange(false)
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : 'Unable to delete approval'
      )
    }
  })

  const detail = detailQuery.data || {}

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>
            {detail.approval_id || approvalId || 'Approval detail'}
          </SheetTitle>
          <SheetDescription>
            Review tool arguments, context, and resolve the approval gate.
          </SheetDescription>
        </SheetHeader>
        {detailQuery.isLoading ? (
          <div className="flex min-h-[240px] items-center justify-center">
            <Loader2 className="animate-spin" />
          </div>
        ) : (
          <div className="mt-6 flex flex-col gap-6">
            <div className="flex flex-wrap gap-2">
              <StatusBadge status={detail.status} />
              <StatusBadge status={detail.run_status} />
            </div>
            <div className="grid gap-6">
              <JsonBlock
                data={{
                  tool_name: detail.tool_name || detail.tool?.name,
                  context: {
                    agent_id: detail.agent_id,
                    team_id: detail.team_id,
                    workflow_id: detail.workflow_id,
                    run_id: detail.run_id,
                    session_id: detail.session_id,
                    user_id: detail.user_id
                  },
                  requirements: detail.requirements || [],
                  expires_at: detail.expires_at || null
                }}
              />
              <JsonBlock data={detail.tool_args || detail.tool?.args || {}} />
              <div className="grid gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium">Resolved by</label>
                  <Input
                    value={resolvedBy}
                    onChange={(event) => setResolvedBy(event.target.value)}
                    placeholder="Operator name"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium">
                    Resolution data JSON
                  </label>
                  <TextArea
                    value={resolutionData}
                    onChange={(event) => setResolutionData(event.target.value)}
                    className="min-h-[180px]"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
        <SheetFooter className="mt-6">
          <Button
            variant="destructive"
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
          >
            Delete
          </Button>
          <Button
            variant="outline"
            onClick={() => resolveMutation.mutate('rejected')}
            disabled={resolveMutation.isPending}
          >
            Reject
          </Button>
          <Button
            onClick={() => resolveMutation.mutate('approved')}
            disabled={resolveMutation.isPending}
          >
            Approve
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

export function MemoryEditorDialog({
  open,
  onOpenChange,
  memory,
  onSuccess
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  memory?: AnyRecord | null
  onSuccess?: () => void
}) {
  const { request } = useStudioClient()
  const queryClient = useQueryClient()
  const [content, setContent] = useState('')
  const [userId, setUserId] = useState('')
  const [agentId, setAgentId] = useState('')
  const [topics, setTopics] = useState('')

  useEffect(() => {
    if (!open) return
    setContent(memory?.content || memory?.memory || '')
    setUserId(memory?.user_id || '')
    setAgentId(memory?.agent_id || '')
    const incomingTopics = Array.isArray(memory?.topics)
      ? memory.topics
      : Array.isArray(memory?.topic_tags)
        ? memory.topic_tags
        : []
    setTopics(
      incomingTopics
        .map((topic: unknown) =>
          typeof topic === 'string'
            ? topic
            : (topic as AnyRecord).name || (topic as AnyRecord).topic || ''
        )
        .filter(Boolean)
        .join(', ')
    )
  }, [memory, open])

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        content,
        user_id: userId,
        agent_id: agentId || undefined,
        topics: topics
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean)
      }

      if (memory?.memory_id || memory?.id) {
        return request(`/memories/${memory.memory_id || memory.id}`, {
          method: 'PATCH',
          body: payload
        })
      }

      return request('/memories', {
        method: 'POST',
        body: payload
      })
    },
    onSuccess: async () => {
      toast.success(memory ? 'Memory updated' : 'Memory created')
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['memories'] }),
        queryClient.invalidateQueries({ queryKey: ['memory-stats'] })
      ])
      onSuccess?.()
      onOpenChange(false)
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : 'Unable to save memory'
      )
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{memory ? 'Edit Memory' : 'Create Memory'}</DialogTitle>
          <DialogDescription>
            Create or update a persistent memory entry for a user.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">User ID</label>
            <Input
              value={userId}
              onChange={(event) => setUserId(event.target.value)}
              placeholder="Required user identifier"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Agent ID</label>
            <Input
              value={agentId}
              onChange={(event) => setAgentId(event.target.value)}
              placeholder="Optional agent scope"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Topics</label>
            <Input
              value={topics}
              onChange={(event) => setTopics(event.target.value)}
              placeholder="comma,separated,topics"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Content</label>
            <TextArea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              className="min-h-[220px]"
              placeholder="Memory content"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? (
              <Loader2 className="animate-spin" data-icon="inline-start" />
            ) : null}
            {memory ? 'Save memory' : 'Create memory'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function MemoryOptimizeDialog({
  open,
  onOpenChange,
  defaultUserId,
  onSuccess
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultUserId?: string
  onSuccess?: () => void
}) {
  const { request } = useStudioClient()
  const queryClient = useQueryClient()
  const [userId, setUserId] = useState(defaultUserId || '')
  const [modelRef, setModelRef] = useState('openai:gpt-4o-mini')
  const [applyMode, setApplyMode] = useState<'preview' | 'apply'>('preview')
  const [result, setResult] = useState<unknown>(null)

  useEffect(() => {
    if (!open) return
    setUserId(defaultUserId || '')
    setModelRef('openai:gpt-4o-mini')
    setApplyMode('preview')
    setResult(null)
  }, [defaultUserId, open])

  const mutation = useMutation({
    mutationFn: async () => {
      const [provider, model] = modelRef.includes(':')
        ? modelRef.split(':')
        : ['', modelRef]

      return request('/optimize-memories', {
        method: 'POST',
        body: {
          user_id: userId,
          model_provider: provider || undefined,
          model_id: model || undefined,
          apply: applyMode === 'apply'
        }
      })
    },
    onSuccess: async (response) => {
      setResult(response)
      toast.success(
        applyMode === 'apply'
          ? 'Memory optimization applied'
          : 'Memory optimization preview generated'
      )
      if (applyMode === 'apply') {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['memories'] }),
          queryClient.invalidateQueries({ queryKey: ['memory-stats'] })
        ])
        onSuccess?.()
      }
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : 'Unable to optimize memories'
      )
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Optimize Memories</DialogTitle>
          <DialogDescription>
            Preview or apply AI-assisted deduplication and compression for a
            user.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">User ID</label>
            <Input
              value={userId}
              onChange={(event) => setUserId(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Model</label>
            <Input
              value={modelRef}
              onChange={(event) => setModelRef(event.target.value)}
              placeholder="provider:model_id"
            />
          </div>
          <div className="flex flex-col gap-2 md:col-span-2">
            <label className="text-sm font-medium">Mode</label>
            <Select
              value={applyMode}
              onValueChange={(value: 'preview' | 'apply') =>
                setApplyMode(value)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="preview">Preview only</SelectItem>
                  <SelectItem value="apply">Apply optimization</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="mt-4">
          <JsonBlock
            data={
              result || {
                message: 'Run optimize to inspect before/after results.'
              }
            }
            className="min-h-[240px]"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? (
              <Loader2 className="animate-spin" data-icon="inline-start" />
            ) : null}
            {applyMode === 'apply'
              ? 'Apply optimization'
              : 'Preview optimization'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function ConfirmActionButton({
  title,
  description,
  confirmLabel,
  onConfirm,
  children,
  variant = 'destructive',
  disabled
}: {
  title: string
  description: string
  confirmLabel: string
  onConfirm: () => void
  children: React.ReactNode
  variant?: 'destructive' | 'default'
  disabled?: boolean
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          size="sm"
          variant={variant === 'destructive' ? 'destructive' : 'outline'}
          disabled={disabled}
        >
          {children}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export function SessionCreateDialog({
  open,
  onOpenChange,
  onSuccess
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}) {
  const { request } = useStudioClient()
  const queryClient = useQueryClient()
  const [type, setType] = useState<'agent' | 'team' | 'workflow'>('agent')
  const [componentId, setComponentId] = useState('')
  const [sessionName, setSessionName] = useState('')
  const [userId, setUserId] = useState('')
  const [summary, setSummary] = useState('')
  const [metadataText, setMetadataText] = useState('{}')
  const [stateText, setStateText] = useState('{}')

  const targetsQuery = useQuery({
    queryKey: ['session-targets'],
    enabled: open,
    queryFn: async () => {
      const [agents, teams, workflows] = await Promise.all([
        request<AnyRecord[]>('/agents'),
        request<AnyRecord[]>('/teams'),
        request<AnyRecord[]>('/workflows')
      ])
      return { agents, teams, workflows }
    }
  })

  useEffect(() => {
    if (!open) return
    setType('agent')
    setComponentId('')
    setSessionName('')
    setUserId('')
    setSummary('')
    setMetadataText('{}')
    setStateText('{}')
  }, [open])

  useEffect(() => {
    if (!open) return
    const options =
      type === 'agent'
        ? targetsQuery.data?.agents || []
        : type === 'team'
          ? targetsQuery.data?.teams || []
          : targetsQuery.data?.workflows || []
    const firstId =
      options[0]?.id ||
      options[0]?.agent_id ||
      options[0]?.team_id ||
      options[0]?.workflow_id ||
      ''
    setComponentId((current) => current || firstId)
  }, [open, targetsQuery.data, type])

  const targetOptions =
    type === 'agent'
      ? targetsQuery.data?.agents || []
      : type === 'team'
        ? targetsQuery.data?.teams || []
        : targetsQuery.data?.workflows || []

  const createMutation = useMutation({
    mutationFn: async () => {
      return request('/sessions', {
        method: 'POST',
        body: {
          type,
          component_id: componentId || undefined,
          user_id: userId || undefined,
          session_name: sessionName || undefined,
          summary: summary || undefined,
          metadata: parseOptionalJson(metadataText),
          session_state: parseOptionalJson(stateText)
        }
      })
    },
    onSuccess: async () => {
      toast.success('Session created')
      await queryClient.invalidateQueries({ queryKey: ['sessions'] })
      onSuccess?.()
      onOpenChange(false)
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : 'Unable to create session'
      )
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Session</DialogTitle>
          <DialogDescription>
            Create an empty session scoped to an agent, team, or workflow.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Type</label>
            <Select
              value={type}
              onValueChange={(value: 'agent' | 'team' | 'workflow') => {
                setType(value)
                setComponentId('')
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="agent">Agent</SelectItem>
                  <SelectItem value="team">Team</SelectItem>
                  <SelectItem value="workflow">Workflow</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Component</label>
            <Select value={componentId} onValueChange={setComponentId}>
              <SelectTrigger>
                <SelectValue placeholder="Select component" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {targetOptions.map((item) => {
                    const id =
                      item.id ||
                      item.agent_id ||
                      item.team_id ||
                      item.workflow_id
                    return (
                      <SelectItem key={id} value={id}>
                        {item.name || id}
                      </SelectItem>
                    )
                  })}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Session name</label>
            <Input
              value={sessionName}
              onChange={(event) => setSessionName(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">User ID</label>
            <Input
              value={userId}
              onChange={(event) => setUserId(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2 md:col-span-2">
            <label className="text-sm font-medium">Summary</label>
            <TextArea
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Session state JSON</label>
            <TextArea
              value={stateText}
              onChange={(event) => setStateText(event.target.value)}
              className="min-h-[180px]"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Metadata JSON</label>
            <TextArea
              value={metadataText}
              onChange={(event) => setMetadataText(event.target.value)}
              className="min-h-[180px]"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? (
              <Loader2 className="animate-spin" data-icon="inline-start" />
            ) : null}
            Create session
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function SessionRenameDialog({
  open,
  onOpenChange,
  session,
  onSuccess
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  session?: AnyRecord | null
  onSuccess?: () => void
}) {
  const { request } = useStudioClient()
  const queryClient = useQueryClient()
  const [sessionName, setSessionName] = useState('')

  useEffect(() => {
    if (!open) return
    setSessionName(session?.session_name || '')
  }, [open, session])

  const renameMutation = useMutation({
    mutationFn: async () => {
      return request(`/sessions/${session?.session_id || session?.id}/rename`, {
        method: 'POST',
        body: { session_name: sessionName }
      })
    },
    onSuccess: async () => {
      toast.success('Session renamed')
      await queryClient.invalidateQueries({ queryKey: ['sessions'] })
      onSuccess?.()
      onOpenChange(false)
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : 'Unable to rename session'
      )
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Rename Session</DialogTitle>
          <DialogDescription>
            Update the name for the selected session.
          </DialogDescription>
        </DialogHeader>
        <Input
          value={sessionName}
          onChange={(event) => setSessionName(event.target.value)}
          placeholder="Session name"
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => renameMutation.mutate()}
            disabled={renameMutation.isPending}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

type KnowledgeMode = 'file' | 'url' | 'text' | 'remote'
type KnowledgeQuery = {
  db_id?: string
  knowledge_id?: string
}

export function KnowledgeContentDialog({
  open,
  onOpenChange,
  initialMode,
  initialRemotePayload,
  knowledgeQuery,
  onSuccess
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialMode?: KnowledgeMode
  initialRemotePayload?: AnyRecord | null
  knowledgeQuery?: KnowledgeQuery
  onSuccess?: () => void
}) {
  const { request } = useStudioClient()
  const queryClient = useQueryClient()
  const [mode, setMode] = useState<KnowledgeMode>('file')
  const [file, setFile] = useState<File | null>(null)
  const [urls, setUrls] = useState('')
  const [rawText, setRawText] = useState('')
  const [remotePayload, setRemotePayload] = useState('{}')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [metadataText, setMetadataText] = useState('{}')
  const [reader, setReader] = useState('')
  const [chunker, setChunker] = useState('')
  const [chunkSize, setChunkSize] = useState('')
  const [chunkOverlap, setChunkOverlap] = useState('')

  const configQuery = useQuery({
    queryKey: ['knowledge-config', 'dialog'],
    enabled: open,
    queryFn: () =>
      request<AnyRecord>('/knowledge/config', { query: knowledgeQuery })
  })

  useEffect(() => {
    if (!open) return
    setMode(initialMode || 'file')
    setFile(null)
    setUrls('')
    setRawText('')
    setRemotePayload(
      JSON.stringify(initialRemotePayload || {}, null, 2) || '{}'
    )
    setName('')
    setDescription('')
    setMetadataText('{}')
    setReader('')
    setChunker('')
    setChunkSize('')
    setChunkOverlap('')
  }, [initialMode, initialRemotePayload, open])

  const createMutation = useMutation({
    mutationFn: async () => {
      if (mode === 'remote') {
        return request('/knowledge/remote-content', {
          method: 'POST',
          query: knowledgeQuery,
          body: {
            ...parseOptionalJson(remotePayload),
            name: name || undefined,
            description: description || undefined,
            metadata: parseOptionalJson(metadataText)
          }
        })
      }

      const formData = new FormData()
      if (mode === 'file' && file) formData.append('file', file)
      if (mode === 'url') {
        urls
          .split('\n')
          .map((value) => value.trim())
          .filter(Boolean)
          .forEach((value) => {
            formData.append('urls', value)
            formData.append('url', value)
          })
      }
      if (mode === 'text') formData.append('text', rawText)
      if (name) formData.append('name', name)
      if (description) formData.append('description', description)
      formData.append('metadata', metadataText || '{}')
      if (reader) formData.append('reader', reader)
      if (chunker) formData.append('chunker', chunker)
      if (chunkSize) formData.append('chunk_size', chunkSize)
      if (chunkOverlap) formData.append('chunk_overlap', chunkOverlap)

      return request('/knowledge/content', {
        method: 'POST',
        query: knowledgeQuery,
        body: formData
      })
    },
    onSuccess: async () => {
      toast.success('Knowledge content submitted')
      await queryClient.invalidateQueries({ queryKey: ['knowledge-content'] })
      await queryClient.invalidateQueries({ queryKey: ['knowledge-config'] })
      onSuccess?.()
      onOpenChange(false)
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : 'Unable to submit content'
      )
    }
  })

  const readers = Array.isArray(configQuery.data?.readers)
    ? configQuery.data?.readers
    : Array.isArray(configQuery.data?.readersForType)
      ? configQuery.data?.readersForType
      : []
  const chunkers = Array.isArray(configQuery.data?.chunkers)
    ? configQuery.data?.chunkers
    : []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload Knowledge Content</DialogTitle>
          <DialogDescription>
            Submit files, URLs, raw text, or remote-source payloads to the
            knowledge base.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Upload mode</label>
            <Select
              value={mode}
              onValueChange={(value: KnowledgeMode) => setMode(value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="file">File upload</SelectItem>
                  <SelectItem value="url">URL</SelectItem>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="remote">Remote source</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          {mode === 'file' ? (
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">File</label>
              <Input
                type="file"
                onChange={(event) => setFile(event.target.files?.[0] || null)}
              />
            </div>
          ) : null}

          {mode === 'url' ? (
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">URLs</label>
              <TextArea
                value={urls}
                onChange={(event) => setUrls(event.target.value)}
                className="min-h-[160px]"
                placeholder="One URL per line"
              />
            </div>
          ) : null}

          {mode === 'text' ? (
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Raw text</label>
              <TextArea
                value={rawText}
                onChange={(event) => setRawText(event.target.value)}
                className="min-h-[220px]"
              />
            </div>
          ) : null}

          {mode === 'remote' ? (
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">
                Remote source payload JSON
              </label>
              <TextArea
                value={remotePayload}
                onChange={(event) => setRemotePayload(event.target.value)}
                className="min-h-[220px]"
                placeholder='{"source_id":"...", "files":["..."]}'
              />
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Name</label>
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Description</label>
              <Input
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Reader</label>
              <Select
                value={reader || '__none__'}
                onValueChange={(value) =>
                  setReader(value === '__none__' ? '' : value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Default reader" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="__none__">Default</SelectItem>
                    {readers.map((item: AnyRecord, index: number) => {
                      const value =
                        item.id || item.name || item.reader || `reader-${index}`
                      return (
                        <SelectItem key={value} value={value}>
                          {value}
                        </SelectItem>
                      )
                    })}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Chunker</label>
              <Select
                value={chunker || '__none__'}
                onValueChange={(value) =>
                  setChunker(value === '__none__' ? '' : value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Default chunker" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="__none__">Default</SelectItem>
                    {chunkers.map((item: AnyRecord, index: number) => {
                      const value =
                        item.id ||
                        item.name ||
                        item.chunker ||
                        `chunker-${index}`
                      return (
                        <SelectItem key={value} value={value}>
                          {value}
                        </SelectItem>
                      )
                    })}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Chunk size</label>
              <Input
                value={chunkSize}
                onChange={(event) => setChunkSize(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Chunk overlap</label>
              <Input
                value={chunkOverlap}
                onChange={(event) => setChunkOverlap(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2 md:col-span-2">
              <label className="text-sm font-medium">Metadata JSON</label>
              <TextArea
                value={metadataText}
                onChange={(event) => setMetadataText(event.target.value)}
                className="min-h-[160px]"
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? (
              <Loader2 className="animate-spin" data-icon="inline-start" />
            ) : null}
            Submit content
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function KnowledgeMetadataDialog({
  open,
  onOpenChange,
  content,
  knowledgeQuery,
  onSuccess
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  content?: AnyRecord | null
  knowledgeQuery?: KnowledgeQuery
  onSuccess?: () => void
}) {
  const { request } = useStudioClient()
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [metadataText, setMetadataText] = useState('{}')

  useEffect(() => {
    if (!open) return
    setName(content?.name || '')
    setDescription(content?.description || '')
    setMetadataText(JSON.stringify(content?.metadata || {}, null, 2))
  }, [content, open])

  const mutation = useMutation({
    mutationFn: async () => {
      return request(
        `/knowledge/content/${content?.content_id || content?.id}`,
        {
          method: 'PATCH',
          query: knowledgeQuery,
          body: {
            name: name || undefined,
            description: description || undefined,
            metadata: parseOptionalJson(metadataText)
          }
        }
      )
    },
    onSuccess: async () => {
      toast.success('Knowledge content updated')
      await queryClient.invalidateQueries({ queryKey: ['knowledge-content'] })
      onSuccess?.()
      onOpenChange(false)
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : 'Unable to update content'
      )
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Content Metadata</DialogTitle>
          <DialogDescription>
            Update display metadata for the selected knowledge item.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Name</label>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Description</label>
            <TextArea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Metadata JSON</label>
            <TextArea
              value={metadataText}
              onChange={(event) => setMetadataText(event.target.value)}
              className="min-h-[220px]"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
          >
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
