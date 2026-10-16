import { NextRequest, NextResponse } from 'next/server'
import {requireSoffAdmin} from '@/lib/serverAdmin'
import {analyzeCatalog,catalogCSV,type CatalogRecord} from '@/lib/catalogQuality'
export const runtime = 'nodejs'
export async function GET(req: NextRequest) {
  const auth = await requireSoffAdmin(req)
  if(auth.error) return auth.error
  const records: CatalogRecord[]=[]
  const cols='id,name,image_url,description,how_to_use,stock,barcode,internal_code,category,price_base,price_minorista,price_mayorista,price_peluquero,price_revendedor'
  for(let offset=0;offset<5000;offset+=500){
    const {data,error}=await auth.db.from('products').select(cols).order('id').range(offset,offset+499)
    if(error) return NextResponse.json({error:'No se pudo obtener el catálogo.'},{status:503})
    records.push(...((data||[]) as unknown as CatalogRecord[]))
    if((data||[]).length<500) break
    if(offset===4500) return NextResponse.json({error:'Más de 5000 productos: ampliar paginación antes de auditar para evitar informe parcial.'},{status:413})
  }
  const report=analyzeCatalog(records)
  if(req.nextUrl.searchParams.get('format')==='csv'){
    const lines=report.rows.flatMap(r=>r.flags.length?r.flags.map(f=>[r.id,r.name,r.category,f.level,f.code,f.explanation]):[])
    return new NextResponse(catalogCSV(['ID','Producto','Categoria','Prioridad','Codigo','Observacion'],lines),{
      headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="soff-auditoria-catalogo.csv"','Cache-Control':'no-store'}
    })
  }
  return NextResponse.json(report,{headers:{'Cache-Control':'no-store'}})
}
