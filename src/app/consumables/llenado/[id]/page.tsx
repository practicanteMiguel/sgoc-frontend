import { LlenadoView } from '@/src/components/modulos/consumables/llenado/llenado-view'

export default async function LlenadoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <LlenadoView id={id} />
}
