'use client';

import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Loader2, Crosshair, MapPin } from 'lucide-react';
import { useCreateField, useUpdateField } from '@/src/hooks/reports/use-fields';
import { ModalPortal } from '@/src/components/ui/modal-portal';
import { useAuthStore } from '@/src/stores/auth.store';
import type { Field } from '@/src/types/reports.types';

const schema = z.object({
  name:       z.string().min(2, 'Mínimo 2 caracteres'),
  location:   z.string().min(4, 'Mínimo 4 caracteres'),
  center_lat: z.number().nullable(),
  center_lng: z.number().nullable(),
});
type FormData = z.infer<typeof schema>;

const FIELD_STYLE = {
  background:   'var(--color-surface-1)',
  border:       '1.5px solid var(--color-border)',
  color:        'var(--color-text-900)',
  borderRadius: '8px',
  padding:      '10px 14px',
  fontSize:     '13px',
  width:        '100%',
  outline:      'none',
  transition:   'all .15s',
};

const LABEL_CLASS = 'text-xs font-medium uppercase tracking-wider';

function applyTileFilter(map: any, dark: boolean) {
  const pane = map.getPanes().tilePane as HTMLElement | undefined;
  if (!pane) return;
  pane.style.filter = dark ? 'brightness(0.55) saturate(0.85) contrast(1.1)' : '';
}

interface MapPickerProps {
  lat:      number | null | undefined;
  lng:      number | null | undefined;
  onChange: (lat: number, lng: number) => void;
}

