<?php

require_once __DIR__ . '/../lib/access_data.php';

$view = $_GET['view'] ?? '';

function view_payload(string $view, string $type, string $mode, string $object, string $title, string $status, array $data = []): array
{
    return [
        'view' => $view,
        'type' => $type,
        'mode' => $mode,
        'object' => $object,
        'title' => $title,
        'status' => $status,
        'data' => $data,
    ];
}

function object_payload(mysqli $db, string $type, string $name): ?array
{
    $definition = fetch_object($db, $type, $name);
    return $definition ? [$name => $definition] : null;
}

function table_reference_payload(mysqli $db, array $tableNames, bool $includeRows): array
{
    $tables = [];
    foreach ($tableNames as $name) {
        $resolved = resolve_table_name($db, $name);
        if ($resolved && !isset($tables[$resolved])) {
            $tables[$resolved] = fetch_table_payload($db, $resolved, $includeRows);
        }
    }

    return $tables;
}

try {
    $db = db_connect();
    $payload = null;
    $firstTable = null;

    foreach (fetch_table_names($db) as $table) {
        $firstTable ??= $table;
        $slug = access_slug($table);

        if ($view === "table-$slug") {
            $payload = view_payload($view, 'table', 'datasheet', $table, $table, 'Datasheet View', [
                'tables' => [$table => fetch_table_payload($db, $table, true)],
            ]);
            break;
        }

        if ($view === "design-$slug") {
            $payload = view_payload($view, 'table', 'design', $table, $table, 'Table Design View', [
                'tables' => [$table => fetch_table_payload($db, $table, false)],
            ]);
            break;
        }
    }

    if (!$payload && $view === 'table-detail' && $firstTable) {
        $payload = view_payload($view, 'table', 'design', $firstTable, $firstTable, 'Table Design View', [
            'tables' => [$firstTable => fetch_table_payload($db, $firstTable, false)],
        ]);
    }

    if (!$payload) {
        foreach (fetch_object_names($db, 'form') as $formName) {
            $slug = access_slug($formName);
            $isFormView = $view === "form-$slug";
            $isDesignView = $view === "design-form-$slug";

            if (!$isFormView && !$isDesignView) {
                continue;
            }

            $form = fetch_object($db, 'form', $formName);
            if (!$form) {
                break;
            }

            $tables = table_reference_payload($db, [
                $form['parentTable'] ?? '',
                $form['subform']['table'] ?? '',
            ], $isFormView);

            $payload = view_payload(
                $view,
                'form',
                $isDesignView ? 'design' : 'view',
                $formName,
                $formName,
                $isDesignView ? 'Form Design View' : 'Form View',
                [
                    'forms' => [$formName => $form],
                    'tables' => $tables,
                ]
            );
            break;
        }
    }

    if (!$payload) {
        foreach (fetch_object_names($db, 'query') as $queryName) {
            if ($view !== 'query-' . access_slug($queryName) && !($view === 'query-sales-region' && $queryName === 'SalesByRegion')) {
                continue;
            }

            $query = fetch_object($db, 'query', $queryName);
            if (!$query) {
                break;
            }

            $payload = view_payload($view, 'query', 'builder', $queryName, $queryName, 'Query Graph View', [
                'queries' => [$queryName => $query],
                'tables' => table_reference_payload($db, fetch_table_names($db), false),
            ]);
            break;
        }
    }

    if (!$payload) {
        foreach (fetch_object_names($db, 'report') as $reportName) {
            if ($view !== 'report-' . access_slug($reportName) && $view !== 'report') {
                continue;
            }

            $report = fetch_object($db, 'report', $reportName);
            if (!$report) {
                break;
            }

            $payload = view_payload($view, 'report', 'view', $reportName, $reportName, 'Report View', [
                'reports' => [$reportName => $report],
            ]);
            break;
        }
    }

    if (!$payload) {
        json_response(['ok' => false, 'error' => 'View not found.'], 404);
        exit;
    }

    json_response(['ok' => true, 'view' => $payload]);
} catch (Throwable $exception) {
    json_response(['ok' => false, 'error' => $exception->getMessage()], 500);
}
