# Estrategia de Backups
## Sistema de Gestión Integral — Estudio Contable Capomasi

---

## 1. Contexto y decisión

El sistema corre en **Supabase Free Tier**, que **no ofrece backups automáticos descargables** ni Point-in-Time Recovery (PITR). La clienta decidió no contratar el plan Supabase Pro (USD 25/mes) ni el servicio de mantenimiento mensual del desarrollador.

Como mitigación, se implementa un esquema de backup manual automatizado, con múltiples copias geográficas y validación periódica de restauración.

**Riesgos residuales aceptados por la clienta:**
- Hasta 24 hs de pérdida de datos entre backups
- Sin recuperación punto en el tiempo (PITR)
- Sin SLA de uptime del proveedor
- Recuperación manual ante incidente (no automática)

Estos riesgos fueron comunicados y aceptados por la clienta antes del inicio del desarrollo.

---

## 2. Estrategia: regla 3-2-1

El esquema sigue el estándar **3-2-1** de la industria:

| Número | Criterio | Implementación |
|--------|----------|----------------|
| **3** copias | Original + 2 backups mínimo | DB productiva + backup local + Drive + pendrive |
| **2** medios | Tipos de almacenamiento distintos | Nube (Drive) + físico (pendrive/disco) |
| **1** offsite | Una copia fuera del lugar físico | Google Drive (cloud) |

---

## 3. Frecuencia

| Tipo | Frecuencia | Retención |
|------|-----------|-----------|
| Backup diario | Automático, todos los días a las 03:00 AM | Últimos 30 días |
| Backup mensual | Se conserva el del día 1 de cada mes | Últimos 12 meses |
| Backup anual | Se conserva el del 1 de enero | Indefinido |
| Test de restore | Manual | Mensual (primer lunes) |

---

## 4. Script de backup

Ubicación: `/scripts/backup-capomasi.sh`

### 4.1 Funcionalidad
1. Ejecuta `pg_dump` completo contra la DB de Supabase
2. Comprime el resultado con `gzip`
3. Nombra el archivo con timestamp
4. Registra el resultado en un log
5. Copia a la carpeta sincronizada con Google Drive
6. Rota backups viejos (borra los mayores a 30 días, excepto los del día 1 de cada mes)
7. Envía email si falla

### 4.2 Formato del nombre

```
backup-YYYY-MM-DD-HHMMSS.sql.gz

Ejemplos:
backup-2026-04-17-030000.sql.gz   ← backup diario
backup-2026-04-01-030000.sql.gz   ← backup mensual (se conserva 12 meses)
backup-2026-01-01-030000.sql.gz   ← backup anual (se conserva indefinidamente)
```

### 4.3 Código del script

