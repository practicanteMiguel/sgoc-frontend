import { AutrizadorDotacionesView } from '@/src/components/modulos/dotaciones/autorizador-view'

export default async function AutrizadorDotacionPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const expected  = process.env.DOTACIONES_AUTORIZADOR_TOKEN
  const valid     = !!expected && token === expected
  return <AutrizadorDotacionesView valid={valid} />
}
