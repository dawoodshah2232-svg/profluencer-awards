<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Web Routes — API only
|--------------------------------------------------------------------------
| This backend serves no HTML. The domain root returns a small JSON
| pointer so misdirected browsers get a useful answer.
*/

Route::get('/', fn () => response()->json([
    'service' => 'ProFluencer Awards API',
    'version' => 'v1',
    'docs' => 'See backend/README.md and BACKEND_NOTES.md',
]));
