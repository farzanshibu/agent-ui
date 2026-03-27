import { SessionRunDetailScreen } from '@/components/studio/screens'

export default async function SessionRunDetailPage({
  params
}: {
  params: Promise<{ sessionId: string; runId: string }>
}) {
  const { sessionId, runId } = await params
  return <SessionRunDetailScreen sessionId={sessionId} runId={runId} />
}
