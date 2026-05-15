'use client'

import { use } from 'react'
import { ModuleGuard } from '@/src/components/layout/module-guard'
import { RequisicionDetail } from '@/src/components/modulos/consumables/requisiciones/requisicion-detail'
import { useRouter } from 'next/navigation'

export default function RequisicionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()

  return (
    <ModuleGuard slug="consumables">
      <div className="max-w-8xl p-6 sm:p-10 mx-auto animate-fade-in">
        <RequisicionDetail
          id={id}
          onBack={() => router.push('/dashboard/consumables')}
        />
      </div>
    </ModuleGuard>
  )
}
