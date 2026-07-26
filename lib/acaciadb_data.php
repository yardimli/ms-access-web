<?php

require_once __DIR__ . '/db.php';

function acaciadb_slug(string $name): string
{
    $name = preg_replace('/(?<!^)[A-Z]/', '-$0', $name);
    $name = preg_replace('/[^A-Za-z0-9]+/', '-', $name);
    return strtolower(trim($name, '-'));
}

function acaciadb_type_from_mysql(string $dataType, string $columnType, string $columnKey): string
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

function default_acaciadb_format(string $acaciadbType): string
{
    return match ($acaciadbType) {
        'Currency' => 'Currency',
        'Number', 'Large Number' => 'General Number',
        'Date/Time' => 'General Date',
        'Yes/No' => 'Yes/No',
        default => '',
    };
}

function canonical_mysql_type(string $dataType, string $columnType): string
{
    $dataType = strtolower($dataType);
    $columnType = strtoupper($columnType);

    return match ($dataType) {
        'tinyint' => str_contains($columnType, 'TINYINT(1)') ? 'TINYINT(1)' : 'INT',
        'int', 'integer', 'smallint', 'mediumint' => 'INT',
        'bigint' => 'BIGINT',
        'decimal', 'numeric' => 'DECIMAL(12,2)',
        'varchar', 'char' => $columnType,
        'text', 'mediumtext', 'longtext' => 'TEXT',
        'date' => 'DATE',
        'time' => 'TIME',
        'timestamp' => 'TIMESTAMP',
        'datetime' => 'DATETIME',
        default => $columnType,
    };
}

function label_from_column(string $name): string
{
    $label = preg_replace('/(?<!^)([A-Z])/', ' $1', $name);
    $label = str_replace('_', ' ', $label);
    return trim($label);
}

function acaciadb_internal_table_exists(mysqli $db, string $tableName): bool
{
    $stmt = $db->prepare(
        'SELECT 1 FROM information_schema.tables
         WHERE table_schema = DATABASE() AND table_name = ? LIMIT 1'
    );
    $stmt->bind_param('s', $tableName);
    $stmt->execute();
    return (bool) $stmt->get_result()->fetch_assoc();
}

function migrate_acaciadb_definition_keys(mixed $value): mixed
{
    if (!is_array($value)) {
        return $value;
    }

    $legacyPrefix = 'acc' . 'ess';
    $keyMap = [
        $legacyPrefix . 'Type' => 'acaciadbType',
        $legacyPrefix . 'Format' => 'acaciadbFormat',
        'inferred' . ucfirst($legacyPrefix) . 'Type' => 'inferredAcaciaDBType',
    ];
    $migrated = [];
    foreach ($value as $key => $item) {
        $nextKey = is_string($key) ? ($keyMap[$key] ?? $key) : $key;
        $migrated[$nextKey] = migrate_acaciadb_definition_keys($item);
    }
    return $migrated;
}

