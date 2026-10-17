<?php
require_once __DIR__ . '/../lib/sql_types.php';
foreach (['VARCHAR(512)', 'DECIMAL(4,4)', 'BLOB', 'MEDIUMBLOB', 'LONGBLOB', 'TINYBLOB', "ENUM('small','Large')", "SET('one','two')", 'INT UNSIGNED', 'DATETIME(6)', 'JSON', 'POINT'] as $type) {
    if (validate_mysql_column_type($type) !== $type) throw new RuntimeException('Type changed: ' . $type);
}
foreach (['VARCHAR(0)', 'DECIMAL(4,5)', 'DECIMAL(66,2)', 'DECIMAL(40,31)', 'BLOB(20)', 'INT; DROP TABLE t', "ENUM('x'); DROP TABLE t", 'DATETIME(7)', 'JSON UNSIGNED'] as $type) {
    try { validate_mysql_column_type($type); } catch (RuntimeException $error) { continue; }
    throw new RuntimeException('Invalid type accepted: ' . $type);
}
echo "PASS: SQL type parameters and injection rejection.\n";
