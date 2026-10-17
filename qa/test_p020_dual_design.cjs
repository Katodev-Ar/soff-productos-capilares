const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const r = p => fs.readFileSync(path.join(__dirname, '..', p),'utf8')
const api = r('src/app/api/admin/appearance/route.ts')
const get = r('src/app/api/storefront/theme/route.ts')
const provider = r('src/components/storefront/StorefrontThemeProvider.tsx')
const root = r('src/app/layout.tsx')
const home = r('src/app/page.tsx')
const header = r('src/components/Header.tsx')
const card = r('src/components/ProductCard.tsx')
const premium = r('src/components/storefront/HomePremium.tsx')
const classic = r('src/components/storefront/HomeClassic.tsx')
const adm = r('src/app/admin/apariencia/page.tsx')
const tests = [
  [api.includes('requireSoffAdmin(req)'), 'publicación requiere administrador'],
  [api.includes('isStorefrontTheme(theme)'), 'valida diseño'],
  [api.includes("from('store_settings')") && api.includes('upsert('),'persistencia Supabase'],
  [!api.includes('NEXT_PUBLIC_SUPABASE_ANON_KEY'), 'POST sin clave pública en lugar de control de acceso'],
  [get.includes("select('value')") && get.includes('THEME_SETTING_KEY'), 'lectura solo de tema'],
  [get.includes('no-store'), 'GET sin caché'],
  [provider.includes("'/api/storefront/theme'") && provider.includes('POLL_INTERVAL_MS'), 'recarga de visitantes'],
  [provider.includes('soff_preview') && adm.includes('soff_preview'), 'vista previa sin publicar'],
  [root.includes('<StorefrontThemeProvider>') && root.includes('</StorefrontThemeProvider>'), 'provider global'],
  [home.includes('HomeClassic') && home.includes('HomePremium'), 'portadas reales'],
  [header.includes('HeaderClassic') && header.includes('HeaderPremium'), 'encabezados reales'],
  [card.includes('ProductCardClassic') && card.includes('ProductCardPremium'), 'tarjetas reales'],
  [premium.includes('safeCombos') && classic.includes('safeCombos'), 'consultas seguras combos'],
  [premium.includes('getAvailableStock(product) > 0') && classic.includes('getAvailableStock(product) > 0'), 'stock preservado'],
  [premium.includes('bg-[#eaf1f5]') && premium.includes('brand.img'), 'logos sobre perla'],
  [adm.includes('postAsSoffAdmin') && adm.includes('Publicar diseño'), 'panel persistente'],
  [r('src/app/globals.css').includes('--color-brand-primary: var(--soff-brand-primary)') && r('src/app/globals.css').includes('--soff-brand-primary: #e88baf'), 'acentos correctos por diseño'],
  [adm.includes('published === item.id'), 'distingue publicado de seleccionado'],
  [r('src/app/admin/layout.tsx').includes("href: '/admin/apariencia'"), 'acceso desde admin'],
  [r('src/components/storefront/ProductCardPremium.tsx').includes('addToCart({') && r('src/components/storefront/ProductCardClassic.tsx').includes('addToCart({'), 'carrito preservado'],
]
for (const [ok,desc] of tests) assert.ok(ok,desc)
console.log(`SOFF P020: ${tests.length} verificaciones estáticas aprobadas`)
