import { SolicitudView } from '@/src/components/modulos/consumables/solicitudes/solicitud-view'

export default async function SolicitudPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <SolicitudView id={id} />
}
