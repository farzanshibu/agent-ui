import type { Metadata } from 'next'
import { DM_Mono, Geist } from 'next/font/google'
import { NuqsAdapter } from 'nuqs/adapters/next/app'
import { Toaster } from '@/components/ui/sonner'
import { AppProviders } from '@/components/providers/app-providers'
import './globals.css'
const geistSans = Geist({
  variable: '--font-geist-sans',
  weight: '400',
  subsets: ['latin']
})

const dmMono = DM_Mono({
  subsets: ['latin'],
  variable: '--font-dm-mono',
  weight: '400'
})

export const metadata: Metadata = {
  title: 'Agno Studio',
  description:
    'Agno Studio is a control plane for operating agents, teams, workflows, sessions, traces, approvals, and platform analytics.'
}

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${dmMono.variable} antialiased`}>
        <AppProviders>
          <NuqsAdapter>{children}</NuqsAdapter>
        </AppProviders>
        <Toaster />
      </body>
    </html>
  )
}
