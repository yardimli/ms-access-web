<?php
require_once __DIR__ . '/../lib/access_import.php';

try {
    $directory = browser_workspace_dir();
    if ($_SERVER['REQUEST_METHOD'] === 'GET' && ($_GET['action'] ?? '') === 'download') {
        $id = workspace_file_id((string) ($_GET['database'] ?? ''));
        $path = workspace_database_path($id);
        $info = workspace_database_info($id);
        // VACUUM INTO makes a consistent, standalone file even if the source uses WAL.
        $snapshot = $directory . '/' . bin2hex(random_bytes(16)) . '.download';
        $pdo = new PDO('sqlite:' . $path, null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
        $pdo->exec('PRAGMA busy_timeout=5000');
        $pdo->exec('VACUUM INTO ' . $pdo->quote($snapshot));
        header('Content-Type: application/vnd.sqlite3');
        header('Content-Disposition: attachment; filename="' . preg_replace('/[^A-Za-z0-9._ -]/', '_', $info['name']) . '.sqlite"');
        header('Content-Length: ' . filesize($snapshot));
        try { readfile($snapshot); } finally { unlink($snapshot); }
        exit;
    }
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') throw new RuntimeException('Unsupported file action.');
    $request = json_decode(file_get_contents('php://input') ?: '{}', true) ?: $_POST;
    $action = (string) ($request['action'] ?? 'upload');
    if ($action === 'delete' || $action === 'reset') {
        $id = workspace_file_id((string) ($request['database'] ?? ''));
        $path = workspace_database_path($id);
        if (!unlink($path)) throw new RuntimeException('The database could not be deleted. Close other operations and retry.');
        foreach ([$path . '-wal', $path . '-shm', substr($path, 0, -7) . '.json'] as $extra) if (is_file($extra)) unlink($extra);
        if ($id === 'demo') ensure_browser_demo();
        json_response(['ok' => true]); exit;
    }
    if ($action === 'import' || $action === 'cancelImport') {
        $token = (string) ($request['token'] ?? '');
        if (!preg_match('/^[a-f0-9]{32}$/', $token)) throw new RuntimeException('Invalid import.');
        $importDirectory = $directory . '/import-' . $token;
        if (!is_file($importDirectory . '/manifest.json')) throw new RuntimeException('This import is not in your workspace.');
        if ($action === 'import') {
            $result = convert_access_selection($importDirectory, (array) ($request['selection'] ?? []), (string) ($request['name'] ?? 'Imported Access database'));
        }
        foreach (glob($importDirectory . '/*') as $file) if (is_file($file)) unlink($file);
        rmdir($importDirectory);
        json_response(['ok' => true] + ($result ?? [])); exit;
    }
    $upload = $_FILES['file'] ?? null;
    if (!$upload || $upload['error'] !== UPLOAD_ERR_OK) throw new RuntimeException('Upload failed. Check the server upload limit and try again.');
    $extension = strtolower(pathinfo($upload['name'], PATHINFO_EXTENSION));
    $label = pathinfo(basename($upload['name']), PATHINFO_FILENAME);
    if (in_array($extension, ['mdb', 'accdb'], true)) {
        $token = bin2hex(random_bytes(16)); $importDirectory = $directory . '/import-' . $token;
        mkdir($importDirectory, 0700);
        if (!move_uploaded_file($upload['tmp_name'], $importDirectory . '/source.access')) throw new RuntimeException('Cannot store the upload.');
        $manifest = run_access_reader($importDirectory);
        json_response(['ok' => true, 'kind' => 'access', 'token' => $token, 'name' => $label, 'manifest' => $manifest]); exit;
    }
    if (!in_array($extension, ['sqlite', 'sqlite3', 'db'], true)) throw new RuntimeException('Choose a SQLite, MDB, or ACCDB file.');
    $reader = fopen($upload['tmp_name'], 'rb'); $header = fread($reader, 16); fclose($reader);
    if ($header !== "SQLite format 3\0") throw new RuntimeException('This is not an unencrypted SQLite 3 database.');
    $pdo = new PDO('sqlite:' . $upload['tmp_name'], null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
    if ($pdo->query('PRAGMA quick_check')->fetchColumn() !== 'ok') throw new RuntimeException('SQLite validation failed.');
    $pdo = null;
    $file = register_workspace_database($upload['tmp_name'], $label);
    json_response(['ok' => true, 'kind' => 'sqlite', 'item' => $file]);
} catch (Throwable $error) { json_response(['ok' => false, 'error' => $error->getMessage()], 400); }
