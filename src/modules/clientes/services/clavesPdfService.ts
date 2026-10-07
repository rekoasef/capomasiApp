import type { TClave, TClaveConCliente } from '../types'

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

export type TGrupoClavesPdf = {
  clienteId: string
  clienteNombre: string
  clienteCuit: string | null
  claves: TClavePdf[]
}

// Agrupa las claves de todo el estudio por cliente, con los clientes en orden
// alfabético y las claves de cada uno ordenadas como en el PDF individual.
export function agruparClavesPorCliente(
  claves: TClaveConCliente[],
  labelTipo: (code: string) => string
): TGrupoClavesPdf[] {
  const porCliente = new Map<string, TClaveConCliente[]>()
  for (const c of claves) {
    const lista = porCliente.get(c.cliente_id)
    if (lista) lista.push(c)
    else porCliente.set(c.cliente_id, [c])
  }

  return Array.from(porCliente.entries())
    .map(([clienteId, lista]) => ({
      clienteId,
      clienteNombre: lista[0].clientes.nombre,
      clienteCuit: lista[0].clientes.cuit,
      claves: prepararClavesParaPdf(lista, labelTipo),
    }))
    .sort((a, b) => a.clienteNombre.localeCompare(b.clienteNombre, 'es'))
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

export function nombreArchivoTodasLasClaves(hoy: Date = new Date()): string {
  const fecha = [
    hoy.getFullYear(),
    String(hoy.getMonth() + 1).padStart(2, '0'),
    String(hoy.getDate()).padStart(2, '0'),
  ].join('-')
  return `claves_fiscales_${fecha}.pdf`
}
