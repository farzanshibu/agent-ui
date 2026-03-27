import { ScheduleDetailScreen } from '@/components/studio/screens'

export default async function ScheduleDetailPage({
  params
}: {
  params: Promise<{ scheduleId: string }>
}) {
  const { scheduleId } = await params
  return <ScheduleDetailScreen scheduleId={scheduleId} />
}
