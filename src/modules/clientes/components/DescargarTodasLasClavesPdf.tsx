'use client'

import { useState } from 'react'
import { pdf } from '@react-pdf/renderer'
import { FileDown } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/shared/components/ui/button'
import { useParametros } from '@/shared/hooks/useParametros'
import { FALLBACK_TIPOS_CLAVE } from '@/shared/lib/parametros'
import { useObtenerTodasLasClaves } from '../hooks/useClientes'
import { agruparClavesPorCliente, nombreArchivoTodasLasClaves } from '../services/clavesPdfService'
import { ClavesPdfDocument } from './ClavesPdfDocument'

export function DescargarTodasLasClavesPdf() {
  const obtenerClaves = useObtenerTodasLasClaves()
  const { data: tiposClave = [] } = useParametros({
    categorias: ['TIPO_CLAVE'],
    fallback: FALLBACK_TIPOS_CLAVE,
  })
  const [generando, setGenerando] = useState(false)

  const labelTipo = (code: string) => tiposClave.find((t) => t.value === code)?.label ?? code

  async function handleDescargar() {
    setGenerando(true)
    try {
      const claves = await obtenerClaves()
      if (!claves.length) {
        toast.error('Ningún cliente tiene claves cargadas')
        return
      }
      const blob = await pdf(
        <ClavesPdfDocument grupos={agruparClavesPorCliente(claves, labelTipo)} />
      ).toBlob()

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = nombreArchivoTodasLasClaves()
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo generar el PDF')
    } finally {
      setGenerando(false)
    }
  }

  return (
    <Button variant="outline" onClick={handleDescargar} disabled={generando}>
      <FileDown className="mr-1.5 h-4 w-4" />
      {generando ? 'Generando...' : 'Claves en PDF'}
    </Button>
  )
}
