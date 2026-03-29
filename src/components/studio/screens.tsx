/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowUpRight,
  Gauge,
  GitBranch,
  PlayCircle,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Users
} from 'lucide-react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'
import { toast } from 'sonner'

import Sidebar from '@/components/chat/Sidebar/Sidebar'
import { ChatArea } from '@/components/chat/ChatArea'
import {
  ApprovalReviewSheet,
  ComponentCreateDialog,
  ComponentVersionDialog,
  ConfirmActionButton,
  EvalRunDialog,
  KnowledgeContentDialog,
  KnowledgeMetadataDialog,
  MemoryEditorDialog,
  MemoryOptimizeDialog,
  SessionCreateDialog,
  SessionRenameDialog,
  ScheduleEditorDialog
} from '@/components/studio/actions'
import { RunWorkbench } from '@/components/studio/workbench'
import {
  EmptyState,
  ErrorPanel,
  JsonBlock,
  KeyValueGrid,
  LinkButton,
  LoadingPanel,
  MetricCard,
  PageHeader,
  SectionCard,
  SimpleDataTable,
  StatusBadge,
  TokenPill
} from '@/components/studio/shared'
import {
  EventTypeIcon,
  ToolCallCard,
  LLMSpanCard,
  AgentSpanCard,
  RunEventTimeline,
  ReasoningBlock
} from '@/components/studio/event-renderers'
import { AdvancedFilterBuilder } from '@/components/studio/filters'
import {
  BulkSelectionBar,
  ProcessingStatusIndicator,
  SelectableRow
} from '@/components/studio/bulk-actions'
import { JsonDiffViewer } from '@/components/studio/json-diff'
import {
  WorkflowStepGraph,
  CronHumanizer,
  StepResultAccordion
} from '@/components/studio/workflow-graph'
import { useBulkSelection, useFilterState } from '@/lib/studio/hooks'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TextArea } from '@/components/ui/textarea'
import { useStudioClient } from '@/lib/studio/api'
import {
  formatDateTime,
  formatDuration,
  formatNumber,
  formatRelativeTime,
  normalizeArray,
  safeJson,
  toTitleCase
} from '@/lib/studio/format'

type AnyRecord = Record<string, any>

const CHART_COLORS = [
  '#1A56DB',
  '#059669',
  '#D97706',
  '#DC2626',
  '#7C3AED',
  '#14B8A6'
]

function useStudioQuery<T>(
  queryKey: unknown[],
  path: string,
  query?: Record<string, string | number | boolean | undefined>
) {
  const { request } = useStudioClient()

  return useQuery({
    queryKey,
    queryFn: () => request<T>(path, { query })
  })
}

function normalizeResourceList(payload: unknown): AnyRecord[] {
  return normalizeArray(payload as AnyRecord[] | { data?: AnyRecord[] }).map(
    (item) => item as AnyRecord
  )
}

function normalizeNestedList(payload: unknown, keys: string[]) {
  if (!payload || typeof payload !== 'object') {
    return normalizeResourceList(payload)
  }

  const record = payload as AnyRecord
  for (const key of keys) {
    if (key in record) {
      return normalizeResourceList(record[key])
    }
  }

  return normalizeResourceList(payload)
}

function getComponentHref(record: AnyRecord) {
  const value =
    record.component_id ||
    record.agent_id ||
    record.team_id ||
    record.workflow_id
  if (!value) return null

  if (record.agent_id || record.type === 'agent') {
    return `/agents/${encodeURIComponent(String(value))}`
  }
  if (record.team_id || record.type === 'team') {
    return `/teams/${encodeURIComponent(String(value))}`
  }
  if (record.workflow_id || record.type === 'workflow') {
    return `/workflows/${encodeURIComponent(String(value))}`
  }

  return null
}

function getPreviewText(record: AnyRecord | null | undefined) {
  if (!record) return null

  const candidate =
    record.preview ||
    record.snippet ||
    record.content_preview ||
    record.content_excerpt ||
    record.excerpt ||
    record.text ||
    record.summary

  if (typeof candidate === 'string' && candidate.trim()) {
    return candidate
  }

  return null
}

function ChartPanel({
  title,
  description,
  children
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <SectionCard
      title={title}
      description={description}
      className="min-h-[360px]"
    >
      <div className="h-[280px]">{children}</div>
    </SectionCard>
  )
}

function ResourceCard({
  title,
  id,
  description,
  badges,
  href,
  footer
}: {
  title: string
  id: string
  description?: string
  badges?: React.ReactNode
  href: string
  footer?: React.ReactNode
}) {
  return (
    <Card className="h-full transition-transform hover:-translate-y-1">
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-xl">{title}</CardTitle>
            <div className="font-dmmono text-muted-foreground text-xs">
              {id}
            </div>
          </div>
          <Button variant="ghost" size="icon" asChild>
            <Link href={href}>
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
        {badges ? <div className="flex flex-wrap gap-2">{badges}</div> : null}
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground line-clamp-3 text-sm">
          {description || 'No description provided by AgentOS.'}
        </p>
        {footer}
      </CardContent>
    </Card>
  )
}

