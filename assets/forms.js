function formRibbonCommand(icon, label, options = {}) {
    return `
        <button class="form-ribbon-command" type="button" data-command="${escapeHtml(icon)}" ${options.view ? `data-view="${options.view}"` : ''}>
            <span class="form-ribbon-icon">${ribbonIcon(icon)}</span>
            <span>${escapeHtml(label)}</span>
            ${options.caret ? '<i class="fas fa-caret-down create-caret"></i>' : ''}
        </button>
    `;
}

function formRibbonMini(icon, label, options = {}) {
    return `
        <button class="form-ribbon-mini" type="button" data-command="${escapeHtml(icon)}">
            <span>${ribbonIcon(icon)}</span>
            <span>${escapeHtml(label)}</span>
            ${options.caret ? '<i class="fas fa-caret-down create-caret"></i>' : ''}
        </button>
    `;
}

function renderFormDesignRibbon() {
    ribbon.innerHTML = `
        <div class="form-design-ribbon">
            <div class="form-ribbon-group" data-label="Views">${formRibbonCommand('grid', 'View', { caret: true })}</div>
            <div class="form-ribbon-group" data-label="Themes">
                ${formRibbonCommand('themes', 'Themes', { caret: true })}
                <div class="form-ribbon-stack">
                    ${formRibbonMini('colors', 'Colors', { caret: true })}
                    ${formRibbonMini('font', 'Fonts', { caret: true })}
                </div>
            </div>
            <div class="form-ribbon-group form-controls-group" data-label="Controls">
                ${formRibbonCommand('pointer', 'Select')}
                ${formRibbonCommand('text-field', 'Text Box')}
                ${formRibbonCommand('label', 'Label')}
                ${formRibbonCommand('button-control', 'Button')}
                ${formRibbonCommand('folder', 'Tab')}
                ${formRibbonCommand('hyperlink', 'Hyperlink')}
                ${formRibbonCommand('web-browser', 'Web Browser')}
                ${formRibbonCommand('subform', 'Subform')}
                ${formRibbonCommand('image', 'Insert Image', { caret: true })}
                ${formRibbonCommand('chart', 'Insert Modern Chart', { caret: true })}
            </div>
            <div class="form-ribbon-group" data-label="Header / Footer">
                <div class="form-ribbon-stack">
                    ${formRibbonMini('logo', 'Logo')}
                    ${formRibbonMini('title', 'Title')}
                    ${formRibbonMini('date', 'Date and Time')}
                </div>
            </div>
            <div class="form-ribbon-group" data-label="Tools">
                ${formRibbonCommand('add-fields', 'Add Existing Fields')}
                ${formRibbonCommand('properties', 'Property Sheet')}
                ${formRibbonCommand('tab-order', 'Tab Order')}
                ${formRibbonCommand('chart', 'Chart Settings')}
            </div>
        </div>
    `;
}

function renderFormArrangeRibbon() {
    ribbon.innerHTML = `
        <div class="form-design-ribbon">
            <div class="form-ribbon-group" data-label="Table">
                ${formRibbonCommand('gridlines', 'Gridlines', { caret: true })}
                ${formRibbonCommand('stacked', 'Stacked')}
                ${formRibbonCommand('tabular', 'Tabular')}
                ${formRibbonCommand('remove-layout', 'Remove Layout')}
            </div>
            <div class="form-ribbon-group" data-label="Rows & Columns">
                <div class="form-ribbon-stack">
                    ${formRibbonMini('insert-above', 'Insert Above')}
                    ${formRibbonMini('insert-below', 'Insert Below')}
                    ${formRibbonMini('insert-left', 'Insert Left')}
                </div>
                <div class="form-ribbon-stack">
                    ${formRibbonMini('insert-right', 'Insert Right')}
                    ${formRibbonMini('select-layout', 'Select Layout')}
                    ${formRibbonMini('select-column', 'Select Column')}
                </div>
            </div>
            <div class="form-ribbon-group" data-label="Merge / Split">${formRibbonCommand('merge', 'Merge')}${formRibbonCommand('split-vertical', 'Split Vertically')}${formRibbonCommand('split-horizontal', 'Split Horizontally')}</div>
            <div class="form-ribbon-group" data-label="Move">${formRibbonCommand('move-up', 'Move Up')}${formRibbonCommand('move-down', 'Move Down')}</div>
            <div class="form-ribbon-group" data-label="Position">${formRibbonCommand('margins', 'Control Margins', { caret: true })}${formRibbonCommand('padding', 'Control Padding', { caret: true })}${formRibbonCommand('anchoring', 'Anchoring', { caret: true })}</div>
            <div class="form-ribbon-group" data-label="Sizing & Ordering">${formRibbonCommand('size-space', 'Size/Space', { caret: true })}${formRibbonCommand('align', 'Align', { caret: true })}${formRibbonCommand('bring-front', 'Bring to Front')}${formRibbonCommand('send-back', 'Send to Back')}</div>
        </div>
    `;
}

