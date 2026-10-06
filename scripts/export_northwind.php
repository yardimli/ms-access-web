<?php
// Read-only export of the current MariaDB Northwind into the shared demo template.
require_once __DIR__ . '/../lib/acaciadb_data.php';
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
$source = db_connect(true, $argv[1] ?? 'northwind');
$destination = $argv[2] ?? __DIR__ . '/../data/northwind-demo.sqlite';
if (file_exists($destination)) throw new RuntimeException('Destination already exists; choose a new filename.');
$pdo = new PDO('sqlite:' . $destination, null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
$counts = [];
try {
    $pdo->beginTransaction();
    foreach ($source->query('SHOW FULL TABLES WHERE Table_type = "BASE TABLE"') as $entry) {
        $table = (string) array_values($entry)[0];
        $columns = iterator_to_array($source->query('SHOW FULL COLUMNS FROM ' . db_identifier($table)));
        $keys = iterator_to_array($source->query('SHOW INDEX FROM ' . db_identifier($table)));
        $primary = array_values(array_map(fn ($key) => $key['Column_name'], array_filter($keys, fn ($key) => $key['Key_name'] === 'PRIMARY')));
        $definitions = []; $autoPrimary = false;
        foreach ($columns as $column) {
            $type = strtoupper($column['Type']);
            $auto = count($primary) === 1 && $column['Field'] === $primary[0] && str_contains($column['Extra'], 'auto_increment');
            if ($auto) { $type = 'INTEGER PRIMARY KEY AUTOINCREMENT'; $autoPrimary = true; }
            else {
                $type = preg_replace('/\s+UNSIGNED|\s+ZEROFILL/i', '', $type);
                if (preg_match('/^(ENUM|SET|JSON)/', $type)) $type = 'TEXT';
                if (str_contains($type, 'BLOB') || str_contains($type, 'BINARY')) $type = 'BLOB';
                if ($column['Null'] === 'NO') $type .= ' NOT NULL';
                if ($column['Default'] !== null) $type .= ' DEFAULT ' . (strtoupper((string) $column['Default']) === 'CURRENT_TIMESTAMP' ? 'CURRENT_TIMESTAMP' : $pdo->quote((string) $column['Default']));
            }
            $definitions[] = SQLiteConnection::identifier($column['Field']) . ' ' . $type;
        }
        if ($primary && !$autoPrimary) $definitions[] = 'PRIMARY KEY (' . implode(',', array_map([SQLiteConnection::class, 'identifier'], $primary)) . ')';
        $pdo->exec('CREATE TABLE ' . SQLiteConnection::identifier($table) . ' (' . implode(',', $definitions) . ')');
        $insert = $pdo->prepare('INSERT INTO ' . SQLiteConnection::identifier($table) . ' VALUES (' . implode(',', array_fill(0, count($columns), '?')) . ')');
        $count = 0;
        foreach ($source->query('SELECT * FROM ' . db_identifier($table)) as $row) {
            foreach ($columns as $i => $column) {
                $value = $row[$column['Field']];
                $insert->bindValue($i + 1, $value, $value === null ? PDO::PARAM_NULL : (preg_match('/BLOB|BINARY/i', $column['Type']) ? PDO::PARAM_LOB : PDO::PARAM_STR));
            }
            $insert->execute(); $count++;
        }
        $indexes = [];
        foreach ($keys as $key) if ($key['Key_name'] !== 'PRIMARY') $indexes[$key['Key_name']][] = $key;
        foreach ($indexes as $name => $fields) {
            $pdo->exec('CREATE ' . (!$fields[0]['Non_unique'] ? 'UNIQUE ' : '') . 'INDEX ' . SQLiteConnection::identifier($table . '__' . $name) . ' ON ' . SQLiteConnection::identifier($table) . ' (' . implode(',', array_map(fn ($field) => SQLiteConnection::identifier($field['Column_name']), $fields)) . ')');
        }
        $counts[$table] = $count;
    }
    $pdo->commit();
    if ($pdo->query('PRAGMA integrity_check')->fetchColumn() !== 'ok') throw new RuntimeException('SQLite integrity check failed.');
    echo json_encode(['destination' => realpath($destination), 'tables' => $counts], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . PHP_EOL;
} catch (Throwable $error) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    $pdo = null;
    unlink($destination);
    throw $error;
}