export function DashboardScreen() {
  const healthQuery = useStudioQuery<AnyRecord>(['health'], '/health')
  const configQuery = useStudioQuery<AnyRecord>(['config'], '/config')
  const metricsQuery = useStudioQuery<AnyRecord[] | { data?: AnyRecord[] }>(
    ['metrics', 'dashboard'],
    '/metrics'
  )
  const approvalsQuery = useStudioQuery<AnyRecord>(
    ['approvals-count'],
    '/approvals/count'
  )
  const sessionsQuery = useStudioQuery<AnyRecord[] | { data?: AnyRecord[] }>(
    ['sessions', 'recent'],
    '/sessions',
    { limit: 5, sort_by: 'updated_at', desc: true }
  )
  const tracesQuery = useStudioQuery<AnyRecord[] | { data?: AnyRecord[] }>(
    ['traces', 'recent'],
    '/traces',
    { limit: 5, desc: true }
  )

  if (
    healthQuery.isLoading ||
    configQuery.isLoading ||
    metricsQuery.isLoading ||
    sessionsQuery.isLoading ||
    tracesQuery.isLoading
  ) {
    return <LoadingPanel label="Loading dashboard" />
  }

  if (healthQuery.error || configQuery.error || metricsQuery.error) {
    return (
      <ErrorPanel
        error={healthQuery.error || configQuery.error || metricsQuery.error}
        retry={() => {
          void healthQuery.refetch()
          void configQuery.refetch()
          void metricsQuery.refetch()
        }}
      />
    )
  }

  const metricsRows = normalizeResourceList(metricsQuery.data)
  const latestMetrics = metricsRows[metricsRows.length - 1] || {}
  const approvalCount =
    approvalsQuery.data?.pending_count ?? approvalsQuery.data?.count ?? 0
  const tokenMetrics = latestMetrics.token_metrics || {}
  const modelMetrics = normalizeResourceList(latestMetrics.model_metrics)
  const recentSessions = normalizeResourceList(sessionsQuery.data)
  const recentTraces = normalizeResourceList(tracesQuery.data)
  const config = configQuery.data || {}
  const agentConfigs = normalizeResourceList(config.agents)
  const teamConfigs = normalizeResourceList(config.teams)
  const workflowConfigs = normalizeResourceList(config.workflows)
  const models = normalizeResourceList(config.models)

  const chartData = metricsRows.map((row) => ({
    date: row.date || row.metric_date || row.created_at,
    input: row.token_metrics?.input_tokens || 0,
    output: row.token_metrics?.output_tokens || 0,
    total: row.token_metrics?.total_tokens || 0
  }))

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="System health, recent activity, token trends, and the current AgentOS registry state."
        action={
          <Button
            variant="outline"
            onClick={async () => {
              await Promise.all([
                healthQuery.refetch(),
                configQuery.refetch(),
                metricsQuery.refetch(),
                sessionsQuery.refetch(),
                tracesQuery.refetch(),
                approvalsQuery.refetch()
              ])
              toast.success('Dashboard refreshed')
            }}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Agent runs today"
          value={formatNumber(latestMetrics.agent_runs_count)}
          icon={Sparkles}
          hint="Last 24h aggregate"
        />
        <MetricCard
          title="Active sessions"
          value={formatNumber(latestMetrics.agent_sessions_count)}
          icon={PlayCircle}
          hint="Current daily session count"
        />
        <MetricCard
          title="Tokens consumed"
          value={formatNumber(tokenMetrics.total_tokens)}
          icon={Gauge}
          hint="Input + output token usage"
        />
        <MetricCard
          title="Pending approvals"
          value={formatNumber(approvalCount)}
          icon={ShieldCheck}
          tone={approvalCount ? 'warning' : 'success'}
          hint="Human review queue"
          href="/approvals"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <ChartPanel
          title="Token Usage"
          description="Input, output, and total token volume across the available metrics window."
        >
          {chartData.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis
                  tickFormatter={(value) => formatNumber(value)}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="input"
                  stroke="#1A56DB"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="output"
                  stroke="#059669"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="#D97706"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState
              title="No metrics yet"
              description="The `/metrics` endpoint did not return daily rows for the dashboard chart."
            />
          )}
        </ChartPanel>

        <ChartPanel
          title="Model Distribution"
          description="Model call usage from the latest metrics aggregate."
        >
          {modelMetrics.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={modelMetrics.map((item) => ({
                    name: `${item.model_provider || 'provider'}:${item.model_id || 'model'}`,
                    value:
                      item.calls_count || item.count || item.total_calls || 0
                  }))}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {modelMetrics.map((_, index) => (
                    <Cell
                      key={index}
                      fill={CHART_COLORS[index % CHART_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState
              title="No model metrics"
              description="The dashboard will render model distribution once the metrics endpoint exposes `model_metrics`."
            />
          )}
        </ChartPanel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <SectionCard
          title="System Config"
          description="Registered components and the latest health snapshot."
        >
          <KeyValueGrid
            items={[
              {
                label: 'Health',
                value: <StatusBadge status={healthQuery.data?.status || 'ok'} />
              },
              {
                label: 'Instantiated',
                value: healthQuery.data?.instantiated_at
                  ? formatDateTime(healthQuery.data.instantiated_at)
                  : 'N/A'
              },
              { label: 'Agents', value: formatNumber(agentConfigs.length) },
              { label: 'Teams', value: formatNumber(teamConfigs.length) },
              {
                label: 'Workflows',
                value: formatNumber(workflowConfigs.length)
              },
              { label: 'Models', value: formatNumber(models.length) }
            ]}
          />
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <JsonBlock
              data={{
                agents: agentConfigs.slice(0, 5),
                teams: teamConfigs.slice(0, 5)
              }}
            />
            <JsonBlock
              data={{
                workflows: workflowConfigs.slice(0, 5),
                models: models.slice(0, 5)
              }}
            />
          </div>
        </SectionCard>

        <SectionCard
          title="Recent Activity"
          description="Latest traces coming out of AgentOS runs."
        >
          <SimpleDataTable
            rows={recentTraces}
            rowHref={(row) => `/traces/${row.trace_id || row.id}`}
            columns={[
              {
                key: 'name',
                label: 'Trace',
                render: (row) => row.name || row.trace_id || 'Trace'
              },
              {
                key: 'status',
                label: 'Status',
                render: (row) => <StatusBadge status={row.status} />
              },
              {
                key: 'duration',
                label: 'Duration',
                render: (row) => formatDuration(row.duration_ms || row.duration)
              },
              {
                key: 'timestamp',
                label: 'Time',
                render: (row) => (
                  <span
                    title={formatDateTime(row.created_at || row.start_time)}
                  >
                    {formatRelativeTime(row.created_at || row.start_time)}
                  </span>
                )
              }
            ]}
            empty="No traces found for the activity feed."
          />
        </SectionCard>
      </div>

      <SectionCard
        title="Recent Sessions"
        description="Most recently updated sessions across the platform."
      >
        <SimpleDataTable
          rows={recentSessions}
          rowHref={(row) => `/sessions/${row.session_id || row.id}`}
          columns={[
            {
              key: 'session_name',
              label: 'Session',
              render: (row) => row.session_name || row.name || row.session_id
            },
            {
              key: 'component',
              label: 'Component',
              render: (row) =>
                row.component_id ||
                row.agent_id ||
                row.team_id ||
                row.workflow_id ||
                '—'
            },
            {
              key: 'updated_at',
              label: 'Updated',
              render: (row) => (
                <span title={formatDateTime(row.updated_at || row.created_at)}>
                  {formatRelativeTime(row.updated_at || row.created_at)}
                </span>
              )
            },
            {
              key: 'tokens',
              label: 'Tokens',
              render: (row) => <TokenPill value={row.total_tokens} />
            }
          ]}
          empty="No recent sessions found."
        />
      </SectionCard>
    </div>
  )
}

export function AgentsScreen() {
  const [search, setSearch] = useState('')
  const agentsQuery = useStudioQuery<AnyRecord[] | { data?: AnyRecord[] }>(
    ['agents'],
    '/agents'
  )

  if (agentsQuery.isLoading) return <LoadingPanel label="Loading agents" />
  if (agentsQuery.error)
    return (
      <ErrorPanel
        error={agentsQuery.error}
        retry={() => agentsQuery.refetch()}
      />
    )

  const agents = normalizeResourceList(agentsQuery.data).filter((agent) => {
    const haystack =
      `${agent.name || ''} ${agent.description || ''} ${agent.id || ''}`.toLowerCase()
    return haystack.includes(search.toLowerCase())
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Agents"
        description="Browse registered agents, inspect their configuration, and jump into live execution."
        action={<LinkButton href="/playground" label="Open playground" />}
      />
      <SectionCard
        title="Agent Catalog"
        description="Client-side searchable grid of registered agents."
      >
        <div className="mb-6 flex items-center gap-3">
          <div className="relative max-w-md flex-1">
            <Search className="text-muted-foreground pointer-events-none absolute left-3 top-3 h-4 w-4" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Filter by name or description"
              className="pl-9"
            />
          </div>
          <Badge variant="secondary">
            {formatNumber(agents.length)} agents
          </Badge>
        </div>
        {agents.length ? (
          <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
            {agents.map((agent) => (
              <ResourceCard
                key={agent.id || agent.agent_id}
                title={agent.name || agent.id}
                id={agent.id || agent.agent_id}
                description={agent.description}
                href={`/agents/${agent.id || agent.agent_id}`}
                badges={
                  <>
                    <Badge variant="outline">
                      {agent.model?.provider || 'provider'}
                    </Badge>
                    <Badge variant="secondary">
                      {agent.model?.model || 'model'}
                    </Badge>
                    <Badge variant={agent.memory ? 'success' : 'secondary'}>
                      {agent.memory ? 'Memory' : 'No memory'}
                    </Badge>
                    <Badge variant={agent.knowledge ? 'success' : 'secondary'}>
                      {agent.knowledge ? 'Knowledge' : 'No KB'}
                    </Badge>
                  </>
                }
                footer={
                  <div className="flex items-center justify-between">
                    <div className="text-muted-foreground text-xs">
                      {formatNumber(
                        agent.tools?.length || agent.tool_count || 0
                      )}{' '}
                      tools
                    </div>
                    <Button asChild>
                      <Link href={`/agents/${agent.id || agent.agent_id}`}>
                        View details
                      </Link>
                    </Button>
                  </div>
                }
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No agents found"
            description="The `/agents` endpoint returned an empty list or nothing matches the current filter."
          />
        )}
      </SectionCard>
    </div>
  )
}

export function AgentDetailScreen({ agentId }: { agentId: string }) {
  const agentQuery = useStudioQuery<AnyRecord>(
    ['agents', agentId],
    `/agents/${agentId}`
  )
  const runsQuery = useStudioQuery<AnyRecord[] | { data?: AnyRecord[] }>(
    ['agents', agentId, 'runs'],
    `/agents/${agentId}/runs`
  )

  if (agentQuery.isLoading) return <LoadingPanel label="Loading agent" />
  if (agentQuery.error)
    return (
      <ErrorPanel error={agentQuery.error} retry={() => agentQuery.refetch()} />
    )

  const agent = agentQuery.data || {}
  const runs = normalizeResourceList(runsQuery.data)

  return (
    <div className="space-y-6">
      <PageHeader
        title={agent.name || agentId}
        description={
          agent.description || 'Agent configuration and operational controls.'
        }
        action={<LinkButton href="/agents" label="Back to agents" />}
      />
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="run">Run</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="configuration">Configuration</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <div className="space-y-6">
            <SectionCard
              title="Agent Summary"
              description="Primary configuration exposed by AgentOS."
            >
              <KeyValueGrid
                items={[
                  {
                    label: 'Agent ID',
                    value: agent.id || agent.agent_id || agentId
                  },
                  {
                    label: 'Model',
                    value: `${agent.model?.provider || 'provider'} / ${agent.model?.model || 'model'}`
                  },
                  {
                    label: 'Tool count',
                    value: formatNumber(agent.tools?.length || agent.tool_count)
                  },
                  {
                    label: 'Memory',
                    value: agent.memory ? 'Enabled' : 'Disabled'
                  },
                  {
                    label: 'Knowledge',
                    value: agent.knowledge ? 'Enabled' : 'Disabled'
                  },
                  { label: 'Storage DB', value: agent.db_id || 'N/A' }
                ]}
              />
              <div className="mt-6 grid gap-6 xl:grid-cols-2">
                <JsonBlock
                  data={
                    agent.system_prompt ||
                    agent.instructions ||
                    agent.description ||
                    {}
                  }
                />
                <JsonBlock data={agent.tools || []} />
              </div>
            </SectionCard>
          </div>
        </TabsContent>
        <TabsContent value="run">
          <RunWorkbench type="agent" id={agentId} dbId={agent.db_id} />
        </TabsContent>
        <TabsContent value="history">
          <SectionCard
            title="Run History"
            description="Latest runs for this agent."
          >
            <SimpleDataTable
              rows={runs}
              columns={[
                {
                  key: 'run_id',
                  label: 'Run',
                  render: (row) => row.run_id || row.id || 'Run'
                },
                {
                  key: 'status',
                  label: 'Status',
                  render: (row) => <StatusBadge status={row.status} />
                },
                {
                  key: 'tokens',
                  label: 'Tokens',
                  render: (row) => (
                    <TokenPill
                      value={row.metrics?.total_tokens || row.total_tokens}
                    />
                  )
                },
                {
                  key: 'duration',
                  label: 'Duration',
                  render: (row) =>
                    formatDuration(row.duration_ms || row.metrics?.duration_ms)
                },
                {
                  key: 'created_at',
                  label: 'Started',
                  render: (row) => formatRelativeTime(row.created_at)
                }
              ]}
              empty="No runs returned for this agent."
            />
          </SectionCard>
        </TabsContent>
        <TabsContent value="configuration">
          <SectionCard
            title="Raw Configuration"
            description="Read-only JSON from `/agents/{agent_id}`."
          >
            <JsonBlock data={agent} />
          </SectionCard>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export function TeamsScreen() {
  const teamsQuery = useStudioQuery<AnyRecord[] | { data?: AnyRecord[] }>(
    ['teams'],
    '/teams'
  )
  if (teamsQuery.isLoading) return <LoadingPanel label="Loading teams" />
  if (teamsQuery.error)
    return (
      <ErrorPanel error={teamsQuery.error} retry={() => teamsQuery.refetch()} />
    )

  const teams = normalizeResourceList(teamsQuery.data)
  return (
    <div className="space-y-6">
      <PageHeader
        title="Teams"
        description="Multi-agent orchestration surfaces with team modes, member rosters, and collaborative execution."
      />
      <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
        {teams.map((team) => (
          <ResourceCard
            key={team.id || team.team_id}
            title={team.name || team.id}
            id={team.id || team.team_id}
            description={team.description}
            href={`/teams/${team.id || team.team_id}`}
            badges={
              <>
                <Badge variant="outline">{team.mode || 'coordinate'}</Badge>
                <Badge variant="secondary">
                  {team.model?.model || team.model?.provider || 'model'}
                </Badge>
                <Badge variant="secondary">
                  {formatNumber(team.members?.length || team.member_count || 0)}{' '}
                  members
                </Badge>
              </>
            }
          />
        ))}
      </div>
    </div>
  )
}

export function TeamDetailScreen({ teamId }: { teamId: string }) {
  const teamQuery = useStudioQuery<AnyRecord>(
    ['teams', teamId],
    `/teams/${teamId}`
  )
  const runsQuery = useStudioQuery<AnyRecord[] | { data?: AnyRecord[] }>(
    ['teams', teamId, 'runs'],
    `/teams/${teamId}/runs`
  )

  if (teamQuery.isLoading) return <LoadingPanel label="Loading team" />
  if (teamQuery.error)
    return (
      <ErrorPanel error={teamQuery.error} retry={() => teamQuery.refetch()} />
    )

  const team = teamQuery.data || {}
  const members = normalizeResourceList(team.members)
  const runs = normalizeResourceList(runsQuery.data)

  return (
    <div className="space-y-6">
      <PageHeader
        title={team.name || teamId}
        description={
          team.description ||
          'Team orchestration settings and execution workspace.'
        }
        action={<LinkButton href="/teams" label="Back to teams" />}
      />
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="run">Run</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <SectionCard title="Team Summary">
            <KeyValueGrid
              items={[
                { label: 'Team ID', value: team.id || team.team_id || teamId },
                { label: 'Mode', value: team.mode || 'coordinate' },
                {
                  label: 'Model',
                  value: `${team.model?.provider || 'provider'} / ${team.model?.model || 'model'}`
                },
                { label: 'Members', value: formatNumber(members.length) }
              ]}
            />
            <div className="mt-6 grid gap-6 xl:grid-cols-2">
              <JsonBlock data={team.instructions || team.description || {}} />
              <JsonBlock data={members} />
            </div>
          </SectionCard>
        </TabsContent>
        <TabsContent value="run">
          <RunWorkbench type="team" id={teamId} dbId={team.db_id} />
        </TabsContent>
        <TabsContent value="members">
          <SectionCard
            title="Member Agents"
            description="Current member roster exposed by AgentOS."
          >
            <SimpleDataTable
              rows={members}
              rowHref={(row) =>
                row.id || row.agent_id
                  ? `/agents/${row.id || row.agent_id}`
                  : undefined
              }
              columns={[
                {
                  key: 'name',
                  label: 'Name',
                  render: (row) => row.name || row.id || row.agent_id
                },
                {
                  key: 'role',
                  label: 'Role',
                  render: (row) => row.role || row.mode || 'member'
                },
                {
                  key: 'model',
                  label: 'Model',
                  render: (row) =>
                    `${row.model?.provider || 'provider'} / ${row.model?.model || 'model'}`
                }
              ]}
            />
          </SectionCard>
        </TabsContent>
        <TabsContent value="history">
          <SectionCard title="Team Run History">
            <SimpleDataTable
              rows={runs}
              columns={[
                {
                  key: 'run_id',
                  label: 'Run',
                  render: (row) => row.run_id || row.id || 'Run'
                },
                {
                  key: 'status',
                  label: 'Status',
                  render: (row) => <StatusBadge status={row.status} />
                },
                {
                  key: 'created_at',
                  label: 'Started',
                  render: (row) => formatRelativeTime(row.created_at)
                }
              ]}
              empty="No runs returned for this team."
            />
          </SectionCard>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export function WorkflowsScreen() {
  const workflowsQuery = useStudioQuery<AnyRecord[] | { data?: AnyRecord[] }>(
    ['workflows'],
    '/workflows'
  )
  if (workflowsQuery.isLoading)
    return <LoadingPanel label="Loading workflows" />
  if (workflowsQuery.error)
    return (
      <ErrorPanel
        error={workflowsQuery.error}
        retry={() => workflowsQuery.refetch()}
      />
    )

  const workflows = normalizeResourceList(workflowsQuery.data)
  return (
    <div className="space-y-6">
      <PageHeader
        title="Workflows"
        description="Sequential and parallel execution pipelines with reusable component support."
      />
      <SectionCard title="Workflow Catalog">
        <SimpleDataTable
          rows={workflows}
          rowHref={(row) => `/workflows/${row.workflow_id || row.id}`}
          columns={[
            { key: 'name', label: 'Name', render: (row) => row.name || row.id },
            {
              key: 'description',
              label: 'Description',
              render: (row) => row.description || '—'
            },
            {
              key: 'component',
              label: 'Component',
              render: (row) => (
                <StatusBadge
                  status={row.is_component ? 'component' : 'workflow'}
                />
              )
            },
            {
              key: 'version',
              label: 'Version',
              render: (row) => row.current_version || row.version || '—'
            },
            {
              key: 'stage',
              label: 'Stage',
              render: (row) => row.stage || 'published'
            }
          ]}
        />
      </SectionCard>
    </div>
  )
}

export function WorkflowDetailScreen({ workflowId }: { workflowId: string }) {
  const { request } = useStudioClient()
  const workflowQuery = useStudioQuery<AnyRecord>(
    ['workflows', workflowId],
    `/workflows/${workflowId}`
  )
  const runsQuery = useStudioQuery<AnyRecord[] | { data?: AnyRecord[] }>(
    ['workflows', workflowId, 'runs'],
    `/workflows/${workflowId}/runs`
  )
  const [payload, setPayload] = useState('{}')
  const [runResult, setRunResult] = useState<unknown>(null)

  if (workflowQuery.isLoading) return <LoadingPanel label="Loading workflow" />
  if (workflowQuery.error)
    return (
      <ErrorPanel
        error={workflowQuery.error}
        retry={() => workflowQuery.refetch()}
      />
    )

  const workflow = workflowQuery.data || {}
  const steps = normalizeResourceList(workflow.steps)
  const runs = normalizeResourceList(runsQuery.data)

  return (
    <div className="space-y-6">
      <PageHeader
        title={workflow.name || workflowId}
        description={
          workflow.description ||
          'Workflow configuration and execution controls.'
        }
        action={<LinkButton href="/workflows" label="Back to workflows" />}
      />
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="steps">Steps</TabsTrigger>
          <TabsTrigger value="run">Run</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <SectionCard title="Workflow Summary">
            <KeyValueGrid
              items={[
                {
                  label: 'Workflow ID',
                  value: workflow.id || workflow.workflow_id || workflowId
                },
                {
                  label: 'Current version',
                  value: workflow.current_version || workflow.version || 'N/A'
                },
                { label: 'Stage', value: workflow.stage || 'published' },
                { label: 'Steps', value: formatNumber(steps.length) }
              ]}
            />
            <div className="mt-6 grid gap-6 xl:grid-cols-2">
              <JsonBlock data={workflow.input_schema || {}} />
              <JsonBlock data={workflow.output_schema || {}} />
            </div>
          </SectionCard>
        </TabsContent>
        <TabsContent value="steps">
          <SectionCard
            title="Workflow Steps"
            description="Visual step flow for the workflow definition."
          >
            {steps.length ? (
              <WorkflowStepGraph steps={steps} />
            ) : (
              <EmptyState
                title="No steps returned"
                description="The workflow detail payload does not include a `steps` array."
              />
            )}
          </SectionCard>
        </TabsContent>
        <TabsContent value="run">
          <SectionCard
            title="Execute Workflow"
            description="Submit JSON input directly to the documented workflow run endpoint."
            action={
              <Button
                onClick={async () => {
                  try {
                    const parsed = JSON.parse(payload)
                    const result = await request(
                      `/workflows/${workflowId}/runs`,
                      {
                        method: 'POST',
                        body: parsed
                      }
                    )
                    setRunResult(result)
                    toast.success('Workflow execution submitted')
                  } catch (error) {
                    toast.error(
                      error instanceof Error
                        ? error.message
                        : 'Unable to execute workflow'
                    )
                  }
                }}
              >
                Execute
              </Button>
            }
          >
            <div className="grid gap-6 xl:grid-cols-2">
              <div className="space-y-3">
                <div className="text-sm font-medium">Input payload</div>
                <TextArea
                  value={payload}
                  onChange={(event) => setPayload(event.target.value)}
                  className="min-h-[320px]"
                />
              </div>
              <div className="space-y-3">
                <div className="text-sm font-medium">Response</div>
                <JsonBlock
                  data={
                    runResult || {
                      message: 'Run a workflow to see the response here.'
                    }
                  }
                  className="min-h-[320px]"
                />
              </div>
            </div>
          </SectionCard>
        </TabsContent>
        <TabsContent value="history">
          <SectionCard title="Workflow Runs">
            <SimpleDataTable
              rows={runs}
              columns={[
                {
                  key: 'run_id',
                  label: 'Run',
                  render: (row) => row.run_id || row.id || 'Run'
                },
                {
                  key: 'status',
                  label: 'Status',
                  render: (row) => <StatusBadge status={row.status} />
                },
                {
                  key: 'created_at',
                  label: 'Created',
                  render: (row) => formatRelativeTime(row.created_at)
                }
              ]}
              rowHref={(row) => {
                const runId = row.run_id || row.id
                return runId
                  ? `/traces?view=runs&run_id=${encodeURIComponent(String(runId))}`
                  : undefined
              }}
              empty="No workflow runs returned."
            />
            {runs.some((run) => run.step_results) ? (
              <div className="mt-6 space-y-4">
                {runs
                  .filter((run) => run.step_results)
                  .map((run, index) => (
                    <StepResultAccordion
                      key={run.run_id || run.id || index}
                      steps={normalizeResourceList(run.step_results)}
                    />
                  ))}
              </div>
            ) : null}
          </SectionCard>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export function SessionsScreen() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { request } = useStudioClient()
  const queryClient = useQueryClient()
  const [type, setType] = useState(searchParams.get('type') || 'all')
  const [name, setName] = useState(searchParams.get('session_name') || '')
  const [userId, setUserId] = useState(searchParams.get('user_id') || '')
  const [componentId, setComponentId] = useState(
    searchParams.get('component_id') || ''
  )
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [renameDialogOpen, setRenameDialogOpen] = useState(false)
  const [selectedSession, setSelectedSession] = useState<AnyRecord | null>(null)
  const [page, setPage] = useState(1)
  const [sortBy, setSortBy] = useState('updated_at')
  const [sortDesc, setSortDesc] = useState(true)
  const sessionsQuery = useStudioQuery<AnyRecord[] | { data?: AnyRecord[] }>(
    ['sessions', type, name, userId, componentId, page, sortBy, sortDesc],
    '/sessions',
    {
      type: type === 'all' ? undefined : type,
      session_name: name || undefined,
      user_id: userId || undefined,
      component_id: componentId || undefined,
      limit: 20,
      offset: (page - 1) * 20,
      sort_by: sortBy,
      desc: sortDesc
    }
  )
  const sessions = normalizeResourceList(sessionsQuery.data)
  const bulkSelection = useBulkSelection(sessions, (row) =>
    String(row.session_id || row.id)
  )
  const deleteMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      return request(`/sessions/${sessionId}`, { method: 'DELETE' })
    },
    onSuccess: async () => {
      toast.success('Session deleted')
      await queryClient.invalidateQueries({ queryKey: ['sessions'] })
      await sessionsQuery.refetch()
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : 'Unable to delete session'
      )
    }
  })
  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(
        ids.map((id) => request(`/sessions/${id}`, { method: 'DELETE' }))
      )
    },
    onSuccess: async () => {
      toast.success(`Deleted ${bulkSelection.selectedCount} sessions`)
      bulkSelection.deselectAll()
      await queryClient.invalidateQueries({ queryKey: ['sessions'] })
      await sessionsQuery.refetch()
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : 'Unable to delete sessions'
      )
    }
  })

  useEffect(() => {
    const params = new URLSearchParams()
    if (type !== 'all') params.set('type', type)
    if (name.trim()) params.set('session_name', name.trim())
    if (userId.trim()) params.set('user_id', userId.trim())
    if (componentId.trim()) params.set('component_id', componentId.trim())
    const next = params.toString()
    router.replace(next ? `/sessions?${next}` : '/sessions')
  }, [componentId, name, router, type, userId])

  if (sessionsQuery.isLoading) return <LoadingPanel label="Loading sessions" />
  if (sessionsQuery.error)
    return (
      <ErrorPanel
        error={sessionsQuery.error}
        retry={() => sessionsQuery.refetch()}
      />
    )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sessions"
        description="Search and inspect conversation histories across agents, teams, and workflows."
        action={
          <Button onClick={() => setCreateDialogOpen(true)}>
            Create session
          </Button>
        }
      />
      <SectionCard
        title="Session Browser"
        description="Server-side filters mapped to the documented query parameters."
      >
        <div className="mb-6 flex flex-col gap-3 lg:flex-row">
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="w-full lg:w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="agent">Agent</SelectItem>
                <SelectItem value="team">Team</SelectItem>
                <SelectItem value="workflow">Workflow</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Search by session name"
            className="max-w-md"
          />
          <Input
            value={componentId}
            onChange={(event) => setComponentId(event.target.value)}
            placeholder="Component ID"
            className="max-w-xs"
          />
          <Input
            value={userId}
            onChange={(event) => setUserId(event.target.value)}
            placeholder="User ID"
            className="max-w-xs"
          />
          <Select
            value={sortBy}
            onValueChange={(v) => {
              setSortBy(v)
              setPage(1)
            }}
          >
            <SelectTrigger className="w-full lg:w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="updated_at">Updated</SelectItem>
                <SelectItem value="created_at">Created</SelectItem>
                <SelectItem value="session_name">Name</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSortDesc((prev) => !prev)}
          >
            {sortDesc ? '↓ Desc' : '↑ Asc'}
          </Button>
        </div>
        <BulkSelectionBar
          selectedCount={bulkSelection.selectedCount}
          totalCount={sessions.length}
          onSelectAll={() => bulkSelection.selectAll()}
          onDeselectAll={() => bulkSelection.deselectAll()}
          actions={[
            {
              label: 'Delete selected',
              variant: 'destructive' as const,
              onClick: () =>
                bulkDeleteMutation.mutate([...bulkSelection.selectedIds]),
              disabled: bulkDeleteMutation.isPending
            }
          ]}
        />
        <SimpleDataTable
          rows={sessions}
          columns={[
            {
              key: 'select',
              label: '',
              render: (row) => (
                <SelectableRow
                  selected={bulkSelection.isSelected(row)}
                  onToggle={() => bulkSelection.toggle(row)}
                >
                  <span />
                </SelectableRow>
              )
            },
            {
              key: 'session_name',
              label: 'Session',
              render: (row) => (
                <Link
                  href={`/sessions/${row.session_id || row.id}`}
                  className="font-medium hover:underline"
                >
                  {row.session_name || row.id || row.session_id}
                </Link>
              )
            },
            {
              key: 'type',
              label: 'Type',
              render: (row) => (
                <Badge variant="outline">{row.type || 'session'}</Badge>
              )
            },
            {
              key: 'component_id',
              label: 'Component',
              render: (row) => {
                const value =
                  row.component_id ||
                  row.agent_id ||
                  row.team_id ||
                  row.workflow_id
                const href =
                  row.type === 'agent' || row.agent_id
                    ? `/agents/${encodeURIComponent(String(value))}`
                    : row.type === 'team' || row.team_id
                      ? `/teams/${encodeURIComponent(String(value))}`
                      : row.type === 'workflow' || row.workflow_id
                        ? `/workflows/${encodeURIComponent(String(value))}`
                        : null
                return value && href ? (
                  <Link
                    href={href}
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    {String(value)}
                  </Link>
                ) : (
                  value || '—'
                )
              }
            },
            {
              key: 'user_id',
              label: 'User',
              render: (row) => row.user_id || '—'
            },
            {
              key: 'tokens',
              label: 'Tokens',
              render: (row) => <TokenPill value={row.total_tokens} />
            },
            {
              key: 'updated_at',
              label: 'Updated',
              render: (row) =>
                formatRelativeTime(row.updated_at || row.created_at)
            },
            {
              key: 'actions',
              label: 'Actions',
              render: (row) => (
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedSession(row)
                      setRenameDialogOpen(true)
                    }}
                  >
                    Rename
                  </Button>
                  <ConfirmActionButton
                    title="Delete session?"
                    description="This permanently deletes the selected session."
                    confirmLabel="Delete session"
                    onConfirm={() =>
                      deleteMutation.mutate(String(row.session_id || row.id))
                    }
                    disabled={deleteMutation.isPending}
                  >
                    Delete
                  </ConfirmActionButton>
                </div>
              )
            }
          ]}
        />
        <div className="mt-4 flex items-center justify-between">
          <span className="text-muted-foreground text-sm">Page {page}</span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={sessions.length < 20}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </SectionCard>
      <SessionCreateDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={() => {
          void sessionsQuery.refetch()
        }}
      />
      <SessionRenameDialog
        open={renameDialogOpen}
        onOpenChange={(open) => {
          setRenameDialogOpen(open)
          if (!open) setSelectedSession(null)
        }}
        session={selectedSession}
        onSuccess={() => {
          void sessionsQuery.refetch()
        }}
      />
    </div>
  )
}

