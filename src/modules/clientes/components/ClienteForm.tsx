'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { clienteSchema, type TClienteForm } from '../schemas/clienteSchema'
import { useCrearCliente, useActualizarCliente } from '../hooks/useClientes'
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

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TClienteForm>({
    resolver: zodResolver(clienteSchema),
    defaultValues: cliente
      ? {
          nombre: cliente.nombre,
          cuit: cliente.cuit,
          domicilio: cliente.domicilio ?? '',
          telefono: cliente.telefono ?? '',
          email: cliente.email ?? '',
          localidad: cliente.localidad ?? '',
          notas: cliente.notas ?? '',
        }
      : { nombre: '', cuit: '' },
  })

  async function onSubmit(data: TClienteForm) {
    const mutation = isEditing ? actualizar : crear
    const result = await mutation.mutateAsync(data)
    if (result.ok) router.push('/clientes')
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 max-w-2xl">
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
