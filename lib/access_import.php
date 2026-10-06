<?php
require_once __DIR__ . '/acaciadb_data.php';

function access_java_binary(): string
{
    $configured = env_value('JAVA_BIN', getenv('JAVA_BIN') ?: '');
    if ($configured !== '') return $configured;
    $home = getenv('JAVA_HOME');
    if ($home && is_file($home . '/bin/java' . (PHP_OS_FAMILY === 'Windows' ? '.exe' : ''))) return $home . '/bin/java' . (PHP_OS_FAMILY === 'Windows' ? '.exe' : '');
    if (PHP_OS_FAMILY === 'Windows') {
        $bundled = glob('C:/Program Files/JetBrains/*/jbr/bin/java.exe');
        if ($bundled) return end($bundled);
    }
    return 'java';
}

function run_access_reader(string $directory, ?array $selection = null): array
{
    $root = dirname(__DIR__);
    if (!is_file($root . '/tools/access/lib/jackcess-4.0.8.jar')) throw new RuntimeException('Access import requires the reader dependencies. Run python scripts/install_access_importer.py on the server.');
    $command = [access_java_binary(), '-Xmx512m', '-cp', $root . '/tools/access/lib/*', $root . '/tools/access/AccessReader.java', $directory . '/source.access', $directory];
    if ($selection !== null) {
        file_put_contents($directory . '/selection.json', json_encode($selection, JSON_THROW_ON_ERROR));
        $command[] = $directory . '/selection.json';
    }
    $process = proc_open($command, [0 => ['pipe', 'r'], 1 => ['file', $directory . '/reader.out', 'w'], 2 => ['file', $directory . '/reader.err', 'w']], $pipes, $root, null, ['bypass_shell' => true]);
    if (!is_resource($process)) throw new RuntimeException('Cannot start the Access reader. Configure JAVA_BIN for a Java 11+ JDK.');
    fclose($pipes[0]);
    $exitCode = proc_close($process);
    if ($exitCode !== 0) throw new RuntimeException('The Access file could not be read. It may be encrypted, damaged, or unsupported. ' . substr((string) file_get_contents($directory . '/reader.err'), 0, 900));
    $manifest = json_decode(file_get_contents($directory . '/manifest.json'), true, 512, JSON_THROW_ON_ERROR);
    return $manifest;
}

function access_column_type(array $column): string
{
    return match ($column['type']) {
        'BOOLEAN' => 'TINYINT(1)', 'BYTE', 'INT', 'LONG', 'BIG_INT' => 'INTEGER',
        'MONEY' => 'DECIMAL(19,4)', 'FLOAT', 'DOUBLE', 'NUMERIC' => 'NUMERIC',
        'SHORT_DATE_TIME', 'EXT_DATE_TIME' => 'DATETIME', 'BINARY', 'OLE' => 'BLOB',
        'TEXT', 'GUID' => 'VARCHAR(255)', default => 'TEXT'
    };
}

