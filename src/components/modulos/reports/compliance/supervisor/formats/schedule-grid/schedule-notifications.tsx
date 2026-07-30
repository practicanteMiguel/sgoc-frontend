import { Bell, AlertTriangle, CheckCircle2, Wallet } from 'lucide-react'
import type { Employee } from '@/src/types/reports.types'
import type { HabitualidadAlert, WorkedRestAlert } from '@/src/lib/utils'

interface ScheduleNotificationsProps {
  fieldEmployees: Employee[]
  habitualidadAlerts: HabitualidadAlert[]
  workedRestAlerts: WorkedRestAlert[]
}

export function ScheduleNotifications({ fieldEmployees, habitualidadAlerts, workedRestAlerts }: ScheduleNotificationsProps) {
  const hasNovedades = habitualidadAlerts.length > 0 || workedRestAlerts.length > 0

  const empName = (id: string) => {
    const e = fieldEmployees.find((emp) => emp.id === id)
    return e ? `${e.first_name} ${e.last_name}` : id
  }

  const workedRestByEmp = new Map<string, WorkedRestAlert[]>()
  for (const a of workedRestAlerts) {
    const list = workedRestByEmp.get(a.employeeId) ?? []
    list.push(a)
    workedRestByEmp.set(a.employeeId, list)
  }

  return (
    <div className="rounded-lg p-3 flex flex-col gap-2" style={{ background: 'var(--color-surface-1)', border: '1px solid var(--color-border)' }}>
      <div className="flex items-center gap-2">
        <Bell size={13} style={{ color: 'var(--color-text-400)' }} />
        <p className="text-xs font-semibold" style={{ color: 'var(--color-text-600)' }}>Novedades</p>
      </div>
      {!hasNovedades && (
        <p className="text-xs" style={{ color: 'var(--color-text-400)' }}>Sin novedad para este mes</p>
      )}
      {habitualidadAlerts.map((a) => (
        <div
          key={`hab-${a.employeeId}`}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
          style={{ background: a.pending ? 'rgba(217,119,6,0.1)' : 'rgba(22,163,74,0.08)', color: a.pending ? '#b45309' : '#15803d' }}
        >
          {a.pending ? <AlertTriangle size={13} /> : <CheckCircle2 size={13} />}
          <span>
            <strong>{empName(a.employeeId)}</strong> trabajo {a.sundaysWorked} domingos este mes (habitualidad).{' '}
            {a.pending ? 'Debe asignarsele 1 dia de descanso (S) adicional.' : 'Descanso adicional ya asignado.'}
          </span>
        </div>
      ))}
      {[...workedRestByEmp.entries()].map(([empId, days]) => (
        <div
          key={`dl-${empId}`}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
          style={{ background: 'rgba(29,78,216,0.08)', color: '#1d4ed8' }}
        >
          <Wallet size={13} />
          <span>
            <strong>{empName(empId)}</strong> tiene {days.length} dia(s) de descanso laborado ({days.map((d) => d.fecha.split('-')[2]).join(', ')}). Se debe pagar segun tarifas de nomina.
          </span>
        </div>
      ))}
    </div>
  )
}
