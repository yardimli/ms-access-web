<?php

require_once __DIR__ . '/../lib/access_data.php';

function schema_request(): array
{
    $raw = file_get_contents('php://input') ?: '';
    $data = json_decode($raw, true);
    return is_array($data) ? $data : $_POST;
}

function validate_field_name(string $name): string
{
    $name = trim($name);

    if (!preg_match('/^[A-Za-z_][A-Za-z0-9_]{0,63}$/', $name)) {
        throw new RuntimeException('Field names must start with a letter or underscore and contain only letters, numbers, and underscores.');
    }

    return $name;
}

function mysql_type_for_access_type(string $type): string
{
    return match ($type) {
        'Number' => 'INT NULL',
        'Large Number' => 'BIGINT NULL',
        'Currency' => 'DECIMAL(12,2) NULL DEFAULT 0',
        'Date/Time', 'Date & Time' => 'DATETIME NULL',
        'Yes/No' => 'TINYINT(1) NULL DEFAULT 0',
        'Long Text', 'Rich Text' => 'TEXT NULL',
        'Attachment', 'Hyperlink', 'Lookup & Relationship', 'Calculated Field' => 'VARCHAR(255) NULL',
        default => 'VARCHAR(255) NULL',
    };
}

function fetch_column_definition(mysqli $db, string $tableName, string $columnName): ?array
{
    $stmt = $db->prepare(
        'SELECT column_type, is_nullable, column_default, extra
         FROM information_schema.columns
         WHERE table_schema = DATABASE()
           AND table_name = ?
           AND column_name = ?
         LIMIT 1'
    );
    $stmt->bind_param('ss', $tableName, $columnName);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();

    return $row ?: null;
}

function column_exists(mysqli $db, string $tableName, string $columnName): bool
{
    return fetch_column_definition($db, $tableName, $columnName) !== null;
}

function column_definition_sql(array $column): string
{
    $sql = $column['column_type'];
    $sql .= strtoupper($column['is_nullable']) === 'NO' ? ' NOT NULL' : ' NULL';

    if ($column['column_default'] !== null) {
        $default = $column['column_default'];
        $upper = strtoupper((string) $default);
        if (in_array($upper, ['CURRENT_TIMESTAMP', 'CURRENT_TIMESTAMP()'], true)) {
            $sql .= ' DEFAULT CURRENT_TIMESTAMP';
        } else {
            $sql .= " DEFAULT '" . addslashes((string) $default) . "'";
        }
    }

    if ($column['extra']) {
        $sql .= ' ' . $column['extra'];
    }

    return $sql;
}

try {
    $db = db_connect();
    $request = schema_request();
    $action = $request['action'] ?? '';
    $resolvedTable = resolve_table_name($db, (string) ($request['table'] ?? ''));

    if (!$resolvedTable) {
        throw new RuntimeException('Table was not found.');
    }

    if ($action === 'addColumn') {
        $fieldName = validate_field_name((string) ($request['name'] ?? ''));
        $type = (string) ($request['type'] ?? 'Short Text');

        if (column_exists($db, $resolvedTable, $fieldName)) {
            throw new RuntimeException('A field with that name already exists.');
        }

        $db->query(
            'ALTER TABLE ' . db_identifier($resolvedTable) .
            ' ADD COLUMN ' . db_identifier($fieldName) . ' ' . mysql_type_for_access_type($type)
        );

        json_response([
            'ok' => true,
            'table' => $resolvedTable,
            'payload' => fetch_table_payload($db, $resolvedTable, true),
        ]);
        exit;
    }

    if ($action === 'renameColumn') {
        $oldName = validate_field_name((string) ($request['oldName'] ?? ''));
        $newName = validate_field_name((string) ($request['newName'] ?? ''));

        if (!column_exists($db, $resolvedTable, $oldName)) {
            throw new RuntimeException('Original field was not found.');
        }

        if (strcasecmp($oldName, $newName) !== 0 && column_exists($db, $resolvedTable, $newName)) {
            throw new RuntimeException('A field with that name already exists.');
        }

        $definition = fetch_column_definition($db, $resolvedTable, $oldName);
        $db->query(
            'ALTER TABLE ' . db_identifier($resolvedTable) .
            ' CHANGE COLUMN ' . db_identifier($oldName) . ' ' . db_identifier($newName) . ' ' .
            column_definition_sql($definition)
        );

        json_response([
            'ok' => true,
            'table' => $resolvedTable,
            'payload' => fetch_table_payload($db, $resolvedTable, true),
        ]);
        exit;
    }

    throw new RuntimeException('Unsupported schema action.');
} catch (Throwable $exception) {
    json_response(['ok' => false, 'error' => $exception->getMessage()], 400);
}
