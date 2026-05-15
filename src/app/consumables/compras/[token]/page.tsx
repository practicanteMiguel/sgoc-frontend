import { ComprasView } from '@/src/components/modulos/consumables/compras/compras-view'

export default async function ComprasPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const expected  = process.env.COMPRAS_TOKEN
  const valid     = !!expected && token === expected
  return <ComprasView valid={valid} />
}
