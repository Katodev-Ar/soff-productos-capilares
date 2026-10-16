import type { Product } from './catalog'

// Búsqueda flexible: sin tildes, por términos, códigos y nombre parcial.
export function normalizeCatalogText(value: string | null | undefined): string {
  return (value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es-AR').trim()
}

export function matchesCatalogQuery(product: Pick<Product, 'name' | 'category' | 'internal_code' | 'barcode'>, query: string): boolean {
  const terms = normalizeCatalogText(query).split(/\s+/).filter(Boolean)
  if (!terms.length) return true
  const haystack = normalizeCatalogText([product.name, product.category, product.internal_code, product.barcode].filter(Boolean).join(' '))
  return terms.every(term => haystack.includes(term))
}
