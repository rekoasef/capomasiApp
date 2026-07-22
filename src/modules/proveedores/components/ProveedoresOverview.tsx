'use client'

import { Fragment, useState } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  useProveedores,
  useCrearProveedor,
  useComprasProveedores,
  useCrearCompra,
  useAnularCompra,
  useRegistrarPagoProveedor,
  useCuentaCorrienteProveedores,
  usePagosProveedor,
} from '../hooks/useProveedores'
import {
  proveedorSchema,
  compraProveedorSchema,
  pagoProveedorSchema,
  type TProveedorForm,
  type TCompraProveedorForm,
  type TPagoProveedorForm,
} from '../schemas/proveedorSchema'
import { Input } from '@/shared/components/ui/input'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { ConfirmDialog } from '@/shared/components/ConfirmDialog'
import { PaginationControls } from '@/shared/components/PaginationControls'
import { formatMoney, formatDate } from '@/shared/utils/formatters'
import { toLocalDateInputValue } from '@/shared/utils/dates'
import { Plus, ChevronDown, ChevronRight } from 'lucide-react'
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
  PENDIENTE: 'outline',
  PARCIALMENTE_PAGADA: 'secondary',
  PAGADA: 'default',
  ANULADA: 'destructive',
}
const ESTADO_LABEL: Record<string, string> = {
  PENDIENTE: 'Pendiente',
  PARCIALMENTE_PAGADA: 'Parcial',
  PAGADA: 'Pagada',
  ANULADA: 'Anulada',
}

const COMPRAS_PAGE_SIZE = 25

