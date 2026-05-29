import { api } from '@/src/lib/axios'

const cargoKey = (userId: string) => `firma_cargo_${userId}_v1`

export function getCargo(userId: string): string {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem(cargoKey(userId)) ?? ''
}

export function saveCargo(userId: string, cargo: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(cargoKey(userId), cargo)
}

export function clearCargo(userId: string): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(cargoKey(userId))
}

export async function uploadFirma(blob: Blob): Promise<string> {
  const form = new FormData()
  form.append('firma', blob, 'firma.png')
  const res = await api.post<{ firma_url: string }>('/users/me/firma', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data.firma_url
}

export async function fetchFirmaUrl(): Promise<string | null> {
  try {
    const res = await api.get<{ firma_url: string | null }>('/users/me/firma')
    return res.data.firma_url ?? null
  } catch {
    return null
  }
}
