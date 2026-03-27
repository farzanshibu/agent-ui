'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import {
  Bell,
  ChevronRight,
  Command,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react'

import { AuthGuard } from '@/components/studio/auth-guard'
import { CommandPalette } from '@/components/studio/command-palette'
import { ThemeToggle } from '@/components/studio/theme-toggle'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { NAV_GROUPS } from '@/lib/studio/config'
import { cn } from '@/lib/utils'
import { useStudioClient } from '@/lib/studio/api'
import { useStore } from '@/store'

function Breadcrumbs() {
  const pathname = usePathname()
  const segments = pathname.split('/').filter(Boolean)

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Link href="/dashboard" className="font-medium text-foreground">
        Agno Studio
      </Link>
      {segments.map((segment, index) => {
        const href = `/${segments.slice(0, index + 1).join('/')}`
        return (
          <div key={href} className="flex items-center gap-2">
            <ChevronRight className="h-4 w-4" />
            <Link href={href} className="capitalize hover:text-foreground">
              {segment.replace(/[-_]/g, ' ')}
            </Link>
          </div>
        )
      })}
    </div>
  )
}

function SidebarNav() {
  const pathname = usePathname()
  const sidebarOpen = useStore((state) => state.sidebarOpen)
  const setSidebarOpen = useStore((state) => state.setSidebarOpen)
  const { request } = useStudioClient()
  const clearToken = useStore((state) => state.setAuthToken)

  const { data: approvalCount } = useQuery({
    queryKey: ['approvals-count'],
    queryFn: async () => {
      const result = await request<{ pending_count?: number; count?: number }>(
        '/approvals/count'
      )
      return result.pending_count ?? result.count ?? 0
    },
    refetchInterval: 30_000
  })

  return (
    <aside
      className={cn(
        'sticky top-0 hidden h-screen shrink-0 border-r bg-card/80 backdrop-blur-xl lg:block',
        sidebarOpen ? 'w-72' : 'w-20'
      )}
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between gap-3 border-b px-4 py-4">
          <Link
            href="/dashboard"
            className={cn(
              'flex items-center gap-3',
              !sidebarOpen && 'justify-center'
            )}
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-sm font-semibold text-primary-foreground">
              AS
            </span>
            {sidebarOpen ? (
              <div>
                <div className="text-sm font-semibold">Agno Studio</div>
                <div className="text-xs text-muted-foreground">
                  AgentOS control plane
                </div>
              </div>
            ) : null}
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? (
              <PanelLeftClose className="h-4 w-4" />
            ) : (
              <PanelLeftOpen className="h-4 w-4" />
            )}
          </Button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="space-y-2">
              {sidebarOpen ? (
                <div className="px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {group.label}
                </div>
              ) : null}
              <div className="space-y-1">
                {group.items.map((item) => {
                  const active =
                    pathname === item.href ||
                    (item.href !== '/dashboard' &&
                      pathname.startsWith(item.href))

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition-colors',
                        active
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                        !sidebarOpen && 'justify-center px-2'
                      )}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {sidebarOpen ? (
                        <span className="flex items-center gap-2">
                          {item.label}
                          {item.href === '/approvals' && approvalCount ? (
                            <Badge variant="warning">{approvalCount}</Badge>
                          ) : null}
                        </span>
                      ) : null}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t p-3">
          <Button
            variant="ghost"
            className={cn(
              'w-full justify-start',
              !sidebarOpen && 'justify-center'
            )}
            onClick={() => {
              clearToken('')
              window.location.href = '/login'
            }}
          >
            <LogOut className="h-4 w-4" />
            {sidebarOpen ? <span>Sign out</span> : null}
          </Button>
        </div>
      </div>
    </aside>
  )
}

function StudioHeader() {
  const [paletteOpen, setPaletteOpen] = useState(false)
  const pathname = usePathname()
  const isPlayground = pathname.startsWith('/playground')
  const sidebarOpen = useStore((state) => state.sidebarOpen)
  const setSidebarOpen = useStore((state) => state.setSidebarOpen)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setPaletteOpen((current) => !current)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <>
      <header className="sticky top-0 z-20 border-b bg-background/70 backdrop-blur-xl">
        <div className="flex h-16 items-center justify-between gap-4 px-4 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? (
                <PanelLeftClose className="h-4 w-4" />
              ) : (
                <PanelLeftOpen className="h-4 w-4" />
              )}
            </Button>
            <Breadcrumbs />
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setPaletteOpen(true)}
              className="hidden md:flex"
            >
              <Command className="mr-2 h-4 w-4" />
              Search
              <Badge variant="outline" className="ml-2">
                Cmd+K
              </Badge>
            </Button>
            {isPlayground ? null : (
              <Button variant="ghost" size="icon">
                <Bell className="h-4 w-4" />
              </Button>
            )}
            <ThemeToggle />
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
              AI
            </div>
          </div>
        </div>
      </header>
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </>
  )
}

export function StudioShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const showLegacyShell = useMemo(
    () => pathname.startsWith('/playground'),
    [pathname]
  )

  return (
    <AuthGuard>
      <div className="flex min-h-screen">
        {showLegacyShell ? null : <SidebarNav />}
        <div className="min-w-0 flex-1">
          {showLegacyShell ? null : <StudioHeader />}
          <main
            className={cn(
              showLegacyShell ? 'min-h-screen' : 'px-4 py-6 lg:px-8'
            )}
          >
            <div
              className={cn(
                showLegacyShell ? '' : 'mx-auto max-w-[1440px] space-y-6'
              )}
            >
              {children}
            </div>
          </main>
        </div>
      </div>
    </AuthGuard>
  )
}
