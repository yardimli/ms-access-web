function ribbonIcon(name) {
    const map = {
        grid: 'fas fa-table',
        table: 'fas fa-table',
        design: 'fas fa-pencil-ruler',
        paste: 'fas fa-paste',
        'paste-special': 'far fa-clipboard',
        'paste-append': 'fas fa-clipboard-list',
        cut: 'fas fa-cut',
        copy: 'fas fa-copy',
        'format-painter': 'fas fa-paint-brush',
        filter: 'fas fa-filter',
        'sort-asc': 'fas fa-sort-alpha-down',
        'sort-desc': 'fas fa-sort-alpha-up-alt',
        'remove-sort': 'fas fa-sort-alpha-down',
        selection: 'fas fa-filter',
        advanced: 'fas fa-filter',
        'toggle-filter': 'fas fa-filter',
        find: 'fas fa-search',
        replace: 'fas fa-exchange-alt',
        'go-to': 'fas fa-arrow-right',
        select: 'fas fa-mouse-pointer',
        new: 'fas fa-plus-square',
        delete: 'fas fa-trash-alt',
        refresh: 'fas fa-sync-alt',
        'refresh-all': 'fas fa-sync-alt',
        totals: 'fas fa-sigma',
        spelling: 'fas fa-spell-check',
        bold: 'fas fa-bold',
        italic: 'fas fa-italic',
        underline: 'fas fa-underline',
        'font-color': 'fas fa-font',
        'text-highlight': 'fas fa-highlighter',
        'fill-color': 'fas fa-fill-drip',
        'align-left': 'fas fa-align-left',
        'align-center': 'fas fa-align-center',
        'align-right': 'fas fa-align-right',
        'bullets': 'fas fa-list-ul',
        'numbered-list': 'fas fa-list-ol',
        indent: 'fas fa-indent',
        outdent: 'fas fa-outdent',
        align: 'fas fa-align-left',
        form: 'fas fa-window-restore',
        'form-design': 'fas fa-pencil-ruler',
        'blank-form': 'far fa-window-maximize',
        'form-wizard': 'fas fa-magic',
        navigation: 'far fa-window-restore',
        'more-forms': 'fas fa-caret-square-down',
        'split-form': 'fas fa-columns',
        'modal-dialog': 'far fa-window-maximize',
        themes: 'fas fa-palette',
        colors: 'fas fa-th-large',
        font: 'fas fa-font',
        pointer: 'fas fa-mouse-pointer',
        label: 'fas fa-font',
        'button-control': 'far fa-square',
        folder: 'far fa-folder',
        'web-browser': 'fas fa-globe',
        subform: 'far fa-window-restore',
        image: 'far fa-image',
        chart: 'fas fa-chart-bar',
        logo: 'far fa-image',
        title: 'far fa-file-alt',
        'add-fields': 'fas fa-columns',
        'tab-order': 'fas fa-sort-numeric-down',
        gridlines: 'fas fa-border-all',
        stacked: 'fas fa-th-list',
        tabular: 'fas fa-table',
        'remove-layout': 'fas fa-eraser',
        'insert-above': 'fas fa-arrow-up',
        'insert-below': 'fas fa-arrow-down',
        'insert-left': 'fas fa-arrow-left',
        'insert-right': 'fas fa-arrow-right',
        'select-layout': 'far fa-object-group',
        'select-column': 'fas fa-columns',
        merge: 'fas fa-compress-arrows-alt',
        'split-vertical': 'fas fa-columns',
        'split-horizontal': 'fas fa-grip-lines',
        'move-up': 'fas fa-arrow-up',
        'move-down': 'fas fa-arrow-down',
        margins: 'fas fa-text-width',
        padding: 'fas fa-border-style',
        anchoring: 'fas fa-anchor',
        'size-space': 'fas fa-arrows-alt',
        'bring-front': 'fas fa-clone',
        'send-back': 'far fa-clone',
        'select-all': 'fas fa-mouse-pointer',
        'alternate-row': 'fas fa-fill-drip',
        'quick-styles': 'fas fa-paint-brush',
        'change-shape': 'fas fa-shapes',
        conditional: 'fas fa-list-ol',
        'shape-fill': 'fas fa-fill',
        'shape-outline': 'far fa-square',
        'shape-effects': 'fas fa-magic',
        report: 'fas fa-file-alt',
        'report-design': 'fas fa-chart-bar',
        'blank-report': 'far fa-file',
        'report-wizard': 'fas fa-magic',
        labels: 'fas fa-tags',
        query: 'fas fa-project-diagram',
        'query-wizard': 'fas fa-magic',
        sharepoint: 'fas fa-list-alt',
        module: 'fas fa-cubes',
        'class-module': 'fas fa-code-branch',
        relationships: 'fas fa-link',
        excel: 'fas fa-file-excel',
        acaciadb: 'fas fa-database',
        odbc: 'fas fa-server',
        import: 'fas fa-file-import',
        export: 'fas fa-file-export',
        text: 'fas fa-file-alt',
        email: 'fas fa-envelope',
        more: 'fas fa-ellipsis-h',
        deps: 'fas fa-sitemap',
        analyze: 'fas fa-chart-line',
        code: 'fas fa-code',
        run: 'fas fa-play-circle',
        secure: 'fas fa-shield-alt',
        'text-field': 'fas fa-font',
        number: 'fas fa-sort-numeric-down',
        currency: 'fas fa-dollar-sign',
        caption: 'fas fa-heading',
        required: 'fas fa-exclamation-circle',
        unique: 'fas fa-check',
        validation: 'fas fa-check-square',
        default: 'fas fa-clipboard-list',
        'field-size': 'fas fa-text-width',
        date: 'fas fa-calendar-alt',
        'yes-no': 'fas fa-check-square',
        'more-fields': 'fas fa-list',
        'rich-text': 'fas fa-italic',
        history: 'fas fa-history',
        attachment: 'fas fa-paperclip',
        hyperlink: 'fas fa-globe',
        'long-text': 'fas fa-font',
        euro: 'fas fa-euro-sign',
        scientific: 'fas fa-superscript',
        'short-date': 'far fa-calendar-alt',
        time: 'far fa-clock',
        checkbox: 'far fa-check-square',
        'quick-start': 'fas fa-magic',
        calculated: 'fas fa-calculator',
        expression: 'fas fa-function',
        memo: 'fas fa-align-left',
        'data-type': 'fas fa-list-alt',
        format: 'fas fa-font',
        'currency-symbol': 'fas fa-dollar-sign',
        percent: 'fas fa-percent',
        comma: 'fas fa-quote-right',
        'decimal-less': 'fas fa-angle-left',
        'decimal-more': 'fas fa-angle-right',
        indexed: 'fas fa-check-square',
        properties: 'fas fa-list-alt',
        index: 'fas fa-bolt',
        macro: 'fas fa-bolt',
        rename: 'fas fa-i-cursor',
        'before-change': 'fas fa-check',
        'before-delete': 'fas fa-trash-alt',
        'after-insert': 'fas fa-plus-square',
        'after-update': 'fas fa-sync-alt',
        'after-delete': 'fas fa-times-circle',
        'primary-key': 'fas fa-key',
        builder: 'fas fa-magic',
        'test-validation': 'fas fa-clipboard-check',
        'insert-row': 'fas fa-plus-square',
        lookup: 'fas fa-search-plus',
        save: 'fas fa-save',
        'save-as': 'fas fa-save',
        print: 'fas fa-print',
        options: 'fas fa-cog'
        ,
        'clear-filter': 'fas fa-filter',
        'filter-form': 'fas fa-wpforms',
        'apply-filter': 'fas fa-filter',
        'advanced-filter': 'fas fa-magic',
        'delete-tab': 'fas fa-times',
        'clear-grid': 'fas fa-times',
        close: 'fas fa-window-close',
        outlook: 'fab fa-microsoft',
        contact: 'far fa-address-card',
        'row-height': 'fas fa-arrows-alt-v',
        subdatasheet: 'fas fa-table',
        remove: 'fas fa-minus',
        expand: 'fas fa-expand-alt',
        collapse: 'fas fa-compress-alt',
        'hide-fields': 'fas fa-eye-slash',
        'unhide-fields': 'fas fa-eye',
        freeze: 'fas fa-columns',
        unfreeze: 'fas fa-columns',
        'field-width': 'fas fa-arrows-alt-h',
        first: 'fas fa-step-backward',
        previous: 'fas fa-caret-left',
        next: 'fas fa-caret-right',
        last: 'fas fa-step-forward',
        'gridlines-both': 'fas fa-border-all',
        'gridlines-horizontal': 'fas fa-grip-lines',
        'gridlines-vertical': 'fas fa-grip-lines-vertical',
        'gridlines-none': 'far fa-square'
    };

    return `<i class="${map[name] || map.more}" aria-hidden="true"></i>`;
}

