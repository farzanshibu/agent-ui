import { ComponentDetailScreen } from '@/components/studio/screens'

export default async function ComponentDetailPage({
  params
}: {
  params: Promise<{ componentId: string }>
}) {
  const { componentId } = await params
  return <ComponentDetailScreen componentId={componentId} />
}
