<?php
require_once __DIR__ . '/../lib/database_chat.php';
try {
    set_time_limit(120);
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') throw new RuntimeException('POST required.');
    $reference = active_database_name();
    if (!str_starts_with($reference, 'sqlite:')) throw new RuntimeException('Chat currently only works with SQLite databases.');
    $request = json_decode(file_get_contents('php://input'), true, 512, JSON_THROW_ON_ERROR);
    $messages = $request['messages'] ?? null;
    if (!is_array($messages) || !$messages || count($messages) > 200) throw new RuntimeException('Send between 1 and 200 chat messages. Reset chat to start a new conversation.');
    foreach ($messages as &$message) {
        if (!is_array($message) || !in_array($message['role'] ?? '', ['user','assistant'], true) || !is_string($message['content'] ?? null) || strlen($message['content']) > 50000) throw new RuntimeException('Invalid chat message.');
        $message = ['role' => $message['role'], 'content' => $message['content']];
    }
    unset($message);
    if (end($messages)['role'] !== 'user') throw new RuntimeException('The last message must be a user request.');
    if ($reference === 'sqlite:demo') ensure_browser_demo();
    $path = workspace_database_path($reference);
    $db = new SQLiteConnection($path, $reference); ensure_acaciadb_storage($db);
    $structure = chat_structure($db); $fingerprint = hash('sha256', json_encode($structure)); $db = null;
    $plan = chat_completion($messages, $structure);
    $db = new SQLiteConnection($path, $reference);
    $steps = chat_apply($db, $plan, $fingerprint);
    json_response(['ok' => true, 'message' => $plan['message'], 'actions' => $plan['actions'], 'applied' => count($steps), 'database' => $reference]);
} catch (Throwable $error) { json_response(['ok' => false, 'error' => $error->getMessage()], 400); }