function renderFormFormatRibbon() {
    ribbon.innerHTML = `
        <div class="form-design-ribbon">
            <div class="form-ribbon-group" data-label="Selection">
                <div class="form-selection-box"><i class="fas fa-sliders-h"></i><select><option>Form</option><option>Detail</option><option>Text Box</option></select></div>
                ${formRibbonMini('select-all', 'Select All')}
            </div>
            <div class="form-ribbon-group" data-label="Font">
                <div class="form-ribbon-stack wide">
                    <select><option>Calibri</option></select>
                    <select><option>11</option></select>
                    <div class="mini-icon-row"><button>B</button><button><i>I</i></button><button><u>U</u></button><button>A</button></div>
                </div>
            </div>
            <div class="form-ribbon-group" data-label="Number">
                <select><option>Formatting</option></select>
                <div class="mini-icon-row"><button>$</button><button>%</button><button>,</button><button>.0</button><button>.00</button></div>
            </div>
            <div class="form-ribbon-group" data-label="Background">${formRibbonCommand('image', 'Background Image', { caret: true })}${formRibbonCommand('alternate-row', 'Alternate Row Color', { caret: true })}</div>
            <div class="form-ribbon-group" data-label="Control Formatting">${formRibbonCommand('quick-styles', 'Quick Styles')}${formRibbonCommand('change-shape', 'Change Shape')}${formRibbonCommand('conditional', 'Conditional Formatting')}${formRibbonCommand('shape-fill', 'Shape Fill')}${formRibbonCommand('shape-outline', 'Shape Outline')}${formRibbonCommand('shape-effects', 'Shape Effects')}</div>
        </div>
    `;
}


