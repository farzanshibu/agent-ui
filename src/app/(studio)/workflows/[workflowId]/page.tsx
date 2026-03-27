import { WorkflowDetailScreen } from '@/components/studio/screens'

export default async function WorkflowDetailPage({
  params
}: {
  params: Promise<{ workflowId: string }>
}) {
  const { workflowId } = await params
  return <WorkflowDetailScreen workflowId={workflowId} />
}