export function ProveedoresOverview() {
  const { data: proveedores, isLoading: loadingProv } = useProveedores()
  const [comprasPage, setComprasPage] = useState(0)
  const {
    data: comprasData,
    isLoading: loadingComp,
    error,
  } = useComprasProveedores({ page: comprasPage, pageSize: COMPRAS_PAGE_SIZE })
  const compras = comprasData?.rows
  const {
    data: cuentaCorriente,
    isLoading: loadingCC,
    error: errorCC,
  } = useCuentaCorrienteProveedores()
  const crearProv = useCrearProveedor()
  const crearCompra = useCrearCompra()
  const anular = useAnularCompra()
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

  const [tab, setTab] = useState<'compras' | 'proveedores' | 'cc'>('compras')
  const [showProvForm, setShowProvForm] = useState(false)
  const [showCompraForm, setShowCompraForm] = useState(false)
  const [pagarCompra, setPagarCompra] = useState<TCompraProveedor | null>(null)
  const [anularId, setAnularId] = useState<string | null>(null)
  const [expandedCompra, setExpandedCompra] = useState<string | null>(null)

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
    crearProv.mutate(d, {
      onSuccess: (r) => {
        if (r.ok) {
          provForm.reset()
          setShowProvForm(false)
        }
      },
    })
  })

  const handleCompraSubmit = compraForm.handleSubmit((d) => {
    crearCompra.mutate(d, {
      onSuccess: (r) => {
        if (r.ok) {
          compraForm.reset()
          setShowCompraForm(false)
        }
      },
    })
  })

  const handlePagoSubmit = pagoForm.handleSubmit((d) => {
    if (!pagarCompra) return
    registrarPago.mutate(
      { ...d, compra_id: pagarCompra.id },
      {
        onSuccess: (r) => {
          if (r.ok) {
            pagoForm.reset()
            setPagarCompra(null)
          }
        },
      }
    )
  })

  return (
    <div className="space-y-5">
      {/* Tabs */}
      <div className="border-border flex gap-0 border-b">
        {(['compras', 'proveedores', 'cc'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`-mb-px border-b-2 px-4 py-2 text-xs font-semibold tracking-wide uppercase transition-colors ${
              tab === t
                ? 'border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground border-transparent'
            }`}
          >
            {t === 'compras'
              ? 'Compras / Gastos'
              : t === 'proveedores'
                ? 'Proveedores'
                : 'Cuenta Corriente'}
          </button>
        ))}
      </div>

      {/* TAB: Compras */}
      {tab === 'compras' && (
        <div className="space-y-4">
          {isAdmin && (
            <div className="flex justify-end">
              <Button size="sm" variant="outline" onClick={() => setShowCompraForm((v) => !v)}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Nueva compra
              </Button>
            </div>
          )}

          {showCompraForm && (
            <form onSubmit={handleCompraSubmit} className="border-border space-y-3 border p-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-muted-foreground mb-1 block text-[11px] font-semibold tracking-wide uppercase">
                    Proveedor
                  </label>
                  <select
                    {...compraForm.register('proveedor_id')}
                    className="border-border bg-surface focus:ring-primary w-full border px-3 py-2 text-sm focus:ring-1 focus:outline-none"
                  >
                    <option value="">Sin proveedor (gasto suelto)</option>
                    {proveedores?.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <Input label="Fecha *" type="date" {...compraForm.register('fecha')} />
              </div>
              <Input
                label="Concepto *"
                {...compraForm.register('concepto')}
                error={compraForm.formState.errors.concepto?.message}
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Importe Total *"
                  type="number"
                  step="0.01"
                  min="0.01"
                  {...compraForm.register('importe_total', { valueAsNumber: true })}
                  error={compraForm.formState.errors.importe_total?.message}
                />
                <Input label="N° Comprobante" {...compraForm.register('nro_comprobante')} />
              </div>
              <div>
                <label className="text-muted-foreground mb-1 block text-[11px] font-semibold tracking-wide uppercase">
                  Tipo comprobante
                </label>
                <select
                  {...compraForm.register('tipo_comprobante')}
                  className="border-border bg-surface focus:ring-primary w-full border px-3 py-2 text-sm focus:ring-1 focus:outline-none"
                >
                  <option value="">Seleccionar...</option>
                  {tiposComprobante.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={crearCompra.isPending}>
                  {crearCompra.isPending ? 'Guardando...' : 'Guardar'}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setShowCompraForm(false)}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          )}

          {loadingComp ? (
            <div className="space-y-px">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded-none" />
              ))}
            </div>
          ) : error ? (
            <p className="text-danger text-sm">{error.message}</p>
          ) : !compras?.length ? (
            <p className="text-muted-foreground py-8 text-center text-xs tracking-widest uppercase">
              Sin compras registradas
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
                      Proveedor
                    </th>
                    <th className="text-muted-foreground px-4 py-2.5 text-left text-[10px] font-bold tracking-[0.14em] uppercase">
                      Concepto
                    </th>
                    <th className="text-muted-foreground px-4 py-2.5 text-right text-[10px] font-bold tracking-[0.14em] uppercase">
                      Importe
                    </th>
                    <th className="text-muted-foreground px-4 py-2.5 text-left text-[10px] font-bold tracking-[0.14em] uppercase">
                      Estado
                    </th>
                    {isAdmin && <th className="px-4 py-2.5" />}
                  </tr>
                </thead>
                <tbody className="divide-border bg-surface divide-y">
                  {compras.map((c, i) => (
                    <Fragment key={c.id}>
                      <tr
                        className={`hover:bg-muted/30 transition-colors ${i % 2 === 1 ? 'bg-muted/20' : ''}`}
                      >
                        <td className="px-2 py-2.5">
                          <button
                            onClick={() => setExpandedCompra(expandedCompra === c.id ? null : c.id)}
                            className="text-muted-foreground hover:text-foreground"
                            aria-label="Ver pagos"
                          >
                            {expandedCompra === c.id ? (
                              <ChevronDown className="h-3.5 w-3.5" />
                            ) : (
                              <ChevronRight className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </td>
                        <td className="text-muted-foreground px-4 py-2.5">{c.fecha}</td>
                        <td className="text-muted-foreground px-4 py-2.5 font-medium">
                          {c.proveedores?.nombre ?? (
                            <span className="italic">Gasto sin proveedor</span>
                          )}
                        </td>
                        <td className="text-muted-foreground px-4 py-2.5">{c.concepto}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">
                          {formatMoney(c.importe_total)}
                        </td>
                        <td className="px-4 py-2.5">
                          <Badge variant={ESTADO_VARIANT[c.estado]}>{ESTADO_LABEL[c.estado]}</Badge>
                        </td>
                        {isAdmin && (
                          <td className="px-4 py-2.5 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {c.estado !== 'PAGADA' && c.estado !== 'ANULADA' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setPagarCompra(c)}
                                >
                                  Pagar
                                </Button>
                              )}
                              {c.estado === 'PENDIENTE' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setAnularId(c.id)}
                                >
                                  Anular
                                </Button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                      {expandedCompra === c.id && (
                        <tr className="bg-muted/10">
                          <td colSpan={isAdmin ? 7 : 6} className="px-4 py-3">
                            <PagosCompraDetalle compraId={c.id} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
              <PaginationControls
                page={comprasPage}
                pageSize={COMPRAS_PAGE_SIZE}
                total={comprasData?.total ?? 0}
                onPageChange={setComprasPage}
              />
            </div>
          )}
        </div>
      )}

      {/* TAB: Proveedores */}
      {tab === 'proveedores' && (
        <div className="space-y-4">
          {isAdmin && (
            <div className="flex justify-end">
              <Button size="sm" variant="outline" onClick={() => setShowProvForm((v) => !v)}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Nuevo proveedor
              </Button>
            </div>
          )}

          {showProvForm && (
            <form onSubmit={handleProvSubmit} className="border-border space-y-3 border p-4">
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Nombre *"
                  {...provForm.register('nombre')}
                  error={provForm.formState.errors.nombre?.message}
                />
                <Input label="CUIT" {...provForm.register('cuit')} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-muted-foreground mb-1 block text-[11px] font-semibold tracking-wide uppercase">
                    Rubro
                  </label>
                  <select
                    {...provForm.register('rubro')}
                    className="border-border bg-surface focus:ring-primary w-full border px-3 py-2 text-sm focus:ring-1 focus:outline-none"
                  >
                    <option value="">Seleccionar...</option>
                    {rubrosProveedor.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <Input label="Teléfono" {...provForm.register('telefono')} />
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={crearProv.isPending}>
                  {crearProv.isPending ? 'Guardando...' : 'Guardar'}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setShowProvForm(false)}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          )}

          {loadingProv ? (
            <div className="space-y-px">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded-none" />
              ))}
            </div>
          ) : !proveedores?.length ? (
            <p className="text-muted-foreground py-8 text-center text-xs tracking-widest uppercase">
              Sin proveedores registrados
            </p>
          ) : (
            <div className="divide-border border-border divide-y border">
              {proveedores.map((p) => (
                <div
                  key={p.id}
                  className="bg-surface hover:bg-muted/30 flex items-center gap-3 px-4 py-2.5 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <span className="text-sm font-medium">{p.nombre}</span>
                    {p.rubro && (
                      <span className="text-muted-foreground ml-2 text-xs">{p.rubro}</span>
                    )}
                    {p.cuit && <span className="text-muted-foreground ml-2 text-xs">{p.cuit}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB: Cuenta Corriente */}
      {tab === 'cc' && (
        <div className="space-y-4">
          {loadingCC ? (
            <div className="space-y-px">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded-none" />
              ))}
            </div>
          ) : errorCC ? (
            <p className="text-danger text-sm">{errorCC.message}</p>
          ) : !cuentaCorriente?.length ? (
            <p className="text-muted-foreground py-8 text-center text-xs tracking-widest uppercase">
              Sin datos de cuenta corriente
            </p>
          ) : (
            <div className="border-border overflow-x-auto border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-border bg-muted/50 border-b-2">
                    <th className="text-muted-foreground px-4 py-2.5 text-left text-[10px] font-bold tracking-[0.14em] uppercase">
                      Proveedor
                    </th>
                    <th className="text-muted-foreground px-4 py-2.5 text-right text-[10px] font-bold tracking-[0.14em] uppercase">
                      Total comprado
                    </th>
                    <th className="text-muted-foreground px-4 py-2.5 text-right text-[10px] font-bold tracking-[0.14em] uppercase">
                      Total pagado
                    </th>
                    <th className="text-muted-foreground px-4 py-2.5 text-right text-[10px] font-bold tracking-[0.14em] uppercase">
                      Saldo pendiente
                    </th>
                    <th className="text-muted-foreground px-4 py-2.5 text-right text-[10px] font-bold tracking-[0.14em] uppercase">
                      Compras pend.
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-border bg-surface divide-y">
                  {cuentaCorriente.map((cc, i) => (
                    <tr
                      key={cc.proveedor_id}
                      className={`hover:bg-muted/30 transition-colors ${i % 2 === 1 ? 'bg-muted/20' : ''}`}
                    >
                      <td className="px-4 py-2.5 font-medium">{cc.proveedor_nombre}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">
                        {formatMoney(cc.total_comprado)}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums">
                        {formatMoney(cc.total_pagado)}
                      </td>
                      <td
                        className={`px-4 py-2.5 text-right font-medium tabular-nums ${cc.saldo_pendiente > 0 ? 'text-danger' : ''}`}
                      >
                        {formatMoney(cc.saldo_pendiente)}
                      </td>
                      <td className="text-muted-foreground px-4 py-2.5 text-right tabular-nums">
                        {cc.compras_pendientes}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal pagar compra */}
      {pagarCompra && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="bg-foreground/30 absolute inset-0 backdrop-blur-[1px]"
            onClick={() => setPagarCompra(null)}
          />
          <div className="border-border bg-surface relative z-10 w-full max-w-sm border p-6 shadow-xl">
            <div className="bg-primary mb-1 h-0.5 w-6" />
            <h2 className="mb-1 text-sm font-bold">Registrar pago</h2>
            <p className="text-muted-foreground mb-4 text-xs">
              {pagarCompra.proveedores?.nombre} — {formatMoney(pagarCompra.importe_total)}
            </p>
            <form onSubmit={handlePagoSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-muted-foreground mb-1 block text-[11px] font-semibold tracking-wide uppercase">
                    Tipo *
                  </label>
                  <select
                    {...pagoForm.register('tipo_pago')}
                    className="border-border bg-surface focus:ring-primary w-full border px-3 py-2 text-sm focus:ring-1 focus:outline-none"
                  >
                    {tiposPago.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
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
                  <label className="text-muted-foreground mb-1 block text-[11px] font-semibold tracking-wide uppercase">
                    Cuenta bancaria
                  </label>
                  <select
                    {...pagoForm.register('cuenta_bancaria')}
                    className="border-border bg-surface focus:ring-primary w-full border px-3 py-2 text-sm focus:ring-1 focus:outline-none"
                  >
                    <option value="">Seleccionar...</option>
                    {cuentasBancarias.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {pagoForm.watch('tipo_pago') === 'CHEQUE' && (
                <div className="border-border space-y-3 border-t pt-3">
                  <p className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
                    Datos del cheque emitido
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="N° Cheque *"
                      {...pagoForm.register('cheque_numero')}
                      error={pagoForm.formState.errors.cheque_numero?.message}
                    />
                    <Input
                      label="Banco *"
                      {...pagoForm.register('cheque_banco')}
                      error={pagoForm.formState.errors.cheque_banco?.message}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="Fecha emisión *"
                      type="date"
                      {...pagoForm.register('cheque_fecha_emision')}
                      error={pagoForm.formState.errors.cheque_fecha_emision?.message}
                    />
                    <div>
                      <label className="text-muted-foreground mb-1 block text-[11px] font-semibold tracking-wide uppercase">
                        Cuenta bancaria
                      </label>
                      <select
                        {...pagoForm.register('cuenta_bancaria')}
                        className="border-border bg-surface focus:ring-primary w-full border px-3 py-2 text-sm focus:ring-1 focus:outline-none"
                      >
                        <option value="">Seleccionar...</option>
                        {cuentasBancarias.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={registrarPago.isPending}>
                  {registrarPago.isPending ? 'Guardando...' : 'Confirmar'}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setPagarCompra(null)}
                >
                  Cancelar
                </Button>
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
        onConfirm={() => {
          if (anularId) anular.mutate(anularId)
          setAnularId(null)
        }}
        onCancel={() => setAnularId(null)}
        isPending={anular.isPending}
      />
    </div>
  )
}

const TIPO_PAGO_LABEL: Record<string, string> = {
  TRANSFERENCIA: 'Transferencia',
  EFECTIVO: 'Efectivo',
  CHEQUE: 'Cheque',
}

function PagosCompraDetalle({ compraId }: { compraId: string }) {
  const { data: pagos, isLoading, error } = usePagosProveedor(compraId)

  if (isLoading) return <Skeleton className="h-8 w-full rounded-none" />
  if (error) return <p className="text-danger text-xs">{error.message}</p>
  if (!pagos?.length)
    return <p className="text-muted-foreground text-xs">Sin pagos registrados para esta compra</p>

  return (
    <div className="space-y-1">
      <p className="text-muted-foreground text-[10px] font-bold tracking-widest uppercase">
        Historial de pagos
      </p>
      <div className="divide-border border-border bg-surface divide-y border">
        {pagos.map((p) => (
          <div key={p.id} className="flex items-center justify-between px-3 py-2 text-xs">
            <div className="flex items-center gap-3">
              <span className="text-muted-foreground">{formatDate(p.fecha_pago)}</span>
              <span className="font-medium">{TIPO_PAGO_LABEL[p.tipo_pago]}</span>
              {p.cuenta_bancaria && (
                <span className="text-muted-foreground">{p.cuenta_bancaria}</span>
              )}
            </div>
            <span className="font-medium tabular-nums">{formatMoney(p.importe)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
