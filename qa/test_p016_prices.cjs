/** Pruebas unitarias offline de las reglas P016 y el cálculo de checkout del servidor. */
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('../node_modules/typescript')
const root = path.resolve(__dirname, '..', 'src', 'lib')
function load(file, mocks) {
  const code = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText
  const module = { exports: {} }
  vm.runInNewContext(code, { module, exports: module.exports, require(name) {
    if (!(name in mocks)) throw new Error('Unexpected dependency: ' + name)
    return mocks[name]
  } }, { filename: file })
  return module.exports
}
const roles = ['minorista','mayorista','revendedor','peluquero','admin']
const catalog = {
  normalizeRole: r => roles.includes(r) ? r : 'minorista',
  getRolePrice: (p, role) => Number(p['price_' + (role === 'admin' ? 'minorista' : role)]),
  getAvailableStock: p => Math.max(0, Number(p.stock) || 0),
  PRODUCT_SELECT: 'id,name,stock,price_minorista,price_mayorista,price_revendedor,price_peluquero',
  FREE_SHIPPING_THRESHOLD: 75000,
}
const policy = load('commercialPricingPolicy.ts', { '@/lib/catalog': catalog })
const shipping = { estimateShippingCost: () => ({totalShipping: 3000}), SHIPPING_RATES: {DEFAULT_FLAT_RATE: 5000} }
const termsLib = load('serverCommercialTerms.ts', { '@/lib/catalog': catalog })
const checkout = load('serverCheckout.ts', {
  '@/lib/catalog': catalog, '@/lib/commercialPricingPolicy': policy, '@/lib/shipping': shipping,
  '@/lib/serverCommercialTerms': termsLib,
})
const id = '11111111-1111-4111-8111-111111111111'
function db(role, retail, couponDiscount=20) {
  const p = {id, name: 'Producto test', stock: 200, price_minorista: retail,
    price_mayorista: retail * 0.7, price_revendedor: retail * 0.8, price_peluquero: retail * 0.85}
  return { from(table) {
    return {
      select() {return this}, eq() {return this},
      single: async () => ({data: {role},error:null}),
      maybeSingle: async () => ({data: table === 'soff_channel_terms' ? {
        channel:role==='admin'?'minorista':role, minimum_order:0,first_threshold:role==='minorista'||role==='admin'?45000:null,first_discount:role==='minorista'||role==='admin'?5:0,
        second_threshold:role==='minorista'||role==='admin'?70000:null,second_discount:role==='minorista'||role==='admin'?10:0,
        allow_coupons:role==='minorista'||role==='admin',free_shipping_mode:'inherit',free_shipping_threshold:null,updated_at:'2026-10-16T14:00:00Z'
      } : table === 'coupons' ? {
        id:'coupon1',code:'TEST',discount_percentage:couponDiscount,max_uses:20,current_uses:0,is_active:true
      } : {value:'75000'},error:null}),
      in() {return this},
      returns: async () => ({data:[p],error:null}),
    }
  } }
}
async function quote(role, retail, couponCode=null) {
  return await checkout.calculateQuote(db(role,retail),'test-user',{
    items:[{id,quantity:1}],deliveryMethod:'pickup',coordinates:null,couponCode,
  })
}
async function main() {
  assert.equal(policy.volumeDiscountFor(44999,'minorista'),0)
  assert.equal(policy.volumeDiscountFor(45000,'minorista'),5)
  assert.equal(policy.volumeDiscountFor(69999,'minorista'),5)
  assert.equal(policy.volumeDiscountFor(70000,'minorista'),10)
  assert.equal(policy.volumeDiscountFor(90000,'admin'),10)
  for (const role of ['mayorista','revendedor','peluquero']) {
    assert.equal(policy.volumeDiscountFor(200000,role),0)
    assert.equal(policy.couponAllowedFor(role),false)
    const p = await quote(role,100000)
    assert.equal(p.discountPercentage,0)
    await assert.rejects(() => quote(role,100000,'TEST'), /no se acumulan/)
  }
  assert.equal((await quote('minorista',44999)).discountPercentage,0)
  assert.equal((await quote('minorista',45000)).discountPercentage,5)
  assert.equal((await quote('minorista',70000)).discountPercentage,10)
  assert.equal((await quote('minorista',70000,'TEST')).discountPercentage,30)
  assert.equal((await quote('admin',70000)).discountPercentage,10)
  assert.throws(() => checkout.parseItems([{id,quantity:1},{id,quantity:2}]), /duplicados/)
  console.log('P016 OK: 19 validaciones (perfiles, umbrales, descuentos, cupones y carrito).')
}
main().catch(err=>{console.error(err);process.exit(1)})