function initFormViews(db) {
    content.querySelectorAll('[data-form-view]').forEach(view => {
        if (view.dataset.ready === 'true') {
            return;
        }

        view.dataset.ready = 'true';
        const form = db.forms[view.dataset.formId];
        let index = 0;

        function renderForm() {
            if (!form) {
                view.innerHTML = '<div class="p-6 text-red-700">Form definition was not found.</div>';
                return;
            }

            const parentTable = db.tables[form.parentTable];
            if (!parentTable) {
                view.innerHTML = `<div class="p-6 text-red-700">Parent table ${escapeHtml(form.parentTable)} was not found.</div>`;
                return;
            }

            const parentRows = parentTable.data;
            const parent = parentRows[index];
            const subform = form.subform;
            const subTable = db.tables[subform.table];
            if (!subTable) {
                view.innerHTML = `<div class="p-6 text-red-700">Subform table ${escapeHtml(subform.table)} was not found.</div>`;
                return;
            }

            if (!parent) {
                view.innerHTML = '<div class="p-6 text-neutral-500">This form has no records.</div>';
                return;
            }

            const subRows = subTable.data.filter(row => String(row[subform.foreignKey]) === String(parent[form.parentKey]));
            const parentColumns = parentTable.structure.columns.filter(column => form.fields.includes(column.name));
            const total = subRows.reduce((sum, row) => sum + Number(row.Total || row.UnitPrice * row.Quantity || 0), 0);

            view.innerHTML = `
                <div class="access-form">
                    <div class="form-title">${escapeHtml(form.title)}</div>
                    <div class="form-body">
                        <div class="form-fields">
                            ${parentColumns.map(column => `
                                <label class="form-label">${escapeHtml(column.label || column.name)}</label>
                                <input class="form-input" data-form-field="${escapeHtml(column.name)}" value="${escapeHtml(formatValue(parent[column.name], column.type))}">
                            `).join('')}
                        </div>
                        <div class="form-summary">
                            <div class="mb-2 font-semibold">Record Summary</div>
                            <div class="space-y-2 text-sm">
                                <div class="flex justify-between"><span>Parent table</span><strong>${escapeHtml(form.parentTable)}</strong></div>
                                <div class="flex justify-between"><span>Child rows</span><strong>${subRows.length}</strong></div>
                                <div class="flex justify-between"><span>Sub total</span><strong>${formatValue(total, 'Currency')}</strong></div>
                            </div>
                        </div>
                    </div>
                    <div class="subform-panel">
                        <div class="subform-title">${escapeHtml(subform.title)}</div>
                        <div class="subform-scroll" data-subform-host>
                            ${buildTableMarkup(subTable, subRows, { className: 'subform-grid', columns: subform.columns, emptyRows: 12 })}
                        </div>
                        <div class="subform-footer">
                            <div class="record-bar form-record-bar">
                                <span>Record:</span>
                                <button data-form-nav="first" title="First record"><i class="fas fa-step-backward"></i></button>
                                <button data-form-nav="previous" title="Previous record"><i class="fas fa-caret-left"></i></button>
                                <input class="record-position-input" value="${index + 1} of ${parentRows.length}" readonly>
                                <button data-form-nav="next" title="Next record"><i class="fas fa-caret-right"></i></button>
                                <button data-form-nav="last" title="Last record"><i class="fas fa-step-forward"></i></button>
                                <button class="opacity-40" disabled title="New record"><i class="fas fa-asterisk"></i></button>
                                <span class="border-l border-[#c6c6c6] pl-2 text-neutral-500">No Filter</span>
                                <input class="record-search-input" value="Search">
                            </div>
                            <div class="subform-scrollbar-pad"></div>
                        </div>
                    </div>
                </div>
            `;

            const subformHost = view.querySelector('[data-subform-host]');
            enableEditableCells(subformHost, subRows);
            enableSubformSorting(subformHost, subTable, subRows, subform.columns);
        }

        view.addEventListener('click', event => {
            const button = event.target.closest('[data-form-nav]');
            if (!button) {
                return;
            }

            const count = db.tables[form.parentTable]?.data.length || 0;
            if (button.dataset.formNav === 'first') index = 0;
            if (button.dataset.formNav === 'previous') index = Math.max(0, index - 1);
            if (button.dataset.formNav === 'next') index = Math.min(count - 1, index + 1);
            if (button.dataset.formNav === 'last') index = count - 1;
            renderForm();
        });

        renderForm();
    });
}

