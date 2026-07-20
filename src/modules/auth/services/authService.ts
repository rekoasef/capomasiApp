import { supabase } from '@/lib/supabase/client'
import type { ServiceResult } from '@/shared/utils/serviceResult'
import type { TLoginForm } from '../schemas/loginSchema'
import type { TUsuario } from '../types'

export const authService = {
  async signIn(form: TLoginForm): Promise<ServiceResult<null>> {
    const { error } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    })
    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        return { ok: false, error: 'Email o contraseña incorrectos', code: 'UNAUTHORIZED' }
      }
      return { ok: false, error: error.message, code: 'UNKNOWN' }
    }
    return { ok: true, data: null }
  },

  async signOut(): Promise<void> {
    await supabase.auth.signOut()
  },

  async getAll(): Promise<ServiceResult<TUsuario[]>> {
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('activo', true)
      .order('nombre')

    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return { ok: true, data: (data ?? []) as TUsuario[] }
  },

  async getProfile(): Promise<ServiceResult<TUsuario>> {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return { ok: false, error: 'No autenticado', code: 'UNAUTHORIZED' }

    const { data, error } = await supabase.from('usuarios').select('*').eq('id', user.id).single()

    if (error) return { ok: false, error: error.message, code: 'DB_ERROR' }
    return { ok: true, data: data as TUsuario }
  },
}
