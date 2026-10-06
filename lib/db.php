<?php

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/sqlite_connection.php';
require_once __DIR__ . '/workspaces.php';

function acaciadb_start_session(): void
{
    if (PHP_SAPI !== 'cli' && session_status() === PHP_SESSION_NONE) {
        session_start();
    }
}

function validate_database_name(string $database): string
{
    $database = trim($database);
    if (!preg_match('/^[A-Za-z_][A-Za-z0-9_$-]{0,63}$/', $database)) {
        throw new RuntimeException('Database names must start with a letter or underscore and contain only letters, numbers, underscores, dollar signs, or hyphens.');
    }
    return $database;
}

function configured_database_name(): string
{
    return validate_database_name((string) env_value('DB_DATABASE', 'acaciadb'));
}

function active_database_name(): string
{
    if (isset($_SERVER['HTTP_X_ACACIA_USER'])) {
        $reference = (string) ($_SERVER['HTTP_X_ACACIA_DATABASE'] ?? 'sqlite:demo');
        if (str_starts_with($reference, 'sqlite:')) { workspace_file_id($reference); return $reference; }
        if (str_starts_with($reference, 'mysql:')) return 'mysql:' . validate_database_name(substr($reference, 6));
        throw new RuntimeException('Invalid database selection.');
    }
    acaciadb_start_session();
    $selected = PHP_SAPI !== 'cli' ? (string) ($_SESSION['acaciadb_database'] ?? '') : '';
    return $selected !== '' ? validate_database_name($selected) : configured_database_name();
}

function set_active_database_name(string $database): void
{
    acaciadb_start_session();
    if (PHP_SAPI !== 'cli') {
        $_SESSION['acaciadb_database'] = validate_database_name($database);
    }
}

function db_connect(bool $withDatabase = true, ?string $database = null): mysqli|SQLiteConnection
{
    $reference = $database ?: active_database_name();
    if ($withDatabase && str_starts_with($reference, 'sqlite:')) {
        if ($reference === 'sqlite:demo') ensure_browser_demo();
        $connection = new SQLiteConnection(workspace_database_path($reference), $reference);
        if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
            $connection->beginWrite();
            $GLOBALS['sqliteWriteConnection'] = $connection;
        }
        return $connection;
    }
    mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
    $settings = mysql_browser_settings();
    $selectedDatabase = $withDatabase ? validate_database_name(str_starts_with($reference, 'mysql:') ? substr($reference, 6) : $reference) : null;
    $connection = mysqli_init();
    $connection->options(MYSQLI_OPT_CONNECT_TIMEOUT, 5);
    $connection->real_connect($settings['host'], $settings['username'], $settings['password'] ?? '', $selectedDatabase, (int) $settings['port']);

    $connection->set_charset('utf8mb4');

    return $connection;
}

function database_exists(mysqli $db, string $database): bool
{
    $database = validate_database_name($database);
    $stmt = $db->prepare('SELECT 1 FROM information_schema.schemata WHERE schema_name = ? LIMIT 1');
    $stmt->bind_param('s', $database);
    $stmt->execute();
    return (bool) $stmt->get_result()->fetch_assoc();
}

function db_identifier(string $identifier): string
{
    return '`' . str_replace('`', '``', $identifier) . '`';
}

function json_response(array $payload, int $status = 200): void
{
    if (isset($GLOBALS['sqliteWriteConnection'])) {
        $connection = $GLOBALS['sqliteWriteConnection'];
        unset($GLOBALS['sqliteWriteConnection']);
        try { $connection->finishWrite(!empty($payload['ok']) && $status < 400); }
        catch (Throwable $error) { $payload = ['ok' => false, 'error' => $error->getMessage()]; $status = 400; }
    }
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
}