export function SessionDetailScreen({ sessionId }: { sessionId: string }) {
  const router = useRouter()
  const { request } = useStudioClient()
  const queryClient = useQueryClient()
  const [sessionName, setSessionName] = useState('')
  const [summary, setSummary] = useState('')
  const [metadataText, setMetadataText] = useState('{}')
  const [stateText, setStateText] = useState('{}')
  const sessionQuery = useStudioQuery<AnyRecord>(
    ['sessions', sessionId],
    `/sessions/${sessionId}`
  )
  const runsQuery = useStudioQuery<AnyRecord[] | { data?: AnyRecord[] }>(
    ['sessions', sessionId, 'runs'],
    `/sessions/${sessionId}/runs`
  )
  const saveMutation = useMutation({
    mutationFn: async () => {
      return request(`/sessions/${sessionId}`, {
        method: 'PATCH',
        body: {
          session_name: sessionName || undefined,
          summary: summary || undefined,
          metadata: JSON.parse(metadataText || '{}'),
          session_state: JSON.parse(stateText || '{}')
        }
      })
    },
    onSuccess: async () => {
      toast.success('Session updated')
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['sessions', sessionId] }),
        queryClient.invalidateQueries({ queryKey: ['sessions'] })
      ])
      await sessionQuery.refetch()
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : 'Unable to update session'
      )
    }
  })
  const renameMutation = useMutation({
    mutationFn: async () => {
      return request(`/sessions/${sessionId}/rename`, {
        method: 'POST',
        body: { session_name: sessionName }
      })
    },
    onSuccess: async () => {
      toast.success('Session renamed')
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['sessions', sessionId] }),
        queryClient.invalidateQueries({ queryKey: ['sessions'] })
      ])
      await sessionQuery.refetch()
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : 'Unable to rename session'
      )
    }
  })
  const deleteMutation = useMutation({
    mutationFn: async () => {
      return request(`/sessions/${sessionId}`, { method: 'DELETE' })
    },
    onSuccess: async () => {
      toast.success('Session deleted')
      await queryClient.invalidateQueries({ queryKey: ['sessions'] })
      router.push('/sessions')
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : 'Unable to delete session'
      )
    }
  })
  useEffect(() => {
    const session = sessionQuery.data || {}
    setSessionName(session.session_name || '')
    setSummary(session.summary || '')
    setMetadataText(safeJson(session.metadata || {}))
    setStateText(safeJson(session.session_state || session.state || {}))
  }, [sessionQuery.data])
  if (sessionQuery.isLoading || runsQuery.isLoading)
    return <LoadingPanel label="Loading session" />
  if (sessionQuery.error || runsQuery.error)
    return (
      <ErrorPanel
        error={sessionQuery.error || runsQuery.error}
        retry={() => {
          void sessionQuery.refetch()
          void runsQuery.refetch()
        }}
      />
    )

  const session = sessionQuery.data || {}
  const chatHistory = normalizeResourceList(
    session.chat_history || session.runs || session.messages
  )
  const sessionRuns = normalizeNestedList(runsQuery.data, [
    'data',
    'items',
    'results',
    'runs'
  ])
  const componentHref = getComponentHref(session)

  return (
    <div className="space-y-6">
      <PageHeader
        title={session.session_name || sessionId}
        description="Conversation history, runs, state, and metadata for the selected session."
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link
                href={`/traces?view=runs&session_id=${encodeURIComponent(sessionId)}`}
              >
                View traces
              </Link>
            </Button>
            <Button
              variant="outline"
              onClick={() => renameMutation.mutate()}
              disabled={renameMutation.isPending || !sessionName.trim()}
            >
              Rename
            </Button>
            <ConfirmActionButton
              title="Delete session?"
              description="This permanently removes the session and its history."
              confirmLabel="Delete session"
              onConfirm={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              Delete
            </ConfirmActionButton>
            <LinkButton href="/sessions" label="Back to sessions" />
          </div>
        }
      />
      <KeyValueGrid
        items={[
          { label: 'Type', value: session.type || 'session' },
          {
            label: 'Component',
            value:
              session.component_id ||
              session.agent_id ||
              session.team_id ||
              session.workflow_id ? (
                <Link
                  href={componentHref || '#'}
                  className="text-primary underline-offset-4 hover:underline"
                >
                  {String(
                    session.component_id ||
                      session.agent_id ||
                      session.team_id ||
                      session.workflow_id
                  )}
                </Link>
              ) : (
                '—'
              )
          },
          { label: 'User', value: session.user_id || '—' },
          {
            label: 'Total tokens',
            value: formatNumber(
              session.total_tokens || session.metrics?.total_tokens
            )
          }
        ]}
      />
      <Tabs defaultValue="history">
        <TabsList>
          <TabsTrigger value="history">Chat History</TabsTrigger>
          <TabsTrigger value="runs">Runs</TabsTrigger>
          <TabsTrigger value="state">State</TabsTrigger>
          <TabsTrigger value="edit">Edit</TabsTrigger>
        </TabsList>
        <TabsContent value="history">
          <SectionCard title="Chat Timeline">
            <div className="space-y-4">
              {chatHistory.length ? (
                chatHistory.map((entry, index) => {
                  const role = entry.role || entry.message?.role || 'assistant'
                  const content =
                    entry.content ||
                    entry.message?.content ||
                    entry.response?.content ||
                    safeJson(entry)
                  return (
                    <div
                      key={index}
                      className={`rounded-2xl border p-4 ${
                        role === 'user'
                          ? 'bg-primary text-primary-foreground ml-auto max-w-[85%]'
                          : 'bg-card max-w-[90%]'
                      }`}
                    >
                      <div className="mb-2 text-xs uppercase tracking-[0.18em] opacity-70">
                        {role}
                      </div>
                      <div className="whitespace-pre-wrap text-sm">
                        {typeof content === 'string'
                          ? content
                          : safeJson(content)}
                      </div>
                    </div>
                  )
                })
              ) : (
                <EmptyState
                  title="No chat history"
                  description="The session detail payload does not include chat messages."
                />
              )}
            </div>
          </SectionCard>
        </TabsContent>
        <TabsContent value="runs">
          <SectionCard title="Runs">
            <SimpleDataTable
              rows={sessionRuns}
              rowHref={(row) => {
                const runId = row.run_id || row.id
                return runId
                  ? `/sessions/${sessionId}/runs/${encodeURIComponent(String(runId))}`
                  : undefined
              }}
              columns={[
                {
                  key: 'run_id',
                  label: 'Run',
                  render: (row) => row.run_id || row.id || 'Run'
                },
                {
                  key: 'status',
                  label: 'Status',
                  render: (row) => <StatusBadge status={row.status} />
                },
                {
                  key: 'input',
                  label: 'Input',
                  render: (row) =>
                    String(
                      row.input_preview ||
                        row.input ||
                        row.prompt ||
                        row.message ||
                        '—'
                    ).slice(0, 80)
                },
                {
                  key: 'output',
                  label: 'Output',
                  render: (row) =>
                    String(
                      row.output_preview ||
                        row.output ||
                        row.response ||
                        row.result ||
                        '—'
                    ).slice(0, 80)
                },
                {
                  key: 'tokens',
                  label: 'Tokens',
                  render: (row) => (
                    <TokenPill
                      value={
                        row.total_tokens ||
                        row.metrics?.total_tokens ||
                        row.usage?.total_tokens
                      }
                    />
                  )
                },
                {
                  key: 'created_at',
                  label: 'Started',
                  render: (row) =>
                    formatRelativeTime(row.started_at || row.created_at)
                }
              ]}
              empty="No session runs returned."
            />
          </SectionCard>
        </TabsContent>
        <TabsContent value="state">
          <SectionCard
            title="Session State"
            description="State and metadata payload stored against the session."
          >
            <div className="grid gap-6 xl:grid-cols-2">
              <JsonBlock data={session.session_state || session.state || {}} />
              <JsonBlock data={session.metadata || {}} />
            </div>
          </SectionCard>
        </TabsContent>
        <TabsContent value="edit">
          <SectionCard title="Edit Session">
            <div className="grid gap-6 xl:grid-cols-2">
              <div className="space-y-3">
                <div className="text-sm font-medium">Session name</div>
                <Input
                  value={sessionName}
                  onChange={(event) => setSessionName(event.target.value)}
                  placeholder="Session name"
                />
                <div className="text-sm font-medium">Summary</div>
                <TextArea
                  value={summary}
                  onChange={(event) => setSummary(event.target.value)}
                  className="min-h-[180px]"
                />
              </div>
              <div className="space-y-3">
                <div className="text-sm font-medium">Session state JSON</div>
                <TextArea
                  value={stateText}
                  onChange={(event) => setStateText(event.target.value)}
                  className="min-h-[180px]"
                />
                <div className="text-sm font-medium">Metadata JSON</div>
                <TextArea
                  value={metadataText}
                  onChange={(event) => setMetadataText(event.target.value)}
                  className="min-h-[260px]"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <Button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
              >
                Save session
              </Button>
            </div>
          </SectionCard>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export function SessionRunDetailScreen({
  sessionId,
  runId
}: {
  sessionId: string
  runId: string
}) {
  const sessionQuery = useStudioQuery<AnyRecord>(
    ['sessions', sessionId],
    `/sessions/${sessionId}`
  )
  const runQuery = useStudioQuery<AnyRecord>(
    ['sessions', sessionId, 'runs', runId],
    `/sessions/${sessionId}/runs/${runId}`
  )

  if (sessionQuery.isLoading || runQuery.isLoading) {
    return <LoadingPanel label="Loading session run" />
  }
  if (sessionQuery.error || runQuery.error) {
    return (
      <ErrorPanel
        error={sessionQuery.error || runQuery.error}
        retry={() => {
          void sessionQuery.refetch()
          void runQuery.refetch()
        }}
      />
    )
  }

  const session = sessionQuery.data || {}
  const run = runQuery.data || {}
  const runComponentHref = getComponentHref({
    ...session,
    ...run,
    type: run.type || session.type
  })
  const eventTimeline = normalizeNestedList(run.events || run.timeline || [], [
    'data',
    'items',
    'results',
    'events'
  ])
  const messages = normalizeNestedList(
    run.messages || run.message_history || [],
    ['data', 'items', 'results', 'messages']
  )
  const toolCalls = normalizeNestedList(run.tool_calls || run.tools || [], [
    'data',
    'items',
    'results',
    'tool_calls'
  ])

  return (
    <div className="space-y-6">
      <PageHeader
        title={run.name || run.run_id || runId}
        description="Detailed view of a single run recorded under the selected session."
        action={
          <div className="flex items-center gap-2">
            <LinkButton
              href={`/sessions/${sessionId}`}
              label="Back to session"
            />
            <LinkButton href="/sessions" label="All sessions" />
          </div>
        }
      />
      <KeyValueGrid
        items={[
          {
            label: 'Session',
            value: session.session_name || sessionId
          },
          { label: 'Run ID', value: run.run_id || runId },
          { label: 'Status', value: <StatusBadge status={run.status} /> },
          {
            label: 'Started',
            value: formatDateTime(run.started_at || run.created_at)
          },
          {
            label: 'Completed',
            value: formatDateTime(run.completed_at || run.updated_at)
          },
          {
            label: 'Tokens',
            value: formatNumber(
              run.total_tokens ||
                run.metrics?.total_tokens ||
                run.usage?.total_tokens
            )
          }
        ]}
      />
      <SectionCard
        title="Execution Links"
        description="Jump directly into related traces, session, and target component views."
      >
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link
              href={`/traces?view=runs&session_id=${encodeURIComponent(sessionId)}&run_id=${encodeURIComponent(String(run.run_id || runId))}`}
            >
              View traces
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/sessions/${encodeURIComponent(sessionId)}`}>
              Open session
            </Link>
          </Button>
          {runComponentHref ? (
            <Button variant="outline" asChild>
              <Link href={runComponentHref}>Open component</Link>
            </Button>
          ) : null}
        </div>
      </SectionCard>
      <Tabs defaultValue="summary">
        <TabsList>
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="messages">Messages</TabsTrigger>
          <TabsTrigger value="raw">Raw</TabsTrigger>
        </TabsList>
        <TabsContent value="summary">
          <div className="space-y-6">
            <SectionCard title="Run Summary">
              <div className="grid gap-6 xl:grid-cols-2">
                <JsonBlock
                  data={{
                    input:
                      run.input ||
                      run.prompt ||
                      run.input_preview ||
                      run.request ||
                      {},
                    output:
                      run.output ||
                      run.response ||
                      run.result ||
                      run.output_preview ||
                      {},
                    reasoning_content:
                      run.reasoning_content || run.reasoning || null
                  }}
                />
                <JsonBlock
                  data={{
                    metrics: run.metrics || run.usage || {},
                    tool_calls: run.tool_calls || [],
                    metadata: run.metadata || {},
                    error: run.error || run.error_message || null
                  }}
                />
              </div>
              {run.reasoning_content || run.reasoning ? (
                <ReasoningBlock
                  content={String(run.reasoning_content || run.reasoning)}
                />
              ) : null}
            </SectionCard>
            <SectionCard title="Tool Calls">
              {toolCalls.length ? (
                <div className="space-y-3">
                  {toolCalls.map((toolCall, index) => (
                    <ToolCallCard
                      key={toolCall.id || toolCall.tool_call_id || index}
                      name={toolCall.tool_name || toolCall.name || 'Tool'}
                      args={toolCall.arguments || toolCall.args}
                      result={
                        toolCall.result || toolCall.output || toolCall.response
                      }
                      status={toolCall.status}
                      durationMs={toolCall.duration_ms || toolCall.duration}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="No tool calls"
                  description="This run payload does not include tool call records."
                />
              )}
            </SectionCard>
          </div>
        </TabsContent>
        <TabsContent value="events">
          <SectionCard title="Event Timeline">
            {eventTimeline.length ? (
              <RunEventTimeline
                events={eventTimeline.map((e) => ({
                  event: e.event || e.type || '',
                  timestamp: e.timestamp || e.created_at,
                  data: e as Record<string, unknown>
                }))}
              />
            ) : (
              <EmptyState
                title="No events"
                description="The run detail payload does not include an event timeline."
              />
            )}
          </SectionCard>
        </TabsContent>
        <TabsContent value="messages">
          <SectionCard title="Run Messages">
            {messages.length ? (
              <div className="space-y-3">
                {messages.map((message, index) => (
                  <div
                    key={message.id || message.message_id || index}
                    className="bg-muted/10 rounded-2xl border p-4"
                  >
                    <div className="text-muted-foreground mb-2 text-xs uppercase tracking-[0.18em]">
                      {message.role || message.type || `message-${index + 1}`}
                    </div>
                    <div className="whitespace-pre-wrap text-sm">
                      {typeof message.content === 'string'
                        ? message.content
                        : safeJson(message.content || message)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No messages"
                description="The run detail payload does not expose message history."
              />
            )}
          </SectionCard>
        </TabsContent>
        <TabsContent value="raw">
          <SectionCard title="Raw Run Payload">
            <JsonBlock data={run} />
          </SectionCard>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export function MemoryScreen() {
  const { request } = useStudioClient()
  const queryClient = useQueryClient()
  const [userId, setUserId] = useState('')
  const [editorOpen, setEditorOpen] = useState(false)
  const [optimizeOpen, setOptimizeOpen] = useState(false)
  const [selectedMemory, setSelectedMemory] = useState<AnyRecord | null>(null)
  const memoriesQuery = useStudioQuery<AnyRecord[] | { data?: AnyRecord[] }>(
    ['memories', userId],
    '/memories',
    { user_id: userId || undefined }
  )
  const statsQuery = useStudioQuery<AnyRecord[] | { data?: AnyRecord[] }>(
    ['memory-stats'],
    '/user_memory_stats'
  )
  const deleteMutation = useMutation({
    mutationFn: async (memoryId: string) => {
      return request(`/memories/${memoryId}`, { method: 'DELETE' })
    },
    onSuccess: async () => {
      toast.success('Memory deleted')
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['memories'] }),
        queryClient.invalidateQueries({ queryKey: ['memory-stats'] })
      ])
      await memoriesQuery.refetch()
      await statsQuery.refetch()
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : 'Unable to delete memory'
      )
    }
  })
  if (memoriesQuery.isLoading) return <LoadingPanel label="Loading memories" />
  if (memoriesQuery.error)
    return (
      <ErrorPanel
        error={memoriesQuery.error}
        retry={() => memoriesQuery.refetch()}
      />
    )

  const memories = normalizeResourceList(memoriesQuery.data)
  const stats = normalizeResourceList(statsQuery.data)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Memory"
        description="Persistent cross-session memory records with user and topic filtering."
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setSelectedMemory(null)
                setOptimizeOpen(true)
              }}
            >
              Optimize memories
            </Button>
            <Button
              onClick={() => {
                setSelectedMemory(null)
                setEditorOpen(true)
              }}
            >
              Create memory
            </Button>
          </div>
        }
      />
      <SectionCard
        title="Memory Store"
        description="Cards are driven by the `/memories` list endpoint."
      >
        <div className="mb-6 max-w-sm">
          <Input
            value={userId}
            onChange={(event) => setUserId(event.target.value)}
            placeholder="Filter by user ID"
          />
        </div>
        <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          {memories.map((memory) => (
            <Card key={memory.memory_id || memory.id}>
              <CardHeader>
                <CardTitle className="text-base">
                  {memory.user_id || 'Unknown user'}
                </CardTitle>
                <CardDescription>
                  {formatRelativeTime(memory.updated_at || memory.created_at)}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground line-clamp-4 text-sm">
                  {memory.content ||
                    memory.memory ||
                    'No memory content available.'}
                </p>
                <div className="flex flex-wrap gap-2">
                  {normalizeResourceList(memory.topics).map((topic, index) => (
                    <Badge key={index} variant="outline">
                      {typeof topic === 'string'
                        ? topic
                        : topic.name || topic.topic || `topic-${index}`}
                    </Badge>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedMemory(memory)
                      setEditorOpen(true)
                    }}
                  >
                    Edit
                  </Button>
                  <ConfirmActionButton
                    title="Delete memory?"
                    description="This removes the selected memory permanently."
                    confirmLabel="Delete memory"
                    onConfirm={() =>
                      deleteMutation.mutate(
                        String(memory.memory_id || memory.id)
                      )
                    }
                    disabled={deleteMutation.isPending}
                  >
                    Delete
                  </ConfirmActionButton>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </SectionCard>
      <SectionCard
        title="User Memory Stats"
        description="Per-user counts from `/user_memory_stats`."
      >
        <SimpleDataTable
          rows={stats}
          columns={[
            {
              key: 'user_id',
              label: 'User',
              render: (row) => row.user_id || '—'
            },
            {
              key: 'total_memories',
              label: 'Total memories',
              render: (row) => formatNumber(row.total_memories)
            },
            {
              key: 'last_memory_updated_at',
              label: 'Last updated',
              render: (row) => formatRelativeTime(row.last_memory_updated_at)
            },
            {
              key: 'actions',
              label: 'Actions',
              render: (row) => (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setUserId(row.user_id || '')}
                >
                  Filter user
                </Button>
              )
            }
          ]}
          empty="No user memory stats returned."
        />
      </SectionCard>
      <MemoryEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        memory={selectedMemory}
        onSuccess={() => {
          void memoriesQuery.refetch()
          void statsQuery.refetch()
        }}
      />
      <MemoryOptimizeDialog
        open={optimizeOpen}
        onOpenChange={setOptimizeOpen}
        defaultUserId={userId}
        onSuccess={() => {
          void memoriesQuery.refetch()
          void statsQuery.refetch()
        }}
      />
    </div>
  )
}

export function KnowledgeScreen() {
  const { request } = useStudioClient()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState('')
  const [searchType, setSearchType] = useState('hybrid')
  const [results, setResults] = useState<unknown>(null)
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [uploadDialogMode, setUploadDialogMode] = useState<
    'file' | 'url' | 'text' | 'remote'
  >('file')
  const [initialRemotePayload, setInitialRemotePayload] =
    useState<AnyRecord | null>(null)
  const [metadataDialogOpen, setMetadataDialogOpen] = useState(false)
  const [selectedContent, setSelectedContent] = useState<AnyRecord | null>(null)
  const [remoteKnowledgeId, setRemoteKnowledgeId] = useState(
    searchParams.get('knowledge_id') || ''
  )
  const [selectedSourceId, setSelectedSourceId] = useState('')
  const [remotePrefix, setRemotePrefix] = useState('')
  const [selectedRemoteFiles, setSelectedRemoteFiles] = useState<string[]>([])
  const [activeRemoteItem, setActiveRemoteItem] = useState<AnyRecord | null>(
    null
  )
  const selectedDbId = searchParams.get('db_id') || ''
  const selectedKnowledgeId = searchParams.get('knowledge_id') || ''
  const knowledgeQuery = useMemo(
    () => ({
      db_id: selectedDbId || undefined,
      knowledge_id: selectedKnowledgeId || remoteKnowledgeId || undefined
    }),
    [remoteKnowledgeId, selectedDbId, selectedKnowledgeId]
  )
  const contentQuery = useStudioQuery<AnyRecord[] | { data?: AnyRecord[] }>(
    [
      'knowledge-content',
      knowledgeQuery.db_id || null,
      knowledgeQuery.knowledge_id || null
    ],
    '/knowledge/content',
    knowledgeQuery
  )
  const configQuery = useStudioQuery<AnyRecord>(
    [
      'knowledge-config',
      knowledgeQuery.db_id || null,
      knowledgeQuery.knowledge_id || null
    ],
    '/knowledge/config',
    knowledgeQuery
  )
  const sourcesQuery = useQuery({
    queryKey: ['knowledge-sources', remoteKnowledgeId],
    queryFn: () =>
      request<AnyRecord[]>(`/knowledge/${remoteKnowledgeId}/sources`),
    enabled: !!remoteKnowledgeId
  })
  const sourceFilesQuery = useQuery({
    queryKey: [
      'knowledge-source-files',
      remoteKnowledgeId,
      selectedSourceId,
      remotePrefix
    ],
    queryFn: () =>
      request<AnyRecord[]>(
        `/knowledge/${remoteKnowledgeId}/sources/${selectedSourceId}/files`,
        {
          query: { prefix: remotePrefix || undefined }
        }
      ),
    enabled: !!remoteKnowledgeId && !!selectedSourceId
  })
  useEffect(() => {
    const items = normalizeResourceList(contentQuery.data)
    const hasProcessing = items.some(
      (item) => String(item.status || '').toLowerCase() === 'processing'
    )
    if (!hasProcessing) return
    const interval = setInterval(() => {
      void contentQuery.refetch()
    }, 5000)
    return () => clearInterval(interval)
  }, [contentQuery.data, contentQuery])
  const deleteMutation = useMutation({
    mutationFn: async (contentId: string) => {
      return request(`/knowledge/content/${contentId}`, {
        method: 'DELETE',
        query: knowledgeQuery
      })
    },
    onSuccess: async () => {
      toast.success('Knowledge content deleted')
      await contentQuery.refetch()
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : 'Unable to delete content'
      )
    }
  })
  const deleteAllMutation = useMutation({
    mutationFn: async () => {
      return request('/knowledge/content', {
        method: 'DELETE',
        query: knowledgeQuery
      })
    },
    onSuccess: async () => {
      toast.success('All knowledge content deleted')
      await contentQuery.refetch()
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : 'Unable to delete all content'
      )
    }
  })

  useEffect(() => {
    if (remoteKnowledgeId) return
    const config = configQuery.data || {}
    const defaultId =
      config.knowledge_id ||
      config.id ||
      config.knowledge?.knowledge_id ||
      config.knowledge?.id ||
      ''
    if (defaultId) {
      setRemoteKnowledgeId(String(defaultId))
    }
  }, [configQuery.data, remoteKnowledgeId])

  useEffect(() => {
    const sources = normalizeResourceList(sourcesQuery.data)
    if (!sources.length) return
    setSelectedSourceId((current) => {
      if (
        current &&
        sources.some(
          (source) => String(source.source_id || source.id) === current
        )
      ) {
        return current
      }

      return String(sources[0]?.source_id || sources[0]?.id || '')
    })
  }, [sourcesQuery.data])

  useEffect(() => {
    setActiveRemoteItem(null)
  }, [remotePrefix, selectedSourceId])

  const content = normalizeResourceList(contentQuery.data)
  const contentSelection = useBulkSelection(content, (item) =>
    String(item.content_id || item.id)
  )

  if (contentQuery.isLoading || configQuery.isLoading)
    return <LoadingPanel label="Loading knowledge base" />
  if (contentQuery.error || configQuery.error)
    return (
      <ErrorPanel
        error={contentQuery.error || configQuery.error}
        retry={() => {
          void contentQuery.refetch()
          void configQuery.refetch()
        }}
      />
    )
  const sources = normalizeResourceList(sourcesQuery.data)
  const sourceFiles = normalizeResourceList(sourceFilesQuery.data)
  const selectedSource =
    sources.find(
      (source) => String(source.source_id || source.id) === selectedSourceId
    ) || null
  const activeRemotePreview = getPreviewText(activeRemoteItem)
  const prefixSegments = remotePrefix
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean)

  const toggleRemoteFile = (path: string) => {
    setSelectedRemoteFiles((current) =>
      current.includes(path)
        ? current.filter((item) => item !== path)
        : [...current, path]
    )
  }
  const visibleRemoteFiles = sourceFiles.filter(
    (file) =>
      !(
        file.is_dir ||
        file.is_folder ||
        file.type === 'folder' ||
        file.kind === 'folder'
      )
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Knowledge Base"
        description="Content inventory, ingestion config, and search over the vector store."
        action={
          <div className="flex items-center gap-2">
            <ConfirmActionButton
              title="Delete all content?"
              description="This removes every knowledge content item from the store."
              confirmLabel="Delete all"
              onConfirm={() => deleteAllMutation.mutate()}
              disabled={deleteAllMutation.isPending}
            >
              Delete all
            </ConfirmActionButton>
            <Button
              onClick={() => {
                setUploadDialogMode('file')
                setInitialRemotePayload(null)
                setUploadDialogOpen(true)
              }}
            >
              Upload content
            </Button>
          </div>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <SectionCard title="Content Inventory">
          <BulkSelectionBar
            selectedCount={contentSelection.selectedCount}
            totalCount={content.length}
            onSelectAll={() => contentSelection.selectAll()}
            onDeselectAll={() => contentSelection.deselectAll()}
            actions={[
              {
                label: 'Delete selected',
                variant: 'destructive' as const,
                onClick: () => {
                  const ids = contentSelection.selectedItems.map((item) =>
                    String(item.content_id || item.id)
                  )
                  ids.forEach((id) => deleteMutation.mutate(id))
                },
                disabled: deleteMutation.isPending
              }
            ]}
          />
          <SimpleDataTable
            rows={content}
            columns={[
              {
                key: 'select',
                label: '',
                render: (row) => (
                  <input
                    type="checkbox"
                    checked={contentSelection.isSelected(row)}
                    onChange={() => contentSelection.toggle(row)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                )
              },
              {
                key: 'name',
                label: 'Name',
                render: (row) => row.name || row.content_id || row.id
              },
              {
                key: 'type',
                label: 'Type',
                render: (row) => row.type || row.mime_type || '—'
              },
              {
                key: 'size',
                label: 'Size',
                render: (row) => formatNumber(row.size || row.content_size)
              },
              {
                key: 'status',
                label: 'Status',
                render: (row) => {
                  const status = row.status?.toLowerCase?.() || ''
                  if (
                    ['processing', 'completed', 'failed', 'queued'].includes(
                      status
                    )
                  ) {
                    return (
                      <ProcessingStatusIndicator
                        status={status}
                        pollingActive={status === 'processing'}
                      />
                    )
                  }
                  return <StatusBadge status={row.status} />
                }
              },
              {
                key: 'created_at',
                label: 'Created',
                render: (row) => formatRelativeTime(row.created_at)
              },
              {
                key: 'actions',
                label: 'Actions',
                render: (row) => (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedContent(row)
                        setMetadataDialogOpen(true)
                      }}
                    >
                      Edit
                    </Button>
                    <ConfirmActionButton
                      title="Delete content?"
                      description="This removes the selected knowledge item."
                      confirmLabel="Delete content"
                      onConfirm={() =>
                        deleteMutation.mutate(String(row.content_id || row.id))
                      }
                      disabled={deleteMutation.isPending}
                    >
                      Delete
                    </ConfirmActionButton>
                  </div>
                )
              }
            ]}
            empty="No knowledge content returned."
          />
        </SectionCard>
        <SectionCard
          title="Knowledge Search"
          description="POST directly to `/knowledge/search`."
        >
          <div className="space-y-3">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search documents and chunks"
            />
            <Select value={searchType} onValueChange={setSearchType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="vector">Vector</SelectItem>
                  <SelectItem value="keyword">Keyword</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            <Button
              onClick={async () => {
                try {
                  const response = await request('/knowledge/search', {
                    method: 'POST',
                    query: knowledgeQuery,
                    body: { query, search_type: searchType, max_results: 10 }
                  })
                  setResults(response)
                } catch (error) {
                  toast.error(
                    error instanceof Error
                      ? error.message
                      : 'Knowledge search failed'
                  )
                }
              }}
            >
              Search knowledge
            </Button>
            <JsonBlock
              data={results || { query: 'Run a search to inspect results.' }}
              className="min-h-[240px]"
            />
          </div>
        </SectionCard>
      </div>
      <SectionCard
        title="Remote Source Browser"
        description="Inspect configured remote sources and prefill a remote-ingestion payload for upload."
      >
        <div className="grid gap-4 xl:grid-cols-[280px_220px_1fr]">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Knowledge ID</label>
            <Input
              value={remoteKnowledgeId}
              onChange={(event) => {
                setRemoteKnowledgeId(event.target.value)
                setSelectedSourceId('')
                setSelectedRemoteFiles([])
              }}
              placeholder="knowledge_default"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Source</label>
            <Select
              value={selectedSourceId || '__none__'}
              onValueChange={(value) => {
                setSelectedSourceId(value === '__none__' ? '' : value)
                setSelectedRemoteFiles([])
              }}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    sourcesQuery.isLoading
                      ? 'Loading sources...'
                      : 'Select source'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="__none__">No source selected</SelectItem>
                  {sources.map((source, index) => {
                    const value = String(
                      source.source_id || source.id || `source-${index}`
                    )
                    return (
                      <SelectItem key={value} value={value}>
                        {source.name || source.label || value}
                      </SelectItem>
                    )
                  })}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Folder prefix</label>
            <div className="flex gap-2">
              <Input
                value={remotePrefix}
                onChange={(event) => setRemotePrefix(event.target.value)}
                placeholder="docs/2026/"
              />
              <Button
                variant="outline"
                onClick={() => {
                  void sourceFilesQuery.refetch()
                }}
                disabled={!remoteKnowledgeId || !selectedSourceId}
              >
                Browse
              </Button>
            </div>
          </div>
        </div>
        <div className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
          <div className="rounded-2xl border">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div>
                <div className="text-sm font-medium">Remote files</div>
                <div className="text-muted-foreground text-xs">
                  Select files to seed the remote upload dialog.
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  {selectedRemoteFiles.length} selected
                </Badge>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedRemoteFiles([])}
                  disabled={!selectedRemoteFiles.length}
                >
                  Clear
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setSelectedRemoteFiles(
                      visibleRemoteFiles.map((file, index) =>
                        String(
                          file.path || file.key || file.name || `item-${index}`
                        )
                      )
                    )
                  }
                  disabled={!visibleRemoteFiles.length}
                >
                  Select visible
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setRemotePrefix('')
                  setSelectedRemoteFiles([])
                }}
                disabled={!remotePrefix}
              >
                Root
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const parentPrefix = prefixSegments.slice(0, -1).join('/')
                  setRemotePrefix(parentPrefix)
                  setSelectedRemoteFiles([])
                }}
                disabled={!prefixSegments.length}
              >
                Up one level
              </Button>
              {prefixSegments.map((segment, index) => {
                const path = prefixSegments.slice(0, index + 1).join('/')
                return (
                  <Button
                    key={path}
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setRemotePrefix(path)
                      setSelectedRemoteFiles([])
                    }}
                  >
                    {segment}
                  </Button>
                )
              })}
            </div>
            <div className="max-h-[360px] overflow-y-auto">
              {sourceFilesQuery.isLoading ? (
                <div className="text-muted-foreground p-4 text-sm">
                  Loading remote files...
                </div>
              ) : sourceFiles.length ? (
                sourceFiles.map((file, index) => {
                  const path = String(
                    file.path || file.key || file.name || `item-${index}`
                  )
                  const isFolder =
                    file.is_dir ||
                    file.is_folder ||
                    file.type === 'folder' ||
                    file.kind === 'folder'
                  const isSelected = selectedRemoteFiles.includes(path)
                  return (
                    <button
                      key={path}
                      type="button"
                      className="hover:bg-muted/30 flex w-full items-center justify-between border-b px-4 py-3 text-left transition-colors"
                      onClick={() => {
                        setActiveRemoteItem(file)
                        if (isFolder) {
                          setRemotePrefix(path)
                          setSelectedRemoteFiles([])
                          return
                        }
                        toggleRemoteFile(path)
                      }}
                    >
                      <div>
                        <div className="text-sm font-medium">
                          {file.name || path}
                        </div>
                        <div className="text-muted-foreground text-xs">
                          {isFolder
                            ? 'Folder'
                            : `${formatNumber(file.size || 0)} bytes`}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {isFolder ? 'Folder' : file.content_type || 'File'}
                        </Badge>
                        {!isFolder && isSelected ? (
                          <Badge variant="secondary">Selected</Badge>
                        ) : null}
                      </div>
                    </button>
                  )
                })
              ) : (
                <div className="text-muted-foreground p-4 text-sm">
                  {selectedSourceId
                    ? 'No files returned for this prefix.'
                    : 'Pick a source to browse remote files.'}
                </div>
              )}
            </div>
          </div>
          <div className="space-y-4">
            <JsonBlock
              data={
                activeRemoteItem || {
                  item: 'Select a file or folder to inspect its payload.'
                }
              }
            />
            {activeRemotePreview ? (
              <pre className="bg-muted/40 text-muted-foreground overflow-x-auto rounded-2xl border p-4 text-xs leading-6">
                {activeRemotePreview}
              </pre>
            ) : null}
            <JsonBlock
              data={{
                source: selectedSource
                  ? {
                      source_id: selectedSource.source_id || selectedSource.id,
                      name: selectedSource.name || selectedSource.label,
                      type:
                        selectedSource.type ||
                        selectedSource.source_type ||
                        null,
                      metadata: selectedSource.metadata || {}
                    }
                  : { source: 'Select a source to inspect metadata.' }
              }}
            />
            <JsonBlock
              data={{
                knowledge_id: remoteKnowledgeId || null,
                source_id: selectedSourceId || null,
                prefix: remotePrefix || null,
                files: selectedRemoteFiles
              }}
              className="min-h-[240px]"
            />
            <Button
              className="w-full"
              disabled={!remoteKnowledgeId || !selectedSourceId}
              onClick={() => {
                setUploadDialogMode('remote')
                setInitialRemotePayload({
                  knowledge_id: remoteKnowledgeId,
                  source_id: selectedSourceId,
                  files: selectedRemoteFiles
                })
                setUploadDialogOpen(true)
              }}
            >
              Open remote upload
            </Button>
          </div>
        </div>
      </SectionCard>
      <SectionCard title="Ingestion Config">
        <JsonBlock data={configQuery.data || {}} />
      </SectionCard>
      <KnowledgeContentDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        initialMode={uploadDialogMode}
        initialRemotePayload={initialRemotePayload}
        knowledgeQuery={knowledgeQuery}
        onSuccess={() => {
          void contentQuery.refetch()
          void configQuery.refetch()
          void sourcesQuery.refetch()
          void sourceFilesQuery.refetch()
        }}
      />
      <KnowledgeMetadataDialog
        open={metadataDialogOpen}
        onOpenChange={(open) => {
          setMetadataDialogOpen(open)
          if (!open) setSelectedContent(null)
        }}
        content={selectedContent}
        knowledgeQuery={knowledgeQuery}
        onSuccess={() => {
          void contentQuery.refetch()
        }}
      />
    </div>
  )
}

export function EvalsScreen() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const { request } = useStudioClient()
  const queryClient = useQueryClient()
  const evalsQuery = useStudioQuery<AnyRecord[] | { data?: AnyRecord[] }>(
    ['eval-runs'],
    '/eval-runs'
  )
  const deleteMutation = useMutation({
    mutationFn: async (evalRunId: string) => {
      return request('/eval-runs', {
        method: 'DELETE',
        body: { ids: [evalRunId] }
      })
    },
    onSuccess: async () => {
      toast.success('Evaluation deleted')
      await queryClient.invalidateQueries({ queryKey: ['eval-runs'] })
      await evalsQuery.refetch()
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : 'Unable to delete evaluation'
      )
    }
  })
  if (evalsQuery.isLoading) return <LoadingPanel label="Loading evaluations" />
  if (evalsQuery.error)
    return (
      <ErrorPanel error={evalsQuery.error} retry={() => evalsQuery.refetch()} />
    )

  const runs = normalizeResourceList(evalsQuery.data)
  return (
    <div className="space-y-6">
      <PageHeader
        title="Evaluations"
        description="Accuracy, judge, performance, and reliability eval runs exposed by AgentOS."
        action={
          <Button onClick={() => setIsDialogOpen(true)}>Run evaluation</Button>
        }
      />
      <SectionCard title="Evaluation Runs">
        <SimpleDataTable
          rows={runs}
          columns={[
            {
              key: 'name',
              label: 'Name',
              render: (row) => (
                <Link
                  href={`/evals/${row.eval_run_id || row.id}`}
                  className="font-medium hover:underline"
                >
                  {row.name || row.eval_run_id || row.id}
                </Link>
              )
            },
            {
              key: 'target',
              label: 'Target',
              render: (row) => row.agent_id || row.team_id || '—'
            },
            {
              key: 'eval_type',
              label: 'Type',
              render: (row) => (
                <Badge variant="outline">{row.eval_type || 'eval'}</Badge>
              )
            },
            {
              key: 'status',
              label: 'Status',
              render: (row) => (
                <StatusBadge
                  status={row.eval_data?.eval_status || row.status}
                />
              )
            },
            {
              key: 'score',
              label: 'Score',
              render: (row) => row.eval_data?.score ?? row.score ?? '—'
            },
            {
              key: 'created_at',
              label: 'Created',
              render: (row) => formatRelativeTime(row.created_at)
            },
            {
              key: 'actions',
              label: 'Actions',
              render: (row) => (
                <ConfirmActionButton
                  title="Delete evaluation?"
                  description="This removes the selected evaluation run."
                  confirmLabel="Delete evaluation"
                  onConfirm={() =>
                    deleteMutation.mutate(String(row.eval_run_id || row.id))
                  }
                  disabled={deleteMutation.isPending}
                >
                  Delete
                </ConfirmActionButton>
              )
            }
          ]}
          empty="No evaluation runs returned."
        />
      </SectionCard>
      <EvalRunDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />
    </div>
  )
}

export function EvalDetailScreen({ evalRunId }: { evalRunId: string }) {
  const { request } = useStudioClient()
  const router = useRouter()
  const queryClient = useQueryClient()
  const evalQuery = useStudioQuery<AnyRecord>(
    ['eval-runs', evalRunId],
    `/eval-runs/${evalRunId}`
  )
  const deleteMutation = useMutation({
    mutationFn: async () => {
      return request('/eval-runs', {
        method: 'DELETE',
        body: { ids: [evalRunId] }
      })
    },
    onSuccess: async () => {
      toast.success('Evaluation deleted')
      await queryClient.invalidateQueries({ queryKey: ['eval-runs'] })
      router.push('/evals')
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : 'Unable to delete evaluation'
      )
    }
  })

  if (evalQuery.isLoading) return <LoadingPanel label="Loading evaluation" />
  if (evalQuery.error)
    return (
      <ErrorPanel error={evalQuery.error} retry={() => evalQuery.refetch()} />
    )

  const evalRun = evalQuery.data || {}
  const evalData = evalRun.eval_data || {}
  const evalType = evalRun.eval_type || 'eval'
  const evalTargetHref = getComponentHref({
    ...evalRun,
    type: evalRun.agent_id ? 'agent' : evalRun.team_id ? 'team' : evalRun.type
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title={evalRun.name || evalRunId}
        description="Detailed results, scoring data, and raw payloads for the selected evaluation run."
        action={
          <div className="flex items-center gap-2">
            <ConfirmActionButton
              title="Delete evaluation?"
              description="This removes the selected evaluation result."
              confirmLabel="Delete evaluation"
              onConfirm={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              Delete
            </ConfirmActionButton>
            <LinkButton href="/evals" label="Back to evaluations" />
          </div>
        }
      />
      <KeyValueGrid
        items={[
          {
            label: 'Eval ID',
            value: evalRun.eval_run_id || evalRun.id || evalRunId
          },
          {
            label: 'Target',
            value:
              evalRun.agent_id || evalRun.team_id ? (
                <Link
                  href={evalTargetHref || '#'}
                  className="text-primary underline-offset-4 hover:underline"
                >
                  {String(evalRun.agent_id || evalRun.team_id)}
                </Link>
              ) : (
                '—'
              )
          },
          { label: 'Type', value: evalType },
          {
            label: 'Status',
            value: (
              <StatusBadge status={evalData.eval_status || evalRun.status} />
            )
          },
          {
            label: 'Model',
            value: `${evalRun.model_provider || evalData.model_provider || 'provider'} / ${evalRun.model_id || evalData.model_id || 'model'}`
          },
          {
            label: 'Created',
            value: formatDateTime(evalRun.created_at)
          }
        ]}
      />
      <SectionCard
        title="Execution Links"
        description="Jump into the underlying component or related traces when identifiers are available."
      >
        <div className="flex flex-wrap gap-2">
          {evalTargetHref ? (
            <Button variant="outline" asChild>
              <Link href={evalTargetHref}>Open target</Link>
            </Button>
          ) : null}
          {evalRun.session_id ? (
            <Button variant="outline" asChild>
              <Link
                href={`/sessions/${encodeURIComponent(String(evalRun.session_id))}`}
              >
                Open session
              </Link>
            </Button>
          ) : null}
          {evalRun.run_id || evalRun.session_id ? (
            <Button variant="outline" asChild>
              <Link
                href={`/traces?view=runs${evalRun.session_id ? `&session_id=${encodeURIComponent(String(evalRun.session_id))}` : ''}${evalRun.run_id ? `&run_id=${encodeURIComponent(String(evalRun.run_id))}` : ''}`}
              >
                View traces
              </Link>
            </Button>
          ) : null}
        </div>
      </SectionCard>

      {evalType === 'accuracy' ? (
        <SectionCard title="Accuracy Result">
          <div className="grid gap-6 xl:grid-cols-2">
            <JsonBlock
              data={{
                expected_output:
                  evalRun.expected_output || evalData.expected_output
              }}
            />
            <JsonBlock
              data={{
                actual_output:
                  evalRun.output || evalData.output || evalData.actual_output
              }}
            />
          </div>
        </SectionCard>
      ) : null}

      {evalType === 'agent_as_judge' ? (
        <SectionCard title="Judge Result">
          <div className="grid gap-6 xl:grid-cols-2">
            <JsonBlock
              data={{
                criteria: evalRun.criteria || evalData.criteria,
                score: evalData.score,
                threshold: evalData.threshold,
                reasoning: evalData.reasoning || evalData.judge_reasoning
              }}
            />
            <JsonBlock data={evalData} />
          </div>
        </SectionCard>
      ) : null}

      {evalType === 'performance' ? (
        <SectionCard title="Performance Result">
          <JsonBlock
            data={{
              average_duration: evalData.average_duration,
              p50: evalData.p50,
              p95: evalData.p95,
              p99: evalData.p99,
              iterations: evalData.iterations || evalRun.num_iterations,
              raw: evalData
            }}
          />
        </SectionCard>
      ) : null}

      {evalType === 'reliability' ? (
        <SectionCard title="Reliability Result">
          <JsonBlock
            data={{
              expected_tool_calls:
                evalRun.expected_tool_calls || evalData.expected_tool_calls,
              invoked_tool_calls:
                evalData.invoked_tool_calls || evalData.actual_tool_calls,
              status: evalData.eval_status || evalRun.status
            }}
          />
        </SectionCard>
      ) : null}

      <SectionCard title="Raw Evaluation Payload">
        <JsonBlock data={evalRun} />
      </SectionCard>
    </div>
  )
}

export function MetricsScreen() {
  const { request } = useStudioClient()
  const [days, setDays] = useState('30')
  const metricsQuery = useStudioQuery<AnyRecord[] | { data?: AnyRecord[] }>(
    ['metrics', days],
    '/metrics'
  )
  if (metricsQuery.isLoading) return <LoadingPanel label="Loading metrics" />
  if (metricsQuery.error)
    return (
      <ErrorPanel
        error={metricsQuery.error}
        retry={() => metricsQuery.refetch()}
      />
    )

  const rows = normalizeResourceList(metricsQuery.data)
  const summary = rows.reduce(
    (acc, row) => {
      acc.agentRuns += row.agent_runs_count || 0
      acc.teamRuns += row.team_runs_count || 0
      acc.workflowRuns += row.workflow_runs_count || 0
      acc.tokens += row.token_metrics?.total_tokens || 0
      acc.users = Math.max(acc.users, row.users_count || 0)
      return acc
    },
    { agentRuns: 0, teamRuns: 0, workflowRuns: 0, tokens: 0, users: 0 }
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Metrics"
        description="Daily operational aggregates rendered as KPIs, charts, and an export-friendly table."
        action={
          <div className="flex items-center gap-2">
            <Select value={days} onValueChange={setDays}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  await request('/metrics/refresh', { method: 'POST' })
                  toast.success('Metrics refresh requested')
                  await metricsQuery.refetch()
                } catch (error) {
                  toast.error(
                    error instanceof Error
                      ? error.message
                      : 'Unable to refresh metrics'
                  )
                }
              }}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh metrics
            </Button>
          </div>
        }
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          title="Agent runs"
          value={formatNumber(summary.agentRuns)}
          icon={Sparkles}
        />
        <MetricCard
          title="Team runs"
          value={formatNumber(summary.teamRuns)}
          icon={Users}
        />
        <MetricCard
          title="Workflow runs"
          value={formatNumber(summary.workflowRuns)}
          icon={GitBranch}
        />
        <MetricCard
          title="Unique users"
          value={formatNumber(summary.users)}
          icon={Users}
        />
        <MetricCard
          title="Total tokens"
          value={formatNumber(summary.tokens)}
          icon={Gauge}
        />
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <ChartPanel title="Runs Over Time">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows}>
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="agent_runs_count" fill="#1A56DB" />
              <Bar dataKey="team_runs_count" fill="#059669" />
              <Bar dataKey="workflow_runs_count" fill="#D97706" />
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>
        <ChartPanel title="Token Consumption">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={rows.map((row) => ({
                date: row.date,
                input: row.token_metrics?.input_tokens || 0,
                output: row.token_metrics?.output_tokens || 0,
                cache: row.token_metrics?.cache_tokens || 0
              }))}
            >
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area
                type="monotone"
                dataKey="input"
                stackId="1"
                fill="#1A56DB"
                stroke="#1A56DB"
              />
              <Area
                type="monotone"
                dataKey="output"
                stackId="1"
                fill="#059669"
                stroke="#059669"
              />
              <Area
                type="monotone"
                dataKey="cache"
                stackId="1"
                fill="#7C3AED"
                stroke="#7C3AED"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartPanel>
      </div>
      <SectionCard title="Raw Daily Metrics">
        <JsonBlock data={rows} />
      </SectionCard>
    </div>
  )
}

export function TracesScreen() {
  const { request } = useStudioClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [viewMode, setViewMode] = useState<'runs' | 'sessions'>('runs')
  const filterState = useFilterState('status')
  const [logicalOperator, setLogicalOperator] = useState<'AND' | 'OR'>('AND')
  const [searchResults, setSearchResults] = useState<AnyRecord[] | null>(null)
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null
  )
  const tracesQuery = useStudioQuery<AnyRecord[] | { data?: AnyRecord[] }>(
    ['traces', 'list'],
    '/traces'
  )
  const filterSchemaQuery = useQuery({
    queryKey: ['traces-filter-schema'],
    queryFn: () => request<AnyRecord>('/traces/filter-schema')
  })
  const sessionStatsQuery = useQuery({
    queryKey: ['trace-session-stats'],
    queryFn: () => request<AnyRecord>('/trace_session_stats'),
    enabled: viewMode === 'sessions' && !searchResults
  })
  const selectedSessionTracesQuery = useQuery({
    queryKey: ['trace-session-traces', selectedSessionId],
    queryFn: () =>
      request<AnyRecord>('/traces/search', {
        method: 'POST',
        body: {
          group_by: 'run',
          operator: 'AND',
          filters: [
            { field: 'session_id', operator: 'EQ', value: selectedSessionId }
          ]
        }
      }),
    enabled: !!selectedSessionId
  })

  const searchMutation = useMutation({
    mutationFn: async () => {
      const activeClauses = filterState.clauses
        .map((clause) => ({
          field: clause.field,
          operator: clause.operator,
          value: clause.value.trim()
        }))
        .filter((clause) => clause.field && clause.value)

      return request<AnyRecord>('/traces/search', {
        method: 'POST',
        body: {
          group_by: viewMode === 'sessions' ? 'session' : 'run',
          operator: logicalOperator,
          filters: activeClauses
        }
      })
    },
    onSuccess: (response) => {
      setSearchResults(
        normalizeNestedList(response, [
          'data',
          'items',
          'results',
          'traces',
          'sessions'
        ])
      )
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : 'Trace search failed'
      )
    }
  })

  useEffect(() => {
    const schema = filterSchemaQuery.data
    if (!schema || filterState.clauses[0]?.field) return
    const firstField = Object.keys(schema.fields || schema.properties || {})[0]
    if (!firstField) return
    filterState.setClauses([{ field: firstField, operator: 'EQ', value: '' }])
  }, [filterState, filterSchemaQuery.data])

  useEffect(() => {
    const requestedView = searchParams.get('view')
    const presetClauses = [
      ['session_id', searchParams.get('session_id')],
      ['run_id', searchParams.get('run_id')],
      ['agent_id', searchParams.get('agent_id')],
      ['status', searchParams.get('status')]
    ]
      .filter(
        (entry): entry is [string, string] =>
          typeof entry[0] === 'string' && typeof entry[1] === 'string'
      )
      .map(([field, value]) => ({
        field,
        operator: 'EQ',
        value
      }))

    if (requestedView === 'runs' || requestedView === 'sessions') {
      setViewMode(requestedView)
    }

    setSelectedSessionId(searchParams.get('session_id'))

    if (!presetClauses.length) {
      setSearchResults(null)
      return
    }

    setLogicalOperator('AND')
    filterState.setClauses(presetClauses)

    const groupBy =
      requestedView === 'sessions'
        ? 'session'
        : searchParams.get('session_id')
          ? 'run'
          : 'run'

    void request<AnyRecord>('/traces/search', {
      method: 'POST',
      body: {
        group_by: groupBy,
        operator: 'AND',
        filters: presetClauses
      }
    })
      .then((response) => {
        setSearchResults(
          normalizeNestedList(response, [
            'data',
            'items',
            'results',
            'traces',
            'sessions'
          ])
        )
      })
      .catch((error) => {
        toast.error(
          error instanceof Error ? error.message : 'Trace search failed'
        )
      })
  }, [request, searchParams, filterState])

  if (tracesQuery.isLoading) return <LoadingPanel label="Loading traces" />
  if (tracesQuery.error)
    return (
      <ErrorPanel
        error={tracesQuery.error}
        retry={() => tracesQuery.refetch()}
      />
    )

  const schemaRecord = filterSchemaQuery.data || {}
  const schemaFields = Array.isArray(schemaRecord.fields)
    ? schemaRecord.fields
    : Array.isArray(schemaRecord.filters)
      ? schemaRecord.filters
      : typeof schemaRecord.fields === 'object' && schemaRecord.fields
        ? Object.entries(schemaRecord.fields).map(([name, value]) => {
            const field = typeof value === 'object' ? (value as AnyRecord) : {}
            return {
              name,
              ...field,
              values: field.values || field.enum_values || field.options
            }
          })
        : [
            { name: 'status', type: 'enum', operators: ['EQ', 'IN'] },
            { name: 'agent_id', type: 'string', operators: ['EQ', 'CONTAINS'] },
            {
              name: 'session_id',
              type: 'string',
              operators: ['EQ', 'CONTAINS']
            },
            { name: 'run_id', type: 'string', operators: ['EQ', 'CONTAINS'] }
          ]
  const runRows =
    searchResults && viewMode === 'runs'
      ? searchResults
      : normalizeNestedList(tracesQuery.data, [
          'data',
          'items',
          'results',
          'traces'
        ])
  const sessionRows =
    searchResults && viewMode === 'sessions'
      ? searchResults
      : normalizeNestedList(sessionStatsQuery.data, [
          'data',
          'items',
          'results',
          'sessions'
        ])
  const rows = viewMode === 'runs' ? runRows : sessionRows
  const selectedSessionRows = normalizeNestedList(
    selectedSessionTracesQuery.data,
    ['data', 'items', 'results', 'traces']
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Traces"
        description="Distributed trace search with schema-driven filters, session aggregation, and direct drill-down into individual executions."
      />
      <SectionCard title="Trace Explorer">
        <div className="mb-6 space-y-4">
          <div className="flex flex-wrap gap-3">
            <Select
              value={viewMode}
              onValueChange={(value: 'runs' | 'sessions') => {
                setViewMode(value)
                setSearchResults(null)
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="runs">Runs view</SelectItem>
                  <SelectItem value="sessions">Sessions view</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            <Select
              value={logicalOperator}
              onValueChange={(value: 'AND' | 'OR') => setLogicalOperator(value)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="AND">AND</SelectItem>
                  <SelectItem value="OR">OR</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            <Button
              onClick={() => searchMutation.mutate()}
              disabled={searchMutation.isPending}
            >
              Apply filters
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setSearchResults(null)
                setSelectedSessionId(null)
                filterState.setClauses([
                  { field: 'status', operator: 'EQ', value: '' }
                ])
                router.replace('/traces')
              }}
            >
              Reset
            </Button>
          </div>
          <AdvancedFilterBuilder
            schema={schemaFields}
            clauses={filterState.clauses}
            onClausesChange={filterState.setClauses}
            logicalOperator={logicalOperator}
            onLogicalOperatorChange={setLogicalOperator}
            onApply={() => searchMutation.mutate()}
            onReset={() => {
              setSearchResults(null)
              setSelectedSessionId(null)
              filterState.setClauses([
                { field: 'status', operator: 'EQ', value: '' }
              ])
              router.replace('/traces')
            }}
            isLoading={searchMutation.isPending}
          />
        </div>
        <SimpleDataTable
          rows={rows}
          rowHref={
            viewMode === 'runs'
              ? (row) => `/traces/${row.trace_id || row.id}`
              : undefined
          }
          columns={
            viewMode === 'runs'
              ? [
                  {
                    key: 'name',
                    label: 'Trace',
                    render: (row) => row.name || row.trace_id || 'Trace'
                  },
                  {
                    key: 'status',
                    label: 'Status',
                    render: (row) => <StatusBadge status={row.status} />
                  },
                  {
                    key: 'duration',
                    label: 'Duration',
                    render: (row) =>
                      formatDuration(row.duration_ms || row.duration)
                  },
                  {
                    key: 'spans',
                    label: 'Spans',
                    render: (row) =>
                      formatNumber(
                        row.total_spans ||
                          normalizeResourceList(row.spans).length
                      )
                  },
                  {
                    key: 'session_id',
                    label: 'Session',
                    render: (row) =>
                      row.session_id ? (
                        <Link
                          href={`/traces?view=runs&session_id=${encodeURIComponent(
                            String(row.session_id)
                          )}`}
                          className="text-primary underline-offset-4 hover:underline"
                        >
                          {String(row.session_id)}
                        </Link>
                      ) : (
                        '—'
                      )
                  },
                  {
                    key: 'started',
                    label: 'Started',
                    render: (row) =>
                      formatRelativeTime(row.start_time || row.created_at)
                  }
                ]
              : [
                  {
                    key: 'session_id',
                    label: 'Session',
                    render: (row) => {
                      const sid = row.session_id || row.id
                      return sid ? (
                        <Link
                          href={`/sessions/${encodeURIComponent(String(sid))}`}
                          className="text-primary underline-offset-4 hover:underline"
                        >
                          {String(sid)}
                        </Link>
                      ) : (
                        'Session'
                      )
                    }
                  },
                  {
                    key: 'status',
                    label: 'Status',
                    render: (row) => <StatusBadge status={row.status || 'ok'} />
                  },
                  {
                    key: 'total_traces',
                    label: 'Total traces',
                    render: (row) =>
                      formatNumber(row.total_traces || row.trace_count)
                  },
                  {
                    key: 'error_count',
                    label: 'Errors',
                    render: (row) => formatNumber(row.error_count)
                  },
                  {
                    key: 'first_seen',
                    label: 'First seen',
                    render: (row) =>
                      formatRelativeTime(
                        row.first_timestamp || row.first_seen_at
                      )
                  },
                  {
                    key: 'last_seen',
                    label: 'Last seen',
                    render: (row) =>
                      formatRelativeTime(row.last_timestamp || row.last_seen_at)
                  },
                  {
                    key: 'actions',
                    label: 'Actions',
                    render: (row) => {
                      const sessionId = String(row.session_id || row.id || '')
                      return (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedSessionId(sessionId)
                            router.replace(
                              `/traces?view=sessions&session_id=${encodeURIComponent(sessionId)}`
                            )
                          }}
                        >
                          Inspect
                        </Button>
                      )
                    }
                  }
                ]
          }
        />
      </SectionCard>
      {selectedSessionId ? (
        <SectionCard
          title={`Session Drill-Down: ${selectedSessionId}`}
          description="Run-level traces returned for the selected session."
          action={
            <Button
              variant="outline"
              onClick={() => {
                setSelectedSessionId(null)
                router.replace('/traces?view=sessions')
              }}
            >
              Clear session drill-down
            </Button>
          }
        >
          {selectedSessionTracesQuery.isLoading ? (
            <LoadingPanel label="Loading session traces" />
          ) : selectedSessionTracesQuery.error ? (
            <ErrorPanel
              error={selectedSessionTracesQuery.error}
              retry={() => selectedSessionTracesQuery.refetch()}
            />
          ) : (
            <SimpleDataTable
              rows={selectedSessionRows}
              rowHref={(row) => `/traces/${row.trace_id || row.id}`}
              columns={[
                {
                  key: 'name',
                  label: 'Trace',
                  render: (row) => row.name || row.trace_id || 'Trace'
                },
                {
                  key: 'status',
                  label: 'Status',
                  render: (row) => <StatusBadge status={row.status} />
                },
                {
                  key: 'duration',
                  label: 'Duration',
                  render: (row) =>
                    formatDuration(row.duration_ms || row.duration)
                },
                {
                  key: 'run_id',
                  label: 'Run',
                  render: (row) => row.run_id || '—'
                },
                {
                  key: 'started_at',
                  label: 'Started',
                  render: (row) =>
                    formatRelativeTime(row.start_time || row.created_at)
                }
              ]}
              empty="No trace runs were returned for this session."
            />
          )}
        </SectionCard>
      ) : null}
    </div>
  )
}

function TraceSpanTree({ spans }: { spans: AnyRecord[] }) {
  if (!spans.length) {
    return (
      <EmptyState
        title="No spans"
        description="The trace detail response does not include span records."
      />
    )
  }

  return (
    <div className="space-y-3">
      {spans.map((span, index) => {
        const spanType = (span.span_type || span.type || '').toLowerCase()
        const spanKey = span.span_id || span.id || index
        const children = normalizeResourceList(span.children)

        if (spanType === 'tool') {
          return (
            <div key={spanKey}>
              <ToolCallCard
                name={span.name || span.tool_name || 'Tool'}
                args={span.input || span.arguments || span.args}
                result={span.output || span.result || span.response}
                status={span.status}
                durationMs={span.duration_ms || span.duration}
              />
              {children.length ? (
                <div className="mt-4 border-l pl-4">
                  <TraceSpanTree spans={children} />
                </div>
              ) : null}
            </div>
          )
        }

        if (spanType === 'llm') {
          return (
            <div key={spanKey}>
              <LLMSpanCard
                model={span.model || span.model_id}
                provider={span.model_provider || span.provider}
                inputTokens={
                  span.input_tokens ||
                  span.usage?.input_tokens ||
                  span.metrics?.input_tokens
                }
                outputTokens={
                  span.output_tokens ||
                  span.usage?.output_tokens ||
                  span.metrics?.output_tokens
                }
                durationMs={span.duration_ms || span.duration}
                prompts={
                  span.input || span.prompts || span.messages || span.prompt
                }
                response={
                  span.output || span.response || span.completion || span.result
                }
              />
              {children.length ? (
                <div className="mt-4 border-l pl-4">
                  <TraceSpanTree spans={children} />
                </div>
              ) : null}
            </div>
          )
        }

        if (spanType === 'agent') {
          return (
            <div key={spanKey}>
              <AgentSpanCard
                name={span.name || span.agent_name || 'Agent'}
                status={span.status}
                durationMs={span.duration_ms || span.duration}
                input={span.input}
                output={span.output}
              />
              {children.length ? (
                <div className="mt-4 border-l pl-4">
                  <TraceSpanTree spans={children} />
                </div>
              ) : null}
            </div>
          )
        }

        return (
          <div key={spanKey} className="bg-muted/20 rounded-2xl border p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <EventTypeIcon type={spanType || 'span'} />
                <div>
                  <div className="font-medium">
                    {span.name || span.span_id || `Span ${index + 1}`}
                  </div>
                  <div className="text-muted-foreground text-xs">
                    {span.span_type || span.type || 'span'}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={span.status || 'ok'} />
                <Badge variant="outline">
                  {formatDuration(span.duration_ms || span.duration)}
                </Badge>
              </div>
            </div>
            {span.input || span.output || span.error ? (
              <div className="mt-4 grid gap-4 xl:grid-cols-3">
                <JsonBlock data={span.input || {}} />
                <JsonBlock data={span.output || {}} />
                <JsonBlock data={span.error || {}} />
              </div>
            ) : null}
            {span.reasoning_content || span.reasoning ? (
              <div className="mt-3">
                <ReasoningBlock
                  content={String(span.reasoning_content || span.reasoning)}
                />
              </div>
            ) : null}
            {children.length ? (
              <div className="mt-4 border-l pl-4">
                <TraceSpanTree spans={children} />
              </div>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

function parseTimestampMs(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Date.parse(value)
    if (!Number.isNaN(parsed)) return parsed
    const numeric = Number(value)
    if (Number.isFinite(numeric)) return numeric
  }
  return null
}

function flattenTraceSpans(
  spans: AnyRecord[],
  depth = 0,
  parentId?: string
): AnyRecord[] {
  return spans.flatMap((span, index) => {
    const spanId = String(
      span.span_id || span.id || `${parentId || 'span'}-${index}`
    )
    const children = normalizeResourceList(span.children)
    return [
      {
        ...span,
        __depth: depth,
        __parentId: parentId,
        __spanId: spanId,
        __index: index
      },
      ...flattenTraceSpans(children, depth + 1, spanId)
    ]
  })
}

function TraceTimeline({
  spans,
  totalDurationMs
}: {
  spans: AnyRecord[]
  totalDurationMs: number
}) {
  if (!spans.length) {
    return (
      <EmptyState
        title="No timeline data"
        description="The trace response does not expose enough span data to render a timeline."
      />
    )
  }

  const flattened = flattenTraceSpans(spans)
  const rootStart =
    flattened
      .map((span) =>
        parseTimestampMs(
          span.start_time ||
            span.started_at ||
            span.start_at ||
            span.timestamp ||
            span.started
        )
      )
      .filter((value): value is number => value !== null)
      .sort((a, b) => a - b)[0] ?? null

  return (
    <div className="space-y-3">
      {flattened.map((span, index) => {
        const durationMs = Number(span.duration_ms || span.duration || 0)
        const explicitStart =
          parseTimestampMs(
            span.start_time ||
              span.started_at ||
              span.start_at ||
              span.timestamp ||
              span.started
          ) ?? null
        const offsetMs =
          explicitStart !== null && rootStart !== null
            ? Math.max(0, explicitStart - rootStart)
            : index * 12
        const left = Math.min(
          100,
          (offsetMs / Math.max(totalDurationMs, 1)) * 100
        )
        const width = Math.max(
          3,
          (Math.max(durationMs, totalDurationMs * 0.02) /
            Math.max(totalDurationMs, 1)) *
            100
        )

        return (
          <div
            key={span.__spanId || span.span_id || span.id || index}
            className="bg-muted/10 rounded-2xl border p-4"
          >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div
                className="min-w-0"
                style={{ paddingLeft: `${Number(span.__depth || 0) * 16}px` }}
              >
                <div className="truncate text-sm font-medium">
                  {span.name || span.span_id || `Span ${index + 1}`}
                </div>
                <div className="text-muted-foreground text-xs">
                  {span.span_type || span.type || 'span'}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={span.status || 'ok'} />
                <Badge variant="outline">{formatDuration(durationMs)}</Badge>
              </div>
            </div>
            <div className="bg-muted/70 rounded-full p-1">
              <div className="bg-background/70 relative h-5 rounded-full">
                <div
                  className="bg-primary/80 absolute top-0 h-5 rounded-full"
                  style={{
                    left: `${left}%`,
                    width: `${Math.min(width, 100 - left)}%`
                  }}
                />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function TraceDetailScreen({ traceId }: { traceId: string }) {
  const traceQuery = useStudioQuery<AnyRecord>(
    ['traces', traceId],
    `/traces/${traceId}`
  )
  if (traceQuery.isLoading) return <LoadingPanel label="Loading trace" />
  if (traceQuery.error)
    return (
      <ErrorPanel error={traceQuery.error} retry={() => traceQuery.refetch()} />
    )

  const trace = traceQuery.data || {}
  const spans = normalizeResourceList(
    trace.spans || trace.span_tree || trace.children
  )
  const flattenedSpans = flattenTraceSpans(spans)
  const totalDurationMs = Number(
    trace.duration_ms ||
      trace.duration ||
      flattenedSpans.reduce(
        (max, span) =>
          Math.max(max, Number(span.duration_ms || span.duration || 0)),
        0
      ) ||
      1
  )
  const errorCount = flattenedSpans.filter(
    (span) =>
      String(span.status || '')
        .toLowerCase()
        .includes('error') || span.error
  ).length
  const spanTypes = flattenedSpans.reduce<Record<string, number>>(
    (acc, span) => {
      const key = String(span.span_type || span.type || 'span').toUpperCase()
      acc[key] = (acc[key] || 0) + 1
      return acc
    },
    {}
  )
  return (
    <div className="space-y-6">
      <PageHeader
        title={trace.name || traceId}
        description="Trace context, inputs/outputs, and span tree for debugging run execution."
        action={
          <div className="flex items-center gap-2">
            {trace.session_id && trace.run_id ? (
              <Button variant="outline" asChild>
                <Link
                  href={`/sessions/${encodeURIComponent(String(trace.session_id))}/runs/${encodeURIComponent(String(trace.run_id))}`}
                >
                  Open session run
                </Link>
              </Button>
            ) : null}
            <LinkButton href="/traces" label="Back to traces" />
          </div>
        }
      />
      <KeyValueGrid
        items={[
          { label: 'Trace ID', value: trace.trace_id || trace.id || traceId },
          { label: 'Status', value: <StatusBadge status={trace.status} /> },
          {
            label: 'Duration',
            value: formatDuration(trace.duration_ms || trace.duration)
          },
          {
            label: 'Run ID',
            value: trace.run_id ? (
              <Link
                href={`/traces?run_id=${encodeURIComponent(String(trace.run_id))}`}
                className="text-primary underline-offset-4 hover:underline"
              >
                {trace.run_id}
              </Link>
            ) : (
              '—'
            )
          },
          {
            label: 'Session ID',
            value: trace.session_id ? (
              <Link
                href={`/sessions/${encodeURIComponent(String(trace.session_id))}`}
                className="text-primary underline-offset-4 hover:underline"
              >
                {trace.session_id}
              </Link>
            ) : (
              '—'
            )
          },
          { label: 'User ID', value: trace.user_id || '—' }
        ]}
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Total spans"
          value={formatNumber(flattenedSpans.length)}
          icon={GitBranch}
        />
        <MetricCard
          title="Errors"
          value={formatNumber(errorCount)}
          icon={ShieldCheck}
          tone={errorCount ? 'danger' : 'success'}
        />
        <MetricCard
          title="Span types"
          value={formatNumber(Object.keys(spanTypes).length)}
          icon={Sparkles}
        />
        <MetricCard
          title="Trace duration"
          value={formatDuration(totalDurationMs)}
          icon={Gauge}
        />
      </div>
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tree">Span Tree</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="raw">Raw</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <div className="space-y-6">
            <SectionCard title="Input / Output">
              <div className="grid gap-6 xl:grid-cols-2">
                <JsonBlock data={trace.input || {}} />
                <JsonBlock data={trace.output || {}} />
              </div>
            </SectionCard>
            <SectionCard title="Span Type Breakdown">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {Object.entries(spanTypes).map(([type, count]) => (
                  <div
                    key={type}
                    className="bg-muted/20 rounded-2xl border p-4 text-sm"
                  >
                    <div className="text-muted-foreground text-xs uppercase tracking-[0.18em]">
                      {type}
                    </div>
                    <div className="mt-2 text-2xl font-semibold">
                      {formatNumber(count)}
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>
        </TabsContent>
        <TabsContent value="tree">
          <SectionCard title="Span Tree">
            <TraceSpanTree spans={spans} />
          </SectionCard>
        </TabsContent>
        <TabsContent value="timeline">
          <SectionCard title="Timeline View">
            <TraceTimeline spans={spans} totalDurationMs={totalDurationMs} />
          </SectionCard>
        </TabsContent>
        <TabsContent value="raw">
          <SectionCard title="Raw Trace Payload">
            <JsonBlock data={trace} />
          </SectionCard>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export function ComponentsScreen() {
  const [typeFilter, setTypeFilter] = useState('all')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const componentsQuery = useStudioQuery<AnyRecord[] | { data?: AnyRecord[] }>(
    ['components', typeFilter],
    '/components',
    { type: typeFilter === 'all' ? undefined : typeFilter }
  )
  if (componentsQuery.isLoading)
    return <LoadingPanel label="Loading components" />
  if (componentsQuery.error)
    return (
      <ErrorPanel
        error={componentsQuery.error}
        retry={() => componentsQuery.refetch()}
      />
    )

  const components = normalizeResourceList(componentsQuery.data)
  return (
    <div className="space-y-6">
      <PageHeader
        title="Components"
        description="Versioned component definitions for agents, teams, and workflows."
        action={
          <div className="flex items-center gap-2">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="agent">Agent</SelectItem>
                  <SelectItem value="team">Team</SelectItem>
                  <SelectItem value="workflow">Workflow</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            <Button onClick={() => setCreateDialogOpen(true)}>
              Create component
            </Button>
          </div>
        }
      />
      <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
        {components.map((component) => (
          <ResourceCard
            key={component.component_id || component.id}
            title={component.name || component.component_id || component.id}
            id={component.component_id || component.id}
            description={component.description}
            href={`/components/${component.component_id || component.id}`}
            badges={
              <>
                <Badge variant="outline">{component.type || 'component'}</Badge>
                <Badge variant="secondary">
                  v{component.current_version || component.version || '1'}
                </Badge>
              </>
            }
          />
        ))}
      </div>
      <ComponentCreateDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={() => {
          void componentsQuery.refetch()
        }}
      />
    </div>
  )
}

export function ComponentDetailScreen({
  componentId
}: {
  componentId: string
}) {
  const { request } = useStudioClient()
  const queryClient = useQueryClient()
  const [isVersionDialogOpen, setIsVersionDialogOpen] = useState(false)
  const [compareVersion, setCompareVersion] = useState<string | null>(null)
  const componentQuery = useStudioQuery<AnyRecord>(
    ['components', componentId],
    `/components/${componentId}`
  )
  const configsQuery = useStudioQuery<AnyRecord[] | { data?: AnyRecord[] }>(
    ['components', componentId, 'configs'],
    `/components/${componentId}/configs`
  )
  const refreshComponent = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['components', componentId] }),
      queryClient.invalidateQueries({
        queryKey: ['components', componentId, 'configs']
      }),
      queryClient.invalidateQueries({ queryKey: ['components'] })
    ])
  }

  const setCurrentMutation = useMutation({
    mutationFn: async (version: string) => {
      return request(
        `/components/${componentId}/configs/${version}/set-current`,
        {
          method: 'POST'
        }
      )
    },
    onSuccess: async () => {
      toast.success('Current version updated')
      await refreshComponent()
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : 'Unable to set current version'
      )
    }
  })

  const patchVersionMutation = useMutation({
    mutationFn: async ({
      version,
      payload
    }: {
      version: string
      payload: AnyRecord
    }) => {
      return request(`/components/${componentId}/configs/${version}`, {
        method: 'PATCH',
        body: payload
      })
    },
    onSuccess: async () => {
      toast.success('Version updated')
      await refreshComponent()
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : 'Unable to update version'
      )
    }
  })

  const compareConfigQuery = useQuery({
    queryKey: ['components', componentId, 'configs', compareVersion],
    queryFn: () =>
      request<AnyRecord>(
        `/components/${componentId}/configs/${compareVersion}`
      ),
    enabled: !!compareVersion
  })

  const deleteVersionMutation = useMutation({
    mutationFn: async (version: string) => {
      return request(`/components/${componentId}/configs/${version}`, {
        method: 'DELETE'
      })
    },
    onSuccess: async () => {
      toast.success('Draft version deleted')
      await refreshComponent()
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : 'Unable to delete version'
      )
    }
  })
  if (componentQuery.isLoading || configsQuery.isLoading)
    return <LoadingPanel label="Loading component" />
  if (componentQuery.error || configsQuery.error)
    return (
      <ErrorPanel
        error={componentQuery.error || configsQuery.error}
        retry={() => {
          void componentQuery.refetch()
          void configsQuery.refetch()
        }}
      />
    )

  const component = componentQuery.data || {}
  const configs = normalizeResourceList(configsQuery.data)
  return (
    <div className="space-y-6">
      <PageHeader
        title={component.name || componentId}
        description={
          component.description ||
          'Component metadata, current config, and version history.'
        }
        action={
          <div className="flex items-center gap-2">
            <Button onClick={() => setIsVersionDialogOpen(true)}>
              Create version
            </Button>
            <LinkButton href="/components" label="Back to components" />
          </div>
        }
      />
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="versions">Versions</TabsTrigger>
          <TabsTrigger value="current">Current Config</TabsTrigger>
          <TabsTrigger value="compare">Compare</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <SectionCard title="Component Metadata">
            <KeyValueGrid
              items={[
                {
                  label: 'Component ID',
                  value: component.component_id || component.id || componentId
                },
                { label: 'Type', value: component.type || 'component' },
                {
                  label: 'Current version',
                  value: component.current_version || 'N/A'
                },
                {
                  label: 'Created',
                  value: formatDateTime(component.created_at)
                }
              ]}
            />
            <div className="mt-6">
              <JsonBlock data={component.metadata || {}} />
            </div>
          </SectionCard>
        </TabsContent>
        <TabsContent value="versions">
          <SectionCard title="Version History">
            <SimpleDataTable
              rows={configs}
              columns={[
                {
                  key: 'version',
                  label: 'Version',
                  render: (row) => row.version || row.id || '—'
                },
                {
                  key: 'stage',
                  label: 'Stage',
                  render: (row) => <StatusBadge status={row.stage || 'draft'} />
                },
                {
                  key: 'label',
                  label: 'Label',
                  render: (row) => row.label || row.notes || '—'
                },
                {
                  key: 'created_at',
                  label: 'Created',
                  render: (row) => formatRelativeTime(row.created_at)
                },
                {
                  key: 'actions',
                  label: 'Actions',
                  render: (row) => {
                    const version = String(row.version || row.id || '')
                    const isPublished = row.stage === 'published'
                    const isCurrent =
                      String(component.current_version || '') === version
                    return (
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setCurrentMutation.mutate(version)}
                          disabled={setCurrentMutation.isPending || isCurrent}
                        >
                          Set current
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            patchVersionMutation.mutate({
                              version,
                              payload: {
                                stage: isPublished ? 'draft' : 'published'
                              }
                            })
                          }
                          disabled={patchVersionMutation.isPending}
                        >
                          {isPublished ? 'Unpublish' : 'Publish'}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteVersionMutation.mutate(version)}
                          disabled={
                            deleteVersionMutation.isPending ||
                            isPublished ||
                            isCurrent
                          }
                        >
                          Delete
                        </Button>
                      </div>
                    )
                  }
                }
              ]}
              empty="No component config versions returned."
            />
          </SectionCard>
        </TabsContent>
        <TabsContent value="current">
          <SectionCard title="Current Config">
            <JsonBlock
              data={component.current_config || component.config || {}}
            />
          </SectionCard>
        </TabsContent>
        <TabsContent value="compare">
          <SectionCard
            title="Compare Versions"
            description="Select a version to compare against the current config."
          >
            <div className="mb-4">
              <Select
                value={compareVersion || '__none__'}
                onValueChange={(value) =>
                  setCompareVersion(value === '__none__' ? null : value)
                }
              >
                <SelectTrigger className="w-[280px]">
                  <SelectValue placeholder="Select version to compare" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="__none__">Select a version</SelectItem>
                    {configs.map((cfg, index) => {
                      const version = String(
                        cfg.version || cfg.id || `v-${index}`
                      )
                      return (
                        <SelectItem key={version} value={version}>
                          {version} ({cfg.stage || 'draft'})
                        </SelectItem>
                      )
                    })}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            {compareVersion ? (
              compareConfigQuery.isLoading ? (
                <LoadingPanel label="Loading version config" />
              ) : compareConfigQuery.error ? (
                <ErrorPanel
                  error={compareConfigQuery.error}
                  retry={() => compareConfigQuery.refetch()}
                />
              ) : (
                <JsonDiffViewer
                  before={component.current_config || component.config || {}}
                  after={
                    compareConfigQuery.data?.config ||
                    compareConfigQuery.data ||
                    {}
                  }
                  beforeLabel={`Current (${component.current_version || 'active'})`}
                  afterLabel={`Version ${compareVersion}`}
                />
              )
            ) : (
              <EmptyState
                title="No version selected"
                description="Pick a version from the dropdown to compare against the current config."
              />
            )}
          </SectionCard>
        </TabsContent>
      </Tabs>
      <ComponentVersionDialog
        open={isVersionDialogOpen}
        onOpenChange={setIsVersionDialogOpen}
        componentId={componentId}
        currentConfig={component.current_config || component.config || {}}
        onSuccess={() => {
          void componentQuery.refetch()
          void configsQuery.refetch()
        }}
      />
    </div>
  )
}

export function SchedulesScreen() {
  const { request } = useStudioClient()
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState<AnyRecord | null>(null)
  const schedulesQuery = useStudioQuery<AnyRecord[] | { data?: AnyRecord[] }>(
    ['schedules'],
    '/schedules'
  )
  const refreshSchedules = async () => {
    await queryClient.invalidateQueries({ queryKey: ['schedules'] })
  }

  const statusMutation = useMutation({
    mutationFn: async ({
      scheduleId,
      action
    }: {
      scheduleId: string
      action: 'enable' | 'disable' | 'trigger'
    }) => {
      return request(`/schedules/${scheduleId}/${action}`, { method: 'POST' })
    },
    onSuccess: async (_, variables) => {
      const label =
        variables.action === 'trigger'
          ? 'triggered'
          : variables.action === 'enable'
            ? 'enabled'
            : 'disabled'
      toast.success(`Schedule ${label}`)
      await refreshSchedules()
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : 'Unable to update schedule'
      )
    }
  })

  const deleteScheduleMutation = useMutation({
    mutationFn: async (scheduleId: string) => {
      return request(`/schedules/${scheduleId}`, { method: 'DELETE' })
    },
    onSuccess: async () => {
      toast.success('Schedule deleted')
      await refreshSchedules()
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : 'Unable to delete schedule'
      )
    }
  })
  if (schedulesQuery.isLoading)
    return <LoadingPanel label="Loading schedules" />
  if (schedulesQuery.error)
    return (
      <ErrorPanel
        error={schedulesQuery.error}
        retry={() => schedulesQuery.refetch()}
      />
    )

  const schedules = normalizeResourceList(schedulesQuery.data)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Schedules"
        description="Cron-driven API automations with enable/disable and trigger-now controls."
        action={
          <Button
            onClick={() => {
              setEditingSchedule(null)
              setDialogOpen(true)
            }}
          >
            Create schedule
          </Button>
        }
      />
      <SectionCard title="Schedule List">
        <SimpleDataTable
          rows={schedules}
          columns={[
            {
              key: 'name',
              label: 'Name',
              render: (row) => row.name || row.schedule_id || row.id
            },
            {
              key: 'endpoint',
              label: 'Endpoint',
              render: (row) => row.endpoint || '—'
            },
            {
              key: 'cron',
              label: 'Cron',
              render: (row) => (
                <CronHumanizer
                  expression={row.cron_expression || row.cron || ''}
                />
              )
            },
            {
              key: 'timezone',
              label: 'Timezone',
              render: (row) => row.timezone || 'UTC'
            },
            {
              key: 'next_run',
              label: 'Next run',
              render: (row) => formatDateTime(row.next_run_at || row.next_run)
            },
            {
              key: 'status',
              label: 'Status',
              render: (row) => (
                <StatusBadge status={row.enabled ? 'enabled' : 'disabled'} />
              )
            },
            {
              key: 'actions',
              label: 'Actions',
              render: (row) => {
                const scheduleId = String(row.schedule_id || row.id)
                return (
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/schedules/${scheduleId}`}>View</Link>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingSchedule(row)
                        setDialogOpen(true)
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        statusMutation.mutate({ scheduleId, action: 'trigger' })
                      }
                      disabled={statusMutation.isPending}
                    >
                      Trigger
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        statusMutation.mutate({
                          scheduleId,
                          action: row.enabled ? 'disable' : 'enable'
                        })
                      }
                      disabled={statusMutation.isPending}
                    >
                      {row.enabled ? 'Disable' : 'Enable'}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deleteScheduleMutation.mutate(scheduleId)}
                      disabled={deleteScheduleMutation.isPending}
                    >
                      Delete
                    </Button>
                  </div>
                )
              }
            }
          ]}
          empty="No schedules returned."
        />
      </SectionCard>
      <ScheduleEditorDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        schedule={editingSchedule}
        onSuccess={() => {
          void schedulesQuery.refetch()
        }}
      />
    </div>
  )
}

