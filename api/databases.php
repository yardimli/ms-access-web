<?php

require_once __DIR__ . '/../lib/acaciadb_data.php';

function database_request(): array
{
    $raw = file_get_contents('php://input') ?: '';
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : $_POST;
}

function database_catalog(mysqli $server): array
{
    $systemSchemas = ['information_schema', 'mysql', 'performance_schema', 'sys'];
    $databases = [];
    $result = $server->query('SHOW DATABASES');
    foreach ($result as $row) {
        $name = (string) array_values($row)[0];
        if (in_array(strtolower($name), $systemSchemas, true)) {
            continue;
        }

        $stmt = $server->prepare(
            'SELECT COUNT(*) AS table_count,
                    COALESCE(SUM(data_length + index_length), 0) AS size_bytes,
                    MAX(update_time) AS updated_at
             FROM information_schema.tables
             WHERE table_schema = ?
               AND table_type = "BASE TABLE"
               AND table_name NOT IN ("acaciadb_object_definitions", "acaciadb_column_history")
               AND RIGHT(LOWER(table_name), 13) <> "_relationship"'
        );
        $stmt->bind_param('s', $name);
        $stmt->execute();
        $stats = $stmt->get_result()->fetch_assoc() ?: [];
        $databases[] = [
            'name' => $name,
            'tableCount' => (int) ($stats['table_count'] ?? 0),
            'sizeBytes' => (int) ($stats['size_bytes'] ?? 0),
            'updatedAt' => $stats['updated_at'] ?? null,
            'active' => strcasecmp($name, active_database_name()) === 0,
        ];
    }

    usort($databases, fn (array $left, array $right): int => strcasecmp($left['name'], $right['name']));
    return $databases;
}

function database_table_overview(mysqli $db, string $database): array
{
    ensure_acaciadb_storage($db);
    $tables = [];
    $stmt = $db->prepare(
        'SELECT t.table_name, t.table_rows, t.data_length + t.index_length AS size_bytes,
                t.update_time, COUNT(c.column_name) AS column_count
         FROM information_schema.tables t
         LEFT JOIN information_schema.columns c
           ON c.table_schema = t.table_schema AND c.table_name = t.table_name
         WHERE t.table_schema = ? AND t.table_type = "BASE TABLE"
         GROUP BY t.table_name, t.table_rows, t.data_length, t.index_length, t.update_time
         ORDER BY t.table_name'
    );
    $stmt->bind_param('s', $database);
    $stmt->execute();
    foreach ($stmt->get_result() as $row) {
        $name = (string) $row['table_name'];
        if (in_array($name, ['acaciadb_object_definitions', 'acaciadb_column_history'], true)
            || str_ends_with(strtolower($name), '_relationship')) {
            continue;
        }
        $tables[] = [
            'name' => $name,
            'view' => 'table-' . acaciadb_slug($name),
            'designView' => 'design-' . acaciadb_slug($name),
            'rows' => (int) ($row['table_rows'] ?? 0),
            'columns' => (int) ($row['column_count'] ?? 0),
            'sizeBytes' => (int) ($row['size_bytes'] ?? 0),
            'updatedAt' => $row['update_time'] ?? null,
        ];
    }
    return $tables;
}

try {
    $server = db_connect(false);
    $request = database_request();

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $action = (string) ($request['action'] ?? '');
        $database = validate_database_name((string) ($request['database'] ?? ''));

        if ($action === 'create') {
            if (database_exists($server, $database)) {
                throw new RuntimeException('A database with that name already exists.');
            }
            $server->query(
                'CREATE DATABASE ' . db_identifier($database) .
                ' CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci'
            );
        } elseif ($action !== 'open') {
            throw new RuntimeException('Unsupported database action.');
        }

        if (!database_exists($server, $database)) {
            throw new RuntimeException('The selected database is no longer available.');
        }

        $server->select_db($database);
        ensure_acaciadb_storage($server);
        set_active_database_name($database);

        json_response([
            'ok' => true,
            'database' => $database,
            'tables' => database_table_overview($server, $database),
        ]);
        exit;
    }

    $selected = trim((string) ($_GET['database'] ?? ''));
    $payload = [
        'ok' => true,
        'activeDatabase' => active_database_name(),
        'databases' => database_catalog($server),
    ];

    if ($selected !== '') {
        $selected = validate_database_name($selected);
        if (!database_exists($server, $selected)) {
            throw new RuntimeException('The selected database is no longer available.');
        }
        $server->select_db($selected);
        ensure_acaciadb_storage($server);
        $payload['selectedDatabase'] = $selected;
        $payload['tables'] = database_table_overview($server, $selected);
    }

    json_response($payload);
} catch (Throwable $exception) {
    json_response(['ok' => false, 'error' => $exception->getMessage()], 400);
}
