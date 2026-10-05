<?php

require_once __DIR__ . '/../lib/acaciadb_data.php';

function schema_request(): array
{
    $raw = file_get_contents('php://input') ?: '';
    $data = json_decode($raw, true);
    return is_array($data) ? $data : $_POST;
}

function schema_table_payload(mysqli $db, string $tableName, array $request): array
{
    [$skip, $limit] = normalize_table_page(
        (int) ($request['skip'] ?? 0),
        (int) ($request['limit'] ?? 500)
    );
    return fetch_table_payload($db, $tableName, true, $skip, $limit);
}

function validate_field_name(string $name): string
{
    $name = trim($name);

    if (!preg_match('/^[A-Za-z_][A-Za-z0-9_]{0,63}$/', $name)) {
        throw new RuntimeException('Field names must start with a letter or underscore and contain only letters, numbers, and underscores.');
    }

    return $name;
}

function validate_table_name(string $name): string
{
    $name = trim($name);
    if (!preg_match('/^[A-Za-z_][A-Za-z0-9_$ -]{0,63}$/', $name)) {
        throw new RuntimeException('Table names must start with a letter or underscore and contain only letters, numbers, spaces, underscores, dollar signs, or hyphens.');
    }
    if (in_array(strtolower($name), ['acaciadb_object_definitions', 'acaciadb_column_history'], true)
        || str_ends_with(strtolower($name), '_relationship')) {
        throw new RuntimeException('That table name is reserved by AcaciaDB.');
    }
    return $name;
}

function mysql_type_for_acaciadb_type(string $type): string
{
    return match ($type) {
        'AutoNumber' => 'INT NOT NULL AUTO_INCREMENT',
        'Number' => 'INT NULL',
        'Large Number' => 'BIGINT NULL',
        'Currency' => 'DECIMAL(12,2) NULL DEFAULT 0',
        'Date/Time', 'Date & Time' => 'DATETIME NULL',
        'Yes/No' => 'TINYINT(1) NULL DEFAULT 0',
        'Long Text', 'Rich Text', 'HTML Text' => 'TEXT NULL',
        'Attachment', 'Hyperlink', 'Lookup & Relationship', 'Calculated Field' => 'VARCHAR(255) NULL',
        default => 'VARCHAR(255) NULL',
    };
}

function mysql_column_type_for_acaciadb_type(string $type): string
{
    if ($type === 'AutoNumber') {
        return 'INT';
    }
    return trim(str_replace([' NULL DEFAULT 0', ' NULL'], '', mysql_type_for_acaciadb_type($type)));
}

