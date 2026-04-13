'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, Loader2, Save, Send } from 'lucide-react'
import { useDisponibilidadRecords, useSaveDisponibilidad } from '@/src/hooks/compliance/use-formats'
import { useSubmitDeliverable } from '@/src/hooks/compliance/use-deliverables'
import { useEmployees } from '@/src/hooks/reports/use-employees'
import { EmployeeCombobox } from '../../shared/employee-combobox'
import type { Deliverable } from '@/src/types/compliance.types'

interface DispRow {
  employee_id: string
  fecha_inicio: string
  fecha_final: string
  valor_total: string
  descripcion: string
  quien_reporta: string
}

const emptyRow = (): DispRow => ({
  employee_id: '', fecha_inicio: '', fecha_final: '',
  valor_total: '', descripcion: '', quien_reporta: '',
})

const inputStyle = {
  background: 'var(--color-surface-1)',
  border: '1px solid var(--color-border)',
  color: 'var(--color-text-900)',
} as const

interface Props {
  deliverable: Deliverable
  readOnly?: boolean
  onClose: () => void
}

export function DisponibilidadForm({ deliverable, readOnly = false, onClose }: Props) {
  const [rows, setRows] = useState<DispRow[]>([emptyRow()])

  const { data: records, isLoading } = useDisponibilidadRecords(deliverable.id)
  const { data: empData }            = useEmployees({ field_id: deliverable.field.id })
  const employees                    = empData?.data ?? []
  const save                         = useSaveDisponibilidad()
  const submit                       = useSubmitDeliverable()

  useEffect(() => {
    if (!records) return
    setRows(
      records.length > 0
        ? records.map((r) => ({
            employee_id:   r.employee.id,
            fecha_inicio:  r.fecha_inicio,
            fecha_final:   r.fecha_final,
            valor_total:   r.valor_total,
            descripcion:   r.descripcion ?? '',
            quien_reporta: r.quien_reporta ?? '',
          }))
        : [emptyRow()],
    )
  }, [records])

  function update(i: number, field: keyof DispRow, val: string) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [field]: val } : r)))
  }

  const validRows = rows.filter(
    (r) => r.employee_id && r.fecha_inicio && r.fecha_final && r.valor_total,
  )

  async function handleSave() {
    await save.mutateAsync({
      deliverableId: deliverable.id,
      rows: validRows.map((r) => ({
        employee_id:   r.employee_id,
        fecha_inicio:  r.fecha_inicio,
        fecha_final:   r.fecha_final,
        valor_total:   parseFloat(r.valor_total),
        descripcion:   r.descripcion || undefined,
        quien_reporta: r.quien_reporta || undefined,
      })),
    })
  }

  async function handleSaveAndSubmit() {
    await handleSave()
    await submit.mutateAsync(deliverable.id)
    onClose()
  }

  const busy = save.isPending || submit.isPending

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-secondary)' }} />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div style={{ overflowX: 'auto' }}>
        <table className="w-full text-sm" style={{ minWidth: 1100 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
              {[
                { label: 'Empleado',      minWidth: 240 },
                { label: 'Fecha inicio',  minWidth: 120 },
                { label: 'Fecha fin',     minWidth: 120 },
                { label: 'Valor total',   minWidth: 120 },
                { label: 'Descripcion',   minWidth: 200 },
                { label: 'Quien reporta', minWidth: 160 },
                { label: '',              minWidth: 32 },
              ].map((h) => (
                <th
                  key={h.label}
                  className="text-left py-2 px-2 text-xs font-medium"
                  style={{ color: 'var(--color-text-400)', minWidth: h.minWidth }}
                >
                  {h.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td className="py-1.5 px-1">
                  <EmployeeCombobox
                    employees={employees}
                    value={row.employee_id}
                    onChange={(id) => update(i, 'employee_id', id)}
                    disabled={readOnly}
                    minWidth={240}
                  />
                </td>
                <td className="py-1.5 px-1">
                  <input type="date" value={row.fecha_inicio} disabled={readOnly}
                    onChange={(e) => update(i, 'fecha_inicio', e.target.value)}
                    className="rounded-md px-2 py-1.5 text-xs w-full" style={inputStyle} />
                </td>
                <td className="py-1.5 px-1">
                  <input type="date" value={row.fecha_final} disabled={readOnly}
                    onChange={(e) => update(i, 'fecha_final', e.target.value)}
                    className="rounded-md px-2 py-1.5 text-xs w-full" style={inputStyle} />
                </td>
                <td className="py-1.5 px-1">
                  <input type="number" min={0} step="0.01" value={row.valor_total} disabled={readOnly}
                    onChange={(e) => update(i, 'valor_total', e.target.value)}
                    placeholder="0.00" className="rounded-md px-2 py-1.5 text-xs w-full" style={inputStyle} />
                </td>
                <td className="py-1.5 px-1">
                  <input type="text" value={row.descripcion} disabled={readOnly}
                    onChange={(e) => update(i, 'descripcion', e.target.value)}
                    placeholder="Opcional" className="rounded-md px-2 py-1.5 text-xs w-full" style={inputStyle} />
                </td>
                <td className="py-1.5 px-1">
                  <input type="text" value={row.quien_reporta} disabled={readOnly}
                    onChange={(e) => update(i, 'quien_reporta', e.target.value)}
                    placeholder="Opcional" className="rounded-md px-2 py-1.5 text-xs w-full" style={inputStyle} />
                </td>
                <td className="py-1.5 px-1">
                  {!readOnly && (
                    <button
                      onClick={() =>
                        setRows((prev) =>
                          prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev,
                        )
                      }
                      className="w-6 h-6 flex items-center justify-center rounded hover:opacity-70"
                      style={{ color: 'var(--color-danger)' }}
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!readOnly && (
        <button
          onClick={() => setRows((prev) => [...prev, emptyRow()])}
          className="self-start flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
          style={{
            background: 'var(--color-surface-2)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-600)',
          }}
        >
          <Plus size={13} /> Agregar fila
        </button>
      )}

      <div
        className="flex gap-3 justify-end pt-3"
        style={{ borderTop: '1px solid var(--color-border)' }}
      >
        <button
          onClick={onClose}
          disabled={busy}
          className="px-4 py-2 rounded-lg text-sm"
          style={{
            background: 'var(--color-surface-2)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-600)',
          }}
        >
          {readOnly ? 'Cerrar' : 'Cancelar'}
        </button>
        {!readOnly && (
          <>
            <button
              onClick={handleSave}
              disabled={busy || validRows.length === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
              style={{
                background: 'var(--color-surface-1)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-900)',
                opacity: busy || validRows.length === 0 ? 0.6 : 1,
              }}
            >
              {save.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Guardar
            </button>
            {deliverable.status === 'pendiente' && (
              <button
                onClick={handleSaveAndSubmit}
                disabled={busy || validRows.length === 0}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold"
                style={{
                  background: 'var(--color-primary)',
                  color: '#fff',
                  opacity: busy || validRows.length === 0 ? 0.6 : 1,
                }}
              >
                {submit.isPending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Send size={14} />
                )}
                Guardar y entregar
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