```bash
#!/bin/bash
# backup-capomasi.sh
# Backup diario automático de la DB del Estudio Capomasi
# Uso: crontab -e → 0 3 * * * /ruta/al/script/backup-capomasi.sh

set -euo pipefail

# ─── Configuración ─────────────────────────────────────────
DATE=$(date +"%Y-%m-%d-%H%M%S")
BACKUP_DIR="$HOME/backups/capomasi"
DRIVE_DIR="$HOME/GoogleDrive/Backups-Capomasi"   # Carpeta sync de Drive
BACKUP_FILE="backup-$DATE.sql.gz"
LOCAL_PATH="$BACKUP_DIR/$BACKUP_FILE"
LOG_FILE="$BACKUP_DIR/backup.log"
RETENTION_DAYS=30

# Cargar credenciales (archivo fuera del repo)
source "$HOME/.config/capomasi-backup.env"
# Debe contener:
#   DB_HOST=db.xxxxx.supabase.co
#   DB_PORT=5432
#   DB_USER=postgres
#   DB_NAME=postgres
#   DB_PASSWORD=...
#   NOTIFY_EMAIL=radevelopment02@gmail.com

mkdir -p "$BACKUP_DIR" "$DRIVE_DIR"

# ─── Ejecutar dump ─────────────────────────────────────────
echo "[$(date '+%F %T')] Iniciando backup..." >> "$LOG_FILE"

if PGPASSWORD="$DB_PASSWORD" pg_dump \
    -h "$DB_HOST" -p "$DB_PORT" \
    -U "$DB_USER" -d "$DB_NAME" \
    --no-owner --no-acl --clean --if-exists \
    --format=plain \
    | gzip > "$LOCAL_PATH"; then

  SIZE=$(du -h "$LOCAL_PATH" | cut -f1)
  echo "[$(date '+%F %T')] ✓ Backup local OK: $BACKUP_FILE ($SIZE)" >> "$LOG_FILE"
else
  echo "[$(date '+%F %T')] ✗ FALLO en pg_dump" >> "$LOG_FILE"
  echo "Backup falló el $(date). Revisar $LOG_FILE" \
    | mail -s "[CAPOMASI] ⚠ Backup FALLÓ" "$NOTIFY_EMAIL" || true
  exit 1
fi

# ─── Copiar a Google Drive ─────────────────────────────────
if cp "$LOCAL_PATH" "$DRIVE_DIR/"; then
  echo "[$(date '+%F %T')] ✓ Copia a Drive OK" >> "$LOG_FILE"
else
  echo "[$(date '+%F %T')] ✗ FALLO al copiar a Drive" >> "$LOG_FILE"
  echo "Copia a Drive falló el $(date)" \
    | mail -s "[CAPOMASI] ⚠ Copia Drive FALLÓ" "$NOTIFY_EMAIL" || true
fi

# ─── Rotación ──────────────────────────────────────────────
# Borrar backups locales > 30 días, EXCEPTO los del día 1 (mensuales)
find "$BACKUP_DIR" -name "backup-*.sql.gz" -type f -mtime +$RETENTION_DAYS \
  ! -name "backup-*-01-*.sql.gz" \
  -delete 2>/dev/null || true

# Mismo criterio para Drive
find "$DRIVE_DIR" -name "backup-*.sql.gz" -type f -mtime +$RETENTION_DAYS \
  ! -name "backup-*-01-*.sql.gz" \
  -delete 2>/dev/null || true

echo "[$(date '+%F %T')] ✓ Backup completo" >> "$LOG_FILE"
echo "──────────────────────────────────────" >> "$LOG_FILE"
```

### 4.4 Configuración del cron

```bash
# Editar crontab
crontab -e

# Agregar línea (backup diario a las 3 AM)
0 3 * * * /home/usuario/scripts/backup-capomasi.sh
```

---

## 5. Ubicaciones de almacenamiento

| Nivel | Ubicación | Sincronización | Responsable |
|-------|-----------|----------------|-------------|
| 1 (local) | `~/backups/capomasi/` en notebook del dev | Automática (script) | Automático |
| 2 (cloud) | Google Drive, carpeta `Backups-Capomasi` | Automática (Drive desktop) | Automático |
| 3 (físico) | Pendrive dedicado 32GB+ | Manual semanal (cada lunes) | Renzo (dev) |

### 5.1 Rotación del pendrive
- Copiar los backups de la última semana al pendrive cada lunes
- Mantener en el pendrive los últimos 3 meses de backups
- Pendrive guardado físicamente separado de la notebook

---

## 6. Alertas y monitoreo

### 6.1 Qué se notifica
- ✗ **Error en `pg_dump`** → email inmediato
- ✗ **Error al copiar a Drive** → email inmediato
- ⚠ **Tamaño anómalo del backup** (>50% de diferencia con el anterior) → email informativo
- 📊 **Resumen semanal** → email los domingos con los últimos 7 backups

### 6.2 Configurar email en Linux/Mac
```bash
# Ubuntu/Debian
sudo apt install mailutils
# Configurar SMTP en /etc/msmtprc o similar

# Mac (usar msmtp)
brew install msmtp
```

### 6.3 Alternativa sin mail: webhook a WhatsApp/Telegram
Reemplazar `mail` en el script por `curl` a un bot de Telegram o servicio similar.

---