function allowed_acaciadb_column_types(): array
{
    return [
        'Short Text',
        'Long Text',
        'HTML Text',
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

function validate_acaciadb_column_type(string $type): string
{
    $type = trim($type);
    if ($type === 'Date & Time') {
        $type = 'Date/Time';
    }
    if (!in_array($type, allowed_acaciadb_column_types(), true)) {
        throw new RuntimeException('Unsupported AcaciaDB data type.');
    }
    return $type;
}

function quick_start_definition(string $type): array
{
    return match ($type) {
        'Address' => ['acaciadbType' => 'Short Text', 'mysqlType' => 'VARCHAR(255)', 'friendlyName' => 'Address'],
        'Category' => ['acaciadbType' => 'Lookup & Relationship', 'mysqlType' => 'VARCHAR(255)', 'friendlyName' => 'Category', 'lookup' => [
            'kind' => 'static', 'mode' => 'single', 'valueType' => 'string', 'columns' => 1,
            'keyColumn' => 'Col1', 'displayColumns' => ['Col1'], 'limitToList' => true,
            'createdBy' => 'quickStart', 'source' => ['Hardware', 'Software', 'Service', 'Other']
        ]],
        'Name' => ['acaciadbType' => 'Short Text', 'mysqlType' => 'VARCHAR(255)', 'friendlyName' => 'Name'],
        'Payment Type' => ['acaciadbType' => 'Lookup & Relationship', 'mysqlType' => 'VARCHAR(255)', 'friendlyName' => 'Payment Type', 'lookup' => [
            'kind' => 'static', 'mode' => 'single', 'valueType' => 'integer', 'columns' => 2,
            'keyColumn' => 'Col1', 'displayColumns' => ['Col2'], 'limitToList' => true,
            'createdBy' => 'quickStart', 'source' => [['key' => 1, 'value' => 'Cash'], ['key' => 2, 'value' => 'Credit Card'], ['key' => 3, 'value' => 'Wire Transfer']]
        ]],
        'Phone' => ['acaciadbType' => 'Short Text', 'mysqlType' => 'VARCHAR(40)', 'friendlyName' => 'Phone'],
        'Priority' => ['acaciadbType' => 'Lookup & Relationship', 'mysqlType' => 'INT', 'friendlyName' => 'Priority', 'lookup' => [
            'kind' => 'static', 'mode' => 'single', 'valueType' => 'integer', 'columns' => 2,
            'keyColumn' => 'Col1', 'displayColumns' => ['Col2'], 'limitToList' => true,
            'createdBy' => 'quickStart', 'source' => [['key' => 1, 'value' => 'Low'], ['key' => 2, 'value' => 'Normal'], ['key' => 3, 'value' => 'High']]
        ]],
        'Start and End Dates' => ['acaciadbType' => 'Short Text', 'mysqlType' => 'VARCHAR(255)', 'friendlyName' => 'Start and End Dates'],
        'Status' => ['acaciadbType' => 'Lookup & Relationship', 'mysqlType' => 'VARCHAR(80)', 'friendlyName' => 'Status', 'lookup' => [
            'kind' => 'static', 'mode' => 'single', 'valueType' => 'string', 'columns' => 1,
            'keyColumn' => 'Col1', 'displayColumns' => ['Col1'], 'limitToList' => true,
            'createdBy' => 'quickStart', 'source' => ['New', 'In Progress', 'Blocked', 'Done']
        ]],
        'Tag' => ['acaciadbType' => 'Lookup & Relationship', 'mysqlType' => 'TEXT', 'friendlyName' => 'Tag', 'lookup' => [
            'kind' => 'static', 'mode' => 'multiple', 'valueType' => 'string', 'columns' => 1,
            'keyColumn' => 'Col1', 'displayColumns' => ['Col1'], 'limitToList' => true,
            'createdBy' => 'quickStart', 'source' => ['Important', 'Follow Up', 'Internal', 'External']
        ]],
        'Calculated Field' => ['acaciadbType' => 'Calculated Field', 'mysqlType' => 'VARCHAR(255)', 'friendlyName' => 'Calculated Field'],
        default => ['acaciadbType' => $type, 'mysqlType' => mysql_column_type_for_acaciadb_type($type), 'friendlyName' => ''],
    };
}

function allowed_acaciadb_formats_for_type(string $type): array
{
    return match ($type) {
        'Number', 'Large Number', 'Currency' => ['General Number', 'Currency', 'Euro', 'Fixed', 'Standard', 'Percent', 'Scientific'],
        'Date/Time' => ['General Date', 'Long Date', 'Medium Date', 'Short Date', 'Long Time', 'Medium Time', 'Short Time'],
        'Yes/No' => ['True/False', 'Yes/No', 'On/Off'],
        default => [],
    };
}

function default_acaciadb_format_for_type(string $type): string
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

function lookup_storage_mysql_type(array $lookup): ?string
{
    if (($lookup['kind'] ?? 'static') === 'table') {
        if (($lookup['mode'] ?? 'single') === 'multiple') {
            return ($lookup['storageMode'] ?? 'relationship') === 'relationship' ? null : 'JSON';
        }
        return (string) ($lookup['keyMysqlType'] ?? 'VARCHAR(255)');
    }

    if (($lookup['mode'] ?? 'single') === 'multiple') {
        return 'TEXT';
    }

    return ($lookup['valueType'] ?? 'string') === 'integer' ? 'INT' : 'VARCHAR(255)';
}

function lookup_column_position(mysqli $db, string $tableName, string $afterColumn): int
{
    [$columns] = fetch_table_columns($db, $tableName);
    if ($afterColumn !== '') {
        foreach ($columns as $index => $column) {
            if (strcasecmp((string) $column['name'], $afterColumn) === 0) {
                return $index + 1;
            }
        }
    }
    return count($columns);
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

function update_column_metadata(mysqli $db, string $tableName, string $columnName, string $friendlyName, ?string $acaciadbType = null, ?string $mysqlType = null): void
{
    $metadata = fetch_table_metadata($db, $tableName);
    $metadata['columns'] ??= [];
    $metadata['columns'][$columnName] ??= [];
    $metadata['columns'][$columnName]['friendlyName'] = trim($friendlyName);
    if ($acaciadbType !== null) {
        $metadata['columns'][$columnName]['acaciadbType'] = $acaciadbType;
        $metadata['columns'][$columnName]['acaciadbFormat'] = default_acaciadb_format_for_type($acaciadbType);
        $metadata['columns'][$columnName]['decimalPlaces'] = 2;
    }
    if ($mysqlType !== null) {
        $metadata['columns'][$columnName]['mysqlType'] = $mysqlType;
    }
    save_table_metadata($db, $tableName, $metadata);
}

function validate_lookup_source_options(array $source): array
{
    $options = [];
    foreach ($source as $option) {
        if (is_array($option)) {
            $key = trim((string) ($option['key'] ?? ''));
            $value = trim((string) ($option['value'] ?? $option['label'] ?? ''));
            if ($key === '' && $value !== '') {
                $key = $value;
            }
            if ($key === '' || $value === '') {
                continue;
            }
            $options[] = ['key' => $key, 'value' => $value];
        } else {
            $value = trim((string) $option);
            if ($value !== '') {
                $options[] = $value;
            }
        }
    }

    if (!$options) {
        throw new RuntimeException('Lookup fields need at least one value.');
    }

    return $options;
}

function lookup_relationship_table_name(string $leftTable, string $rightTable): string
{
    $left = preg_replace('/[^A-Za-z0-9_]+/', '_', strtolower($leftTable));
    $right = preg_replace('/[^A-Za-z0-9_]+/', '_', strtolower($rightTable));
    return substr($left . '_' . $right . '_relationship', 0, 64);
}

function first_primary_key(mysqli $db, string $tableName): string
{
    $stmt = $db->prepare(
        'SELECT column_name
         FROM information_schema.columns
         WHERE table_schema = DATABASE()
           AND table_name = ?
           AND column_key = "PRI"
         ORDER BY ordinal_position
         LIMIT 1'
    );
    $stmt->bind_param('s', $tableName);
    $stmt->execute();
    return (string) ($stmt->get_result()->fetch_assoc()['column_name'] ?? '');
}

function lookup_key_mysql_type(mysqli $db, string $tableName, string $keyColumn): string
{
    $definition = fetch_column_definition($db, $tableName, $keyColumn);
    if (!$definition) {
        throw new RuntimeException('The lookup primary key definition was not found.');
    }

    return strtoupper((string) $definition['column_type']);
}

function normalize_lookup_config(mysqli $db, string $ownerTable, array $config, ?array $existingLookup = null): array
{
    $existingKind = $existingLookup
        ? (string) ($existingLookup['kind'] ?? (!empty($existingLookup['sourceObjectName']) || !empty($existingLookup['sourceTable']) ? 'table' : 'static'))
        : '';
    $kind = (string) ($config['kind'] ?? $existingKind ?: 'static');
    if (!in_array($kind, ['static', 'table'], true)) {
        throw new RuntimeException('Unsupported lookup source type.');
    }

    if ($existingLookup && $existingKind !== $kind) {
        throw new RuntimeException('Existing lookups cannot be converted between static values and table/query values.');
    }

    $mode = filter_var($config['allowMultiple'] ?? $config['multiple'] ?? false, FILTER_VALIDATE_BOOL) ? 'multiple' : 'single';
    $existingMode = $existingLookup ? (string) ($existingLookup['mode'] ?? 'single') : '';
    if ($existingLookup && $existingMode !== $mode) {
        throw new RuntimeException('The relationship type of an existing lookup cannot be changed.');
    }
    $requestedStorageMode = (string) ($config['storageMode'] ?? ($existingLookup['storageMode'] ?? (!empty($existingLookup['relationshipTable']) ? 'relationship' : ($mode === 'multiple' ? 'json' : 'column'))));
    $lookup = [
        'kind' => $kind,
        'mode' => $mode,
        'label' => trim((string) ($config['label'] ?? '')),
        'createdBy' => 'lookupWizard',
        'updatedAt' => date(DATE_ATOM),
    ];

    if ($kind === 'static') {
        $lookup['valueType'] = (string) ($config['valueType'] ?? 'string');
        $lookup['limitToList'] = filter_var($config['limitToList'] ?? false, FILTER_VALIDATE_BOOL);
        $lookup['columns'] = max(1, min(8, (int) ($config['columns'] ?? 1)));
        $lookup['keyColumn'] = trim((string) ($config['keyColumn'] ?? 'Col1')) ?: 'Col1';
        $lookup['displayColumns'] = array_values(array_filter((array) ($config['displayColumns'] ?? ['Col1'])));
        $lookup['source'] = validate_lookup_source_options((array) ($config['source'] ?? []));
        return $lookup;
    }

    $sourceType = (string) ($config['sourceObjectType'] ?? 'table');
    if (!in_array($sourceType, ['table', 'query'], true)) {
        throw new RuntimeException('Lookup source must be a table or query.');
    }
    $sourceName = trim((string) ($config['sourceObjectName'] ?? ''));
    if ($sourceName === '') {
        throw new RuntimeException('Choose the table or query that provides lookup values.');
    }

    if ($sourceType === 'table') {
        $resolvedSource = resolve_table_name($db, $sourceName);
        if (!$resolvedSource) {
            throw new RuntimeException('Lookup source table was not found.');
        }
        $sourceName = $resolvedSource;
        [$sourceColumns] = fetch_table_columns($db, $sourceName);
        $sourceColumnNames = array_map(fn (array $column): string => $column['name'], $sourceColumns);
        $sourcePrimaryKey = first_primary_key($db, $sourceName);
        if ($sourcePrimaryKey === '') {
            throw new RuntimeException('The lookup source table needs a primary key.');
        }
        $keyColumn = $sourcePrimaryKey;
        if (!in_array($keyColumn, $sourceColumnNames, true)) {
            throw new RuntimeException('Lookup key field was not found in the source table.');
        }
        $selectedFields = array_values(array_filter((array) ($config['selectedFields'] ?? []), fn ($name): bool => in_array((string) $name, $sourceColumnNames, true)));
        if (!$selectedFields) {
            $selectedFields = [$keyColumn];
        }
        $displayColumns = array_values(array_filter((array) ($config['displayColumns'] ?? $selectedFields), fn ($name): bool => in_array((string) $name, $sourceColumnNames, true)));
        if (!$displayColumns) {
            $displayColumns = $selectedFields;
        }
        $lookup += [
            'sourceObjectType' => 'table',
            'sourceObjectName' => $sourceName,
            'selectedFields' => $selectedFields,
            'displayColumns' => $displayColumns,
            'keyColumn' => $keyColumn,
            'keyMysqlType' => lookup_key_mysql_type($db, $sourceName, $keyColumn),
            'hideKeyColumn' => filter_var($config['hideKeyColumn'] ?? true, FILTER_VALIDATE_BOOL),
            'dataIntegrity' => filter_var($config['dataIntegrity'] ?? false, FILTER_VALIDATE_BOOL),
            'cascadeDelete' => filter_var($config['cascadeDelete'] ?? false, FILTER_VALIDATE_BOOL),
            'sort' => array_values(array_filter((array) ($config['sort'] ?? []), fn ($sort): bool => is_array($sort) && !empty($sort['field']))),
        ];

        if ($mode === 'multiple') {
            $storageMode = in_array($requestedStorageMode, ['json', 'relationship'], true) ? $requestedStorageMode : 'relationship';
            if ($existingLookup && ($existingLookup['storageMode'] ?? (!empty($existingLookup['relationshipTable']) ? 'relationship' : 'json')) !== $storageMode) {
                throw new RuntimeException('The storage method of an existing multi-value lookup cannot be changed.');
            }
            $lookup['storageMode'] = $storageMode;
            $ownerKey = first_primary_key($db, $ownerTable);
            if ($ownerKey === '') {
                throw new RuntimeException('The current table needs a primary key before it can use a multi-value lookup.');
            }
            if ($storageMode === 'relationship') {
                $relationshipTable = lookup_relationship_table_name($ownerTable, $sourceName);
                $localKeyColumn = substr(preg_replace('/[^A-Za-z0-9_]+/', '_', strtolower($ownerTable)) . '_' . $ownerKey, 0, 60);
                $remoteKeyColumn = substr(preg_replace('/[^A-Za-z0-9_]+/', '_', strtolower($sourceName)) . '_' . $keyColumn, 0, 60);
                $ownerKeyType = lookup_key_mysql_type($db, $ownerTable, $ownerKey);
                $sourceKeyType = lookup_key_mysql_type($db, $sourceName, $keyColumn);
                $db->query(
                    'CREATE TABLE IF NOT EXISTS ' . db_identifier($relationshipTable) . ' (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        ' . db_identifier($localKeyColumn) . ' ' . $ownerKeyType . ' NOT NULL,
                        ' . db_identifier($remoteKeyColumn) . ' ' . $sourceKeyType . ' NOT NULL,
                        UNIQUE KEY ' . db_identifier('ux_' . substr($relationshipTable, 0, 48)) . ' (' . db_identifier($localKeyColumn) . ', ' . db_identifier($remoteKeyColumn) . '),
                        INDEX ' . db_identifier('ix_' . substr($localKeyColumn, 0, 50)) . ' (' . db_identifier($localKeyColumn) . '),
                        INDEX ' . db_identifier('ix_' . substr($remoteKeyColumn, 0, 50)) . ' (' . db_identifier($remoteKeyColumn) . ')
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4'
                );
                $lookup['relationshipTable'] = $relationshipTable;
                $lookup['localKeyColumn'] = $localKeyColumn;
                $lookup['remoteKeyColumn'] = $remoteKeyColumn;
            }
        } else {
            $lookup['storageMode'] = 'column';
        }

        return $lookup;
    }

    if (!fetch_object($db, 'query', $sourceName)) {
        throw new RuntimeException('Lookup source query was not found.');
    }

    $lookup += [
        'sourceObjectType' => 'query',
        'sourceObjectName' => $sourceName,
        'selectedFields' => array_values(array_filter((array) ($config['selectedFields'] ?? []))),
        'displayColumns' => array_values(array_filter((array) ($config['displayColumns'] ?? $config['selectedFields'] ?? []))),
        'keyColumn' => trim((string) ($config['keyColumn'] ?? '')),
        'hideKeyColumn' => filter_var($config['hideKeyColumn'] ?? true, FILTER_VALIDATE_BOOL),
        'sort' => array_values(array_filter((array) ($config['sort'] ?? []), fn ($sort): bool => is_array($sort) && !empty($sort['field']))),
        'storageMode' => $mode === 'multiple' ? 'json' : 'column',
    ];
    if (($lookup['keyColumn'] ?? '') === '') {
        throw new RuntimeException('Choose the query field that uniquely identifies lookup rows.');
    }

    return $lookup;
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
    $prefix = $unique ? 'ux_acaciadb_' : 'ix_acaciadb_';
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
    $tempName = 'tmp_acaciadb_type_' . bin2hex(random_bytes(6));
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

    if ($action === 'createTable') {
        $tableName = validate_table_name((string) ($request['name'] ?? ''));
        ensure_acaciadb_storage($db);
        if (physical_table_exists($db, $tableName)) {
            throw new RuntimeException('A table with that name already exists.');
        }

        $db->query(
            'CREATE TABLE ' . db_identifier($tableName) . ' (' .
            db_identifier('ID') . ' INT NOT NULL AUTO_INCREMENT PRIMARY KEY' .
            ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
        );
        save_table_metadata($db, $tableName, [
            'columns' => [
                'ID' => [
                    'friendlyName' => '',
                    'acaciadbType' => 'AutoNumber',
                    'mysqlType' => 'INT',
                    'acaciadbFormat' => '',
                    'decimalPlaces' => 0,
                ],
            ],
            'tableProperties' => [],
        ]);

        json_response([
            'ok' => true,
            'table' => $tableName,
            'payload' => schema_table_payload($db, $tableName, $request),
        ]);
        exit;
    }

    $resolvedTable = resolve_table_name($db, (string) ($request['table'] ?? ''));

    if (!$resolvedTable) {
        throw new RuntimeException('Table was not found.');
    }

    if ($action === 'applyDesignChanges') {
        $changes = is_array($request['columns'] ?? null) ? $request['columns'] : [];
        $requestedPrimaryKey = trim((string) ($request['primaryKey'] ?? ''));
        $currentPrimaryKey = first_primary_key($db, $resolvedTable);
        $metadata = fetch_table_metadata($db, $resolvedTable);
        $metadata['columns'] ??= [];

        foreach ($changes as $change) {
            if (!is_array($change)) {
                continue;
            }
            $originalName = trim((string) ($change['originalName'] ?? ''));
            $deleted = filter_var($change['deleted'] ?? false, FILTER_VALIDATE_BOOL);
            $isNew = filter_var($change['isNew'] ?? false, FILTER_VALIDATE_BOOL);

            if ($deleted) {
                if ($isNew || $originalName === '') {
                    continue;
                }
                $originalName = validate_field_name($originalName);
                if (fetch_column_key($db, $resolvedTable, $originalName) === 'PRI') {
                    throw new RuntimeException('Primary key fields cannot be deleted.');
                }
                if (column_exists($db, $resolvedTable, $originalName)) {
                    $db->query('ALTER TABLE ' . db_identifier($resolvedTable) . ' DROP COLUMN ' . db_identifier($originalName));
                }
                unset($metadata['columns'][$originalName]);
                continue;
            }

            $name = validate_field_name((string) ($change['name'] ?? ''));
            $acaciadbType = validate_acaciadb_column_type((string) ($change['type'] ?? 'Short Text'));
            if (in_array($acaciadbType, ['Lookup & Relationship', 'Calculated Field'], true)) {
                throw new RuntimeException('Use the Lookup or Calculated Field tools to create that field type.');
            }
            $newMysqlType = mysql_column_type_for_acaciadb_type($acaciadbType);
            $comment = trim((string) ($change['comment'] ?? ''));
            $friendlyName = trim((string) ($change['friendlyName'] ?? ''));

            if ($isNew) {
                if (column_exists($db, $resolvedTable, $name)) {
                    throw new RuntimeException('A field named ' . $name . ' already exists.');
                }
                $db->query(
                    'ALTER TABLE ' . db_identifier($resolvedTable) .
                    ' ADD COLUMN ' . db_identifier($name) . ' ' . $newMysqlType . ' NULL' .
                    ($comment !== '' ? " COMMENT '" . $db->real_escape_string($comment) . "'" : '')
                );
                $originalName = $name;
            } else {
                $originalName = validate_field_name($originalName);
                $definition = fetch_column_definition($db, $resolvedTable, $originalName);
                if (!$definition) {
                    throw new RuntimeException('Field ' . $originalName . ' was not found.');
                }
                $isPrimary = fetch_column_key($db, $resolvedTable, $originalName) === 'PRI';
                $currentType = strtoupper((string) $definition['column_type']);
                if ($isPrimary && $requestedPrimaryKey === $currentPrimaryKey && ($name !== $originalName || $acaciadbType !== 'AutoNumber')) {
                    throw new RuntimeException('The primary key name and data type cannot be changed in Design View.');
                }
                if ($name !== $originalName && column_exists($db, $resolvedTable, $name)) {
                    throw new RuntimeException('A field named ' . $name . ' already exists.');
                }
                if (!$isPrimary && $currentType !== strtoupper($newMysqlType)) {
                    verify_column_type_change($db, $resolvedTable, $originalName, $newMysqlType, $definition);
                    $definition['column_type'] = $newMysqlType;
                    $definition['column_default'] = null;
                }
                if ($name !== $originalName || (!$isPrimary && $currentType !== strtoupper($newMysqlType)) || $comment !== (string) ($definition['column_comment'] ?? '')) {
                    $db->query(
                        'ALTER TABLE ' . db_identifier($resolvedTable) .
                        ' CHANGE COLUMN ' . db_identifier($originalName) . ' ' . db_identifier($name) . ' ' .
                        column_definition_sql($definition, $comment)
                    );
                }
                if ($name !== $originalName && isset($metadata['columns'][$originalName])) {
                    $metadata['columns'][$name] = $metadata['columns'][$originalName];
                    unset($metadata['columns'][$originalName]);
                }
            }

            $definition = fetch_column_definition($db, $resolvedTable, $name);
            $isPrimary = fetch_column_key($db, $resolvedTable, $name) === 'PRI';
            if (!$isPrimary && $definition) {
                $required = filter_var($change['required'] ?? false, FILTER_VALIDATE_BOOL);
                if ($required && column_has_blank_values($db, $resolvedTable, $name, column_allows_empty_string_check($definition))) {
                    throw new RuntimeException($name . ' cannot be Required because it contains blank values.');
                }
                if (($definition['is_nullable'] === 'NO') !== $required) {
                    $definition['is_nullable'] = $required ? 'NO' : 'YES';
                    $db->query('ALTER TABLE ' . db_identifier($resolvedTable) . ' MODIFY COLUMN ' . db_identifier($name) . ' ' . column_definition_sql($definition, $comment));
                }

                $unique = filter_var($change['unique'] ?? false, FILTER_VALIDATE_BOOL);
                $indexed = filter_var($change['indexed'] ?? false, FILTER_VALIDATE_BOOL);
                $uniqueIndex = schema_index_name($name, true);
                $plainIndex = schema_index_name($name, false);
                if ($unique) {
                    if (column_has_duplicates($db, $resolvedTable, $name)) {
                        throw new RuntimeException($name . ' cannot be unique because it contains duplicate values.');
                    }
                    if (index_exists($db, $resolvedTable, $plainIndex)) {
                        $db->query('ALTER TABLE ' . db_identifier($resolvedTable) . ' DROP INDEX ' . db_identifier($plainIndex));
                    }
                    if (!index_exists($db, $resolvedTable, $uniqueIndex)) {
                        $db->query('ALTER TABLE ' . db_identifier($resolvedTable) . ' ADD UNIQUE INDEX ' . db_identifier($uniqueIndex) . ' (' . db_identifier($name) . ')');
                    }
                } else {
                    if (index_exists($db, $resolvedTable, $uniqueIndex)) {
                        $db->query('ALTER TABLE ' . db_identifier($resolvedTable) . ' DROP INDEX ' . db_identifier($uniqueIndex));
                    }
                    if ($indexed && !index_exists($db, $resolvedTable, $plainIndex)) {
                        $db->query('ALTER TABLE ' . db_identifier($resolvedTable) . ' ADD INDEX ' . db_identifier($plainIndex) . ' (' . db_identifier($name) . ')');
                    } elseif (!$indexed && index_exists($db, $resolvedTable, $plainIndex)) {
                        $db->query('ALTER TABLE ' . db_identifier($resolvedTable) . ' DROP INDEX ' . db_identifier($plainIndex));
                    }
                }
            }

            $metadata['columns'][$name] = array_merge($metadata['columns'][$name] ?? [], [
                'friendlyName' => $friendlyName,
                'acaciadbType' => $acaciadbType,
                'mysqlType' => $newMysqlType,
                'comment' => $comment,
                'acaciadbFormat' => (string) ($change['format'] ?? default_acaciadb_format_for_type($acaciadbType)),
                'decimalPlaces' => max(0, min(6, (int) ($change['decimalPlaces'] ?? 2))),
                'lookup' => is_array($change['lookup'] ?? null) ? $change['lookup'] : null,
                'inputMask' => (string) ($change['inputMask'] ?? ''),
                'inputMaskName' => (string) ($change['inputMaskName'] ?? ''),
                'inputMaskPlaceholder' => (string) ($change['inputMaskPlaceholder'] ?? '_'),
                'inputMaskStoreSymbols' => filter_var($change['inputMaskStoreSymbols'] ?? true, FILTER_VALIDATE_BOOL),
                'validationRule' => (string) ($change['validationRule'] ?? ''),
                'validationJavascript' => (string) ($change['validationJavascript'] ?? ''),
                'validationInterpretNatural' => filter_var($change['validationInterpretNatural'] ?? false, FILTER_VALIDATE_BOOL),
            ]);
        }

        if ($requestedPrimaryKey !== '' && strcasecmp($requestedPrimaryKey, $currentPrimaryKey) !== 0) {
            $requestedPrimaryKey = validate_field_name($requestedPrimaryKey);
            if (!column_exists($db, $resolvedTable, $requestedPrimaryKey)) {
                throw new RuntimeException('The new primary key field was not found.');
            }
            if (column_has_blank_values($db, $resolvedTable, $requestedPrimaryKey, false)) {
                throw new RuntimeException('The primary key could not be changed because ' . $requestedPrimaryKey . ' contains null values. Fill those values and try again.');
            }
            if (column_has_duplicates($db, $resolvedTable, $requestedPrimaryKey)) {
                throw new RuntimeException('The primary key could not be changed because ' . $requestedPrimaryKey . ' contains duplicate values. Remove the duplicates or choose another field.');
            }

            $alterParts = [];
            if ($currentPrimaryKey !== '') {
                $oldPrimaryDefinition = fetch_column_definition($db, $resolvedTable, $currentPrimaryKey);
                if ($oldPrimaryDefinition && stripos((string) ($oldPrimaryDefinition['extra'] ?? ''), 'auto_increment') !== false) {
                    $oldPrimaryDefinition['extra'] = trim(str_ireplace('auto_increment', '', (string) $oldPrimaryDefinition['extra']));
                    $oldPrimaryDefinition['is_nullable'] = 'YES';
                    $alterParts[] = 'MODIFY COLUMN ' . db_identifier($currentPrimaryKey) . ' ' . column_definition_sql($oldPrimaryDefinition);
                }
                $alterParts[] = 'DROP PRIMARY KEY';
            }
            $alterParts[] = 'ADD PRIMARY KEY (' . db_identifier($requestedPrimaryKey) . ')';

            try {
                $db->query('ALTER TABLE ' . db_identifier($resolvedTable) . ' ' . implode(', ', $alterParts));
            } catch (Throwable $exception) {
                throw new RuntimeException('The primary key change failed: ' . $exception->getMessage());
            }
        }

        if (isset($request['columnOrder'])) {
            if (!is_array($request['columnOrder'])) throw new RuntimeException('Invalid field order.');
            $metadata['columnOrder'] = array_values(array_unique(array_map(
                fn ($name) => validate_field_name((string) $name), $request['columnOrder']
            )));
        }
        $metadata['tableProperties'] = is_array($request['tableProperties'] ?? null) ? $request['tableProperties'] : [];
        save_table_metadata($db, $resolvedTable, $metadata);
        json_response([
            'ok' => true,
            'table' => $resolvedTable,
            'payload' => schema_table_payload($db, $resolvedTable, $request),
        ]);
        exit;
    }

    if ($action === 'addColumn') {
        $fieldName = validate_field_name((string) ($request['name'] ?? ''));
        $type = validate_acaciadb_column_type((string) ($request['type'] ?? 'Short Text'));
        $friendlyName = trim((string) ($request['friendlyName'] ?? ''));
        $comment = trim((string) ($request['comment'] ?? ''));
        $afterColumn = trim((string) ($request['afterColumn'] ?? ''));
        $quickDefinition = quick_start_definition($type);
        $storageAcaciaDBType = (string) ($quickDefinition['acaciadbType'] ?? $type);
        $storageMysqlType = (string) ($quickDefinition['mysqlType'] ?? mysql_column_type_for_acaciadb_type($storageAcaciaDBType));
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
        update_column_metadata($db, $resolvedTable, $fieldName, $friendlyName, $storageAcaciaDBType, $storageMysqlType);
        if (isset($quickDefinition['lookup'])) {
            $metadata = fetch_table_metadata($db, $resolvedTable);
            $metadata['columns'][$fieldName]['lookup'] = $quickDefinition['lookup'];
            save_table_metadata($db, $resolvedTable, $metadata);
        }

        json_response([
            'ok' => true,
            'table' => $resolvedTable,
            'payload' => schema_table_payload($db, $resolvedTable, $request),
        ]);
        exit;
    }

    if ($action === 'createLookupField') {
        $fieldName = validate_field_name((string) ($request['name'] ?? ''));
        $friendlyName = trim((string) ($request['friendlyName'] ?? $request['label'] ?? ''));
        $comment = trim((string) ($request['comment'] ?? ''));
        $afterColumn = trim((string) ($request['afterColumn'] ?? ''));
        $lookup = normalize_lookup_config($db, $resolvedTable, is_array($request['lookup'] ?? null) ? $request['lookup'] : []);
        $metadata = fetch_table_metadata($db, $resolvedTable);
        $position = lookup_column_position($db, $resolvedTable, $afterColumn);

        if ($friendlyName === '') {
            $friendlyName = (string) ($lookup['label'] ?? '');
        }
        if ($friendlyName === '') {
            $friendlyName = label_from_column($fieldName);
        }

        if (column_exists($db, $resolvedTable, $fieldName) || isset($metadata['columns'][$fieldName])) {
            throw new RuntimeException('A field with that name already exists.');
        }

        $afterClause = '';
        if ($afterColumn !== '' && column_exists($db, $resolvedTable, $afterColumn)) {
            $afterColumn = validate_field_name($afterColumn);
            $afterClause = ' AFTER ' . db_identifier($afterColumn);
        }

        $mysqlType = lookup_storage_mysql_type($lookup);
        $virtual = $mysqlType === null;

        if (!$virtual) {
            $db->query(
                'ALTER TABLE ' . db_identifier($resolvedTable) .
                ' ADD COLUMN ' . db_identifier($fieldName) . ' ' . $mysqlType . ' NULL' .
                ($comment !== '' ? " COMMENT '" . addslashes($comment) . "'" : '') .
                $afterClause
            );
        }

        $metadata['columns'] ??= [];
        $metadata['columns'][$fieldName] = array_merge($metadata['columns'][$fieldName] ?? [], [
            'friendlyName' => $friendlyName,
            'acaciadbType' => 'Lookup & Relationship',
            'mysqlType' => $mysqlType ?? (string) ($lookup['keyMysqlType'] ?? ''),
            'acaciadbFormat' => '',
            'decimalPlaces' => 2,
            'virtual' => $virtual,
            'position' => $position,
            'positionAfter' => $afterColumn,
            'comment' => $comment,
            'lookup' => $lookup,
        ]);
        save_table_metadata($db, $resolvedTable, $metadata);

        json_response([
            'ok' => true,
            'table' => $resolvedTable,
            'payload' => schema_table_payload($db, $resolvedTable, $request),
        ]);
        exit;
    }

    if ($action === 'updateLookupField') {
        $columnName = validate_field_name((string) ($request['column'] ?? ''));
        $metadata = fetch_table_metadata($db, $resolvedTable);
        $isPhysical = column_exists($db, $resolvedTable, $columnName);
        $isVirtual = !empty($metadata['columns'][$columnName]['virtual']);
        if (!$isPhysical && !$isVirtual) {
            throw new RuntimeException('Field was not found.');
        }
        $existingLookup = $metadata['columns'][$columnName]['lookup'] ?? null;
        if (!is_array($existingLookup)) {
            throw new RuntimeException('The selected field is not a lookup field.');
        }

        $lookup = normalize_lookup_config($db, $resolvedTable, is_array($request['lookup'] ?? null) ? $request['lookup'] : [], $existingLookup);
        $friendlyName = trim((string) ($request['friendlyName'] ?? $request['label'] ?? $metadata['columns'][$columnName]['friendlyName'] ?? ''));
        $metadata['columns'] ??= [];
        $metadata['columns'][$columnName] ??= [];
        $metadata['columns'][$columnName]['friendlyName'] = $friendlyName;
        $metadata['columns'][$columnName]['acaciadbType'] = 'Lookup & Relationship';
        $metadata['columns'][$columnName]['lookup'] = $lookup;
        $metadata['columns'][$columnName]['mysqlType'] = lookup_storage_mysql_type($lookup) ?? (string) ($lookup['keyMysqlType'] ?? '');
        save_table_metadata($db, $resolvedTable, $metadata);

        json_response([
            'ok' => true,
            'table' => $resolvedTable,
            'payload' => schema_table_payload($db, $resolvedTable, $request),
        ]);
        exit;
    }

    if ($action === 'deleteColumn') {
        $columnName = validate_field_name((string) ($request['column'] ?? ''));
        $metadata = fetch_table_metadata($db, $resolvedTable);
        $isPhysical = column_exists($db, $resolvedTable, $columnName);
        $isVirtual = !empty($metadata['columns'][$columnName]['virtual']);
        if (!$isPhysical && !$isVirtual) {
            throw new RuntimeException('Field was not found.');
        }
        if ($isPhysical && fetch_column_key($db, $resolvedTable, $columnName) === 'PRI') {
            throw new RuntimeException('Primary key fields cannot be deleted.');
        }

        $relationshipTable = $isVirtual
            ? (string) ($metadata['columns'][$columnName]['lookup']['relationshipTable'] ?? '')
            : '';
        if ($isPhysical) {
            $db->query('ALTER TABLE ' . db_identifier($resolvedTable) . ' DROP COLUMN ' . db_identifier($columnName));
        }
        unset($metadata['columns'][$columnName]);
        save_table_metadata($db, $resolvedTable, $metadata);
        if ($relationshipTable !== '') {
            $stillUsed = false;
            foreach ((array) ($metadata['columns'] ?? []) as $definition) {
                if (($definition['lookup']['relationshipTable'] ?? '') === $relationshipTable) {
                    $stillUsed = true;
                    break;
                }
            }
            if (!$stillUsed && physical_table_exists($db, $relationshipTable)) {
                $db->query('DROP TABLE ' . db_identifier($relationshipTable));
            }
        }

        json_response([
            'ok' => true,
            'table' => $resolvedTable,
            'payload' => schema_table_payload($db, $resolvedTable, $request),
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
        $metadata['columns'][$columnName]['acaciadbType'] = 'Calculated Field';
        $metadata['columns'][$columnName]['calculatedExpression'] = $expression;
        $metadata['columns'][$columnName]['calculatedJavascript'] = $javascript;
        $metadata['columns'][$columnName]['calculatedInterpretNatural'] = $interpretNatural;
        save_table_metadata($db, $resolvedTable, $metadata);

        json_response([
            'ok' => true,
            'table' => $resolvedTable,
            'payload' => schema_table_payload($db, $resolvedTable, $request),
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
            'payload' => schema_table_payload($db, $resolvedTable, $request),
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
            'payload' => schema_table_payload($db, $resolvedTable, $request),
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
            'payload' => schema_table_payload($db, $resolvedTable, $request),
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
            'payload' => schema_table_payload($db, $resolvedTable, $request),
        ]);
        exit;
    }

    if ($action === 'setMemoSetting') {
        $columnName = validate_field_name((string) ($request['column'] ?? ''));
        $setting = (string) ($request['setting'] ?? '');
        $enabled = filter_var($request['enabled'] ?? false, FILTER_VALIDATE_BOOL);

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

        $acaciadbType = (string) ($column['acaciadbType'] ?? $column['type'] ?? '');
        if (!in_array($acaciadbType, ['Long Text', 'HTML Text', 'Rich Text'], true)) {
            throw new RuntimeException('Memo Settings are only available for Long Text fields.');
        }

        $metadata = fetch_table_metadata($db, $resolvedTable);
        $metadata['columns'] ??= [];
        $metadata['columns'][$columnName] ??= [];

        if ($setting === 'appendOnly') {
            ensure_column_history_storage($db);
            $metadata['columns'][$columnName]['appendOnly'] = $enabled;
        } elseif ($setting === 'htmlText') {
            $metadata['columns'][$columnName]['acaciadbType'] = $enabled ? 'HTML Text' : 'Long Text';
        } else {
            throw new RuntimeException('Unsupported Memo Setting.');
        }

        save_table_metadata($db, $resolvedTable, $metadata);

        json_response([
            'ok' => true,
            'table' => $resolvedTable,
            'payload' => schema_table_payload($db, $resolvedTable, $request),
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

        $acaciadbType = (string) ($column['acaciadbType'] ?? $column['type'] ?? 'Short Text');
        $allowedFormats = allowed_acaciadb_formats_for_type($acaciadbType);
        if (!$allowedFormats) {
            throw new RuntimeException('This field type does not support a Format setting.');
        }

        if ($format === '') {
            $format = default_acaciadb_format_for_type($acaciadbType);
        }

        if (!in_array($format, $allowedFormats, true)) {
            throw new RuntimeException('Unsupported format for ' . $acaciadbType . '.');
        }

        $metadata = fetch_table_metadata($db, $resolvedTable);
        $metadata['columns'] ??= [];
        $metadata['columns'][$columnName] ??= [];
        $metadata['columns'][$columnName]['acaciadbType'] = $acaciadbType;
        $metadata['columns'][$columnName]['mysqlType'] = (string) ($column['actualMysqlType'] ?? $column['mysqlType'] ?? '');
        $metadata['columns'][$columnName]['acaciadbFormat'] = $format;
        $metadata['columns'][$columnName]['decimalPlaces'] = $decimalPlaces;
        save_table_metadata($db, $resolvedTable, $metadata);

        json_response([
            'ok' => true,
            'table' => $resolvedTable,
            'payload' => schema_table_payload($db, $resolvedTable, $request),
        ]);
        exit;
    }

    if ($action === 'setColumnType') {
        $columnName = validate_field_name((string) ($request['column'] ?? ''));
        $acaciadbType = validate_acaciadb_column_type((string) ($request['acaciadbType'] ?? $request['type'] ?? 'Short Text'));
        $newType = mysql_column_type_for_acaciadb_type($acaciadbType);

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
        $metadata['columns'][$columnName]['acaciadbType'] = $acaciadbType;
        $metadata['columns'][$columnName]['mysqlType'] = $newType;
        $metadata['columns'][$columnName]['acaciadbFormat'] = default_acaciadb_format_for_type($acaciadbType);
        $metadata['columns'][$columnName]['decimalPlaces'] = 2;
        save_table_metadata($db, $resolvedTable, $metadata);

        json_response([
            'ok' => true,
            'table' => $resolvedTable,
            'payload' => schema_table_payload($db, $resolvedTable, $request),
        ]);
        exit;
    }

    throw new RuntimeException('Unsupported schema action.');
} catch (Throwable $exception) {
    json_response(['ok' => false, 'error' => $exception->getMessage()], 400);
}
