#!/usr/bin/env bash
set -Eeuo pipefail
exec 9>/opt/vcars-preview/deploy.lock
flock -w 60 9
printf '\nBEFORE\n'; df -B1 /
current=$(readlink -f /opt/vcars-preview/current)
containers=$(docker ps -a --no-trunc --format '{{.ID}} {{.Image}} {{.Names}}' | sort)
volumes=$(docker volume ls -q | sort)
printf '\nPRUNE UNUSED BUILD CACHE OLDER THAN 72 HOURS\n'
docker builder prune -f --filter until=72h
printf '\nPRUNE UNTAGGED IMAGES NOT REFERENCED BY CONTAINERS, OLDER THAN 72 HOURS\n'
docker image prune -f --filter until=72h
[ "$current" = "$(readlink -f /opt/vcars-preview/current)" ]
[ "$containers" = "$(docker ps -a --no-trunc --format '{{.ID}} {{.Image}} {{.Names}}' | sort)" ]
[ "$volumes" = "$(docker volume ls -q | sort)" ]
printf '\nAFTER\n'; df -B1 /; df -h /; docker system df
printf '\nHEALTH\n'; curl -fsS --max-time 20 http://127.0.0.1:3013/vcars/api/backend/health/
printf '\nCONTAINERS UNCHANGED\n'; docker ps --format '{{.Names}} | {{.Image}} | {{.Status}}'
printf '\nRETAINED VCARS IMAGES\n'; docker image ls --format '{{.Repository}}:{{.Tag}} {{.Size}}' | grep '^vcars-preview-'
