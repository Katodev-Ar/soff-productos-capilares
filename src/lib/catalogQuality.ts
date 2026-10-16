/** Auditoría orientativa del catálogo: no corrige datos ni define precios. */
export type CatalogRecord = {
  id: string
  name: string | null
  image_url: string | null
  description: string | null
  how_to_use: string | null
  stock: number | null
  barcode: string | null
  internal_code: string | null
  category: string | null
  price_base: number | string | null
  price_minorista: number | string | null
  price_mayorista: number | string | null
  price_peluquero: number | string | null
  price_revendedor: number | string | null
}
export type QualityFlag = {
  code: string
  level: 'critico' | 'revisar' | 'informativo'
  explanation: string
}
export type CatalogQualityRow = { id: string; name: string; category: string; flags: QualityFlag[] }

function text(v: string | null | undefined) { return (v || '').trim() }
function canonical(v: string | null | undefined) { return text(v).normalize('NFKC').toLocaleUpperCase('es-AR').replace(/\s+/g, ' ') }
function money(v: number | string | null) {
  if (v === null || v === '') return null
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : null
}
function frequency(items: CatalogRecord[], key: 'barcode' | 'internal_code' | 'name') {
  const freq = new Map<string, number>()
  for (const item of items) {
    const id = canonical(item[key])
    if (id) freq.set(id, (freq.get(id) || 0) + 1)
  }
  return freq
}
export function analyzeCatalog(items: CatalogRecord[]) {
  const barcodes = frequency(items, 'barcode')
  const codes = frequency(items, 'internal_code')
  const names = frequency(items, 'name')
  const rows: CatalogQualityRow[] = items.map(p => {
    const flags: QualityFlag[] = []
    const add = (code: string, level: QualityFlag['level'], explanation: string) => flags.push({code,level,explanation})
    if (!text(p.name)) add('SIN_NOMBRE', 'critico', 'Producto sin nombre')
    if (!text(p.image_url)) add('SIN_IMAGEN','revisar','No tiene fotografía')
    if (!text(p.description)) add('SIN_DESCRIPCION','revisar','No tiene descripción específica')
    if (!text(p.how_to_use)) add('SIN_INSTRUCCIONES','revisar','No hay instrucciones verificadas del fabricante')
    if (!text(p.category) || canonical(p.category) === 'SIN CATEGORIA') add('SIN_CATEGORIA','revisar','Revisar categoría comercial')
    if (!text(p.barcode) && !text(p.internal_code)) add('SIN_CODIGO','revisar','No tiene identificador comercial')
    for (const [key, map, label] of [['barcode',barcodes,'código de barras'],['internal_code',codes,'código interno'],['name',names,'nombre']] as const) {
      if (canonical(p[key]) && (map.get(canonical(p[key])) || 0) > 1) {
        add(`DUPLICADO_${key.toUpperCase()}`,'revisar',`Coincide el ${label} con otro registro: verificar si es variante o error`)
      }
    }
    const stock = p.stock
    if (stock === null || !Number.isInteger(stock) || stock < 0) add('STOCK_INVALIDO','critico','Stock negativo, nulo o no entero; corregir mediante ajuste trazable')
    else if (stock === 0) add('SIN_STOCK','informativo','Sin unidades disponibles')
    const prices = [
      ['price_minorista',p.price_minorista],['price_mayorista',p.price_mayorista],
      ['price_peluquero',p.price_peluquero],['price_revendedor',p.price_revendedor]
    ] as const
    for (const [field, raw] of prices) {
      const val = money(raw)
      if (val === null || val < 0) add(`PRECIO_INVALIDO_${field.toUpperCase()}`,'critico',`${field}: precio faltante, inválido o negativo`)
      else if (val === 0) add(`PRECIO_CERO_${field.toUpperCase()}`,'revisar',`${field}: valor cero, confirmar si el canal está deshabilitado`)
    }
    const base=money(p.price_base),wholesale=money(p.price_mayorista)
    if (base !== null && base > 0 && wholesale !== null && wholesale > 0 && wholesale < base) {
      add('MAYORISTA_DEBAJO_BASE','revisar','Mayorista menor a price_base. Verificar si price_base representa costo real antes de calcular rentabilidad')
    }
    if (canonical(p.category) === 'ALISADO CON FORMOL') add('CONTROL_SANITARIO','revisar','Controlar composición, rotulado y documentación sanitaria; la categoría sola no implica incumplimiento')
    return {id:p.id,name:text(p.name)||'(Sin nombre)',category:text(p.category)||'SIN CATEGORIA',flags}
  })
  const counts = {total: rows.length, withIssues:rows.filter(r=>r.flags.length>0).length, critical:rows.filter(r=>r.flags.some(f=>f.level==='critico')).length}
  const byFlag: Record<string, number>={}
  rows.forEach(r=>r.flags.forEach(f=>{byFlag[f.code]=(byFlag[f.code]||0)+1}))
  return {counts,byFlag,rows}
}
export function catalogCSV(columns: string[], lines: (string | number)[][]) {
  const esc=(v:string|number)=>'"'+String(v??'').replace(/"/g,'""').replace(/^([=+@\-\t\r])/,"'$1")+'"'
  return '\uFEFF'+[columns,...lines].map(line=>line.map(esc).join(';')).join('\r\n')+'\r\n'
}
