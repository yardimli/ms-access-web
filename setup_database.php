<?php

require_once __DIR__ . '/lib/db.php';

function mysql_type_for_access(array $column): string
{
    return match ($column['type'] ?? 'Short Text') {
        'AutoNumber' => 'INT NOT NULL AUTO_INCREMENT',
        'Number' => 'DECIMAL(12,2) NULL',
        'Currency' => 'DECIMAL(12,2) NULL',
        'Date/Time' => 'DATE NULL',
        'Yes/No' => 'TINYINT(1) NULL',
        default => 'VARCHAR(255) NULL',
    };
}

function sql_value(mysqli $db, mixed $value): string
{
    if ($value === null) {
        return 'NULL';
    }

    return "'" . $db->real_escape_string((string) $value) . "'";
}

function insert_rows(mysqli $db, string $tableName, array $columns, array $rows): void
{
    if (!$rows) {
        return;
    }

    $columnNames = array_map(fn ($column) => $column['name'], $columns);
    $columnSql = implode(', ', array_map('db_identifier', $columnNames));

    foreach ($rows as $row) {
        $values = array_map(fn ($name) => sql_value($db, $row[$name] ?? null), $columnNames);
        $db->query('INSERT INTO ' . db_identifier($tableName) . " ($columnSql) VALUES (" . implode(', ', $values) . ')');
    }
}

try {
    $seedPath = __DIR__ . '/data/database.json';
    $seed = json_decode(file_get_contents($seedPath), true, 512, JSON_THROW_ON_ERROR);

    $database = env_value('DB_DATABASE', 'ms_acccess_web');
    $server = db_connect(false);
    $server->query('CREATE DATABASE IF NOT EXISTS ' . db_identifier($database) . ' CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
    $server->select_db($database);

    $server->query('SET FOREIGN_KEY_CHECKS=0');

    foreach (array_keys($seed['tables']) as $tableName) {
        $server->query('DROP TABLE IF EXISTS ' . db_identifier($tableName));
    }

    $server->query('DROP TABLE IF EXISTS access_object_definitions');
    $server->query('DROP TABLE IF EXISTS access_table_columns');

    $server->query(
        'CREATE TABLE access_object_definitions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            object_type ENUM("form", "query", "report", "table") NOT NULL,
            object_name VARCHAR(120) NOT NULL,
            definition_json JSON NOT NULL,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY object_unique (object_type, object_name)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
    );

    foreach ($seed['tables'] as $tableName => $table) {
        $columns = $table['structure']['columns'];
        $primaryKey = $table['structure']['primaryKey'] ?? $columns[0]['name'];
        $definitions = [];

        foreach ($columns as $column) {
            $definition = db_identifier($column['name']) . ' ' . mysql_type_for_access($column);
            if ($column['name'] === $primaryKey) {
                $definition .= ' PRIMARY KEY';
            }
            $definitions[] = $definition;
        }

        $server->query('CREATE TABLE ' . db_identifier($tableName) . ' (' . implode(', ', $definitions) . ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci');
        insert_rows($server, $tableName, $columns, $table['data']);
    }

    $objects = [
        'form' => $seed['forms'] ?? [],
        'query' => $seed['queries'] ?? [],
        'report' => [
            'InvoiceSummary' => [
                'title' => 'Invoice Summary',
                'period' => 'For period ending June 24, 2026',
                'stats' => [
                    ['label' => 'Total Sales', 'value' => '$48,230'],
                    ['label' => 'Open Orders', 'value' => '18'],
                    ['label' => 'New Customers', 'value' => '7'],
                ],
                'columns' => ['Customer', 'Orders', 'Balance', 'Status'],
                'rows' => [
                    ['Customer' => 'Contoso Books', 'Orders' => 3, 'Balance' => '$2,481.00', 'Status' => 'Open'],
                    ['Customer' => 'Northwind', 'Orders' => 2, 'Balance' => '$1,180.00', 'Status' => 'Open'],
                    ['Customer' => 'Alpine Ski', 'Orders' => 6, 'Balance' => '$8,942.00', 'Status' => 'Paid'],
                    ['Customer' => 'Blue Yonder', 'Orders' => 1, 'Balance' => '$490.00', 'Status' => 'Open'],
                ],
                'chart' => [60, 78, 46, 88],
            ],
        ],
    ];

    $objectStmt = $server->prepare(
        'INSERT INTO access_object_definitions (object_type, object_name, definition_json) VALUES (?, ?, ?)'
    );

    foreach ($objects as $type => $definitions) {
        foreach ($definitions as $name => $definition) {
            $json = json_encode($definition, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
            $objectStmt->bind_param('sss', $type, $name, $json);
            $objectStmt->execute();
        }
    }

    $server->query('SET FOREIGN_KEY_CHECKS=1');

    json_response([
        'ok' => true,
        'database' => $database,
        'tables' => array_keys($seed['tables']),
        'objects' => [
            'forms' => array_keys($objects['form']),
            'queries' => array_keys($objects['query']),
            'reports' => array_keys($objects['report']),
        ],
    ]);
} catch (Throwable $exception) {
    json_response([
        'ok' => false,
        'error' => $exception->getMessage(),
    ], 500);
}
