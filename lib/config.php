<?php

function env_values(): array
{
    static $values = null;

    if ($values !== null) {
        return $values;
    }

    $values = [];
    $path = dirname(__DIR__) . DIRECTORY_SEPARATOR . '.env';

    if (!is_file($path)) {
        return $values;
    }

    foreach (file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        $line = trim($line);

        if ($line === '' || str_starts_with($line, '#') || !str_contains($line, '=')) {
            continue;
        }

        [$key, $value] = explode('=', $line, 2);
        $values[trim($key)] = trim($value);
    }

    return $values;
}

function env_value(string $key, ?string $default = null): ?string
{
    $values = env_values();
    return $values[$key] ?? $default;
}

