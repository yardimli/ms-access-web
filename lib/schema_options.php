<?php

function database_schema_options(mysqli|SQLiteConnection $db): array
{
    static $cache = [];
    $key = spl_object_id($db);
    if (isset($cache[$key])) return $cache[$key];
    $collations = [];
    if ($db instanceof SQLiteConnection) {
        foreach ($db->pdo->query('PRAGMA collation_list') as $row) {
            $collations[] = ['name' => $row['name'], 'charset' => ''];
        }
    } else {
        foreach ($db->query('SHOW COLLATION') as $row) {
            $collations[] = ['name' => $row['Collation'], 'charset' => $row['Charset']];
        }
    }
    usort($collations, fn ($a, $b) => strcasecmp($a['name'], $b['name']));
    return $cache[$key] = ['engine' => $db instanceof SQLiteConnection ? 'sqlite' : 'mysql', 'collations' => $collations];
}

function sql_default_details(mixed $value, string $extra = ''): array
{
    if ($value === null) return ['sqlDefaultMode' => 'none', 'sqlDefaultValue' => ''];
    $text = (string) $value;
    if (preg_match('/^CURRENT_TIMESTAMP(?:\(\d*\))?$/iD', $text)) return ['sqlDefaultMode' => 'current_timestamp', 'sqlDefaultValue' => ''];
    if (strcasecmp($text, 'NULL') === 0) return ['sqlDefaultMode' => 'null', 'sqlDefaultValue' => ''];
    if (strlen($text) >= 2 && $text[0] === "'" && substr($text, -1) === "'") $text = str_replace("''", "'", substr($text, 1, -1));
    return ['sqlDefaultMode' => 'defined', 'sqlDefaultValue' => $text];
}

function apply_sql_field_settings(mysqli|SQLiteConnection $db, array $definition, array $change): array
{
    $type = (string) $definition['column_type'];
    $textType = preg_match('/^(?:CHAR|VARCHAR|TINYTEXT|TEXT|MEDIUMTEXT|LONGTEXT|ENUM|SET)\b/i', $type);
    $temporal = preg_match('/^(?:TIMESTAMP|DATETIME)\b/i', $type);
    if (array_key_exists('collation', $change)) {
        $collation = (string) $change['collation'];
        if ($collation !== '' && !$textType) throw new RuntimeException('Collation applies only to text fields.');
        $matches = array_values(array_filter(database_schema_options($db)['collations'], fn ($item) => $item['name'] === $collation));
        if ($collation !== '' && !$matches) throw new RuntimeException('This connection does not support the selected collation.');
        $definition['collation_name'] = $collation;
        $definition['character_set_name'] = $matches[0]['charset'] ?? '';
    }
    if (array_key_exists('sqlAttribute', $change)) {
        $attribute = (string) $change['sqlAttribute'];
        if (!in_array($attribute, ['', 'BINARY', 'UNSIGNED', 'UNSIGNED ZEROFILL', 'ON UPDATE CURRENT_TIMESTAMP'], true)) throw new RuntimeException('Unsupported field attribute.');
        if ($db instanceof SQLiteConnection && $attribute !== '') throw new RuntimeException('MySQL attributes are unavailable for SQLite.');
        $definition['column_type'] = preg_replace('/\s+(?:UNSIGNED|ZEROFILL)\b/i', '', $type);
        $definition['extra'] = trim(preg_replace('/\bON UPDATE CURRENT_TIMESTAMP(?:\(\d*\))?/i', '', $definition['extra'] ?? ''));
        if ($attribute === '' && str_ends_with((string) ($definition['collation_name'] ?? ''), '_bin')) {
            $definition['collation_name'] = '';
            $definition['character_set_name'] = '';
        }
        if ($attribute === 'BINARY') {
            if (!$textType) throw new RuntimeException('BINARY requires a text field.');
            $charset = $definition['character_set_name'] ?? $db->get_charset()->charset;
            $binary = array_values(array_filter(database_schema_options($db)['collations'], fn ($item) => $item['charset'] === $charset && $item['name'] === $charset . '_bin'));
            if (!$binary) throw new RuntimeException('No binary collation is available for this character set.');
            $definition['collation_name'] = $binary[0]['name'];
            $definition['character_set_name'] = $charset;
        } elseif (str_starts_with($attribute, 'UNSIGNED')) {
            if (!preg_match('/^(?:TINYINT|SMALLINT|MEDIUMINT|INT|INTEGER|BIGINT|DECIMAL|NUMERIC|FLOAT|DOUBLE)\b/i', $type)) throw new RuntimeException('UNSIGNED requires a numeric field.');
            $definition['column_type'] .= ' ' . $attribute;
        } elseif ($attribute !== '') {
            if (!$temporal) throw new RuntimeException('ON UPDATE CURRENT_TIMESTAMP requires TIMESTAMP or DATETIME.');
            preg_match('/\((\d)\)/', $type, $precision);
            $definition['extra'] = trim($definition['extra'] . ' ON UPDATE CURRENT_TIMESTAMP' . (isset($precision[1]) ? '(' . $precision[1] . ')' : ''));
        }
    }
    if (array_key_exists('sqlDefaultMode', $change)) {
        $mode = (string) $change['sqlDefaultMode'];
        if (!in_array($mode, ['none', 'defined', 'null', 'current_timestamp'], true)) throw new RuntimeException('Unsupported default value choice.');
        if ($mode === 'null' && strtoupper($definition['is_nullable']) === 'NO') throw new RuntimeException('DEFAULT NULL requires Required to be No.');
        if ($mode === 'current_timestamp' && !$temporal) throw new RuntimeException('CURRENT_TIMESTAMP requires a TIMESTAMP or DATETIME field.');
        $definition['sql_default_mode'] = $mode;
        $definition['column_default'] = $mode === 'defined' ? (string) ($change['sqlDefaultValue'] ?? '') : ($mode === 'current_timestamp' ? 'CURRENT_TIMESTAMP' : null);
    }
    return $definition;
}
