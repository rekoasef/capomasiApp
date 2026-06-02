'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { loginSchema, type TLoginForm } from '../schemas/loginSchema'
import { authService } from '../services/authService'
import { Button } from '@/shared/components/ui/button'

export function LoginForm() {
  const router = useRouter()
  const [isPending, setIsPending] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TLoginForm>({
    resolver: zodResolver(loginSchema),
  })

  async function onSubmit(data: TLoginForm) {
    setIsPending(true)
    const result = await authService.signIn(data)
    setIsPending(false)

    if (!result.ok) {
      toast.error(result.error)
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1">
        <label htmlFor="email" className="text-[11px] font-semibold tracking-wide uppercase text-muted-foreground">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          {...register('email')}
          className="w-full border border-border bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground/60 focus:border-primary focus:ring-1 focus:ring-primary/30 disabled:opacity-50"
          placeholder="paola@estudio.com"
          disabled={isPending}
        />
        {errors.email && <p className="text-[11px] text-danger">{errors.email.message}</p>}
      </div>

      <div className="space-y-1">
        <label htmlFor="password" className="text-[11px] font-semibold tracking-wide uppercase text-muted-foreground">
          Contraseña
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          {...register('password')}
          className="w-full border border-border bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground/60 focus:border-primary focus:ring-1 focus:ring-primary/30 disabled:opacity-50"
          placeholder="••••••••"
          disabled={isPending}
        />
        {errors.password && <p className="text-[11px] text-danger">{errors.password.message}</p>}
      </div>

      <Button type="submit" className="w-full mt-2" disabled={isPending}>
        {isPending ? 'Ingresando...' : 'Ingresar'}
      </Button>
    </form>
  )
}