export function ScheduleDetailScreen({ scheduleId }: { scheduleId: string }) {
  const scheduleQuery = useStudioQuery<AnyRecord>(
    ['schedules', scheduleId],
    `/schedules/${scheduleId}`
  )
  const runsQuery = useStudioQuery<AnyRecord[] | { data?: AnyRecord[] }>(
    ['schedules', scheduleId, 'runs'],
    `/schedules/${scheduleId}/runs`
  )

  if (scheduleQuery.isLoading || runsQuery.isLoading) {
    return <LoadingPanel label="Loading schedule" />
  }
  if (scheduleQuery.error || runsQuery.error) {
    return (
      <ErrorPanel
        error={scheduleQuery.error || runsQuery.error}
        retry={() => {
          void scheduleQuery.refetch()
          void runsQuery.refetch()
        }}
      />
    )
  }

  const schedule = scheduleQuery.data || {}
  const runs = normalizeResourceList(runsQuery.data)

  return (
    <div className="space-y-6">
      <PageHeader
        title={schedule.name || scheduleId}
        description={
          schedule.description ||
          'Schedule configuration, timing, and run history.'
        }
        action={<LinkButton href="/schedules" label="Back to schedules" />}
      />
      <KeyValueGrid
        items={[
          { label: 'Schedule ID', value: schedule.schedule_id || scheduleId },
          {
            label: 'Status',
            value: (
              <StatusBadge status={schedule.enabled ? 'enabled' : 'disabled'} />
            )
          },
          {
            label: 'Cron',
            value: (
              <CronHumanizer
                expression={schedule.cron_expression || schedule.cron || ''}
              />
            )
          },
          { label: 'Timezone', value: schedule.timezone || 'UTC' },
          {
            label: 'Next run',
            value: formatDateTime(schedule.next_run_at || schedule.next_run)
          },
          {
            label: 'Last run',
            value: formatDateTime(schedule.last_run_at || schedule.last_run)
          }
        ]}
      />
      <SectionCard title="Schedule Configuration">
        <JsonBlock
          data={{
            endpoint: schedule.endpoint,
            method: schedule.method,
            payload: schedule.payload || {},
            timeout_seconds: schedule.timeout_seconds,
            max_retries: schedule.max_retries,
            retry_delay_seconds: schedule.retry_delay_seconds,
            metadata: schedule.metadata || {}
          }}
        />
      </SectionCard>
      <SectionCard title="Run History">
        <SimpleDataTable
          rows={runs}
          rowHref={(row) => {
            const runId = row.run_id || row.id
            return runId ? `/schedules/${scheduleId}/runs/${runId}` : undefined
          }}
          columns={[
            {
              key: 'attempt',
              label: 'Attempt',
              render: (row) => row.attempt || row.attempt_number || '—'
            },
            {
              key: 'triggered_at',
              label: 'Triggered',
              render: (row) =>
                formatRelativeTime(row.triggered_at || row.created_at)
            },
            {
              key: 'completed_at',
              label: 'Completed',
              render: (row) => formatRelativeTime(row.completed_at)
            },
            {
              key: 'status',
              label: 'Status',
              render: (row) => <StatusBadge status={row.status} />
            },
            {
              key: 'status_code',
              label: 'Status code',
              render: (row) => row.status_code || '—'
            },
            {
              key: 'error',
              label: 'Error',
              render: (row) => row.error_message || row.error || '—'
            }
          ]}
          empty="No schedule runs have been recorded yet."
        />
      </SectionCard>
    </div>
  )
}

