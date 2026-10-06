<?php

require_once __DIR__ . '/../lib/acaciadb_data.php';

try {
    $db = db_connect();
    $tables = [];

    foreach (fetch_table_names($db) as $tableName) {
        $tables[$tableName] = [
            'name' => $tableName,
            'view' => 'table-' . acaciadb_slug($tableName),
            'designView' => 'design-' . acaciadb_slug($tableName),
        ];
    }

    $objects = fn (string $type, string $prefix) => array_reduce(
        fetch_object_names($db, $type),
        function (array $carry, string $name) use ($prefix) {
            $carry[$name] = [
                'name' => $name,
                'view' => $prefix . acaciadb_slug($name),
            ];
            return $carry;
        },
        []
    );

    json_response([
        'ok' => true,
        'overview' => true,
        'database' => active_database_name(),
        'displayName' => str_starts_with(active_database_name(), 'sqlite:') ? workspace_database_info(workspace_file_id(active_database_name()))['name'] : preg_replace('/^mysql:/', '', active_database_name()),
        'tables' => $tables,
        'forms' => $objects('form', 'form-'),
        'queries' => $objects('query', 'query-'),
        'reports' => $objects('report', 'report-'),
    ]);
} catch (Throwable $exception) {
    json_response([
        'ok' => false,
        'error' => $exception->getMessage(),
    ], 500);
}
