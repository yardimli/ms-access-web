<?php

require_once __DIR__ . '/../lib/access_data.php';

try {
    $db = db_connect();
    $tables = [];

    foreach (fetch_table_names($db) as $tableName) {
        $tables[$tableName] = [
            'name' => $tableName,
            'view' => 'table-' . access_slug($tableName),
            'designView' => 'design-' . access_slug($tableName),
        ];
    }

    $objects = fn (string $type, string $prefix) => array_reduce(
        fetch_object_names($db, $type),
        function (array $carry, string $name) use ($prefix) {
            $carry[$name] = [
                'name' => $name,
                'view' => $prefix . access_slug($name),
            ];
            return $carry;
        },
        []
    );

    json_response([
        'ok' => true,
        'overview' => true,
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