export function ScheduleRunDetailScreen({
  scheduleId,
  runId
}: {
  scheduleId: string
  runId: string
}) {
  const scheduleQuery = useStudioQuery<AnyRecord>(
    ['schedules', scheduleId],
    `/schedules/${scheduleId}`
  )
  const runQuery = useStudioQuery<AnyRecord>(
    ['schedules', scheduleId, 'runs', runId],
    `/schedules/${scheduleId}/runs/${runId}`
  )

  if (scheduleQuery.isLoading || runQuery.isLoading) {
    return <LoadingPanel label="Loading schedule run" />
  }
  if (scheduleQuery.error || runQuery.error) {
    return (
      <ErrorPanel
        error={scheduleQuery.error || runQuery.error}
        retry={() => {
          void scheduleQuery.refetch()
          void runQuery.refetch()
        }}
      />
    )
  }

  const schedule = scheduleQuery.data || {}
  const run = runQuery.data || {}
  const endpointPath = String(schedule.endpoint || '')
  const agentMatch = endpointPath.match(/\/agents\/([^/]+)/)
  const teamMatch = endpointPath.match(/\/teams\/([^/]+)/)
  const workflowMatch = endpointPath.match(/\/workflows\/([^/]+)/)
  const linkedSessionId = run.session_id || run.linked_session_id || null
  const linkedRunId =
    run.linked_run_id ||
    run.agent_run_id ||
    run.team_run_id ||
    run.workflow_run_id ||
    null

  return (
    <div className="space-y-6">
      <PageHeader
        title={run.name || run.run_id || runId}
        description="Execution detail for an individual scheduled run."
        action={
          <div className="flex items-center gap-2">
            <LinkButton
              href={`/schedules/${scheduleId}`}
              label="Back to schedule"
            />
            <LinkButton href="/schedules" label="All schedules" />
          </div>
        }
      />
      <KeyValueGrid
        items={[
          { label: 'Schedule', value: schedule.name || scheduleId },
          { label: 'Run ID', value: run.run_id || runId },
          { label: 'Status', value: <StatusBadge status={run.status} /> },
          {
            label: 'Triggered',
            value: formatDateTime(run.triggered_at || run.created_at)
          },
          {
            label: 'Completed',
            value: formatDateTime(run.completed_at || run.updated_at)
          },
          { label: 'Status code', value: run.status_code || '—' },
          {
            label: 'Target',
            value: agentMatch?.[1] ? (
              <Link
                href={`/agents/${encodeURIComponent(agentMatch[1])}`}
                className="text-primary underline-offset-4 hover:underline"
              >
                Agent {agentMatch[1]}
              </Link>
            ) : teamMatch?.[1] ? (
              <Link
                href={`/teams/${encodeURIComponent(teamMatch[1])}`}
                className="text-primary underline-offset-4 hover:underline"
              >
                Team {teamMatch[1]}
              </Link>
            ) : workflowMatch?.[1] ? (
              <Link
                href={`/workflows/${encodeURIComponent(workflowMatch[1])}`}
                className="text-primary underline-offset-4 hover:underline"
              >
                Workflow {workflowMatch[1]}
              </Link>
            ) : (
              '—'
            )
          },
          {
            label: 'Linked session',
            value: linkedSessionId ? (
              <Link
                href={`/sessions/${encodeURIComponent(String(linkedSessionId))}`}
                className="text-primary underline-offset-4 hover:underline"
              >
                {String(linkedSessionId)}
              </Link>
            ) : (
              '—'
            )
          }
        ]}
      />
      {linkedRunId ||
      linkedSessionId ||
      agentMatch?.[1] ||
      teamMatch?.[1] ||
      workflowMatch?.[1] ? (
        <SectionCard
          title="Execution Links"
          description="Jump from the scheduler record into the underlying Studio views."
        >
          <div className="flex flex-wrap gap-2">
            {linkedRunId ? (
              <Button variant="outline" asChild>
                <Link
                  href={`/traces?view=runs&run_id=${encodeURIComponent(String(linkedRunId))}`}
                >
                  Open trace search
                </Link>
              </Button>
            ) : null}
            {linkedSessionId ? (
              <Button variant="outline" asChild>
                <Link
                  href={`/traces?view=runs&session_id=${encodeURIComponent(String(linkedSessionId))}`}
                >
                  View session traces
                </Link>
              </Button>
            ) : null}
            {linkedSessionId ? (
              <Button variant="outline" asChild>
                <Link
                  href={`/sessions/${encodeURIComponent(String(linkedSessionId))}`}
                >
                  Open session
                </Link>
              </Button>
            ) : null}
            {agentMatch?.[1] ? (
              <Button variant="outline" asChild>
                <Link href={`/agents/${encodeURIComponent(agentMatch[1])}`}>
                  Open agent
                </Link>
              </Button>
            ) : null}
            {teamMatch?.[1] ? (
              <Button variant="outline" asChild>
                <Link href={`/teams/${encodeURIComponent(teamMatch[1])}`}>
                  Open team
                </Link>
              </Button>
            ) : null}
            {workflowMatch?.[1] ? (
              <Button variant="outline" asChild>
                <Link
                  href={`/workflows/${encodeURIComponent(workflowMatch[1])}`}
                >
                  Open workflow
                </Link>
              </Button>
            ) : null}
          </div>
        </SectionCard>
      ) : null}
      <SectionCard title="Execution Summary">
        <div className="grid gap-6 xl:grid-cols-2">
          <JsonBlock
            data={{
              endpoint: schedule.endpoint,
              method: schedule.method,
              attempt: run.attempt || run.attempt_number,
              error_message: run.error_message || run.error || null,
              requirements: run.requirements || [],
              response_headers: run.response_headers || {},
              metadata: run.metadata || {}
            }}
          />
          <JsonBlock
            data={{
              payload: run.payload || schedule.payload || {},
              response_body:
                run.response_body || run.response || run.result || {},
              linked_run_id:
                run.linked_run_id || run.agent_run_id || run.team_run_id,
              linked_session_id: run.session_id || run.linked_session_id || null
            }}
          />
        </div>
      </SectionCard>
      <SectionCard title="Raw Run Payload">
        <JsonBlock data={run} />
      </SectionCard>
    </div>
  )
}

