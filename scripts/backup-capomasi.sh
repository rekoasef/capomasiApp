#!/bin/bash
# backup-capomasi.sh
# Backup de la DB del Estudio Capomasi (Supabase free tier).
# Uso manual:  ./scripts/backup-capomasi.sh
# Uso en cron: 0 3 * * * /ruta/al/repo/scripts/backup-capomasi.sh

set -euo pipefail

# --once-daily: no hace nada si ya hay un backup de hoy.
# Permite correrlo por cron cada hora sin depender de que WSL esté prendido
# a una hora fija: el primer pase del día que encuentre la máquina viva, corre.
ONCE_DAILY=0
[[ "${1:-}" == "--once-daily" ]] && ONCE_DAILY=1

# ─── Configuración ─────────────────────────────────────────
DATE=$(date +"%Y-%m-%d-%H%M%S")
BACKUP_DIR="${BACKUP_DIR:-$HOME/backups/capomasi}"
DRIVE_DIR="${DRIVE_DIR:-}"                       # opcional: carpeta sync de Drive
LOG_FILE="$BACKUP_DIR/backup.log"
RETENTION_DAYS=30

PUBLIC_FILE="$BACKUP_DIR/backup-$DATE.sql.gz"
AUTH_FILE="$BACKUP_DIR/backup-$DATE-auth-data.sql.gz"

# Credenciales fuera del repo
CONFIG="${CAPOMASI_BACKUP_ENV:-$HOME/.config/capomasi-backup.env}"
if [[ ! -f "$CONFIG" ]]; then
  echo "✗ Falta el archivo de credenciales: $CONFIG" >&2
  exit 1
fi
# shellcheck disable=SC1090
source "$CONFIG"

: "${PROJECT_REF:?falta PROJECT_REF en $CONFIG}"
: "${DB_PASSWORD:?falta DB_PASSWORD en $CONFIG}"
DB_PORT="${DB_PORT:-5432}"                        # 5432 = session mode (obligatorio para pg_dump)
DB_NAME="${DB_NAME:-postgres}"
DB_USER="${DB_USER:-postgres.$PROJECT_REF}"
NOTIFY_EMAIL="${NOTIFY_EMAIL:-}"

mkdir -p "$BACKUP_DIR"

if (( ONCE_DAILY )) && compgen -G "$BACKUP_DIR/backup-$(date +%F)-*.sql.gz" >/dev/null; then
  exit 0
fi

log()  { echo "[$(date '+%F %T')] $*" | tee -a "$LOG_FILE"; }
fail() {
  log "✗ $*"
  [[ -n "$NOTIFY_EMAIL" ]] && command -v mail >/dev/null 2>&1 && \
    echo "Backup falló el $(date): $*. Revisar $LOG_FILE" \
      | mail -s "[CAPOMASI] ⚠ Backup FALLÓ" "$NOTIFY_EMAIL" || true
  exit 1
}

# ─── Resolver host del pooler ──────────────────────────────
# El host directo (db.$PROJECT_REF.supabase.co) es IPv6-only en el free tier.
if [[ -z "${DB_HOST:-}" ]]; then
  for h in aws-1-us-east-1.pooler.supabase.com aws-0-us-east-1.pooler.supabase.com; do
    if PGPASSWORD="$DB_PASSWORD" psql -h "$h" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
         -c 'select 1' >/dev/null 2>&1; then
      DB_HOST="$h"; break
    fi
  done
fi
[[ -n "${DB_HOST:-}" ]] || fail "no se pudo conectar a ningún host del pooler"

export PGPASSWORD="$DB_PASSWORD"
PG="-h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME"

log "Iniciando backup contra $DB_HOST:$DB_PORT ..."

# ─── Dump 1: schema public completo (schema + datos) ───────
# shellcheck disable=SC2086
pg_dump $PG \
  --schema=public \
  --no-owner --no-acl --clean --if-exists \
  --format=plain \
  | gzip > "$PUBLIC_FILE" || fail "pg_dump de public falló"

# ─── Dump 2: datos de auth (usuarios) ──────────────────────
# El DDL de auth lo recrea Supabase solo; acá guardamos las filas.
# shellcheck disable=SC2086
pg_dump $PG \
  --schema=auth --data-only \
  --no-owner --no-acl \
  --format=plain \
  | gzip > "$AUTH_FILE" || log "⚠ dump de auth falló (no bloqueante)"

# ─── Validaciones de sanidad ───────────────────────────────
SIZE_BYTES=$(stat -c%s "$PUBLIC_FILE")
(( SIZE_BYTES > 10240 )) || fail "backup sospechosamente chico ($SIZE_BYTES bytes)"
gzip -t "$PUBLIC_FILE" || fail "el .gz está corrupto"
zcat "$PUBLIC_FILE" | tail -5 | grep -q 'PostgreSQL database dump complete' \
  || fail "el dump quedó truncado (falta el marcador de cierre)"

log "✓ Backup OK: $(basename "$PUBLIC_FILE") ($(du -h "$PUBLIC_FILE" | cut -f1)) + $(basename "$AUTH_FILE") ($(du -h "$AUTH_FILE" | cut -f1))"

# ─── Comparar con el backup anterior ───────────────────────
PREV=$(find "$BACKUP_DIR" -name 'backup-*.sql.gz' ! -name '*-auth-data.sql.gz' ! -path "$PUBLIC_FILE" \
        -printf '%T@ %p\n' 2>/dev/null | sort -rn | head -1 | cut -d' ' -f2-)
if [[ -n "$PREV" ]]; then
  PREV_SIZE=$(stat -c%s "$PREV")
  if (( SIZE_BYTES * 2 < PREV_SIZE )); then
    log "⚠ el backup pesa menos de la mitad que el anterior ($(basename "$PREV")) — revisar"
  fi
fi

# ─── Copia a Drive (si está configurado) ───────────────────
if [[ -n "$DRIVE_DIR" ]]; then
  mkdir -p "$DRIVE_DIR"
  if cp "$PUBLIC_FILE" "$AUTH_FILE" "$DRIVE_DIR/"; then
    log "✓ Copia a Drive OK"
  else
    log "✗ FALLO al copiar a Drive"
  fi
fi

# ─── Rotación: > 30 días, conservando los del día 1 ────────
for d in "$BACKUP_DIR" ${DRIVE_DIR:+"$DRIVE_DIR"}; do
  find "$d" -name 'backup-*.sql.gz' -type f -mtime +$RETENTION_DAYS \
    ! -name 'backup-*-01-*.sql.gz' -delete 2>/dev/null || true
done

log "✓ Backup completo"
echo "──────────────────────────────────────" >> "$LOG_FILE"
