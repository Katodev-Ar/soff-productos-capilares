import { NextResponse } from 'next/server'

/** Disponibilidad del proceso web solamente. No verifica pagos ni base de datos. */
export const dynamic = 'force-dynamic'
export function GET() {
  return NextResponse.json({ service: 'soff', status: 'up', readiness: 'not-verified' }, {
    status: 200,
    headers: { 'Cache-Control': 'no-store, max-age=0' }
  })
}
