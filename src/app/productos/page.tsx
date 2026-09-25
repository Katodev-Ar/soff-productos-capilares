import ProductCatalogClient from './ProductCatalogClient'

type ProductsPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

function getParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? '' : value ?? ''
}

export default async function ProductosPage({ searchParams }: ProductsPageProps) {
  const params = await searchParams
  const category = getParam(params.categoria)
  const query = getParam(params.q)
  const sort = getParam(params.orden)

  return <ProductCatalogClient key={`${category}:${query}:${sort}`} initialCategory={category} initialQuery={query} initialSort={sort} />
}
