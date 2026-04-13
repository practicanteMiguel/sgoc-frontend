import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// Combina clases de Tailwind sin conflictos
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Formatea fecha a string legible
export function formatDate(date: string | Date): string {
  const normalized =
    typeof date === "string" ? date.replace(" ", "T") : date;
  const d = new Date(normalized);
  if (isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

// Obtiene las iniciales de un nombre completo
export function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

// Traduce el slug del rol a nombre legible
export const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  coordinator: "Coordinador",
  module_manager: "Encargado de Módulo",
  supervisor: "Supervisor",
};

// Traduce la prioridad de notificación
export const PRIORITY_LABELS: Record<string, string> = {
  low: "Informativo",
  medium: "Media prioridad",
  high: "Urgente",
};

// ---- Schedule / compliance utils --------------------------------------------

import type { ScheduleTipo, Turno } from "@/src/types/compliance.types";

export const TURNO_COLORS: Record<Turno, { bg: string; color: string }> = {
  D:      { bg: '#fef08a', color: '#713f12' },
  N:      { bg: '#1e3a5f', color: '#bfdbfe' },
  S:      { bg: '#86efac', color: '#14532d' },
  DN:     { bg: '#ede9fe', color: '#7c3aed' },
  NS:     { bg: '#4c1d95', color: '#ddd6fe' },
  DF:     { bg: '#ef4444', color: '#ffffff' },
  AUS:    { bg: '#bae6fd', color: '#0369a1' },
  INC:    { bg: '#fed7aa', color: '#c2410c' },
  DLD:    { bg: '#bfdbfe', color: '#1d4ed8' },
  DLN:    { bg: '#1d4ed8', color: '#bfdbfe' },
  'L-50': { bg: '#dcfce7', color: '#16a34a' },
  VAC:    { bg: '#4ade80', color: '#14532d' },
  ANT:    { bg: '#d1fae5', color: '#065f46' },
  LT:     { bg: '#fef3c7', color: '#92400e' },
  PS:     { bg: '#f9a8d4', color: '#831843' },
}

export const TURNO_LABELS: Record<Turno, string> = {
  D:      'Turno dia (6:00 - 18:00)',
  N:      'Turno noche (18:00 - 6:00)',
  S:      'Descanso',
  DN:     'Turno noct. festivo (18:00 - 24:00)',
  NS:     'Turno noct. festivo (00:01 - 6:00)',
  DF:     'Dia de la familia',
  AUS:    'Ausentismo',
  INC:    'Incapacidad',
  DLD:    'Descanso laborado de dia',
  DLN:    'Descanso laborado de noche',
  'L-50': 'Dia ley 50',
  VAC:    'Vacaciones',
  ANT:    'Dias antiguedad',
  LT:     'Licencia luto',
  PS:     'Permiso sindical',
}

export const ALL_TURNOS  = Object.keys(TURNO_COLORS) as Turno[]
export const DAY_ABBR    = ['D', 'L', 'M', 'MI', 'J', 'V', 'S']
export const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

export function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate()
}

export function padDate(y: number, m: number, d: number) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function dateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function toNextMonday(date: Date): Date {
  const dow = date.getDay()
  if (dow === 1) return date
  return addDays(date, dow === 0 ? 1 : 8 - dow)
}

function calcEaster(year: number): Date {
  const a  = year % 19
  const b  = Math.floor(year / 100)
  const c  = year % 100
  const d  = Math.floor(b / 4)
  const e  = b % 4
  const f  = Math.floor((b + 8) / 25)
  const g  = Math.floor((b - f + 1) / 3)
  const h  = (19 * a + b - d - g + 15) % 30
  const i  = Math.floor(c / 4)
  const k  = c % 4
  const l  = (32 + 2 * e + 2 * i - h - k) % 7
  const m2 = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m2 + 114) / 31)
  const day   = ((h + l - 7 * m2 + 114) % 31) + 1
  return new Date(year, month - 1, day)
}

export function getColombianHolidays(year: number): Set<string> {
  const s    = new Set<string>()
  const add  = (d: Date) => s.add(dateKey(d))
  const addM = (d: Date) => add(toNextMonday(d))

  add(new Date(year, 0, 1))
  add(new Date(year, 4, 1))
  add(new Date(year, 6, 20))
  add(new Date(year, 7, 7))
  add(new Date(year, 11, 8))
  add(new Date(year, 11, 25))

  addM(new Date(year, 0, 6))
  addM(new Date(year, 2, 19))
  addM(new Date(year, 5, 29))
  addM(new Date(year, 7, 15))
  addM(new Date(year, 9, 12))
  addM(new Date(year, 10, 1))
  addM(new Date(year, 10, 11))

  const easter = calcEaster(year)
  add(addDays(easter, -3))
  add(addDays(easter, -2))
  addM(addDays(easter, 39))
  addM(addDays(easter, 60))
  addM(addDays(easter, 68))

  return s
}