function convert_access_selection(string $directory, array $selection, string $name): array
{
    $manifest = run_access_reader($directory, $selection);
    $selectedTables = array_values(array_unique((array) ($selection['tables'] ?? [])));
    $selectedQueries = array_values(array_unique((array) ($selection['queries'] ?? [])));
    $tables = array_column($manifest['tables'], null, 'name');
    $queries = array_column($manifest['queries'], null, 'name');
    if (!$selectedTables && !$selectedQueries) throw new RuntimeException('Choose at least one table or query.');
    foreach ($selectedTables as $table) if (empty($tables[$table]['supported']) || !is_file($directory . '/' . $tables[$table]['file'])) throw new RuntimeException('Cannot import table ' . $table . '. ' . ($tables[$table]['reason'] ?? 'Not found.'));
    foreach ($selectedQueries as $query) if (empty($queries[$query]['supported'])) throw new RuntimeException('Cannot import query ' . $query . '.');
    $path = $directory . '/converted.sqlite';
    if (is_file($path)) unlink($path);
    $db = new SQLiteConnection($path);
    $db->beginWrite();
    $warnings = $manifest['warnings']; $counts = [];
    try {
        ensure_acaciadb_storage($db);
        foreach ($selectedTables as $nameOfTable) {
            $table = $tables[$nameOfTable]; $columns = $table['columns'];
            $primary = [];
            foreach ($table['indexes'] as $index) if ($index['primary']) $primary = $index['columns'];
            $definitions = []; $autoPrimary = false; $metadata = ['columns' => []];
            foreach ($columns as $column) {
                $type = access_column_type($column); $properties = $column['properties'];
                $auto = !empty($column['autoNumber']) && count($primary) === 1 && $primary[0] === $column['name'] && $type === 'INTEGER';
                $sqlType = $auto ? 'INTEGER PRIMARY KEY AUTOINCREMENT' : $type . (!empty($properties['Required']) ? ' NOT NULL' : '');
                $autoPrimary = $autoPrimary || $auto;
                $definitions[] = SQLiteConnection::identifier($column['name']) . ' ' . $sqlType;
                $metadata['columns'][$column['name']] = [
                    'friendlyName' => (string) ($properties['Caption'] ?? ''), 'comment' => (string) ($properties['Description'] ?? ''),
                    'inputMask' => (string) ($properties['InputMask'] ?? ''), 'validationRule' => (string) ($properties['ValidationRule'] ?? ''),
                    'defaultExpression' => (string) ($properties['DefaultValue'] ?? ''), 'acaciadbFormat' => (string) ($properties['Format'] ?? ''),
                    'acaciadbType' => $auto ? 'AutoNumber' : match ($column['type']) { 'BOOLEAN' => 'Yes/No', 'MONEY' => 'Currency', 'SHORT_DATE_TIME', 'EXT_DATE_TIME' => 'Date/Time', 'BYTE', 'INT', 'LONG', 'BIG_INT', 'FLOAT', 'DOUBLE', 'NUMERIC' => 'Number', 'MEMO' => 'Long Text', default => 'Short Text' }
                ];
                if (!empty($properties['ValidationRule']) || !empty($properties['DefaultValue'])) $warnings[] = $nameOfTable . '.' . $column['name'] . ': Access expressions retained as metadata; review their behavior in the app.';
            }
            if ($primary && !$autoPrimary) $definitions[] = 'PRIMARY KEY (' . implode(',', array_map([SQLiteConnection::class, 'identifier'], $primary)) . ')';
            foreach ($manifest['relationships'] as $relation) {
                if ($relation['toTable'] !== $nameOfTable || !$relation['enforced']) continue;
                if (!in_array($relation['fromTable'], $selectedTables, true)) { $warnings[] = 'Relationship to omitted table ' . $relation['fromTable'] . ' was not created.'; continue; }
                $definitions[] = 'FOREIGN KEY (' . implode(',', array_map([SQLiteConnection::class, 'identifier'], $relation['toColumns'])) . ') REFERENCES ' . SQLiteConnection::identifier($relation['fromTable']) . ' (' . implode(',', array_map([SQLiteConnection::class, 'identifier'], $relation['fromColumns'])) . ')';
            }
            $db->pdo->exec('CREATE TABLE ' . SQLiteConnection::identifier($nameOfTable) . ' (' . implode(',', $definitions) . ')');
            $insert = $db->pdo->prepare('INSERT INTO ' . SQLiteConnection::identifier($nameOfTable) . ' VALUES (' . implode(',', array_fill(0, count($columns), '?')) . ')');
            $reader = fopen($directory . '/' . $table['file'], 'r'); $count = 0;
            while (($line = fgets($reader)) !== false) {
                $row = json_decode($line, true, 512, JSON_THROW_ON_ERROR);
                foreach ($columns as $i => $column) {
                    $value = $row[$column['name']] ?? null;
                    $blob = is_array($value) && isset($value['$binary']);
                    if ($blob) $value = base64_decode($value['$binary'], true);
                    if (is_bool($value)) $value = (int) $value;
                    $insert->bindValue($i + 1, $value, $value === null ? PDO::PARAM_NULL : ($blob ? PDO::PARAM_LOB : PDO::PARAM_STR));
                }
                $insert->execute(); $count++;
            }
            fclose($reader);
            if ($count !== $table['rowCount']) throw new RuntimeException('Row count did not match for ' . $nameOfTable);
            foreach ($table['indexes'] as $index) {
                if ($index['primary']) continue;
                $db->pdo->exec('CREATE ' . ($index['unique'] ? 'UNIQUE ' : '') . 'INDEX ' . SQLiteConnection::identifier($nameOfTable . '__' . $index['name']) . ' ON ' . SQLiteConnection::identifier($nameOfTable) . ' (' . implode(',', array_map([SQLiteConnection::class, 'identifier'], $index['columns'])) . ')');
            }
            save_table_metadata($db, $nameOfTable, $metadata);
            $counts[$nameOfTable] = $count;
        }
        foreach ($selectedQueries as $queryName) {
            $definition = ['name' => $queryName, 'tables' => $selectedTables, 'fields' => [], 'connections' => [], 'positions' => new stdClass(), 'sourceSql' => $queries[$queryName]['sql'], 'sourceDialect' => 'access'];
            $stmt = $db->pdo->prepare('INSERT INTO acaciadb_object_definitions(object_type,object_name,definition_json) VALUES (?,?,?)');
            $stmt->execute(['query', $queryName, json_encode($definition, JSON_THROW_ON_ERROR)]);
        }
        $db->finishWrite(true);
        if ($db->pdo->query('PRAGMA integrity_check')->fetchColumn() !== 'ok') throw new RuntimeException('Converted database failed validation.');
        $insert = null; $stmt = null; $db = null;
        $file = register_workspace_database($path, $name);
        return ['item' => $file, 'counts' => $counts, 'queries' => count($selectedQueries), 'warnings' => array_values(array_unique($warnings))];
    } catch (Throwable $error) { if ($db) $db->finishWrite(false); throw $error; }
}
