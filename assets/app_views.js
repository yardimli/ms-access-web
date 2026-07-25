function setActiveObject(view) {
    const objectView = designViewPairs[view] || formDesignViewPairs[view] || view;
    document.querySelectorAll('.object-link').forEach(link => {
        link.classList.toggle('active', link.dataset.view === objectView);
    });
}

function findTabIndex(view) {
    return openTabs.findIndex(tab => tab.view === view);
}

function objectTabKey(view) {
    if (designViewPairs[view]) {
        return designViewPairs[view];
    }

    if (tableViewPairs[view]) {
        return view;
    }

    if (formDesignViewPairs[view]) {
        return formDesignViewPairs[view];
    }

    if (formViewPairs[view]) {
        return view;
    }

    return view;
}

function findOpenObjectTab(view) {
    const objectKey = objectTabKey(view);
    return openTabs.find(tab => objectTabKey(tab.view) === objectKey);
}

function activeObjectKind(view = currentView) {
    if (isTableDatasheetView(view) || isTableDesignView(view)) return 'table';
    if (view.startsWith('form-') || view.startsWith('design-form-')) return 'form';
    if (view.startsWith('query-')) return 'query';
    if (view === 'report' || view.startsWith('report-')) return 'report';
    return 'object';
}

function activeViewMode(view = currentView) {
    if (isTableDesignView(view)) return 'design';
    if (isTableDatasheetView(view)) return 'datasheet';
    if (view.startsWith('design-form-')) return 'design';
    if (view.startsWith('form-')) return statusModeOverride || 'form';
    if (view.startsWith('query-')) return statusModeOverride || 'design';
    if (view === 'report' || view.startsWith('report-')) return statusModeOverride || 'report';
    return '';
}

function statusModesForCurrentView() {
    const kind = activeObjectKind();
    if (kind === 'table') {
        return [
            ['datasheet', 'Datasheet View', 'fas fa-table'],
            ['design', 'Design View', 'fas fa-pencil-ruler']
        ];
    }
    if (kind === 'form') {
        return [
            ['form', 'Form View', 'fas fa-window-restore'],
            ['layout', 'Layout View', 'fas fa-object-group'],
            ['design', 'Design View', 'fas fa-pencil-ruler']
        ];
    }
    if (kind === 'query') {
        return [
            ['datasheet', 'Datasheet View', 'fas fa-table'],
            ['sql', 'SQL View', 'fas fa-code'],
            ['design', 'Design View', 'fas fa-project-diagram']
        ];
    }
    if (kind === 'report') {
        return [
            ['report', 'Report View', 'fas fa-file-alt'],
            ['print', 'Print Preview', 'fas fa-search-plus'],
            ['layout', 'Layout View', 'fas fa-object-group'],
            ['design', 'Design View', 'fas fa-pencil-ruler']
        ];
    }
    return [];
}

function renderStatusViewButtons() {
    const modes = statusModesForCurrentView();
    const active = activeViewMode();
    statusViewButtons.innerHTML = modes.map(([mode, label, icon]) => `
        <button class="status-view-btn ${mode === active ? 'active' : ''}" type="button" data-status-view="${mode}" title="${escapeHtml(label)}">
            <i class="${icon}"></i>
        </button>
    `).join('');
}

function setSoftViewMode(mode, label) {
    statusModeOverride = mode;
    status.textContent = label;
    renderStatusViewButtons();
}

function activateStatusView(mode) {
    const kind = activeObjectKind();
    if ((kind === 'table' || kind === 'form') && mode === 'design') {
        statusModeOverride = null;
        switchTableMode('design');
        return;
    }
    if ((kind === 'table' && mode === 'datasheet') || (kind === 'form' && mode === 'form')) {
        statusModeOverride = null;
        switchTableMode('datasheet');
        return;
    }

    const label = statusModesForCurrentView().find(([value]) => value === mode)?.[1] || 'Ready';
    setSoftViewMode(mode, label);
}

function getTabIcon(view) {
    if (view.startsWith('table-') || view.startsWith('design-') && !view.startsWith('design-form-')) {
        return 'fas fa-table tab-icon-table';
    }

    if (view.startsWith('form-') || view.startsWith('design-form-')) {
        return 'fas fa-window-restore tab-icon-form';
    }

    if (view.startsWith('query-')) {
        return 'fas fa-project-diagram tab-icon-query';
    }

    if (view === 'report' || view.startsWith('report-')) {
        return 'fas fa-file-alt tab-icon-report';
    }

    return 'fas fa-file tab-icon-file';
}

