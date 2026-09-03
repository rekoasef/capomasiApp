import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'
import { formatMoney, formatDate } from '@/shared/utils/formatters'
import { descripcionComprobante, labelTipoServicio } from '@/shared/lib/etiquetas'
import type { TCuentaCorriente, TLiquidacionConImputaciones, TReciboDisponible } from '../types'

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
  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  summaryBox: {
    flex: 1,
    border: '1px solid #E2E8F0',
    borderTop: `2px solid ${BRAND_PRIMARY}`,
    padding: 8,
  },
  summaryLabel: { fontSize: 7, color: '#64748B', textTransform: 'uppercase', marginBottom: 2 },
  summaryValue: { fontSize: 12, fontWeight: 'bold', color: BRAND_DARK },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 6,
    borderBottom: `1px solid ${BRAND_PRIMARY}`,
    paddingBottom: 3,
  },
  table: { display: 'flex', width: 'auto' },
  tableRow: { flexDirection: 'row', borderBottom: '1px solid #F1F5F9', paddingVertical: 4 },
  tableHeaderRow: {
    flexDirection: 'row',
    borderBottom: `1px solid ${BRAND_DARK}`,
    paddingVertical: 4,
    fontWeight: 'bold',
  },
  colFecha: { width: '13%' },
  colTipo: { width: '32%' },
  colComprobante: { width: '25%' },
  colEstado: { width: '13%' },
  colImporte: { width: '17%', textAlign: 'right' },
  empty: { color: '#94A3B8', fontStyle: 'italic', marginBottom: 10 },
  footer: {
    marginTop: 24,
    paddingTop: 8,
    borderTop: '1px solid #F1F5F9',
    fontSize: 7,
    color: '#94A3B8',
  },
})

const ESTADO_LABELS: Record<string, string> = {
  PENDIENTE: 'Pendiente',
  PARCIALMENTE_COBRADA: 'Parcial',
  COBRADA: 'Cobrada',
  ANULADA: 'Anulada',
}

const TIPO_PAGO_LABELS: Record<string, string> = {
  TRANSFERENCIA: 'Transferencia',
  EFECTIVO: 'Efectivo',
  CHEQUE: 'Cheque',
  USD: 'Dólares',
  COMPENSACION: 'Compensación',
}

type Props = {
  clienteNombre: string
  cc: TCuentaCorriente
  liquidaciones: TLiquidacionConImputaciones[]
  recibos: TReciboDisponible[]
  desde?: string
  hasta?: string
}

export function CuentaCorrientePdfDocument({
  clienteNombre,
  cc,
  liquidaciones,
  recibos,
  desde,
  hasta,
}: Props) {
  const rango =
    desde || hasta
      ? `Del ${desde ? formatDate(desde) : 'inicio'} al ${hasta ? formatDate(hasta) : 'hoy'}`
      : 'Historial completo'

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.brandBar} />

        <View style={styles.header}>
          {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf's Image, not an HTML img */}
          <Image style={styles.logo} src="/sello-capomasi.png" />
          <View style={styles.headerText}>
            <Text style={styles.studioName}>Estudio Contable Capomasi</Text>
            <Text style={styles.title}>{clienteNombre}</Text>
            <Text style={styles.subtitle}>Cuenta corriente — {rango}</Text>
          </View>
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Devengado</Text>
            <Text style={styles.summaryValue}>{formatMoney(cc.total_devengado)}</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Cobrado</Text>
            <Text style={styles.summaryValue}>{formatMoney(cc.total_cobrado)}</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Saldo pendiente</Text>
            <Text style={styles.summaryValue}>{formatMoney(cc.saldo_pendiente)}</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Saldo a favor</Text>
            <Text style={styles.summaryValue}>{formatMoney(cc.saldo_a_favor)}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Liquidaciones</Text>
        {!liquidaciones.length ? (
          <Text style={styles.empty}>Sin liquidaciones en el período seleccionado</Text>
        ) : (
          <View style={styles.table}>
            <View style={styles.tableHeaderRow}>
              <Text style={styles.colFecha}>Fecha</Text>
              <Text style={styles.colTipo}>Concepto</Text>
              <Text style={styles.colComprobante}>Comprobante</Text>
              <Text style={styles.colEstado}>Estado</Text>
              <Text style={styles.colImporte}>Importe</Text>
            </View>
            {liquidaciones.map((l) => (
              <View style={styles.tableRow} key={l.id}>
                <Text style={styles.colFecha}>{formatDate(l.fecha_liquidacion)}</Text>
                <Text style={styles.colTipo}>
                  {labelTipoServicio(l.tipo_servicio)}
                  {l.periodo_mes && l.periodo_anio ? ` ${l.periodo_mes} ${l.periodo_anio}` : ''}
                  {l.detalle ? ` — ${l.detalle}` : ''}
                </Text>
                <Text style={styles.colComprobante}>
                  {descripcionComprobante(l.tipo_comprobante, l.nro_comprobante) || '—'}
                </Text>
                <Text style={styles.colEstado}>{ESTADO_LABELS[l.estado] ?? l.estado}</Text>
                <Text style={styles.colImporte}>
                  {formatMoney(l.importe_facturado ?? l.importe_liquidado)}
                </Text>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.sectionTitle}>Recibos</Text>
        {!recibos.length ? (
          <Text style={styles.empty}>Sin recibos en el período seleccionado</Text>
        ) : (
          <View style={styles.table}>
            <View style={styles.tableHeaderRow}>
              <Text style={styles.colFecha}>Fecha</Text>
              <Text style={styles.colTipo}>Forma de pago</Text>
              <Text style={styles.colComprobante}>Recibo N°</Text>
              <Text style={styles.colEstado}></Text>
              <Text style={styles.colImporte}>Importe</Text>
            </View>
            {recibos.map((r) => (
              <View style={styles.tableRow} key={r.id}>
                <Text style={styles.colFecha}>{formatDate(r.fecha)}</Text>
                <Text style={styles.colTipo}>{TIPO_PAGO_LABELS[r.tipo_pago] ?? r.tipo_pago}</Text>
                <Text style={styles.colComprobante}>{r.numero_recibo ?? '—'}</Text>
                <Text style={styles.colEstado}></Text>
                <Text style={styles.colImporte}>{formatMoney(r.importe)}</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.footer}>
          Generado el {formatDate(new Date().toISOString())} — Estudio Contable Capomasi
        </Text>
      </Page>
    </Document>
  )
}
