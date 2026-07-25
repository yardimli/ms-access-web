function objectSectionMarkup(title, items, iconClass, iconTypeClass) {
    return `
        <div class="object-section">
            <div class="object-heading">
                <span>${escapeHtml(title)}</span>
                <button class="object-toggle" type="button" aria-label="Collapse ${escapeHtml(title)}" aria-expanded="true"><i class="fas fa-chevron-up"></i></button>
            </div>
            ${items.map(item => `
                <button class="object-link" data-view="${escapeHtml(item.view)}">
                    <i class="${iconClass} ${iconTypeClass}"></i>${escapeHtml(item.label)}
                </button>
            `).join('')}
        </div>
    `;
}

function renderObjectList(db) {
    const tables = Object.keys(db.tables || {}).map(tableName => ({
        view: `table-${objectSlug(tableName)}`,
        label: tableName
    }));
    const forms = Object.keys(db.forms || {}).map(formName => ({
        view: `form-${objectSlug(formName)}`,
        label: formName
    }));
    const queries = Object.keys(db.queries || {}).map(queryName => ({
        view: `query-${objectSlug(queryName)}`,
        label: queryName
    }));
    const reports = Object.keys(db.reports || {}).map(reportName => ({
        view: `report-${objectSlug(reportName)}`,
        label: reportName
    }));

    objectList.innerHTML = [
        objectSectionMarkup('Tables', tables, 'fas fa-table', 'table-icon'),
        objectSectionMarkup('Forms', forms, 'fas fa-window-restore', 'form-icon'),
        objectSectionMarkup('Queries', queries, 'fas fa-project-diagram', 'query-icon'),
        objectSectionMarkup('Reports', reports, 'fas fa-file-alt', 'report-icon')
    ].join('');
}

const objectPaneWidthStorageKey = 'acaciadb.objectPaneWidth';

function objectPaneWidthBounds() {
    const workspaceWidth = workspaceMain.getBoundingClientRect().width;
    return {
        min: 180,
        max: Math.max(180, Math.min(600, workspaceWidth - 320))
    };
}

function setObjectPaneWidth(width, persist = true) {
    const bounds = objectPaneWidthBounds();
    const nextWidth = Math.round(Math.max(bounds.min, Math.min(bounds.max, Number(width) || 238)));
    workspaceMain.style.setProperty('--object-pane-width', `${nextWidth}px`);
    objectPaneSplitter?.setAttribute('aria-valuemin', String(bounds.min));
    objectPaneSplitter?.setAttribute('aria-valuemax', String(bounds.max));
    objectPaneSplitter?.setAttribute('aria-valuenow', String(nextWidth));
    if (persist) {
        localStorage.setItem(objectPaneWidthStorageKey, String(nextWidth));
    }
    return nextWidth;
}

function updateObjectPaneResizeState(view = currentView) {
    const enabled = isTableDatasheetView(view) || isTableDesignView(view);
    workspaceMain.classList.toggle('object-pane-resizable', enabled);
    objectPaneSplitter?.setAttribute('aria-hidden', String(!enabled));
    objectPaneSplitter?.setAttribute('tabindex', enabled ? '0' : '-1');
}

setObjectPaneWidth(localStorage.getItem(objectPaneWidthStorageKey) || 238, false);

objectPaneSplitter?.addEventListener('pointerdown', event => {
    if (!workspaceMain.classList.contains('object-pane-resizable') || objectPane.classList.contains('collapsed')) {
        return;
    }

    event.preventDefault();
    const startX = event.clientX;
    const startWidth = objectPane.getBoundingClientRect().width;
    workspaceMain.classList.add('object-pane-resizing');

    const onPointerMove = moveEvent => {
        setObjectPaneWidth(startWidth + moveEvent.clientX - startX, false);
    };

    const onPointerUp = () => {
        document.removeEventListener('pointermove', onPointerMove);
        document.removeEventListener('pointerup', onPointerUp);
        document.removeEventListener('pointercancel', onPointerUp);
        workspaceMain.classList.remove('object-pane-resizing');
        setObjectPaneWidth(objectPane.getBoundingClientRect().width, true);
    };

    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
    document.addEventListener('pointercancel', onPointerUp);
});

objectPaneSplitter?.addEventListener('keydown', event => {
    if (!workspaceMain.classList.contains('object-pane-resizable') || objectPane.classList.contains('collapsed')) {
        return;
    }
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
        return;
    }

    event.preventDefault();
    const bounds = objectPaneWidthBounds();
    const currentWidth = objectPane.getBoundingClientRect().width;
    const step = event.shiftKey ? 25 : 10;
    const nextWidth = event.key === 'Home'
        ? bounds.min
        : event.key === 'End'
            ? bounds.max
            : currentWidth + (event.key === 'ArrowLeft' ? -step : step);
    setObjectPaneWidth(nextWidth, true);
});

