<?php

/** Validate a type declaration, never arbitrary DDL. */
function validate_mysql_column_type(string $type): string
{
    $type = trim($type);
    if (!preg_match('/^([A-Za-z]+)(?:\s*\((.*)\))?(?:\s+(UNSIGNED))?(?:\s+(ZEROFILL))?$/isD', $type, $match)) {
        throw new RuntimeException('Enter a SQL type such as VARCHAR(512) or DECIMAL(4,4).');
    }
    $base = strtoupper($match[1]);
    $base = ['INTEGER' => 'INT', 'NUMERIC' => 'DECIMAL', 'REAL' => 'DOUBLE', 'BOOL' => 'BOOLEAN'][$base] ?? $base;
    $args = trim($match[2] ?? '');
    $zerofill = !empty($match[4]);
    $unsigned = !empty($match[3]) || $zerofill;
    $numeric = ['TINYINT', 'SMALLINT', 'MEDIUMINT', 'INT', 'BIGINT', 'DECIMAL', 'FLOAT', 'DOUBLE'];
    if ($unsigned && !in_array($base, $numeric, true)) throw new RuntimeException('UNSIGNED requires a numeric type.');
    if (in_array($base, ['ENUM', 'SET'], true)) {
        // Doubled quotes are supported; backslashes are excluded to be independent of SQL mode.
        $membersPattern = <<<'REGEX'
/^'(?:[^'\\\x00-\x1F]|'')*'(?:\s*,\s*'(?:[^'\\\x00-\x1F]|'')*')*$/D
REGEX;
        if (!preg_match($membersPattern, $args)) {
            throw new RuntimeException("Enter quoted values, for example ENUM('small','large').");
        }
        return $base . '(' . $args . ')';
    }
    $simple = ['TINYTEXT', 'TEXT', 'MEDIUMTEXT', 'LONGTEXT', 'TINYBLOB', 'BLOB', 'MEDIUMBLOB', 'LONGBLOB',
        'DATE', 'YEAR', 'JSON', 'BOOLEAN', 'GEOMETRY', 'POINT', 'LINESTRING', 'POLYGON', 'MULTIPOINT',
        'MULTILINESTRING', 'MULTIPOLYGON', 'GEOMETRYCOLLECTION'];
    if (in_array($base, $simple, true)) {
        if ($args !== '') throw new RuntimeException($base . ' does not take a size.');
        return $base;
    }
    if ($args !== '' && !preg_match('/^\d+(?:\s*,\s*\d+)?$/D', $args)) throw new RuntimeException('Type sizes must be whole numbers.');
    $parts = $args === '' ? [] : array_map('intval', explode(',', $args));
    if (in_array($base, ['VARCHAR', 'CHAR', 'BINARY', 'VARBINARY', 'BIT', 'VECTOR'], true)) {
        $limit = ['CHAR' => 255, 'BINARY' => 255, 'BIT' => 64, 'VECTOR' => 16383][$base] ?? 65535;
        if (count($parts) !== 1 || $parts[0] < 1 || $parts[0] > $limit) throw new RuntimeException($base . ' needs a size from 1 to ' . $limit . '.');
    } elseif ($base === 'DECIMAL') {
        $parts = $parts ?: [10, 0];
        if (count($parts) === 1) $parts[] = 0;
        if ($parts[0] < 1 || $parts[0] > 65 || $parts[1] > 30 || $parts[1] > $parts[0]) throw new RuntimeException('DECIMAL requires precision 1–65 and scale 0–30, no greater than precision.');
    } elseif (in_array($base, ['TIME', 'DATETIME', 'TIMESTAMP'], true)) {
        if (count($parts) > 1 || ($parts && $parts[0] > 6)) throw new RuntimeException('Fractional seconds precision must be 0–6.');
    } elseif (in_array($base, $numeric, true)) {
        if (count($parts) > 1 || ($parts && ($parts[0] < 1 || $parts[0] > 255))) throw new RuntimeException('Invalid numeric type size.');
        if (in_array($base, ['FLOAT', 'DOUBLE'], true) && $parts) throw new RuntimeException('Use FLOAT or DOUBLE without a size; use DECIMAL for fixed precision.');
    } else {
        throw new RuntimeException('Unsupported MySQL data type: ' . $base);
    }
    return $base . ($parts ? '(' . implode(',', $parts) . ')' : '') . ($unsigned ? ' UNSIGNED' : '') . ($zerofill ? ' ZEROFILL' : '');
}

function access_type_for_sql(string $type): string
{
    $base = strtoupper(preg_replace('/[\s(].*/', '', $type));
    if (in_array($base, ['BINARY', 'VARBINARY', 'TINYBLOB', 'BLOB', 'MEDIUMBLOB', 'LONGBLOB', 'GEOMETRY', 'POINT', 'LINESTRING', 'POLYGON', 'MULTIPOINT', 'MULTILINESTRING', 'MULTIPOLYGON', 'GEOMETRYCOLLECTION', 'VECTOR'], true)) return 'OLE Object';
    if (in_array($base, ['TINYTEXT', 'TEXT', 'MEDIUMTEXT', 'LONGTEXT', 'JSON'], true)) return 'Long Text';
    if (in_array($base, ['DATE', 'TIME', 'DATETIME', 'TIMESTAMP'], true)) return 'Date/Time';
    if ($base === 'BOOLEAN') return 'Yes/No';
    if ($base === 'BIGINT') return 'Large Number';
    if (in_array($base, ['TINYINT', 'SMALLINT', 'MEDIUMINT', 'INT', 'DECIMAL', 'FLOAT', 'DOUBLE', 'BIT', 'YEAR'], true)) return 'Number';
    return 'Short Text';
}