function closeMoreFieldsMenu() {
    moreFieldsMenu?.remove();
    moreFieldsMenu = null;
    document.querySelector('[data-command="more-fields"]')?.classList.remove('active');
}

function closeValidationMenu() {
    validationMenu?.remove();
    validationMenu = null;
    document.querySelector('[data-command="validation"]')?.classList.remove('active');
}

function closeMemoMenu() {
    memoMenu?.remove();
    memoMenu = null;
    document.querySelector('[data-command="memo"]')?.classList.remove('active');
}

function closeCreateMenu() {
    createMenu?.remove();
    createMenu = null;
    document.querySelectorAll('.create-command.active, .create-mini.active, .home-big.active, .home-mini.active, .home-icon-button.active, .home-select.active, .add-column-head.active, .add-column-button.active').forEach(button => {
        button.classList.remove('active');
    });
}

function buildMoreFieldsMenu() {
    return `
        <div class="more-fields-scroll">
            ${moreFieldsGroups.map(([group, items]) => `
                <section class="more-fields-group">
                    <h3>${escapeHtml(group)}</h3>
                    ${items.map(([icon, label]) => `
                        <button class="more-fields-item" type="button" data-more-field="${escapeHtml(label)}">
                            <span class="more-fields-icon">${ribbonIcon(icon)}</span>
                            <span>${escapeHtml(label)}</span>
                        </button>
                    `).join('')}
                </section>
            `).join('')}
        </div>
        <div class="more-fields-footer">
            <button class="more-fields-item calculated-field-toggle" type="button" data-calculated-field-toggle>
                <span class="more-fields-icon">${ribbonIcon('calculated')}</span>
                <span>Calculated Field</span>
                <i class="fas fa-caret-right more-fields-arrow"></i>
            </button>
            <div class="calculated-field-submenu">
                ${calculatedFieldTypes.map(([icon, label]) => `
                    <button class="more-fields-item" type="button" data-calculated-field="${escapeHtml(label)}">
                        <span class="more-fields-icon">${ribbonIcon(icon)}</span>
                        <span>${escapeHtml(label)}</span>
                    </button>
                `).join('')}
            </div>
        </div>
    `;
}

