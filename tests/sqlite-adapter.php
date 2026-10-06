<?php
require_once __DIR__ . '/../lib/sqlite_connection.php';
$db = new SQLiteConnection(':memory:');
$db->query('CREATE TABLE items (id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, label TEXT)');
$db->query("INSERT INTO items (id,label) VALUES (100,'old')");
$db->query('DELETE FROM items');
$db->query("ALTER TABLE items MODIFY COLUMN label VARCHAR(255) DEFAULT 'O''Brien' COMMENT 'Customer''s label'");
$db->query('INSERT INTO items () VALUES ()');
$row = $db->query('SELECT * FROM items')->fetch_assoc();
if ($row['id'] !== 101 || $row['label'] !== "O'Brien") throw new RuntimeException('Rebuild lost sequence or quoted default.');
echo "PASS: SQLite rebuild preserves AutoNumber sequence and quoted defaults.\n";
$tables = iterator_to_array($db->query('SHOW FULL TABLES'));
if ($tables !== [['name' => 'items']]) throw new RuntimeException('Table catalog failed.');
$db->query('CREATE TEMPORARY TABLE draft (id INT, label TEXT)');
$columns = iterator_to_array($db->query("SELECT column_name FROM information_schema.columns WHERE table_name='draft' ORDER BY ordinal_position"));
if (array_column($columns, 'column_name') !== ['id', 'label']) throw new RuntimeException('Temporary table catalog failed.');
$db->query('ALTER TABLE draft MODIFY COLUMN label VARCHAR(255)');
echo "PASS: Main and temporary table catalogs and rebuilds.\n";
