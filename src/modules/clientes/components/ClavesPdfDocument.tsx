import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'
import { formatCuit, formatDate } from '@/shared/utils/formatters'
import type { TClavePdf } from '../services/clavesPdfService'

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
    marginTop: 4,
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
  empty: { color: '#94A3B8', fontStyle: 'italic' },
  footer: {
    marginTop: 24,
    paddingTop: 8,
    borderTop: '1px solid #F1F5F9',
    fontSize: 7,
    color: '#94A3B8',
  },
})

type Props = {
  clienteNombre: string
  clienteCuit?: string | null
  claves: TClavePdf[]
}

export function ClavesPdfDocument({ clienteNombre, clienteCuit, claves }: Props) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.brandBar} />

        <View style={styles.header}>
          {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf's Image, not an HTML img */}
          <Image style={styles.logo} src="/sello-capomasi.png" />
          <View style={styles.headerText}>
            <Text style={styles.studioName}>Estudio Contable Paola Capomasi</Text>
            <Text style={styles.title}>{clienteNombre}</Text>
            <Text style={styles.subtitle}>
              Claves fiscales{clienteCuit ? ` — CUIT ${formatCuit(clienteCuit)}` : ''}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Claves</Text>
        {!claves.length ? (
          <Text style={styles.empty}>Sin claves cargadas</Text>
        ) : (
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
        )}

        <Text style={styles.footer}>
          Generado el {formatDate(new Date())} — Documento confidencial
        </Text>
      </Page>
    </Document>
  )
}
