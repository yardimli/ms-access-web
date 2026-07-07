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

function mysql_column_type_for_access_type(string $type): string
{
    return trim(str_replace([' NULL DEFAULT 0', ' NULL'], '', mysql_type_for_access_type($type)));
}

function allowed_access_column_types(): array
{
    return [
        'Short Text',
        'Long Text',
        'Rich Text',
        'Number',
        'Large Number',
        'Date/Time',
        'Currency',
        'AutoNumber',
        'Yes/No',
        'OLE Object',
        'Hyperlink',
        'Attachment',
        'Lookup & Relationship',
        'Calculated Field',
        'Address',
        'Category',
        'Name',
        'Payment Type',
        'Phone',
        'Priority',
        'Start and End Dates',
        'Status',
        'Tag',
    ];
}

function validate_access_column_type(string $type): string
{
    $type = trim($type);
    if ($type === 'Date & Time') {
        $type = 'Date/Time';
    }
    if (!in_array($type, allowed_access_column_types(), true)) {
        throw new RuntimeException('Unsupported Access data type.');
    }
    return $type;
}

function quick_start_definition(string $type): array
{
    return match ($type) {
        'Address' => ['accessType' => 'Short Text', 'mysqlType' => 'VARCHAR(255)', 'friendlyName' => 'Address'],
        'Category' => ['accessType' => 'Short Text', 'mysqlType' => 'VARCHAR(255)', 'friendlyName' => 'Category', 'lookup' => [
            'mode' => 'single', 'valueType' => 'string', 'source' => ['Hardware', 'Software', 'Service', 'Other']
        ]],
        'Name' => ['accessType' => 'Short Text', 'mysqlType' => 'VARCHAR(255)', 'friendlyName' => 'Name'],
        'Payment Type' => ['accessType' => 'Short Text', 'mysqlType' => 'VARCHAR(255)', 'friendlyName' => 'Payment Type', 'lookup' => [
            'mode' => 'single', 'valueType' => 'integer', 'source' => [['key' => 1, 'value' => 'Cash'], ['key' => 2, 'value' => 'Credit Card'], ['key' => 3, 'value' => 'Wire Transfer']]
        ]],
        'Phone' => ['accessType' => 'Short Text', 'mysqlType' => 'VARCHAR(40)', 'friendlyName' => 'Phone'],
        'Priority' => ['accessType' => 'Number', 'mysqlType' => 'INT', 'friendlyName' => 'Priority', 'lookup' => [
            'mode' => 'single', 'valueType' => 'integer', 'source' => [['key' => 1, 'value' => 'Low'], ['key' => 2, 'value' => 'Normal'], ['key' => 3, 'value' => 'High']]
        ]],
        'Start and End Dates' => ['accessType' => 'Short Text', 'mysqlType' => 'VARCHAR(255)', 'friendlyName' => 'Start and End Dates'],
        'Status' => ['accessType' => 'Short Text', 'mysqlType' => 'VARCHAR(80)', 'friendlyName' => 'Status', 'lookup' => [
            'mode' => 'single', 'valueType' => 'string', 'source' => ['New', 'In Progress', 'Blocked', 'Done']
        ]],
        'Tag' => ['accessType' => 'Long Text', 'mysqlType' => 'TEXT', 'friendlyName' => 'Tag', 'lookup' => [
            'mode' => 'multiple', 'valueType' => 'string', 'source' => ['Important', 'Follow Up', 'Internal', 'External']
        ]],
        'Calculated Field' => ['accessType' => 'Calculated Field', 'mysqlType' => 'VARCHAR(255)', 'friendlyName' => 'Calculated Field'],
        default => ['accessType' => $type, 'mysqlType' => mysql_column_type_for_access_type($type), 'friendlyName' => ''],
    };
}

