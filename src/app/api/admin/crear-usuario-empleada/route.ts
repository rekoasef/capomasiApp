import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

const bodySchema = z.object({
  empleada_id: z.string().uuid(),
  email: z.string().email('Email inválido'),
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
  const { empleada_id, email, password } = parsed.data

  const admin = createSupabaseAdminClient()

  const { data: empleada, error: empError } = await admin
    .from('empleadas')
    .select('id, nombre, usuario_id')
    .eq('id', empleada_id)
    .is('deleted_at', null)
    .single()

  if (empError || !empleada) {
    return NextResponse.json({ ok: false, error: 'Empleada no encontrada' }, { status: 404 })
  }

  if (empleada.usuario_id) {
    return NextResponse.json(
      { ok: false, error: 'Esta empleada ya tiene cuenta de acceso' },
      { status: 409 }
    )
  }

  // Pass nombre + rol via user_metadata so fn_handle_new_user picks them up
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nombre: empleada.nombre, rol: 'empleada' },
  })

  if (authError) {
    const msg = authError.message.toLowerCase().includes('already registered')
      ? 'Ese email ya está registrado en el sistema'
      : authError.message
    return NextResponse.json({ ok: false, error: msg }, { status: 409 })
  }

  const authUserId = authData.user.id

  // The trigger fn_handle_new_user already inserted the usuarios row.
  // Just link the empleada record to the new auth user.
  const { error: linkError } = await admin
    .from('empleadas')
    .update({ usuario_id: authUserId } as never)
    .eq('id', empleada_id)

  if (linkError) {
    await admin.auth.admin.deleteUser(authUserId)
    return NextResponse.json({ ok: false, error: linkError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, email })
}
