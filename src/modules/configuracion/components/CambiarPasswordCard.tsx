'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuth } from '@/lib/auth/useAuth'
import { useUsuarios } from '@/modules/auth/hooks/useUsuarios'
import { Input } from '@/shared/components/ui/input'
import { Button } from '@/shared/components/ui/button'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { KeyRound } from 'lucide-react'

const resetPasswordSchema = z.object({
  usuario_id: z.string().uuid('Seleccioná una cuenta'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
})
type TResetPasswordForm = z.infer<typeof resetPasswordSchema>

function useResetearPassword() {
  return useMutation({
    mutationFn: async (data: TResetPasswordForm) => {
      const res = await fetch('/api/admin/resetear-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!json.ok) throw new Error(json.error)
      return json as { ok: true; nombre: string }
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function CambiarPasswordCard() {
  const { isAdmin } = useAuth()
  const { data: usuarios = [], isLoading } = useUsuarios()
  const resetear = useResetearPassword()

  const form = useForm<TResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { usuario_id: '', password: '' },
  })

  const [lastReset, setLastReset] = useState<string | null>(null)

  if (!isAdmin) return null

  const onSubmit = form.handleSubmit((data) => {
    resetear.mutate(data, {
      onSuccess: (r) => {
        toast.success(`Contraseña actualizada para ${r.nombre}`)
        setLastReset(r.nombre)
        form.reset({ usuario_id: '', password: '' })
      },
    })
  })

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold">Restablecer contraseña</h3>
        <p className="text-muted-foreground mt-0.5 text-xs">
          Elegí una cuenta (tuya o de una empleada) y asignale una contraseña nueva
        </p>
      </div>

      {isLoading ? (
        <Skeleton className="h-24 w-full rounded-none" />
      ) : (
        <form
          onSubmit={onSubmit}
          className="border-border bg-surface max-w-md space-y-3 border p-4"
        >
          <div>
            <label className="text-muted-foreground mb-1 block text-[11px] font-semibold tracking-wide uppercase">
              Cuenta *
            </label>
            <select
              {...form.register('usuario_id')}
              className="border-border bg-surface focus:ring-primary w-full border px-3 py-2 text-sm focus:ring-1 focus:outline-none"
            >
              <option value="">Seleccionar...</option>
              {usuarios.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nombre} ({u.email}) — {u.rol === 'admin' ? 'Admin' : 'Empleada'}
                </option>
              ))}
            </select>
            {form.formState.errors.usuario_id && (
              <p className="text-danger mt-1 text-[11px]">
                {form.formState.errors.usuario_id.message}
              </p>
            )}
          </div>

          <Input
            label="Contraseña nueva *"
            type="password"
            autoComplete="new-password"
            disabled={resetear.isPending}
            error={form.formState.errors.password?.message}
            {...form.register('password')}
          />

          <p className="text-muted-foreground text-[11px]">
            Comunicá la contraseña nueva a la persona correspondiente de forma directa.
          </p>

          <Button type="submit" size="sm" disabled={resetear.isPending}>
            <KeyRound className="mr-1.5 h-3.5 w-3.5" />
            {resetear.isPending ? 'Actualizando...' : 'Restablecer contraseña'}
          </Button>

          {lastReset && !resetear.isPending && (
            <p className="text-success text-[11px]">Última actualización: {lastReset}</p>
          )}
        </form>
      )}
    </div>
  )
}
