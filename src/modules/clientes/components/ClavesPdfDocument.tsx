import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'
import { formatCuit, formatDate } from '@/shared/utils/formatters'
import type { TClavePdf, TGrupoClavesPdf } from '../services/clavesPdfService'

// Colores de marca del estudio (equivalentes en hex de los tokens oklch de globals.css
// --primary / --sidebar — react-pdf no soporta oklch, solo hex/rgb).
const BRAND_PRIMARY = '#c68f00'
const BRAND_DARK = '#1a1a1a'

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 9, fontFamily: 'Helvetica' },
  brandBar: {
    height: 4,
    backgroundColor: BRAND_PRIMARY,
    marginHorizontal: -32,
    marginTop: -32,
    marginBottom: 20,
  },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  logo: { width: 42, height: 42, marginRight: 12 },
  headerText: { flex: 1 },
  studioName: {
    fontSize: 8,
    color: BRAND_PRIMARY,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    fontWeight: 'bold',
    marginBottom: 3,
  },
  title: { fontSize: 16, fontWeight: 'bold', marginBottom: 2 },
  subtitle: { fontSize: 10, color: '#64748B' },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    marginTop: 14,
    marginBottom: 6,
    borderBottom: `1px solid ${BRAND_PRIMARY}`,
    paddingBottom: 3,
  },
  tableRow: { flexDirection: 'row', borderBottom: '1px solid #F1F5F9', paddingVertical: 5 },
  tableHeaderRow: {
    flexDirection: 'row',
    borderBottom: `1px solid ${BRAND_DARK}`,
    paddingVertical: 4,
    fontWeight: 'bold',
  },
  colTipo: { width: '22%', paddingRight: 6 },
  colUsuario: { width: '28%', paddingRight: 6 },
  colClave: { width: '22%', paddingRight: 6, fontFamily: 'Courier' },
  colNotas: { width: '28%', color: '#64748B' },
  sectionCuit: { fontSize: 9, fontWeight: 'normal', color: '#64748B' },
  empty: { color: '#94A3B8', fontStyle: 'italic' },
  footer: {
    marginTop: 24,
    paddingTop: 8,
    borderTop: '1px solid #F1F5F9',
    fontSize: 7,
    color: '#94A3B8',
  },
})

function TablaClaves({ claves }: { claves: TClavePdf[] }) {
  if (!claves.length) return <Text style={styles.empty}>Sin claves cargadas</Text>

  return (
    <View>
      <View style={styles.tableHeaderRow}>
        <Text style={styles.colTipo}>Tipo</Text>
        <Text style={styles.colUsuario}>Usuario</Text>
        <Text style={styles.colClave}>Clave</Text>
        <Text style={styles.colNotas}>Notas</Text>
      </View>
      {claves.map((c) => (
        <View style={styles.tableRow} key={c.id} wrap={false}>
          <Text style={styles.colTipo}>{c.tipo}</Text>
          <Text style={styles.colUsuario}>{c.usuario || '—'}</Text>
          <Text style={styles.colClave}>{c.clave}</Text>
          <Text style={styles.colNotas}>{c.notas || ''}</Text>
        </View>
      ))}
    </View>
  )
}

// Con un solo cliente el encabezado lleva su nombre y CUIT; con varios (el PDF
// de todo el estudio) cada cliente es una sección con su nombre como título.
type Props = { grupos: TGrupoClavesPdf[]; individual?: boolean }

export function ClavesPdfDocument({ grupos, individual = false }: Props) {
  const unico = individual ? grupos[0] : undefined
  const totalClaves = grupos.reduce((sum, g) => sum + g.claves.length, 0)

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.brandBar} fixed />

        <View style={styles.header}>
          {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf's Image, not an HTML img */}
          <Image style={styles.logo} src="/sello-capomasi.png" />
          <View style={styles.headerText}>
            <Text style={styles.studioName}>Estudio Contable Paola Capomasi</Text>
            {unico ? (
              <>
                <Text style={styles.title}>{unico.clienteNombre}</Text>
                <Text style={styles.subtitle}>
                  Claves fiscales
                  {unico.clienteCuit ? ` — CUIT ${formatCuit(unico.clienteCuit)}` : ''}
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.title}>Claves fiscales de clientes</Text>
                <Text style={styles.subtitle}>
                  {grupos.length} {grupos.length === 1 ? 'cliente' : 'clientes'} — {totalClaves}{' '}
                  {totalClaves === 1 ? 'clave' : 'claves'}
                </Text>
              </>
            )}
          </View>
        </View>

        {unico ? (
          <>
            <Text style={styles.sectionTitle}>Claves</Text>
            <TablaClaves claves={unico.claves} />
          </>
        ) : !grupos.length ? (
          <Text style={styles.empty}>Ningún cliente tiene claves cargadas</Text>
        ) : (
          grupos.map((g) => (
            <View key={g.clienteId}>
              <Text style={styles.sectionTitle} minPresenceAhead={40}>
                {g.clienteNombre}
                {g.clienteCuit ? (
                  <Text style={styles.sectionCuit}>{`   CUIT ${formatCuit(g.clienteCuit)}`}</Text>
                ) : null}
              </Text>
              <TablaClaves claves={g.claves} />
            </View>
          ))
        )}

        <Text style={styles.footer}>
          Generado el {formatDate(new Date())} — Documento confidencial
        </Text>
      </Page>
    </Document>
  )
}
