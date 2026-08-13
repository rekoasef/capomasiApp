import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

const bodySchema = z.object({
  usuario_id: z.string().uuid(),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
})

export async function POST(req: NextRequest) {
  const serverClient = await createSupabaseServerClient()

  const {
    data: { user },
  } = await serverClient.auth.getUser()
  if (!user) {
    return NextResponse.json({ ok: false, error: 'No autenticado' }, { status: 401 })
  }

  const { data: profile } = await serverClient
    .from('usuarios')
    .select('rol')
    .eq('id', user.id)
    .single()

  if (profile?.rol !== 'admin') {
    return NextResponse.json({ ok: false, error: 'Sin permisos' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.issues[0].message }, { status: 400 })
  }
  const { usuario_id, password } = parsed.data

  const admin = createSupabaseAdminClient()

  const { data: usuario, error: usuarioError } = await admin
    .from('usuarios')
    .select('id, nombre')
    .eq('id', usuario_id)
    .single()

  if (usuarioError || !usuario) {
    return NextResponse.json({ ok: false, error: 'Usuario no encontrado' }, { status: 404 })
  }

  const { error: updateError } = await admin.auth.admin.updateUserById(usuario_id, { password })

  if (updateError) {
    return NextResponse.json({ ok: false, error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, nombre: usuario.nombre })
}
