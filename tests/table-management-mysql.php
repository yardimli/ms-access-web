<?php
// Each run creates and removes its own database; application tables are never used.
$source = str_replace("\r\n", "\n", file_get_contents(__DIR__ . '/../api/schema.php'));
$boundary = strpos($source, "try {\n    \$db = db_connect();");
if ($boundary === false) throw new RuntimeException('Cannot locate schema helper boundary.');
eval(substr($source, 5, $boundary - 5));
$db = db_connect(false);
$name = 'acacia_schema_test_' . bin2hex(random_bytes(6));
$db->query('CREATE DATABASE ' . db_identifier($name));
$db->select_db($name);
function check(bool $condition, string $message): void { if (!$condition) throw new RuntimeException($message); }
try {
    $db->query('CREATE TABLE ParentRows (id INT NOT NULL PRIMARY KEY) ENGINE=InnoDB');
    $db->query('CREATE TABLE ChildRows (id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, parent_id INT NULL, title VARCHAR(255), details TEXT, position POINT NOT NULL) ENGINE=InnoDB');
    $run = fn ($action, $args = []) => apply_table_management($db, 'ChildRows', ['action' => $action] + $args);
    $run('saveIndex', ['name' => 'prefix_composite', 'type' => 'INDEX', 'columns' => [['name' => 'title', 'prefix' => '20'], ['name' => 'parent_id', 'direction' => 'DESC']]]);
    $state = table_management_state($db, 'ChildRows');
    $index = array_column($state['indexes'], null, 'name')['prefix_composite'];
    check((int) $index['columns'][0]['prefix'] === 20 && count($index['columns']) === 2, 'Composite/prefix index was not retained.');
    $run('saveIndex', ['originalName' => 'prefix_composite', 'name' => 'renamed_unique', 'type' => 'UNIQUE', 'columns' => [['name' => 'title', 'prefix' => '30']]]);
    $run('deleteIndex', ['originalName' => 'renamed_unique', 'name' => 'renamed_unique', 'type' => 'UNIQUE']);
    $run('saveIndex', ['name' => 'search_text', 'type' => 'FULLTEXT', 'columns' => [['name' => 'details']]]);
    $run('saveIndex', ['name' => 'map_position', 'type' => 'SPATIAL', 'columns' => [['name' => 'position']]]);
    $run('saveForeignKey', ['name' => 'fk_parent', 'referenceTable' => 'ParentRows', 'onDelete' => 'SET NULL', 'onUpdate' => 'CASCADE', 'columns' => [['name' => 'parent_id', 'reference' => 'id']]]);
    check(table_management_state($db, 'ChildRows')['foreignKeys'][0]['onDelete'] === 'SET NULL', 'Foreign key was not stored.');
    $run('saveForeignKey', ['originalName' => 'fk_parent', 'name' => 'fk_parent_new', 'referenceTable' => 'ParentRows', 'onDelete' => 'CASCADE', 'onUpdate' => 'RESTRICT', 'columns' => [['name' => 'parent_id', 'reference' => 'id']]]);
    $run('deleteForeignKey', ['originalName' => 'fk_parent_new']);
    $run('configureAutoIncrement', ['column' => 'id', 'enabled' => true, 'next' => '1000']);
    check(table_management_state($db, 'ChildRows')['nextAutoIncrement'] === '1000', 'Sequence was not changed.');
    $run('configureAutoIncrement', ['column' => 'id', 'enabled' => false]);
    check(table_management_state($db, 'ChildRows')['autoColumn'] === '', 'AUTO_INCREMENT was not disabled.');
    $run('saveIndex', ['originalName' => 'PRIMARY', 'type' => 'PRIMARY', 'columns' => [['name' => 'id'], ['name' => 'parent_id']]]);
    $state = table_management_state($db, 'ChildRows');
    check(count(array_column($state['indexes'], null, 'name')['PRIMARY']['columns']) === 2, 'Composite primary key missing.');
    $run('saveIndex', ['originalName' => 'PRIMARY', 'type' => 'PRIMARY', 'columns' => [['name' => 'id']]]);
    $run('configureAutoIncrement', ['column' => 'id', 'enabled' => true, 'next' => '2000']);
    $run('saveTableOptions', ['name' => 'RenamedChildren', 'storageEngine' => 'InnoDB', 'collation' => 'utf8mb4_unicode_ci', 'comment' => "Children's records"]);
    $state = table_management_state($db, 'RenamedChildren');
    check($state['comment'] === "Children's records" && $state['collation'] === 'utf8mb4_unicode_ci', 'Table options missing.');
    echo "PASS: MariaDB indexes (prefix/composite/unique/FULLTEXT/SPATIAL), foreign keys, primary keys, AUTO_INCREMENT, rename, and table options.\n";
} finally {
    $db->query('DROP DATABASE ' . db_identifier($name));
}
