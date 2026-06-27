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

function allowed_mysql_column_types(): array
{
    return [
        'TINYINT(1)',
        'INT',
        'BIGINT',
        'DECIMAL(12,2)',
        'VARCHAR(255)',
        'TEXT',
        'DATE',
        'TIME',
        'DATETIME',
        'TIMESTAMP',
    ];
}

function validate_mysql_column_type(string $type): string
{
    $type = strtoupper(trim(preg_replace('/\s+/', ' ', $type)));
    if (!in_array($type, allowed_mysql_column_types(), true)) {
        throw new RuntimeException('Unsupported MySQL data type.');
    }

    return $type;
}

function fetch_column_definition(mysqli $db, string $tableName, string $columnName): ?array
{
    $stmt = $db->prepare(
        'SELECT column_type, is_nullable, column_default, extra, column_comment
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

function column_definition_sql(array $column, ?string $comment = null): string
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

    $columnComment = $comment ?? (string) ($column['column_comment'] ?? '');
    if ($columnComment !== '') {
        $sql .= " COMMENT '" . addslashes($columnComment) . "'";
    }

    return $sql;
}

function update_column_metadata(mysqli $db, string $tableName, string $columnName, string $friendlyName): void
{
    $metadata = fetch_table_metadata($db, $tableName);
    $metadata['columns'] ??= [];
    $metadata['columns'][$columnName] ??= [];
    $metadata['columns'][$columnName]['friendlyName'] = trim($friendlyName);
    save_table_metadata($db, $tableName, $metadata);
}

function fetch_column_key(mysqli $db, string $tableName, string $columnName): string
{
    $stmt = $db->prepare(
        'SELECT column_key
         FROM information_schema.columns
         WHERE table_schema = DATABASE()
           AND table_name = ?
           AND column_name = ?
         LIMIT 1'
    );
    $stmt->bind_param('ss', $tableName, $columnName);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();

    return (string) ($row['column_key'] ?? '');
}

function schema_index_name(string $columnName, bool $unique): string
{
    $prefix = $unique ? 'ux_access_' : 'ix_access_';
    return substr($prefix . preg_replace('/[^A-Za-z0-9_]+/', '_', $columnName), 0, 60);
}

function index_exists(mysqli $db, string $tableName, string $indexName): bool
{
    $stmt = $db->prepare(
        'SELECT 1
         FROM information_schema.statistics
         WHERE table_schema = DATABASE()
           AND table_name = ?
           AND index_name = ?
         LIMIT 1'
    );
    $stmt->bind_param('ss', $tableName, $indexName);
    $stmt->execute();

    return (bool) $stmt->get_result()->fetch_assoc();
}

function column_has_blank_values(mysqli $db, string $tableName, string $columnName, bool $checkEmptyString): bool
{
    $where = db_identifier($columnName) . ' IS NULL';
    if ($checkEmptyString) {
        $where .= ' OR ' . db_identifier($columnName) . " = ''";
    }
    $sql = 'SELECT 1 FROM ' . db_identifier($tableName) . ' WHERE ' . $where . ' LIMIT 1';
    return (bool) $db->query($sql)->fetch_assoc();
}

function column_allows_empty_string_check(array $column): bool
{
    $type = strtolower((string) ($column['column_type'] ?? ''));
    return str_contains($type, 'char') || str_contains($type, 'text');
}

function column_has_duplicates(mysqli $db, string $tableName, string $columnName): bool
{
    $sql = 'SELECT ' . db_identifier($columnName) .
        ' FROM ' . db_identifier($tableName) .
        ' WHERE ' . db_identifier($columnName) . ' IS NOT NULL' .
        ' GROUP BY ' . db_identifier($columnName) .
        ' HAVING COUNT(*) > 1 LIMIT 1';
    return (bool) $db->query($sql)->fetch_assoc();
}

function verify_column_type_change(mysqli $db, string $tableName, string $columnName, string $newType, array $definition): void
{
    $tempName = 'tmp_access_type_' . bin2hex(random_bytes(6));
    $testDefinition = $definition;
    $testDefinition['column_default'] = null;
    $testDefinition['extra'] = '';

    try {
        $db->query('CREATE TEMPORARY TABLE ' . db_identifier($tempName) . ' (' . db_identifier($columnName) . ' ' . column_definition_sql($testDefinition) . ')');
        $db->query('INSERT INTO ' . db_identifier($tempName) . ' (' . db_identifier($columnName) . ') SELECT ' . db_identifier($columnName) . ' FROM ' . db_identifier($tableName));
        $testDefinition['column_type'] = $newType;
        $db->query('ALTER TABLE ' . db_identifier($tempName) . ' MODIFY COLUMN ' . db_identifier($columnName) . ' ' . column_definition_sql($testDefinition));
        $db->query('DROP TEMPORARY TABLE IF EXISTS ' . db_identifier($tempName));
    } catch (Throwable $exception) {
        $db->query('DROP TEMPORARY TABLE IF EXISTS ' . db_identifier($tempName));
        throw new RuntimeException('This field cannot be changed to ' . $newType . ': ' . $exception->getMessage());
    }
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
        $friendlyName = trim((string) ($request['friendlyName'] ?? ''));
        $comment = trim((string) ($request['comment'] ?? ''));

        if (column_exists($db, $resolvedTable, $fieldName)) {
            throw new RuntimeException('A field with that name already exists.');
        }

        $db->query(
            'ALTER TABLE ' . db_identifier($resolvedTable) .
            ' ADD COLUMN ' . db_identifier($fieldName) . ' ' . mysql_type_for_access_type($type) .
            ($comment !== '' ? " COMMENT '" . addslashes($comment) . "'" : '')
        );
        update_column_metadata($db, $resolvedTable, $fieldName, $friendlyName);

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
        $friendlyName = trim((string) ($request['friendlyName'] ?? ''));
        $comment = trim((string) ($request['comment'] ?? ''));

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
            column_definition_sql($definition, $comment)
        );
        $metadata = fetch_table_metadata($db, $resolvedTable);
        $metadata['columns'] ??= [];
        if ($oldName !== $newName && isset($metadata['columns'][$oldName])) {
            $metadata['columns'][$newName] = $metadata['columns'][$oldName];
            unset($metadata['columns'][$oldName]);
        }
        $metadata['columns'][$newName] ??= [];
        $metadata['columns'][$newName]['friendlyName'] = $friendlyName;
        save_table_metadata($db, $resolvedTable, $metadata);

        json_response([
            'ok' => true,
            'table' => $resolvedTable,
            'payload' => fetch_table_payload($db, $resolvedTable, true),
        ]);
        exit;
    }

    if ($action === 'setColumnValidation') {
        $columnName = validate_field_name((string) ($request['column'] ?? ''));
        $property = (string) ($request['property'] ?? '');
        $enabled = filter_var($request['enabled'] ?? false, FILTER_VALIDATE_BOOL);

        if (!column_exists($db, $resolvedTable, $columnName)) {
            throw new RuntimeException('Field was not found.');
        }

        if (fetch_column_key($db, $resolvedTable, $columnName) === 'PRI') {
            throw new RuntimeException('Primary key fields are read only for Required, Unique, and Indexed settings.');
        }

        $definition = fetch_column_definition($db, $resolvedTable, $columnName);

        if ($property === 'required') {
            if ($enabled && column_has_blank_values($db, $resolvedTable, $columnName, column_allows_empty_string_check($definition))) {
                throw new RuntimeException('Required cannot be enabled because this field contains blank values.');
            }

            $definition['is_nullable'] = $enabled ? 'NO' : 'YES';
            $db->query(
                'ALTER TABLE ' . db_identifier($resolvedTable) .
                ' MODIFY COLUMN ' . db_identifier($columnName) . ' ' .
                column_definition_sql($definition)
            );
        } elseif ($property === 'unique') {
            $uniqueIndex = schema_index_name($columnName, true);
            if ($enabled) {
                if (column_has_duplicates($db, $resolvedTable, $columnName)) {
                    throw new RuntimeException('Unique cannot be enabled because this field contains duplicate values.');
                }

                if (!index_exists($db, $resolvedTable, $uniqueIndex)) {
                    $db->query(
                        'ALTER TABLE ' . db_identifier($resolvedTable) .
                        ' ADD UNIQUE INDEX ' . db_identifier($uniqueIndex) . ' (' . db_identifier($columnName) . ')'
                    );
                }
            } elseif (index_exists($db, $resolvedTable, $uniqueIndex)) {
                $db->query(
                    'ALTER TABLE ' . db_identifier($resolvedTable) .
                    ' DROP INDEX ' . db_identifier($uniqueIndex)
                );
            }
        } elseif ($property === 'indexed') {
            $plainIndex = schema_index_name($columnName, false);
            if ($enabled) {
                if (!index_exists($db, $resolvedTable, $plainIndex)) {
                    $db->query(
                        'ALTER TABLE ' . db_identifier($resolvedTable) .
                        ' ADD INDEX ' . db_identifier($plainIndex) . ' (' . db_identifier($columnName) . ')'
                    );
                }
            } elseif (index_exists($db, $resolvedTable, $plainIndex)) {
                $db->query(
                    'ALTER TABLE ' . db_identifier($resolvedTable) .
                    ' DROP INDEX ' . db_identifier($plainIndex)
                );
            }
        } else {
            throw new RuntimeException('Unsupported field validation property.');
        }

        json_response([
            'ok' => true,
            'table' => $resolvedTable,
            'payload' => fetch_table_payload($db, $resolvedTable, true),
        ]);
        exit;
    }

    if ($action === 'setColumnType') {
        $columnName = validate_field_name((string) ($request['column'] ?? ''));
        $newType = validate_mysql_column_type((string) ($request['type'] ?? ''));

        if (!column_exists($db, $resolvedTable, $columnName)) {
            throw new RuntimeException('Field was not found.');
        }

        if (fetch_column_key($db, $resolvedTable, $columnName) === 'PRI') {
            throw new RuntimeException('Primary key fields are read only for data type changes.');
        }

        $definition = fetch_column_definition($db, $resolvedTable, $columnName);
        $currentType = strtoupper((string) ($definition['column_type'] ?? ''));

        if ($currentType !== $newType) {
            verify_column_type_change($db, $resolvedTable, $columnName, $newType, $definition);
            $definition['column_type'] = $newType;
            $definition['column_default'] = null;
            $db->query(
                'ALTER TABLE ' . db_identifier($resolvedTable) .
                ' MODIFY COLUMN ' . db_identifier($columnName) . ' ' .
                column_definition_sql($definition)
            );
        }

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
