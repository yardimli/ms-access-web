<?php
$report = $context['report'] ?? 'InvoiceSummary';
$title = $context['title'] ?? $report;
?>
<div class="view-shell bg-[#bfc8d2]" data-title="<?= htmlspecialchars($title, ENT_QUOTES) ?>" data-status="Report View">
    <div data-report-view data-report-id="<?= htmlspecialchars($report, ENT_QUOTES) ?>">
        <div class="p-6 text-neutral-600">Loading report...</div>
    </div>
</div>
