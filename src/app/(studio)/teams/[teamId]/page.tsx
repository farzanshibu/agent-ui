import { TeamDetailScreen } from '@/components/studio/screens'

export default async function TeamDetailPage({
  params
}: {
  params: Promise<{ teamId: string }>
}) {
  const { teamId } = await params
  return <TeamDetailScreen teamId={teamId} />
}
