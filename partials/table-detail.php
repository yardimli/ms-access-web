<?php
$table = $context['table'] ?? 'Customers';
$title = $context['title'] ?? $table;
?>
<div class="view-shell" data-title="<?= htmlspecialchars($title, ENT_QUOTES) ?>" data-status="Table Design View">
    <div class="design-view" data-design-view data-table-id="<?= htmlspecialchars($table, ENT_QUOTES) ?>">
        <div class="p-6 text-neutral-500">Loading table structure...</div>
    </div>
</div>