## 7. Procedimiento de restauración

### 7.1 Restore a una DB de desarrollo/staging (uso normal)

```bash
# 1. Tener una DB Postgres local o un segundo proyecto Supabase free
#    Llamémosla "capomasi-staging"

# 2. Elegir el backup a restaurar
ls -lh ~/backups/capomasi/

# 3. Descomprimir
gunzip -k backup-2026-04-17-030000.sql.gz
# Resultado: backup-2026-04-17-030000.sql

# 4. Restaurar
PGPASSWORD="$STAGING_PASSWORD" psql \
  -h "$STAGING_HOST" -p 5432 \
  -U postgres -d postgres \
  -f backup-2026-04-17-030000.sql

# 5. Verificar
PGPASSWORD="$STAGING_PASSWORD" psql \
  -h "$STAGING_HOST" -U postgres -d postgres \
  -c "SELECT COUNT(*) FROM clientes; SELECT COUNT(*) FROM liquidaciones;"
```

### 7.2 Restore en caso de incidente real en producción

> ⚠ **Antes de restaurar en producción, siempre:**
> 1. Confirmar que la pérdida de datos entre el último backup y el momento actual es aceptable
> 2. Avisar a la clienta antes de ejecutar
> 3. Si es posible, hacer un último `pg_dump` del estado actual "roto" antes de pisarlo

```bash
# 1. Hacer dump del estado actual (por si hay que volver atrás)
PGPASSWORD="$PROD_PASSWORD" pg_dump \
  -h "$PROD_HOST" -U postgres -d postgres \
  | gzip > ~/backups/capomasi/pre-restore-$(date +%F-%H%M).sql.gz

# 2. Restaurar desde el backup elegido
gunzip -k backup-YYYY-MM-DD-HHMMSS.sql.gz

PGPASSWORD="$PROD_PASSWORD" psql \
  -h "$PROD_HOST" -p 5432 \
  -U postgres -d postgres \
  -f backup-YYYY-MM-DD-HHMMSS.sql

# 3. Verificar con queries de sanidad
PGPASSWORD="$PROD_PASSWORD" psql -h "$PROD_HOST" -U postgres -d postgres <<EOF
SELECT COUNT(*) AS clientes FROM clientes;
SELECT COUNT(*) AS liquidaciones FROM liquidaciones;
SELECT COUNT(*) AS pagos FROM pagos;
SELECT MAX(created_at) AS ultimo_registro FROM audit_log;
EOF
```

---

## 8. Testing del backup

### 8.1 Smoke test inicial (durante desarrollo)

Ejecutar una vez al inicio del proyecto para validar que el ciclo completo funciona:

```
1. Crear tabla de prueba en DB de desarrollo
   CREATE TABLE test_backup (id SERIAL, nombre TEXT, created_at TIMESTAMPTZ DEFAULT NOW());
   INSERT INTO test_backup (nombre) VALUES ('registro 1'), ('registro 2'), ('registro 3');

2. Ejecutar el script de backup manualmente
   ./backup-capomasi.sh

3. DROP TABLE test_backup;

4. Verificar que la tabla NO existe
   SELECT * FROM test_backup;  -- debe dar error

5. Restaurar el último backup a una DB separada (staging)

6. Verificar en la DB staging que la tabla volvió con sus 3 registros
   SELECT * FROM test_backup;  -- debe traer los 3 registros

7. ✓ Si funciona, el backup es válido. Si no, debuggear antes de seguir.
```

### 8.2 Test mensual (producción)

**Cuándo:** primer lunes de cada mes  
**Duración:** ~15 minutos  
**Procedimiento:**

1. Tomar el backup más reciente
2. Restaurarlo a la DB de staging
3. Correr queries de validación (conteo de tablas principales, último registro de audit_log)
4. Comparar con métricas de producción:
   - Diferencia de registros < 24 hs debe ser mínima
   - Todas las tablas principales presentes
   - Integridad referencial OK
5. Marcar en checklist (sección 10)

### 8.3 Test trimestral: simulacro completo

