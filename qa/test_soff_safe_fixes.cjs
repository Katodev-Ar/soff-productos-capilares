/** Comprobaciones estáticas offline para los cambios seguros del 17/10/2026.
 * No reemplazan una prueba de integración con Supabase ni un build completo.
 */
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const root = path.resolve(__dirname, '..')
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8')

const footer = read('src/components/Footer.tsx')
assert.doesNotMatch(footer, /setSubscribed|te sumamos a la lista local/i)
assert.match(footer, /Seguir en Instagram/)

const home = read('src/app/page.tsx')
assert.doesNotMatch(home, /href=\{`\/combo\/\$\{/)
assert.match(home, /href=\{`https:\/\/wa\.me\/5493816253929\?text=/)
assert.match(home, /Precio estimado\. Consultar disponibilidad/)

const product = read('src/app/producto/[id]/page.tsx')
assert.doesNotMatch(product, /<Star\b|\[1, 2, 3, 4, 5\]\.map\(\(star\)/)

const checkout = read('src/app/checkout/page.tsx')
const successCheck = checkout.indexOf("data?.success !== true || typeof data?.orderId !== 'string'")
const clear = checkout.indexOf('      clearCart()')
const redirect = checkout.indexOf('router.push(`/checkout/exito?pedido=')
assert.ok(successCheck !== -1 && successCheck < clear && clear < redirect,
  'El carrito se vacía solo después de que el servidor confirma la orden')

const success = read('src/app/checkout/exito/page.tsx')
assert.match(success, /getUser\(\)/)
assert.match(success, /\.eq\('user_id', user\.id\)/)
assert.match(success, /verification === 'confirmed'/)
assert.doesNotMatch(success, /clearCart\(/)

const admin = read('src/app/admin/page.tsx')
assert.doesNotMatch(admin, /totalRevenue|Ingresos Totales|\.reduce\(\(sum/)
assert.match(admin, /Consultar conciliación de cobros/)
assert.match(admin, /count: 'exact', head: true/)
assert.match(admin, /href: '\/admin\/usuarios'/)

console.log('SOFF: 16 controles estáticos de regresión superados.')
