'use client'

import Link from 'next/link'
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Loader2,
  XCircle
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import {
  formatDateTime,
  formatNumber,
  formatRelativeTime,
  safeJson
} from '@/lib/studio/format'

export function PageHeader({
  title,
  description,
  action
}: {
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        {description ? (
          <p className="max-w-3xl text-sm text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {action}
    </div>
  )
}

export function MetricCard({
  title,
  value,
  icon: Icon,
  tone = 'default',
  hint,
  href
}: {
  title: string
  value: string | number
  icon: React.ComponentType<{ className?: string }>
  tone?: 'default' | 'success' | 'warning' | 'danger'
  hint?: string
  href?: string
}) {
  const content = (
    <Card className="border-border/70 bg-card/80 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardDescription>{title}</CardDescription>
          <span
            className={cn(
              'inline-flex rounded-xl p-2',
              tone === 'success' && 'bg-emerald-500/10 text-emerald-500',
              tone === 'warning' && 'bg-amber-500/10 text-amber-500',
              tone === 'danger' && 'bg-red-500/10 text-red-500',
              tone === 'default' && 'bg-primary/10 text-primary'
            )}
          >
            <Icon className="h-4 w-4" />
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-1">
        <div className="text-3xl font-semibold tracking-tight">{value}</div>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  )

  if (!href) return content
  return (
    <Link
      href={href}
      className="block transition-transform hover:-translate-y-0.5"
    >
      {content}
    </Link>
  )
}

export function SectionCard({
  title,
  description,
  action,
  children,
  className
}: {
  title: string
  description?: string
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <Card className={cn('bg-card/85 backdrop-blur-sm', className)}>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-1.5">
          <CardTitle>{title}</CardTitle>
          {description ? (
            <CardDescription>{description}</CardDescription>
          ) : null}
        </div>
        {action}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

export function StatusBadge({ status }: { status?: string | null }) {
  const normalized = String(status || 'unknown').toUpperCase()
  const tone =
    normalized.includes('PASS') ||
    normalized === 'OK' ||
    normalized === 'COMPLETED' ||
    normalized === 'APPROVED' ||
    normalized === 'ENABLED'
      ? 'success'
      : normalized.includes('PEND') ||
          normalized === 'RUNNING' ||
          normalized === 'PROCESSING' ||
          normalized === 'PAUSED'
        ? 'warning'
        : normalized.includes('ERROR') ||
            normalized.includes('FAIL') ||
            normalized === 'REJECTED' ||
            normalized === 'CANCELLED'
          ? 'danger'
          : 'secondary'

  const Icon =
    tone === 'success'
      ? CheckCircle2
      : tone === 'warning'
        ? Clock3
        : tone === 'danger'
          ? XCircle
          : AlertCircle

  return (
    <Badge variant={tone}>
      <Icon className="mr-1 h-3 w-3" />
      {normalized}
    </Badge>
  )
}

export function EmptyState({
  title,
  description,
  action
}: {
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed p-10 text-center">
      <div className="mb-4 rounded-2xl bg-muted p-3 text-muted-foreground">
        <AlertCircle className="h-5 w-5" />
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        {description}
      </p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}

export function LoadingPanel({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex min-h-[220px] items-center justify-center gap-3 rounded-2xl border bg-card/80">
      <Loader2 className="h-4 w-4 animate-spin text-primary" />
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  )
}

export function ErrorPanel({
  title = 'Unable to load data',
  error,
  retry
}: {
  title?: string
  error: unknown
  retry?: () => void
}) {
  return (
    <EmptyState
      title={title}
      description={
        error instanceof Error ? error.message : 'Unexpected API error'
      }
      action={
        retry ? (
          <Button variant="outline" onClick={retry}>
            Retry
          </Button>
        ) : undefined
      }
    />
  )
}

export function JsonBlock({
  data,
  className
}: {
  data: unknown
  className?: string
}) {
  return (
    <pre
      className={cn(
        'overflow-x-auto rounded-2xl border bg-muted/40 p-4 text-xs leading-6 text-muted-foreground',
        className
      )}
    >
      {safeJson(data)}
    </pre>
  )
}

export function KeyValueGrid({
  items
}: {
  items: Array<{ label: string; value: React.ReactNode }>
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="rounded-2xl border bg-muted/30 p-4">
          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            {item.label}
          </div>
          <div className="mt-2 text-sm font-medium">{item.value}</div>
        </div>
      ))}
    </div>
  )
}

export function SimpleDataTable<T extends Record<string, unknown>>({
  columns,
  rows,
  rowHref,
  empty
}: {
  columns: Array<{
    key: string
    label: string
    render?: (row: T) => React.ReactNode
    className?: string
  }>
  rows: T[]
  rowHref?: (row: T) => string | undefined
  empty?: string
}) {
  if (!rows.length) {
    return (
      <EmptyState
        title="Nothing here yet"
        description={
          empty || 'This table will populate once the API returns records.'
        }
      />
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {columns.map((column) => (
            <TableHead key={column.key} className={column.className}>
              {column.label}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row, index) => {
          const href = rowHref?.(row)
          const content = (
            <>
              {columns.map((column) => (
                <TableCell
                  key={`${column.key}-${index}`}
                  className={column.className}
                >
                  {column.render
                    ? column.render(row)
                    : String(row[column.key] ?? '—')}
                </TableCell>
              ))}
            </>
          )

          return (
            <TableRow key={index}>
              {href ? (
                <TableCell colSpan={columns.length} className="p-0">
                  <Link
                    href={href}
                    className="grid min-h-14 items-center px-4 transition-colors hover:bg-muted/40"
                    style={{
                      gridTemplateColumns: columns
                        .map(() => 'minmax(0, 1fr)')
                        .join(' ')
                    }}
                  >
                    {columns.map((column) => (
                      <div
                        key={`${column.key}-${index}`}
                        className={cn('px-0 py-4', column.className)}
                      >
                        {column.render
                          ? column.render(row)
                          : String(row[column.key] ?? '—')}
                      </div>
                    ))}
                  </Link>
                </TableCell>
              ) : (
                content
              )}
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}

export function ResourceMeta({
  createdAt,
  updatedAt
}: {
  createdAt?: string | number | null
  updatedAt?: string | number | null
}) {
  return (
    <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
      <span title={formatDateTime(createdAt)}>
        Created {formatRelativeTime(createdAt)}
      </span>
      <span title={formatDateTime(updatedAt)}>
        Updated {formatRelativeTime(updatedAt)}
      </span>
    </div>
  )
}

export function LinkButton({ href, label }: { href: string; label: string }) {
  return (
    <Button variant="outline" asChild>
      <Link href={href}>
        {label}
        <ArrowRight className="ml-2 h-4 w-4" />
      </Link>
    </Button>
  )
}

export function TokenPill({ value }: { value?: number | null }) {
  return <span className="font-dmmono text-sm">{formatNumber(value)}</span>
}
