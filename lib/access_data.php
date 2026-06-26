<?php

require_once __DIR__ . '/db.php';

function access_slug(string $name): string
{
    $name = preg_replace('/(?<!^)[A-Z]/', '-$0', $name);
    $name = preg_replace('/[^A-Za-z0-9]+/', '-', $name);
    return strtolower(trim($name, '-'));
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

function fetch_table_names(mysqli $db): array
{
    $result = $db->query('SHOW FULL TABLES WHERE Table_type = "BASE TABLE"');
    $tables = [];

    foreach ($result as $row) {
        $table = array_values($row)[0];
        if ($table !== 'access_object_definitions') {
            $tables[] = $table;
        }
    }

    return $tables;
}

function fetch_table_columns(mysqli $db, string $tableName): array
{
    $stmt = $db->prepare(
        'SELECT column_name, data_type, column_type, column_key
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

function fetch_table_rows(mysqli $db, string $tableName, int $limit = 500): array
{
    $result = $db->query('SELECT * FROM ' . db_identifier($tableName) . ' LIMIT ' . max(1, $limit));
    $rows = [];

    foreach ($result as $row) {
        $rows[] = $row;
    }

    return $rows;
}

function fetch_table_payload(mysqli $db, string $tableName, bool $includeRows = true): array
{
    [$columns, $primaryKey] = fetch_table_columns($db, $tableName);
    $payload = [
        'structure' => [
            'primaryKey' => $primaryKey,
            'columns' => $columns,
        ],
    ];

    if ($includeRows) {
        $payload['data'] = fetch_table_rows($db, $tableName);
    }

    return $payload;
}

function fetch_object_names(mysqli $db, string $type): array
{
    $stmt = $db->prepare('SELECT object_name FROM access_object_definitions WHERE object_type = ? ORDER BY object_name');
    $stmt->bind_param('s', $type);
    $stmt->execute();

    $names = [];
    foreach ($stmt->get_result() as $row) {
        $names[] = $row['object_name'];
    }

    return $names;
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

function fetch_object(mysqli $db, string $type, string $name): ?array
{
    $stmt = $db->prepare(
        'SELECT definition_json
         FROM access_object_definitions
         WHERE object_type = ?
           AND LOWER(object_name) = LOWER(?)
         LIMIT 1'
    );
    $stmt->bind_param('ss', $type, $name);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();

    return $row ? json_decode($row['definition_json'], true, 512, JSON_THROW_ON_ERROR) : null;
}

function resolve_table_name(mysqli $db, string $requested): ?string
{
    $lower = strtolower($requested);
    foreach (fetch_table_names($db) as $table) {
        if (strtolower($table) === $lower) {
            return $table;
        }
    }

    return null;
}