function buildValidationMenu() {
    return `
        <button class="validation-menu-item" type="button" data-validation-menu-item="rule">
            <span class="validation-menu-icon">${ribbonIcon('validation')}</span>
            <span>
                <strong>Field Validation Rule</strong>
                <em>Create an expression that restricts the values that can be entered in the field.</em>
            </span>
        </button>
        <button class="validation-menu-item" type="button" data-validation-menu-item="message">
            <span class="validation-menu-icon">${ribbonIcon('test-validation')}</span>
            <span>
                <strong>Field Validation Message</strong>
                <em>Set the error message for the Field Validation Rule.</em>
            </span>
        </button>
    `;
}

function buildMemoMenu() {
    const column = window.acaciadbActiveTableColumn || {};
    const isHtml = acaciadbTypeForColumn(column) === 'HTML Text' || acaciadbTypeForColumn(column) === 'Rich Text';
    return `
        <button class="validation-menu-item" type="button" data-memo-menu-item="appendOnly">
            <span class="validation-menu-icon">${ribbonIcon('caption')}</span>
            <span>
                <strong>${column.appendOnly ? '✓ ' : ''}Append Only</strong>
                <em>Track each edited value for this memo field.</em>
            </span>
        </button>
        <button class="validation-menu-item" type="button" data-memo-menu-item="htmlText">
            <span class="validation-menu-icon">${ribbonIcon('rich-text')}</span>
            <span>
                <strong>${isHtml ? '✓ ' : ''}HTML Text</strong>
                <em>Render stored HTML as formatted text.</em>
            </span>
        </button>
        <button class="validation-menu-item" type="button" data-memo-menu-item="history">
            <span class="validation-menu-icon">${ribbonIcon('history')}</span>
            <span>
                <strong>Show Column History</strong>
                <em>View append-only changes for the current row and field.</em>
            </span>
        </button>
    `;
}

