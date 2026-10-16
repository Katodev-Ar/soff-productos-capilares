'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'

type Transfer={id:string;order_id:string;amount:number;bank_reference:string;confirmed_at:string;confirmed_by:string}
type MP={id:string;payment_id:string;payment_status:string;external_reference:string|null;payment_amount:number|null;currency:string|null;received_at:string}

export default function ConciliacionPage(){
  const [transfers,setTransfers]=useState<Transfer[]>([])
  const [mp,setMP]=useState<MP[]>([])
  const [error,setError]=useState('')
  useEffect(()=>{
    async function load(){
      const {data:tr,error:te}=await supabase.from('soff_payment_confirmations')
        .select('id,order_id,amount,bank_reference,confirmed_at,confirmed_by').order('confirmed_at',{ascending:false}).limit(100)
      const {data:notifications,error:me}=await supabase.from('soff_mp_notifications')
        .select('id,payment_id,payment_status,external_reference,payment_amount,currency,received_at').order('received_at',{ascending:false}).limit(100)
      if(te||me) setError('No se pudo consultar la conciliación. Verificá que esté instalada la migración P005 y tengas permisos.')
      else {setTransfers(tr||[]);setMP(notifications||[])}
    } load()
  },[])
  return <div className="p-5 space-y-8">
    <h1 className="text-2xl font-bold">Conciliación de cobros</h1>
    <p className="text-sm text-gray-600">Las transferencias se confirman manualmente con el extracto bancario.
      Los eventos de Mercado Pago son solo informativos: NO acreditan ni liberan pedidos automáticamente.</p>
    {error && <p role="alert" className="text-red-600">{error}</p>}
    <section><h2 className="font-semibold mb-3">Transferencias conciliadas</h2>
      <div className="overflow-x-auto"><table className="min-w-full text-sm bg-white"><thead><tr className="text-left bg-gray-100">
        <th className="p-2">Pedido</th><th className="p-2">Importe</th><th className="p-2">Referencia bancaria</th><th className="p-2">Fecha</th><th className="p-2">Operador</th>
      </tr></thead><tbody>{transfers.map(t=><tr key={t.id} className="border-t">
        <td className="p-2 font-mono">{t.order_id.slice(0,8)}</td><td className="p-2">${Number(t.amount).toLocaleString('es-AR')}</td>
        <td className="p-2">{t.bank_reference}</td><td className="p-2">{new Date(t.confirmed_at).toLocaleString('es-AR')}</td>
        <td className="p-2 font-mono">{t.confirmed_by.slice(0,8)}</td></tr>)}
      </tbody></table></div>{!transfers.length&&!error&&<p className="text-sm text-gray-500 mt-3">Sin pagos conciliados.</p>}
    </section>
    <section><h2 className="font-semibold mb-3">Notificaciones verificadas de Mercado Pago</h2>
      <div className="overflow-x-auto"><table className="min-w-full text-sm bg-white"><thead><tr className="text-left bg-gray-100">
        <th className="p-2">ID pago</th><th className="p-2">Estado</th><th className="p-2">Referencia</th><th className="p-2">Importe</th><th className="p-2">Fecha</th>
      </tr></thead><tbody>{mp.map(m=><tr key={m.id} className="border-t">
        <td className="p-2">{m.payment_id}</td><td className="p-2">{m.payment_status}</td><td className="p-2">{m.external_reference||'—'}</td>
        <td className="p-2">{m.payment_amount===null?'—':Number(m.payment_amount).toLocaleString('es-AR')}</td>
        <td className="p-2">{new Date(m.received_at).toLocaleString('es-AR')}</td></tr>)}
      </tbody></table></div>{!mp.length&&!error&&<p className="text-sm text-gray-500 mt-3">Sin notificaciones registradas.</p>}
    </section>
  </div>
}
