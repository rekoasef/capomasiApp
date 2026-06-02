import { LoginForm } from '@/modules/auth/components/LoginForm'

export default function LoginPage() {
  return (
    <div
      className="flex min-h-screen"
      style={{ background: 'oklch(0.118 0.010 65)' }}
    >
      {/* Left panel */}
      <div className="hidden w-80 shrink-0 flex-col justify-between p-10 lg:flex">
        <div>
          <div className="flex items-center gap-2">
            <span
              className="h-2 w-2"
              style={{ background: 'oklch(0.685 0.148 83)' }}
            />
            <span className="text-xs font-bold tracking-[0.18em] uppercase text-white">
              Capomasi
            </span>
          </div>
          <p className="mt-1 pl-4 text-[10px] tracking-widest uppercase text-white/30">
            Estudio Contable
          </p>
        </div>
        <p className="text-[11px] leading-relaxed tracking-wide text-white/20">
          Sistema de Gestión Integral<br />
          Armstrong, Santa Fe
        </p>
      </div>

      {/* Right panel */}
      <div className="flex flex-1 items-center justify-center bg-background p-8">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <div className="mb-1 h-0.5 w-8" style={{ background: 'oklch(0.685 0.148 83)' }} />
            <h1 className="text-lg font-bold tracking-tight text-foreground">Ingreso al sistema</h1>
            <p className="mt-1 text-xs text-muted-foreground">Autenticá con tu cuenta asignada</p>
          </div>
          <div className="border border-border bg-surface p-6">
            <LoginForm />
          </div>
        </div>
      </div>
    </div>
  )
}
