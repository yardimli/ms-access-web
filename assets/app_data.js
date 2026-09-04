function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    }[char]));
}

function objectSlug(name) {
    return String(name ?? '')
        .replace(/(?!^)([A-Z])/g, '-$1')
        .replace(/[^A-Za-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .toLowerCase();
}

function titleFromObjectName(name) {
    return String(name ?? '').replace(/(?!^)([A-Z])/g, ' $1').replace(/_/g, ' ');
}

function formatValue(value, type) {
    if (value === null || value === undefined) {
        return '';
    }
    if (value === '') {
        return '';
    }

    if (type === 'Currency') {
        const number = Number(String(value).replace(/[$,]/g, ''));
        return Number.isFinite(number)
            ? number.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
            : String(value);
    }

    return String(value);
}

function getDatabase() {
    if (!databasePromise) {
        databasePromise = fetch('api/database.php', { cache: 'no-store' }).then(response => {
            if (!response.ok) {
                throw new Error('Unable to load database from MariaDB');
            }
            return response.json();
        });
    }

    return databasePromise;
}

async function postSchemaAction(payload) {
    const page = window.acaciadbActiveTableController?.getPageState?.() || {};
    const response = await fetch('api/schema.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({ ...page, ...payload })
    });
    const data = await response.json();

    if (!response.ok || !data.ok) {
        throw new Error(data.error || 'Schema update failed.');
    }

    const responseTable = String(data.table || '').toLowerCase();
    const activeTable = String(page.table || '').toLowerCase();
    if (!responseTable || !activeTable || responseTable === activeTable) {
        window.acaciadbActiveTableController?.syncPagination?.(data.payload?.pagination);
    }

    return data;
}

async function postRecordAction(payload) {
    const page = window.acaciadbActiveTableController?.getPageState?.() || {};
    const response = await fetch('api/records.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({ ...page, ...payload })
    });
    const data = await response.json();

    if (!response.ok || !data.ok) {
        throw new Error(data.error || 'Record update failed.');
    }

    window.acaciadbActiveTableController?.syncPagination?.(data.payload?.pagination);

    return data;
}

function mergeViewData(db, data = {}) {
    db.tables = { ...(db.tables || {}), ...(data.tables || {}) };
    db.forms = { ...(db.forms || {}), ...(data.forms || {}) };
    db.queries = { ...(db.queries || {}), ...(data.queries || {}) };
    db.reports = { ...(db.reports || {}), ...(data.reports || {}) };
    normalizeDatabaseReferences(db);
    return db;
}

function resolveTableName(db, tableName) {
    const tables = db.tables || {};
    if (tables[tableName]) {
        return tableName;
    }

    const lower = String(tableName || '').toLowerCase();
    return Object.keys(tables).find(name => name.toLowerCase() === lower) || tableName;
}

function normalizeFieldRef(db, ref) {
    const [tableName, fieldName] = String(ref || '').split('.');
    if (!tableName || !fieldName) {
        return ref;
    }

    return `${resolveTableName(db, tableName)}.${fieldName}`;
}

function normalizeDatabaseReferences(db) {
    Object.values(db.forms || {}).forEach(form => {
        form.parentTable = resolveTableName(db, form.parentTable);
        if (form.subform?.table) {
            form.subform.table = resolveTableName(db, form.subform.table);
        }
    });

    Object.values(db.queries || {}).forEach(query => {
        query.tables = (query.tables || []).map(table => resolveTableName(db, table));
        query.connections = (query.connections || []).map(connection => ({
            ...connection,
            from: normalizeFieldRef(db, connection.from),
            to: normalizeFieldRef(db, connection.to)
        }));
        query.fields = (query.fields || []).map(field => ({
            ...field,
            table: resolveTableName(db, field.table)
        }));
    });

    return db;
}

function getDefinitionByName(collection, name) {
    if (!collection) {
        return null;
    }

    if (collection[name]) {
        return collection[name];
    }

    const lower = String(name || '').toLowerCase();
    const key = Object.keys(collection).find(item => item.toLowerCase() === lower);
    return key ? collection[key] : null;
}

function registerView(view, title) {
    viewTitles[view] = title;
}

function configureObjectMaps(db) {
    tableViewPairs = {};
    designViewPairs = {};
    formViewPairs = {};
    formDesignViewPairs = {};

    Object.keys(db.tables || {}).forEach(tableName => {
        const slug = objectSlug(tableName);
        const tableView = `table-${slug}`;
        const designView = `design-${slug}`;
        tableViewPairs[tableView] = designView;
        designViewPairs[designView] = tableView;
        registerView(tableView, tableName);
        registerView(designView, tableName);
    });

    Object.keys(db.forms || {}).forEach(formName => {
        const slug = objectSlug(formName);
        const formView = `form-${slug}`;
        const designView = `design-form-${slug}`;
        formViewPairs[formView] = designView;
        formDesignViewPairs[designView] = formView;
        registerView(formView, formName);
        registerView(designView, formName);
    });

    Object.keys(db.queries || {}).forEach(queryName => {
        registerView(`query-${objectSlug(queryName)}`, queryName);
    });

    Object.keys(db.reports || {}).forEach(reportName => {
        registerView(`report-${objectSlug(reportName)}`, reportName);
    });
}

