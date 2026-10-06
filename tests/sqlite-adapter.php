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
