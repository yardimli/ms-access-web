document.addEventListener('click', async event => {
    if (activeCellEditor && !shouldKeepCellEditorOpen(event.target)) {
        closeActiveCellEditor(true);
    }

    const statusButton = event.target.closest('[data-status-view]');
    if (statusButton) {
        activateStatusView(statusButton.dataset.statusView);
        return;
    }

    const createMenuButton = event.target.closest('[data-create-menu]');
    if (createMenuButton) {
        openCreateMenu(createMenuButton, createMenuButton.dataset.createMenu);
        return;
    }

    const homeMenuButton = event.target.closest('[data-home-menu]');
    if (homeMenuButton && !homeMenuButton.closest('.home-menu')) {
        openHomeMenu(homeMenuButton, homeMenuButton.dataset.homeMenu);
        return;
    }

    if (createMenu && !event.target.closest('.create-menu')) {
        closeCreateMenu();
    }

    const homeMenuItem = event.target.closest('[data-home-menu-item]');
    if (homeMenuItem && event.target.closest('.home-menu')) {
        const owner = createMenu?.dataset.owner?.replace('home-', '') || '';
        const value = homeMenuItem.dataset.homeValue || '';
        const view = homeMenuItem.dataset.view;

        if (owner === 'font' || owner === 'size') {
            const selectLabel = document.querySelector(`.home-select[data-home-menu="${owner}"] span`);
            if (selectLabel) {
                selectLabel.textContent = value;
            }
        }

        closeCreateMenu();

        if (view === '@design') {
            switchTableMode('design');
            return;
        }

        if (view === '@datasheet') {
            switchTableMode('datasheet');
            return;
        }

        if (view) {
            loadView(view);
            return;
        }

        status.textContent = value ? `${value} selected` : 'Ready';
        return;
    }

    const homeColorItem = event.target.closest('.color-menu button');
    if (homeColorItem) {
        closeCreateMenu();
        status.textContent = 'Color selected';
        return;
    }

    const propertySheetCommand = event.target.closest('[data-command="properties"]');
    if (propertySheetCommand && (isTableDesignView(currentView) || currentView.startsWith('design-form-'))) {
        content.querySelector('[data-property-sheet]')?.classList.toggle('hidden');
        return;
    }

    const captionCommand = event.target.closest('[data-command="caption"]');
    if (captionCommand && isTableDatasheetView(currentView)) {
        await window.accessActiveTableController?.openColumnDialog?.();
        return;
    }

    const validationToggle = event.target.closest('[data-command="required"], [data-command="unique"], [data-command="indexed"]');
    if (validationToggle && isTableDatasheetView(currentView)) {
        await window.accessActiveTableController?.toggleColumnValidation?.(validationToggle.dataset.command);
        return;
    }

    const validationButton = event.target.closest('[data-command="validation"]');
    if (validationButton && isTableDatasheetView(currentView)) {
        openValidationMenu(validationButton);
        return;
    }

    const formatButton = event.target.closest('[data-format-command]');
    if (formatButton && isTableDatasheetView(currentView) && !formatButton.disabled) {
        await window.accessActiveTableController?.changeColumnFormat?.({ command: formatButton.dataset.formatCommand });
        return;
    }

    const moreFieldsButton = event.target.closest('[data-command="more-fields"]');
    if (moreFieldsButton) {
        openMoreFieldsMenu(moreFieldsButton);
        return;
    }

    const moreFieldsItem = event.target.closest('[data-more-field]');
    if (moreFieldsItem) {
        closeMoreFieldsMenu();
        return;
    }

    const calculatedToggle = event.target.closest('[data-calculated-field-toggle]');
    if (calculatedToggle) {
        calculatedToggle.closest('.more-fields-footer')?.classList.toggle('open');
        return;
    }

    const calculatedField = event.target.closest('[data-calculated-field]');
    if (calculatedField) {
        status.textContent = `${calculatedField.dataset.calculatedField} calculated field selected`;
        closeMoreFieldsMenu();
        return;
    }

    if (moreFieldsMenu && !event.target.closest('.more-fields-menu')) {
        closeMoreFieldsMenu();
    }

    const validationMenuItem = event.target.closest('[data-validation-menu-item]');
    if (validationMenuItem) {
        const item = validationMenuItem.dataset.validationMenuItem;
        closeValidationMenu();
        if (item === 'rule') {
            try {
                const context = window.accessActiveTableController?.getExpressionContext?.() || {};
                const result = await window.ExpressionBuilder?.open?.(context);
                if (result !== null && result !== undefined) {
                    await window.accessActiveTableController?.setValidationRule?.(result.expression, result.javascript);
                }
            } catch (error) {
                status.textContent = error.message || 'Expression Builder could not open';
            }
            return;
        }

        status.textContent = 'Field Validation Message selected';
        return;
    }

    if (validationMenu && !event.target.closest('.validation-menu')) {
        closeValidationMenu();
    }

    const docClose = event.target.closest('.doc-close');
    if (docClose) {
        closeActiveTab();
        return;
    }

    const docTab = event.target.closest('[data-tab-view]');
    if (docTab) {
        loadView(docTab.dataset.tabView);
        return;
    }

    const paneToggle = event.target.closest('#object-pane-toggle');
    if (paneToggle) {
        const isCollapsed = objectPane.classList.toggle('collapsed');
        workspaceMain.classList.toggle('object-pane-collapsed', isCollapsed);
        paneToggle.setAttribute('aria-expanded', String(!isCollapsed));
        paneToggle.setAttribute('aria-label', `${isCollapsed ? 'Expand' : 'Collapse'} object pane`);
        paneToggle.querySelector('i').className = `fas ${isCollapsed ? 'fa-angle-double-right' : 'fa-angle-double-left'}`;
        return;
    }

    const objectToggle = event.target.closest('.object-toggle');
    if (objectToggle) {
        const section = objectToggle.closest('.object-section');
        const isCollapsed = section.classList.toggle('collapsed');
        objectToggle.setAttribute('aria-expanded', String(!isCollapsed));
        objectToggle.setAttribute('aria-label', `${isCollapsed ? 'Expand' : 'Collapse'} ${section.querySelector('.object-heading span')?.textContent || 'section'}`);
        objectToggle.querySelector('i').className = `fas ${isCollapsed ? 'fa-chevron-down' : 'fa-chevron-up'}`;
        return;
    }

    const ribbonTab = event.target.closest('.ribbon-tab');
    if (ribbonTab) {
        activateRibbonTab(ribbonTab.dataset.ribbon);
        return;
    }

    const viewButton = event.target.closest('[data-view]');
    if (viewButton) {
        if (viewButton.closest('#object-list')) {
            const openTab = findOpenObjectTab(viewButton.dataset.view);
            setActiveObject(viewButton.dataset.view);
            if (openTab) {
                loadView(openTab.view);
            }
            return;
        }

        if (viewButton.dataset.view === '@design') {
            switchTableMode('design');
            return;
        }

        if (viewButton.dataset.view === '@datasheet') {
            switchTableMode('datasheet');
            return;
        }

        loadView(viewButton.dataset.view);
    }
});

