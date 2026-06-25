<?php

require_once __DIR__ . '/config.php';

function db_connect(bool $withDatabase = true): mysqli
{
    mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

    $database = $withDatabase ? env_value('DB_DATABASE', 'ms_acccess_web') : null;
    $connection = new mysqli(
        env_value('DB_HOST', 'localhost'),
        env_value('DB_USERNAME', 'root'),
        env_value('DB_PASSWORD', ''),
        $database,
        (int) env_value('DB_PORT', '3306')
    );

    $connection->set_charset('utf8mb4');

    return $connection;
}

function db_identifier(string $identifier): string
{
    return '`' . str_replace('`', '``', $identifier) . '`';
}

function json_response(array $payload, int $status = 200): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
}

