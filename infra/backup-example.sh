#!/usr/bin/env bash
set -e
TS=$(date +%F_%H-%M-%S)
DEST="/opt/backups/hotmangay18_$TS.tgz"
sudo tar -czf "$DEST" \
  -C /var/lib/hotmangay18 videos.json \
  -C /home/ubuntu/apps/hotmangay18 assets/uploads \
  /home/ubuntu/apps/hotmangay18/.env
echo "Backup: $DEST"
