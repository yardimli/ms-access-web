<?php

function browser_workspace_key(): string
{
    $key = strtolower((string) ($_SERVER['HTTP_X_ACACIA_USER'] ?? ''));
    if (!preg_match('/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/', $key)) throw new RuntimeException('A browser workspace key is required. Reload the application.');
    return $key;
}

function browser_workspace_dir(): string
{
    $root = env_value('WORKSPACE_TEMP_DIR', sys_get_temp_dir() . '/acaciadb-' . substr(hash('sha256', dirname(__DIR__)), 0, 12));
    $directory = $root . '/' . browser_workspace_key();
    if (!is_dir($directory) && !mkdir($directory, 0700, true) && !is_dir($directory)) throw new RuntimeException('Cannot create the temporary database folder.');
    return $directory;
}

function workspace_file_id(string $reference): string
{
    $id = str_starts_with($reference, 'sqlite:') ? substr($reference, 7) : $reference;
    if ($id !== 'demo' && !preg_match('/^[a-f0-9]{32}$/', $id)) throw new RuntimeException('Invalid database file.');
    return $id;
}

function workspace_database_path(string $reference, bool $mustExist = true): string
{
    $path = browser_workspace_dir() . '/' . workspace_file_id($reference) . '.sqlite';
    if ($mustExist && !is_file($path)) throw new RuntimeException('This database is not in your browser workspace.');
    return $path;
}

function ensure_browser_demo(): void
{
    $directory = browser_workspace_dir();
    $lock = fopen($directory . '/demo.lock', 'c');
    if (!$lock || !flock($lock, LOCK_EX)) throw new RuntimeException('Cannot initialize the demo.');
    try {
        if (!is_file($directory . '/demo.sqlite')) {
            $template = dirname(__DIR__) . '/data/northwind-demo.sqlite';
            if (!is_file($template)) throw new RuntimeException('The Northwind demo has not been generated. Run scripts/export_northwind.php.');
            $staging = $directory . '/demo.copy';
            if (!copy($template, $staging) || !rename($staging, $directory . '/demo.sqlite')) throw new RuntimeException('Cannot copy the demo database.');
        }
    } finally { flock($lock, LOCK_UN); fclose($lock); }
}

function workspace_database_info(string $id): array
{
    $path = workspace_database_path($id);
    $metadata = json_decode(@file_get_contents(substr($path, 0, -7) . '.json') ?: '{}', true) ?: [];
    return ['id' => 'sqlite:' . $id, 'name' => $id === 'demo' ? 'Northwind Demo' : ($metadata['name'] ?? 'Database'),
        'engine' => 'sqlite', 'demo' => $id === 'demo', 'sizeBytes' => filesize($path),
        'updatedAt' => date('c', filemtime($path)), 'createdAt' => $metadata['createdAt'] ?? null];
}

function workspace_catalog(): array
{
    ensure_browser_demo();
    $files = [];
    foreach (glob(browser_workspace_dir() . '/*.sqlite') as $path) {
        $id = basename($path, '.sqlite');
        if ($id !== 'demo' && !preg_match('/^[a-f0-9]{32}$/', $id)) continue;
        $files[] = workspace_database_info($id);
    }
    usort($files, fn ($a, $b) => ($b['demo'] <=> $a['demo']) ?: strcasecmp($a['name'], $b['name']));
    return $files;
}

function register_workspace_database(string $path, string $name): array
{
    $id = bin2hex(random_bytes(16));
    $target = workspace_database_path($id, false);
    if (!rename($path, $target)) throw new RuntimeException('Cannot store the database.');
    file_put_contents(substr($target, 0, -7) . '.json', json_encode(['name' => trim($name) ?: 'Database', 'createdAt' => date('c')], JSON_THROW_ON_ERROR), LOCK_EX);
    return workspace_database_info($id);
}

function mysql_browser_settings(): array
{
    $encoded = $_SERVER['HTTP_X_ACACIA_CONNECTION'] ?? '';
    if ($encoded === '') {
        if (PHP_SAPI !== 'cli') throw new RuntimeException('Set up your MariaDB/MySQL connection in File first.');
        return ['host' => env_value('DB_HOST', 'localhost'), 'port' => env_value('DB_PORT', '3306'), 'username' => env_value('DB_USERNAME', 'root'), 'password' => env_value('DB_PASSWORD', '')];
    }
    $settings = json_decode(base64_decode($encoded, true) ?: '', true);
    if (!is_array($settings) || empty($settings['host']) || empty($settings['username'])) throw new RuntimeException('Enter a server and username for MariaDB/MySQL.');
    $settings['port'] = max(1, min(65535, (int) ($settings['port'] ?? 3306)));
    return $settings;
}