function openValidationMenu(button) {
    if (validationMenu) {
        closeValidationMenu();
        return;
    }

    closeMoreFieldsMenu();
    closeCreateMenu();
    const box = button.getBoundingClientRect();
    validationMenu = document.createElement('div');
    validationMenu.className = 'validation-menu';
    validationMenu.innerHTML = buildValidationMenu();
    document.body.appendChild(validationMenu);

    const menuWidth = validationMenu.offsetWidth;
    const left = Math.min(box.left, window.innerWidth - menuWidth - 8);
    validationMenu.style.left = `${Math.max(4, left)}px`;
    validationMenu.style.top = `${box.bottom + 2}px`;
    button.classList.add('active');
}

function openMemoMenu(button) {
    if (memoMenu) {
        closeMemoMenu();
        return;
    }

    closeMoreFieldsMenu();
    closeValidationMenu();
    closeCreateMenu();
    const box = button.getBoundingClientRect();
    memoMenu = document.createElement('div');
    memoMenu.className = 'validation-menu memo-menu';
    memoMenu.innerHTML = buildMemoMenu();
    document.body.appendChild(memoMenu);

    const menuWidth = memoMenu.offsetWidth;
    const left = Math.min(box.left, window.innerWidth - menuWidth - 8);
    memoMenu.style.left = `${Math.max(4, left)}px`;
    memoMenu.style.top = `${box.bottom + 2}px`;
    button.classList.add('active');
}

function openMoreFieldsMenu(button) {
    if (moreFieldsMenu && moreFieldsMenu.dataset.owner === 'more-fields') {
        closeMoreFieldsMenu();
        return;
    }

    closeMoreFieldsMenu();
    closeValidationMenu();
    closeMemoMenu();
    const box = button.getBoundingClientRect();
    moreFieldsMenu = document.createElement('div');
    moreFieldsMenu.className = 'more-fields-menu';
    moreFieldsMenu.dataset.owner = 'more-fields';
    moreFieldsMenu.innerHTML = buildMoreFieldsMenu();
    document.body.appendChild(moreFieldsMenu);

    const menuWidth = moreFieldsMenu.offsetWidth;
    const left = Math.min(box.left, window.innerWidth - menuWidth - 8);
    const top = box.bottom + 2;
    moreFieldsMenu.style.left = `${Math.max(4, left)}px`;
    moreFieldsMenu.style.top = `${top}px`;
    moreFieldsMenu.style.maxHeight = `${Math.max(260, window.innerHeight - top - 8)}px`;
    button.classList.add('active');
}

function buildCreateMenu(items) {
    return `
        <div class="create-menu-list">
            ${items.map(([icon, label]) => `
                <button class="create-menu-item" type="button">
                    <span>${ribbonIcon(icon)}</span>
                    <strong>${escapeHtml(label)}</strong>
                </button>
            `).join('')}
        </div>
    `;
}

function openCreateMenu(button, key) {
    if (createMenu?.dataset.owner === key) {
        closeCreateMenu();
        return;
    }

    closeCreateMenu();
    const items = createDropdowns[key] || [];
    const box = button.getBoundingClientRect();
    createMenu = document.createElement('div');
    createMenu.className = 'create-menu';
    createMenu.dataset.owner = key;
    createMenu.innerHTML = buildCreateMenu(items);
    document.body.appendChild(createMenu);
    createMenu.style.left = `${Math.max(4, Math.min(box.left, window.innerWidth - createMenu.offsetWidth - 8))}px`;
    createMenu.style.top = `${box.bottom + 1}px`;
    button.classList.add('active');
}

