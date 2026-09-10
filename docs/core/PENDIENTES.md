# Pendientes abiertos

Estado al **2026-09-10**. Este archivo se mantiene vivo: lo que se cierra se borra de acá y queda contado en `docs/funcional/PEDIDOS_PAOLA.md`.

---

## 🔴 Lo primero, antes de tocar código

### 1. La rama `fix/comparativo-periodos-historico` está sin mergear

Tres commits sobre `640f0f7`:

| commit    | qué                                                                |
| :-------- | :----------------------------------------------------------------- |
| `c9e6c22` | el comparativo entre períodos suma la facturación migrada (+ test) |
| `dc504a0` | migración **0079** — revoke de `anon` en las 16 vistas             |
| `dd8fa01` | `scripts/backup-capomasi.sh`, que estaba sin trackear              |

```bash
git checkout main && git merge fix/comparativo-periodos-historico && git push
```

El push dispara el deploy en Vercel. Sin eso Paola sigue viendo el comparativo viejo.

### 2. Aplicar la migración 0079 a mano

**No está aplicada.** `supabase/migrations/0079_revocar_anon_en_views.sql` hay que pegarla en el SQL Editor de Supabase. No se pudo aplicar ni probar en transacción desde la sesión: el MCP no estaba conectado y el access-token de la CLI no llega al proyecto (ver más abajo).

Después de correrla, verificar que anon quedó afuera:

```bash
set -a && source .env.local && set +a
curl -s -o /dev/null -w "%{http_code}\n" \
  "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/v_saldo_fondos?select=*" \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY"
```

Tiene que dar **401 o 403**. Si da 200, el revoke no entró.

Y entrar con el usuario admin a **Reportes**, **Fondos** y la **cuenta corriente** de un cliente: si alguna quedó vacía, el `GRANT ... TO authenticated` no alcanzó y hay que revisar los grants de esa vista.

### 3. El MCP de Supabase no llega al proyecto

El proyecto de producción es **`ldvvtltmxkpuqhtznbfh`**, pero no aparece ni en `supabase projects list` ni en el MCP: la organización pasó a nombre de Paola y el token actual no la incluye. Al conectar el MCP hay que confirmar que `list_projects` devuelva ese ref; si no aparece, el token necesita acceso a la org de ella.

**Mientras tanto, para leer producción sin MCP** se puede pegar a PostgREST con la service-role key de `.env.local` — es lo que se usó el 2026-09-10 para verificar los números del comparativo:

```bash
set -a && source .env.local && set +a
curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/<tabla_o_vista>?select=*&limit=5" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
```

Sirve para `SELECT`. Para DDL no hay atajo: SQL Editor.

---

## 🟡 Deuda técnica que quedó anotada

### Las vistas no aplican RLS (`security_invoker`)

La 0079 tapa a `anon`, no la otra mitad: **una empleada logueada sigue viendo por las vistas lo que su RLS le niega en la tabla**. Una vista de Postgres corre con los permisos de su dueño salvo que se cree con `security_invoker = true`.

Lo que hoy se filtra a una empleada: `v_saldo_fondos` y `v_resultado_mensual` (`fondos_movimientos` es solo-admin) y `v_facturacion_historica_normalizada` con las tres `*_con_historico` que la leen (`facturacion_historica` es solo-admin).

No se arregló en el momento porque `security_invoker` **cambia qué filas devuelve cada vista** según quién pregunta, así que hay que ir una por una viendo qué pantalla la consume y con qué rol. Es una sesión aparte, no un one-liner.

**Ojo con las vistas nuevas:** toda vista que se cree de acá en adelante vuelve a nacer con SELECT para `anon`. Su migración tiene que terminar con las tres líneas de la 0079 (`GRANT SELECT ... TO authenticated`, `REVOKE ALL ... FROM anon`, `REVOKE ALL ... FROM PUBLIC`).

---

## 🟠 Esperando respuesta de Paola

Ninguno de estos se puede cerrar desde el código.

1. **La fila de ZELARAYAN** — `31/08/2026 · SALDO TECNICO DE IVA · $78.284.834,40`, sin comprobante ni importe facturado. Deforma agosto ($110M contra ~$20M del resto), a Victoria en el reporte por empleada, y ahora también el total del comparativo. **Es la primera pregunta.** Si está mal, se corrige en el Excel y se recarga la tabla entera (ver `docs/funcional/PEDIDOS_PAOLA.md`).
2. **Los meses de los anticipos** — las 87 configuraciones `MENSUAL` que ya existen siguen generando los 12 meses. Las 20 de `ANTICIPOS_DE_GANANCIAS` son las que importan. Depende del cierre fiscal de cada cliente, no se puede adivinar; si pasa la lista, se hace por SQL en bloque.
3. **Cuatro servicios del Excel sin mapear** — `CERTIFICACION DE BALANCE` (¿BALANCE o CERTIFICACIONES?), `RECATEGORIZACION MONOTRIBUTO` (hay código de enero y de julio), `SALDO TECNICO DE IVA` y `RECUPERO IVA DE EXPORTACION`. Aparecen como su propia fila hasta que ella elija.
4. **La letra del recibo** — nunca confirmó si el recibo debe llevar la misma letra que la factura. Hoy hay una sola serie con prefijo `C-` (migración 0073). Si su contador dice que sí, hay que reponer el corte, tapar el agujero de `fn_imputar_recibo` y resolver los 7 recibos ya emitidos.
5. **Supabase Pro** — sin confirmar. PITR **no** viene incluido en el plan Pro.

---

## 🟢 Para la entrega final

- **Personalizar el PDF de liquidación/recibo** según el modelo de Paola. Cambio simple, se puede hacer directo.
- **Publicar en un subdominio de prueba.**
