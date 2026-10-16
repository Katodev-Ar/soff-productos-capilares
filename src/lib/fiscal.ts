/** SOFF P007 — auxiliares fiscales. No emite comprobantes ni consulta ARCA. */
export const SOFF_FISCAL_TYPES = ['A','B','C','M'] as const
export const SOFF_FISCAL_CLASSES = ['factura','nota_credito'] as const
export type SoffFiscalClass = typeof SOFF_FISCAL_CLASSES[number]
export const FISCAL_STATUS_FOR_ORDER = new Set(['pagado','en_preparacion','enviado','entregado'])
export const FISCAL_LIMIT_CENTS = 100_000_000_00

export function fiscalCents(raw: unknown): number | null {
  if (typeof raw !== 'string' && typeof raw !== 'number') return null
  const value = String(raw).trim()
  if (!/^\d{1,9}(?:\.\d{1,2})?$/.test(value)) return null
  const [whole, decimals = ''] = value.split('.')
  const n = Number(whole)*100 + Number(decimals.padEnd(2,'0'))
  return Number.isSafeInteger(n) && n <= FISCAL_LIMIT_CENTS ? n : null
}

export function fiscalCsvField(value: unknown): string {
  let text = String(value ?? '')
  // Excel/LibreOffice pueden interpretar fórmulas incluidas en un CSV.
  if (/^[\s\u0000-\u001f]*[=+@\-]/.test(text)) text = "'" + text
  return '"' + text.replace(/"/g,'""') + '"'
}

export function fiscalCSV(headers: string[], values: Array<Array<unknown>>): string {
  return '\uFEFF' + [headers, ...values].map(row => row.map(fiscalCsvField).join(';')).join('\r\n')+'\r\n'
}