export function ApprovalsScreen() {
  const { request } = useStudioClient()
  const queryClient = useQueryClient()
  const [selectedApprovalId, setSelectedApprovalId] = useState<string | null>(
    null
  )
  const [sheetOpen, setSheetOpen] = useState(false)
  const approvalsQuery = useStudioQuery<AnyRecord[] | { data?: AnyRecord[] }>(
    ['approvals'],
    '/approvals'
  )
  const countQuery = useStudioQuery<AnyRecord>(
    ['approvals-count', 'page'],
    '/approvals/count'
  )
  const refreshApprovals = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['approvals'] }),
      queryClient.invalidateQueries({ queryKey: ['approvals-count'] }),
      queryClient.invalidateQueries({ queryKey: ['approvals-count', 'page'] })
    ])
  }

  const resolveMutation = useMutation({
    mutationFn: async ({
      approvalId,
      status
    }: {
      approvalId: string
      status: 'approved' | 'rejected'
    }) => {
      return request(`/approvals/${approvalId}/resolve`, {
        method: 'POST',
        body: { status }
      })
    },
    onSuccess: async (_, variables) => {
      toast.success(`Approval ${variables.status}`)
      await refreshApprovals()
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : 'Unable to resolve approval'
      )
    }
  })
  if (approvalsQuery.isLoading)
    return <LoadingPanel label="Loading approvals" />
  if (approvalsQuery.error)
    return (
      <ErrorPanel
        error={approvalsQuery.error}
        retry={() => approvalsQuery.refetch()}
      />
    )

  const approvals = normalizeResourceList(approvalsQuery.data)
  const pendingCount =
    countQuery.data?.pending_count ?? countQuery.data?.count ?? 0

  return (
    <div className="space-y-6">
      <PageHeader
        title="Approvals"
        description="Human-in-the-loop review queue for sensitive tool calls and gated execution."
      />
      {pendingCount ? (
        <Card className="border-amber-500/30 bg-amber-500/10">
          <CardContent className="flex items-center justify-between p-4">
            <div className="text-sm font-medium">
              {formatNumber(pendingCount)} approvals are currently pending
              review.
            </div>
            <Badge variant="warning">{pendingCount}</Badge>
          </CardContent>
        </Card>
      ) : null}
      <SectionCard title="Approval Queue">
        <SimpleDataTable
          rows={approvals}
          columns={[
            {
              key: 'approval_id',
              label: 'Approval ID',
              render: (row) => row.approval_id || row.id
            },
            {
              key: 'status',
              label: 'Status',
              render: (row) => <StatusBadge status={row.status} />
            },
            {
              key: 'tool_name',
              label: 'Tool',
              render: (row) => row.tool_name || row.tool?.name || '—'
            },
            {
              key: 'context',
              label: 'Context',
              render: (row) => {
                const value = row.agent_id || row.team_id || row.workflow_id
                if (!value) return '—'
                const href = getComponentHref(row)
                return href ? (
                  <Link
                    href={href}
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    {String(value)}
                  </Link>
                ) : (
                  String(value)
                )
              }
            },
            {
              key: 'run_id',
              label: 'Run',
              render: (row) => {
                if (!row.run_id) return '—'
                const href = row.session_id
                  ? `/sessions/${encodeURIComponent(String(row.session_id))}/runs/${encodeURIComponent(String(row.run_id))}`
                  : `/traces?view=runs&run_id=${encodeURIComponent(String(row.run_id))}`
                return (
                  <Link
                    href={href}
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    {String(row.run_id)}
                  </Link>
                )
              }
            },
            {
              key: 'created_at',
              label: 'Created',
              render: (row) => formatRelativeTime(row.created_at)
            },
            {
              key: 'actions',
              label: 'Actions',
              render: (row) => {
                const approvalId = String(row.approval_id || row.id)
                return (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedApprovalId(approvalId)
                        setSheetOpen(true)
                      }}
                    >
                      View
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        resolveMutation.mutate({
                          approvalId,
                          status: 'approved'
                        })
                      }
                      disabled={resolveMutation.isPending}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() =>
                        resolveMutation.mutate({
                          approvalId,
                          status: 'rejected'
                        })
                      }
                      disabled={resolveMutation.isPending}
                    >
                      Reject
                    </Button>
                  </div>
                )
              }
            }
          ]}
          empty="No approvals returned."
        />
      </SectionCard>
      <ApprovalReviewSheet
        approvalId={selectedApprovalId}
        open={sheetOpen}
        onOpenChange={(open) => {
          setSheetOpen(open)
          if (!open) setSelectedApprovalId(null)
        }}
        onSuccess={() => {
          void approvalsQuery.refetch()
          void countQuery.refetch()
        }}
      />
    </div>
  )
}

