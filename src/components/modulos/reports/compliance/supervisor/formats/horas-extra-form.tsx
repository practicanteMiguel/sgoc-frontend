'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, Loader2, Save, Send } from 'lucide-react'
import { useHorasExtraRecords, useSaveHorasExtra } from '@/src/hooks/compliance/use-formats'
import { useSubmitDeliverable } from '@/src/hooks/compliance/use-deliverables'
import { useEmployees } from '@/src/hooks/reports/use-employees'
import { EmployeeCombobox } from '../../shared/employee-combobox'
import type { Deliverable } from '@/src/types/compliance.types'

interface HERow {
  employee_id: string
  fecha_reporte: string
  entrada: string
  salida: string
  hed: string
  hen: string
  hfd: string
  hefd: string
  hefn: string
  rn: string
  actividad: string
}

const emptyRow = (): HERow => ({
  employee_id: '', fecha_reporte: '', entrada: '', salida: '',
  hed: '0', hen: '0', hfd: '0', hefd: '0', hefn: '0', rn: '0', actividad: '',
})

const inputStyle = {
  background: 'var(--color-surface-1)',
  border: '1px solid var(--color-border)',
  color: 'var(--color-text-900)',
} as const

const numCols = ['hed', 'hen', 'hfd', 'hefd', 'hefn', 'rn'] as const

interface Props {
  deliverable: Deliverable
  readOnly?: boolean
  onClose: () => void
}

export function HorasExtraForm({ deliverable, readOnly = false, onClose }: Props) {
  const [rows, setRows] = useState<HERow[]>([emptyRow()])

  const { data: records, isLoading } = useHorasExtraRecords(deliverable.id)
  const { data: empData }            = useEmployees({ field_id: deliverable.field.id })
  const employees                    = empData?.data ?? []
  const save                         = useSaveHorasExtra()
  const submit                       = useSubmitDeliverable()

  useEffect(() => {
    if (!records) return
    setRows(
      records.length > 0
        ? records.map((r) => ({
            employee_id:   r.employee.id,
            fecha_reporte: r.fecha_reporte,
            entrada:       r.entrada ?? '',
            salida:        r.salida ?? '',
            hed:           r.hed,
            hen:           r.hen,
            hfd:           r.hfd,
            hefd:          r.hefd,
            hefn:          r.hefn,
            rn:            r.rn,
            actividad:     r.actividad ?? '',
          }))
        : [emptyRow()],
    )
  }, [records])

  function update(i: number, field: keyof HERow, val: string) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [field]: val } : r)))
  }

  const validRows = rows.filter((r) => r.employee_id && r.fecha_reporte)

  async function handleSave() {
    await save.mutateAsync({
      deliverableId: deliverable.id,
      rows: validRows.map((r) => ({
        employee_id:   r.employee_id,
        fecha_reporte: r.fecha_reporte,
        entrada:       r.entrada || undefined,
        salida:        r.salida || undefined,
        hed:           Number(r.hed),
        hen:           Number(r.hen),
        hfd:           Number(r.hfd),
        hefd:          Number(r.hefd),
        hefn:          Number(r.hefn),
        rn:            Number(r.rn),
        actividad:     r.actividad || undefined,
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
        <table className="w-full text-sm" style={{ minWidth: 1200 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
              {[
                { label: 'Empleado',  minWidth: 240 },
                { label: 'Fecha',     minWidth: 120 },
                { label: 'Entrada',   minWidth: 88 },
                { label: 'Salida',    minWidth: 88 },
                { label: 'HED',       minWidth: 64 },
                { label: 'HEN',       minWidth: 64 },
                { label: 'HFD',       minWidth: 64 },
                { label: 'HEFD',      minWidth: 64 },
                { label: 'HEFN',      minWidth: 64 },
                { label: 'RN',        minWidth: 64 },
                { label: 'Actividad', minWidth: 180 },
                { label: '',          minWidth: 32 },
              ].map((h) => (
                <th
                  key={h.label}
                  className="text-left py-2 px-1 text-xs font-medium"
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
                  <input type="date" value={row.fecha_reporte} disabled={readOnly}
                    onChange={(e) => update(i, 'fecha_reporte', e.target.value)}
                    className="rounded-md px-2 py-1.5 text-xs" style={inputStyle} />
                </td>
                <td className="py-1.5 px-1">
                  <input type="time" value={row.entrada} disabled={readOnly}
                    onChange={(e) => update(i, 'entrada', e.target.value)}
                    className="rounded-md px-2 py-1.5 text-xs w-20" style={inputStyle} />
                </td>
                <td className="py-1.5 px-1">
                  <input type="time" value={row.salida} disabled={readOnly}
                    onChange={(e) => update(i, 'salida', e.target.value)}
                    className="rounded-md px-2 py-1.5 text-xs w-20" style={inputStyle} />
                </td>
                {numCols.map((col) => (
                  <td key={col} className="py-1.5 px-1">
                    <input
                      type="number"
                      min={0}
                      step="0.5"
                      value={row[col]}
                      disabled={readOnly}
                      onChange={(e) => update(i, col, e.target.value)}
                      className="rounded-md px-2 py-1.5 text-xs w-14"
                      style={inputStyle}
                    />
                  </td>
                ))}
                <td className="py-1.5 px-1">
                  <input type="text" value={row.actividad} disabled={readOnly}
                    onChange={(e) => update(i, 'actividad', e.target.value)}
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