function allowed_access_formats_for_type(string $type): array
{
    return match ($type) {
        'Number', 'Large Number', 'Currency' => ['General Number', 'Currency', 'Euro', 'Fixed', 'Standard', 'Percent', 'Scientific'],
        'Date/Time' => ['General Date', 'Long Date', 'Medium Date', 'Short Date', 'Long Time', 'Medium Time', 'Short Time'],
        'Yes/No' => ['True/False', 'Yes/No', 'On/Off'],
        default => [],
    };
}

function default_access_format_for_type(string $type): string
{
    return match ($type) {
        'Currency' => 'Currency',
        'Number', 'Large Number' => 'General Number',
        'Date/Time' => 'General Date',
        'Yes/No' => 'Yes/No',
        default => '',
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

function update_column_metadata(mysqli $db, string $tableName, string $columnName, string $friendlyName, ?string $accessType = null, ?string $mysqlType = null): void
{
    $metadata = fetch_table_metadata($db, $tableName);
    $metadata['columns'] ??= [];
    $metadata['columns'][$columnName] ??= [];
    $metadata['columns'][$columnName]['friendlyName'] = trim($friendlyName);
    if ($accessType !== null) {
        $metadata['columns'][$columnName]['accessType'] = $accessType;
        $metadata['columns'][$columnName]['accessFormat'] = default_access_format_for_type($accessType);
        $metadata['columns'][$columnName]['decimalPlaces'] = 2;
    }
    if ($mysqlType !== null) {
        $metadata['columns'][$columnName]['mysqlType'] = $mysqlType;
    }
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
        $type = validate_access_column_type((string) ($request['type'] ?? 'Short Text'));
        $friendlyName = trim((string) ($request['friendlyName'] ?? ''));
        $comment = trim((string) ($request['comment'] ?? ''));
        $afterColumn = trim((string) ($request['afterColumn'] ?? ''));
        $quickDefinition = quick_start_definition($type);
        $storageAccessType = (string) ($quickDefinition['accessType'] ?? $type);
        $storageMysqlType = (string) ($quickDefinition['mysqlType'] ?? mysql_column_type_for_access_type($storageAccessType));
        if ($friendlyName === '') {
            $friendlyName = (string) ($quickDefinition['friendlyName'] ?? '');
        }

        if (column_exists($db, $resolvedTable, $fieldName)) {
            throw new RuntimeException('A field with that name already exists.');
        }
        $afterClause = '';
        if ($afterColumn !== '') {
            $afterColumn = validate_field_name($afterColumn);
            if (!column_exists($db, $resolvedTable, $afterColumn)) {
                throw new RuntimeException('The selected insertion field was not found.');
            }
            $afterClause = ' AFTER ' . db_identifier($afterColumn);
        }

        $db->query(
            'ALTER TABLE ' . db_identifier($resolvedTable) .
            ' ADD COLUMN ' . db_identifier($fieldName) . ' ' . $storageMysqlType . ' NULL' .
            ($comment !== '' ? " COMMENT '" . addslashes($comment) . "'" : '') .
            $afterClause
        );
        update_column_metadata($db, $resolvedTable, $fieldName, $friendlyName, $storageAccessType, $storageMysqlType);
        if (isset($quickDefinition['lookup'])) {
            $metadata = fetch_table_metadata($db, $resolvedTable);
            $metadata['columns'][$fieldName]['lookup'] = $quickDefinition['lookup'];
            save_table_metadata($db, $resolvedTable, $metadata);
        }

        json_response([
            'ok' => true,
            'table' => $resolvedTable,
            'payload' => fetch_table_payload($db, $resolvedTable, true),
        ]);
        exit;
    }

    if ($action === 'deleteColumn') {
        $columnName = validate_field_name((string) ($request['column'] ?? ''));
        if (!column_exists($db, $resolvedTable, $columnName)) {
            throw new RuntimeException('Field was not found.');
        }
        if (fetch_column_key($db, $resolvedTable, $columnName) === 'PRI') {
            throw new RuntimeException('Primary key fields cannot be deleted.');
        }

        $db->query('ALTER TABLE ' . db_identifier($resolvedTable) . ' DROP COLUMN ' . db_identifier($columnName));
        $metadata = fetch_table_metadata($db, $resolvedTable);
        unset($metadata['columns'][$columnName]);
        save_table_metadata($db, $resolvedTable, $metadata);

        json_response([
            'ok' => true,
            'table' => $resolvedTable,
            'payload' => fetch_table_payload($db, $resolvedTable, true),
        ]);
        exit;
    }

    if ($action === 'setCalculatedField') {
        $columnName = validate_field_name((string) ($request['column'] ?? ''));
        $expression = trim((string) ($request['expression'] ?? ''));
        $javascript = trim((string) ($request['javascript'] ?? ''));
        $interpretNatural = filter_var($request['interpretNatural'] ?? false, FILTER_VALIDATE_BOOL);

        if (!column_exists($db, $resolvedTable, $columnName)) {
            throw new RuntimeException('Field was not found.');
        }

        $metadata = fetch_table_metadata($db, $resolvedTable);
        $metadata['columns'] ??= [];
        $metadata['columns'][$columnName] ??= [];
        $metadata['columns'][$columnName]['accessType'] = 'Calculated Field';
        $metadata['columns'][$columnName]['calculatedExpression'] = $expression;
        $metadata['columns'][$columnName]['calculatedJavascript'] = $javascript;
        $metadata['columns'][$columnName]['calculatedInterpretNatural'] = $interpretNatural;
        save_table_metadata($db, $resolvedTable, $metadata);

        json_response([
            'ok' => true,
            'table' => $resolvedTable,
            'payload' => fetch_table_payload($db, $resolvedTable, true),
        ]);
        exit;
    }

    if ($action === 'setDefaultValue') {
        $columnName = validate_field_name((string) ($request['column'] ?? ''));
        $expression = trim((string) ($request['expression'] ?? ''));
        $javascript = trim((string) ($request['javascript'] ?? ''));
        $interpretNatural = filter_var($request['interpretNatural'] ?? false, FILTER_VALIDATE_BOOL);

        if (!column_exists($db, $resolvedTable, $columnName)) {
            throw new RuntimeException('Field was not found.');
        }

        $metadata = fetch_table_metadata($db, $resolvedTable);
        $metadata['columns'] ??= [];
        $metadata['columns'][$columnName] ??= [];
        if ($expression === '') {
            unset(
                $metadata['columns'][$columnName]['defaultExpression'],
                $metadata['columns'][$columnName]['defaultJavascript'],
                $metadata['columns'][$columnName]['defaultInterpretNatural']
            );
        } else {
            $metadata['columns'][$columnName]['defaultExpression'] = $expression;
            $metadata['columns'][$columnName]['defaultJavascript'] = $javascript;
            $metadata['columns'][$columnName]['defaultInterpretNatural'] = $interpretNatural;
        }
        save_table_metadata($db, $resolvedTable, $metadata);

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

    if ($action === 'setValidationRule') {
        $columnName = validate_field_name((string) ($request['column'] ?? ''));
        $rule = trim((string) ($request['rule'] ?? ''));
        $javascript = trim((string) ($request['javascript'] ?? ''));
        $interpretNatural = filter_var($request['interpretNatural'] ?? false, FILTER_VALIDATE_BOOL);

        if (!column_exists($db, $resolvedTable, $columnName)) {
            throw new RuntimeException('Field was not found.');
        }

        $metadata = fetch_table_metadata($db, $resolvedTable);
        $metadata['columns'] ??= [];
        $metadata['columns'][$columnName] ??= [];
        if ($rule === '') {
            unset(
                $metadata['columns'][$columnName]['validationRule'],
                $metadata['columns'][$columnName]['validationJavascript'],
                $metadata['columns'][$columnName]['validationInterpretNatural']
            );
        } else {
            $metadata['columns'][$columnName]['validationRule'] = $rule;
            $metadata['columns'][$columnName]['validationJavascript'] = $javascript;
            $metadata['columns'][$columnName]['validationInterpretNatural'] = $interpretNatural;
        }
        save_table_metadata($db, $resolvedTable, $metadata);

        json_response([
            'ok' => true,
            'table' => $resolvedTable,
            'payload' => fetch_table_payload($db, $resolvedTable, true),
        ]);
        exit;
    }

    if ($action === 'setColumnFormat') {
        $columnName = validate_field_name((string) ($request['column'] ?? ''));
        $format = trim((string) ($request['format'] ?? ''));
        $decimalPlaces = max(0, min(6, (int) ($request['decimalPlaces'] ?? 2)));

        if (!column_exists($db, $resolvedTable, $columnName)) {
            throw new RuntimeException('Field was not found.');
        }

        [$columns] = fetch_table_columns($db, $resolvedTable);
        $column = null;
        foreach ($columns as $candidate) {
            if (strcasecmp($candidate['name'], $columnName) === 0) {
                $column = $candidate;
                break;
            }
        }

        $accessType = (string) ($column['accessType'] ?? $column['type'] ?? 'Short Text');
        $allowedFormats = allowed_access_formats_for_type($accessType);
        if (!$allowedFormats) {
            throw new RuntimeException('This field type does not support a Format setting.');
        }

        if ($format === '') {
            $format = default_access_format_for_type($accessType);
        }

        if (!in_array($format, $allowedFormats, true)) {
            throw new RuntimeException('Unsupported format for ' . $accessType . '.');
        }

        $metadata = fetch_table_metadata($db, $resolvedTable);
        $metadata['columns'] ??= [];
        $metadata['columns'][$columnName] ??= [];
        $metadata['columns'][$columnName]['accessType'] = $accessType;
        $metadata['columns'][$columnName]['mysqlType'] = (string) ($column['actualMysqlType'] ?? $column['mysqlType'] ?? '');
        $metadata['columns'][$columnName]['accessFormat'] = $format;
        $metadata['columns'][$columnName]['decimalPlaces'] = $decimalPlaces;
        save_table_metadata($db, $resolvedTable, $metadata);

        json_response([
            'ok' => true,
            'table' => $resolvedTable,
            'payload' => fetch_table_payload($db, $resolvedTable, true),
        ]);
        exit;
    }

    if ($action === 'setColumnType') {
        $columnName = validate_field_name((string) ($request['column'] ?? ''));
        $accessType = validate_access_column_type((string) ($request['accessType'] ?? $request['type'] ?? 'Short Text'));
        $newType = mysql_column_type_for_access_type($accessType);

        if (!column_exists($db, $resolvedTable, $columnName)) {
            throw new RuntimeException('Field was not found.');
        }

        if (fetch_column_key($db, $resolvedTable, $columnName) === 'PRI') {
            throw new RuntimeException('Primary key fields are read only for data type changes.');
        }

        $definition = fetch_column_definition($db, $resolvedTable, $columnName);
        $currentType = strtoupper((string) ($definition['column_type'] ?? ''));

        if ($currentType !== strtoupper($newType)) {
            verify_column_type_change($db, $resolvedTable, $columnName, $newType, $definition);
            $definition['column_type'] = $newType;
            $definition['column_default'] = null;
            $db->query(
                'ALTER TABLE ' . db_identifier($resolvedTable) .
                ' MODIFY COLUMN ' . db_identifier($columnName) . ' ' .
                column_definition_sql($definition)
            );
        }

        $metadata = fetch_table_metadata($db, $resolvedTable);
        $metadata['columns'] ??= [];
        $metadata['columns'][$columnName] ??= [];
        $metadata['columns'][$columnName]['accessType'] = $accessType;
        $metadata['columns'][$columnName]['mysqlType'] = $newType;
        $metadata['columns'][$columnName]['accessFormat'] = default_access_format_for_type($accessType);
        $metadata['columns'][$columnName]['decimalPlaces'] = 2;
        save_table_metadata($db, $resolvedTable, $metadata);

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
