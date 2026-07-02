function initDesignViews(db) {
    content.querySelectorAll('[data-design-view]').forEach(view => {
        if (view.dataset.ready === 'true') {
            return;
        }

        view.dataset.ready = 'true';
        const tableName = view.dataset.tableId;
        const tableDef = db.tables[tableName];
        const columns = tableDef.structure.columns;
        let selectedIndex = 0;

        function fieldSizeFor(column) {
            if (['AutoNumber', 'Large Number', 'Number'].includes(column.type)) return 'Long Integer';
            if (column.type === 'Currency') return 'Currency';
            if (column.type === 'Yes/No') return 'Yes/No';
            if (column.type === 'Date/Time') return 'General Date';
            return '255';
        }

        function fieldPropertiesFor(column) {
            const isPrimary = column.name === tableDef.structure.primaryKey;
            const rows = [['Field Size', fieldSizeFor(column)]];
            if (column.type === 'AutoNumber') rows.push(['New Values', 'Increment']);
            if (['Number', 'Currency', 'Date/Time'].includes(column.type)) rows.push(['Format', '']);
            if (column.type === 'Number') rows.push(['Decimal Places', 'Auto']);
            rows.push(
                ['Input Mask', ''],
                ['Caption', column.friendlyName || ''],
                ['Default Value', ''],
                ['Validation Rule', ''],
                ['Validation Text', ''],
                ['Required', isPrimary ? 'Yes' : 'No'],
                ['Allow Zero Length', column.type === 'Short Text' ? 'Yes' : ''],
                ['Indexed', isPrimary ? 'Yes (No Duplicates)' : 'No'],
                ['Unicode Compression', column.type === 'Short Text' ? 'Yes' : ''],
                ['IME Mode', column.type === 'Short Text' ? 'No Control' : ''],
                ['IME Sentence Mode', column.type === 'Short Text' ? 'None' : ''],
                ['Description', column.comment || ''],
                ['Text Align', 'General']
            );
            return rows;
        }

        function renderFieldProperties() {
            const column = columns[selectedIndex] || columns[0];
            const host = view.querySelector('[data-field-property-grid]');
            if (!host || !column) return;
            host.innerHTML = fieldPropertiesFor(column).map(([label, value]) => `<div class="prop-label">${escapeHtml(label)}</div><div class="prop-value">${escapeHtml(value)}</div>`).join('');
        }

        function renderPropertySheet() {
            const column = columns[selectedIndex] || columns[0];
            const host = view.querySelector('[data-property-sheet-grid]');
            if (!host || !column) return;
            view.querySelector('[data-selection-type]').textContent = 'Selection type: Field Properties';
            host.innerHTML = [
                ['Name', column.name],
                ['Data Type', column.type],
                ['Primary Key', column.name === tableDef.structure.primaryKey ? 'Yes' : 'No'],
                ['Indexed', column.name === tableDef.structure.primaryKey ? 'Yes (No Duplicates)' : 'No'],
                ['Required', column.name === tableDef.structure.primaryKey ? 'Yes' : 'No'],
                ['Caption', column.friendlyName || ''],
                ['Description', column.comment || ''],
                ['Validation Rule', ''],
                ['Text Align', 'General']
            ].map(([label, value]) => `<div class="prop-label">${escapeHtml(label)}</div><div class="prop-value">${escapeHtml(value)}</div>`).join('');
        }

        function selectDesignRow(index) {
            selectedIndex = Math.max(0, Math.min(columns.length - 1, index));
            view.querySelectorAll('[data-design-row]').forEach(row => {
                const selected = Number(row.dataset.designRow) === selectedIndex;
                row.classList.toggle('editing', selected);
                row.querySelector('.row-head').textContent = selected ? '*' : '';
            });
            renderFieldProperties();
            renderPropertySheet();
        }

        function openTypeDropdown(cell, index) {
            view.querySelector('.design-type-menu')?.remove();
            const menu = document.createElement('div');
            menu.className = 'design-type-menu';
            menu.innerHTML = tableDataTypes.map(type => `<button class="${type === columns[index].type ? 'selected' : ''}" type="button" data-type-value="${escapeHtml(type)}">${escapeHtml(type)}</button>`).join('');
            cell.appendChild(menu);
        }

        view.innerHTML = `
            <div class="table-design-layout">
                <div class="table-design-main">
                    <div class="table-design-grid-wrap">
                        <table class="access-grid design-grid" style="min-width:920px">
                            <thead>
                                <tr>
                                    <th class="row-head"></th>
                                    <th style="width:260px" class="selected-head">Field Name</th>
                                    <th style="width:190px">Data Type</th>
                                    <th style="width:460px">Description (Optional)</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${columns.map((column, index) => `
                                    <tr class="${index === 0 ? 'editing' : ''}" data-design-row="${index}">
                                        <td class="row-head">${index === 0 ? '*' : ''}</td>
                                        <td>${escapeHtml(column.name)}</td>
                                        <td class="design-type-cell" data-type-cell="${index}">
                                            <span>${escapeHtml(column.type)}</span>
                                            <button class="design-type-button" type="button"><i class="fas fa-caret-down"></i></button>
                                        </td>
                                        <td>${escapeHtml(column.comment || (column.name === tableDef.structure.primaryKey ? 'Primary key' : ''))}</td>
                                    </tr>
                                `).join('')}
                                ${Array.from({ length: 8 }, () => '<tr><td class="row-head"></td><td></td><td></td><td></td></tr>').join('')}
                            </tbody>
                        </table>
                    </div>
                    <section class="field-properties">
                        <div class="field-properties-title">Field Properties</div>
                        <div class="field-properties-body">
                            <div>
                                <div class="field-tabs"><button class="active">General</button><button>Lookup</button></div>
                                <div class="property-grid" data-field-property-grid></div>
                            </div>
                            <p>A field name can be up to 64 characters long, including spaces. Press F1 for help on field names.</p>
                        </div>
                    </section>
                </div>
                <aside class="property-sheet" data-property-sheet>
                    <button class="property-close" title="Close Property Sheet"><i class="fas fa-times"></i></button>
                    <h2>Property Sheet</h2>
                    <p data-selection-type>Selection type: Field Properties</p>
                    <div class="field-tabs"><button class="active">General</button></div>
                    <div class="property-grid" data-property-sheet-grid></div>
                </aside>
            </div>
        `;
        renderFieldProperties();
        renderPropertySheet();

        view.addEventListener('click', event => {
            const typeValue = event.target.closest('[data-type-value]');
            if (typeValue) {
                const cell = typeValue.closest('[data-type-cell]');
                const index = Number(cell.dataset.typeCell);
                columns[index].type = typeValue.dataset.typeValue;
                cell.querySelector('span').textContent = columns[index].type;
                typeValue.closest('.design-type-menu').remove();
                selectDesignRow(index);
                return;
            }

            const typeButton = event.target.closest('.design-type-button');
            if (typeButton) {
                const cell = typeButton.closest('[data-type-cell]');
                const index = Number(cell.dataset.typeCell);
                selectDesignRow(index);
                openTypeDropdown(cell, index);
                event.stopPropagation();
                return;
            }

            const row = event.target.closest('[data-design-row]');
            if (row) {
                selectDesignRow(Number(row.dataset.designRow));
                view.querySelector('.design-type-menu')?.remove();
                return;
            }

            const closeSheet = event.target.closest('.property-close');
            if (closeSheet) {
                view.querySelector('[data-property-sheet]')?.classList.add('hidden');
                return;
            }

            view.querySelector('.design-type-menu')?.remove();
        });
    });
}
