import { PageHeader } from '@/shared/components/layout/PageHeader'
import { ProfileCard } from '@/modules/auth/components/ProfileCard'
import { ValoresPuntoTipoConfig } from '@/modules/empleadas/components/ValoresPuntoTipoConfig'

export default function ConfiguracionPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Configuración" description="Tu perfil y ajustes del sistema" />
      <ProfileCard />
      <div className="rounded-lg border border-border bg-surface p-6">
        <ValoresPuntoTipoConfig />
      </div>
    </div>
  )
}
