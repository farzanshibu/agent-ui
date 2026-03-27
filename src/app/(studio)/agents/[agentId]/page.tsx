import { AgentDetailScreen } from '@/components/studio/screens'

export default async function AgentDetailPage({
  params
}: {
  params: Promise<{ agentId: string }>
}) {
  const { agentId } = await params
  return <AgentDetailScreen agentId={agentId} />
}
