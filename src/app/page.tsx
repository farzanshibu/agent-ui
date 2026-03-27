import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Agno Studio',
  description: 'Redirects into the Agno Studio dashboard.'
}

export default function Home() {
  redirect('/dashboard')
}
