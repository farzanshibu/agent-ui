'use client'

import { useCallback } from 'react'
import { useStore } from '@/store'

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: BodyInit | Record<string, unknown> | null
  query?: Record<string, string | number | boolean | null | undefined>
}

function withQuery(
  path: string,
  query?: Record<string, string | number | boolean | null | undefined>
) {
  const url = new URL(path, 'http://studio.local')
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return
      url.searchParams.set(key, String(value))
    })
  }

  return `${url.pathname}${url.search}`
}

export function useStudioClient() {
  const endpoint = useStore((state) => state.selectedEndpoint)
  const token = useStore((state) => state.authToken)

  const request = useCallback(
    async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
      const { query, headers, body, ...rest } = options
      const normalizedEndpoint = endpoint.replace(/\/$/, '')
      const response = await fetch(
        `${normalizedEndpoint}${withQuery(path, query)}`,
        {
          ...rest,
          headers: {
            ...(body instanceof FormData
              ? {}
              : { 'Content-Type': 'application/json' }),
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...headers
          },
          body:
            body instanceof FormData ||
            typeof body === 'string' ||
            body === undefined
              ? body
              : JSON.stringify(body)
        }
      )

      if (!response.ok) {
        let errorMessage = `${response.status} ${response.statusText}`
        try {
          const payload = await response.json()
          errorMessage = payload.detail || payload.message || errorMessage
        } catch {}
        throw new Error(errorMessage)
      }

      if (response.status === 204) {
        return null as T
      }

      return response.json() as Promise<T>
    },
    [endpoint, token]
  )

  return {
    endpoint,
    token,
    request
  }
}
