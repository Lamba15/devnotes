#!/bin/sh
# One-shot: overlays the deterministic portfolio content set onto the
# production DB. Idempotent — safe to re-run (resets portfolio content to
# the fixture state). Mirrors .github/workflows/seed-portfolio.yml.
set -e

cd ~/domains/devnotes.nouraboelsoud.com
/opt/alt/php83/usr/bin/php artisan db:seed --class=PortfolioContentSeeder --force

echo SEED-DONE
