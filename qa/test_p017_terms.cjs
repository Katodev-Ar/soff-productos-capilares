/** P017: regresión de políticas con datos simulados, no valida conexión real a Supabase. */
const assert=require('node:assert/strict')
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm')
const ts=require('../node_modules/typescript')
const root=path.join(__dirname,'../src/lib')
function load(file,mocks){
 const js=ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText
 const module={exports:{}}
 vm.runInNewContext(js,{module,exports:module.exports,require:name=>{if(!(name in mocks))throw Error('unexpected '+name);return mocks[name]}},{filename:file})
 return module.exports
}
const roles=['minorista','mayorista','revendedor','peluquero','admin']
const catalog={normalizeRole:r=>roles.includes(r)?r:'minorista',FREE_SHIPPING_THRESHOLD:75000,
 PRODUCT_SELECT:'id,name,stock,price_minorista,price_mayorista,price_revendedor,price_peluquero',
 getRolePrice:(p,role)=>Number(p['price_'+(role==='admin'?'minorista':role)]),getAvailableStock:p=>Number(p.stock)}
const policy=load('commercialPricingPolicy.ts',{'@/lib/catalog':catalog})
const termsLib=load('serverCommercialTerms.ts',{'@/lib/catalog':catalog})
const shipping={estimateShippingCost:()=>({totalShipping:3000}),SHIPPING_RATES:{DEFAULT_FLAT_RATE:5000}}
const checkout=load('serverCheckout.ts',{'@/lib/catalog':catalog,'@/lib/commercialPricingPolicy':policy,
 '@/lib/serverCommercialTerms':termsLib,'@/lib/shipping':shipping})
const id='11111111-1111-4111-8111-111111111111'
const base={channel:'minorista',minimum_order:0,first_threshold:45000,first_discount:5,second_threshold:70000,
 second_discount:10,allow_coupons:true,free_shipping_mode:'inherit',free_shipping_threshold:null,updated_at:'2026-10-16T14:00:00Z'}
function db(row,price=50000,fail=false){
 return {from(table){return {
  select(){return this},eq(){return this},in(){return this},
  single:async()=>({data:{role:row.channel},error:null}),
  maybeSingle:async()=>table==='soff_channel_terms'
   ? {data:fail?null:row,error:fail?{code:'42P01'}:null}
   : {data:table==='store_settings'?{value:'75000'}:{id:'coupon1',code:'PROMO',discount_percentage:5,max_uses:100,current_uses:0,is_active:true},error:null},
  returns:async()=>({data:[{id,name:'Shampoo',stock:100,price_minorista:price,price_mayorista:price,
   price_revendedor:price,price_peluquero:price}],error:null})
 }}}
}
const quote=(row,price=50000,deliveryMethod='delivery',couponCode=null,fail=false)=>checkout.calculateQuote(
 db(row,price,fail),'u',{items:[{id,quantity:1}],deliveryMethod,coordinates:null,couponCode})
;(async()=>{
 assert.equal(policy.volumeDiscountFor(45000,'minorista',await termsLib.loadCommercialTerms(db(base),'minorista')),5)
 assert.equal((await quote(base,50000,'pickup')).total,47500)
 assert.equal((await quote(base,70000,'pickup')).total,63000)
 await assert.rejects(()=>quote({...base,minimum_order:60000},50000,'pickup'),/Compra mínima/)
 await assert.rejects(()=>quote(base,50000,'pickup',null,true),/condiciones comerciales/)
 const special={...base,channel:'revendedor',minimum_order:60000,first_threshold:null,first_discount:0,
 second_threshold:null,second_discount:0,allow_coupons:false,free_shipping_mode:'disabled'}
 await assert.rejects(()=>quote(special,50000,'pickup'),/Compra mínima/)
 assert.equal((await quote(special,70000,'delivery')).shipping,5000)
 await assert.rejects(()=>quote({...special,minimum_order:0},70000,'pickup','PROMO'),/cupones/)
 const threshold={...special,minimum_order:0,free_shipping_mode:'threshold',free_shipping_threshold:80000}
 assert.equal((await quote(threshold,70000,'delivery')).shipping,5000)
 assert.equal((await quote(threshold,80000,'delivery')).shipping,0)
 assert.equal((await quote({...threshold,free_shipping_mode:'always',free_shipping_threshold:null},50000,'delivery')).shipping,0)
 assert.equal((await quote({...base,free_shipping_mode:'inherit'},100000,'delivery')).shipping,0)
 assert.equal(policy.minimumRemaining(54999,{minimumOrder:55000}),1)
 await assert.rejects(()=>termsLib.loadCommercialTerms(db({...base,first_threshold:null,first_discount:5}),'minorista'),/condiciones comerciales/)
 console.log('P017: 14 escenarios OK. Mínimos, cupones, escalones, cuatro modos de envío, rechazo sin SQL.')
})().catch(e=>{console.error(e);process.exit(1)})
