#!/usr/bin/env bash
# Chequea que las vistas NO sean legibles con la anon key sin loguearse.
# Tiene que dar 401/403 en todas. Si alguna da 200, el revoke de la 0080 no entró.
set -u
cd "$(dirname "$0")/.."
set -a
# shellcheck disable=SC1091
. ./.env.local
set +a

VIEWS="v_saldo_fondos v_cuenta_corriente v_resultado_mensual v_facturacion_historica_normalizada v_ingresos_mensuales_con_historico"

fallos=0
for v in $VIEWS; do
  code=$(curl -s -o /tmp/anon_check_body.txt -w "%{http_code}" \
    "${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/${v}?select=*&limit=1" \
    -H "apikey: ${NEXT_PUBLIC_SUPABASE_ANON_KEY}")
  if [ "$code" = "200" ]; then
    printf '  EXPUESTA  %-45s HTTP %s  %s\n' "$v" "$code" "$(head -c 120 /tmp/anon_check_body.txt)"
    fallos=$((fallos + 1))
  else
    printf '  ok        %-45s HTTP %s\n' "$v" "$code"
  fi
done

rm -f /tmp/anon_check_body.txt
echo
if [ "$fallos" -gt 0 ]; then
  echo "RESULTADO: $fallos vista(s) legibles sin loguearse."
  exit 1
fi
echo "RESULTADO: ninguna vista responde a la anon key."
