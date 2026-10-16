import { NextResponse } from 'next/server'

/**
 * P003-P005: suspensión de preferencias hasta completar circuito de compra MP de extremo a extremo.
 * La ruta anterior confiaba en el rol declarado por el navegador y no
 * registraba una orden verificable ni conciliaba el cobro con webhook.
 * Crear preferencias cobrables sin trazabilidad es un riesgo financiero.
 */
export async function POST() {
  return NextResponse.json({
    error: 'Mercado Pago temporalmente deshabilitado. Se habilitará cuando el cobro y la conciliación estén verificados.'
  }, { status: 503 })
}
