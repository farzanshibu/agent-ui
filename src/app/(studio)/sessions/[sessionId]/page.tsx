import { SessionDetailScreen } from '@/components/studio/screens'

export default async function SessionDetailPage({
  params
}: {
  params: Promise<{ sessionId: string }>
}) {
  const { sessionId } = await params
  return <SessionDetailScreen sessionId={sessionId} />
}
