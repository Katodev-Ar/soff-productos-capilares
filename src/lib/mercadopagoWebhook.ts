import { createHmac, timingSafeEqual } from 'crypto'

/** Valida la firma HMAC oficial x-signature. El ID proviene del query, NO del body. */
export function verifyMercadoPagoWebhook(
  dataId:string, signatureHeader:string | null, requestId:string | null, secret:string,
  now:number=Date.now()
): boolean {
  if (!secret || !requestId || !signatureHeader || !/^[\w-]{1,80}$/.test(dataId) || requestId.length>150) return false
  const fields = Object.fromEntries(signatureHeader.split(',').map(pair=>pair.trim().split('=',2)))
  const ts=fields.ts, v1=fields.v1
  if (!ts || !/^(?:\d{10}|\d{13})$/.test(ts) || !v1 || !/^[a-f0-9]{64}$/i.test(v1)) return false
  // Proveedores pueden enviar segundos (10 dígitos) o milisegundos (13).
  // Para HMAC se conserva el texto EXACTO de ts, sin modificar.
  const timestampMs=Number(ts) * (ts.length===10 ? 1000 : 1)
  if (!Number.isSafeInteger(timestampMs) || Math.abs(now-timestampMs)>30*60*1000) return false
  const manifest=`id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`
  const computed=createHmac('sha256',secret).update(manifest).digest()
  const received=Buffer.from(v1,'hex')
  return computed.length===received.length && timingSafeEqual(computed,received)
}
