<?php

require_once __DIR__ . '/../lib/db.php';

function expression_log(array $entry): void
{
    $dir = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'logs';
    if (!is_dir($dir)) {
        mkdir($dir, 0775, true);
    }

    $entry['timestamp'] = date('c');
    file_put_contents(
        $dir . DIRECTORY_SEPARATOR . 'llm-logs.txt',
        json_encode($entry, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . PHP_EOL,
        FILE_APPEND | LOCK_EX
    );
}

function expression_request(): array
{
    $raw = file_get_contents('php://input') ?: '';
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function expression_extract_json(string $content): array
{
    $content = trim($content);
    if ($content === '') {
        throw new RuntimeException('The model returned an empty response.');
    }

    $content = preg_replace('/^```(?:json)?\s*/i', '', $content);
    $content = preg_replace('/\s*```$/', '', $content);
    $decoded = json_decode($content, true);

    if (is_array($decoded)) {
        return $decoded;
    }

    if (preg_match('/\{.*\}/s', $content, $match)) {
        $decoded = json_decode($match[0], true);
        if (is_array($decoded)) {
            return $decoded;
        }
    }

    throw new RuntimeException('The model response was not valid JSON.');
}

try {
    $request = expression_request();
    $expression = trim((string) ($request['expression'] ?? ''));
    $columns = is_array($request['columns'] ?? null) ? $request['columns'] : [];
    $tableName = trim((string) ($request['tableName'] ?? ''));
    $fieldName = trim((string) ($request['fieldName'] ?? ''));

    if ($expression === '') {
        throw new RuntimeException('Expression is empty.');
    }

    $key = env_value('OPENROUTER_API_KEY', '');
    $model = env_value('OPENROUTER_MODEL', '');

    if ($key === '' || $model === '') {
        expression_log([
            'event' => 'expression.convert',
            'status' => 'configuration_error',
            'model' => $model,
            'tableName' => $tableName,
            'fieldName' => $fieldName,
            'expression' => $expression,
            'error' => 'OpenRouter is not configured.',
        ]);
        throw new RuntimeException('OpenRouter is not configured. Add OPENROUTER_API_KEY and OPENROUTER_MODEL to .env.');
    }

    $columnSummary = array_map(static function (array $column): array {
        return [
            'name' => (string) ($column['name'] ?? ''),
            'type' => (string) ($column['type'] ?? ''),
            'mysqlType' => (string) ($column['mysqlType'] ?? ''),
        ];
    }, $columns);

    $payload = [
        'model' => $model,
        'temperature' => 0,
        'max_tokens' => 700,
        'response_format' => ['type' => 'json_object'],
        'messages' => [
            [
                'role' => 'system',
                'content' => implode("\n", [
                    'Convert Microsoft Access validation expressions to JavaScript.',
                    'First validate whether the expression is a valid Microsoft Access validation expression using the supplied fields.',
                    'Return strict JSON only with keys ok, javascript, error, and notes.',
                    'If the expression is invalid or cannot be converted safely, return {"ok":false,"javascript":"","error":"short reason","notes":""}.',
                    'If it can be converted, return {"ok":true,"javascript":"function(fields) { ... }","error":"","notes":"..."}',
                    'javascript must be a JavaScript function expression only when ok is true.',
                    'The function signature must be function(fields) { ... }.',
                    'Use fields["ColumnName"] for table fields.',
                    'Use plain JavaScript only. Do not use accessFns or helper libraries.',
                    'Example: IsNull([CreditLimit]) becomes function(fields) { return fields["CreditLimit"] == null; }.',
                    'Return a boolean-compatible validation result.',
                    'Do not include markdown, comments, imports, fetch, eval, Function, document, window, globalThis, or side effects.',
                ]),
            ],
            [
                'role' => 'user',
                'content' => json_encode([
                    'tableName' => $tableName,
                    'fieldName' => $fieldName,
                    'columns' => $columnSummary,
                    'expression' => $expression,
                ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
            ],
        ],
    ];

    $curl = curl_init('https://openrouter.ai/api/v1/chat/completions');
    curl_setopt_array($curl, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => [
            'Authorization: Bearer ' . $key,
            'Content-Type: application/json',
            'HTTP-Referer: http://localhost/ms-access-web/index.php',
            'X-Title: MS Access Web',
        ],
        CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
        CURLOPT_TIMEOUT => 25,
    ]);

    $responseBody = curl_exec($curl);
    $curlError = curl_error($curl);
    $status = (int) curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
    curl_close($curl);

    if ($responseBody === false || $curlError !== '') {
        expression_log([
            'event' => 'expression.convert',
            'status' => 'transport_error',
            'model' => $model,
            'tableName' => $tableName,
            'fieldName' => $fieldName,
            'expression' => $expression,
            'error' => $curlError,
        ]);
        throw new RuntimeException('OpenRouter request failed: ' . $curlError);
    }

    $response = json_decode($responseBody, true);
    if ($status < 200 || $status >= 300) {
        $message = $response['error']['message'] ?? $responseBody;
        expression_log([
            'event' => 'expression.convert',
            'status' => 'http_error',
            'httpStatus' => $status,
            'model' => $model,
            'tableName' => $tableName,
            'fieldName' => $fieldName,
            'expression' => $expression,
            'error' => $message,
        ]);
        throw new RuntimeException('OpenRouter returned HTTP ' . $status . ': ' . $message);
    }

    $content = (string) ($response['choices'][0]['message']['content'] ?? '');
    $modelJson = expression_extract_json($content);
    $modelOk = filter_var($modelJson['ok'] ?? true, FILTER_VALIDATE_BOOL);
    $javascript = trim((string) ($modelJson['javascript'] ?? ''));

    if (!$modelOk) {
        $modelError = trim((string) ($modelJson['error'] ?? 'The expression could not be converted.'));
        expression_log([
            'event' => 'expression.convert',
            'status' => 'model_validation_error',
            'httpStatus' => $status,
            'model' => (string) ($response['model'] ?? $model),
            'tableName' => $tableName,
            'fieldName' => $fieldName,
            'expression' => $expression,
            'error' => $modelError,
            'notes' => (string) ($modelJson['notes'] ?? ''),
        ]);
        throw new RuntimeException($modelError !== '' ? $modelError : 'The expression could not be converted.');
    }

    if ($javascript === '') {
        expression_log([
            'event' => 'expression.convert',
            'status' => 'empty_javascript',
            'httpStatus' => $status,
            'model' => (string) ($response['model'] ?? $model),
            'tableName' => $tableName,
            'fieldName' => $fieldName,
            'expression' => $expression,
            'rawContent' => $content,
        ]);
        throw new RuntimeException('The model did not return JavaScript.');
    }

    expression_log([
        'event' => 'expression.convert',
        'status' => 'success',
        'httpStatus' => $status,
        'model' => (string) ($response['model'] ?? $model),
        'tableName' => $tableName,
        'fieldName' => $fieldName,
        'expression' => $expression,
        'javascript' => $javascript,
        'notes' => (string) ($modelJson['notes'] ?? ''),
        'usage' => $response['usage'] ?? null,
    ]);

    json_response([
        'ok' => true,
        'javascript' => $javascript,
        'notes' => (string) ($modelJson['notes'] ?? ''),
        'model' => (string) ($response['model'] ?? $model),
    ]);
} catch (Throwable $exception) {
    json_response(['ok' => false, 'error' => $exception->getMessage()], 400);
}
