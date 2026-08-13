'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Eye, EyeOff } from 'lucide-react'
import { loginSchema, type TLoginForm } from '../schemas/loginSchema'
import { authService } from '../services/authService'
import { Button } from '@/shared/components/ui/button'

export function LoginForm() {
  const router = useRouter()
  const [isPending, setIsPending] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

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
        <label
          htmlFor="email"
          className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase"
        >
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          {...register('email')}
          className="border-border bg-background placeholder:text-muted-foreground/60 focus:border-primary focus:ring-primary/30 w-full border px-3 py-2 text-sm outline-none focus:ring-1 disabled:opacity-50"
          placeholder="paola@estudio.com"
          disabled={isPending}
        />
        {errors.email && <p className="text-danger text-[11px]">{errors.email.message}</p>}
      </div>

      <div className="space-y-1">
        <label
          htmlFor="password"
          className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase"
        >
          Contraseña
        </label>
        <div className="relative">
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            {...register('password')}
            className="border-border bg-background placeholder:text-muted-foreground/60 focus:border-primary focus:ring-primary/30 w-full border px-3 py-2 pr-10 text-sm outline-none focus:ring-1 disabled:opacity-50"
            placeholder="••••••••"
            disabled={isPending}
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPassword((v) => !v)}
            className="text-muted-foreground hover:text-foreground absolute inset-y-0 right-0 flex items-center px-3"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.password && <p className="text-danger text-[11px]">{errors.password.message}</p>}
      </div>

      <Button type="submit" className="mt-2 w-full" disabled={isPending}>
        {isPending ? 'Ingresando...' : 'Ingresar'}
      </Button>
    </form>
  )
}
