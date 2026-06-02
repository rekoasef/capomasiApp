'use client'

import { useState } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useProveedores, useCrearProveedor, useComprasProveedores, useCrearCompra, useAnularCompra, useRegistrarPagoProveedor } from '../hooks/useProveedores'
import { proveedorSchema, compraProveedorSchema, pagoProveedorSchema, type TProveedorForm, type TCompraProveedorForm, type TPagoProveedorForm } from '../schemas/proveedorSchema'
import { Input } from '@/shared/components/ui/input'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { ConfirmDialog } from '@/shared/components/ConfirmDialog'
import { formatMoney } from '@/shared/utils/formatters'
import { toLocalDateInputValue } from '@/shared/utils/dates'
import { Plus } from 'lucide-react'
import { useAuth } from '@/lib/auth/useAuth'
import type { TCompraProveedor } from '../types'
import { useParametros } from '@/shared/hooks/useParametros'
import {
  FALLBACK_CUENTAS_BANCARIAS,
  FALLBACK_RUBROS_PROVEEDOR,
  FALLBACK_TIPOS_COMPROBANTE,
  FALLBACK_TIPOS_PAGO_PROVEEDOR,
} from '@/shared/lib/parametros'

const ESTADO_VARIANT: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  PENDIENTE:           'outline',
  PARCIALMENTE_PAGADA: 'secondary',
  PAGADA:              'default',
  ANULADA:             'destructive',
}
const ESTADO_LABEL: Record<string, string> = {
  PENDIENTE:           'Pendiente',
  PARCIALMENTE_PAGADA: 'Parcial',
  PAGADA:              'Pagada',
  ANULADA:             'Anulada',
}

