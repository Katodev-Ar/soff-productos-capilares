const assert=require('node:assert/strict')
const fs=require('node:fs'),path=require('node:path')
const read=rel=>fs.readFileSync(path.join(__dirname,'..',rel),'utf8')
let n=0;const test=(v,name)=>{assert.ok(v,name);n++}
const options=['clasico','premium','perla','aurora','salvia','malva']
const types=read('src/lib/storefrontTheme.ts')
const page=read('src/app/page.tsx'),head=read('src/components/Header.tsx'),card=read('src/components/ProductCard.tsx')
const admin=read('src/app/admin/apariencia/page.tsx'),css=read('src/app/globals.css')
for(const t of options){
 test(types.includes(`'${t}'`),'Tipo '+t)
 test(types.includes(`value === '${t}'`),'Validación '+t)
 test(admin.includes(`id:'${t}'`),'Panel '+t)
 const name=({clasico:'Classic',premium:'Premium',perla:'Perla',aurora:'Aurora',salvia:'Salvia',malva:'Malva'})[t]
 for(const [src,part] of [[page,'Home'],[head,'Header'],[card,'ProductCard']]) test(src.includes(`<${part}${name}`),part+' '+t)
}
for(const [t,base] of [['salvia','Classic'],['malva','Premium']]){
 const name=t[0].toUpperCase()+t.slice(1)
 const home=read(`src/components/storefront/Home${name}.tsx`)
 const wrapper=read(`src/components/storefront/ProductCard${name}.tsx`)
 const nav=read(`src/components/storefront/Header${name}.tsx`)
 test(home.includes('soff_catalog_public'),t+' catálogo vista pública')
 test(home.includes('safeCombos'),t+' combos sin consulta privada')
 test(home.includes('getAvailableStock(product) > 0 && getRolePrice(product, userRole) > 0'),t+' stock y precios')
 test(home.includes('banners.length > 0'),t+' banners reales')
 test(home.includes('ProductCard'),t+' tarjetas dinámicas')
 test(wrapper.includes(`<ProductCard${base} {...props} />`),t+' conserva lógica carrito')
 test(nav.includes(`<Header${base} />`),t+' encabezado funcional')
 test(css.includes(`[data-soff-theme="${t}"]`),t+' css dedicado')
}
test(admin.includes('postAsSoffAdmin'), 'Publicación autenticada')
test(admin.includes('Seis interfaces'), 'Texto panel actualizado')
test(admin.includes('published === item.id'), 'Estado publicado distinguido')
test(admin.includes('soff_preview='), 'Preview no modifica la tienda')
const api=read('src/app/api/admin/appearance/route.ts')
test(api.includes('requireSoffAdmin(req)'), 'Solo administrador puede publicar')
test(api.includes("from('store_settings').upsert"), 'Persistencia Supabase existente')
const provider=read('src/components/storefront/StorefrontThemeProvider.tsx')
test(provider.includes('POLL_INTERVAL_MS') && provider.includes('isStorefrontTheme'), 'Cambio global y preview existentes')
// Branding: naranjas/falso anillo instagram no añadidos.
test(!/aro de instagram|instagram-ring/i.test(read('src/components/storefront/HomeSalvia.tsx')), 'Sin aro de IG')
console.log(`SOFF P022: ${n} controles estáticos aprobados.`)
