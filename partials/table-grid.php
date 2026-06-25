<?php
$table = $context['table'] ?? 'Customers';
$title = $context['title'] ?? $table;
?>
<div class="view-shell" data-title="<?= htmlspecialchars($title, ENT_QUOTES) ?>" data-status="Datasheet View">
    <div class="datasheet-view" data-table-view data-table-id="<?= htmlspecialchars($table, ENT_QUOTES) ?>">
        <div class="datasheet-wrap" data-table-host></div>
        <div class="record-bar" data-record-bar>
            <span>Record:</span>
            <button data-nav="first" title="First record"><i class="fas fa-step-backward"></i></button>
            <button data-nav="previous" title="Previous record"><i class="fas fa-caret-left"></i></button>
            <input data-record-position value="1 of 1">
            <button data-nav="next" title="Next record"><i class="fas fa-caret-right"></i></button>
            <button data-nav="last" title="Last record"><i class="fas fa-step-forward"></i></button>
            <button class="opacity-40" disabled title="New record"><i class="fas fa-asterisk"></i></button>
            <span class="border-l border-[#c6c6c6] pl-2 text-neutral-500">No Filter</span>
            <input class="ml-2 h-5 w-24 border border-[#b8b8b8] px-1" value="Search">
        </div>
    </div>
</div>
