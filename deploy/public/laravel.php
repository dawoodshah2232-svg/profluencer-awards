<?php

/*
|--------------------------------------------------------------------------
| ProFluencer Awards — API front controller (cPanel)
|--------------------------------------------------------------------------
| Lives in the domain's document root next to the React build. The
| Laravel app itself is deployed OUTSIDE public_html (path below is filled
| in by deploy/remote-deploy.sh), so .env, vendor and storage are never
| web-reachable. .htaccess routes /api/* here; everything else is the
| static frontend.
*/

use Illuminate\Contracts\Http\Kernel;
use Illuminate\Http\Request;

define('LARAVEL_START', microtime(true));

$appDir = '__APP_DIR__';

if (file_exists($maintenance = $appDir.'/storage/framework/maintenance.php')) {
    require $maintenance;
}

require $appDir.'/vendor/autoload.php';

$app = require_once $appDir.'/bootstrap/app.php';

$kernel = $app->make(Kernel::class);

$response = $kernel->handle(
    $request = Request::capture()
)->send();

$kernel->terminate($request, $response);