function homeBig(icon, label, options = {}) {
    const classes = ['home-big'];
    if (options.disabled) classes.push('disabled');

    return `
        <button class="${classes.join(' ')}" type="button" data-command="${escapeHtml(icon)}" ${options.view ? `data-view="${options.view}"` : ''} ${options.menu ? `data-home-menu="${options.menu}"` : ''} ${options.disabled ? 'disabled' : ''}>
            <span class="home-big-icon">${ribbonIcon(icon)}</span>
            <span>${escapeHtml(label)}</span>
            ${options.caret ? '<i class="fas fa-caret-down home-caret"></i>' : ''}
        </button>
    `;
}

function homeMini(icon, label, options = {}) {
    const classes = ['home-mini'];
    if (options.disabled) classes.push('disabled');

    return `
        <button class="${classes.join(' ')}" type="button" data-command="${escapeHtml(icon)}" ${options.view ? `data-view="${options.view}"` : ''} ${options.menu ? `data-home-menu="${options.menu}"` : ''} ${options.disabled ? 'disabled' : ''}>
            <span class="home-mini-icon">${ribbonIcon(icon)}</span>
            <span>${escapeHtml(label)}</span>
            ${options.caret ? '<i class="fas fa-caret-down home-caret"></i>' : ''}
        </button>
    `;
}

function homeIconButton(icon, options = {}) {
    return `
        <button class="home-icon-button" type="button" data-command="${escapeHtml(icon)}" ${options.menu ? `data-home-menu="${options.menu}"` : ''} title="${escapeHtml(options.title || icon)}">
            ${ribbonIcon(icon)}
            ${options.caret ? '<i class="fas fa-caret-down home-caret"></i>' : ''}
        </button>
    `;
}

function homeSelect(label, key, width = 178) {
    return `
        <button class="home-select" type="button" data-home-menu="${escapeHtml(key)}" style="width:${width}px">
            <span>${escapeHtml(label)}</span>
            <i class="fas fa-chevron-down"></i>
        </button>
    `;
}

function buildColorPalette() {
    const themeColumns = [
        ['#ffffff', '#f2f2f2', '#d9d9d9', '#bfbfbf', '#a6a6a6', '#808080', '#595959', '#404040', '#262626', '#0d0d0d'],
        ['#000000', '#7f7f7f', '#595959', '#3f3f3f', '#262626'],
        ['#1f4e79', '#d9eaf7', '#9dc3e6', '#5b9bd5', '#2f75b5', '#1f4e79'],
        ['#ed7d31', '#fce4d6', '#f8cbad', '#f4b183', '#ed7d31', '#c55a11'],
        ['#70ad47', '#e2f0d9', '#c6e0b4', '#a9d18e', '#70ad47', '#548235'],
        ['#ffc000', '#fff2cc', '#ffe699', '#ffd966', '#ffc000', '#bf9000']
    ];
    const standard = ['#ffffff', '#000000', '#7f7f7f', '#1f4e79', '#5b9bd5', '#c00000', '#70ad47', '#8064a2', '#00b0f0', '#f4b183', '#d9d9d9', '#a6a6a6', '#595959', '#dbe5f1', '#b4c6e7', '#f4cccc', '#d9ead3', '#d9d2e9', '#d0e0e3', '#fce5cd', '#ff0000', '#ff9900', '#ffff00', '#92d050', '#00b050', '#00b0f0', '#0070c0', '#002060', '#7030a0'];

    return `
        <div class="color-menu">
            <button class="color-auto" type="button"><span style="background:#111"></span>Automatic</button>
            <h3>Theme Colors</h3>
            <div class="theme-colors">${themeColumns.map(column => `<div>${column.map(color => `<button type="button" style="background:${color}"></button>`).join('')}</div>`).join('')}</div>
            <h3>Standard Colors</h3>
            <div class="standard-colors">${standard.map(color => `<button type="button" style="background:${color}"></button>`).join('')}</div>
            <h3>Recent Colors</h3>
            <div class="recent-colors"><button type="button" style="background:#ff0000"></button></div>
            <button class="more-colors" type="button"><i class="fas fa-circle-notch"></i>More Colors...</button>
        </div>
    `;
}

