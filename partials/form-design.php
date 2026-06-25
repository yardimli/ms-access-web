<?php
$form = $context['form'] ?? 'CustomerOrders';
$title = $context['title'] ?? $form;
?>
<div class="view-shell" data-title="<?= htmlspecialchars($title, ENT_QUOTES) ?>" data-status="Form Design View">
    <div class="form-design-view" data-form-design-view data-form-id="<?= htmlspecialchars($form, ENT_QUOTES) ?>">
        <div class="p-6 text-neutral-500">Loading form designer...</div>
    </div>
</div>