**Cuándo:** primer lunes de enero, abril, julio, octubre  
**Duración:** ~30 minutos  
**Procedimiento:**

1. Levantar un proyecto Next.js limpio apuntando a la DB de staging
2. Iniciar sesión con un usuario de prueba
3. Verificar que se cargan clientes, liquidaciones, pagos
4. Confirmar que el sistema funciona end-to-end con los datos restaurados
5. Documentar tiempo total de recuperación en este documento

---

## 9. Plan de respuesta ante incidente

### Escenario A: Pérdida total de la DB de producción
**Tiempo máximo de recuperación:** 1 hora

1. Crear un nuevo proyecto Supabase (si el actual está comprometido)
2. Ejecutar el script de migraciones iniciales (schema + RLS + triggers)
3. Restaurar el último backup disponible
4. Actualizar las env vars del frontend (Vercel) con la nueva URL/keys
5. Validar funcionamiento
6. Avisar a la clienta

### Escenario B: Corrupción parcial o borrado accidental
**Tiempo máximo de recuperación:** 2 horas

1. Identificar qué datos se perdieron
2. Restaurar el backup más reciente a staging
3. Extraer solo los datos afectados del backup
4. Importarlos selectivamente a producción
5. Validar integridad referencial

### Escenario C: Supabase caído temporalmente
**Acción:** esperar. El uptime de Supabase históricamente recupera en minutos a pocas horas. No intentar migración ni restore si es un incidente del proveedor.

---

## 10. Checklists operativos

### 10.1 Checklist semanal (dev)
- [ ] Revisar `backup.log` de los últimos 7 días (sin errores)
- [ ] Verificar que los backups aparecen en Google Drive
- [ ] Copiar los últimos 7 backups al pendrive
- [ ] Confirmar tamaño coherente (no caídas bruscas)

### 10.2 Checklist mensual (dev)
- [ ] Ejecutar test de restore en staging
- [ ] Verificar que el backup del día 1 del mes está guardado (rotación mensual)
- [ ] Revisar espacio disponible en disco local y Drive
- [ ] Revisar `crontab -l` para confirmar que sigue activo

### 10.3 Checklist trimestral (dev)
- [ ] Simulacro completo de restauración end-to-end
- [ ] Enviar reporte breve a la clienta confirmando que los backups están OK
- [ ] Revisar si hay que actualizar credenciales de DB en `.env`

---

## 11. Seguridad del backup

- El archivo `.env` con credenciales **nunca** se sube al repositorio
- Los backups contienen datos sensibles (claves fiscales, honorarios, sueldos) → no compartir
- Pendrive dedicado, **no usar para otra cosa**
- Google Drive cuenta con 2FA habilitado
- Los backups en Drive y pendrive idealmente deberían estar cifrados (opcional para fase 2):
  ```bash
  # Cifrar con GPG
  gpg --symmetric --cipher-algo AES256 backup.sql.gz
  # Genera backup.sql.gz.gpg
  ```

---

## 12. Evolución futura

Si en algún momento la clienta acepta pagar Supabase Pro (USD 25/mes):
- **Desactivar el cron del backup manual** (o mantenerlo como capa extra)
- Supabase pasa a hacer **backups diarios automáticos con retención de 7 días**
- Se habilita **PITR (Point-in-Time Recovery)** al segundo
- Desaparece el riesgo de pausa por inactividad
- Se reduce el riesgo de pérdida de datos de hasta 24 hs a **segundos**

El script de backup puede quedarse conviviendo como segunda capa de seguridad — no molesta y suma redundancia.

---

## 13. Responsabilidades

| Tarea | Responsable | Frecuencia |
|-------|------------|------------|
| Mantener el script funcionando | Renzo (dev) | Permanente |
| Ejecutar tests de restore | Renzo (dev) | Mensual |
| Rotar pendrive | Renzo (dev) | Semanal |
| Avisar si falla el backup | Script automático | Cada falla |
| Decidir sobre upgrade de plan | Paola (cliente) | Revisión anual |