export function RegistryScreen() {
  const [resourceType, setResourceType] = useState('all')
  const [name, setName] = useState('')
  const registryQuery = useStudioQuery<AnyRecord[] | { data?: AnyRecord[] }>(
    ['registry', resourceType, name],
    '/registry',
    {
      resource_type: resourceType === 'all' ? undefined : resourceType,
      name: name || undefined
    }
  )
  if (registryQuery.isLoading) return <LoadingPanel label="Loading registry" />
  if (registryQuery.error)
    return (
      <ErrorPanel
        error={registryQuery.error}
        retry={() => registryQuery.refetch()}
      />
    )

  const resources = normalizeResourceList(registryQuery.data)
  const clientFilteredResources = resources.filter((resource) => {
    const haystack = JSON.stringify({
      id: resource.id || resource.resource_id,
      name: resource.name,
      description: resource.description,
      type: resource.resource_type || resource.type,
      metadata: resource.metadata || {}
    }).toLowerCase()

    return !name.trim() || haystack.includes(name.trim().toLowerCase())
  })
  const typeSummary = clientFilteredResources.reduce<Record<string, number>>(
    (acc, resource) => {
      const key = String(resource.resource_type || resource.type || 'unknown')
      acc[key] = (acc[key] || 0) + 1
      return acc
    },
    {}
  )
  const groupedResources = Object.entries(
    clientFilteredResources.reduce<Record<string, AnyRecord[]>>(
      (acc, resource) => {
        const key = String(resource.resource_type || resource.type || 'other')
        if (!acc[key]) acc[key] = []
        acc[key].push(resource)
        return acc
      },
      {}
    )
  ).sort(([a], [b]) => a.localeCompare(b))
  return (
    <div className="space-y-6">
      <PageHeader
        title="Registry"
        description="Read-only resource catalog for tools, models, databases, schemas, functions, agents, and teams."
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Visible resources"
          value={formatNumber(clientFilteredResources.length)}
          icon={Search}
        />
        <MetricCard
          title="Types represented"
          value={formatNumber(Object.keys(typeSummary).length)}
          icon={GitBranch}
        />
        <MetricCard
          title="Models"
          value={formatNumber(typeSummary.model || 0)}
          icon={Sparkles}
        />
        <MetricCard
          title="Tools"
          value={formatNumber(typeSummary.tool || 0)}
          icon={ShieldCheck}
        />
      </div>
      <SectionCard title="Registry Catalog">
        <div className="mb-6 flex flex-col gap-3 lg:flex-row">
          <Select value={resourceType} onValueChange={setResourceType}>
            <SelectTrigger className="w-full lg:w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="tool">Tool</SelectItem>
                <SelectItem value="model">Model</SelectItem>
                <SelectItem value="db">DB</SelectItem>
                <SelectItem value="vector_db">Vector DB</SelectItem>
                <SelectItem value="schema">Schema</SelectItem>
                <SelectItem value="function">Function</SelectItem>
                <SelectItem value="agent">Agent</SelectItem>
                <SelectItem value="team">Team</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Search by name"
            className="max-w-md"
          />
        </div>
        <div className="space-y-8">
          {groupedResources.map(([type, resources]) => (
            <div key={type} className="space-y-4">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold">{toTitleCase(type)}</h3>
                <Badge variant="secondary">{resources.length}</Badge>
              </div>
              <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
                {resources.map((resource) => {
                  const resourceHref = getComponentHref({
                    ...resource,
                    type: resource.resource_type || resource.type,
                    agent_id:
                      resource.resource_type === 'agent'
                        ? resource.id || resource.resource_id
                        : undefined,
                    team_id:
                      resource.resource_type === 'team'
                        ? resource.id || resource.resource_id
                        : undefined
                  })
                  return (
                    <Card
                      key={resource.id || resource.resource_id || resource.name}
                    >
                      <CardHeader>
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <CardTitle className="text-lg">
                              {resourceHref ? (
                                <Link
                                  href={resourceHref}
                                  className="text-primary underline-offset-4 hover:underline"
                                >
                                  {resource.name || resource.id || 'Resource'}
                                </Link>
                              ) : (
                                resource.name || resource.id || 'Resource'
                              )}
                            </CardTitle>
                            <CardDescription>
                              {resource.id || resource.resource_id || '—'}
                            </CardDescription>
                          </div>
                          <Badge variant="outline">
                            {resource.resource_type ||
                              resource.type ||
                              'resource'}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <p className="text-muted-foreground line-clamp-3 text-sm">
                          {resource.description || 'No description provided.'}
                        </p>
                        <JsonBlock data={resource.metadata || {}} />
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  )
}

export function LegacyPlaygroundScreen() {
  const hasEnvToken = !!process.env.NEXT_PUBLIC_OS_SECURITY_KEY
  const envToken = process.env.NEXT_PUBLIC_OS_SECURITY_KEY || ''
  return (
    <div className="bg-background/80 flex h-screen">
      <Sidebar hasEnvToken={hasEnvToken} envToken={envToken} />
      <ChatArea />
    </div>
  )
}
