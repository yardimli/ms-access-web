<?php

require_once __DIR__ . '/../lib/access_data.php';

function record_request(): array
{
    $raw = file_get_contents('php://input') ?: '';
    $data = json_decode($raw, true);
    return is_array($data) ? $data : $_POST;
}

function normalize_record_value(mixed $value, array $column): mixed
{
    $type = $column['type'] ?? 'Short Text';
    $text = trim((string) ($value ?? ''));

    if ($text === '' || $text === '(New)') {
        if (!empty($column['required']) && $type !== 'AutoNumber') {
            throw new RuntimeException(($column['label'] ?? $column['name']) . ' is required.');
        }

        return null;
    }

    if ($type === 'Yes/No') {
        return in_array(strtolower($text), ['1', 'true', 'yes', 'on'], true) ? '1' : '0';
    }

    if (in_array($type, ['AutoNumber', 'Number', 'Large Number', 'Currency'], true)) {
        $cleaned = str_replace(['$', ','], '', $text);
        if (!is_numeric($cleaned)) {
            throw new RuntimeException(($column['label'] ?? $column['name']) . ' must contain a valid number.');
        }

        return $type === 'Currency' ? number_format((float) $cleaned, 2, '.', '') : (string) ((int) $cleaned);
    }

    if (in_array($type, ['Date/Time', 'Date & Time'], true)) {
        $timestamp = strtotime($text);
        if ($timestamp === false) {
            throw new RuntimeException(($column['label'] ?? $column['name']) . ' must contain a valid date.');
        }

        return date('Y-m-d H:i:s', $timestamp);
    }

    return $text;
}

function sql_literal(mysqli $db, mixed $value): string
{
    if ($value === null) {
        return 'NULL';
    }

    return "'" . $db->real_escape_string((string) $value) . "'";
}

function ensure_autonumber_primary_key(mysqli $db, string $tableName, string $primaryKey, array $columns): void
{
    $primaryColumn = null;
    foreach ($columns as $column) {
        if ($column['name'] === $primaryKey) {
            $primaryColumn = $column;
            break;
        }
    }

    if (($primaryColumn['type'] ?? '') !== 'AutoNumber') {
        return;
    }

    $stmt = $db->prepare(
        'SELECT extra
         FROM information_schema.columns
         WHERE table_schema = DATABASE()
           AND table_name = ?
           AND column_name = ?
         LIMIT 1'
    );
    $stmt->bind_param('ss', $tableName, $primaryKey);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();

    if (str_contains(strtolower((string) ($row['extra'] ?? '')), 'auto_increment')) {
        return;
    }

    $db->query(
        'ALTER TABLE ' . db_identifier($tableName) .
        ' MODIFY COLUMN ' . db_identifier($primaryKey) . ' INT NOT NULL AUTO_INCREMENT'
    );
}

function refresh_table_response(mysqli $db, string $tableName, ?array $row = null): void
{
    json_response([
        'ok' => true,
        'table' => $tableName,
        'row' => $row,
        'payload' => fetch_table_payload($db, $tableName, true),
    ]);
}

try {
    $db = db_connect();
    $request = record_request();
    $action = (string) ($request['action'] ?? '');
    $resolvedTable = resolve_table_name($db, (string) ($request['table'] ?? ''));

    if (!$resolvedTable) {
        throw new RuntimeException('Table was not found.');
    }

    [$columns, $primaryKey] = fetch_table_columns($db, $resolvedTable);
    ensure_autonumber_primary_key($db, $resolvedTable, $primaryKey, $columns);
    $row = is_array($request['row'] ?? null) ? $request['row'] : [];

    if ($action === 'update') {
        if ($primaryKey === '') {
            throw new RuntimeException('This table does not have a primary key for updates.');
        }

        $primaryKeyValue = $request['primaryKeyValue'] ?? null;
        if ($primaryKeyValue === null || $primaryKeyValue === '') {
            throw new RuntimeException('Original primary key value was not supplied.');
        }

        $assignments = [];
        foreach ($columns as $column) {
            $name = $column['name'];
            if ($name === $primaryKey && $column['type'] === 'AutoNumber') {
                continue;
            }

            $value = normalize_record_value($row[$name] ?? null, $column);
            $assignments[] = db_identifier($name) . ' = ' . sql_literal($db, $value);
        }

        if (!$assignments) {
            throw new RuntimeException('There are no editable fields in this row.');
        }

        $db->query(
            'UPDATE ' . db_identifier($resolvedTable) .
            ' SET ' . implode(', ', $assignments) .
            ' WHERE ' . db_identifier($primaryKey) . ' = ' . sql_literal($db, $primaryKeyValue) .
            ' LIMIT 1'
        );

        $updatedRow = fetch_table_row_by_primary_key($db, $resolvedTable, $primaryKey, $primaryKeyValue);
        refresh_table_response($db, $resolvedTable, $updatedRow);
        exit;
    }

    if ($action !== 'insert') {
        throw new RuntimeException('Unsupported record action.');
    }
    $columnSql = [];
    $valueSql = [];

    foreach ($columns as $column) {
        $name = $column['name'];
        $value = normalize_record_value($row[$name] ?? null, $column);

        if ($name === $primaryKey && $column['type'] === 'AutoNumber' && $value === null) {
            continue;
        }

        $columnSql[] = db_identifier($name);
        $valueSql[] = sql_literal($db, $value);
    }

    if (!$columnSql) {
        $db->query('INSERT INTO ' . db_identifier($resolvedTable) . ' () VALUES ()');
    } else {
        $db->query(
            'INSERT INTO ' . db_identifier($resolvedTable) .
            ' (' . implode(', ', $columnSql) . ') VALUES (' . implode(', ', $valueSql) . ')'
        );
    }

    $insertId = $db->insert_id;
    $insertedRow = $insertId && $primaryKey
        ? fetch_table_row_by_primary_key($db, $resolvedTable, $primaryKey, $insertId)
        : null;

    refresh_table_response($db, $resolvedTable, $insertedRow);
} catch (Throwable $exception) {
    json_response(['ok' => false, 'error' => $exception->getMessage()], 400);
}
