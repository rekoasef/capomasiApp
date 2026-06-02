import { authService } from '../services/authService'

// Mock del cliente de Supabase
jest.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: {
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      getUser: jest.fn(),
    },
    from: jest.fn(),
  },
}))

import { supabase } from '@/lib/supabase/client'

const mockSupabase = supabase as jest.Mocked<typeof supabase>

describe('authService.signIn', () => {
  beforeEach(() => jest.clearAllMocks())

  it('retorna ok: true con credenciales válidas', async () => {
    ;(mockSupabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
      error: null,
    })

    const result = await authService.signIn({
      email: 'admin@estudio.com',
      password: 'password123',
    })

    expect(result.ok).toBe(true)
  })

  it('retorna UNAUTHORIZED con credenciales inválidas', async () => {
    ;(mockSupabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
      error: { message: 'Invalid login credentials' },
    })

    const result = await authService.signIn({
      email: 'admin@estudio.com',
      password: 'wrong',
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('UNAUTHORIZED')
      expect(result.error).toBe('Email o contraseña incorrectos')
    }
  })

  it('retorna UNKNOWN con error genérico de Supabase', async () => {
    ;(mockSupabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
      error: { message: 'Service unavailable' },
    })

    const result = await authService.signIn({
      email: 'admin@estudio.com',
      password: 'password123',
    })

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('UNKNOWN')
  })
})

describe('authService.getProfile', () => {
  beforeEach(() => jest.clearAllMocks())

  it('retorna UNAUTHORIZED si no hay usuario autenticado', async () => {
    ;(mockSupabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: null },
    })

    const result = await authService.getProfile()

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('UNAUTHORIZED')
  })

  it('retorna el perfil del usuario autenticado', async () => {
    const mockProfile = {
      id: 'uuid-123',
      nombre: 'Paola',
      email: 'paola@estudio.com',
      rol: 'admin',
      activo: true,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    }

    ;(mockSupabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: { id: 'uuid-123' } },
    })
    ;(mockSupabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: mockProfile, error: null }),
    })

    const result = await authService.getProfile()

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.rol).toBe('admin')
      expect(result.data.nombre).toBe('Paola')
    }
  })
})
