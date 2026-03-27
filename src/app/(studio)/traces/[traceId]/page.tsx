import { TraceDetailScreen } from '@/components/studio/screens'

export default async function TraceDetailPage({
  params
}: {
  params: Promise<{ traceId: string }>
}) {
  const { traceId } = await params
  return <TraceDetailScreen traceId={traceId} />
}
