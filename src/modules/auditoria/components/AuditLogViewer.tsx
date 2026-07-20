'use client'

import { Fragment, useState } from 'react'
import { useAuth } from '@/lib/auth/useAuth'
import { useAuditLog } from '../hooks/useAuditoria'
import type { TAuditLog } from '../types'
import { Badge } from '@/shared/components/ui/badge'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { ChevronDown, ChevronRight } from 'lucide-react'

const TABLAS_AUDITADAS = [
  'clientes',
  'honorarios_mensuales',
  'liquidaciones',
  'pagos',
  'recibos',
  'imputaciones',
  'trabajos_realizados',
  'categorias_gastos',
  'gastos_recurrentes',
  'pagos_gastos',
  'empleadas',
  'liquidaciones_empleadas',
  'pagos_empleadas',
  'proveedores',
  'vencimientos',
]

const ACCION_VARIANT: Record<string, 'default' | 'secondary' | 'destructive'> = {
  INSERT: 'default',
  UPDATE: 'secondary',
  DELETE: 'destructive',
}

function formatFechaHora(iso: string): string {
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

// Campos técnicos que no le aportan nada a quien lee el historial
const CAMPOS_OCULTOS = new Set([
  'id',
  'created_at',
  'created_by',
  'updated_at',
  'updated_by',
  'deleted_at',
])

const ETIQUETAS: Record<string, string> = {
  cliente_id: 'Cliente',
  empleada_id: 'Empleada',
  proveedor_id: 'Proveedor',
  compra_id: 'Compra',
  liquidacion_id: 'Liquidación',
  liquidacion_empleada_id: 'Liquidación',
  descripcion: 'Descripción',
  concepto: 'Concepto',
  importe: 'Importe',
  importe_total: 'Importe',
  importe_liquidado: 'Importe liquidado',
  importe_facturado: 'Importe facturado',
  importe_comision: 'Importe comisión',
  estado: 'Estado',
  estado_avance: 'Estado',
  fecha: 'Fecha',
  fecha_pago: 'Fecha de pago',
  fecha_vencimiento: 'Fecha de vencimiento',
  fecha_liquidacion: 'Fecha de liquidación',
  ambito: 'Ámbito',
  facturado: 'Facturado',
  completado: 'Completado',
  activo: 'Activo',
  notas: 'Notas',
  observaciones: 'Observaciones',
  observaciones_empleada: 'Observaciones',
  nombre: 'Nombre',
  cuit: 'CUIT',
  tipo_pago: 'Tipo de pago',
  tipo_vencimiento: 'Tipo',
  tipo_trabajo: 'Tipo de trabajo',
  tipo_concepto: 'Tipo',
  tipo_comprobante: 'Comprobante',
  cuenta_bancaria: 'Cuenta bancaria',
}

function etiquetaCampo(campo: string): string {
  if (ETIQUETAS[campo]) return ETIQUETAS[campo]
  const legible = campo.replace(/_/g, ' ')
  return legible.charAt(0).toUpperCase() + legible.slice(1)
}

function formatValorCampo(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—'
  if (typeof v === 'boolean') return v ? 'Sí' : 'No'
  return String(v)
}

type TCambioCampo = { campo: string; antes?: string; despues: string }

function calcularCambios(r: TAuditLog): TCambioCampo[] {
  const anterior = r.valor_anterior ?? {}
  const nuevo = r.valor_nuevo ?? {}

  if (r.accion === 'UPDATE') {
    const campos = new Set([...Object.keys(anterior), ...Object.keys(nuevo)])
    return [...campos]
      .filter(
        (c) => !CAMPOS_OCULTOS.has(c) && JSON.stringify(anterior[c]) !== JSON.stringify(nuevo[c])
      )
      .sort()
      .map((c) => ({
        campo: etiquetaCampo(c),
        antes: formatValorCampo(anterior[c]),
        despues: formatValorCampo(nuevo[c]),
      }))
  }

  const fuente = r.accion === 'DELETE' ? anterior : nuevo
  return Object.keys(fuente)
    .filter((c) => !CAMPOS_OCULTOS.has(c))
    .sort()
    .map((c) => ({ campo: etiquetaCampo(c), despues: formatValorCampo(fuente[c]) }))
}

function CambiosDetalle({ registro }: { registro: TAuditLog }) {
  const cambios = calcularCambios(registro)

  if (!cambios.length) {
    return <p className="text-muted-foreground text-xs">Sin cambios de datos para mostrar</p>
  }

  return (
    <div className="divide-border border-border bg-surface divide-y border">
      {cambios.map((c) => (
        <div key={c.campo} className="flex items-center gap-3 px-3 py-1.5 text-xs">
          <span className="text-muted-foreground w-40 shrink-0 font-medium">{c.campo}</span>
          {c.antes !== undefined ? (
            <span className="flex items-center gap-2">
              <span className="text-danger line-through">{c.antes}</span>
              <span className="text-muted-foreground">→</span>
              <span className="text-success font-medium">{c.despues}</span>
            </span>
          ) : (
            <span>{c.despues}</span>
          )}
        </div>
      ))}
    </div>
  )
}

export function AuditLogViewer() {
  const { isAdmin } = useAuth()
  const [tabla, setTabla] = useState('')
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const { data: registros, isLoading, error } = useAuditLog({ tabla: tabla || undefined })

  if (!isAdmin) return null

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold">Registro de auditoría</h3>
          <p className="text-muted-foreground mt-0.5 text-xs">
            Últimos 100 cambios registrados en el sistema
          </p>
        </div>
        <select
          value={tabla}
          onChange={(e) => setTabla(e.target.value)}
          className="border-border bg-surface text-foreground focus:ring-primary border px-2.5 py-1.5 text-xs font-medium focus:ring-1 focus:outline-none"
        >
          <option value="">Todas las tablas</option>
          {TABLAS_AUDITADAS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="space-y-px">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-none" />
          ))}
        </div>
      ) : error ? (
        <p className="text-danger text-sm">{error.message}</p>
      ) : !registros?.length ? (
        <p className="text-muted-foreground py-8 text-center text-xs tracking-widest uppercase">
          Sin registros
        </p>
      ) : (
        <div className="border-border overflow-x-auto border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-border bg-muted/50 border-b-2">
                <th className="w-8 px-2 py-2.5" />
                <th className="text-muted-foreground px-4 py-2.5 text-left text-[10px] font-bold tracking-[0.14em] uppercase">
                  Fecha
                </th>
                <th className="text-muted-foreground px-4 py-2.5 text-left text-[10px] font-bold tracking-[0.14em] uppercase">
                  Usuario
                </th>
                <th className="text-muted-foreground px-4 py-2.5 text-left text-[10px] font-bold tracking-[0.14em] uppercase">
                  Tabla
                </th>
                <th className="text-muted-foreground px-4 py-2.5 text-left text-[10px] font-bold tracking-[0.14em] uppercase">
                  Acción
                </th>
              </tr>
            </thead>
            <tbody className="divide-border bg-surface divide-y">
              {registros.map((r) => {
                const expanded = expandedId === r.id
                return (
                  <Fragment key={r.id}>
                    <tr
                      onClick={() => setExpandedId(expanded ? null : r.id)}
                      className="hover:bg-muted/30 cursor-pointer transition-colors"
                    >
                      <td className="text-muted-foreground px-2 py-2.5">
                        {expanded ? (
                          <ChevronDown className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5" />
                        )}
                      </td>
                      <td className="text-muted-foreground px-4 py-2.5 tabular-nums">
                        {formatFechaHora(r.created_at)}
                      </td>
                      <td className="px-4 py-2.5">{r.usuarios?.nombre ?? '—'}</td>
                      <td className="px-4 py-2.5 font-mono text-xs">{r.tabla_afectada}</td>
                      <td className="px-4 py-2.5">
                        <Badge variant={ACCION_VARIANT[r.accion]}>{r.accion}</Badge>
                      </td>
                    </tr>
                    {expanded && (
                      <tr className="bg-muted/10">
                        <td colSpan={5} className="px-4 py-3">
                          <CambiosDetalle registro={r} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
