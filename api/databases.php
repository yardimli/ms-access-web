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

function file_table_overview(SQLiteConnection $db): array
{
    return array_map(function ($name) use ($db) {
        [$columns] = fetch_table_columns($db, $name);
        return ['name' => $name, 'columns' => count($columns), 'rows' => fetch_table_row_count($db, $name), 'sizeBytes' => 0];
    }, fetch_table_names($db));
}

try {
    browser_workspace_key();
    $request = database_request();
    $method = $_SERVER['REQUEST_METHOD'];
    $reference = (string) ($request['database'] ?? $_GET['database'] ?? '');
    $source = (string) ($_GET['source'] ?? 'files');
    if ($method === 'POST') {
        $action = (string) ($request['action'] ?? '');
        if ($action === 'create' && ($request['engine'] ?? 'sqlite') === 'sqlite') {
            $name = trim((string) ($request['name'] ?? $reference));
            if ($name === '' || strlen($name) > 120) throw new RuntimeException('Enter a database name of up to 120 characters.');
            $temporary = browser_workspace_dir() . '/' . bin2hex(random_bytes(16)) . '.creating';
            $created = new SQLiteConnection($temporary);
            ensure_acaciadb_storage($created);
            $created = null;
            $file = register_workspace_database($temporary, $name);
            json_response(['ok' => true, 'database' => $file['id'], 'item' => $file, 'tables' => []]);
            exit;
        }
        if ($action === 'open' && str_starts_with($reference, 'sqlite:')) {
            if ($reference === 'sqlite:demo') ensure_browser_demo();
            $db = new SQLiteConnection(workspace_database_path($reference), $reference);
            json_response(['ok' => true, 'database' => $reference, 'item' => workspace_database_info(workspace_file_id($reference)), 'tables' => file_table_overview($db)]);
            exit;
        }
        $name = validate_database_name(str_starts_with($reference, 'mysql:') ? substr($reference, 6) : $reference);
        $server = db_connect(false);
        if ($action === 'create') {
            if (database_exists($server, $name)) throw new RuntimeException('A database with that name already exists.');
            $server->query('CREATE DATABASE ' . db_identifier($name) . ' CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
        } elseif ($action !== 'open') throw new RuntimeException('Unsupported database action.');
        if (!database_exists($server, $name)) throw new RuntimeException('The selected database is no longer available.');
        $server->select_db($name);
        ensure_acaciadb_storage($server);
        json_response(['ok' => true, 'database' => 'mysql:' . $name, 'item' => ['id' => 'mysql:' . $name, 'name' => $name, 'engine' => 'mysql'], 'tables' => database_table_overview($server, $name)]);
        exit;
    }
    $payload = ['ok' => true, 'activeDatabase' => active_database_name(), 'databases' => []];
    if ($reference !== '') {
        if (str_starts_with($reference, 'sqlite:')) {
            if ($reference === 'sqlite:demo') ensure_browser_demo();
            $db = new SQLiteConnection(workspace_database_path($reference), $reference);
            $payload['item'] = workspace_database_info(workspace_file_id($reference));
            $payload['tables'] = file_table_overview($db);
        } else {
            $name = validate_database_name(str_starts_with($reference, 'mysql:') ? substr($reference, 6) : $reference);
            $server = db_connect(true, 'mysql:' . $name);
            $payload['tables'] = database_table_overview($server, $name);
            $payload['item'] = ['id' => 'mysql:' . $name, 'name' => $name, 'engine' => 'mysql'];
        }
    } elseif ($source === 'mysql') {
        $server = db_connect(false);
        $payload['databases'] = array_map(fn ($item) => array_merge($item, ['id' => 'mysql:' . $item['name'], 'engine' => 'mysql']), database_catalog($server));
    } else $payload['databases'] = workspace_catalog();
    json_response($payload);
} catch (Throwable $exception) {
    json_response(['ok' => false, 'error' => $exception->getMessage()], 400);
}
