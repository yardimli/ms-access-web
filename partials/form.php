<?php
$form = $context['form'] ?? 'CustomerOrders';
$title = $context['title'] ?? $form;
?>
<div class="view-shell bg-[#d9e4f0]" data-title="<?= htmlspecialchars($title, ENT_QUOTES) ?>" data-status="Form View">
    <div class="form-view" data-form-view data-form-id="<?= htmlspecialchars($form, ENT_QUOTES) ?>">
        <div class="p-6 text-neutral-500">Loading form data...</div>
    </div>
</div>