function initFormDesignViews(db) {
    content.querySelectorAll('[data-form-design-view]').forEach(view => {
        if (view.dataset.ready === 'true') {
            return;
        }

        view.dataset.ready = 'true';
        const form = db.forms[view.dataset.formId];
        if (!form) {
            view.innerHTML = '<div class="p-6 text-red-700">Form definition was not found.</div>';
            return;
        }

        const parentTable = db.tables[form.parentTable];
        if (!parentTable) {
            view.innerHTML = `<div class="p-6 text-red-700">Parent table ${escapeHtml(form.parentTable)} was not found.</div>`;
            return;
        }

        const parentColumns = parentTable.structure.columns.filter(column => form.fields.includes(column.name));
        const subTable = db.tables[form.subform.table];
        if (!subTable) {
            view.innerHTML = `<div class="p-6 text-red-700">Subform table ${escapeHtml(form.subform.table)} was not found.</div>`;
            return;
        }

        const subColumns = subTable.structure.columns.filter(column => form.subform.columns.includes(column.name));

        const firstColumn = parentColumns[0];
        view.innerHTML = `
            <div class="form-design-layout">
                <div class="form-designer">
                    <div class="designer-tab"><i class="fas fa-window-restore"></i><span>${escapeHtml(form.title)}</span></div>
                    <div class="designer-rulers">
                        <div class="designer-corner"></div>
                        <div class="designer-ruler-x">${Array.from({ length: 10 }, (_, index) => `<span>${index}</span>`).join('')}</div>
                    </div>
                    <div class="designer-body">
                        <div class="designer-nav-label">Navigation Pane</div>
                        <div class="designer-canvas">
                            <section class="designer-section form-header-section">
                                <div class="designer-section-title"><i class="fas fa-caret-down"></i> Form Header</div>
                                <div class="designer-band form-header-band">
                                    <div class="designer-form-icon"><i class="fas fa-window-restore"></i></div>
                                    <div class="designer-title-control">${escapeHtml(form.title)}</div>
                                </div>
                            </section>
                            <section class="designer-section detail-section">
                                <div class="designer-section-title"><i class="fas fa-caret-down"></i> Detail</div>
                                <div class="designer-band detail-band">
                                    ${parentColumns.map((column, index) => `
                                        <label class="designer-label" style="top:${34 + index * 64}px">${escapeHtml(column.label || column.name)}</label>
                                        <div class="designer-input ${index === 0 ? 'selected-control' : ''}" style="top:${28 + index * 64}px">${escapeHtml(column.name)}</div>
                                    `).join('')}
                                    <div class="designer-subform">
                                        <div class="designer-subform-title">${escapeHtml(form.subform.title)}</div>
                                        <div class="designer-subform-grid">
                                            ${subColumns.slice(0, 5).map(column => `<span>${escapeHtml(column.label || column.name)}</span>`).join('')}
                                        </div>
                                    </div>
                                </div>
                            </section>
                            <section class="designer-section form-footer-section">
                                <div class="designer-section-title"><i class="fas fa-caret-down"></i> Form Footer</div>
                                <div class="designer-band form-footer-band"></div>
                            </section>
                        </div>
                    </div>
                </div>
                <aside class="property-sheet form-property-sheet" data-property-sheet>
                    <button class="property-close" title="Close Property Sheet"><i class="fas fa-times"></i></button>
                    <h2>Property Sheet</h2>
                    <p>Selection type: Text Box</p>
                    <select class="form-property-select"><option>${escapeHtml(firstColumn?.name || 'Form')}</option></select>
                    <div class="field-tabs"><button class="active">Format</button><button>Data</button><button>Event</button><button>Other</button><button>All</button></div>
                    <div class="property-grid">
                        ${[
                            ['Name', firstColumn?.name || form.title],
                            ['Label Name', 'Label0'],
                            ['Control Source', firstColumn?.name || ''],
                            ['Format', ''],
                            ['Decimal Places', 'Auto'],
                            ['Visible', 'Yes'],
                            ['Text Format', 'Plain Text'],
                            ['Width', '6.825"'],
                            ['Height', '0.2493"'],
                            ['Top', '0.25"'],
                            ['Left', '1.1833"'],
                            ['Back Style', 'Normal'],
                            ['Border Style', 'Solid'],
                            ['Font Name', 'Calibri (Detail)'],
                            ['Font Size', '11'],
                            ['Text Align', 'Left']
                        ].map(([label, value]) => `<div class="prop-label">${escapeHtml(label)}</div><div class="prop-value">${escapeHtml(value)}</div>`).join('')}
                    </div>
                </aside>
            </div>
        `;

        view.addEventListener('click', event => {
            if (event.target.closest('.property-close')) {
                view.querySelector('[data-property-sheet]')?.classList.add('hidden');
            }
        });
    });
}

