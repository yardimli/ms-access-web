<?php

require_once __DIR__ . '/../lib/acaciadb_data.php';

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

function sql_literal(mysqli|SQLiteConnection $db, mixed $value): string
{
    if ($value === null) {
        return 'NULL';
    }

    return "'" . $db->real_escape_string((string) $value) . "'";
}

function ensure_autonumber_primary_key(mysqli|SQLiteConnection $db, string $tableName, string $primaryKey, array $columns): void
{
    if ($db instanceof SQLiteConnection) return;
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

function refresh_table_response(mysqli|SQLiteConnection $db, string $tableName, ?array $row = null, int $skip = 0, int $limit = 500): void
{
    json_response([
        'ok' => true,
        'table' => $tableName,
        'row' => $row,
        'payload' => fetch_table_payload($db, $tableName, true, $skip, $limit),
    ]);
}

function record_history_entry(mysqli|SQLiteConnection $db, string $tableName, string $columnName, mixed $primaryKeyValue, mixed $value): void
{
    ensure_column_history_storage($db);
    $stmt = $db->prepare(
        'INSERT INTO acaciadb_column_history (table_name, column_name, primary_key_value, value_text)
         VALUES (?, ?, ?, ?)'
    );
    $primaryKeyText = (string) $primaryKeyValue;
    $valueText = $value === null ? '' : (string) $value;
    $stmt->bind_param('ssss', $tableName, $columnName, $primaryKeyText, $valueText);
    $stmt->execute();
}

function fetch_record_history(mysqli|SQLiteConnection $db, string $tableName, string $columnName, mixed $primaryKeyValue): array
{
    ensure_column_history_storage($db);
    $stmt = $db->prepare(
        'SELECT value_text, changed_at
         FROM acaciadb_column_history
         WHERE table_name = ?
           AND column_name = ?
           AND primary_key_value = ?
         ORDER BY changed_at, id'
    );
    $primaryKeyText = (string) $primaryKeyValue;
    $stmt->bind_param('sss', $tableName, $columnName, $primaryKeyText);
    $stmt->execute();

    $history = [];
    foreach ($stmt->get_result() as $row) {
        $history[] = [
            'value' => (string) ($row['value_text'] ?? ''),
            'changedAt' => (string) ($row['changed_at'] ?? ''),
        ];
    }

    return $history;
}

function lookup_relationship_columns(array $columns): array
{
    return array_values(array_filter($columns, function (array $column): bool {
        $lookup = $column['lookup'] ?? null;
        return is_array($lookup)
            && ($lookup['kind'] ?? 'static') === 'table'
            && ($lookup['mode'] ?? 'single') === 'multiple'
            && !empty($lookup['relationshipTable'])
            && !empty($lookup['localKeyColumn'])
            && !empty($lookup['remoteKeyColumn']);
    }));
}

function multiple_lookup_keys(mixed $value): array
{
    if (is_array($value)) {
        $items = $value;
    } else {
        $decoded = json_decode((string) ($value ?? ''), true);
        $items = is_array($decoded) ? $decoded : explode(',', (string) ($value ?? ''));
    }

    return array_values(array_unique(array_filter(array_map(
        fn ($item): string => trim(is_array($item) ? (string) ($item['key'] ?? '') : (string) $item),
        $items
    ), fn (string $value): bool => $value !== '')));
}

function multiple_lookup_json(mixed $value, array $lookup): string
{
    $labels = [];
    foreach ((array) ($lookup['source'] ?? []) as $option) {
        $labels[lookup_option_value($option)] = lookup_option_label($option);
    }

    return json_encode(array_map(
        fn (string $key): array => ['key' => $key, 'value' => $labels[$key] ?? $key],
        multiple_lookup_keys($value)
    ), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
}

function sync_lookup_relationships(mysqli|SQLiteConnection $db, array $columns, string $primaryKeyValue, array $row): void
{
    foreach (lookup_relationship_columns($columns) as $column) {
        $lookup = $column['lookup'];
        $relationshipTable = (string) $lookup['relationshipTable'];
        if (!physical_table_exists($db, $relationshipTable)) {
            continue;
        }

        $localColumn = (string) $lookup['localKeyColumn'];
        $remoteColumn = (string) $lookup['remoteKeyColumn'];
        $values = multiple_lookup_keys($row[$column['name']] ?? '');

        $db->query(
            'DELETE FROM ' . db_identifier($relationshipTable) .
            ' WHERE ' . db_identifier($localColumn) . ' = ' . sql_literal($db, $primaryKeyValue)
        );

        foreach ($values as $value) {
            $db->query(
                'INSERT INTO ' . db_identifier($relationshipTable) .
                ' (' . db_identifier($localColumn) . ', ' . db_identifier($remoteColumn) . ') VALUES (' .
                sql_literal($db, $primaryKeyValue) . ', ' . sql_literal($db, $value) . ')'
            );
        }
    }
}

try {
    $db = db_connect();
    $request = record_request();
    $action = (string) ($request['action'] ?? '');
    [$pageSkip, $pageLimit] = normalize_table_page(
        (int) ($request['skip'] ?? 0),
        (int) ($request['limit'] ?? 500)
    );
    $resolvedTable = resolve_table_name($db, (string) ($request['table'] ?? ''));

    if (!$resolvedTable) {
        throw new RuntimeException('Table was not found.');
    }

    [$columns, $primaryKey] = fetch_table_columns($db, $resolvedTable);
    if ($db instanceof SQLiteConnection && in_array($action, ['update', 'delete'], true)
        && count(array_filter($columns, fn ($column) => !empty($column['primaryKey']))) !== 1) {
        throw new RuntimeException('Editing or deleting existing records requires a single-column primary key. Add one in Design View first.');
    }
    $columns = hydrate_lookup_metadata($db, $resolvedTable, $columns, $primaryKey);
    ensure_autonumber_primary_key($db, $resolvedTable, $primaryKey, $columns);
    $row = is_array($request['row'] ?? null) ? $request['row'] : [];

    if ($action === 'history') {
        if ($primaryKey === '') {
            throw new RuntimeException('This table does not have a primary key for history lookup.');
        }

        $columnName = (string) ($request['column'] ?? '');
        $primaryKeyValue = $request['primaryKeyValue'] ?? null;
        if ($columnName === '' || $primaryKeyValue === null || $primaryKeyValue === '') {
            throw new RuntimeException('Column name and primary key value are required.');
        }

        $columnExists = false;
        foreach ($columns as $column) {
            if (strcasecmp($column['name'], $columnName) === 0) {
                $columnExists = true;
                break;
            }
        }
        if (!$columnExists) {
            throw new RuntimeException('Field was not found.');
        }

        json_response([
            'ok' => true,
            'table' => $resolvedTable,
            'column' => $columnName,
            'primaryKeyValue' => (string) $primaryKeyValue,
            'history' => fetch_record_history($db, $resolvedTable, $columnName, $primaryKeyValue),
        ]);
        exit;
    }

    if ($action === 'update') {
        if ($primaryKey === '') {
            throw new RuntimeException('This table does not have a primary key for updates.');
        }

        $primaryKeyValue = $request['primaryKeyValue'] ?? null;
        if ($primaryKeyValue === null || $primaryKeyValue === '') {
            throw new RuntimeException('Original primary key value was not supplied.');
        }

        $previousRow = fetch_table_row_by_primary_key($db, $resolvedTable, $primaryKey, $primaryKeyValue) ?: [];
        $assignments = [];
        $normalizedValues = [];
        foreach ($columns as $column) {
            $name = $column['name'];
            if ($name === $primaryKey && $column['type'] === 'AutoNumber') {
                continue;
            }

            $lookup = $column['lookup'] ?? null;
            if (is_array($lookup) && ($lookup['kind'] ?? 'static') === 'table' && ($lookup['mode'] ?? 'single') === 'multiple') {
                $normalizedValues[$name] = implode(',', multiple_lookup_keys($row[$name] ?? ''));
                if (($lookup['storageMode'] ?? (!empty($lookup['relationshipTable']) ? 'relationship' : 'json')) === 'relationship') {
                    if (empty($column['virtual'])) {
                        $assignments[] = db_identifier($name) . ' = NULL';
                    }
                } else {
                    $assignments[] = db_identifier($name) . ' = ' . sql_literal($db, multiple_lookup_json($row[$name] ?? '', $lookup));
                }
                continue;
            }

            $value = normalize_record_value($row[$name] ?? null, $column);
            $normalizedValues[$name] = $value;
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
        sync_lookup_relationships($db, $columns, (string) $primaryKeyValue, $normalizedValues);

        foreach ($columns as $column) {
            $name = $column['name'];
            if (empty($column['appendOnly']) || !array_key_exists($name, $normalizedValues)) {
                continue;
            }
            $previousValue = $previousRow[$name] ?? null;
            $nextValue = $normalizedValues[$name];
            if ((string) ($previousValue ?? '') !== (string) ($nextValue ?? '')) {
                record_history_entry($db, $resolvedTable, $name, $primaryKeyValue, $nextValue);
            }
        }

        $updatedRow = fetch_table_row_by_primary_key($db, $resolvedTable, $primaryKey, $primaryKeyValue);
        refresh_table_response($db, $resolvedTable, $updatedRow, $pageSkip, $pageLimit);
        exit;
    }

    if ($action === 'delete') {
        if ($primaryKey === '') {
            throw new RuntimeException('This table does not have a primary key for deletes.');
        }

        $primaryKeyValue = $request['primaryKeyValue'] ?? null;
        if ($primaryKeyValue === null || $primaryKeyValue === '') {
            throw new RuntimeException('Primary key value was not supplied.');
        }

        $db->query(
            'DELETE FROM ' . db_identifier($resolvedTable) .
            ' WHERE ' . db_identifier($primaryKey) . ' = ' . sql_literal($db, $primaryKeyValue) .
            ' LIMIT 1'
        );

        refresh_table_response($db, $resolvedTable, null, $pageSkip, $pageLimit);
        exit;
    }

    if ($action !== 'insert') {
        throw new RuntimeException('Unsupported record action.');
    }
    $columnSql = [];
    $valueSql = [];
    $normalizedInsertValues = [];

    foreach ($columns as $column) {
        $name = $column['name'];
        $lookup = $column['lookup'] ?? null;
        if (is_array($lookup) && ($lookup['kind'] ?? 'static') === 'table' && ($lookup['mode'] ?? 'single') === 'multiple') {
            $normalizedInsertValues[$name] = implode(',', multiple_lookup_keys($row[$name] ?? ''));
            if (($lookup['storageMode'] ?? (!empty($lookup['relationshipTable']) ? 'relationship' : 'json')) === 'relationship') {
                if (empty($column['virtual'])) {
                    $columnSql[] = db_identifier($name);
                    $valueSql[] = 'NULL';
                }
            } else {
                $columnSql[] = db_identifier($name);
                $valueSql[] = sql_literal($db, multiple_lookup_json($row[$name] ?? '', $lookup));
            }
            continue;
        }
        $value = normalize_record_value($row[$name] ?? null, $column);
        $normalizedInsertValues[$name] = $value;

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
    $insertedPrimaryValue = $insertId ?: ($normalizedInsertValues[$primaryKey] ?? null);
    if ($insertedPrimaryValue !== null && $insertedPrimaryValue !== '' && $primaryKey) {
        sync_lookup_relationships($db, $columns, (string) $insertedPrimaryValue, $normalizedInsertValues);
    }
    $insertedRow = $insertedPrimaryValue !== null && $primaryKey
        ? fetch_table_row_by_primary_key($db, $resolvedTable, $primaryKey, $insertedPrimaryValue)
        : null;

    $totalRows = fetch_table_row_count($db, $resolvedTable);
    $insertPageSkip = $totalRows > $pageSkip + $pageLimit
        ? (int) (floor(max(0, $totalRows - 1) / $pageLimit) * $pageLimit)
        : $pageSkip;
    refresh_table_response($db, $resolvedTable, $insertedRow, $insertPageSkip, $pageLimit);
} catch (Throwable $exception) {
    json_response(['ok' => false, 'error' => $exception->getMessage()], 400);
}