export function ProveedoresOverview() {
  const { data: proveedores, isLoading: loadingProv } = useProveedores()
  const { data: compras, isLoading: loadingComp, error } = useComprasProveedores()
  const crearProv    = useCrearProveedor()
  const crearCompra  = useCrearCompra()
  const anular       = useAnularCompra()
  const registrarPago = useRegistrarPagoProveedor()
  const { isAdmin } = useAuth()
  const { data: rubrosProveedor = FALLBACK_RUBROS_PROVEEDOR } = useParametros({
    categorias: ['RUBRO_PROVEEDOR'],
    fallback: FALLBACK_RUBROS_PROVEEDOR,
  })
  const { data: tiposComprobante = FALLBACK_TIPOS_COMPROBANTE } = useParametros({
    categorias: ['TIPO_COMPROBANTE_PROVEEDOR', 'COMPROBANTE_PROVEEDOR', 'TIPO_COMPROBANTE'],
    fallback: FALLBACK_TIPOS_COMPROBANTE,
  })
  const { data: tiposPago = FALLBACK_TIPOS_PAGO_PROVEEDOR } = useParametros({
    categorias: ['TIPO_PAGO'],
    fallback: FALLBACK_TIPOS_PAGO_PROVEEDOR,
  })
  const { data: cuentasBancarias = FALLBACK_CUENTAS_BANCARIAS } = useParametros({
    categorias: ['CUENTA_BANCARIA'],
    fallback: FALLBACK_CUENTAS_BANCARIAS,
  })

  const [tab, setTab]           = useState<'compras' | 'proveedores'>('compras')
  const [showProvForm, setShowProvForm]   = useState(false)
  const [showCompraForm, setShowCompraForm] = useState(false)
  const [pagarCompra, setPagarCompra]     = useState<TCompraProveedor | null>(null)
  const [anularId, setAnularId]           = useState<string | null>(null)

  const provForm = useForm<TProveedorForm>({
    resolver: zodResolver(proveedorSchema) as unknown as Resolver<TProveedorForm>,
    defaultValues: { nombre: '', activo: true },
  })

  const compraForm = useForm<TCompraProveedorForm>({
    resolver: zodResolver(compraProveedorSchema) as unknown as Resolver<TCompraProveedorForm>,
    defaultValues: { fecha: toLocalDateInputValue() },
  })

  const pagoForm = useForm<TPagoProveedorForm>({
    resolver: zodResolver(pagoProveedorSchema) as unknown as Resolver<TPagoProveedorForm>,
    defaultValues: { tipo_pago: 'TRANSFERENCIA', fecha_pago: toLocalDateInputValue() },
  })

  const handleProvSubmit = provForm.handleSubmit((d) => {
    crearProv.mutate(d, { onSuccess: (r) => { if (r.ok) { provForm.reset(); setShowProvForm(false) } } })
  })

  const handleCompraSubmit = compraForm.handleSubmit((d) => {
    crearCompra.mutate(d, { onSuccess: (r) => { if (r.ok) { compraForm.reset(); setShowCompraForm(false) } } })
  })

  const handlePagoSubmit = pagoForm.handleSubmit((d) => {
    if (!pagarCompra) return
    registrarPago.mutate(
      { ...d, compra_id: pagarCompra.id },
      { onSuccess: (r) => { if (r.ok) { pagoForm.reset(); setPagarCompra(null) } } }
    )
  })

  return (
    <div className="space-y-5">
      {/* Tabs */}
      <div className="flex gap-0 border-b border-border">
        {(['compras', 'proveedores'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-xs font-semibold tracking-wide uppercase border-b-2 transition-colors -mb-px ${
              tab === t ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t === 'compras' ? 'Compras / Gastos' : 'Proveedores'}
          </button>
        ))}
      </div>

      {/* TAB: Compras */}
      {tab === 'compras' && (
        <div className="space-y-4">
          {isAdmin && (
            <div className="flex justify-end">
              <Button size="sm" variant="outline" onClick={() => setShowCompraForm(v => !v)}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />Nueva compra
              </Button>
            </div>
          )}

          {showCompraForm && (
            <form onSubmit={handleCompraSubmit} className="border border-border p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold tracking-wide uppercase text-muted-foreground mb-1">Proveedor *</label>
                  <select
                    {...compraForm.register('proveedor_id')}
                    className="w-full border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">Seleccionar...</option>
                    {proveedores?.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                </div>
                <Input label="Fecha *" type="date" {...compraForm.register('fecha')} />
              </div>
              <Input label="Concepto *" {...compraForm.register('concepto')} error={compraForm.formState.errors.concepto?.message} />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Importe Total *" type="number" step="0.01" min="0.01" {...compraForm.register('importe_total', { valueAsNumber: true })} error={compraForm.formState.errors.importe_total?.message} />
                <Input label="N° Comprobante" {...compraForm.register('nro_comprobante')} />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold tracking-wide uppercase text-muted-foreground">Tipo comprobante</label>
                <select
                  {...compraForm.register('tipo_comprobante')}
                  className="w-full border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">Seleccionar...</option>
                  {tiposComprobante.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={crearCompra.isPending}>{crearCompra.isPending ? 'Guardando...' : 'Guardar'}</Button>
                <Button type="button" size="sm" variant="outline" onClick={() => setShowCompraForm(false)}>Cancelar</Button>
              </div>
            </form>
          )}

          {loadingComp ? (
            <div className="space-y-px">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-none" />)}</div>
          ) : error ? (
            <p className="text-sm text-danger">{error.message}</p>
          ) : !compras?.length ? (
            <p className="py-8 text-center text-xs tracking-widest uppercase text-muted-foreground">Sin compras registradas</p>
          ) : (
            <div className="overflow-x-auto border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-border bg-muted/50">
                    <th className="px-4 py-2.5 text-left text-[10px] font-bold tracking-[0.14em] uppercase text-muted-foreground">Fecha</th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-bold tracking-[0.14em] uppercase text-muted-foreground">Proveedor</th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-bold tracking-[0.14em] uppercase text-muted-foreground">Concepto</th>
                    <th className="px-4 py-2.5 text-right text-[10px] font-bold tracking-[0.14em] uppercase text-muted-foreground">Importe</th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-bold tracking-[0.14em] uppercase text-muted-foreground">Estado</th>
                    {isAdmin && <th className="px-4 py-2.5" />}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-surface">
                  {compras.map((c, i) => (
                    <tr key={c.id} className={`hover:bg-muted/30 transition-colors ${i % 2 === 1 ? 'bg-muted/20' : ''}`}>
                      <td className="px-4 py-2.5 text-muted-foreground">{c.fecha}</td>
                      <td className="px-4 py-2.5 font-medium">{c.proveedores?.nombre ?? '—'}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{c.concepto}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{formatMoney(c.importe_total)}</td>
                      <td className="px-4 py-2.5">
                        <Badge variant={ESTADO_VARIANT[c.estado]}>{ESTADO_LABEL[c.estado]}</Badge>
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-2.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {c.estado !== 'PAGADA' && c.estado !== 'ANULADA' && (
                              <Button size="sm" variant="outline" onClick={() => setPagarCompra(c)}>Pagar</Button>
                            )}
                            {c.estado === 'PENDIENTE' && (
                              <Button size="sm" variant="outline" onClick={() => setAnularId(c.id)}>Anular</Button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB: Proveedores */}
      {tab === 'proveedores' && (
        <div className="space-y-4">
          {isAdmin && (
            <div className="flex justify-end">
              <Button size="sm" variant="outline" onClick={() => setShowProvForm(v => !v)}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />Nuevo proveedor
              </Button>
            </div>
          )}

          {showProvForm && (
            <form onSubmit={handleProvSubmit} className="border border-border p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Input label="Nombre *" {...provForm.register('nombre')} error={provForm.formState.errors.nombre?.message} />
                <Input label="CUIT" {...provForm.register('cuit')} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-[11px] font-semibold tracking-wide uppercase text-muted-foreground">Rubro</label>
                  <select
                    {...provForm.register('rubro')}
                    className="w-full border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">Seleccionar...</option>
                    {rubrosProveedor.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
                <Input label="Teléfono" {...provForm.register('telefono')} />
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={crearProv.isPending}>{crearProv.isPending ? 'Guardando...' : 'Guardar'}</Button>
                <Button type="button" size="sm" variant="outline" onClick={() => setShowProvForm(false)}>Cancelar</Button>
              </div>
            </form>
          )}

          {loadingProv ? (
            <div className="space-y-px">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-none" />)}</div>
          ) : !proveedores?.length ? (
            <p className="py-8 text-center text-xs tracking-widest uppercase text-muted-foreground">Sin proveedores registrados</p>
          ) : (
            <div className="divide-y divide-border border border-border">
              {proveedores.map((p) => (
                <div key={p.id} className="flex items-center gap-3 px-4 py-2.5 bg-surface hover:bg-muted/30 transition-colors">
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium">{p.nombre}</span>
                    {p.rubro && <span className="ml-2 text-xs text-muted-foreground">{p.rubro}</span>}
                    {p.cuit && <span className="ml-2 text-xs text-muted-foreground">{p.cuit}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal pagar compra */}
      {pagarCompra && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-foreground/30 backdrop-blur-[1px]" onClick={() => setPagarCompra(null)} />
          <div className="relative z-10 w-full max-w-sm border border-border bg-surface p-6 shadow-xl">
            <div className="mb-1 h-0.5 w-6 bg-primary" />
            <h2 className="mb-1 text-sm font-bold">Registrar pago</h2>
            <p className="mb-4 text-xs text-muted-foreground">{pagarCompra.proveedores?.nombre} — {formatMoney(pagarCompra.importe_total)}</p>
            <form onSubmit={handlePagoSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold tracking-wide uppercase text-muted-foreground mb-1">Tipo *</label>
                  <select
                    {...pagoForm.register('tipo_pago')}
                    className="w-full border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    {tiposPago.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
                <Input label="Fecha *" type="date" {...pagoForm.register('fecha_pago')} />
              </div>
              <Input
                label="Importe *"
                type="number"
                step="0.01"
                min="0.01"
                defaultValue={pagarCompra.importe_total}
                {...pagoForm.register('importe', { valueAsNumber: true })}
              />
              {pagoForm.watch('tipo_pago') === 'TRANSFERENCIA' && (
                <div>
                  <label className="mb-1 block text-[11px] font-semibold tracking-wide uppercase text-muted-foreground">Cuenta bancaria</label>
                  <select
                    {...pagoForm.register('cuenta_bancaria')}
                    className="w-full border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">Seleccionar...</option>
                    {cuentasBancarias.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={registrarPago.isPending}>{registrarPago.isPending ? 'Guardando...' : 'Confirmar'}</Button>
                <Button type="button" size="sm" variant="outline" onClick={() => setPagarCompra(null)}>Cancelar</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!anularId}
        title="Anular compra"
        description="Esta acción no se puede deshacer."
        confirmLabel="Anular"
        onConfirm={() => { if (anularId) anular.mutate(anularId); setAnularId(null) }}
        onCancel={() => setAnularId(null)}
        isPending={anular.isPending}
      />
    </div>
  )
}
