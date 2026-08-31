import { PageHeader } from '@/shared/components/layout/PageHeader'
import { ProfileCard } from '@/modules/auth/components/ProfileCard'
import { ValoresPuntoTipoConfig } from '@/modules/empleadas/components/ValoresPuntoTipoConfig'
import { TiposServicioManager } from '@/modules/configuracion/components/TiposServicioManager'
import { TipoClaveManager } from '@/modules/configuracion/components/TipoClaveManager'
import { CambiarPasswordCard } from '@/modules/configuracion/components/CambiarPasswordCard'

export default function ConfiguracionPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Configuración" description="Tu perfil y ajustes del sistema" />
      <ProfileCard />
      <TiposServicioManager />
      <TipoClaveManager />
      <div className="border-border bg-surface border p-6">
        <ValoresPuntoTipoConfig />
      </div>
      <div className="border-border bg-surface border p-6">
        <CambiarPasswordCard />
      </div>
    </div>
  )
}
