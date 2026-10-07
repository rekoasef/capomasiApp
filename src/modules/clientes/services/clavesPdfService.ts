import type { TClave } from '../types'

export type TClavePdf = {
  id: string
  tipo: string
  usuario: string | null
  clave: string
  notas: string | null
}

// Arma las filas del PDF con la etiqueta legible del tipo (viene de parametros)
// y ordenadas por esa etiqueta, que es como Paola las busca en la hoja impresa.
export function prepararClavesParaPdf(
  claves: TClave[],
  labelTipo: (code: string) => string
): TClavePdf[] {
  return claves
    .map((c) => ({
      id: c.id,
      tipo: labelTipo(c.tipo),
      usuario: c.usuario,
      clave: c.clave,
      notas: c.notas,
    }))
    .sort((a, b) => a.tipo.localeCompare(b.tipo, 'es'))
}

// Nombre de archivo seguro a partir del nombre del cliente (sin caracteres
// especiales que puedan romper la descarga en distintos sistemas operativos).
export function nombreArchivoClaves(clienteNombre: string): string {
  const limpio = clienteNombre
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
  return `${limpio || 'cliente'}_claves_fiscales.pdf`
}
