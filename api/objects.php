<?php

require_once __DIR__ . '/../lib/acaciadb_data.php';

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        json_response(['ok' => false, 'error' => 'POST required.'], 405);
        exit;
    }
    $request = json_decode(file_get_contents('php://input'), true, 512, JSON_THROW_ON_ERROR);
    $name = (string) ($request['name'] ?? '');
    $definition = $request['definition'] ?? null;
    $db = db_connect();
    $existing = fetch_object($db, 'query', $name);
    if (!$existing || !is_array($definition)) throw new RuntimeException('Query was not found or the definition is invalid.');
    foreach (['tables', 'fields', 'connections', 'positions'] as $key) {
        if (!is_array($definition[$key] ?? null)) throw new RuntimeException('Invalid query ' . $key . '.');
        $existing[$key] = $definition[$key];
    }
    $json = json_encode($existing, JSON_THROW_ON_ERROR);
    if (array_key_exists('sourceSql', $definition)) {
        $existing['sourceSql'] = (string) $definition['sourceSql'];
        $json = json_encode($existing, JSON_THROW_ON_ERROR);
    }
    $stmt = $db->prepare('UPDATE acaciadb_object_definitions SET definition_json = ? WHERE object_type = "query" AND object_name = ?');
    $stmt->bind_param('ss', $json, $name);
    $stmt->execute();
    json_response(['ok' => true]);
} catch (Throwable $exception) {
    json_response(['ok' => false, 'error' => $exception->getMessage()], 400);
}