export function getWeekGroups(year: number, month: number, totalDays: number) {
  const groups: { week: number; days: number[] }[] = []
  let week = 1
  let days: number[] = []

  for (let d = 1; d <= totalDays; d++) {
    const dow = new Date(year, month - 1, d).getDay()
    if (dow === 1 && d > 1) {
      groups.push({ week, days })
      week++
      days = [d]
    } else {
      days.push(d)
    }
  }
  if (days.length > 0) groups.push({ week, days })
  return groups
}

export function defaultTurno(tipo: ScheduleTipo, year: number, month: number, day: number): Turno {
  if (tipo === '5x2') {
    const dow = new Date(year, month - 1, day).getDay()
    return dow === 0 || dow === 6 ? 'S' : 'D'
  }
  return 'S'
}

export const CYCLE_6X6: Turno[] = ['D','D','D','N','N','N','S','S','S','S','S','S']
const CYCLE_CORE = new Set<Turno>(['D', 'N', 'S'])

export function inferNextCyclePos(allDays: Turno[], defaultPos: number): number {
  const windows = [...new Set([allDays.length, 10, 5])].filter((w) => w > 0)

  for (const w of windows) {
    const days    = allDays.slice(-w)
    const nonWild = days.filter((t) => CYCLE_CORE.has(t)).length
    if (nonWild < 2) continue

    const scores = Array.from({ length: 12 }, (_, p) => {
      let s = 0
      for (let i = 0; i < days.length; i++) {
        if (!CYCLE_CORE.has(days[i])) continue
        if (CYCLE_6X6[(p + i) % 12] === days[i]) s++
      }
      return s
    })

    const best = Math.max(...scores)
    if (best < Math.ceil(nonWild * 0.8)) continue

    for (let p = 11; p >= 0; p--) {
      if (scores[p] === best) return (p + days.length) % 12
    }
  }
  return defaultPos
}

export function build6x6Grid(
  year: number,
  month: number,
  employees: Array<{ id: string }>,
  prevEmployees: Record<string, Turno[]>,
): Record<string, Record<string, Turno>> {
  const total = daysInMonth(year, month)
  const grid: Record<string, Record<string, Turno>> = {}
  employees.forEach((emp, idx) => {
    const defaultPos = (idx % 4) * 3
    const startPos   = inferNextCyclePos(prevEmployees[emp.id] ?? [], defaultPos)
    grid[emp.id] = {}
    for (let d = 1; d <= total; d++) {
      grid[emp.id][padDate(year, month, d)] = CYCLE_6X6[(startPos + d - 1) % 12]
    }
  })
  return grid
}

export interface WeekHours {
  D: number; N: number; DLD: number; DLN: number; DN: number; DD: number; DNOC: number; total: number
}

export const ZERO_WH: WeekHours = { D: 0, N: 0, DLD: 0, DLN: 0, DN: 0, DD: 0, DNOC: 0, total: 0 }

export function calcWeekHours(
  empId: string,
  weekDays: number[],
  grid: Record<string, Record<string, Turno>>,
  holidays: Set<string>,
  year: number,
  month: number,
  tipo: ScheduleTipo,
): WeekHours {
  let D = 0, N = 0, DLD = 0, DLN = 0, DN = 0, DD = 0, DNOC = 0

  for (const d of weekDays) {
    const fecha     = padDate(year, month, d)
    const dow       = new Date(year, month - 1, d).getDay()
    const isSpecial = dow === 0 || holidays.has(fecha)
    const turno     = grid[empId]?.[fecha] ?? defaultTurno(tipo, year, month, d)

    switch (turno) {
      case 'D':   isSpecial ? (DD   += 12) : (D   += 12); break
      case 'N':   isSpecial ? (DNOC += 12) : (N   += 12); break
      case 'DLD': DLD += 12; break
      case 'DLN': DLN += 12; break
      case 'DN':  DN  +=  6; break
    }
  }

  return { D, N, DLD, DLN, DN, DD, DNOC, total: D + N + DLD + DLN + DN + DD + DNOC }
}

export function sumWH(a: WeekHours, b: WeekHours): WeekHours {
  return {
    D: a.D + b.D, N: a.N + b.N, DLD: a.DLD + b.DLD, DLN: a.DLN + b.DLN,
    DN: a.DN + b.DN, DD: a.DD + b.DD, DNOC: a.DNOC + b.DNOC, total: a.total + b.total,
  }
}

export function dayBg(fecha: string, dow: number, holidays: Set<string>): string | undefined {
  if (holidays.has(fecha)) return 'rgba(239,68,68,0.12)'
  if (dow === 0) return 'rgba(99,102,241,0.08)'
  return undefined
}
