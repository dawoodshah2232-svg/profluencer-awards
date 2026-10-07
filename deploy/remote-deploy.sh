#!/usr/bin/env bash
# ------------------------------------------------------------------
# ProFluencer Awards — server-side deploy steps (cPanel, over SSH).
# Called by .github/workflows/deploy.yml:
#
#   APP_DIR=... WEB_DIR=... PHP_BIN=... bash -s pre  < remote-deploy.sh
#   APP_DIR=... WEB_DIR=... PHP_BIN=... bash -s post < remote-deploy.sh
#   APP_DIR=... WEB_DIR=... PHP_BIN=... bash -s up   < remote-deploy.sh
#
#   pre  — preflight checks + maintenance mode (API answers 503, the
#          static site stays up) before files are synced
#   post — after rsync: storage dirs, front controller, .htaccess block,
#          migrate, seed, cache, back online
#   up   — bring the API back online (used when a deploy step fails)
# ------------------------------------------------------------------
set -euo pipefail

PHASE="${1:?phase required: pre | post | up}"
: "${APP_DIR:?APP_DIR not set}"
: "${WEB_DIR:?WEB_DIR not set}"

# Expand a leading ~ (secrets are often written as ~/public_html/...).
APP_DIR="${APP_DIR/#\~/$HOME}"
WEB_DIR="${WEB_DIR/#\~/$HOME}"

# --- pick a PHP 8.1+ CLI ------------------------------------------------
pick_php() {
    local candidates=()
    [ -n "${PHP_BIN:-}" ] && candidates+=("$PHP_BIN")
    # The account's default PHP first: on CloudLinux (GoDaddy) this is the
    # PHP Selector wrapper, which loads the extensions enabled in cPanel →
    # Select PHP Version. Then cPanel EasyApache (ea-phpXX) and CloudLinux
    # alt-php binaries: 8.1 first, then 8.2, 8.3. The version check below
    # rejects anything outside 8.1–8.3.
    candidates+=(/usr/local/bin/php)
    for v in 81 82 83; do
        candidates+=(
            "/opt/cpanel/ea-php$v/root/usr/bin/php"
            "/usr/local/bin/ea-php$v"
            "/opt/alt/php$v/usr/bin/php"
        )
    done
    candidates+=(/usr/bin/php php)
    for bin in "${candidates[@]}"; do
        if command -v "$bin" >/dev/null 2>&1 \
            && "$bin" -r 'exit(PHP_VERSION_ID >= 80100 && PHP_VERSION_ID < 80400 ? 0 : 1);' 2>/dev/null; then
            echo "$bin"
            return 0
        fi
    done
    return 1
}

PHP="$(pick_php)" || {
    echo "ERROR: no PHP 8.1–8.3 CLI found. Set the CPANEL_PHP secret to its path (cPanel → MultiPHP Manager)." >&2
    exit 1
}

artisan() { "$PHP" "$APP_DIR/artisan" "$@"; }

# Runtime dirs live only on the server (rsync excludes storage/).
ensure_storage() {
    mkdir -p "$APP_DIR"/storage/app/public \
             "$APP_DIR"/storage/framework/cache/data "$APP_DIR"/storage/framework/sessions \
             "$APP_DIR"/storage/framework/views "$APP_DIR"/storage/framework/testing \
             "$APP_DIR"/storage/logs "$APP_DIR"/bootstrap/cache
    chmod -R ug+rwX "$APP_DIR"/storage "$APP_DIR"/bootstrap/cache
}

case "$PHASE" in
pre)
    echo "PHP: $PHP ($("$PHP" -r 'echo PHP_VERSION;'))"
    missing=$("$PHP" -r '$need=["pdo_mysql","mbstring","openssl","tokenizer","xml","ctype","json","fileinfo","bcmath","curl"]; echo implode(" ", array_diff($need, array_map("strtolower", get_loaded_extensions())));')
    if [ -n "$missing" ]; then
        echo "ERROR: PHP extensions missing: $missing (cPanel → Select PHP Version → Extensions)" >&2
        exit 1
    fi
    command -v rsync >/dev/null 2>&1 || { echo "ERROR: rsync is not installed on the server." >&2; exit 1; }

    mkdir -p "$APP_DIR" "$WEB_DIR"
    if [ -f "$APP_DIR/artisan" ]; then ensure_storage; fi
    if [ -f "$APP_DIR/artisan" ] && [ -d "$APP_DIR/vendor" ] && [ -f "$APP_DIR/.env" ]; then
        artisan down --retry=15 || true
    fi
    ;;

post)
    cd "$APP_DIR"
    ensure_storage
    chmod 600 .env

    # Front controller in the document root, pointing at APP_DIR.
    APP_DIR="$APP_DIR" "$PHP" -r '
        $src = file_get_contents($argv[1]);
        $dir = getenv("APP_DIR");
        file_put_contents($argv[2], str_replace("__APP_DIR__", addslashes($dir), $src));
    ' "$APP_DIR/.deploy/public/laravel.php" "$WEB_DIR/laravel.php"
    chmod 644 "$WEB_DIR/laravel.php"

    # .htaccess: replace only our marked block, keep anything cPanel added
    # (e.g. the MultiPHP handler block, SSL / redirect rules).
    HT="$WEB_DIR/.htaccess"
    REST="$(mktemp)"
    if [ -f "$HT" ]; then
        awk '/^# BEGIN ProFluencer Awards/{skip=1} !skip{print} /^# END ProFluencer Awards/{skip=0}' "$HT" > "$REST"
    fi
    { cat "$APP_DIR/.deploy/public/htaccess-block.txt"; echo; cat "$REST"; } > "$HT.new"
    rm -f "$REST"
    mv "$HT.new" "$HT"
    chmod 644 "$HT"

    # Database + caches. Seeders are idempotent: categories are kept in
    # sync with code, settings / admin / demo user are only created when
    # missing (existing data and changed passwords are never overwritten).
    # Seeders read env() directly, so they run BEFORE config:cache.
    artisan config:clear
    artisan migrate --force
    artisan db:seed --force
    artisan config:cache
    artisan route:cache
    artisan view:cache
    artisan queue:restart
    artisan up
    echo "Deploy finished: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
    ;;

up)
    if [ -f "$APP_DIR/artisan" ] && [ -d "$APP_DIR/vendor" ]; then
        artisan up || true
    fi
    ;;

*)
    echo "Unknown phase: $PHASE" >&2
    exit 2
    ;;
esac
