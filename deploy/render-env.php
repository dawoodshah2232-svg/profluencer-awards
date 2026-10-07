<?php

/**
 * Renders deploy/env.production into a real .env.
 *
 * Usage: php deploy/render-env.php <template> <output>
 * Placeholder values come from environment variables of the same name
 * (APP_KEY, DB_PASSWORD, MAIL_PASSWORD, ADMIN_PASSWORD, DEMO_USER_PASSWORD).
 * Values are quoted so passwords containing #, $, spaces or quotes survive
 * phpdotenv parsing unchanged.
 */
[$script, $template, $output] = $argv + [null, null, null];

if ($template === null || $output === null) {
    fwrite(STDERR, "usage: php render-env.php <template> <output>\n");
    exit(2);
}

$required = ['APP_KEY', 'DB_PASSWORD'];
$optional = ['MAIL_PASSWORD', 'ADMIN_PASSWORD', 'DEMO_USER_PASSWORD'];

$quote = static function (string $value): string {
    if ($value === '') {
        return '';
    }
    // Single quotes are fully literal in phpdotenv (no ${} expansion, no escapes).
    if (strpos($value, "'") === false) {
        return "'".$value."'";
    }
    // Otherwise double quotes: escape backslash, double quote and $.
    return '"'.str_replace(['\\', '"', '$'], ['\\\\', '\\"', '\\$'], $value).'"';
};

$values = [];
foreach (array_merge($required, $optional) as $name) {
    $value = getenv($name);
    $value = $value === false ? '' : trim($value);
    if ($value !== '' && preg_match('/[\r\n]/', $value)) {
        fwrite(STDERR, "$name must be a single line.\n");
        exit(1);
    }
    if ($value === '' && in_array($name, $required, true)) {
        fwrite(STDERR, "Missing required value: $name\n");
        exit(1);
    }
    $values[$name] = $value;
}

$env = file_get_contents($template);

foreach ($values as $name => $value) {
    $env = str_replace('{{'.$name.'}}', $quote($value), $env);
}

if (preg_match('/^[^#\n]*\{\{[A-Z_]+\}\}/m', $env, $m)) {
    fwrite(STDERR, "Unfilled placeholder in template: {$m[0]}\n");
    exit(1);
}

// No SMTP password → use cPanel's local sendmail instead of a broken SMTP login.
if ($values['MAIL_PASSWORD'] === '') {
    $env = preg_replace('/^MAIL_MAILER=.*$/m', 'MAIL_MAILER=sendmail', $env);
}

file_put_contents($output, $env);
chmod($output, 0600);
echo "Rendered $output\n";
