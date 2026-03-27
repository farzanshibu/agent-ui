'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useStore } from '@/store'

export default function LoginPage() {
  const router = useRouter()
  const token = useStore((state) => state.authToken)
  const selectedEndpoint = useStore((state) => state.selectedEndpoint)
  const setAuthToken = useStore((state) => state.setAuthToken)
  const setSelectedEndpoint = useStore((state) => state.setSelectedEndpoint)

  const [endpoint, setEndpoint] = useState(selectedEndpoint)
  const [localToken, setLocalToken] = useState(token)

  useEffect(() => {
    if (token) {
      router.replace('/dashboard')
    }
  }, [router, token])

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="grid w-full max-w-5xl gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border bg-card/80 px-4 py-2 text-sm text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Bearer-authenticated control plane for Agno AgentOS
          </div>
          <div className="space-y-4">
            <h1 className="text-4xl font-semibold tracking-tight">
              Agno Studio
            </h1>
            <p className="max-w-2xl text-base text-muted-foreground">
              Sign in with the AgentOS API endpoint and bearer token. The Studio
              will use that token for all authenticated routes and streaming run
              operations.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {[
              [
                '15+ pages',
                'Operational dashboards, detail views, and live execution workspaces.'
              ],
              [
                '60+ endpoints',
                'Wired against the Product Requirements Document endpoint surface.'
              ],
              [
                '10 modules',
                'Agents, teams, workflows, sessions, memory, knowledge, traces, metrics, approvals, and registry.'
              ],
              [
                'Streaming runs',
                'Existing agent/team SSE workbench preserved in the new shell.'
              ]
            ].map(([title, description]) => (
              <Card key={title} className="bg-card/70">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{title}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  {description}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <Card className="bg-card/85 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Connect to AgentOS</CardTitle>
            <CardDescription>
              `NEXT_PUBLIC_AGENTOS_URL` and `NEXT_PUBLIC_API_TOKEN` are used
              automatically when present, but you can override them here.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium">AgentOS base URL</label>
              <Input
                value={endpoint}
                onChange={(event) => setEndpoint(event.target.value)}
                placeholder="https://your-agentos.example.com"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Bearer token</label>
              <Input
                value={localToken}
                onChange={(event) => setLocalToken(event.target.value)}
                type="password"
                placeholder="paste your API token"
              />
            </div>
            <Button
              className="w-full"
              onClick={() => {
                if (!endpoint.trim() || !localToken.trim()) {
                  toast.error('Endpoint and bearer token are required')
                  return
                }
                setSelectedEndpoint(endpoint.trim().replace(/\/$/, ''))
                setAuthToken(localToken.trim())
                toast.success('Studio connected')
                router.push('/dashboard')
              }}
            >
              Enter Studio
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
