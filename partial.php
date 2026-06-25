<?php

require_once __DIR__ . '/lib/db.php';

$view = $_GET['view'] ?? 'table-customers';

function access_slug(string $name): string
{
    $name = preg_replace('/(?<!^)[A-Z]/', '-$0', $name);
    $name = preg_replace('/[^A-Za-z0-9]+/', '-', $name);
    return strtolower(trim($name, '-'));
}

function fetch_object_names(mysqli $db, string $type): array
{
    $stmt = $db->prepare('SELECT object_name FROM access_object_definitions WHERE object_type = ? ORDER BY object_name');
    $stmt->bind_param('s', $type);
    $stmt->execute();

    $names = [];
    foreach ($stmt->get_result() as $row) {
        $names[] = $row['object_name'];
    }

    return $names;
}

function first_object_name(mysqli $db, string $type): ?string
{
    $names = fetch_object_names($db, $type);
    return $names[0] ?? null;
}

$context = null;

try {
    $db = db_connect();

    $tableResult = $db->query('SHOW FULL TABLES WHERE Table_type = "BASE TABLE"');
    $firstTable = null;
    foreach ($tableResult as $row) {
        $table = array_values($row)[0];
        if ($table === 'access_object_definitions') {
            continue;
        }

        $firstTable ??= $table;
        $slug = access_slug($table);
        if ($view === "table-$slug") {
            $context = ['file' => 'partials/table-grid.php', 'table' => $table, 'title' => $table];
            break;
        }

        if ($view === "design-$slug") {
            $context = ['file' => 'partials/table-detail.php', 'table' => $table, 'title' => $table];
            break;
        }
    }

    if (!$context && $view === 'table-detail' && $firstTable) {
        $context = ['file' => 'partials/table-detail.php', 'table' => $firstTable, 'title' => $firstTable];
    }

    if (!$context) {
        foreach (fetch_object_names($db, 'form') as $form) {
            $slug = access_slug($form);
            if ($view === "form-$slug") {
                $context = ['file' => 'partials/form.php', 'form' => $form, 'title' => $form];
                break;
            }

            if ($view === "design-form-$slug") {
                $context = ['file' => 'partials/form-design.php', 'form' => $form, 'title' => $form];
                break;
            }
        }
    }

    if (!$context) {
        foreach (fetch_object_names($db, 'query') as $query) {
            if ($view === 'query-' . access_slug($query) || ($view === 'query-sales-region' && $query === 'SalesByRegion')) {
                $context = ['file' => 'partials/query.php', 'query' => $query, 'title' => $query];
                break;
            }
        }
    }

    if (!$context) {
        foreach (fetch_object_names($db, 'report') as $report) {
            if ($view === 'report-' . access_slug($report) || $view === 'report') {
                $context = ['file' => 'partials/report.php', 'report' => $report, 'title' => $report];
                break;
            }
        }
    }
} catch (Throwable $exception) {
    http_response_code(500);
    echo '<div class="p-6 text-red-700">Database error: ' . htmlspecialchars($exception->getMessage(), ENT_QUOTES) . '</div>';
    exit;
}

if (!$context) {
    http_response_code(404);
    echo '<div class="p-6 text-red-700">View not found.</div>';
    exit;
}

include $context['file'];
