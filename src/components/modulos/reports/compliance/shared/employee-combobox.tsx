'use client'

import { useState, useRef, useEffect } from 'react'
import { Search, ChevronDown, X } from 'lucide-react'

interface Emp {
  id: string
  first_name: string
  last_name: string
  identification_number: string
  position: string
}

interface Props {
  employees: Emp[]
  value: string
  onChange: (id: string) => void
  disabled?: boolean
  minWidth?: number
}

export function EmployeeCombobox({
  employees,
  value,
  onChange,
  disabled,
  minWidth = 220,
}: Props) {
  const [open,  setOpen]  = useState(false)
  const [query, setQuery] = useState('')
  const triggerRef        = useRef<HTMLButtonElement>(null)
  const [rect,  setRect]  = useState<DOMRect | null>(null)

  const selected = employees.find((e) => e.id === value)

  const filtered = query.trim()
    ? employees.filter((e) => {
        const q = query.toLowerCase()
        return (
          e.first_name.toLowerCase().includes(q) ||
          e.last_name.toLowerCase().includes(q) ||
          e.identification_number.includes(q) ||
          e.position.toLowerCase().includes(q)
        )
      })
    : employees

  function openDropdown() {
    if (disabled) return
    const r = triggerRef.current?.getBoundingClientRect()
    if (r) setRect(r)
    setOpen(true)
    setQuery('')
  }

  function select(id: string) {
    onChange(id)
    setOpen(false)
    setQuery('')
  }

  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (!(e.target as Element).closest('[data-emp-combo]')) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div data-emp-combo style={{ position: 'relative', minWidth }}>
      <button
        ref={triggerRef}
        type="button"
        onClick={openDropdown}
        disabled={disabled}
        className="w-full flex items-start justify-between gap-1 rounded-md px-2 py-1.5 text-left"
        style={{
          background: 'var(--color-surface-1)',
          border: '1px solid var(--color-border)',
          color: selected ? 'var(--color-text-900)' : 'var(--color-text-400)',
          cursor: disabled ? 'default' : 'pointer',
          minHeight: 36,
        }}
      >
        <span className="flex flex-col min-w-0 flex-1">
          {selected ? (
            <>
              <span className="text-xs font-medium" style={{ lineHeight: 1.4 }}>
                {selected.first_name} {selected.last_name}
              </span>
              <span style={{ fontSize: 10, color: 'var(--color-text-400)', lineHeight: 1.4 }}>
                CC {selected.identification_number} &middot; {selected.position}
              </span>
            </>
          ) : (
            <span className="text-xs" style={{ lineHeight: 2.2 }}>-- empleado --</span>
          )}
        </span>
        {!disabled && (
          <ChevronDown
            size={12}
            className="shrink-0 mt-1"
            style={{ color: 'var(--color-text-400)' }}
          />
        )}
      </button>

      {open && rect && (
        <div
          data-emp-combo
          style={{
            position: 'fixed',
            top: rect.bottom + 4,
            left: rect.left,
            width: Math.max(rect.width, 300),
            zIndex: 99999,
            background: 'var(--color-surface-0)',
            border: '1px solid var(--color-border)',
            borderRadius: 8,
            boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
            maxHeight: 300,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div className="p-2" style={{ borderBottom: '1px solid var(--color-border)' }}>
            <div
              className="flex items-center gap-2 rounded-md px-2 py-1.5"
              style={{
                background: 'var(--color-surface-1)',
                border: '1px solid var(--color-border)',
              }}
            >
              <Search size={12} style={{ color: 'var(--color-text-400)', flexShrink: 0 }} />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Nombre, cedula o cargo..."
                className="flex-1 bg-transparent text-xs outline-none"
                style={{ color: 'var(--color-text-900)' }}
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  style={{ color: 'var(--color-text-400)', flexShrink: 0 }}
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          <div style={{ overflowY: 'auto', flex: 1 }}>
            {value && (
              <button
                type="button"
                onClick={() => select('')}
                className="w-full px-3 py-2 text-left text-xs hover:opacity-70"
                style={{
                  color: 'var(--color-text-400)',
                  borderBottom: '1px solid var(--color-border)',
                }}
              >
                -- ninguno --
              </button>
            )}
            {filtered.map((emp) => (
              <button
                key={emp.id}
                type="button"
                onClick={() => select(emp.id)}
                className="w-full px-3 py-2 text-left hover:opacity-80 flex flex-col gap-0.5"
                style={{
                  background: emp.id === value ? 'var(--color-surface-2)' : 'transparent',
                  borderBottom: '1px solid var(--color-border)',
                }}
              >
                <span className="text-xs font-medium" style={{ color: 'var(--color-text-900)' }}>
                  {emp.first_name} {emp.last_name}
                </span>
                <span style={{ fontSize: 10, color: 'var(--color-text-400)' }}>
                  CC {emp.identification_number} &middot; {emp.position}
                </span>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="px-3 py-4 text-xs text-center" style={{ color: 'var(--color-text-400)' }}>
                Sin resultados
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
