<?php

// Live engine metadata for the schema dialogs; never derive constraints from UI labels.
function table_management_state(mysqli|SQLiteConnection $db, string $table): array
{
    [$columns] = fetch_table_columns($db, $table);
    $state = ['columns' => $columns, 'indexes' => [], 'foreignKeys' => [],
        'options' => database_schema_options($db), 'tables' => fetch_table_names($db),
        'name' => $table, 'storageEngine' => '', 'collation' => '', 'comment' => '',
        'autoColumn' => '', 'nextAutoIncrement' => '', 'engines' => []];
    if ($db instanceof SQLiteConnection) {
        foreach ($db->pdo->query('PRAGMA index_list(' . db_identifier($table) . ')') as $index) {
            $parts = [];
            foreach ($db->pdo->query('PRAGMA index_xinfo(' . db_identifier($index['name']) . ')') as $part) {
                if (!$part['key']) continue;
                $parts[] = ['name' => $part['name'], 'prefix' => '', 'direction' => $part['desc'] ? 'DESC' : 'ASC'];
            }
            $state['indexes'][] = ['name' => $index['name'], 'type' => $index['unique'] ? 'UNIQUE' : 'INDEX',
                'columns' => $parts, 'readOnly' => $index['origin'] !== 'c' || $index['partial'] || in_array(null, array_column($parts, 'name'), true)];
        }
        $primary = array_values(array_filter($columns, fn ($c) => $c['primaryKey']));
        if ($primary) $state['indexes'][] = ['name' => 'PRIMARY', 'type' => 'PRIMARY', 'columns' => array_map(fn ($c) => ['name' => $c['name'], 'prefix' => '', 'direction' => 'ASC'], $primary)];
        $sql = $db->pdo->query('SELECT sql FROM sqlite_master WHERE name = ' . $db->pdo->quote($table))->fetchColumn();
        if (stripos($sql ?: '', 'AUTOINCREMENT') !== false && count($primary) === 1) {
            $state['autoColumn'] = $primary[0]['name'];
            $seq = $db->pdo->query('SELECT seq FROM sqlite_sequence WHERE name = ' . $db->pdo->quote($table))->fetchColumn();
            $max = $db->pdo->query('SELECT MAX(' . db_identifier($state['autoColumn']) . ') FROM ' . db_identifier($table))->fetchColumn();
            $state['nextAutoIncrement'] = (string) (max((int) $seq, (int) $max) + 1);
        }
        $state['storageEngine'] = 'SQLite';
        return $state;
    }
    $quoted = "'" . $db->real_escape_string($table) . "'";
    $row = $db->query('SELECT ENGINE, TABLE_COLLATION, TABLE_COMMENT, AUTO_INCREMENT FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name=' . $quoted)->fetch_assoc();
    $state['storageEngine'] = $row['ENGINE'];
    $state['collation'] = $row['TABLE_COLLATION'];
    $state['comment'] = $row['TABLE_COMMENT'];
    $state['nextAutoIncrement'] = (string) ($row['AUTO_INCREMENT'] ?? '');
    foreach ($db->query('SHOW ENGINES') as $engine) if (in_array($engine['Support'], ['YES', 'DEFAULT'], true)) $state['engines'][] = $engine['Engine'];
    foreach ($db->query('SHOW FULL COLUMNS FROM ' . db_identifier($table)) as $column) if (stripos($column['Extra'], 'auto_increment') !== false) $state['autoColumn'] = $column['Field'];
    $indexes = [];
    foreach ($db->query('SHOW INDEX FROM ' . db_identifier($table)) as $index) {
        $name = $index['Key_name'];
        $type = $name === 'PRIMARY' ? 'PRIMARY' : (in_array($index['Index_type'], ['FULLTEXT', 'SPATIAL'], true) ? $index['Index_type'] : ($index['Non_unique'] ? 'INDEX' : 'UNIQUE'));
        $indexes[$name] ??= ['name' => $name, 'type' => $type, 'columns' => [], 'readOnly' => false];
        if (!$index['Column_name']) $indexes[$name]['readOnly'] = true;
        $indexes[$name]['columns'][] = ['name' => $index['Column_name'], 'prefix' => $index['Sub_part'] ?? '', 'direction' => $index['Collation'] === 'D' ? 'DESC' : 'ASC'];
    }
    $state['indexes'] = array_values($indexes);
    $foreign = [];
    $sql = 'SELECT k.CONSTRAINT_NAME,k.COLUMN_NAME,k.REFERENCED_TABLE_NAME,k.REFERENCED_COLUMN_NAME,k.REFERENCED_TABLE_SCHEMA,r.UPDATE_RULE,r.DELETE_RULE FROM information_schema.KEY_COLUMN_USAGE k JOIN information_schema.REFERENTIAL_CONSTRAINTS r ON r.CONSTRAINT_SCHEMA=k.CONSTRAINT_SCHEMA AND r.TABLE_NAME=k.TABLE_NAME AND r.CONSTRAINT_NAME=k.CONSTRAINT_NAME WHERE k.TABLE_SCHEMA=DATABASE() AND k.TABLE_NAME=' . $quoted . ' AND k.REFERENCED_TABLE_NAME IS NOT NULL ORDER BY k.CONSTRAINT_NAME,k.ORDINAL_POSITION';
    foreach ($db->query($sql) as $fk) {
        $name = $fk['CONSTRAINT_NAME'];
        $foreign[$name] ??= ['name' => $name, 'table' => $fk['REFERENCED_TABLE_NAME'], 'schema' => $fk['REFERENCED_TABLE_SCHEMA'], 'onUpdate' => $fk['UPDATE_RULE'], 'onDelete' => $fk['DELETE_RULE'], 'columns' => []];
        $foreign[$name]['columns'][] = ['name' => $fk['COLUMN_NAME'], 'reference' => $fk['REFERENCED_COLUMN_NAME']];
    }
    $databaseName = $db->query('SELECT DATABASE() AS name')->fetch_assoc()['name'];
    foreach ($foreign as &$constraint) $constraint['readOnly'] = $constraint['schema'] !== $databaseName;
    unset($constraint);
    $state['foreignKeys'] = array_values($foreign);
    return $state;
}

