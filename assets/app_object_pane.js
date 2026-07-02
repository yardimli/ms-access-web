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