function renderDocumentTabs() {
    if (!openTabs.length) {
        tabs.innerHTML = '';
        return;
    }

    tabs.innerHTML = `
        <div class="doc-tab-strip">
            ${openTabs.map(tab => `
                <button class="doc-tab ${tab.view === currentView ? 'active' : ''}" data-tab-view="${escapeHtml(tab.view)}" title="${escapeHtml(tab.title)}">
                    <i class="${getTabIcon(tab.view)}"></i>
                    <span>${escapeHtml(tab.title)}</span>
                </button>
            `).join('')}
        </div>
        <button class="doc-close ml-auto mr-2 self-center" title="Close active tab"><i class="fas fa-times"></i></button>
    `;
}

function templateIdForView(view) {
    if (view.type === 'table' && view.mode === 'design') return 'template-table-design';
    if (view.type === 'table') return 'template-table-datasheet';
    if (view.type === 'form' && view.mode === 'design') return 'template-form-design';
    if (view.type === 'form') return 'template-form-view';
    if (view.type === 'query') return 'template-query-builder';
    if (view.type === 'report') return 'template-report-view';
    return '';
}

function renderViewTemplate(view) {
    const template = document.querySelector(`#${templateIdForView(view)}`);
    if (!template) {
        content.innerHTML = '<div class="p-6 text-red-700">The selected view template was not found.</div>';
        return null;
    }

    const fragment = template.content.cloneNode(true);
    const shell = fragment.querySelector('.view-shell');
    if (shell) {
        shell.dataset.title = view.title || view.object || 'Object';
        shell.dataset.status = view.status || 'Ready';
    }

    const objectTargets = fragment.querySelectorAll('[data-table-id], [data-form-id], [data-query-id], [data-report-id]');
    objectTargets.forEach(target => {
        if (target.hasAttribute('data-table-id')) target.dataset.tableId = view.object;
        if (target.hasAttribute('data-form-id')) target.dataset.formId = view.object;
        if (target.hasAttribute('data-query-id')) target.dataset.queryId = view.object;
        if (target.hasAttribute('data-report-id')) target.dataset.reportId = view.object;
    });

    content.replaceChildren(fragment);
    return content.querySelector('.view-shell');
}

async function loadView(view, options = {}) {
    closeActiveCellEditor(true);
    const replaceActive = options.replaceActive === true;
    const existingObjectTab = replaceActive ? null : findOpenObjectTab(view);

    if (existingObjectTab) {
        view = existingObjectTab.view;
    }

    const existingIndex = findTabIndex(view);

    if (replaceActive && openTabs.length) {
        const activeIndex = Math.max(0, findTabIndex(currentView));
        openTabs[activeIndex] = {
            view,
            title: viewTitles[view] || 'Object'
        };
    } else if (existingIndex === -1) {
        openTabs.push({
            view,
            title: viewTitles[view] || 'Object'
        });
    }

    currentView = view;
    statusModeOverride = null;
    content.innerHTML = '<div class="p-6 text-neutral-500">Loading...</div>';
    renderDocumentTabs();
    const response = await fetch(`api/view.php?view=${encodeURIComponent(view)}`, {
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
    });

    if (!response.ok) {
        content.innerHTML = '<div class="p-6 text-red-700">The selected object could not be opened.</div>';
        return;
    }

    const payload = await response.json();
    const db = await getDatabase();
    if (payload.ok) {
        mergeViewData(db, payload.view?.data);
    }

    const shell = payload.ok ? renderViewTemplate(payload.view) : null;
    if (!shell) {
        return;
    }

    const title = shell?.dataset.title || viewTitles[view] || 'Object';
    const activeTab = openTabs[findTabIndex(view)];
    if (activeTab) {
        activeTab.title = title;
    }
    renderDocumentTabs();
    status.textContent = shell?.dataset.status || 'Ready';
    setActiveObject(view);
    updateContextualRibbon(view);
    renderStatusViewButtons();
    await initCurrentView();
}

function closeActiveTab() {
    const activeIndex = findTabIndex(currentView);
    if (activeIndex === -1) {
        return;
    }

    openTabs.splice(activeIndex, 1);

    if (!openTabs.length) {
        currentView = '';
        content.innerHTML = '<div class="p-6 text-neutral-500">Double-click an object to open it.</div>';
        status.textContent = 'Ready';
        renderDocumentTabs();
        setActiveObject('');
        updateContextualRibbon('');
        renderStatusViewButtons();
        return;
    }

    const nextTab = openTabs[Math.max(0, activeIndex - 1)];
    loadView(nextTab.view);
}

function switchTableMode(mode) {
    const target = mode === 'design'
        ? tableViewPairs[currentView] || formViewPairs[currentView] || currentView
        : designViewPairs[currentView] || formDesignViewPairs[currentView] || currentView;

    if (target === currentView) {
        return;
    }

    loadView(target, { replaceActive: true });
}

async function initCurrentView() {
    const db = await getDatabase();
    initTableViews(db);
    initDesignViews(db);
    initFormViews(db);
    initFormDesignViews(db);
    initReportViews(db);
    initQueryBuilders(db);
}