function migrate_acaciadb_definition_rows(mysqli $db): void
{
    $result = $db->query('SELECT id, definition_json FROM acaciadb_object_definitions');
    $stmt = $db->prepare('UPDATE acaciadb_object_definitions SET definition_json = ? WHERE id = ?');
    foreach ($result as $row) {
        $decoded = json_decode($row['definition_json'], true, 512, JSON_THROW_ON_ERROR);
        $migrated = migrate_acaciadb_definition_keys($decoded);
        if ($migrated === $decoded) {
            continue;
        }
        $json = json_encode($migrated, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        $id = (int) $row['id'];
        $stmt->bind_param('si', $json, $id);
        $stmt->execute();
    }
}

function ensure_acaciadb_storage(mysqli $db): void
{
    static $initialized = [];
    $cacheKey = spl_object_id($db) . ':' . (string) $db->thread_id;
    if (isset($initialized[$cacheKey])) {
        return;
    }

    $legacyPrefix = 'acc' . 'ess';
    $legacyDefinitions = $legacyPrefix . '_object_definitions';
    $legacyHistory = $legacyPrefix . '_column_history';

    if (acaciadb_internal_table_exists($db, $legacyDefinitions) && !acaciadb_internal_table_exists($db, 'acaciadb_object_definitions')) {
        $db->query('RENAME TABLE ' . db_identifier($legacyDefinitions) . ' TO acaciadb_object_definitions');
    }

    $db->query(
        'CREATE TABLE IF NOT EXISTS acaciadb_object_definitions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            object_type ENUM("form", "query", "report", "table") NOT NULL,
            object_name VARCHAR(120) NOT NULL,
            definition_json JSON NOT NULL,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY object_unique (object_type, object_name)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
    );

    if (acaciadb_internal_table_exists($db, $legacyDefinitions)) {
        $db->query(
            'INSERT INTO acaciadb_object_definitions (object_type, object_name, definition_json, updated_at)
             SELECT object_type, object_name, definition_json, updated_at FROM ' . db_identifier($legacyDefinitions) . '
             ON DUPLICATE KEY UPDATE definition_json = VALUES(definition_json), updated_at = VALUES(updated_at)'
        );
        $db->query('DROP TABLE ' . db_identifier($legacyDefinitions));
    }

    if (acaciadb_internal_table_exists($db, $legacyHistory) && !acaciadb_internal_table_exists($db, 'acaciadb_column_history')) {
        $db->query('RENAME TABLE ' . db_identifier($legacyHistory) . ' TO acaciadb_column_history');
    }

    $db->query(
        'CREATE TABLE IF NOT EXISTS acaciadb_column_history (
            id INT AUTO_INCREMENT PRIMARY KEY,
            table_name VARCHAR(128) NOT NULL,
            column_name VARCHAR(128) NOT NULL,
            primary_key_value VARCHAR(255) NOT NULL,
            value_text LONGTEXT NULL,
            changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4'
    );

    if (acaciadb_internal_table_exists($db, $legacyHistory)) {
        $db->query(
            'INSERT INTO acaciadb_column_history (table_name, column_name, primary_key_value, value_text, changed_at)
             SELECT table_name, column_name, primary_key_value, value_text, changed_at FROM ' . db_identifier($legacyHistory)
        );
        $db->query('DROP TABLE ' . db_identifier($legacyHistory));
    }

    $indexes = [];
    foreach ($db->query('SHOW INDEX FROM acaciadb_column_history') as $index) {
        $indexes[(string) $index['Key_name']] = true;
    }
    foreach (array_keys($indexes) as $indexName) {
        if (str_contains(strtolower($indexName), $legacyPrefix)) {
            $db->query('ALTER TABLE acaciadb_column_history DROP INDEX ' . db_identifier($indexName));
            unset($indexes[$indexName]);
        }
    }
    if (!isset($indexes['idx_acaciadb_column_history_lookup'])) {
        $db->query(
            'ALTER TABLE acaciadb_column_history
             ADD INDEX idx_acaciadb_column_history_lookup (table_name, column_name, primary_key_value, changed_at)'
        );
    }

    $result = $db->query("SHOW COLUMNS FROM acaciadb_object_definitions LIKE 'object_type'");
    $column = $result->fetch_assoc();
    $type = strtolower((string) ($column['Type'] ?? ''));

    if ($column && str_contains($type, 'enum') && !str_contains($type, "'table'")) {
        $db->query('ALTER TABLE acaciadb_object_definitions MODIFY object_type ENUM("form", "query", "report", "table") NOT NULL');
    }

    migrate_acaciadb_definition_rows($db);
    $initialized[$cacheKey] = true;
}

function ensure_table_metadata_storage(mysqli $db): void
{
    ensure_acaciadb_storage($db);
}

function ensure_column_history_storage(mysqli $db): void
{
    ensure_acaciadb_storage($db);
}

function fetch_table_metadata(mysqli $db, string $tableName): array
{
    ensure_table_metadata_storage($db);
    $stmt = $db->prepare(
        'SELECT definition_json
         FROM acaciadb_object_definitions
         WHERE object_type = "table"
           AND LOWER(object_name) = LOWER(?)
         LIMIT 1'
    );
    $stmt->bind_param('s', $tableName);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();

    if (!$row) {
        return ['columns' => []];
    }

    $metadata = json_decode($row['definition_json'], true, 512, JSON_THROW_ON_ERROR);
    return is_array($metadata) ? $metadata : ['columns' => []];
}

function save_table_metadata(mysqli $db, string $tableName, array $metadata): void
{
    ensure_table_metadata_storage($db);
    $json = json_encode($metadata, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    $stmt = $db->prepare(
        'INSERT INTO acaciadb_object_definitions (object_type, object_name, definition_json)
         VALUES ("table", ?, ?)
         ON DUPLICATE KEY UPDATE definition_json = VALUES(definition_json)'
    );
    $stmt->bind_param('ss', $tableName, $json);
    $stmt->execute();
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
    ensure_acaciadb_storage($db);
    $result = $db->query('SHOW FULL TABLES WHERE Table_type = "BASE TABLE"');
    $tables = [];

    foreach ($result as $row) {
        $table = array_values($row)[0];
        if (
            !in_array($table, ['acaciadb_object_definitions', 'acaciadb_column_history'], true)
            && !str_ends_with(strtolower($table), '_relationship')
        ) {
            $tables[] = $table;
        }
    }

    return $tables;
}

function physical_table_exists(mysqli $db, string $tableName): bool
{
    $stmt = $db->prepare(
        'SELECT 1
         FROM information_schema.tables
         WHERE table_schema = DATABASE()
           AND table_name = ?
         LIMIT 1'
    );
    $stmt->bind_param('s', $tableName);
    $stmt->execute();

    return (bool) $stmt->get_result()->fetch_assoc();
}

function lookup_option_value(mixed $option): string
{
    return is_array($option) ? (string) ($option['key'] ?? '') : (string) $option;
}

function lookup_option_label(mixed $option): string
{
    return is_array($option) ? (string) ($option['value'] ?? $option['label'] ?? $option['key'] ?? '') : (string) $option;
}

function hydrate_lookup_metadata(mysqli $db, string $tableName, array $columns, string $primaryKey): array
{
    foreach ($columns as &$column) {
        $lookup = $column['lookup'] ?? null;
        if (!is_array($lookup)) {
            continue;
        }

        if (($lookup['kind'] ?? 'static') === 'table') {
            $sourceName = resolve_table_name($db, (string) ($lookup['sourceObjectName'] ?? $lookup['sourceTable'] ?? ''));
            if (!$sourceName) {
                $column['lookup'] = $lookup;
                continue;
            }

            [$sourceColumns] = fetch_table_columns($db, $sourceName);
            $sourceColumnNames = array_map(fn (array $item): string => $item['name'], $sourceColumns);
            $keyColumn = (string) ($lookup['keyColumn'] ?? '');
            if ($keyColumn === '' || !in_array($keyColumn, $sourceColumnNames, true)) {
                $keyColumn = $sourceColumns[0]['name'] ?? '';
            }
            $displayColumns = array_values(array_filter(
                (array) ($lookup['displayColumns'] ?? $lookup['selectedFields'] ?? []),
                fn ($name): bool => in_array((string) $name, $sourceColumnNames, true)
            ));
            if (!$displayColumns) {
                $displayColumns = array_slice(array_values(array_filter($sourceColumnNames, fn ($name): bool => $name !== $keyColumn)), 0, 1);
            }
            if (!$displayColumns && $keyColumn !== '') {
                $displayColumns = [$keyColumn];
            }

            $selectColumns = array_values(array_unique(array_filter(array_merge([$keyColumn], $displayColumns))));
            $orderSql = '';
            $sorts = array_values(array_filter((array) ($lookup['sort'] ?? []), fn ($sort): bool => is_array($sort) && in_array((string) ($sort['field'] ?? ''), $sourceColumnNames, true)));
            if ($sorts) {
                $parts = array_map(
                    fn (array $sort): string => db_identifier((string) $sort['field']) . ' ' . (strtolower((string) ($sort['direction'] ?? 'asc')) === 'desc' ? 'DESC' : 'ASC'),
                    array_slice($sorts, 0, 4)
                );
                $orderSql = ' ORDER BY ' . implode(', ', $parts);
            }

            $result = $db->query(
                'SELECT ' . implode(', ', array_map('db_identifier', $selectColumns)) .
                ' FROM ' . db_identifier($sourceName) . $orderSql . ' LIMIT 500'
            );
            $source = [];
            foreach ($result as $row) {
                $labelParts = [];
                foreach ($displayColumns as $displayColumn) {
                    $labelParts[] = (string) ($row[$displayColumn] ?? '');
                }
                $source[] = [
                    'key' => (string) ($row[$keyColumn] ?? ''),
                    'value' => trim(implode(' ', array_filter($labelParts, fn ($value): bool => $value !== ''))) ?: (string) ($row[$keyColumn] ?? ''),
                    'row' => $row,
                ];
            }

            $lookup['sourceObjectName'] = $sourceName;
            $lookup['keyColumn'] = $keyColumn;
            $lookup['displayColumns'] = $displayColumns;
            $lookup['source'] = $source;
            $column['lookup'] = $lookup;
        }
    }
    unset($column);

    return $columns;
}

function fetch_table_columns(mysqli $db, string $tableName): array
{
    $metadata = fetch_table_metadata($db, $tableName);
    $columnMetadata = $metadata['columns'] ?? [];
    $stmt = $db->prepare(
        'SELECT column_name, data_type, column_type, column_key, column_comment, is_nullable,
                character_maximum_length, numeric_precision
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
        $inferredAcaciaDBType = acaciadb_type_from_mysql($row['data_type'], $row['column_type'], $row['column_key']);
        $columnDefinition = $columnMetadata[$row['column_name']] ?? [];
        $acaciadbType = is_array($columnDefinition['lookup'] ?? null)
            ? 'Lookup & Relationship'
            : (string) ($columnDefinition['acaciadbType'] ?? $inferredAcaciaDBType);
        $friendlyName = trim((string) ($columnMetadata[$row['column_name']]['friendlyName'] ?? ''));
        $fieldSize = $row['character_maximum_length'] ?: $row['numeric_precision'];
        $mysqlType = canonical_mysql_type($row['data_type'], $row['column_type']);
        $columns[] = [
            'name' => $row['column_name'],
            'label' => $friendlyName !== '' ? $friendlyName : $row['column_name'],
            'friendlyName' => $friendlyName,
            'acaciadbType' => $acaciadbType,
            'acaciadbFormat' => (string) ($columnMetadata[$row['column_name']]['acaciadbFormat'] ?? default_acaciadb_format($acaciadbType)),
            'decimalPlaces' => (int) ($columnMetadata[$row['column_name']]['decimalPlaces'] ?? 2),
            'lookup' => $columnMetadata[$row['column_name']]['lookup'] ?? null,
            'appendOnly' => (bool) ($columnMetadata[$row['column_name']]['appendOnly'] ?? false),
            'defaultExpression' => (string) ($columnMetadata[$row['column_name']]['defaultExpression'] ?? ''),
            'defaultJavascript' => (string) ($columnMetadata[$row['column_name']]['defaultJavascript'] ?? ''),
            'defaultInterpretNatural' => (bool) ($columnMetadata[$row['column_name']]['defaultInterpretNatural'] ?? false),
            'calculatedExpression' => (string) ($columnMetadata[$row['column_name']]['calculatedExpression'] ?? ''),
            'calculatedJavascript' => (string) ($columnMetadata[$row['column_name']]['calculatedJavascript'] ?? ''),
            'calculatedInterpretNatural' => (bool) ($columnMetadata[$row['column_name']]['calculatedInterpretNatural'] ?? false),
            'validationRule' => (string) ($columnMetadata[$row['column_name']]['validationRule'] ?? ''),
            'validationJavascript' => (string) ($columnMetadata[$row['column_name']]['validationJavascript'] ?? ''),
            'validationInterpretNatural' => (bool) ($columnMetadata[$row['column_name']]['validationInterpretNatural'] ?? false),
            'comment' => $row['column_comment'] ?? '',
            'type' => $acaciadbType,
            'inferredAcaciaDBType' => $inferredAcaciaDBType,
            'mysqlType' => (string) ($columnMetadata[$row['column_name']]['mysqlType'] ?? $mysqlType),
            'actualMysqlType' => $mysqlType,
            'fieldSize' => $fieldSize ? (int) $fieldSize : null,
            'primaryKey' => $row['column_key'] === 'PRI',
            'required' => strtoupper((string) $row['is_nullable']) === 'NO',
            'unique' => in_array($row['column_key'], ['PRI', 'UNI'], true),
            'indexed' => $row['column_key'] !== '',
            'width' => width_for_column($row['column_name'], $acaciadbType),
        ];

        if ($row['column_key'] === 'PRI') {
            $primaryKey = $row['column_name'];
        }
    }

    $physicalNames = array_map(fn (array $column): string => strtolower((string) $column['name']), $columns);
    $virtualColumns = [];
    foreach ($columnMetadata as $columnName => $columnDefinition) {
        if (empty($columnDefinition['virtual']) || in_array(strtolower((string) $columnName), $physicalNames, true)) {
            continue;
        }
        $lookup = is_array($columnDefinition['lookup'] ?? null) ? $columnDefinition['lookup'] : null;
        if (!$lookup) {
            continue;
        }
        $friendlyName = trim((string) ($columnDefinition['friendlyName'] ?? ''));
        $virtualColumns[] = [
            'position' => max(0, (int) ($columnDefinition['position'] ?? count($columns))),
            'column' => [
                'name' => (string) $columnName,
                'label' => $friendlyName !== '' ? $friendlyName : (string) $columnName,
                'friendlyName' => $friendlyName,
                'acaciadbType' => 'Lookup & Relationship',
                'acaciadbFormat' => '',
                'decimalPlaces' => 2,
                'lookup' => $lookup,
                'appendOnly' => false,
                'defaultExpression' => '',
                'defaultJavascript' => '',
                'defaultInterpretNatural' => false,
                'calculatedExpression' => '',
                'calculatedJavascript' => '',
                'calculatedInterpretNatural' => false,
                'validationRule' => '',
                'validationJavascript' => '',
                'validationInterpretNatural' => false,
                'comment' => (string) ($columnDefinition['comment'] ?? ''),
                'type' => 'Lookup & Relationship',
                'inferredAcaciaDBType' => 'Lookup & Relationship',
                'mysqlType' => (string) ($columnDefinition['mysqlType'] ?? ''),
                'actualMysqlType' => '',
                'fieldSize' => null,
                'primaryKey' => false,
                'required' => false,
                'unique' => false,
                'indexed' => false,
                'virtual' => true,
                'width' => (int) ($columnDefinition['width'] ?? 150),
            ],
        ];
    }
    usort($virtualColumns, fn (array $left, array $right): int => $left['position'] <=> $right['position']);
    foreach ($virtualColumns as $virtualColumn) {
        array_splice($columns, min(count($columns), $virtualColumn['position']), 0, [$virtualColumn['column']]);
    }

    return [$columns, $primaryKey ?? ($columns[0]['name'] ?? '')];
}

function normalize_table_page(int $skip = 0, int $limit = 500): array
{
    return [max(0, $skip), max(1, min(2000, $limit))];
}

function fetch_table_row_count(mysqli $db, string $tableName): int
{
    $result = $db->query('SELECT COUNT(*) AS total_rows FROM ' . db_identifier($tableName));
    return (int) (($result->fetch_assoc()['total_rows'] ?? 0));
}

function fetch_table_indexes(mysqli $db, string $tableName): array
{
    $stmt = $db->prepare(
        'SELECT index_name, column_name, non_unique, seq_in_index, collation
         FROM information_schema.statistics
         WHERE table_schema = DATABASE()
           AND table_name = ?
         ORDER BY index_name, seq_in_index'
    );
    $stmt->bind_param('s', $tableName);
    $stmt->execute();
    $indexes = [];
    foreach ($stmt->get_result() as $row) {
        $indexes[] = [
            'name' => (string) $row['index_name'],
            'field' => (string) $row['column_name'],
            'primary' => strtoupper((string) $row['index_name']) === 'PRIMARY',
            'unique' => (int) $row['non_unique'] === 0,
            'sequence' => (int) $row['seq_in_index'],
            'sortOrder' => strtoupper((string) ($row['collation'] ?? 'A')) === 'D' ? 'Descending' : 'Ascending',
        ];
    }
    return $indexes;
}

function fetch_table_rows(mysqli $db, string $tableName, string $primaryKey = '', int $skip = 0, int $limit = 500): array
{
    [$skip, $limit] = normalize_table_page($skip, $limit);
    $orderSql = $primaryKey !== '' ? ' ORDER BY ' . db_identifier($primaryKey) : '';
    $result = $db->query(
        'SELECT * FROM ' . db_identifier($tableName) . $orderSql .
        ' LIMIT ' . $limit . ' OFFSET ' . $skip
    );
    $rows = [];

    foreach ($result as $row) {
        $rows[] = $row;
    }

    return $rows;
}

function fetch_table_row_by_primary_key(mysqli $db, string $tableName, string $primaryKey, mixed $value): ?array
{
    if ($primaryKey === '' || $value === null || $value === '') {
        return null;
    }

    $stmt = $db->prepare('SELECT * FROM ' . db_identifier($tableName) . ' WHERE ' . db_identifier($primaryKey) . ' = ? LIMIT 1');
    $value = (string) $value;
    $stmt->bind_param('s', $value);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();

    return $row ?: null;
}

function fetch_table_payload(mysqli $db, string $tableName, bool $includeRows = true, int $skip = 0, int $limit = 500): array
{
    [$columns, $primaryKey] = fetch_table_columns($db, $tableName);
    $columns = hydrate_lookup_metadata($db, $tableName, $columns, $primaryKey);
    $payload = [
        'structure' => [
            'primaryKey' => $primaryKey,
            'columns' => $columns,
            'indexes' => fetch_table_indexes($db, $tableName),
            'tableProperties' => (array) (fetch_table_metadata($db, $tableName)['tableProperties'] ?? []),
        ],
    ];

    if ($includeRows) {
        [$skip, $limit] = normalize_table_page($skip, $limit);
        $totalRows = fetch_table_row_count($db, $tableName);
        if ($totalRows > 0 && $skip >= $totalRows) {
            $skip = (int) (floor(($totalRows - 1) / $limit) * $limit);
        }
        $rows = fetch_table_rows($db, $tableName, $primaryKey, $skip, $limit);
        foreach ($columns as $column) {
            $lookup = $column['lookup'] ?? null;
            if (
                is_array($lookup)
                && ($lookup['kind'] ?? 'static') === 'table'
                && ($lookup['mode'] ?? 'single') === 'multiple'
                && ($lookup['storageMode'] ?? '') === 'json'
            ) {
                foreach ($rows as &$row) {
                    $stored = json_decode((string) ($row[$column['name']] ?? ''), true);
                    if (!is_array($stored)) {
                        $stored = [];
                    }
                    $row[$column['name']] = implode(',', array_values(array_filter(array_map(
                        fn ($item): string => is_array($item) ? (string) ($item['key'] ?? '') : (string) $item,
                        $stored
                    ), fn (string $value): bool => $value !== '')));
                }
                unset($row);
                continue;
            }
            if (
                !is_array($lookup)
                || ($lookup['kind'] ?? 'static') !== 'table'
                || ($lookup['mode'] ?? 'single') !== 'multiple'
                || empty($lookup['relationshipTable'])
                || empty($lookup['localKeyColumn'])
                || empty($lookup['remoteKeyColumn'])
                || $primaryKey === ''
            ) {
                continue;
            }

            $relationshipTable = (string) $lookup['relationshipTable'];
            if (!physical_table_exists($db, $relationshipTable)) {
                continue;
            }
            $localColumn = (string) $lookup['localKeyColumn'];
            $remoteColumn = (string) $lookup['remoteKeyColumn'];
            $localValues = array_values(array_unique(array_filter(
                array_map(fn (array $row): string => (string) ($row[$primaryKey] ?? ''), $rows),
                fn (string $value): bool => $value !== ''
            )));
            if (!$localValues) {
                continue;
            }
            $map = [];
            $result = $db->query(
                'SELECT ' . db_identifier($localColumn) . ', ' . db_identifier($remoteColumn) .
                ' FROM ' . db_identifier($relationshipTable) .
                ' WHERE ' . db_identifier($localColumn) . ' IN (' . implode(', ', array_map(
                    fn (string $value): string => "'" . $db->real_escape_string($value) . "'",
                    $localValues
                )) . ')'
            );
            foreach ($result as $relationshipRow) {
                $localValue = (string) ($relationshipRow[$localColumn] ?? '');
                if ($localValue === '') {
                    continue;
                }
                $map[$localValue] ??= [];
                $map[$localValue][] = (string) ($relationshipRow[$remoteColumn] ?? '');
            }
            foreach ($rows as &$row) {
                $row[$column['name']] = implode(',', $map[(string) ($row[$primaryKey] ?? '')] ?? []);
            }
            unset($row);
        }
        $payload['data'] = $rows;
        $payload['pagination'] = [
            'skip' => $skip,
            'limit' => $limit,
            'total' => $totalRows,
            'returned' => count($rows),
            'hasPrevious' => $skip > 0,
            'hasNext' => $skip + count($rows) < $totalRows,
        ];
    }

    return $payload;
}

function fetch_object_names(mysqli $db, string $type): array
{
    ensure_acaciadb_storage($db);
    $stmt = $db->prepare('SELECT object_name FROM acaciadb_object_definitions WHERE object_type = ? ORDER BY object_name');
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
    ensure_acaciadb_storage($db);
    $stmt = $db->prepare(
        'SELECT object_name, definition_json
         FROM acaciadb_object_definitions
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
    ensure_acaciadb_storage($db);
    $stmt = $db->prepare(
        'SELECT definition_json
         FROM acaciadb_object_definitions
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
