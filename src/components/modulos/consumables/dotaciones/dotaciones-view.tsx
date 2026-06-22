'use client'

import { useAuthStore } from '@/src/stores/auth.store'
import { SupervisorDotacionTab } from './supervisor-tab'
import { EncargadoDotacionTab } from './encargado-tab'
import { ShieldOff } from 'lucide-react'

export function DotacionesView() {
  const { user } = useAuthStore()
  const roles = user?.roles ?? []

  const isSupervisor  = roles.includes('supervisor')
  const isCoordinator = roles.includes('coordinator')
  const isEncargado   = roles.includes('module_manager') || roles.includes('admin')

  if (isSupervisor || isCoordinator) return <SupervisorDotacionTab />
  if (isEncargado)                   return <EncargadoDotacionTab />

  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
      <ShieldOff size={28} style={{ color: 'var(--color-text-400)' }} />
      <p className="text-sm" style={{ color: 'var(--color-text-400)' }}>
        El modulo de dotaciones se gestiona desde el enlace del autorizador.
      </p>
    </div>
  )
}
