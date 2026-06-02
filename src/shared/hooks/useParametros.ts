'use client'

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'

export type ParametroOption = {
  value: string
  label: string
}

type UseParametrosOptions = {
  categorias: string[]
  fallback?: ParametroOption[]
  valueField?: 'codigo' | 'descripcion'
  labelField?: 'codigo' | 'descripcion'
}

export function useParametros({
  categorias,
  fallback = [],
  valueField = 'codigo',
  labelField = 'descripcion',
}: UseParametrosOptions) {
  return useQuery({
    queryKey: ['parametros', categorias, valueField, labelField],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('parametros')
        .select('categoria, codigo, descripcion, orden')
        .in('categoria', categorias)
        .eq('activo', true)
        .order('orden')
        .order('descripcion')

      if (error) {
        if (fallback.length) return fallback
        throw new Error(error.message)
      }

      const options = (data ?? []).map((item) => ({
        value: item[valueField],
        label: item[labelField],
      }))

      return options.length ? options : fallback
    },
    staleTime: Infinity,
  })
}
