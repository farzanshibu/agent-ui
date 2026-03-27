'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

import { useStore } from '@/store'

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const hydrated = useStore((state) => state.hydrated)
  const token = useStore((state) => state.authToken)

  useEffect(() => {
    if (hydrated && !token) {
      router.replace('/login')
    }
  }, [hydrated, router, token])

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Loading Studio…
      </div>
    )
  }

  if (!token) return null

  return <>{children}</>
}