function buildHomeMenu(key) {
    const items = homeDropdowns[key] || [];
    if (items.some(item => item.colorGrid)) {
        return buildColorPalette();
    }

    return `
        <div class="home-menu-list ${key === 'font' ? 'font-menu-list' : ''} ${key === 'size' ? 'size-menu-list' : ''}">
            ${items.map(item => {
                const rowInner = `
                    ${item.icon ? `<span class="home-menu-icon">${ribbonIcon(item.icon)}</span>` : ''}
                    <span class="${item.strong ? 'font-semibold' : ''}">${escapeHtml(item.label)}</span>
                `;

                if (item.submenu) {
                    return `
                        <div class="home-menu-item home-menu-parent ${item.disabled ? 'disabled' : ''}">
                            ${rowInner}
                            <i class="fas fa-caret-right home-submenu-caret"></i>
                            <span class="home-submenu">${item.submenu.map(sub => `
                                <button class="home-menu-item ${sub.disabled ? 'disabled' : ''}" type="button" data-home-menu-item data-home-value="${escapeHtml(sub.label)}" ${sub.disabled ? 'disabled' : ''}>
                                    <span class="home-menu-icon">${ribbonIcon(sub.icon)}</span>
                                    <span>${escapeHtml(sub.label)}</span>
                                </button>
                            `).join('')}</span>
                        </div>
                    `;
                }

                return `
                    <button class="home-menu-item ${item.disabled ? 'disabled' : ''} ${item.active ? 'active' : ''}" type="button" data-home-menu-item data-home-value="${escapeHtml(item.label)}" ${item.view ? `data-view="${escapeHtml(item.view)}"` : ''} ${item.disabled ? 'disabled' : ''} style="${item.family ? `font-family:${escapeHtml(item.family)}, sans-serif` : ''}">
                        ${rowInner}
                    </button>
                `;
            }).join('')}
        </div>
    `;
}

function openHomeMenu(button, key) {
    if (createMenu?.dataset.owner === `home-${key}`) {
        closeCreateMenu();
        return;
    }

    closeCreateMenu();
    const box = button.getBoundingClientRect();
    createMenu = document.createElement('div');
    createMenu.className = `create-menu home-menu home-menu-${key}`;
    createMenu.dataset.owner = `home-${key}`;
    createMenu.innerHTML = buildHomeMenu(key);
    document.body.appendChild(createMenu);
    const left = Math.min(box.left, window.innerWidth - createMenu.offsetWidth - 8);
    createMenu.style.left = `${Math.max(4, left)}px`;
    createMenu.style.top = `${box.bottom + 1}px`;
    button.classList.add('active');
}

