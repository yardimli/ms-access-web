<?php
$view = $_GET['view'] ?? 'table-customers';

$views = [
    'table-customers' => ['file' => 'partials/table-grid.php', 'table' => 'Customers', 'title' => 'Customers'],
    'table-orders' => ['file' => 'partials/table-grid.php', 'table' => 'Orders', 'title' => 'Orders'],
    'table-order-items' => ['file' => 'partials/table-grid.php', 'table' => 'OrderItems', 'title' => 'OrderItems'],
    'table-products' => ['file' => 'partials/table-grid.php', 'table' => 'Products', 'title' => 'Products'],
    'table-regions' => ['file' => 'partials/table-grid.php', 'table' => 'Regions', 'title' => 'Regions'],
    'table-sales-targets' => ['file' => 'partials/table-grid.php', 'table' => 'SalesTargets', 'title' => 'SalesTargets'],
    'design-customers' => ['file' => 'partials/table-detail.php', 'table' => 'Customers', 'title' => 'Customers'],
    'design-orders' => ['file' => 'partials/table-detail.php', 'table' => 'Orders', 'title' => 'Orders'],
    'design-order-items' => ['file' => 'partials/table-detail.php', 'table' => 'OrderItems', 'title' => 'OrderItems'],
    'design-products' => ['file' => 'partials/table-detail.php', 'table' => 'Products', 'title' => 'Products'],
    'design-regions' => ['file' => 'partials/table-detail.php', 'table' => 'Regions', 'title' => 'Regions'],
    'design-sales-targets' => ['file' => 'partials/table-detail.php', 'table' => 'SalesTargets', 'title' => 'SalesTargets'],
    'table-detail' => ['file' => 'partials/table-detail.php', 'table' => 'Customers', 'title' => 'Customers'],
    'form-customer-orders' => ['file' => 'partials/form.php', 'form' => 'CustomerOrders', 'title' => 'CustomerOrders'],
    'form-invoice-entry' => ['file' => 'partials/form.php', 'form' => 'InvoiceEntry', 'title' => 'InvoiceEntry'],
    'query-open-orders' => ['file' => 'partials/query.php', 'query' => 'OpenOrders', 'title' => 'OpenOrders'],
    'query-sales-region' => ['file' => 'partials/query.php', 'query' => 'SalesByRegion', 'title' => 'SalesByRegion'],
    'report' => ['file' => 'partials/report.php', 'title' => 'InvoiceSummary'],
];

if (!isset($views[$view])) {
    http_response_code(404);
    echo '<div class="p-6 text-red-700">View not found.</div>';
    exit;
}

$context = $views[$view];
include $context['file'];
