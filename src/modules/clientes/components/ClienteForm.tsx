'use client'

import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { clienteSchema, type TClienteForm } from '../schemas/clienteSchema'
import { useCrearCliente, useActualizarCliente } from '../hooks/useClientes'
import { useUsuarios } from '@/modules/auth/hooks/useUsuarios'
import { Input } from '@/shared/components/ui/input'
import { Textarea } from '@/shared/components/ui/textarea'
import { Button } from '@/shared/components/ui/button'
import type { TCliente } from '../types'

type Props = {
  cliente?: TCliente
}

export function ClienteForm({ cliente }: Props) {
  const router = useRouter()
  const isEditing = !!cliente

  const crear = useCrearCliente()
  const actualizar = useActualizarCliente(cliente?.id ?? '')
  const isPending = crear.isPending || actualizar.isPending
  const { data: usuarios = [] } = useUsuarios()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TClienteForm>({
    resolver: zodResolver(clienteSchema) as unknown as Resolver<TClienteForm>,
    defaultValues: cliente
      ? {
          nombre: cliente.nombre,
          cuit: cliente.cuit,
          domicilio: cliente.domicilio ?? '',
          telefono: cliente.telefono ?? '',
          email: cliente.email ?? '',
          localidad: cliente.localidad ?? '',
          notas: cliente.notas ?? '',
          responsable_id: cliente.responsable_id ?? '',
        }
      : { nombre: '', cuit: '' },
  })

  async function onSubmit(data: TClienteForm) {
    const mutation = isEditing ? actualizar : crear
    const result = await mutation.mutateAsync(data)
    if (result.ok) router.push('/clientes')
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl space-y-5">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Input
            id="nombre"
            label="Nombre / Razón Social *"
            placeholder="Ej: García Juan Carlos"
            error={errors.nombre?.message}
            disabled={isPending}
            {...register('nombre')}
          />
        </div>
        <Input
          id="cuit"
          label="CUIT *"
          placeholder="20123456789"
          error={errors.cuit?.message}
          disabled={isPending}
          maxLength={11}
          {...register('cuit')}
        />
        <Input
          id="localidad"
          label="Localidad"
          placeholder="Ej: Armstrong"
          error={errors.localidad?.message}
          disabled={isPending}
          {...register('localidad')}
        />
        <Input
          id="domicilio"
          label="Domicilio"
          placeholder="Ej: San Martín 456"
          error={errors.domicilio?.message}
          disabled={isPending}
          {...register('domicilio')}
        />
        <Input
          id="telefono"
          label="Teléfono"
          placeholder="Ej: 3471 123456"
          error={errors.telefono?.message}
          disabled={isPending}
          {...register('telefono')}
        />
        <div>
          <label
            htmlFor="responsable_id"
            className="text-foreground mb-1 block text-sm font-medium"
          >
            Responsable
          </label>
          <select
            id="responsable_id"
            disabled={isPending}
            className="border-border bg-surface focus:ring-primary w-full border px-3 py-2 text-sm focus:ring-1 focus:outline-none disabled:opacity-50"
            {...register('responsable_id')}
          >
            <option value="">Sin asignar</option>
            {usuarios.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <Input
            id="email"
            type="email"
            label="Email"
            placeholder="cliente@email.com"
            error={errors.email?.message}
            disabled={isPending}
            {...register('email')}
          />
        </div>
        <div className="sm:col-span-2">
          <Textarea
            id="notas"
            label="Notas"
            placeholder="Observaciones internas..."
            error={errors.notas?.message}
            disabled={isPending}
            {...register('notas')}
          />
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear cliente'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={isPending}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