function renderHomeRibbon() {
    closeCreateMenu();
    ribbon.innerHTML = `
        <div class="home-ribbon">
            <div class="home-group" data-label="Views">
                ${homeBig('design', 'View', { caret: true, menu: 'view' })}
            </div>
            <div class="home-group" data-label="Clipboard">
                ${homeBig('paste', 'Paste', { caret: true, menu: 'paste' })}
                <div class="home-stack">
                    ${homeMini('cut', 'Cut', { disabled: true })}
                    ${homeMini('copy', 'Copy', { disabled: true })}
                    ${homeMini('format-painter', 'Format Painter', { disabled: true })}
                </div>
            </div>
            <div class="home-group" data-label="Sort & Filter">
                ${homeBig('filter', 'Filter')}
                <div class="home-stack">
                    ${homeMini('sort-asc', 'Ascending')}
                    ${homeMini('sort-desc', 'Descending')}
                    ${homeMini('remove-sort', 'Remove Sort', { disabled: true })}
                </div>
                <div class="home-stack home-stack-wide">
                    ${homeMini('selection', 'Selection', { caret: true, menu: 'selection' })}
                    ${homeMini('advanced', 'Advanced', { caret: true, menu: 'advanced' })}
                    ${homeMini('toggle-filter', 'Toggle Filter', { disabled: true })}
                </div>
            </div>
            <div class="home-group" data-label="Records">
                ${homeBig('refresh-all', 'Refresh All', { caret: true })}
                <div class="home-stack">
                    ${homeMini('new', 'New', { disabled: true })}
                    ${homeMini('save', 'Save')}
                    ${homeMini('delete', 'Delete', { disabled: true, caret: true })}
                </div>
                <div class="home-stack">
                    ${homeMini('totals', 'Totals')}
                    ${homeMini('spelling', 'Spelling')}
                    ${homeMini('more', 'More', { caret: true, menu: 'more' })}
                </div>
            </div>
            <div class="home-group" data-label="Find">
                ${homeBig('find', 'Find')}
                <div class="home-stack">
                    ${homeMini('replace', 'Replace')}
                    ${homeMini('go-to', 'Go To', { caret: true, menu: 'goto' })}
                    ${homeMini('select', 'Select', { caret: true, menu: 'select' })}
                </div>
            </div>
            <div class="home-group home-text-group" data-label="Text Formatting">
                <div class="home-format-panel">
                    <div class="home-format-row">
                        ${homeSelect('Calibri (Detail)', 'font', 206)}
                        ${homeSelect('11', 'size', 88)}
                        ${homeIconButton('bullets', { title: 'Bullets' })}
                        ${homeIconButton('numbered-list', { title: 'Numbering' })}
                        ${homeIconButton('indent', { title: 'Increase Indent' })}
                        ${homeIconButton('outdent', { title: 'Decrease Indent' })}
                    </div>
                    <div class="home-format-row">
                        ${homeIconButton('bold', { title: 'Bold' })}
                        ${homeIconButton('italic', { title: 'Italic' })}
                        ${homeIconButton('underline', { title: 'Underline' })}
                        ${homeIconButton('font-color', { title: 'Font Color', caret: true, menu: 'color' })}
                        ${homeIconButton('text-highlight', { title: 'Text Highlight' })}
                        ${homeIconButton('fill-color', { title: 'Fill Color', caret: true, menu: 'color' })}
                        ${homeIconButton('align-left', { title: 'Align Left' })}
                        ${homeIconButton('align-center', { title: 'Align Center' })}
                        ${homeIconButton('align-right', { title: 'Align Right' })}
                        ${homeIconButton('gridlines', { title: 'Gridlines', caret: true, menu: 'gridlines' })}
                    </div>
                </div>
            </div>
        </div>
    `;
}

function createCommand(icon, label, options = {}) {
    return `
        <button class="create-command" type="button" data-command="${escapeHtml(icon)}" ${options.view ? `data-view="${options.view}"` : ''} ${options.menu ? `data-create-menu="${options.menu}"` : ''}>
            <span class="create-command-icon">${ribbonIcon(icon)}</span>
            <span>${escapeHtml(label)}</span>
            ${options.caret ? '<i class="fas fa-caret-down create-caret"></i>' : ''}
        </button>
    `;
}

function createMini(icon, label, options = {}) {
    return `
        <button class="create-mini" type="button" data-command="${escapeHtml(icon)}" ${options.view ? `data-view="${options.view}"` : ''} ${options.menu ? `data-create-menu="${options.menu}"` : ''}>
            <span>${ribbonIcon(icon)}</span>
            <span>${escapeHtml(label)}</span>
            ${options.caret ? '<i class="fas fa-caret-down create-caret"></i>' : ''}
        </button>
    `;
}

function renderCreateRibbon() {
    closeCreateMenu();
    ribbon.innerHTML = `
        <div class="create-ribbon">
            <div class="create-group" data-label="Tables">
                ${createCommand('table', 'Table')}
                ${createCommand('design', 'Table Design', { view: 'table-detail' })}
                ${createCommand('sharepoint', 'SharePoint Lists', { caret: true })}
            </div>
            <div class="create-group" data-label="Queries">
                ${createCommand('query-wizard', 'Query Wizard')}
                ${createCommand('query', 'Query Design', { view: 'query-sales-by-region' })}
            </div>
            <div class="create-group create-forms-group" data-label="Forms">
                ${createCommand('form', 'Form')}
                ${createCommand('form-design', 'Form Design')}
                ${createCommand('blank-form', 'Blank Form')}
                <div class="create-stack">
                    ${createMini('form-wizard', 'Form Wizard')}
                    ${createMini('navigation', 'Navigation', { caret: true, menu: 'navigation' })}
                    ${createMini('more-forms', 'More Forms', { caret: true, menu: 'more-forms' })}
                </div>
            </div>
            <div class="create-group create-reports-group" data-label="Reports">
                ${createCommand('report', 'Report')}
                ${createCommand('report-design', 'Report Design')}
                ${createCommand('blank-report', 'Blank Report')}
                <div class="create-stack">
                    ${createMini('report-wizard', 'Report Wizard')}
                    ${createMini('labels', 'Labels')}
                </div>
            </div>
            <div class="create-group" data-label="Macros & Code">
                ${createCommand('macro', 'Macro')}
                <div class="create-stack">
                    ${createMini('module', 'Module')}
                    ${createMini('class-module', 'Class Module')}
                    ${createMini('code', 'Visual Basic')}
                </div>
            </div>
        </div>
    `;
}