function MapPicker({ lat, lng, onChange }: MapPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<any>(null);
  const leafletRef   = useRef<any>(null);
  const markerRef    = useRef<any>(null);
  const onChangeRef  = useRef(onChange);
  onChangeRef.current = onChange;

  const [mapReady, setMapReady] = useState(false);
  const { theme } = useAuthStore();

  useEffect(() => {
    if (!mapRef.current) return;
    applyTileFilter(mapRef.current, theme === 'dark');
  }, [theme]);

  // Runs when map becomes ready OR when coords change — places/moves marker and centers view
  useEffect(() => {
    if (!mapReady || !mapRef.current || !leafletRef.current) return;
    if (lat == null || lng == null) return;
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    } else {
      const icon = buildIcon(leafletRef.current);
      markerRef.current = leafletRef.current.marker([lat, lng], { icon, draggable: true }).addTo(mapRef.current);
      markerRef.current.on('dragend', (e: any) => {
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

      map.on('click', (e: any) => {
        const { lat: cLat, lng: cLng } = e.latlng;
        const icon = buildIcon(L);
        if (markerRef.current) {
          markerRef.current.setLatLng([cLat, cLng]);
        } else {
          markerRef.current = L.marker([cLat, cLng], { icon, draggable: true }).addTo(map);
          markerRef.current.on('dragend', (ev: any) => {
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

  return (
    <div
      ref={containerRef}
      style={{ height: '220px', width: '100%', borderRadius: '10px', overflow: 'hidden', zIndex: 0, cursor: 'crosshair' }}
    />
  );
}

function buildIcon(L: any) {
  return L.divIcon({
    className: '',
    html: `<div style="width:18px;height:18px;background:#0D3B58;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.5);"></div>`,
    iconSize:   [18, 18],
    iconAnchor: [9, 9],
  });
}

interface FieldFormProps {
  field?:  Field | null;
  onClose: () => void;
}

export function FieldForm({ field, onClose }: FieldFormProps) {
  const isEdit = !!field;
  const create = useCreateField();
  const update = useUpdateField();

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver:      zodResolver(schema),
    defaultValues: { center_lat: null, center_lng: null },
  });

  const centerLat = watch('center_lat');
  const centerLng = watch('center_lng');

  useEffect(() => {
    if (field) {
      reset({
        name:       field.name,
        location:   field.location,
        center_lat: field.center_lat != null ? Number(field.center_lat) : null,
        center_lng: field.center_lng != null ? Number(field.center_lng) : null,
      });
    }
  }, [field, reset]);

  const onSubmit = (data: FormData) => {
    if (isEdit) {
      update.mutate({ id: field!.id, ...data }, { onSuccess: onClose });
    } else {
      create.mutate(data, { onSuccess: onClose });
    }
  };

  function handleGeolocate() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      setValue('center_lat', pos.coords.latitude);
      setValue('center_lng', pos.coords.longitude);
    });
  }

  const isPending  = create.isPending || update.isPending;
  const hasCoords  = centerLat != null && centerLng != null;

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
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <div>
            <h3 className="font-display font-semibold text-base" style={{ color: 'var(--color-secundary)' }}>
              {isEdit ? 'Editar planta' : 'Nueva planta'}
            </h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-400)' }}>
              {isEdit ? 'Modificá los datos de la planta' : 'Completá los datos de la nueva planta'}
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

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col overflow-y-auto">
          <div className="px-6 py-5 flex flex-col gap-4">

            {/* Nombre */}
            <div className="flex flex-col gap-1.5">
              <label className={LABEL_CLASS} style={{ color: 'var(--color-text-400)' }}>
                Nombre de la planta
              </label>
              <input
                {...register('name')}
                placeholder="Ej: DINA"
                style={{ ...FIELD_STYLE, borderColor: errors.name ? 'var(--color-danger)' : 'var(--color-border)' }}
                onFocus={(e) => { e.target.style.borderColor = 'var(--color-secondary)'; e.target.style.boxShadow = '0 0 0 3px var(--color-secondary-muted)'; }}
                onBlur={(e)  => { e.target.style.borderColor = errors.name ? 'var(--color-danger)' : 'var(--color-border)'; e.target.style.boxShadow = 'none'; }}
              />
              {errors.name && <span className="text-xs" style={{ color: 'var(--color-danger)' }}>{errors.name.message}</span>}
            </div>

            {/* Ubicación */}
            <div className="flex flex-col gap-1.5">
              <label className={LABEL_CLASS} style={{ color: 'var(--color-text-400)' }}>
                Ubicación
              </label>
              <input
                {...register('location')}
                placeholder="Ej: Km 17 vía Neiva - Bogotá, Huila"
                style={{ ...FIELD_STYLE, borderColor: errors.location ? 'var(--color-danger)' : 'var(--color-border)' }}
                onFocus={(e) => { e.target.style.borderColor = 'var(--color-secondary)'; e.target.style.boxShadow = '0 0 0 3px var(--color-secondary-muted)'; }}
                onBlur={(e)  => { e.target.style.borderColor = errors.location ? 'var(--color-danger)' : 'var(--color-border)'; e.target.style.boxShadow = 'none'; }}
              />
              {errors.location && <span className="text-xs" style={{ color: 'var(--color-danger)' }}>{errors.location.message}</span>}
            </div>

            {/* Mapa picker */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className={LABEL_CLASS} style={{ color: 'var(--color-text-400)' }}>
                  Coordenadas en mapa
                </label>
                <button
                  type="button"
                  onClick={handleGeolocate}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium hover:opacity-80 transition-opacity"
                  style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text-600)' }}
                >
                  <Crosshair size={11} />
                  Mi ubicación
                </button>
              </div>

              <p className="text-xs" style={{ color: 'var(--color-text-400)' }}>
                Haz clic en el mapa para fijar la ubicación de la planta. Puedes arrastrar el pin para ajustarlo.
              </p>

              <MapPicker
                lat={centerLat}
                lng={centerLng}
                onChange={(lat, lng) => {
                  setValue('center_lat', lat);
                  setValue('center_lng', lng);
                }}
              />

              {hasCoords ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <MapPin size={11} style={{ color: 'var(--color-primary)' }} />
                    <span className="text-xs font-mono" style={{ color: 'var(--color-text-600)' }}>
                      {centerLat!.toFixed(6)}, {centerLng!.toFixed(6)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setValue('center_lat', null); setValue('center_lng', null); }}
                    className="text-xs hover:opacity-70 transition-opacity"
                    style={{ color: 'var(--color-danger)' }}
                  >
                    Limpiar
                  </button>
                </div>
              ) : (
                <p className="text-xs" style={{ color: 'var(--color-text-400)' }}>
                  Sin coordenadas fijadas
                </p>
              )}
            </div>

          </div>

          {/* Footer */}
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
              type="submit"
              disabled={isPending}
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-opacity"
              style={{ background: 'var(--color-primary)', color: '#fff', opacity: isPending ? 0.75 : 1 }}
            >
              {isPending && <Loader2 size={14} className="animate-spin" />}
              {isPending ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear planta'}
            </button>
          </div>
        </form>
      </div>
    </ModalPortal>
  );
}
