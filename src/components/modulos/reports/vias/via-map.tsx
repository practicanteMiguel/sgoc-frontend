'use client'

import { useEffect, useRef } from 'react'
import type { ViaMapPoint } from '@/src/types/vias.types'
import { VIA_STATE_COLORS, VIA_STATE_LABELS } from '@/src/types/vias.types'
import { useAuthStore } from '@/src/stores/auth.store'

function applyTileFilter(map: any, dark: boolean) {
  const pane = map.getPanes().tilePane as HTMLElement | undefined
  if (!pane) return
  pane.style.filter = dark ? 'brightness(0.55) saturate(0.85) contrast(1.1)' : ''
}

interface ViaMapProps {
  points:              ViaMapPoint[]
  centerLat?:          number | null
  centerLng?:          number | null
  zoom?:               number
  height?:             string
  highlightedItemIds?: Set<string>
}

function applyHighlight(markers: Map<string, any>, ids: Set<string> | undefined) {
  const selecting = ids && ids.size > 0
  for (const [key, marker] of markers) {
    const isHL = !selecting || ids!.has(key)
    marker.setStyle({
      fillOpacity: isHL ? 0.9 : 0.2,
      color:       isHL ? '#fff' : 'transparent',
      weight:      isHL ? 2 : 0,
    })
    marker.setRadius(selecting ? (isHL ? 12 : 7) : 10)
  }
}

function buildMarkers(
  L: any, map: any, pts: ViaMapPoint[],
  markers: Map<string, any>,
) {
  for (const [, marker] of markers) marker.remove()
  markers.clear()

  for (let i = 0; i < pts.length; i++) {
    const pt    = pts[i]
    const color = pt.state ? (VIA_STATE_COLORS[pt.state] ?? '#888') : '#888'
    const m     = L.circleMarker([pt.lat, pt.lng], {
      radius: 10, color: '#fff', weight: 2, fillColor: color, fillOpacity: 0.9,
    })

    const imgHtml   = pt.images?.length
      ? `<img src="${pt.images[0]}" width="180" style="border-radius:6px;margin-top:6px;display:block;" />`
      : ''
    const stateHtml = pt.state
      ? `<span style="color:${color};font-weight:600;">${VIA_STATE_LABELS[pt.state]}</span><br/>`
      : ''
    const dateHtml  = pt.captured_at
      ? `<span style="color:#888;font-size:11px;">${new Date(pt.captured_at).toLocaleDateString('es-CO')}</span>`
      : ''

    m.bindPopup(`
      <div style="font-family:sans-serif;font-size:12px;min-width:160px;">
        <strong style="font-size:13px;">${pt.via_name}</strong><br/>
        ${stateHtml}${dateHtml}${imgHtml}
      </div>
    `)

    m.addTo(map)
    const key = pt.item_id ?? `pt_${i}`
    markers.set(key, m)
  }
}

export function ViaMap({
  points, centerLat, centerLng, zoom = 13, height = '400px', highlightedItemIds,
}: ViaMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef       = useRef<any>(null)
  const leafletRef   = useRef<any>(null)
  const markersRef   = useRef<Map<string, any>>(new Map())
  const highlightRef = useRef(highlightedItemIds)
  const pointsRef    = useRef(points)

  const { theme } = useAuthStore()

  highlightRef.current = highlightedItemIds
  pointsRef.current    = points

  // Apply brightness filter to tile pane only — preserves road/terrain colors
  useEffect(() => {
    if (!mapRef.current) return
    applyTileFilter(mapRef.current, theme === 'dark')
  }, [theme])

  // Update highlight when selection changes
  useEffect(() => {
    if (!mapRef.current || markersRef.current.size === 0) return
    applyHighlight(markersRef.current, highlightedItemIds)
  }, [highlightedItemIds])

  // Rebuild markers when points change (preserves map view/zoom)
  useEffect(() => {
    if (!mapRef.current || !leafletRef.current) return
    buildMarkers(leafletRef.current, mapRef.current, points, markersRef.current)
    applyHighlight(markersRef.current, highlightRef.current)
  }, [points])

  // Re-center on plant coordinates when there are no points (handles async data load after init)
  useEffect(() => {
    if (!mapRef.current) return
    if (pointsRef.current.length > 0) return
    if (centerLat == null || centerLng == null) return
    mapRef.current.setView([Number(centerLat), Number(centerLng)], zoom)
  }, [centerLat, centerLng, zoom])

  // Init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    let cancelled = false

    async function initMap() {
      const L = (await import('leaflet')).default
      await import('leaflet/dist/leaflet.css')
      if (cancelled || !containerRef.current) return

      const pts = pointsRef.current
      const defaultLat = pts[0]?.lat ?? (centerLat != null ? Number(centerLat) : 4.6)
      const defaultLng = pts[0]?.lng ?? (centerLng != null ? Number(centerLng) : -74.1)

      const map = L.map(containerRef.current!, { zoomControl: true }).setView(
        [defaultLat, defaultLng], zoom,
      )
      mapRef.current     = map
      leafletRef.current = L

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
      }).addTo(map)

      applyTileFilter(map, useAuthStore.getState().theme === 'dark')

      buildMarkers(L, map, pts, markersRef.current)
      applyHighlight(markersRef.current, highlightRef.current)

      if (pts.length > 1) {
        const latlngs = pts.map((p) => L.latLng(p.lat, p.lng))
        map.fitBounds(L.latLngBounds(latlngs), { padding: [30, 30] })
      }
    }

    initMap()

    return () => {
      cancelled = true
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null }
      leafletRef.current = null
      markersRef.current.clear()
    }
  }, [])

  return (
    <div
      ref={containerRef}
      style={{ height, width: '100%', borderRadius: '12px', overflow: 'hidden', zIndex: 0 }}
    />
  )
}
