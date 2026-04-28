'use client'

import { useEffect, useRef } from 'react'
import type { ViaMapPoint } from '@/src/types/vias.types'
import { VIA_STATE_COLORS, VIA_STATE_LABELS } from '@/src/types/vias.types'

interface ViaMapProps {
  points:     ViaMapPoint[]
  centerLat?: number | null
  centerLng?: number | null
  zoom?:      number
  height?:    string
}

export function ViaMap({ points, centerLat, centerLng, zoom = 13, height = '400px' }: ViaMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef       = useRef<any>(null)

  const defaultLat = centerLat ?? (points[0]?.lat ?? 4.6)
  const defaultLng = centerLng ?? (points[0]?.lng ?? -74.1)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    async function initMap() {
      const L = (await import('leaflet')).default
      await import('leaflet/dist/leaflet.css')

      const map = L.map(containerRef.current!, { zoomControl: true }).setView(
        [defaultLat, defaultLng],
        zoom,
      )
      mapRef.current = map

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
      }).addTo(map)

      for (const pt of points) {
        const color = VIA_STATE_COLORS[pt.state] ?? '#888'
        const marker = L.circleMarker([pt.lat, pt.lng], {
          radius:      10,
          color:       '#fff',
          weight:      2,
          fillColor:   color,
          fillOpacity: 0.9,
        })

        const imgHtml = pt.images?.length
          ? `<img src="${pt.images[0]}" width="180" style="border-radius:6px;margin-top:6px;display:block;" />`
          : ''

        marker.bindPopup(`
          <div style="font-family:sans-serif;font-size:12px;min-width:160px;">
            <strong style="font-size:13px;">${pt.via_name}</strong><br/>
            <span style="color:${color};font-weight:600;">${VIA_STATE_LABELS[pt.state]}</span><br/>
            <span style="color:#888;font-size:11px;">${new Date(pt.captured_at).toLocaleDateString('es-CO')}</span>
            ${imgHtml}
          </div>
        `)

        marker.addTo(map)
      }

      if (points.length > 1 && !centerLat && !centerLng) {
        const latlngs = points.map((p) => L.latLng(p.lat, p.lng))
        map.fitBounds(L.latLngBounds(latlngs), { padding: [30, 30] })
      }
    }

    initMap()

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [])

  return (
    <div
      ref={containerRef}
      style={{ height, width: '100%', borderRadius: '12px', overflow: 'hidden', zIndex: 0 }}
    />
  )
}