document.addEventListener('change', async event => {
    const typeSelect = event.target.closest('[data-field-data-type]');
    if (typeSelect && isTableDatasheetView(currentView)) {
        await window.accessActiveTableController?.changeColumnType?.(typeSelect.value);
    }

    const formatSelect = event.target.closest('[data-field-format]');
    if (formatSelect && isTableDatasheetView(currentView)) {
        await window.accessActiveTableController?.changeColumnFormat?.({ format: formatSelect.value });
    }
});

document.addEventListener('dblclick', event => {
    const objectLink = event.target.closest('#object-list [data-view]');
    if (!objectLink) {
        return;
    }

    loadView(objectLink.dataset.view);
});

function isTextEditTarget(target) {
    return Boolean(target?.closest?.('input, textarea, select, .cell-edit-input'));
}

document.addEventListener('selectstart', event => {
    if (!isTextEditTarget(event.target)) {
        event.preventDefault();
    }
}, true);

document.addEventListener('selectionchange', () => {
    const selection = window.getSelection?.();
    if (!selection || selection.isCollapsed) {
        return;
    }

    const active = document.activeElement;
    const anchor = selection.anchorNode?.nodeType === Node.ELEMENT_NODE
        ? selection.anchorNode
        : selection.anchorNode?.parentElement;

    if (!isTextEditTarget(active) && !isTextEditTarget(anchor)) {
        selection.removeAllRanges();
    }
});

document.addEventListener('scroll', positionActiveCellEditor, true);
window.addEventListener('resize', positionActiveCellEditor);

async function bootstrapApp() {
    activateRibbonTab('home');

    try {
        const db = await getDatabase();
        configureObjectMaps(db);
        renderObjectList(db);

        const requestedView = app.dataset.initialView || '';
        const firstTableView = Object.keys(tableViewPairs)[0];
        const initialView = viewTitles[requestedView] ? requestedView : firstTableView;

        if (initialView) {
            await loadView(initialView);
            return;
        }

        content.innerHTML = '<div class="p-6 text-neutral-500">No database tables were found.</div>';
        status.textContent = 'Ready';
    } catch (error) {
        content.innerHTML = `<div class="p-6 text-red-700">Unable to load database: ${escapeHtml(error.message)}</div>`;
        status.textContent = 'Database Error';
    }
}

bootstrapApp();

