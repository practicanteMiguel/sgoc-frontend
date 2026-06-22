import { HseView } from '@/src/components/modulos/dotaciones/hse-view'

export default async function DotacionHsePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  return <HseView token={token} />
}
