<?php
$query = $context['query'] ?? 'OpenOrders';
$title = $context['title'] ?? $query;
?>
<div class="view-shell" data-title="<?= htmlspecialchars($title, ENT_QUOTES) ?>" data-status="Query Graph View">
    <div class="query-builder" data-query-builder data-query-id="<?= htmlspecialchars($query, ENT_QUOTES) ?>">
        <div class="query-toolbar">
            <select class="query-table-picker" data-table-picker></select>
            <button class="query-tool active" data-add-selected-table>Add Table</button>
            <button class="query-tool" data-clear-connections>Clear Links</button>
            <span class="query-hint">Drag nodes. Click one column, then another column on a different table to create a link. Select a link and press Delete to remove it.</span>
        </div>

        <div class="query-canvas" data-query-canvas tabindex="0">
            <svg class="query-wires" data-query-wires aria-hidden="true"></svg>
        </div>

        <div class="query-bottom">
            <div data-query-grid></div>
        </div>
    </div>
</div>
