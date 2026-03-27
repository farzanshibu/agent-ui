import type { LucideIcon } from 'lucide-react'
import {
  Activity,
  Blocks,
  Brain,
  CalendarClock,
  CheckCheck,
  Database,
  Gauge,
  GitBranch,
  Home,
  Library,
  MemoryStick,
  Network,
  PackageSearch,
  PlayCircle,
  ShieldCheck,
  Sparkles,
  Users,
  Waypoints
} from 'lucide-react'

export type StudioNavItem = {
  href: string
  label: string
  icon: LucideIcon
}

export const NAV_GROUPS: Array<{ label: string; items: StudioNavItem[] }> = [
  {
    label: 'Overview',
    items: [{ href: '/dashboard', label: 'Dashboard', icon: Home }]
  },
  {
    label: 'Agents & AI',
    items: [
      { href: '/agents', label: 'Agents', icon: Sparkles },
      { href: '/teams', label: 'Teams', icon: Users },
      { href: '/workflows', label: 'Workflows', icon: GitBranch }
    ]
  },
  {
    label: 'Conversations',
    items: [{ href: '/sessions', label: 'Sessions', icon: PlayCircle }]
  },
  {
    label: 'Intelligence',
    items: [
      { href: '/memory', label: 'Memory', icon: MemoryStick },
      { href: '/knowledge', label: 'Knowledge Base', icon: Library }
    ]
  },
  {
    label: 'Quality',
    items: [
      { href: '/evals', label: 'Evaluations', icon: CheckCheck },
      { href: '/traces', label: 'Traces', icon: Activity }
    ]
  },
  {
    label: 'Platform',
    items: [
      { href: '/metrics', label: 'Metrics', icon: Gauge },
      { href: '/components', label: 'Components', icon: Blocks },
      { href: '/schedules', label: 'Schedules', icon: CalendarClock },
      { href: '/approvals', label: 'Approvals', icon: ShieldCheck },
      { href: '/registry', label: 'Registry', icon: PackageSearch }
    ]
  }
]

export const COMMAND_CENTER_ITEMS: StudioNavItem[] = [
  ...NAV_GROUPS.flatMap((group) => group.items),
  { href: '/playground', label: 'Legacy Playground', icon: Brain },
  { href: '/traces', label: 'Observability', icon: Network },
  { href: '/registry', label: 'Resource Catalog', icon: Database },
  { href: '/workflows', label: 'Workflow Builder', icon: Waypoints }
]
