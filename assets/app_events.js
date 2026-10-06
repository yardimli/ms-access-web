document.addEventListener('click', async event => {
    if (event.target.closest('[data-quick-save]')) {
        await quickSave();
        return;
    }
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

    const createTableButton = event.target.closest('[data-create-table-mode]');
    if (createTableButton) {
        await createNewTable(createTableButton.dataset.createTableMode || 'datasheet');
        return;
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
        if (isTableDesignView(currentView) && window.acaciadbActiveDesignController?.togglePropertySheet) {
            window.acaciadbActiveDesignController.togglePropertySheet();
        } else {
            content.querySelector('[data-property-sheet]')?.classList.toggle('hidden');
        }
        return;
    }

    const designCommand = event.target.closest('.table-design-ribbon [data-command]');
    if (designCommand && isTableDesignView(currentView) && !designCommand.disabled && ['index', 'insert-row', 'delete', 'lookup', 'primary-key'].includes(designCommand.dataset.command)) {
        const controller = window.acaciadbActiveDesignController;
        if (designCommand.dataset.command === 'index') controller?.openIndexesDialog?.();
        if (designCommand.dataset.command === 'insert-row') controller?.insertSelectedField?.();
        if (designCommand.dataset.command === 'delete') controller?.deleteSelectedField?.();
        if (designCommand.dataset.command === 'lookup') await controller?.modifySelectedLookup?.();
        if (designCommand.dataset.command === 'primary-key') controller?.setSelectedPrimaryKey?.();
        return;
    }

    const captionCommand = event.target.closest('[data-command="caption"]');
    if (captionCommand && isTableDatasheetView(currentView)) {
        await window.acaciadbActiveTableController?.openColumnDialog?.();
        return;
    }

    const defaultValueCommand = event.target.closest('[data-command="default"]');
    if (defaultValueCommand && isTableDatasheetView(currentView) && !defaultValueCommand.disabled) {
        await window.acaciadbActiveTableController?.openDefaultValueBuilder?.();
        return;
    }

    const expressionCommand = event.target.closest('[data-command="expression"]');
    if (expressionCommand && isTableDatasheetView(currentView) && !expressionCommand.disabled) {
        await window.acaciadbActiveTableController?.openCalculatedExpressionBuilder?.();
        return;
    }

    const lookupCommand = event.target.closest('[data-command="lookup"]');
    if (lookupCommand && isTableDatasheetView(currentView) && !lookupCommand.disabled && !lookupCommand.closest('.fields-add-delete')) {
        await window.acaciadbActiveTableController?.modifyActiveLookup?.();
        return;
    }

    const validationToggle = event.target.closest('[data-command="required"], [data-command="unique"], [data-command="indexed"]');
    if (validationToggle && isTableDatasheetView(currentView)) {
        await window.acaciadbActiveTableController?.toggleColumnValidation?.(validationToggle.dataset.command);
        return;
    }

    const validationButton = event.target.closest('[data-command="validation"]');
    if (validationButton && isTableDatasheetView(currentView)) {
        openValidationMenu(validationButton);
        return;
    }

    const memoButton = event.target.closest('[data-command="memo"]');
    if (memoButton && isTableDatasheetView(currentView) && !memoButton.disabled) {
        openMemoMenu(memoButton);
        return;
    }

    const addDeleteCommand = event.target.closest('[data-command="text-field"], [data-command="number"], [data-command="currency"], [data-command="date"], [data-command="yes-no"], [data-command="delete"]');
    if (addDeleteCommand && isTableDatasheetView(currentView) && addDeleteCommand.closest('.fields-add-delete')) {
        const commandType = {
            'text-field': 'Short Text',
            number: 'Number',
            currency: 'Currency',
            date: 'Date/Time',
            'yes-no': 'Yes/No'
        }[addDeleteCommand.dataset.command];
        if (addDeleteCommand.dataset.command === 'delete') {
            await window.acaciadbActiveTableController?.deleteActiveColumn?.();
        } else {
            await window.acaciadbActiveTableController?.addColumnFromType?.(commandType);
        }
        return;
    }

    const formatButton = event.target.closest('[data-format-command]');
    if (formatButton && isTableDatasheetView(currentView) && !formatButton.disabled) {
        await window.acaciadbActiveTableController?.changeColumnFormat?.({ command: formatButton.dataset.formatCommand });
        return;
    }

    const moreFieldsButton = event.target.closest('[data-command="more-fields"]');
    if (moreFieldsButton) {
        openMoreFieldsMenu(moreFieldsButton);
        return;
    }

    const moreFieldsItem = event.target.closest('[data-more-field]');
    if (moreFieldsItem) {
        await window.acaciadbActiveTableController?.addColumnFromType?.(moreFieldsItem.dataset.moreField);
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
        await window.acaciadbActiveTableController?.addColumnFromType?.('Calculated Field', { calculatedResultType: calculatedField.dataset.calculatedField });
        closeMoreFieldsMenu();
        return;
    }

    if (moreFieldsMenu && !event.target.closest('.more-fields-menu')) {
        closeMoreFieldsMenu();
    }

    const memoMenuItem = event.target.closest('[data-memo-menu-item]');
    if (memoMenuItem) {
        const item = memoMenuItem.dataset.memoMenuItem;
        closeMemoMenu();
        if (item === 'appendOnly') {
            await window.acaciadbActiveTableController?.toggleMemoSetting?.('appendOnly');
            return;
        }
        if (item === 'htmlText') {
            await window.acaciadbActiveTableController?.toggleMemoSetting?.('htmlText');
            return;
        }
        if (item === 'history') {
            await window.acaciadbActiveTableController?.showColumnHistory?.();
            return;
        }
    }

    const validationMenuItem = event.target.closest('[data-validation-menu-item]');
    if (validationMenuItem) {
        const item = validationMenuItem.dataset.validationMenuItem;
        closeValidationMenu();
        if (item === 'rule') {
            try {
                const context = window.acaciadbActiveTableController?.getExpressionContext?.() || {};
                const result = await window.ExpressionBuilder?.open?.(context);
                if (result !== null && result !== undefined) {
                    await window.acaciadbActiveTableController?.setValidationRule?.(result.expression, result.javascript, result.interpretNatural);
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

    if (memoMenu && !event.target.closest('.memo-menu')) {
        closeMemoMenu();
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
        if (ribbonTab.dataset.ribbon === 'file') {
            openFileBackstage('home');
            return;
        }
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
        await window.acaciadbActiveTableController?.changeColumnType?.(typeSelect.value);
    }

    const formatSelect = event.target.closest('[data-field-format]');
    if (formatSelect && isTableDatasheetView(currentView)) {
        await window.acaciadbActiveTableController?.changeColumnFormat?.({ format: formatSelect.value });
    }
});

['input', 'change', 'click', 'pointerup', 'drop', 'keydown'].forEach(type => {
    document.addEventListener(type, () => queueMicrotask(updateQuickSaveState));
});

document.addEventListener('dblclick', event => {
    const objectLink = event.target.closest('#object-list [data-view]');
    if (!objectLink) {
        return;
    }

    loadView(objectLink.dataset.view);
});

function isTextEditTarget(target) {
    return Boolean(target?.closest?.('input, textarea, select, .cell-edit-input, [contenteditable="true"]'));
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

async function showStartupFilePicker() {
    databasePromise = null;
    activeDatabaseReference = 'sqlite:demo';
    localStorage.removeItem(activeDatabaseStorageKey);
    currentDatabaseName = '';
    currentView = '';
    openTabs = [];
    window.acaciadbActiveDesignController = null;
    window.acaciadbActiveObjectController = null;
    window.acaciadbActiveTableController = null;
    configureObjectMaps({});
    renderObjectList({});
    renderDocumentTabs();
    updateQuickSaveState();
    updateContextualRibbon('');
    renderStatusViewButtons();
    content.innerHTML = '<div class="p-6 text-neutral-500">Choose a database from File to get started.</div>';
    status.textContent = 'Choose a database';
    document.querySelector('#database-title').textContent = 'AcaciaDB';
    document.title = 'AcaciaDB';
    await openFileBackstage('home');
}

async function bootstrapApp() {
    activateRibbonTab('home');

    try {
        const savedWorkspace = readWorkspaceState();
        if (!localStorage.getItem(activeDatabaseStorageKey)) {
            await showStartupFilePicker();
            return;
        }
        let db = await getDatabase();
        if (savedWorkspace?.database && savedWorkspace.database !== db.database) {
            try {
                await postDatabaseAction('open', savedWorkspace.database);
                databasePromise = null;
                db = await getDatabase();
            } catch (error) {
                localStorage.removeItem(workspaceStateStorageKey);
                throw error;
            }
        }

        currentDatabaseName = db.database || '';
        configureObjectMaps(db);
        renderObjectList(db);
        const databaseTitle = document.querySelector('#database-title');
        if (databaseTitle) databaseTitle.textContent = `${db.displayName || db.database || 'AcaciaDB'} : AcaciaDB`;
        document.title = `${db.displayName || db.database || 'Database'} - AcaciaDB`;

        const availableViews = restorableViews(db);
        const canRestore = savedWorkspace?.database === currentDatabaseName;
        const savedTabs = canRestore
            ? [...new Set(savedWorkspace.tabs)].filter(view => availableViews.has(view))
            : [];

        if (canRestore) {
            if (!savedTabs.length) {
                currentView = '';
                openTabs = [];
                renderDocumentTabs();
                content.innerHTML = '<div class="p-6 text-neutral-500">Double-click an object to open it.</div>';
                status.textContent = 'Ready';
                persistWorkspaceState();
                return;
            }

            openTabs = [];
            for (const view of savedTabs) {
                await loadView(view);
            }
            const restoredActiveView = savedTabs.includes(savedWorkspace.activeView)
                ? savedWorkspace.activeView
                : savedTabs[savedTabs.length - 1];
            if (currentView !== restoredActiveView) {
                await loadView(restoredActiveView);
            }
            return;
        }

        const requestedView = app.dataset.initialView || '';
        const firstTableView = Object.keys(tableViewPairs)[0];
        const initialView = viewTitles[requestedView] ? requestedView : firstTableView;

        if (initialView) {
            await loadView(initialView);
            return;
        }

        content.innerHTML = '<div class="p-6 text-neutral-500">No database tables were found.</div>';
        status.textContent = 'Ready';
        currentView = '';
        openTabs = [];
        persistWorkspaceState();
    } catch (error) {
        await showStartupFilePicker();
    }
}

bootstrapApp();

