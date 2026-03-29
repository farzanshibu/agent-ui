import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)

export function formatNumber(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '0'
  }

  return new Intl.NumberFormat('en-US', {
    notation: value >= 1000 ? 'compact' : 'standard',
    maximumFractionDigits: 1
  }).format(value)
}

export function formatDateTime(value?: string | number | null) {
  if (!value) return 'N/A'
  const date =
    typeof value === 'number' ? new Date(value * 1000) : new Date(value)
  if (Number.isNaN(date.getTime())) return 'N/A'
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date)
}

export function formatRelativeTime(value?: string | number | null) {
  if (!value) return 'N/A'
  const date = typeof value === 'number' ? dayjs.unix(value) : dayjs(value)
  return date.isValid() ? date.fromNow() : 'N/A'
}

export function formatDuration(milliseconds?: number | null) {
  if (!milliseconds) return '0ms'
  if (milliseconds < 1000) return `${Math.round(milliseconds)}ms`
  if (milliseconds < 60_000) return `${(milliseconds / 1000).toFixed(1)}s`
  return `${(milliseconds / 60_000).toFixed(1)}m`
}

export function safeJson(value: unknown) {
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

export function normalizeArray<T>(
  value: T[] | { data?: T[] } | undefined | null
): T[] {
  if (Array.isArray(value)) return value
  if (value && Array.isArray(value.data)) return value.data
  return []
}

export function toTitleCase(value: string) {
  return value
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

export function formatBytes(bytes?: number | null): string {
  if (bytes == null) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

export function formatCron(expression?: string | null): string {
  if (!expression) return ''
  const trimmed = expression.trim()

  if (trimmed === '* * * * *') return 'Every minute'
  if (trimmed === '0 * * * *') return 'Every hour'
  if (trimmed === '0 0 * * *') return 'Daily at midnight'

  const parts = trimmed.split(/\s+/)
  if (parts.length !== 5) return trimmed

  const [minute, hour, day, , weekday] = parts

  // */N patterns
  if (minute.startsWith('*/') && hour === '*') {
    return `Every ${minute.slice(2)} minutes`
  }
  if (minute === '0' && hour.startsWith('*/')) {
    return `Every ${hour.slice(2)} hours`
  }

  // Monthly on the Nth
  if (minute === '0' && hour === '0' && /^\d+$/.test(day)) {
    const suffix =
      day === '1' ? 'st' : day === '2' ? 'nd' : day === '3' ? 'rd' : 'th'
    return `Monthly on the ${day}${suffix}`
  }

  // Daily / weekday at specific hour
  if (minute === '0' && /^\d+$/.test(hour) && day === '*') {
    const h = parseInt(hour, 10)
    const ampm = h >= 12 ? 'PM' : 'AM'
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
    const timeStr = `${h12}:00 ${ampm}`

    if (weekday === '1-5') return `Weekdays at ${timeStr}`
    if (weekday === '*') return `Daily at ${timeStr}`
  }

  return trimmed
}

export function truncateMiddle(text: string, maxLen = 40): string {
  if (text.length <= maxLen) return text
  const ellipsis = '...'
  const available = maxLen - ellipsis.length
  const frontLen = Math.ceil(available / 2)
  const backLen = Math.floor(available / 2)
  return text.slice(0, frontLen) + ellipsis + text.slice(text.length - backLen)
}

export function pluralize(
  count: number,
  singular: string,
  plural?: string
): string {
  const word = count === 1 ? singular : (plural ?? singular + 's')
  return `${count} ${word}`
}
