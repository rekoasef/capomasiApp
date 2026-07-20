'use client'

import { useMemo, useState } from 'react'
import { useAuth } from '@/lib/auth/useAuth'
import { useEmpleadas, useTrabajosRealizados } from '../hooks/useEmpleadas'
import { CargarTrabajoForm } from './CargarTrabajoForm'
import { TrabajosDelMesTable } from './TrabajosDelMesTable'
import { Button } from '@/shared/components/ui/button'
import { Select } from '@/shared/components/ui/select'
import { Plus } from 'lucide-react'

const MESES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
]

export function TrabajosRealizadosOverview() {
  const hoy = new Date()
  const { user, isAdmin } = useAuth()
  const { data: empleadas = [] } = useEmpleadas()
  const [periodoAnio, setPeriodoAnio] = useState(hoy.getFullYear())
  const [periodoMes, setPeriodoMes] = useState(hoy.getMonth() + 1)
  const [showForm, setShowForm] = useState(false)
  const [empleadaId, setEmpleadaId] = useState('')

  const empleadaPropia = useMemo(
    () => empleadas.find((empleada) => empleada.usuario_id === user?.id),
    [empleadas, user?.id]
  )

  const filtroEmpleada = isAdmin ? empleadaId || undefined : empleadaPropia?.id
  const { data: trabajos = [], isLoading } = useTrabajosRealizados(
    periodoAnio,
    periodoMes,
    filtroEmpleada
  )

  const empleadasOptions = empleadas.map((empleada) => ({
    value: empleada.id,
    label: empleada.nombre,
  }))
  const anios = Array.from({ length: 4 }, (_, index) => hoy.getFullYear() - index)

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <Select
            id="periodo_mes"
            label="Mes"
            options={MESES.map((mes, index) => ({ value: String(index + 1), label: mes }))}
            value={String(periodoMes)}
            onChange={(e) => setPeriodoMes(Number(e.target.value))}
          />
          <Select
            id="periodo_anio"
            label="Año"
            options={anios.map((anio) => ({ value: String(anio), label: String(anio) }))}
            value={String(periodoAnio)}
            onChange={(e) => setPeriodoAnio(Number(e.target.value))}
          />
          {isAdmin && (
            <Select
              id="empleada_filtro"
              label="Empleada"
              options={empleadasOptions}
              placeholder="Todas"
              value={empleadaId}
              onChange={(e) => setEmpleadaId(e.target.value)}
            />
          )}
        </div>

        <Button type="button" size="sm" onClick={() => setShowForm((prev) => !prev)}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Cargar trabajo
        </Button>
      </div>

      {showForm && (
        <div className="border-border bg-surface rounded-md border p-4">
          <CargarTrabajoForm
            onSuccess={() => setShowForm(false)}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      <TrabajosDelMesTable items={trabajos} isLoading={isLoading} isAdmin={isAdmin} />
    </div>
  )
}
