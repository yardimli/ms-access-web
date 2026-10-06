<?php

/** SQLite adapter for the small SQL dialect used by AcaciaDB's existing APIs. */
final class SQLiteResult implements IteratorAggregate
{
    private int $offset = 0;
    public function __construct(private array $rows) {}
    public function fetch_assoc(): ?array { return $this->rows[$this->offset++] ?? null; }
    public function getIterator(): Traversable { return new ArrayIterator($this->rows); }
}

final class SQLiteStatement
{
    private array $parameters = [];
    private ?SQLiteResult $result = null;
    public function __construct(private SQLiteConnection $db, private string $sql) {}
    public function bind_param(string $types, mixed &...$values): void { $this->parameters = &$values; }
    public function execute(): void { $this->result = $this->db->execute($this->sql, $this->parameters); }
    public function get_result(): SQLiteResult { return $this->result ?? new SQLiteResult([]); }
}

final class SQLiteConnection
{
    public PDO $pdo;
    public int $insert_id = 0;
    public int $thread_id;
    private bool $catalogFresh = false;
    private const IDENT = '(?:`(?:``|[^`])+`|"(?:""|[^"])+"|\[[^\]]+\]|[A-Za-z_][A-Za-z0-9_]*)';

    public function __construct(public string $path, public string $name = 'sqlite')
    {
        $this->pdo = new PDO('sqlite:' . $path, null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]);
        $this->thread_id = random_int(1, PHP_INT_MAX);
        $this->pdo->exec('PRAGMA busy_timeout=5000');
        $this->pdo->exec('PRAGMA foreign_keys=ON');
        $databaseName = $this->name;
        $this->pdo->sqliteCreateFunction('DATABASE', static fn () => $databaseName, 0);
        $this->pdo->exec("ATTACH DATABASE ':memory:' AS information_schema");
        $this->pdo->exec('CREATE TABLE information_schema.tables (table_schema TEXT, table_name TEXT, table_type TEXT, table_rows INTEGER, data_length INTEGER, index_length INTEGER, update_time TEXT)');
        $this->pdo->exec('CREATE TABLE information_schema.columns (table_schema TEXT, table_name TEXT, column_name TEXT, data_type TEXT, column_type TEXT, column_key TEXT, column_comment TEXT, is_nullable TEXT, character_maximum_length INTEGER, numeric_precision INTEGER, ordinal_position INTEGER, column_default TEXT, extra TEXT)');
        $this->pdo->exec('CREATE TABLE information_schema.statistics (table_schema TEXT, table_name TEXT, index_name TEXT, column_name TEXT, non_unique INTEGER, seq_in_index INTEGER, collation TEXT)');
    }

    public function prepare(string $sql): SQLiteStatement { return new SQLiteStatement($this, $sql); }
    public function query(string $sql): SQLiteResult { return $this->execute($sql); }
    public function real_escape_string(string $value): string { return str_replace("'", "''", $value); }
    public static function identifier(string $name): string { return '"' . str_replace('"', '""', $name) . '"'; }
    private static function unquote(string $name): string {
        if ($name[0] === '`') return str_replace('``', '`', substr($name, 1, -1));
        if ($name[0] === '"') return str_replace('""', '"', substr($name, 1, -1));
        return trim($name, '[]');
    }

    /** Split SQL lists without splitting quoted text or nested expressions. */
    public static function parts(string $sql): array
    {
        $parts = []; $start = 0; $depth = 0; $quote = '';
        for ($i = 0, $length = strlen($sql); $i < $length; $i++) {
            $c = $sql[$i];
            if ($quote !== '') {
                if ($c === $quote) {
                    if (($sql[$i + 1] ?? '') === $quote) $i++; else $quote = '';
                }
            } elseif (in_array($c, ["'", '"', '`', '['], true)) $quote = $c === '[' ? ']' : $c;
            elseif ($c === '(') $depth++;
            elseif ($c === ')') $depth--;
            elseif ($c === ',' && $depth === 0) { $parts[] = trim(substr($sql, $start, $i - $start)); $start = $i + 1; }
        }
        $parts[] = trim(substr($sql, $start));
        return $parts;
    }

    public function beginWrite(): void {
        $this->pdo->exec('PRAGMA foreign_keys=OFF');
        $this->pdo->beginTransaction();
    }
    public function finishWrite(bool $success): void {
        if (!$this->pdo->inTransaction()) return;
        if (!$success) { $this->pdo->rollBack(); return; }
        if ($this->pdo->query('PRAGMA foreign_key_check')->fetch()) {
            $this->pdo->rollBack();
            throw new RuntimeException('The change would break a table relationship. No changes were saved.');
        }
        $this->pdo->commit();
        $this->pdo->exec('PRAGMA foreign_keys=ON');
    }

    private function refreshCatalog(): void
    {
        if ($this->catalogFresh) return;
        foreach (['tables', 'columns', 'statistics'] as $table) $this->pdo->exec('DELETE FROM information_schema.' . $table);
        // sqlite_master also works on engines predating the sqlite_schema alias.
        $tables = $this->pdo->query("SELECT name, sql, 'main' AS origin FROM main.sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' UNION ALL SELECT name, sql, 'temp' AS origin FROM temp.sqlite_master WHERE type='table'")->fetchAll();
        $tableInsert = $this->pdo->prepare('INSERT INTO information_schema.tables VALUES (?,?,?,?,?,?,?)');
        $columnInsert = $this->pdo->prepare('INSERT INTO information_schema.columns VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)');
        $indexInsert = $this->pdo->prepare('INSERT INTO information_schema.statistics VALUES (?,?,?,?,?,?,?)');
        foreach ($tables as $table) {
            $name = $table['name']; $quoted = self::identifier($name); $origin = $table['origin'];
            $tableInsert->execute([$this->name, $name, 'BASE TABLE', 0, 0, 0, null]);
            $keys = [];
            foreach ($this->pdo->query("PRAGMA $origin.index_list($quoted)") as $index) {
                $indexName = $index['name'];
                $logicalName = str_starts_with($indexName, $name . '__') ? substr($indexName, strlen($name) + 2) : $indexName;
                foreach ($this->pdo->query('PRAGMA ' . $origin . '.index_info(' . self::identifier($indexName) . ')') as $field) {
                    if ($field['name'] === null) continue;
                    $keys[$field['name']] = !empty($index['unique']) ? 'UNI' : ($keys[$field['name']] ?? 'MUL');
                    $indexInsert->execute([$this->name, $name, $logicalName, $field['name'], $index['unique'] ? 0 : 1, $field['seqno'] + 1, 'A']);
                }
            }
            foreach ($this->pdo->query("PRAGMA $origin.table_info($quoted)") as $column) {
                $type = strtoupper($column['type'] ?: 'TEXT');
                $base = strtolower(preg_replace('/\(.*/', '', $type));
                $key = $column['pk'] ? 'PRI' : ($keys[$column['name']] ?? '');
                $default = $column['dflt_value'];
                if (is_string($default) && str_starts_with($default, "'")) $default = str_replace("''", "'", substr($default, 1, -1));
                preg_match('/\((\d+)/', $type, $size);
                $columnInsert->execute([$this->name, $name, $column['name'], $base, $type === 'INTEGER' ? 'INT' : $type, $key, '', ($column['notnull'] || $column['pk']) ? 'NO' : 'YES', $size[1] ?? null, null, $column['cid'] + 1, $default, $column['pk'] && $type === 'INTEGER' ? 'auto_increment' : '']);
                if ($column['pk']) $indexInsert->execute([$this->name, $name, 'PRIMARY', $column['name'], 0, $column['pk'], 'A']);
            }
        }
        $this->catalogFresh = true;
    }

    private function columnSql(string $definition): string
    {
        $definition = preg_replace("/\\s+COMMENT\\s+'(?:''|[^'])*'/i", '', $definition);
        $definition = preg_replace('/\bENUM\s*\([^)]*\)/i', 'TEXT', $definition);
        $definition = preg_replace('/\s+ON UPDATE CURRENT_TIMESTAMP/i', '', $definition);
        if (stripos($definition, 'AUTO_INCREMENT') !== false) {
            $definition = preg_replace('/\b(?:BIGINT|INT|INTEGER)(?:\(\d+\))?/i', 'INTEGER', $definition, 1);
            $definition = preg_replace('/\s+AUTO_INCREMENT/i', '', $definition);
            $definition = preg_replace('/\s+PRIMARY KEY/i', '', $definition);
            $definition .= ' PRIMARY KEY AUTOINCREMENT';
        }
        return $definition;
    }

    private function createTable(string $sql): void
    {
        if (!preg_match('/^(CREATE\s+(?:TEMPORARY\s+)?TABLE\s+(?:IF NOT EXISTS\s+)?)(' . self::IDENT . ')\s*\((.*)\)\s*(?:ENGINE=.*)?$/is', $sql, $match)) throw new RuntimeException('Unsupported table definition.');
        $name = self::unquote($match[2]); $definitions = []; $indexes = []; $auto = false;
        foreach (self::parts($match[3]) as $part) {
            if (preg_match('/^(UNIQUE\s+)?(?:KEY|INDEX)\s+(' . self::IDENT . ')\s*(\(.*\))$/is', $part, $index)) {
                $indexes[] = 'CREATE ' . (!empty($index[1]) ? 'UNIQUE ' : '') . 'INDEX IF NOT EXISTS ' . self::identifier($name . '__' . self::unquote($index[2])) . ' ON ' . self::identifier($name) . ' ' . $index[3];
                continue;
            }
            if (stripos($part, 'AUTO_INCREMENT') !== false) $auto = true;
            $definitions[] = $this->columnSql($part);
        }
        if ($auto) $definitions = array_values(array_filter($definitions, fn ($part) => !preg_match('/^PRIMARY KEY\b/i', $part)));
        $this->pdo->exec($match[1] . $match[2] . ' (' . implode(', ', $definitions) . ')');
        foreach ($indexes as $index) $this->pdo->exec($index);
    }

    private function rebuild(string $table, array $modifications, ?array $primary): void
    {
        $quoted = self::identifier($table);
        $stmt = $this->pdo->prepare("SELECT sql, 'main' AS origin FROM main.sqlite_master WHERE type='table' AND name=? UNION ALL SELECT sql, 'temp' AS origin FROM temp.sqlite_master WHERE type='table' AND name=?");
        $stmt->execute([$table, $table]); $original = $stmt->fetch(); $stmt->closeCursor();
        if (!$original) throw new RuntimeException('Table not found.');
        $origin = $original['origin'];
        $sequence = null;
        if (stripos($original['sql'], 'AUTOINCREMENT') !== false) {
            $sequenceQuery = $this->pdo->prepare("SELECT seq FROM $origin.sqlite_sequence WHERE name=?");
            $sequenceQuery->execute([$table]);
            $sequence = $sequenceQuery->fetchColumn();
            $sequenceQuery->closeCursor();
        }
        $start = strpos($original['sql'], '('); $end = strrpos($original['sql'], ')');
        $definitions = self::parts(substr($original['sql'], $start + 1, $end - $start - 1));
        $suffix = substr($original['sql'], $end + 1);
        $names = []; $select = [];
        foreach ($definitions as &$definition) {
            if (preg_match('/^(?:CONSTRAINT\s+' . self::IDENT . '\s+)?PRIMARY KEY\b/i', $definition) && $primary !== null) { $definition = ''; continue; }
            if (!preg_match('/^(' . self::IDENT . ')\s+(.+)$/is', $definition, $match) || preg_match('/^(CONSTRAINT|PRIMARY|UNIQUE|CHECK|FOREIGN)\b/i', $definition)) continue;
            $name = self::unquote($match[1]); $old = $match[2];
            if (isset($modifications[$name])) {
                $next = $this->columnSql($modifications[$name]);
                if ($primary === null && preg_match('/\bPRIMARY KEY\b/i', $old) && !preg_match('/\bPRIMARY KEY\b/i', $next)) $next .= ' PRIMARY KEY';
                // Keep constraints that the design editor does not expose.
                if (preg_match('/\b(CHECK\s*\(.*|REFERENCES\s+.*|COLLATE\s+\w+.*|UNIQUE\b.*)$/is', $old, $constraint)) $next .= ' ' . $constraint[0];
                $definition = self::identifier($name) . ' ' . $next;
                if (preg_match('/^(INT|INTEGER|BIGINT|TINYINT|DECIMAL|NUMERIC|REAL|DOUBLE|FLOAT)\b/i', $next)) {
                    $bad = $this->pdo->query('SELECT ' . self::identifier($name) . ' AS value FROM ' . $quoted . ' WHERE ' . self::identifier($name) . ' IS NOT NULL')->fetchAll();
                    foreach ($bad as $value) if (!is_numeric($value['value'])) throw new RuntimeException('Field ' . $name . ' contains non-numeric values.');
                }
            }
            if ($primary !== null) $definition = preg_replace('/\s+PRIMARY KEY(?:\s+AUTOINCREMENT)?/i', '', $definition);
            $names[] = self::identifier($name); $select[] = self::identifier($name);
        }
        unset($definition);
        if ($primary) $definitions[] = 'PRIMARY KEY (' . implode(', ', array_map([self::class, 'identifier'], $primary)) . ')';
        $objects = $this->pdo->query("SELECT sql FROM $origin.sqlite_master WHERE tbl_name=" . $this->pdo->quote($table) . " AND type IN ('index','trigger') AND sql IS NOT NULL")->fetchAll();
        $temp = '__acacia_rebuild_' . bin2hex(random_bytes(6));
        $ownsTransaction = !$this->pdo->inTransaction();
        if ($ownsTransaction) $this->beginWrite();
        try {
            $this->pdo->exec('CREATE ' . ($origin === 'temp' ? 'TEMP ' : '') . 'TABLE ' . self::identifier($temp) . ' (' . implode(', ', array_filter($definitions)) . ')' . $suffix);
            $this->pdo->exec('INSERT INTO ' . self::identifier($temp) . ' (' . implode(',', $names) . ') SELECT ' . implode(',', $select) . ' FROM ' . $quoted);
            $this->pdo->exec('DROP TABLE ' . $origin . '.' . $quoted);
            $this->pdo->exec('ALTER TABLE ' . self::identifier($temp) . ' RENAME TO ' . $quoted);
            if ($sequence !== null && $sequence !== false && stripos(implode(' ', $definitions), 'AUTOINCREMENT') !== false) {
                $restoreSequence = $this->pdo->prepare("UPDATE $origin.sqlite_sequence SET seq=MAX(seq, ?) WHERE name=?");
                $restoreSequence->execute([(int) $sequence, $table]);
            }
            foreach ($objects as $object) $this->pdo->exec($object['sql']);
            if ($ownsTransaction) $this->finishWrite(true);
        } catch (Throwable $error) {
            if ($ownsTransaction) $this->finishWrite(false);
            throw $error;
        }
    }

    private function alterTable(string $sql): void
    {
        preg_match('/^ALTER TABLE\s+(' . self::IDENT . ')\s+(.+)$/is', $sql, $match);
        $table = self::unquote($match[1]); $quoted = self::identifier($table); $modifications = []; $primary = null;
        foreach (self::parts($match[2]) as $action) {
            if (preg_match('/^ADD\s+(UNIQUE\s+)?INDEX\s+(' . self::IDENT . ')\s*(\(.*\))$/is', $action, $part)) {
                $this->pdo->exec('CREATE ' . (!empty($part[1]) ? 'UNIQUE ' : '') . 'INDEX ' . self::identifier($table . '__' . self::unquote($part[2])) . ' ON ' . $quoted . ' ' . $part[3]);
            } elseif (preg_match('/^DROP INDEX\s+(' . self::IDENT . ')$/i', $action, $part)) {
                $this->pdo->exec('DROP INDEX ' . self::identifier($table . '__' . self::unquote($part[1])));
            } elseif (preg_match('/^(MODIFY|CHANGE)\s+(?:COLUMN\s+)?(' . self::IDENT . ')\s+(.+)$/is', $action, $part)) {
                $name = self::unquote($part[2]); $definition = $part[3];
                if (strtoupper($part[1]) === 'CHANGE') {
                    preg_match('/^(' . self::IDENT . ')\s+(.+)$/is', $definition, $rename);
                    $newName = self::unquote($rename[1]); $definition = $rename[2];
                    if ($newName !== $name) $this->pdo->exec('ALTER TABLE ' . $quoted . ' RENAME COLUMN ' . self::identifier($name) . ' TO ' . self::identifier($newName));
                    $name = $newName;
                }
                $modifications[$name] = $definition;
            } elseif (preg_match('/^DROP PRIMARY KEY$/i', $action)) $primary = [];
            elseif (preg_match('/^ADD PRIMARY KEY\s*\((.*)\)$/is', $action, $part)) $primary = array_map([self::class, 'unquote'], self::parts($part[1]));
            elseif (preg_match('/^ADD COLUMN\s+(.+)$/is', $action, $part)) {
                $definition = preg_replace('/\s+(?:AFTER\s+' . self::IDENT . '|FIRST)\s*$/i', '', $part[1]);
                $this->pdo->exec('ALTER TABLE ' . $quoted . ' ADD COLUMN ' . $this->columnSql($definition));
            } else $this->pdo->exec('ALTER TABLE ' . $quoted . ' ' . $action);
        }
        if ($modifications || $primary !== null) $this->rebuild($table, $modifications, $primary);
    }

    public function execute(string $sql, array $parameters = []): SQLiteResult
    {
        $sql = trim(rtrim(trim($sql), ';'));
        if (stripos($sql, 'information_schema.') !== false) $this->refreshCatalog();
        if (preg_match('/^SHOW FULL TABLES/i', $sql)) $sql = "SELECT name FROM main.sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name";
        elseif (preg_match('/^SHOW INDEX FROM\s+(' . self::IDENT . ')/i', $sql, $match)) {
            $this->refreshCatalog(); $parameters = [self::unquote($match[1])];
            $sql = 'SELECT index_name AS Key_name FROM information_schema.statistics WHERE table_name=?';
        } elseif (preg_match('/^SHOW COLUMNS FROM\s+(' . self::IDENT . ')\s+LIKE\s+(.+)$/i', $sql, $match)) {
            $this->refreshCatalog(); $parameters = [self::unquote($match[1])];
            $sql = 'SELECT column_name AS Field, column_type AS Type FROM information_schema.columns WHERE table_name=? AND column_name LIKE ' . $match[2];
        }
        if (preg_match('/^CREATE\s+(?:TEMPORARY\s+)?TABLE\b/i', $sql)) { $this->createTable($sql); $this->catalogFresh = false; return new SQLiteResult([]); }
        if (preg_match('/^ALTER TABLE\b/i', $sql)) { $this->alterTable($sql); $this->catalogFresh = false; return new SQLiteResult([]); }
        if (preg_match('/^RENAME TABLE\s+(' . self::IDENT . ')\s+TO\s+(' . self::IDENT . ')$/i', $sql, $match)) $sql = 'ALTER TABLE ' . $match[1] . ' RENAME TO ' . $match[2];
        $sql = preg_replace('/^DROP TEMPORARY TABLE/i', 'DROP TABLE', $sql);
        if (preg_match('/^INSERT INTO\s+(' . self::IDENT . ')\s*\(\)\s*VALUES\s*\(\)$/i', $sql, $match)) $sql = 'INSERT INTO ' . $match[1] . ' DEFAULT VALUES';
        if (preg_match('/^(UPDATE|DELETE)\b/i', $sql)) $sql = preg_replace('/\s+LIMIT 1\s*$/i', '', $sql);
        if (preg_match('/\s+ON DUPLICATE KEY UPDATE\s+(.+)$/is', $sql, $match, PREG_OFFSET_CAPTURE)) {
            $assignments = preg_replace('/VALUES\((`?\w+`?)\)/i', 'excluded.$1', $match[1][0]);
            $sql = substr($sql, 0, $match[0][1]) . ' ON CONFLICT DO UPDATE SET ' . $assignments;
        }
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute(array_values($parameters));
        if (preg_match('/^INSERT\b/i', $sql)) $this->insert_id = (int) $this->pdo->lastInsertId();
        if (preg_match('/^(DROP|ALTER)\b/i', $sql)) $this->catalogFresh = false;
        return new SQLiteResult($stmt->columnCount() ? $stmt->fetchAll() : []);
    }
}