function renderRibbon(name) {
    closeMoreFieldsMenu();
    closeValidationMenu();
    closeCreateMenu();
    if (name === 'home') {
        renderHomeRibbon();
        return;
    }

    if (name === 'create') {
        renderCreateRibbon();
        return;
    }

    if (name === 'fields') {
        renderFieldsRibbon();
        window.updateFieldsRibbonState?.();
        return;
    }

    if (name === 'table-design') {
        renderTableDesignRibbon();
        return;
    }

    if (name === 'form-design') {
        renderFormDesignRibbon();
        return;
    }

    if (name === 'form-arrange') {
        renderFormArrangeRibbon();
        return;
    }

    if (name === 'form-format') {
        renderFormFormatRibbon();
        return;
    }

    const groups = ribbons[name] || ribbons.home;
    ribbon.innerHTML = `<div class="ribbon-content">${groups.map(([label, commands]) => `
        <div class="ribbon-group" data-label="${label}">
            ${commands.map(([icon, text, view]) => `
                <button class="ribbon-command" data-command="${escapeHtml(icon)}" ${view ? `data-view="${view}"` : ''}>
                    <span class="icon">${ribbonIcon(icon)}</span>
                    <span>${escapeHtml(text)}</span>
                </button>
            `).join('')}
        </div>
    `).join('')}</div>`;
}

function isTableDatasheetView(view) {
    return Object.prototype.hasOwnProperty.call(tableViewPairs, view);
}

function isTableDesignView(view) {
    return Object.prototype.hasOwnProperty.call(designViewPairs, view);
}

function updateContextualRibbon(view) {
    const tableDatasheet = isTableDatasheetView(view);
    const tableDesign = isTableDesignView(view);
    const showTableTools = tableDatasheet || tableDesign;
    const formDesign = view.startsWith('design-form-');

    updateObjectPaneResizeState(view);

    contextualToolsLabel.textContent = formDesign ? 'Form Design Tools' : 'Table Tools';
    contextualToolsLabel?.classList.toggle('hidden', !showTableTools && !formDesign);
    tableToolsTabs?.classList.toggle('hidden', !showTableTools);
    formToolsTabs?.classList.toggle('hidden', !formDesign);
    document.querySelectorAll('[data-table-context="datasheet"]').forEach(tab => {
        tab.classList.toggle('hidden', !tableDatasheet);
    });
    document.querySelectorAll('[data-table-context="design"]').forEach(tab => {
        tab.classList.toggle('hidden', !tableDesign);
    });

    if (tableDesign && currentRibbon !== 'table-design') {
        activateRibbonTab('table-design');
        return;
    }

    if (formDesign && !['form-design', 'form-arrange', 'form-format'].includes(currentRibbon)) {
        activateRibbonTab('form-design');
        return;
    }

    if (tableDatasheet && !['fields', 'table'].includes(currentRibbon)) {
        activateRibbonTab('fields');
        return;
    }

    if (!showTableTools && !formDesign && ['fields', 'table', 'table-design', 'form-design', 'form-arrange', 'form-format'].includes(currentRibbon)) {
        activateRibbonTab('home');
    }
}

function activateRibbonTab(name) {
    currentRibbon = name;
    document.querySelectorAll('.ribbon-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.ribbon === name);
    });
    renderRibbon(name);
}

