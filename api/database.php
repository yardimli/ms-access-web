<?php

require_once __DIR__ . '/../lib/db.php';

function fetch_table_columns(mysqli $db, string $tableName): array
{
    $stmt = $db->prepare(
        'SELECT column_name, data_type, column_type, column_key, ordinal_position
         FROM information_schema.columns
         WHERE table_schema = DATABASE()
           AND table_name = ?
         ORDER BY ordinal_position'
    );
    $stmt->bind_param('s', $tableName);
    $stmt->execute();

    $columns = [];
    $primaryKey = null;

    foreach ($stmt->get_result() as $row) {
        $accessType = access_type_from_mysql($row['data_type'], $row['column_type'], $row['column_key']);
        $columns[] = [
            'name' => $row['column_name'],
            'label' => label_from_column($row['column_name']),
            'type' => $accessType,
            'width' => width_for_column($row['column_name'], $accessType),
        ];

        if ($row['column_key'] === 'PRI') {
            $primaryKey = $row['column_name'];
        }
    }

    return [$columns, $primaryKey ?? ($columns[0]['name'] ?? '')];
}

function access_type_from_mysql(string $dataType, string $columnType, string $columnKey): string
{
    $dataType = strtolower($dataType);

    if ($columnKey === 'PRI' && str_contains(strtolower($columnType), 'int')) {
        return 'AutoNumber';
    }

    return match ($dataType) {
        'tinyint' => str_contains($columnType, 'tinyint(1)') ? 'Yes/No' : 'Number',
        'int', 'integer', 'smallint', 'mediumint', 'bigint', 'float', 'double' => 'Number',
        'decimal', 'numeric' => 'Currency',
        'date', 'datetime', 'timestamp', 'time' => 'Date/Time',
        'text', 'mediumtext', 'longtext' => 'Long Text',
        default => 'Short Text',
    };
}

function label_from_column(string $name): string
{
    $label = preg_replace('/(?<!^)([A-Z])/', ' $1', $name);
    $label = str_replace('_', ' ', $label);
    return trim($label);
}

function width_for_column(string $name, string $type): int
{
    $lower = strtolower($name);

    if (str_contains($lower, 'email')) return 210;
    if (str_contains($lower, 'company') || str_contains($lower, 'productname')) return 190;
    if (str_contains($lower, 'contact') || str_contains($lower, 'manager')) return 150;
    if ($type === 'Currency') return 120;
    if ($type === 'Date/Time') return 120;
    if ($type === 'AutoNumber' || $type === 'Number') return 95;

    return 110;
}

function fetch_table_rows(mysqli $db, string $tableName): array
{
    $result = $db->query('SELECT * FROM ' . db_identifier($tableName));
    $rows = [];

    foreach ($result as $row) {
        $rows[] = $row;
    }

    return $rows;
}

function fetch_objects(mysqli $db, string $type): array
{
    $stmt = $db->prepare(
        'SELECT object_name, definition_json
         FROM access_object_definitions
         WHERE object_type = ?
         ORDER BY object_name'
    );
    $stmt->bind_param('s', $type);
    $stmt->execute();

    $objects = [];
    foreach ($stmt->get_result() as $row) {
        $objects[$row['object_name']] = json_decode($row['definition_json'], true, 512, JSON_THROW_ON_ERROR);
    }

    return $objects;
}

try {
    $db = db_connect();
    $tableResult = $db->query('SHOW FULL TABLES WHERE Table_type = "BASE TABLE"');

    $tables = [];
    foreach ($tableResult as $tableRow) {
        $tableName = array_values($tableRow)[0];
        if ($tableName === 'access_object_definitions') {
            continue;
        }

        [$columns, $primaryKey] = fetch_table_columns($db, $tableName);
        $tables[$tableName] = [
            'structure' => [
                'primaryKey' => $primaryKey,
                'columns' => $columns,
            ],
            'data' => fetch_table_rows($db, $tableName),
        ];
    }

    json_response([
        'tables' => $tables,
        'forms' => fetch_objects($db, 'form'),
        'queries' => fetch_objects($db, 'query'),
        'reports' => fetch_objects($db, 'report'),
    ]);
} catch (Throwable $exception) {
    json_response([
        'ok' => false,
        'error' => $exception->getMessage(),
    ], 500);
}
