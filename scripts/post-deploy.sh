#!/bin/sh
# Post-deploy steps for devnotes.nouraboelsoud.com on Hostinger shared hosting.
# Called by .github/workflows/deploy.yml over SSH, or manually via cron.
set -e

cd ~/domains/devnotes.nouraboelsoud.com
export PATH="/opt/alt/php83/usr/bin:$PATH"

php artisan migrate --force
php artisan storage:link || true
php artisan config:cache
php artisan route:cache
php artisan view:cache

echo DEPLOY-DONE
