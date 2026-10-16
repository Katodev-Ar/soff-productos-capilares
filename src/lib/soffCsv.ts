/** CSV compatible con comillas escapadas, CRLF, UTF-8 BOM y separador ; o , .
 * No escribe en la base: solo prepara y valida una vista previa del archivo.
 */
export type CatalogRow = {
  id?: string; internal_code?: string; barcode?: string; stock?: number;
  price_minorista?: number; price_mayorista?: number; price_peluquero?: number; price_revendedor?: number;
}
const headers:Record<string,keyof CatalogRow>={
 'id':'id','uuid':'id',
 'codigo_interno':'internal_code','codigointerno':'internal_code','sku':'internal_code','internal_code':'internal_code',
 'codigo_barras':'barcode','codigobarras':'barcode','barcode':'barcode','ean':'barcode',
 'stock':'stock','existencia':'stock','existencias':'stock',
 'precio_minorista':'price_minorista','price_minorista':'price_minorista','minorista':'price_minorista',
 'precio_mayorista':'price_mayorista','price_mayorista':'price_mayorista','mayorista':'price_mayorista',
 'precio_peluquero':'price_peluquero','price_peluquero':'price_peluquero','peluquero':'price_peluquero',
 'precio_revendedor':'price_revendedor','price_revendedor':'price_revendedor','revendedor':'price_revendedor',
}
function normalized(input:string){return input.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9_]/g,'_').replace(/_+/g,'_')}
function parseMatrix(src:string,delimiter:string):string[][] {
  const result:string[][]=[];let row:string[]=[];let cell='';let quoted=false
  const input=src.replace(/^\uFEFF/,'')
  for(let i=0;i<input.length;i++){
    const c=input[i]
    if(c==='"'){
      if(quoted && input[i+1]==='"'){cell+='"';i++}
      else if(quoted){quoted=false}
      else if(cell===''){quoted=true}
      else throw new Error('Comillas mal formadas en el archivo CSV.')
    }else if(c===delimiter&&!quoted){row.push(cell.trim());cell=''}
    else if((c==='\n'||c==='\r')&&!quoted){
      if(c==='\r'&&input[i+1]==='\n')i++
      row.push(cell.trim());if(row.some(x=>x!==''))result.push(row)
      row=[];cell=''
    }else cell+=c
  }
  if(quoted)throw new Error('El CSV tiene comillas sin cerrar.')
  row.push(cell.trim());if(row.some(x=>x!==''))result.push(row)
  return result
}
function delimiterOf(src:string){
 let quoted=false,semi=0,comma=0
 for(let i=0;i<src.length;i++){
  const c=src[i]
  if(c==='"'){if(quoted&&src[i+1]==='"'){i++;continue}quoted=!quoted}
  else if(!quoted&&(c==='\n'||c==='\r'))break
  else if(!quoted&&c===';')semi++
  else if(!quoted&&c===',')comma++
 }
 return semi>comma?';':','
}
function parseValue(raw:string,field:keyof CatalogRow):number {
 const v=raw.replace(/[$\s]/g,'')
 const n=field==='stock' ? Number(v) : Number(v.includes(',')?v.replace(/\./g,'').replace(',','.'):v)
 if(!Number.isFinite(n))throw new Error(`Valor inválido para ${field}: ${raw}`)
 if(field==='stock' && (!Number.isInteger(n)||n<0||n>1000000))throw new Error(`Stock inválido: ${raw}`)
 if(field!=='stock' && (n<=0||n>100000000||Math.abs(n*100-Math.round(n*100))>0.00001))
   throw new Error(`Precio fuera de rango (máximo 2 decimales): ${raw}`)
 return n
}
export function parseSoffCatalogCsv(input:string):CatalogRow[]{
 if(input.length>1000000)throw new Error('El archivo supera 1 MB.')
 const rows=parseMatrix(input,delimiterOf(input))
 if(rows.length<2)throw new Error('El CSV debe tener encabezado y productos.')
 if(rows.length-1>600)throw new Error('Máximo 600 productos por archivo.')
 const cols=rows[0].map(c=>headers[normalized(c)]||null)
 if(cols.every(c=>!c))throw new Error('Encabezados incorrectos: usar id, codigo_interno o codigo_barras y los campos de actualización.')
 const used=cols.filter(Boolean)
 if(new Set(used).size!==used.length)throw new Error('Hay columnas repetidas.')
 const out:CatalogRow[]=[],seen=new Set<string>()
 for(let i=1;i<rows.length;i++){
  if(rows[i].length!==cols.length)throw new Error(`Fila ${i+1}: diferente cantidad de columnas.`)
  const row:CatalogRow={}
  for(let j=0;j<cols.length;j++){
   const k=cols[j],v=rows[i][j]
   if(!k||v==='')continue
   if(k==='id'||k==='internal_code'||k==='barcode'){
    if(v.length>100)throw new Error(`Fila ${i+1}: código demasiado extenso.`)
    if(k==='id'&&!/^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i.test(v))
      throw new Error(`Fila ${i+1}: UUID inválido.`)
    row[k]=v
   }else{row[k]=parseValue(v,k)}
  }
  const keys=([row.id,row.internal_code,row.barcode] as (string|undefined)[]).filter(Boolean)
  if(keys.length!==1)throw new Error(`Fila ${i+1}: completar UN solo identificador (UUID, código interno o barras).`)
  if(Object.keys(row).length<2)throw new Error(`Fila ${i+1}: no hay stock ni precios que actualizar.`)
  const key=`${row.id?'id':row.internal_code?'internal_code':'barcode'}:${(keys[0]||'').toUpperCase()}`
  if(seen.has(key))throw new Error(`Fila ${i+1}: código repetido dentro del archivo.`)
  seen.add(key);out.push(row)
 }
 return out
}
