'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Loader2, Crosshair, MapPin } from 'lucide-react';
import { useUpdateField } from '@/src/hooks/reports/use-fields';
import { ModalPortal } from '@/src/components/ui/modal-portal';
import { useAuthStore } from '@/src/stores/auth.store';
import type { Field } from '@/src/types/reports.types';
import type * as LeafletLib from 'leaflet';
import type { Map as LeafletMap, Marker as LeafletMarker, LeafletMouseEvent, DragEndEvent } from 'leaflet';

function applyTileFilter(map: LeafletMap, dark: boolean) {
  const pane = map.getPanes().tilePane as HTMLElement | undefined;
  if (!pane) return;
  pane.style.filter = dark ? 'brightness(0.55) saturate(0.85) contrast(1.1)' : '';
}

function buildIcon(L: typeof LeafletLib) {
  return L.divIcon({
    className: '',
    html: `<div style="width:18px;height:18px;background:#0D3B58;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.5);"></div>`,
    iconSize:   [18, 18],
    iconAnchor: [9, 9],
  });
}

interface FieldCoordsModalProps {
  field:   Field;
  onClose: () => void;
}

export function FieldCoordsModal({ field, onClose }: FieldCoordsModalProps) {
  const update = useUpdateField();
  const initialLat = field.center_lat != null ? Number(field.center_lat) : null;
  const initialLng = field.center_lng != null ? Number(field.center_lng) : null;

  const [lat, setLat] = useState<number | null>(initialLat);
  const [lng, setLng] = useState<number | null>(initialLng);

  const isDirty = lat !== initialLat || lng !== initialLng;

  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<LeafletMap | null>(null);
  const leafletRef   = useRef<typeof LeafletLib | null>(null);
  const markerRef    = useRef<LeafletMarker | null>(null);
  const { theme }    = useAuthStore();
  const [mapReady, setMapReady] = useState(false);

  const onChangeRef = useRef((newLat: number, newLng: number) => {
    setLat(newLat);
    setLng(newLng);
  });

  useEffect(() => {
    if (!mapRef.current) return;
    applyTileFilter(mapRef.current, theme === 'dark');
  }, [theme]);

  useEffect(() => {
    if (!mapReady || !mapRef.current || !leafletRef.current) return;
    if (lat == null || lng == null) return;
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    } else {
      const icon = buildIcon(leafletRef.current);
      markerRef.current = leafletRef.current.marker([lat, lng], { icon, draggable: true }).addTo(mapRef.current);
      markerRef.current.on('dragend', (e: DragEndEvent) => {
        const pos = e.target.getLatLng();
        onChangeRef.current(pos.lat, pos.lng);
      });
    }
    mapRef.current.setView([lat, lng], Math.max(mapRef.current.getZoom(), 13));
  }, [mapReady, lat, lng]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let cancelled = false;

    async function init() {
      const L = (await import('leaflet')).default;
      await import('leaflet/dist/leaflet.css');
      if (cancelled || !containerRef.current) return;

      leafletRef.current = L;
      const map = L.map(containerRef.current!, { zoomControl: true }).setView([2.93, -75.28], 7);
      mapRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
      }).addTo(map);

      applyTileFilter(map, useAuthStore.getState().theme === 'dark');

      map.on('click', (e: LeafletMouseEvent) => {
        const { lat: cLat, lng: cLng } = e.latlng;
        const icon = buildIcon(L);
        if (markerRef.current) {
          markerRef.current.setLatLng([cLat, cLng]);
        } else {
          markerRef.current = L.marker([cLat, cLng], { icon, draggable: true }).addTo(map);
          markerRef.current.on('dragend', (ev: DragEndEvent) => {
            const pos = ev.target.getLatLng();
            onChangeRef.current(pos.lat, pos.lng);
          });
        }
        onChangeRef.current(cLat, cLng);
      });

      if (!cancelled) setMapReady(true);
    }

    init();

    return () => {
      cancelled = true;
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
      leafletRef.current = null;
      markerRef.current  = null;
    };
  }, []);

  function handleGeolocate() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      setLat(pos.coords.latitude);
      setLng(pos.coords.longitude);
    });
  }

  function handleSave() {
    update.mutate({ id: field.id, center_lat: lat, center_lng: lng }, { onSuccess: onClose });
  }

  const hasCoords = lat != null && lng != null;

  return (
    <ModalPortal onClose={onClose}>
      <div
        className="w-full max-w-lg rounded-xl overflow-hidden flex flex-col"
        style={{
          background: 'var(--color-surface-0)',
          border:     '1px solid var(--color-border)',
          boxShadow:  '0 20px 60px rgba(4,24,24,0.25)',
          maxHeight:  '90vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <div>
            <h3 className="font-display font-semibold text-base" style={{ color: 'var(--color-secundary)' }}>
              Fijar ubicacion de planta
            </h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-400)' }}>
              {field.name} &middot; {field.location}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:opacity-70 transition-all"
            style={{ color: 'var(--color-text-400)' }}
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-4 overflow-y-auto">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs" style={{ color: 'var(--color-text-400)' }}>
              Haz clic en el mapa o usa &quot;Mi ubicacion&quot; para fijar las coordenadas de tu planta.
            </p>
            <button
              type="button"
              onClick={handleGeolocate}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium hover:opacity-80 transition-opacity shrink-0"
              style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text-600)' }}
            >
              <Crosshair size={11} />
              Mi ubicacion
            </button>
          </div>

          <div
            ref={containerRef}
            style={{ height: '280px', width: '100%', borderRadius: '10px', overflow: 'hidden', zIndex: 0, cursor: 'crosshair' }}
          />

          {hasCoords ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <MapPin size={11} style={{ color: 'var(--color-primary)' }} />
                <span className="text-xs font-mono" style={{ color: 'var(--color-text-600)' }}>
                  {lat!.toFixed(6)}, {lng!.toFixed(6)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => { setLat(null); setLng(null); }}
                className="text-xs hover:opacity-70 transition-opacity"
                style={{ color: 'var(--color-danger)' }}
              >
                Limpiar
              </button>
            </div>
          ) : (
            <p className="text-xs" style={{ color: 'var(--color-text-400)' }}>Sin coordenadas fijadas</p>
          )}
        </div>

        <div
          className="flex gap-3 px-6 py-4 shrink-0"
          style={{ borderTop: '1px solid var(--color-border)' }}
        >
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg text-sm font-medium hover:opacity-70 transition-opacity"
            style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text-600)' }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!isDirty || update.isPending}
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-opacity"
            style={{
              background: isDirty ? 'var(--color-primary)' : 'var(--color-surface-2)',
              color:      isDirty ? '#fff' : 'var(--color-text-400)',
              border:     isDirty ? 'none' : '1px solid var(--color-border)',
              opacity:    update.isPending ? 0.75 : 1,
              cursor:     !isDirty ? 'default' : 'pointer',
            }}
          >
            {update.isPending && <Loader2 size={14} className="animate-spin" />}
            {update.isPending ? 'Guardando...' : 'Guardar ubicacion'}
          </button>
        </div>
      </div>
    </ModalPortal>
  );
}
