import { useQuery } from '@tanstack/react-query'
import { api } from '@/src/lib/axios'
import type { InformeFacturas } from '@/src/types/consumables.types'

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
