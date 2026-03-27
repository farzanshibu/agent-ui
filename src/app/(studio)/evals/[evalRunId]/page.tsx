import { EvalDetailScreen } from '@/components/studio/screens'

export default async function EvalDetailPage({
  params
}: {
  params: Promise<{ evalRunId: string }>
}) {
  const { evalRunId } = await params
  return <EvalDetailScreen evalRunId={evalRunId} />
}
