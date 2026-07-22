export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.5'
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          accion: string
          created_at: string
          id: number
          ip_address: unknown
          registro_id: string
          tabla_afectada: string
          usuario_id: string | null
          valor_anterior: Json | null
          valor_nuevo: Json | null
        }
        Insert: {
          accion: string
          created_at?: string
          id?: number
          ip_address?: unknown
          registro_id: string
          tabla_afectada: string
          usuario_id?: string | null
          valor_anterior?: Json | null
          valor_nuevo?: Json | null
        }
        Update: {
          accion?: string
          created_at?: string
          id?: number
          ip_address?: unknown
          registro_id?: string
          tabla_afectada?: string
          usuario_id?: string | null
          valor_anterior?: Json | null
          valor_nuevo?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: 'audit_log_usuario_id_fkey'
            columns: ['usuario_id']
            isOneToOne: false
            referencedRelation: 'usuarios'
            referencedColumns: ['id']
          },
        ]
      }
      categorias_gastos: {
        Row: {
          activo: boolean
          ambito: string
          color: string | null
          created_at: string
          created_by: string | null
          id: string
          nombre: string
          updated_at: string
        }
        Insert: {
          activo?: boolean
          ambito?: string
          color?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          nombre: string
          updated_at?: string
        }
        Update: {
          activo?: boolean
          ambito?: string
          color?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          nombre?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'categorias_gastos_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'usuarios'
            referencedColumns: ['id']
          },
        ]
      }
      cheques: {
        Row: {
          acreditacion_confirmada: boolean
          acreditacion_confirmada_at: string | null
          acreditacion_confirmada_by: string | null
          banco: string
          cliente_id: string | null
          created_at: string
          cuenta_bancaria: string | null
          estado: string
          fecha_cobro: string | null
          fecha_emision: string
          id: string
          importe: number
          notas: string | null
          numero: string
          origen: string
          proveedor_id: string | null
          tipo: string
          updated_at: string
        }
        Insert: {
          acreditacion_confirmada?: boolean
          acreditacion_confirmada_at?: string | null
          acreditacion_confirmada_by?: string | null
          banco: string
          cliente_id?: string | null
          created_at?: string
          cuenta_bancaria?: string | null
          estado?: string
          fecha_cobro?: string | null
          fecha_emision: string
          id?: string
          importe: number
          notas?: string | null
          numero: string
          origen: string
          proveedor_id?: string | null
          tipo: string
          updated_at?: string
        }
        Update: {
          acreditacion_confirmada?: boolean
          acreditacion_confirmada_at?: string | null
          acreditacion_confirmada_by?: string | null
          banco?: string
          cliente_id?: string | null
          created_at?: string
          cuenta_bancaria?: string | null
          estado?: string
          fecha_cobro?: string | null
          fecha_emision?: string
          id?: string
          importe?: number
          notas?: string | null
          numero?: string
          origen?: string
          proveedor_id?: string | null
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'cheques_acreditacion_confirmada_by_fkey'
            columns: ['acreditacion_confirmada_by']
            isOneToOne: false
            referencedRelation: 'usuarios'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'cheques_cliente_id_fkey'
            columns: ['cliente_id']
            isOneToOne: false
            referencedRelation: 'clientes'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'cheques_cliente_id_fkey'
            columns: ['cliente_id']
            isOneToOne: false
            referencedRelation: 'v_cuenta_corriente'
            referencedColumns: ['cliente_id']
          },
          {
            foreignKeyName: 'cheques_proveedor_id_fkey'
            columns: ['proveedor_id']
            isOneToOne: false
            referencedRelation: 'proveedores'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'cheques_proveedor_id_fkey'
            columns: ['proveedor_id']
            isOneToOne: false
            referencedRelation: 'v_cuenta_corriente_proveedores'
            referencedColumns: ['proveedor_id']
          },
        ]
      }
      claves_clientes: {
        Row: {
          clave: string
          cliente_id: string
          id: string
          notas: string | null
          tipo: string
          updated_at: string
          updated_by: string | null
          usuario: string | null
        }
        Insert: {
          clave: string
          cliente_id: string
          id?: string
          notas?: string | null
          tipo: string
          updated_at?: string
          updated_by?: string | null
          usuario?: string | null
        }
        Update: {
          clave?: string
          cliente_id?: string
          id?: string
          notas?: string | null
          tipo?: string
          updated_at?: string
          updated_by?: string | null
          usuario?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'claves_clientes_cliente_id_fkey'
            columns: ['cliente_id']
            isOneToOne: false
            referencedRelation: 'clientes'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'claves_clientes_cliente_id_fkey'
            columns: ['cliente_id']
            isOneToOne: false
            referencedRelation: 'v_cuenta_corriente'
            referencedColumns: ['cliente_id']
          },
          {
            foreignKeyName: 'claves_clientes_updated_by_fkey'
            columns: ['updated_by']
            isOneToOne: false
            referencedRelation: 'usuarios'
            referencedColumns: ['id']
          },
        ]
      }
      clientes: {
        Row: {
          activo: boolean
          created_at: string
          cuit: string
          deleted_at: string | null
          domicilio: string | null
          email: string | null
          id: string
          localidad: string | null
          nombre: string
          notas: string | null
          responsable_id: string | null
          telefono: string | null
          updated_at: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          cuit: string
          deleted_at?: string | null
          domicilio?: string | null
          email?: string | null
          id?: string
          localidad?: string | null
          nombre: string
          notas?: string | null
          responsable_id?: string | null
          telefono?: string | null
          updated_at?: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          cuit?: string
          deleted_at?: string | null
          domicilio?: string | null
          email?: string | null
          id?: string
          localidad?: string | null
          nombre?: string
          notas?: string | null
          responsable_id?: string | null
          telefono?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'clientes_responsable_id_fkey'
            columns: ['responsable_id']
            isOneToOne: false
            referencedRelation: 'usuarios'
            referencedColumns: ['id']
          },
        ]
      }
      comisiones_config: {
        Row: {
          created_at: string
          empleada_id: string
          id: string
          tipo_calculo: string
          umbral_puntaje: number | null
          valor: number
          vigente_desde: string
        }
        Insert: {
          created_at?: string
          empleada_id: string
          id?: string
          tipo_calculo: string
          umbral_puntaje?: number | null
          valor: number
          vigente_desde?: string
        }
        Update: {
          created_at?: string
          empleada_id?: string
          id?: string
          tipo_calculo?: string
          umbral_puntaje?: number | null
          valor?: number
          vigente_desde?: string
        }
        Relationships: [
          {
            foreignKeyName: 'comisiones_config_empleada_id_fkey'
            columns: ['empleada_id']
            isOneToOne: false
            referencedRelation: 'empleadas'
            referencedColumns: ['id']
          },
        ]
      }
      comisiones_puntaje_registradas: {
        Row: {
          confirmada_at: string
          confirmada_by: string | null
          created_at: string
          empleada_id: string
          estado: string
          id: string
          importe: number
          liquidacion_id: string | null
          liquidada_at: string | null
          notas: string | null
          periodo_anio: number
          periodo_mes: number
          puntos_total: number
        }
        Insert: {
          confirmada_at?: string
          confirmada_by?: string | null
          created_at?: string
          empleada_id: string
          estado?: string
          id?: string
          importe: number
          liquidacion_id?: string | null
          liquidada_at?: string | null
          notas?: string | null
          periodo_anio: number
          periodo_mes: number
          puntos_total: number
        }
        Update: {
          confirmada_at?: string
          confirmada_by?: string | null
          created_at?: string
          empleada_id?: string
          estado?: string
          id?: string
          importe?: number
          liquidacion_id?: string | null
          liquidada_at?: string | null
          notas?: string | null
          periodo_anio?: number
          periodo_mes?: number
          puntos_total?: number
        }
        Relationships: [
          {
            foreignKeyName: 'comisiones_puntaje_registradas_confirmada_by_fkey'
            columns: ['confirmada_by']
            isOneToOne: false
            referencedRelation: 'usuarios'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'comisiones_puntaje_registradas_empleada_id_fkey'
            columns: ['empleada_id']
            isOneToOne: false
            referencedRelation: 'empleadas'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'comisiones_puntaje_registradas_liquidacion_id_fkey'
            columns: ['liquidacion_id']
            isOneToOne: false
            referencedRelation: 'liquidaciones_empleadas'
            referencedColumns: ['id']
          },
        ]
      }
      compras_proveedores: {
        Row: {
          concepto: string
          created_at: string
          created_by: string | null
          estado: string
          fecha: string
          id: string
          importe_total: number
          notas: string | null
          nro_comprobante: string | null
          proveedor_id: string | null
          tipo_comprobante: string | null
          updated_at: string
        }
        Insert: {
          concepto: string
          created_at?: string
          created_by?: string | null
          estado?: string
          fecha: string
          id?: string
          importe_total: number
          notas?: string | null
          nro_comprobante?: string | null
          proveedor_id?: string | null
          tipo_comprobante?: string | null
          updated_at?: string
        }
        Update: {
          concepto?: string
          created_at?: string
          created_by?: string | null
          estado?: string
          fecha?: string
          id?: string
          importe_total?: number
          notas?: string | null
          nro_comprobante?: string | null
          proveedor_id?: string | null
          tipo_comprobante?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'compras_proveedores_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'usuarios'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'compras_proveedores_proveedor_id_fkey'
            columns: ['proveedor_id']
            isOneToOne: false
            referencedRelation: 'proveedores'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'compras_proveedores_proveedor_id_fkey'
            columns: ['proveedor_id']
            isOneToOne: false
            referencedRelation: 'v_cuenta_corriente_proveedores'
            referencedColumns: ['proveedor_id']
          },
        ]
      }
      empleadas: {
        Row: {
          activo: boolean
          alias_cbu: string | null
          apellido: string | null
          cbu: string | null
          created_at: string
          deleted_at: string | null
          direccion: string | null
          dni: string | null
          email: string | null
          fecha_ingreso: string | null
          fecha_nacimiento: string | null
          id: string
          localidad: string | null
          nombre: string
          sueldo_fijo: number | null
          telefono: string | null
          tipo_comision: string
          tipo_relacion: string
          usuario_id: string | null
        }
        Insert: {
          activo?: boolean
          alias_cbu?: string | null
          apellido?: string | null
          cbu?: string | null
          created_at?: string
          deleted_at?: string | null
          direccion?: string | null
          dni?: string | null
          email?: string | null
          fecha_ingreso?: string | null
          fecha_nacimiento?: string | null
          id?: string
          localidad?: string | null
          nombre: string
          sueldo_fijo?: number | null
          telefono?: string | null
          tipo_comision?: string
          tipo_relacion: string
          usuario_id?: string | null
        }
        Update: {
          activo?: boolean
          alias_cbu?: string | null
          apellido?: string | null
          cbu?: string | null
          created_at?: string
          deleted_at?: string | null
          direccion?: string | null
          dni?: string | null
          email?: string | null
          fecha_ingreso?: string | null
          fecha_nacimiento?: string | null
          id?: string
          localidad?: string | null
          nombre?: string
          sueldo_fijo?: number | null
          telefono?: string | null
          tipo_comision?: string
          tipo_relacion?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'empleadas_usuario_id_fkey'
            columns: ['usuario_id']
            isOneToOne: false
            referencedRelation: 'usuarios'
            referencedColumns: ['id']
          },
        ]
      }
      fondos_movimientos: {
        Row: {
          cheque_id: string | null
          concepto: string
          created_at: string
          created_by: string | null
          cuenta_bancaria: string | null
          fecha: string
          id: string
          importe_banco: number | null
          importe_cheques_cartera: number | null
          importe_efectivo: number | null
          importe_taralo: number | null
          importe_usd: number | null
          notas: string | null
          nro_comprobante: string | null
          referencia_id: string | null
          referencia_tipo: string | null
          tipo_movimiento: string
        }
        Insert: {
          cheque_id?: string | null
          concepto: string
          created_at?: string
          created_by?: string | null
          cuenta_bancaria?: string | null
          fecha: string
          id?: string
          importe_banco?: number | null
          importe_cheques_cartera?: number | null
          importe_efectivo?: number | null
          importe_taralo?: number | null
          importe_usd?: number | null
          notas?: string | null
          nro_comprobante?: string | null
          referencia_id?: string | null
          referencia_tipo?: string | null
          tipo_movimiento: string
        }
        Update: {
          cheque_id?: string | null
          concepto?: string
          created_at?: string
          created_by?: string | null
          cuenta_bancaria?: string | null
          fecha?: string
          id?: string
          importe_banco?: number | null
          importe_cheques_cartera?: number | null
          importe_efectivo?: number | null
          importe_taralo?: number | null
          importe_usd?: number | null
          notas?: string | null
          nro_comprobante?: string | null
          referencia_id?: string | null
          referencia_tipo?: string | null
          tipo_movimiento?: string
        }
        Relationships: [
          {
            foreignKeyName: 'fondos_movimientos_cheque_id_fkey'
            columns: ['cheque_id']
            isOneToOne: false
            referencedRelation: 'cheques'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'fondos_movimientos_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'usuarios'
            referencedColumns: ['id']
          },
        ]
      }
      gastos_personales: {
        Row: {
          concepto: string
          created_at: string
          created_by: string | null
          fecha_pago: string
          id: string
          importe: number | null
          medio_pago: string
          notas: string | null
        }
        Insert: {
          concepto: string
          created_at?: string
          created_by?: string | null
          fecha_pago: string
          id?: string
          importe?: number | null
          medio_pago: string
          notas?: string | null
        }
        Update: {
          concepto?: string
          created_at?: string
          created_by?: string | null
          fecha_pago?: string
          id?: string
          importe?: number | null
          medio_pago?: string
          notas?: string | null
        }
        Relationships: []
      }
      gastos_recurrentes: {
        Row: {
          activo: boolean
          categoria_id: string
          created_at: string
          created_by: string | null
          descripcion: string
          dia_vencimiento: number
          id: string
          notas: string | null
          proxima_fecha_vencimiento: string
          updated_at: string
        }
        Insert: {
          activo?: boolean
          categoria_id: string
          created_at?: string
          created_by?: string | null
          descripcion: string
          dia_vencimiento: number
          id?: string
          notas?: string | null
          proxima_fecha_vencimiento: string
          updated_at?: string
        }
        Update: {
          activo?: boolean
          categoria_id?: string
          created_at?: string
          created_by?: string | null
          descripcion?: string
          dia_vencimiento?: number
          id?: string
          notas?: string | null
          proxima_fecha_vencimiento?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'gastos_recurrentes_categoria_id_fkey'
            columns: ['categoria_id']
            isOneToOne: false
            referencedRelation: 'categorias_gastos'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'gastos_recurrentes_categoria_id_fkey'
            columns: ['categoria_id']
            isOneToOne: false
            referencedRelation: 'v_pagos_gastos_detalle'
            referencedColumns: ['categoria_id']
          },
          {
            foreignKeyName: 'gastos_recurrentes_categoria_id_fkey'
            columns: ['categoria_id']
            isOneToOne: false
            referencedRelation: 'v_proximos_vencimientos'
            referencedColumns: ['categoria_id']
          },
          {
            foreignKeyName: 'gastos_recurrentes_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'usuarios'
            referencedColumns: ['id']
          },
        ]
      }
      honorarios_anuales: {
        Row: {
          anio: number
          asignado_a: string | null
          cliente_id: string
          created_at: string
          estado: string
          fecha_vencimiento: string | null
          honorario: number | null
          id: string
          importe_facturado: number | null
          notas: string | null
          tipo_comprobante: string | null
          tipo_trabajo: string
          updated_at: string
        }
        Insert: {
          anio: number
          asignado_a?: string | null
          cliente_id: string
          created_at?: string
          estado?: string
          fecha_vencimiento?: string | null
          honorario?: number | null
          id?: string
          importe_facturado?: number | null
          notas?: string | null
          tipo_comprobante?: string | null
          tipo_trabajo: string
          updated_at?: string
        }
        Update: {
          anio?: number
          asignado_a?: string | null
          cliente_id?: string
          created_at?: string
          estado?: string
          fecha_vencimiento?: string | null
          honorario?: number | null
          id?: string
          importe_facturado?: number | null
          notas?: string | null
          tipo_comprobante?: string | null
          tipo_trabajo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'honorarios_anuales_asignado_a_fkey'
            columns: ['asignado_a']
            isOneToOne: false
            referencedRelation: 'usuarios'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'honorarios_anuales_cliente_id_fkey'
            columns: ['cliente_id']
            isOneToOne: false
            referencedRelation: 'clientes'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'honorarios_anuales_cliente_id_fkey'
            columns: ['cliente_id']
            isOneToOne: false
            referencedRelation: 'v_cuenta_corriente'
            referencedColumns: ['cliente_id']
          },
        ]
      }
      honorarios_anuales_empleadas: {
        Row: {
          created_at: string
          empleada_id: string
          honorario_anual_id: string
          id: string
        }
        Insert: {
          created_at?: string
          empleada_id: string
          honorario_anual_id: string
          id?: string
        }
        Update: {
          created_at?: string
          empleada_id?: string
          honorario_anual_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'honorarios_anuales_empleadas_empleada_id_fkey'
            columns: ['empleada_id']
            isOneToOne: false
            referencedRelation: 'empleadas'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'honorarios_anuales_empleadas_honorario_anual_id_fkey'
            columns: ['honorario_anual_id']
            isOneToOne: false
            referencedRelation: 'honorarios_anuales'
            referencedColumns: ['id']
          },
        ]
      }
      honorarios_mensuales: {
        Row: {
          cliente_id: string
          creado_por: string | null
          created_at: string
          frecuencia_ajuste_meses: number
          id: string
          monto: number
          notas: string | null
          porcentaje_ajuste: number | null
          vigente_desde: string
          vigente_hasta: string | null
        }
        Insert: {
          cliente_id: string
          creado_por?: string | null
          created_at?: string
          frecuencia_ajuste_meses?: number
          id?: string
          monto: number
          notas?: string | null
          porcentaje_ajuste?: number | null
          vigente_desde: string
          vigente_hasta?: string | null
        }
        Update: {
          cliente_id?: string
          creado_por?: string | null
          created_at?: string
          frecuencia_ajuste_meses?: number
          id?: string
          monto?: number
          notas?: string | null
          porcentaje_ajuste?: number | null
          vigente_desde?: string
          vigente_hasta?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'honorarios_mensuales_cliente_id_fkey'
            columns: ['cliente_id']
            isOneToOne: false
            referencedRelation: 'clientes'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'honorarios_mensuales_cliente_id_fkey'
            columns: ['cliente_id']
            isOneToOne: false
            referencedRelation: 'v_cuenta_corriente'
            referencedColumns: ['cliente_id']
          },
          {
            foreignKeyName: 'honorarios_mensuales_creado_por_fkey'
            columns: ['creado_por']
            isOneToOne: false
            referencedRelation: 'usuarios'
            referencedColumns: ['id']
          },
        ]
      }
      imputaciones: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          importe: number
          liquidacion_id: string
          notas: string | null
          recibo_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          importe: number
          liquidacion_id: string
          notas?: string | null
          recibo_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          importe?: number
          liquidacion_id?: string
          notas?: string | null
          recibo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'imputaciones_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'usuarios'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'imputaciones_liquidacion_id_fkey'
            columns: ['liquidacion_id']
            isOneToOne: false
            referencedRelation: 'liquidaciones'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'imputaciones_recibo_id_fkey'
            columns: ['recibo_id']
            isOneToOne: false
            referencedRelation: 'recibos'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'imputaciones_recibo_id_fkey'
            columns: ['recibo_id']
            isOneToOne: false
            referencedRelation: 'v_recibos_disponibles'
            referencedColumns: ['id']
          },
        ]
      }
      liquidaciones: {
        Row: {
          cliente_id: string
          created_at: string
          detalle: string | null
          estado: string
          fecha_liquidacion: string
          generado_por: string | null
          id: string
          importe_facturado: number | null
          importe_liquidado: number
          notas: string | null
          nro_comprobante: string | null
          periodo_anio: number | null
          periodo_mes: string | null
          tipo_comprobante: string | null
          tipo_liquidacion: string
          tipo_servicio: string
          updated_at: string
        }
        Insert: {
          cliente_id: string
          created_at?: string
          detalle?: string | null
          estado?: string
          fecha_liquidacion: string
          generado_por?: string | null
          id?: string
          importe_facturado?: number | null
          importe_liquidado: number
          notas?: string | null
          nro_comprobante?: string | null
          periodo_anio?: number | null
          periodo_mes?: string | null
          tipo_comprobante?: string | null
          tipo_liquidacion?: string
          tipo_servicio: string
          updated_at?: string
        }
        Update: {
          cliente_id?: string
          created_at?: string
          detalle?: string | null
          estado?: string
          fecha_liquidacion?: string
          generado_por?: string | null
          id?: string
          importe_facturado?: number | null
          importe_liquidado?: number
          notas?: string | null
          nro_comprobante?: string | null
          periodo_anio?: number | null
          periodo_mes?: string | null
          tipo_comprobante?: string | null
          tipo_liquidacion?: string
          tipo_servicio?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'liquidaciones_cliente_id_fkey'
            columns: ['cliente_id']
            isOneToOne: false
            referencedRelation: 'clientes'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'liquidaciones_cliente_id_fkey'
            columns: ['cliente_id']
            isOneToOne: false
            referencedRelation: 'v_cuenta_corriente'
            referencedColumns: ['cliente_id']
          },
        ]
      }
      liquidaciones_empleadas: {
        Row: {
          concepto: string
          created_at: string
          empleada_id: string
          id: string
          importe: number
          observaciones: string | null
          periodo_anio: number
          periodo_mes: number
          tipo_concepto: string
        }
        Insert: {
          concepto: string
          created_at?: string
          empleada_id: string
          id?: string
          importe: number
          observaciones?: string | null
          periodo_anio: number
          periodo_mes: number
          tipo_concepto: string
        }
        Update: {
          concepto?: string
          created_at?: string
          empleada_id?: string
          id?: string
          importe?: number
          observaciones?: string | null
          periodo_anio?: number
          periodo_mes?: number
          tipo_concepto?: string
        }
        Relationships: [
          {
            foreignKeyName: 'liquidaciones_empleadas_empleada_id_fkey'
            columns: ['empleada_id']
            isOneToOne: false
            referencedRelation: 'empleadas'
            referencedColumns: ['id']
          },
        ]
      }
      pagos_empleadas: {
        Row: {
          cheque_id: string | null
          created_at: string
          cuenta_bancaria: string | null
          empleada_id: string
          fecha_pago: string
          id: string
          importe: number
          notas: string | null
          periodo_anio: number
          periodo_mes: number
          tipo_pago: string
        }
        Insert: {
          cheque_id?: string | null
          created_at?: string
          cuenta_bancaria?: string | null
          empleada_id: string
          fecha_pago: string
          id?: string
          importe: number
          notas?: string | null
          periodo_anio: number
          periodo_mes: number
          tipo_pago: string
        }
        Update: {
          cheque_id?: string | null
          created_at?: string
          cuenta_bancaria?: string | null
          empleada_id?: string
          fecha_pago?: string
          id?: string
          importe?: number
          notas?: string | null
          periodo_anio?: number
          periodo_mes?: number
          tipo_pago?: string
        }
        Relationships: [
          {
            foreignKeyName: 'pagos_empleadas_cheque_id_fkey'
            columns: ['cheque_id']
            isOneToOne: false
            referencedRelation: 'cheques'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'pagos_empleadas_empleada_id_fkey'
            columns: ['empleada_id']
            isOneToOne: false
            referencedRelation: 'empleadas'
            referencedColumns: ['id']
          },
        ]
      }
      pagos_gastos: {
        Row: {
          categoria_id: string
          comprobante_url: string | null
          concepto: string
          created_at: string
          created_by: string | null
          fecha_pago: string
          fecha_vencimiento_pagado: string | null
          gasto_recurrente_id: string | null
          id: string
          importe: number
          medio_pago: string
          notas: string | null
          updated_at: string
        }
        Insert: {
          categoria_id: string
          comprobante_url?: string | null
          concepto: string
          created_at?: string
          created_by?: string | null
          fecha_pago: string
          fecha_vencimiento_pagado?: string | null
          gasto_recurrente_id?: string | null
          id?: string
          importe: number
          medio_pago: string
          notas?: string | null
          updated_at?: string
        }
        Update: {
          categoria_id?: string
          comprobante_url?: string | null
          concepto?: string
          created_at?: string
          created_by?: string | null
          fecha_pago?: string
          fecha_vencimiento_pagado?: string | null
          gasto_recurrente_id?: string | null
          id?: string
          importe?: number
          medio_pago?: string
          notas?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'pagos_gastos_categoria_id_fkey'
            columns: ['categoria_id']
            isOneToOne: false
            referencedRelation: 'categorias_gastos'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'pagos_gastos_categoria_id_fkey'
            columns: ['categoria_id']
            isOneToOne: false
            referencedRelation: 'v_pagos_gastos_detalle'
            referencedColumns: ['categoria_id']
          },
          {
            foreignKeyName: 'pagos_gastos_categoria_id_fkey'
            columns: ['categoria_id']
            isOneToOne: false
            referencedRelation: 'v_proximos_vencimientos'
            referencedColumns: ['categoria_id']
          },
          {
            foreignKeyName: 'pagos_gastos_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'usuarios'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'pagos_gastos_gasto_recurrente_id_fkey'
            columns: ['gasto_recurrente_id']
            isOneToOne: false
            referencedRelation: 'gastos_recurrentes'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'pagos_gastos_gasto_recurrente_id_fkey'
            columns: ['gasto_recurrente_id']
            isOneToOne: false
            referencedRelation: 'v_pagos_gastos_detalle'
            referencedColumns: ['gasto_recurrente_id']
          },
          {
            foreignKeyName: 'pagos_gastos_gasto_recurrente_id_fkey'
            columns: ['gasto_recurrente_id']
            isOneToOne: false
            referencedRelation: 'v_proximos_vencimientos'
            referencedColumns: ['gasto_id']
          },
        ]
      }
      pagos_proveedores: {
        Row: {
          cheque_id: string | null
          compra_id: string
          created_at: string
          cuenta_bancaria: string | null
          fecha_pago: string
          id: string
          importe: number
          notas: string | null
          tipo_pago: string
        }
        Insert: {
          cheque_id?: string | null
          compra_id: string
          created_at?: string
          cuenta_bancaria?: string | null
          fecha_pago: string
          id?: string
          importe: number
          notas?: string | null
          tipo_pago: string
        }
        Update: {
          cheque_id?: string | null
          compra_id?: string
          created_at?: string
          cuenta_bancaria?: string | null
          fecha_pago?: string
          id?: string
          importe?: number
          notas?: string | null
          tipo_pago?: string
        }
        Relationships: [
          {
            foreignKeyName: 'pagos_proveedores_cheque_id_fkey'
            columns: ['cheque_id']
            isOneToOne: false
            referencedRelation: 'cheques'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'pagos_proveedores_compra_id_fkey'
            columns: ['compra_id']
            isOneToOne: false
            referencedRelation: 'compras_proveedores'
            referencedColumns: ['id']
          },
        ]
      }
      parametros: {
        Row: {
          activo: boolean
          categoria: string
          codigo: string
          descripcion: string
          id: string
          orden: number | null
        }
        Insert: {
          activo?: boolean
          categoria: string
          codigo: string
          descripcion: string
          id?: string
          orden?: number | null
        }
        Update: {
          activo?: boolean
          categoria?: string
          codigo?: string
          descripcion?: string
          id?: string
          orden?: number | null
        }
        Relationships: []
      }
      proveedores: {
        Row: {
          activo: boolean
          created_at: string
          cuit: string | null
          deleted_at: string | null
          email: string | null
          id: string
          nombre: string
          notas: string | null
          rubro: string | null
          telefono: string | null
        }
        Insert: {
          activo?: boolean
          created_at?: string
          cuit?: string | null
          deleted_at?: string | null
          email?: string | null
          id?: string
          nombre: string
          notas?: string | null
          rubro?: string | null
          telefono?: string | null
        }
        Update: {
          activo?: boolean
          created_at?: string
          cuit?: string | null
          deleted_at?: string | null
          email?: string | null
          id?: string
          nombre?: string
          notas?: string | null
          rubro?: string | null
          telefono?: string | null
        }
        Relationships: []
      }
      puntos_trabajo_config: {
        Row: {
          activo: boolean
          cliente_id: string
          created_at: string
          dia_vencimiento_anual: number | null
          dia_vencimiento_mensual: number | null
          empleada_id: string | null
          facturar_aparte: boolean
          id: string
          mes_vencimiento_anual: number | null
          puntos: number
          tipo_trabajo: string
          tipo_vencimiento: string
        }
        Insert: {
          activo?: boolean
          cliente_id: string
          created_at?: string
          dia_vencimiento_anual?: number | null
          dia_vencimiento_mensual?: number | null
          empleada_id?: string | null
          facturar_aparte?: boolean
          id?: string
          mes_vencimiento_anual?: number | null
          puntos: number
          tipo_trabajo: string
          tipo_vencimiento?: string
        }
        Update: {
          activo?: boolean
          cliente_id?: string
          created_at?: string
          dia_vencimiento_anual?: number | null
          dia_vencimiento_mensual?: number | null
          empleada_id?: string | null
          facturar_aparte?: boolean
          id?: string
          mes_vencimiento_anual?: number | null
          puntos?: number
          tipo_trabajo?: string
          tipo_vencimiento?: string
        }
        Relationships: [
          {
            foreignKeyName: 'puntos_trabajo_config_cliente_id_fkey'
            columns: ['cliente_id']
            isOneToOne: false
            referencedRelation: 'clientes'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'puntos_trabajo_config_cliente_id_fkey'
            columns: ['cliente_id']
            isOneToOne: false
            referencedRelation: 'v_cuenta_corriente'
            referencedColumns: ['cliente_id']
          },
          {
            foreignKeyName: 'puntos_trabajo_config_empleada_id_fkey'
            columns: ['empleada_id']
            isOneToOne: false
            referencedRelation: 'empleadas'
            referencedColumns: ['id']
          },
        ]
      }
      recibos: {
        Row: {
          anulado: boolean
          anulado_at: string | null
          anulado_by: string | null
          cheque_id: string | null
          cliente_id: string
          created_at: string
          created_by: string | null
          cuenta_bancaria: string | null
          fecha: string
          id: string
          importe: number
          importe_usd: number | null
          motivo_anulacion: string | null
          notas: string | null
          numero_recibo: string | null
          tipo_cambio: number | null
          tipo_pago: string
          updated_at: string
        }
        Insert: {
          anulado?: boolean
          anulado_at?: string | null
          anulado_by?: string | null
          cheque_id?: string | null
          cliente_id: string
          created_at?: string
          created_by?: string | null
          cuenta_bancaria?: string | null
          fecha: string
          id?: string
          importe: number
          importe_usd?: number | null
          motivo_anulacion?: string | null
          notas?: string | null
          numero_recibo?: string | null
          tipo_cambio?: number | null
          tipo_pago: string
          updated_at?: string
        }
        Update: {
          anulado?: boolean
          anulado_at?: string | null
          anulado_by?: string | null
          cheque_id?: string | null
          cliente_id?: string
          created_at?: string
          created_by?: string | null
          cuenta_bancaria?: string | null
          fecha?: string
          id?: string
          importe?: number
          importe_usd?: number | null
          motivo_anulacion?: string | null
          notas?: string | null
          numero_recibo?: string | null
          tipo_cambio?: number | null
          tipo_pago?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'recibos_anulado_by_fkey'
            columns: ['anulado_by']
            isOneToOne: false
            referencedRelation: 'usuarios'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'recibos_cheque_id_fkey'
            columns: ['cheque_id']
            isOneToOne: false
            referencedRelation: 'cheques'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'recibos_cliente_id_fkey'
            columns: ['cliente_id']
            isOneToOne: false
            referencedRelation: 'clientes'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'recibos_cliente_id_fkey'
            columns: ['cliente_id']
            isOneToOne: false
            referencedRelation: 'v_cuenta_corriente'
            referencedColumns: ['cliente_id']
          },
          {
            foreignKeyName: 'recibos_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'usuarios'
            referencedColumns: ['id']
          },
        ]
      }
      registros_horas_empleadas: {
        Row: {
          created_at: string
          descripcion: string | null
          empleada_id: string
          fecha: string
          horas: number
          id: string
          periodo_anio: number
          periodo_mes: number
        }
        Insert: {
          created_at?: string
          descripcion?: string | null
          empleada_id: string
          fecha: string
          horas: number
          id?: string
          periodo_anio: number
          periodo_mes: number
        }
        Update: {
          created_at?: string
          descripcion?: string | null
          empleada_id?: string
          fecha?: string
          horas?: number
          id?: string
          periodo_anio?: number
          periodo_mes?: number
        }
        Relationships: [
          {
            foreignKeyName: 'registros_horas_empleadas_empleada_id_fkey'
            columns: ['empleada_id']
            isOneToOne: false
            referencedRelation: 'empleadas'
            referencedColumns: ['id']
          },
        ]
      }
      registros_puntaje_empleadas: {
        Row: {
          created_at: string
          created_by: string | null
          descripcion: string
          empleada_id: string
          id: string
          periodo_anio: number
          periodo_mes: number
          puntos: number
          tipo_trabajo: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          descripcion: string
          empleada_id: string
          id?: string
          periodo_anio: number
          periodo_mes: number
          puntos: number
          tipo_trabajo?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          descripcion?: string
          empleada_id?: string
          id?: string
          periodo_anio?: number
          periodo_mes?: number
          puntos?: number
          tipo_trabajo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'registros_puntaje_empleadas_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'usuarios'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'registros_puntaje_empleadas_empleada_id_fkey'
            columns: ['empleada_id']
            isOneToOne: false
            referencedRelation: 'empleadas'
            referencedColumns: ['id']
          },
        ]
      }
      saldo_puntaje_empleadas: {
        Row: {
          empleada_id: string
          puntos_acumulados: number
          updated_at: string
        }
        Insert: {
          empleada_id: string
          puntos_acumulados?: number
          updated_at?: string
        }
        Update: {
          empleada_id?: string
          puntos_acumulados?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'saldo_puntaje_empleadas_empleada_id_fkey'
            columns: ['empleada_id']
            isOneToOne: true
            referencedRelation: 'empleadas'
            referencedColumns: ['id']
          },
        ]
      }
      trabajos_realizados: {
        Row: {
          aprobado_at: string | null
          aprobado_por: string | null
          cliente_id: string | null
          created_at: string
          descripcion: string
          empleada_id: string
          fecha: string
          genera_comision: boolean
          id: string
          importe_comision: number | null
          liquidacion_empleada_id: string | null
          periodo_anio: number
          periodo_mes: number
          tipo_trabajo: string
          updated_at: string
        }
        Insert: {
          aprobado_at?: string | null
          aprobado_por?: string | null
          cliente_id?: string | null
          created_at?: string
          descripcion: string
          empleada_id: string
          fecha: string
          genera_comision?: boolean
          id?: string
          importe_comision?: number | null
          liquidacion_empleada_id?: string | null
          periodo_anio: number
          periodo_mes: number
          tipo_trabajo: string
          updated_at?: string
        }
        Update: {
          aprobado_at?: string | null
          aprobado_por?: string | null
          cliente_id?: string | null
          created_at?: string
          descripcion?: string
          empleada_id?: string
          fecha?: string
          genera_comision?: boolean
          id?: string
          importe_comision?: number | null
          liquidacion_empleada_id?: string | null
          periodo_anio?: number
          periodo_mes?: number
          tipo_trabajo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'trabajos_realizados_aprobado_por_fkey'
            columns: ['aprobado_por']
            isOneToOne: false
            referencedRelation: 'usuarios'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'trabajos_realizados_cliente_id_fkey'
            columns: ['cliente_id']
            isOneToOne: false
            referencedRelation: 'clientes'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'trabajos_realizados_cliente_id_fkey'
            columns: ['cliente_id']
            isOneToOne: false
            referencedRelation: 'v_cuenta_corriente'
            referencedColumns: ['cliente_id']
          },
          {
            foreignKeyName: 'trabajos_realizados_empleada_id_fkey'
            columns: ['empleada_id']
            isOneToOne: false
            referencedRelation: 'empleadas'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'trabajos_realizados_liquidacion_empleada_id_fkey'
            columns: ['liquidacion_empleada_id']
            isOneToOne: false
            referencedRelation: 'liquidaciones_empleadas'
            referencedColumns: ['id']
          },
        ]
      }
      usuarios: {
        Row: {
          activo: boolean
          created_at: string
          email: string
          id: string
          nombre: string
          rol: string
          updated_at: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          email: string
          id: string
          nombre: string
          rol: string
          updated_at?: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          email?: string
          id?: string
          nombre?: string
          rol?: string
          updated_at?: string
        }
        Relationships: []
      }
      valores_punto_tipo: {
        Row: {
          created_at: string
          id: string
          tipo_trabajo: string
          valor_por_punto: number
          vigente_desde: string
        }
        Insert: {
          created_at?: string
          id?: string
          tipo_trabajo: string
          valor_por_punto: number
          vigente_desde?: string
        }
        Update: {
          created_at?: string
          id?: string
          tipo_trabajo?: string
          valor_por_punto?: number
          vigente_desde?: string
        }
        Relationships: []
      }
      vencimientos: {
        Row: {
          ambito: string
          cliente_id: string | null
          completado: boolean
          completado_at: string | null
          completado_by: string | null
          created_at: string
          created_by: string | null
          descripcion: string
          empleada_id: string | null
          estado_avance: string
          facturado: boolean
          facturar_aparte: boolean | null
          fecha_vencimiento: string
          id: string
          liquidacion_id: string | null
          notas: string | null
          observaciones_empleada: string | null
          puntos_config_id: string | null
          puntos_snapshot: number | null
          tipo_vencimiento: string
        }
        Insert: {
          ambito?: string
          cliente_id?: string | null
          completado?: boolean
          completado_at?: string | null
          completado_by?: string | null
          created_at?: string
          created_by?: string | null
          descripcion: string
          empleada_id?: string | null
          estado_avance?: string
          facturado?: boolean
          facturar_aparte?: boolean | null
          fecha_vencimiento: string
          id?: string
          liquidacion_id?: string | null
          notas?: string | null
          observaciones_empleada?: string | null
          puntos_config_id?: string | null
          puntos_snapshot?: number | null
          tipo_vencimiento: string
        }
        Update: {
          ambito?: string
          cliente_id?: string | null
          completado?: boolean
          completado_at?: string | null
          completado_by?: string | null
          created_at?: string
          created_by?: string | null
          descripcion?: string
          empleada_id?: string | null
          estado_avance?: string
          facturado?: boolean
          facturar_aparte?: boolean | null
          fecha_vencimiento?: string
          id?: string
          liquidacion_id?: string | null
          notas?: string | null
          observaciones_empleada?: string | null
          puntos_config_id?: string | null
          puntos_snapshot?: number | null
          tipo_vencimiento?: string
        }
        Relationships: [
          {
            foreignKeyName: 'vencimientos_cliente_id_fkey'
            columns: ['cliente_id']
            isOneToOne: false
            referencedRelation: 'clientes'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'vencimientos_cliente_id_fkey'
            columns: ['cliente_id']
            isOneToOne: false
            referencedRelation: 'v_cuenta_corriente'
            referencedColumns: ['cliente_id']
          },
          {
            foreignKeyName: 'vencimientos_completado_by_fkey'
            columns: ['completado_by']
            isOneToOne: false
            referencedRelation: 'usuarios'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'vencimientos_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'usuarios'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'vencimientos_empleada_id_fkey'
            columns: ['empleada_id']
            isOneToOne: false
            referencedRelation: 'empleadas'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'vencimientos_liquidacion_id_fkey'
            columns: ['liquidacion_id']
            isOneToOne: false
            referencedRelation: 'liquidaciones'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'vencimientos_puntos_config_id_fkey'
            columns: ['puntos_config_id']
            isOneToOne: false
            referencedRelation: 'puntos_trabajo_config'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      v_cuenta_corriente: {
        Row: {
          cliente_id: string | null
          cliente_nombre: string | null
          liquidaciones_pendientes: number | null
          saldo_a_favor: number | null
          saldo_pendiente: number | null
          total_cobrado: number | null
          total_devengado: number | null
          total_devengado_neto: number | null
          total_imputado: number | null
          total_recibido: number | null
        }
        Relationships: []
      }
      v_cuenta_corriente_proveedores: {
        Row: {
          compras_pendientes: number | null
          proveedor_id: string | null
          proveedor_nombre: string | null
          saldo_pendiente: number | null
          total_comprado: number | null
          total_pagado: number | null
        }
        Relationships: []
      }
      v_imputaciones_detalle: {
        Row: {
          cliente_id: string | null
          created_at: string | null
          fecha_liquidacion: string | null
          id: string | null
          importe: number | null
          importe_liquidado: number | null
          liquidacion_detalle: string | null
          liquidacion_id: string | null
          notas: string | null
          numero_recibo: string | null
          recibo_fecha: string | null
          recibo_id: string | null
          recibo_tipo_pago: string | null
          tipo_servicio: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'imputaciones_liquidacion_id_fkey'
            columns: ['liquidacion_id']
            isOneToOne: false
            referencedRelation: 'liquidaciones'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'imputaciones_recibo_id_fkey'
            columns: ['recibo_id']
            isOneToOne: false
            referencedRelation: 'recibos'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'imputaciones_recibo_id_fkey'
            columns: ['recibo_id']
            isOneToOne: false
            referencedRelation: 'v_recibos_disponibles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'recibos_cliente_id_fkey'
            columns: ['cliente_id']
            isOneToOne: false
            referencedRelation: 'clientes'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'recibos_cliente_id_fkey'
            columns: ['cliente_id']
            isOneToOne: false
            referencedRelation: 'v_cuenta_corriente'
            referencedColumns: ['cliente_id']
          },
        ]
      }
      v_ingresos_mensuales: {
        Row: {
          cantidad_liquidaciones: number | null
          facturado_cliente_neto: number | null
          ingreso_base_negro: number | null
          iva_facturado: number | null
          mes: string | null
          total_facturado: number | null
          total_liquidado: number | null
        }
        Relationships: []
      }
      v_ingresos_por_empleada_mes: {
        Row: {
          cantidad: number | null
          empleada: string | null
          mes: string | null
          total_liquidado: number | null
        }
        Relationships: []
      }
      v_ingresos_por_tipo_mes: {
        Row: {
          cantidad: number | null
          mes: string | null
          tipo_servicio: string | null
          total_facturado: number | null
          total_liquidado: number | null
        }
        Relationships: []
      }
      v_pagos_gastos_detalle: {
        Row: {
          anio: number | null
          categoria_ambito: string | null
          categoria_color: string | null
          categoria_id: string | null
          categoria_nombre: string | null
          comprobante_url: string | null
          concepto: string | null
          fecha_pago: string | null
          fecha_vencimiento_pagado: string | null
          gasto_descripcion: string | null
          gasto_recurrente_id: string | null
          id: string | null
          importe: number | null
          medio_pago: string | null
          mes: number | null
          notas: string | null
        }
        Relationships: []
      }
      v_proximos_vencimientos: {
        Row: {
          categoria_ambito: string | null
          categoria_color: string | null
          categoria_id: string | null
          categoria_nombre: string | null
          descripcion: string | null
          dia_vencimiento: number | null
          dias_restantes: number | null
          gasto_id: string | null
          proxima_fecha_vencimiento: string | null
        }
        Relationships: []
      }
      v_recibos_disponibles: {
        Row: {
          anulado: boolean | null
          cheque_id: string | null
          cliente_id: string | null
          created_at: string | null
          cuenta_bancaria: string | null
          fecha: string | null
          id: string | null
          importe: number | null
          importe_usd: number | null
          notas: string | null
          numero_recibo: string | null
          saldo_libre: number | null
          tipo_cambio: number | null
          tipo_pago: string | null
          total_imputado: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'recibos_cheque_id_fkey'
            columns: ['cheque_id']
            isOneToOne: false
            referencedRelation: 'cheques'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'recibos_cliente_id_fkey'
            columns: ['cliente_id']
            isOneToOne: false
            referencedRelation: 'clientes'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'recibos_cliente_id_fkey'
            columns: ['cliente_id']
            isOneToOne: false
            referencedRelation: 'v_cuenta_corriente'
            referencedColumns: ['cliente_id']
          },
        ]
      }
      v_resultado_mensual: {
        Row: {
          gasto_manual_estudio: number | null
          gasto_proveedores: number | null
          gasto_sueldos: number | null
          mes: string | null
          resultado: number | null
          total_ingresos: number | null
        }
        Relationships: []
      }
      v_saldo_fondos: {
        Row: {
          saldo_banco: number | null
          saldo_cheques_cartera: number | null
          saldo_efectivo: number | null
          saldo_taralo: number | null
          saldo_usd: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      fn_ajustar_saldo_puntaje: {
        Args: {
          p_empleada_id: string
          p_nota?: string
          p_puntos_a_descontar: number
        }
        Returns: {
          puntos_acumulados: number
        }[]
      }
      fn_anular_recibo: {
        Args: { p_motivo?: string; p_recibo_id: string }
        Returns: {
          anulado: boolean
          anulado_at: string | null
          anulado_by: string | null
          cheque_id: string | null
          cliente_id: string
          created_at: string
          created_by: string | null
          cuenta_bancaria: string | null
          fecha: string
          id: string
          importe: number
          importe_usd: number | null
          motivo_anulacion: string | null
          notas: string | null
          numero_recibo: string | null
          tipo_cambio: number | null
          tipo_pago: string
          updated_at: string
        }
        SetofOptions: {
          from: '*'
          to: 'recibos'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      fn_aplicar_ajuste_honorario: {
        Args: {
          p_cliente_id: string
          p_frecuencia_meses?: number
          p_notas?: string
          p_porcentaje: number
        }
        Returns: {
          cliente_id: string
          creado_por: string | null
          created_at: string
          frecuencia_ajuste_meses: number
          id: string
          monto: number
          notas: string | null
          porcentaje_ajuste: number | null
          vigente_desde: string
          vigente_hasta: string | null
        }
        SetofOptions: {
          from: '*'
          to: 'honorarios_mensuales'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      fn_aprobar_trabajo_realizado: {
        Args: {
          p_genera_comision?: boolean
          p_importe_comision?: number
          p_trabajo_id: string
        }
        Returns: {
          aprobado_at: string | null
          aprobado_por: string | null
          cliente_id: string | null
          created_at: string
          descripcion: string
          empleada_id: string
          fecha: string
          genera_comision: boolean
          id: string
          importe_comision: number | null
          liquidacion_empleada_id: string | null
          periodo_anio: number
          periodo_mes: number
          tipo_trabajo: string
          updated_at: string
        }
        SetofOptions: {
          from: '*'
          to: 'trabajos_realizados'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      fn_avanzar_vencimiento: { Args: { p_gasto_id: string }; Returns: string }
      fn_calcular_comision_horas: {
        Args: {
          p_empleada_id: string
          p_periodo_anio: number
          p_periodo_mes: number
        }
        Returns: {
          total_horas: number
          total_pagar: number
          valor_hora: number
        }[]
      }
      fn_calcular_comision_produccion: {
        Args: {
          p_empleada_id: string
          p_periodo_anio: number
          p_periodo_mes: number
        }
        Returns: number
      }
      fn_calcular_comision_puntaje: {
        Args: {
          p_empleada_id: string
          p_periodo_anio: number
          p_periodo_mes: number
        }
        Returns: {
          comision_generada: number
          puntos_acumulados_prev: number
          puntos_periodo: number
          puntos_restantes: number
          puntos_total: number
          umbral: number
        }[]
      }
      fn_calcular_importe_facturado: {
        Args: { p_importe_liquidado: number; p_tipo_comprobante: string }
        Returns: number
      }
      fn_calcular_proxima_fecha_gasto: {
        Args: { p_desde?: string; p_dia: number }
        Returns: string
      }
      fn_confirmar_comision_puntaje: {
        Args: {
          p_empleada_id: string
          p_periodo_anio: number
          p_periodo_mes: number
        }
        Returns: {
          comision_generada: number
          puntos_restantes: number
          registro_id: string
        }[]
      }
      fn_eliminar_imputacion: {
        Args: { p_imputacion_id: string }
        Returns: boolean
      }
      fn_importar_comision_trabajo_individual: {
        Args: { p_trabajo_id: string }
        Returns: {
          liquidacion_id: string
        }[]
      }
      fn_importar_comisiones_trabajos: {
        Args: {
          p_empleada_id: string
          p_periodo_anio: number
          p_periodo_mes: number
        }
        Returns: {
          concepto: string
          created_at: string
          empleada_id: string
          id: string
          importe: number
          observaciones: string | null
          periodo_anio: number
          periodo_mes: number
          tipo_concepto: string
        }[]
        SetofOptions: {
          from: '*'
          to: 'liquidaciones_empleadas'
          isOneToOne: false
          isSetofReturn: true
        }
      }
      fn_imputar_recibo: {
        Args: {
          p_importe: number
          p_liquidacion_id: string
          p_notas?: string
          p_recibo_id: string
        }
        Returns: {
          created_at: string
          created_by: string | null
          id: string
          importe: number
          liquidacion_id: string
          notas: string | null
          recibo_id: string
        }
        SetofOptions: {
          from: '*'
          to: 'imputaciones'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      fn_liquidar_comision_puntaje: {
        Args: { p_registro_id: string }
        Returns: {
          liquidacion_id: string
        }[]
      }
      fn_recalcular_estado_liquidacion: {
        Args: { p_liquidacion_id: string }
        Returns: string
      }
      fn_registrar_pago_gasto: {
        Args: {
          p_categoria_id: string
          p_comprobante_url?: string
          p_concepto: string
          p_fecha_pago: string
          p_gasto_recurrente_id?: string
          p_importe: number
          p_medio_pago: string
          p_notas?: string
        }
        Returns: {
          categoria_id: string
          comprobante_url: string | null
          concepto: string
          created_at: string
          created_by: string | null
          fecha_pago: string
          fecha_vencimiento_pagado: string | null
          gasto_recurrente_id: string | null
          id: string
          importe: number
          medio_pago: string
          notas: string | null
          updated_at: string
        }
        SetofOptions: {
          from: '*'
          to: 'pagos_gastos'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      fn_registrar_pago_proveedor: {
        Args: {
          p_cheque_id?: string
          p_compra_id: string
          p_cuenta_bancaria?: string
          p_fecha_pago: string
          p_importe: number
          p_notas?: string
          p_tipo_pago: string
        }
        Returns: {
          cheque_id: string | null
          compra_id: string
          created_at: string
          cuenta_bancaria: string | null
          fecha_pago: string
          id: string
          importe: number
          notas: string | null
          tipo_pago: string
        }
        SetofOptions: {
          from: '*'
          to: 'pagos_proveedores'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      fn_registrar_recibo: {
        Args: {
          p_cheque_id?: string
          p_cliente_id: string
          p_cuenta_bancaria?: string
          p_fecha: string
          p_importe: number
          p_importe_usd?: number
          p_imputaciones?: Json
          p_notas?: string
          p_numero_recibo?: string
          p_tipo_cambio?: number
          p_tipo_pago: string
          p_vuelto_efectivo?: number
        }
        Returns: Json
      }
      fn_serie_recibo_de_tipo_comprobante: {
        Args: { p_tipo_comprobante: string }
        Returns: string
      }
      is_admin: { Args: never; Returns: boolean }
      is_authenticated_user: { Args: never; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
