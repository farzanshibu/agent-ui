import { ScheduleRunDetailScreen } from '@/components/studio/screens'

export default async function ScheduleRunDetailPage({
  params
}: {
  params: Promise<{ scheduleId: string; runId: string }>
}) {
  const { scheduleId, runId } = await params
  return <ScheduleRunDetailScreen scheduleId={scheduleId} runId={runId} />
}
