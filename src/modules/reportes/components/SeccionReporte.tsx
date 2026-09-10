'use client'

import { useId, useState } from 'react'

type Vista = 'grafico' | 'tabla'

type Props = {
  titulo: string
  /** Aclaración corta bajo el título. */
  nota?: string
  grafico: React.ReactNode
  tabla: React.ReactNode
  vistaInicial?: Vista
}

/**
 * Encabezado de sección con el conmutador gráfico/tabla.
 *
 * La tabla no es un extra: es el equivalente accesible del gráfico. Todo lo que
 * el gráfico codifica en color o en largo de barra tiene que poder leerse como
 * número, sin depender del hover ni de distinguir colores.
 */
export function SeccionReporte({ titulo, nota, grafico, tabla, vistaInicial = 'grafico' }: Props) {
  const [vista, setVista] = useState<Vista>(vistaInicial)
  const panelId = useId()

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="bg-primary mb-1 h-0.5 w-6" />
          <h2 className="text-muted-foreground text-xs font-bold tracking-widest uppercase">
            {titulo}
          </h2>
          {nota ? <p className="text-muted-foreground mt-1 text-[11px]">{nota}</p> : null}
        </div>

        <div role="tablist" aria-label={`Vista de ${titulo}`} className="border-border flex border">
          {(['grafico', 'tabla'] as const).map((v) => (
            <button
              key={v}
              role="tab"
              type="button"
              aria-selected={vista === v}
              aria-controls={panelId}
              onClick={() => setVista(v)}
              className={`px-3 py-1.5 text-[11px] font-semibold tracking-widest uppercase transition-colors duration-150 ${
                vista === v
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:bg-muted/50'
              }`}
            >
              {v === 'grafico' ? 'Gráfico' : 'Tabla'}
            </button>
          ))}
        </div>
      </div>

      <div id={panelId} role="tabpanel">
        {vista === 'grafico' ? grafico : tabla}
      </div>
    </section>
  )
}
