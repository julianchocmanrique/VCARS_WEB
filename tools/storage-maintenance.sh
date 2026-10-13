#!/usr/bin/env bash
set -Eeuo pipefail
exec 9>/opt/vcars-preview/deploy.lock
flock -w 30 9
printf '\nDISK\n'; df -h /
printf '\nDOCKER\n'; docker system df
printf '\nCONTAINERS\n'; docker ps -a --format '{{.Names}} | {{.Image}} | {{.Status}}'
printf '\nVCARS PATH SIZES\n'; du -sh /opt/vcars-preview/{data,releases,backups,incoming} 2>/dev/null
printf '\nACTIVE RELEASE\n'; readlink -f /opt/vcars-preview/current
printf '\nRELEASES\n'; du -sh /opt/vcars-preview/releases/* 2>/dev/null
printf '\nIMAGES\n'; docker image ls --format '{{.Repository}} | {{.Tag}} | {{.ID}} | {{.Size}}'
printf '\nBUILDCACHE\n'; docker builder du 2>/dev/null | tail -5 || true
printf '\nVCARS HEALTH\n'; curl -fsS --max-time 20 http://127.0.0.1:3013/vcars/api/backend/health/