function management_index_parts(array $parts, array $columns, string $type, bool $sqlite): string
{
    if (!$parts) throw new RuntimeException('Choose at least one index column.');
    $known = array_column($columns, null, 'name');
    $seen = []; $sql = [];
    foreach ($parts as $part) {
        $name = (string) ($part['name'] ?? '');
        if (!isset($known[$name]) || isset($seen[$name])) throw new RuntimeException('Choose distinct, existing index columns.');
        $seen[$name] = true;
        $prefix = (string) ($part['prefix'] ?? '');
        $direction = strtoupper((string) ($part['direction'] ?? 'ASC'));
        if (!in_array($direction, ['ASC', 'DESC'], true)) throw new RuntimeException('Invalid index direction.');
        $columnType = $known[$name]['mysqlType'] ?? '';
        if ($prefix !== '' && ($sqlite || !in_array($type, ['INDEX', 'UNIQUE'], true) || !preg_match('/^[1-9][0-9]{0,5}$/D', $prefix)
            || !preg_match('/^(?:CHAR|VARCHAR|BINARY|VARBINARY|.*TEXT|.*BLOB)\b/i', $columnType))) throw new RuntimeException('Prefix lengths require a MySQL text or binary ordinary/unique index.');
        if ($type === 'FULLTEXT' && !preg_match('/^(?:CHAR|VARCHAR|.*TEXT)\b/i', $columnType)) throw new RuntimeException('FULLTEXT requires text columns.');
        if ($type === 'SPATIAL' && (!preg_match('/^(?:GEOMETRY|POINT|LINESTRING|POLYGON|MULTIPOINT|MULTILINESTRING|MULTIPOLYGON|GEOMETRYCOLLECTION)\b/i', $columnType) || empty($known[$name]['required']))) throw new RuntimeException('SPATIAL requires NOT NULL spatial columns.');
        $sql[] = db_identifier($name) . ($prefix !== '' ? '(' . $prefix . ')' : '') . (in_array($type, ['FULLTEXT', 'SPATIAL'], true) ? '' : ' ' . $direction);
    }
    return implode(', ', $sql);
}

