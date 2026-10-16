import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function PATCH(req: NextRequest) {
  try {
    // Validate admin session
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 })
    }

    // Check caller is admin
    const { data: callerProfile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    if (callerProfile?.role !== 'admin') {
      return NextResponse.json({ error: 'Sin permisos de administrador' }, { status: 403 })
    }

    const body = await req.json()
    const { userId, newRole } = body

    if (!userId || !newRole) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }

    const validRoles = ['minorista', 'mayorista', 'revendedor', 'peluquero', 'admin']
    if (!validRoles.includes(newRole)) {
      return NextResponse.json({ error: 'Rol inválido' }, { status: 400 })
    }

    // Prevent self-demotion
    if (userId === user.id) {
      return NextResponse.json({ error: 'No podés cambiar tu propio rol' }, { status: 400 })
    }

    // Get current role
    const { data: targetProfile } = await supabaseAdmin
      .from('profiles')
      .select('role, first_name, last_name, email')
      .eq('id', userId)
      .single()
    if (!targetProfile) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }
    if (targetProfile.role === newRole) {
      return NextResponse.json({ error: 'El usuario ya tiene ese rol' }, { status: 400 })
    }

    const oldRole = targetProfile.role

    // Update role
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId)
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Log in history if table exists
    try {
      await supabaseAdmin.from('soff_commercial_role_history').insert({
        user_id: userId,
        actor_id: user.id,
        old_role: oldRole,
        new_role: newRole,
        origin: 'asignacion_manual',
        note: `Cambio de rol desde panel de admin: ${oldRole} → ${newRole}`,
      })
    } catch {
      // History table might not exist yet — non-critical
    }

    return NextResponse.json({
      success: true,
      message: `Rol de ${targetProfile.first_name} ${targetProfile.last_name} cambiado de ${oldRole} a ${newRole}`,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 })
  }
}
