#!/usr/bin/env bash
# Backup: dump do banco (Supabase) + snapshot das sessões do WhatsApp.
# Supabase free NÃO tem backup automático — rode isto num cron diário.
#
#   crontab -e →  0 3 * * *  cd /caminho/striva-sales && bash hostgator-setup-kit/backup.sh
source "$(dirname "$0")/_common.sh"
enter_project

BACKUP_DIR="${BACKUP_DIR:-$PROJECT_DIR/backups}"
mkdir -p "$BACKUP_DIR"
# Timestamp vem do host (não do script) pra manter determinismo do kit.
ts="$(date +%Y%m%d-%H%M%S)"

step "Dump do banco → $BACKUP_DIR/db-$ts.sql.gz"
# Pela conexão de SCHEMA (url_do_schema), não pela do app: `pg_dump` só despeja
# o que a role enxerga, e com uma role menor — a que recomendamos no `.env` de
# quem usa Supabase próprio — o backup sai PARCIAL e sai verde. Falha silenciosa
# de backup é a pior das falhas: só aparece na hora de restaurar.
docker run --rm postgres:17-alpine pg_dump "$(url_do_schema)" --no-owner --no-privileges \
  | gzip > "$BACKUP_DIR/db-$ts.sql.gz"
c_grn "✓ banco: $(du -h "$BACKUP_DIR/db-$ts.sql.gz" | awk '{print $1}')"

step "Snapshot das sessões do WhatsApp → $BACKUP_DIR/waha-$ts.tgz"
# A pasta pode ter sido renomeada, mantendo o projeto Docker anterior. Usar o
# basename criaria outro volume vazio e anunciaria um backup sem sessões.
waha_container="$(dc ps -q waha)"
[ -n "$waha_container" ] || die "Não encontrei o contêiner WhatsApp para salvar as sessões."
vol="$(docker inspect --format '{{range .Mounts}}{{if eq .Destination "/app/.sessions"}}{{.Name}}{{end}}{{end}}' "$waha_container")"
[ -n "$vol" ] || die "Não consegui identificar o volume das sessões WhatsApp."
docker run --rm -v "$vol:/data:ro" -v "$BACKUP_DIR:/out" alpine:3.20 \
  tar czf "/out/waha-$ts.tgz" -C /data . 2>/dev/null \
  && c_grn "✓ sessões WhatsApp salvas" \
  || die "Falha ao salvar as sessões WhatsApp. O backup ficou incompleto."

# Retenção normal: mantém os 14 mais recentes de cada tipo. A migração entre
# distribuições pode ser o único ponto de retorno do operador, então ela pede
# que o backup não remova históricos que já existiam.
if [ "${PRESERVAR_BACKUPS_EXISTENTES:-0}" = 1 ]; then
  step "Retenção preservada durante a migração"
else
  step "Limpando backups antigos (mantém 14)"
  find "$BACKUP_DIR" -maxdepth 1 -type f -name 'db-*.sql.gz' -printf '%T@ %p\n' | sort -rn | tail -n +15 | cut -d' ' -f2- | while IFS= read -r old; do rm -f -- "$old"; done
  find "$BACKUP_DIR" -maxdepth 1 -type f -name 'waha-*.tgz' -printf '%T@ %p\n' | sort -rn | tail -n +15 | cut -d' ' -f2- | while IFS= read -r old; do rm -f -- "$old"; done
fi
c_grn "✓ backup concluído em $BACKUP_DIR"