function apply_table_management(mysqli|SQLiteConnection $db, string $table, array $request): string
{
    $state = table_management_state($db, $table);
    $sqlite = $db instanceof SQLiteConnection;
    $action = $request['action'];
    $id = db_identifier($table);
    if ($action === 'saveIndex' || $action === 'deleteIndex') {
        $old = (string) ($request['originalName'] ?? '');
        $existing = array_column($state['indexes'], null, 'name');
        if ($old !== '' && (!isset($existing[$old]) || !empty($existing[$old]['readOnly']))) throw new RuntimeException('This index cannot be edited here.');
        $type = strtoupper((string) ($request['type'] ?? 'INDEX'));
        if (!in_array($type, $sqlite ? ['INDEX', 'UNIQUE', 'PRIMARY'] : ['INDEX', 'UNIQUE', 'PRIMARY', 'FULLTEXT', 'SPATIAL'], true)) throw new RuntimeException('Unsupported index type.');
        $name = $type === 'PRIMARY' ? 'PRIMARY' : validate_field_name((string) ($request['name'] ?? ''));
        if ($type !== 'PRIMARY' && strtoupper($name) === 'PRIMARY') throw new RuntimeException('PRIMARY is reserved.');
        $drop = $old === '' ? '' : ($old === 'PRIMARY' ? 'DROP PRIMARY KEY' : 'DROP INDEX ' . db_identifier($old));
        $add = '';
        if ($action === 'saveIndex') {
            if ($name !== $old && isset($existing[$name])) throw new RuntimeException('That index name already exists.');
            $parts = management_index_parts((array) ($request['columns'] ?? []), $state['columns'], $type, $sqlite);
            $add = $type === 'PRIMARY' ? 'ADD PRIMARY KEY (' . $parts . ')' : 'ADD ' . ($type === 'INDEX' ? '' : $type . ' ') . 'INDEX ' . db_identifier($name) . ' (' . $parts . ')';
        }
        if (!$drop && !$add) throw new RuntimeException('Choose an index.');
        if ($sqlite && ($old === 'PRIMARY' || $type === 'PRIMARY')) {
            // SQLite's rebuild adapter preserves foreign keys and AUTOINCREMENT constraints.
            $plain = array_map(fn ($p) => db_identifier($p['name']), (array) ($request['columns'] ?? []));
            $add = $action === 'saveIndex' ? 'ADD PRIMARY KEY (' . implode(', ', $plain) . ')' : '';
            if ($state['autoColumn'] !== '') throw new RuntimeException('SQLite AUTOINCREMENT primary keys cannot be changed here.');
            $db->query('ALTER TABLE ' . $id . ' ' . implode(', ', array_filter([$drop, $add])));
        } elseif ($sqlite) {
            $db->pdo->exec('SAVEPOINT schema_index');
            try {
                if ($drop) $db->pdo->exec('DROP INDEX ' . db_identifier($old));
                if ($add) $db->pdo->exec('CREATE ' . ($type === 'UNIQUE' ? 'UNIQUE ' : '') . 'INDEX ' . db_identifier($name) . ' ON ' . $id . ' (' . $parts . ')');
                $db->pdo->exec('RELEASE schema_index');
                $db->invalidateCatalog();
            } catch (Throwable $error) { $db->pdo->exec('ROLLBACK TO schema_index'); $db->pdo->exec('RELEASE schema_index'); throw $error; }
        } else {
            $db->query('ALTER TABLE ' . $id . ' ' . implode(', ', array_filter([$drop, $add])));
        }
    } elseif ($action === 'saveForeignKey' || $action === 'deleteForeignKey') {
        if ($sqlite) throw new RuntimeException('Foreign-key alteration is available for MySQL/MariaDB connections.');
        $old = (string) ($request['originalName'] ?? '');
        $existing = array_column($state['foreignKeys'], null, 'name');
        if ($old !== '' && (!isset($existing[$old]) || !empty($existing[$old]['readOnly']))) throw new RuntimeException('This foreign key cannot be edited here.');
        $parts = $old !== '' ? ['DROP FOREIGN KEY ' . db_identifier($old)] : [];
        if ($action === 'saveForeignKey') {
            $name = validate_field_name((string) ($request['name'] ?? ''));
            $target = resolve_table_name($db, (string) ($request['referenceTable'] ?? ''));
            if (!$target) throw new RuntimeException('Referenced table was not found.');
            [$targetColumns] = fetch_table_columns($db, $target);
            $local = []; $remote = [];
            foreach ((array) ($request['columns'] ?? []) as $column) {
                if (!in_array($column['name'], array_column($state['columns'], 'name'), true) || !in_array($column['reference'], array_column($targetColumns, 'name'), true)) throw new RuntimeException('Invalid foreign-key columns.');
                $local[] = db_identifier($column['name']); $remote[] = db_identifier($column['reference']);
            }
            if (!$local || count(array_unique($local)) !== count($local)) throw new RuntimeException('Choose distinct foreign-key columns.');
            $update = (string) ($request['onUpdate'] ?? 'RESTRICT'); $delete = (string) ($request['onDelete'] ?? 'RESTRICT');
            foreach ([$update, $delete] as $rule) if (!in_array($rule, ['RESTRICT', 'CASCADE', 'SET NULL', 'NO ACTION'], true)) throw new RuntimeException('Invalid cascade action.');
            $parts[] = 'ADD CONSTRAINT ' . db_identifier($name) . ' FOREIGN KEY (' . implode(',', $local) . ') REFERENCES ' . db_identifier($target) . ' (' . implode(',', $remote) . ') ON UPDATE ' . $update . ' ON DELETE ' . $delete;
        }
        if (!$parts) throw new RuntimeException('Choose a foreign key.');
        $db->query('ALTER TABLE ' . $id . ' ' . implode(', ', $parts));
    } elseif ($action === 'configureAutoIncrement') {
        $column = (string) ($request['column'] ?? '');
        $enabled = filter_var($request['enabled'] ?? false, FILTER_VALIDATE_BOOL);
        $next = trim((string) ($request['next'] ?? ''));
        if ($next !== '' && !preg_match('/^[1-9][0-9]{0,18}$/D', $next)) throw new RuntimeException('The next value must be a positive integer.');
        if (!in_array($column, array_column($state['columns'], 'name'), true)) throw new RuntimeException('Field was not found.');
        if ($next !== '') {
            $maximum = $db->query('SELECT MAX(' . db_identifier($column) . ') AS maximum FROM ' . $id)->fetch_assoc()['maximum'];
            if ($maximum !== null && (string) $maximum !== '' && !str_starts_with((string) $maximum, '-')) {
                $maximum = (string) $maximum;
                if (strlen($next) < strlen($maximum) || (strlen($next) === strlen($maximum) && strcmp($next, $maximum) <= 0)) throw new RuntimeException('The next value must exceed the largest existing value.');
            }
        }
        if ($sqlite) {
            if ($next !== '' && (strlen($next) > strlen((string) PHP_INT_MAX) || (strlen($next) === strlen((string) PHP_INT_MAX) && strcmp($next, (string) PHP_INT_MAX) > 0))) throw new RuntimeException('Next value exceeds the SQLite integer range.');
            if (!$enabled || $state['autoColumn'] !== $column) throw new RuntimeException('SQLite only supports changing the next value of an existing AUTOINCREMENT field here.');
            if ($next !== '') {
                $db->pdo->exec('SAVEPOINT schema_sequence');
                try {
                    $stmt = $db->pdo->prepare('DELETE FROM sqlite_sequence WHERE name=?'); $stmt->execute([$table]);
                    $stmt = $db->pdo->prepare('INSERT INTO sqlite_sequence(name,seq) VALUES (?,?)'); $stmt->execute([$table, (int) $next - 1]);
                    $db->pdo->exec('RELEASE schema_sequence');
                } catch (Throwable $error) { $db->pdo->exec('ROLLBACK TO schema_sequence'); $db->pdo->exec('RELEASE schema_sequence'); throw $error; }
            }
        } else {
            $definition = fetch_column_definition($db, $table, $column);
            if ($enabled && !preg_match('/^(?:TINYINT|SMALLINT|MEDIUMINT|INT|INTEGER|BIGINT)\b/i', $definition['column_type'])) throw new RuntimeException('AUTO_INCREMENT requires an integer field.');
            if ($enabled && $state['autoColumn'] !== '' && $state['autoColumn'] !== $column) throw new RuntimeException('Disable the existing AUTO_INCREMENT field first.');
            $definition['extra'] = trim(str_ireplace('auto_increment', '', $definition['extra'] ?? ''));
            if ($enabled) { $definition['extra'] .= ' auto_increment'; $definition['is_nullable'] = 'NO'; $definition['column_default'] = null; $definition['sqlDefaultMode'] = 'none'; }
            $db->query('ALTER TABLE ' . $id . ' MODIFY COLUMN ' . db_identifier($column) . ' ' . column_definition_sql($definition) . ($enabled && $next !== '' ? ', AUTO_INCREMENT=' . $next : ''));
            $metadata = fetch_table_metadata($db, $table);
            $metadata['columns'][$column]['acaciadbType'] = $enabled ? 'AutoNumber' : access_type_for_sql($definition['column_type']);
            save_table_metadata($db, $table, $metadata);
        }
    } elseif ($action === 'saveTableOptions') {
        $newName = validate_table_name((string) ($request['name'] ?? $table));
        if ($newName !== $table && physical_table_exists($db, $newName)) throw new RuntimeException('That table already exists.');
        $parts = [];
        if (!$sqlite) {
            $engine = (string) ($request['storageEngine'] ?? $state['storageEngine']);
            $collation = (string) ($request['collation'] ?? $state['collation']);
            if (!in_array($engine, $state['engines'], true)) throw new RuntimeException('Unsupported storage engine.');
            if (!in_array($collation, array_column($state['options']['collations'], 'name'), true)) throw new RuntimeException('Unsupported collation.');
            if ($engine !== $state['storageEngine']) $parts[] = 'ENGINE=' . db_identifier($engine);
            if ($collation !== $state['collation']) $parts[] = 'DEFAULT COLLATE=' . db_identifier($collation);
            $parts[] = "COMMENT='" . $db->real_escape_string((string) ($request['comment'] ?? $state['comment'])) . "'";
            if ($newName !== $table) $parts[] = 'RENAME TO ' . db_identifier($newName);
            $db->query('ALTER TABLE ' . $id . ' ' . implode(', ', $parts));
        } elseif ($newName !== $table) {
            $db->query('RENAME TABLE ' . $id . ' TO ' . db_identifier($newName));
        }
        if ($newName !== $table) {
            $stmt = $db->prepare('UPDATE acaciadb_object_definitions SET object_name=? WHERE object_type="table" AND object_name=?');
            $stmt->bind_param('ss', $newName, $table); $stmt->execute();
            if (physical_table_exists($db, 'acaciadb_column_history')) {
                $stmt = $db->prepare('UPDATE acaciadb_column_history SET table_name=? WHERE table_name=?');
                $stmt->bind_param('ss', $newName, $table); $stmt->execute();
            }
            // Keep structured application references in sync; SQL text is not rewritten.
            foreach (['table', 'form', 'query', 'report'] as $kind) foreach (fetch_objects($db, $kind) as $objectName => $definition) {
                $rewrite = function (&$value, $key = '') use (&$rewrite, $table, $newName) {
                    if (is_array($value)) { foreach ($value as $k => &$child) $rewrite($child, is_int($k) ? $key : $k); unset($child); }
                    elseif ($value === $table && in_array($key, ['table', 'tables', 'parentTable', 'sourceTable', 'sourceObjectName'], true)) $value = $newName;
                };
                $rewrite($definition);
                $json = json_encode($definition, JSON_THROW_ON_ERROR);
                $stmt = $db->prepare('UPDATE acaciadb_object_definitions SET definition_json=? WHERE object_type=? AND object_name=?');
                $stmt->bind_param('sss', $json, $kind, $objectName); $stmt->execute();
            }
        }
        return $newName;
    }
    return $table;
}
