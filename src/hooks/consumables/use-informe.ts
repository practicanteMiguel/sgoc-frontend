import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/src/lib/axios'
import type { InformeFacturas } from '@/src/types/consumables.types'

interface FacturaUpdateEntry {
  rq_id: string
  items: { id: string; numero_factura: string | null; precio_real: number | null; proveedor_factura: string | null }[]
}

export function useUpdateFacturas() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (entries: FacturaUpdateEntry[]) =>
      Promise.all(entries.map((e) => api.patch(`/requisiciones/${e.rq_id}/facturas`, { items: e.items }))),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['informe'] })
      qc.invalidateQueries({ queryKey: ['requisiciones'] })
      toast.success('Facturas actualizadas')
    },
    onError:   () => toast.error('Error al guardar facturas'),
  })
}

export function useInformeFacturas(mes: number, anio: number) {
  return useQuery({
    queryKey: ['informe', mes, anio],
    queryFn: () =>
      api.get<InformeFacturas>(`/requisiciones/informe?mes=${mes}&anio=${anio}`).then((r) => r.data),
  })
}

export function useInformeTendencia(periodos: { mes: number; anio: number }[]) {
  return useQuery({
    queryKey: ['informe', 'tendencia', periodos.map((p) => `${p.mes}-${p.anio}`).join(',')],
    queryFn: () =>
      Promise.all(
        periodos.map((p) =>
          api
            .get<InformeFacturas>(`/requisiciones/informe?mes=${p.mes}&anio=${p.anio}`)
            .then((r) => r.data)
            .catch(
              () =>
                ({
                  mes: p.mes,
                  anio: p.anio,
                  total_estimado: 0,
                  total_real: 0,
                  rows: [],
                } as InformeFacturas),
            ),
        ),
      ),
  })
}
