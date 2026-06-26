function initQueryBuilders(db) {
    content.querySelectorAll('[data-query-builder]').forEach(builder => {
        if (builder.dataset.ready === 'true') {
            return;
        }

        builder.dataset.ready = 'true';
        const query = getDefinitionByName(db.queries, builder.dataset.queryId);
        const canvas = builder.querySelector('[data-query-canvas]');
        const wires = builder.querySelector('[data-query-wires]');
        const picker = builder.querySelector('[data-table-picker]');
        const gridHost = builder.querySelector('[data-query-grid]');

        if (!query) {
            canvas.innerHTML = '<div class="p-6 text-red-700">Query definition was not found.</div>';
            return;
        }

        const tables = new Set((query.tables || [])
            .map(table => resolveTableName(db, table))
            .filter(table => db.tables[table]));
        let connections = (query.connections || []).map(connection => ({
            from: normalizeFieldRef(db, connection.from),
            fromSide: 'right',
            to: normalizeFieldRef(db, connection.to),
            toSide: 'left'
        }));
        let selectedConnection = null;
        let dragConnection = null;
        let selectedFields = (query.fields || []).map(field => ({
            ...field,
            table: resolveTableName(db, field.table)
        }));

        picker.innerHTML = Object.keys(db.tables).map(table => `<option value="${escapeHtml(table)}">${escapeHtml(table)}</option>`).join('');

        function renderNodes() {
            canvas.querySelectorAll('.query-node').forEach(node => node.remove());
            const availableTables = Array.from(tables).filter(tableName => db.tables[tableName]);

            if (!availableTables.length) {
                canvas.insertAdjacentHTML('beforeend', '<div class="p-6 text-neutral-600">This query does not reference any available tables.</div>');
                drawWires();
                return;
            }

            availableTables.forEach((tableName, index) => {
                const table = db.tables[tableName];
                const node = document.createElement('section');
                node.className = 'query-node table-node';
                node.dataset.node = tableName;
                node.style.left = `${34 + ((index % 3) * 280)}px`;
                node.style.top = `${26 + (Math.floor(index / 3) * 210)}px`;
                node.innerHTML = `
                    <header><span>${escapeHtml(tableName)}</span><small>Table</small></header>
                    ${table.structure.columns.map(column => `
                        <div class="query-field-row" data-ref="${escapeHtml(tableName)}.${escapeHtml(column.name)}" data-table="${escapeHtml(tableName)}" data-field="${escapeHtml(column.name)}" data-type="${escapeHtml(column.type)}">
                            <button class="query-handle query-handle-left" data-side="left" title="Connect from left"></button>
                            <label class="query-field-check">
                                <input type="checkbox" data-query-field-check ${selectedFields.some(field => field.table === tableName && field.field === column.name) ? 'checked' : ''}>
                                <span>${escapeHtml(column.name)}</span>
                            </label>
                            <small>${escapeHtml(column.type)}</small>
                            <button class="query-handle query-handle-right" data-side="right" title="Connect from right"></button>
                        </div>
                    `).join('')}
                `;
                canvas.appendChild(node);
                makeDraggable(node);
            });
            drawWires();
        }

        function renderDesignGrid() {
            const fields = selectedFields.length ? selectedFields : [{ field: '', table: '', sort: '', show: true, criteria: '' }];
            gridHost.innerHTML = `
                <table class="query-grid bg-white">
                    <tbody>
                        <tr><th>Field:</th>${fields.map(field => `<td>${escapeHtml(field.field)}</td>`).join('')}</tr>
                        <tr><th>Table:</th>${fields.map(field => `<td>${escapeHtml(field.table)}</td>`).join('')}</tr>
                        <tr><th>Sort:</th>${fields.map(field => `<td>${escapeHtml(field.sort || '')}</td>`).join('')}</tr>
                        <tr><th>Show:</th>${fields.map(field => `<td><input type="checkbox" ${field.show !== false ? 'checked' : ''}></td>`).join('')}</tr>
                        <tr><th>Criteria:</th>${fields.map(field => `<td>${escapeHtml(field.criteria || '')}</td>`).join('')}</tr>
                        <tr><th>or:</th>${fields.map(() => '<td></td>').join('')}</tr>
                    </tbody>
                </table>
            `;
        }

        function handleCenter(ref, side) {
            const row = canvas.querySelector(`[data-ref="${CSS.escape(ref)}"]`);
            const handle = row?.querySelector(`[data-side="${side}"]`);
            if (!handle) return null;
            const canvasBox = canvas.getBoundingClientRect();
            const portBox = handle.getBoundingClientRect();
            return {
                x: portBox.left - canvasBox.left + canvas.scrollLeft + (portBox.width / 2),
                y: portBox.top - canvasBox.top + canvas.scrollTop + (portBox.height / 2)
            };
        }

        function canvasPointFromEvent(event) {
            const canvasBox = canvas.getBoundingClientRect();
            return {
                x: event.clientX - canvasBox.left + canvas.scrollLeft,
                y: event.clientY - canvasBox.top + canvas.scrollTop
            };
        }

        function buildWirePath(start, end, startSide = 'right', endSide = 'left') {
            const direction = startSide === 'right' ? 1 : -1;
            const endDirection = endSide === 'left' ? -1 : 1;
            const control = Math.max(70, Math.abs(end.x - start.x) * .45);
            return `M ${start.x} ${start.y} C ${start.x + (control * direction)} ${start.y}, ${end.x + (control * endDirection)} ${end.y}, ${end.x} ${end.y}`;
        }

        function drawWires() {
            wires.innerHTML = '';
            const width = Math.max(canvas.scrollWidth, canvas.clientWidth, 1120);
            const height = Math.max(canvas.scrollHeight, canvas.clientHeight, 430);
            wires.setAttribute('viewBox', `0 0 ${width} ${height}`);
            wires.style.width = `${width}px`;
            wires.style.height = `${height}px`;

            connections.forEach((connection, index) => {
                const start = handleCenter(connection.from, connection.fromSide || 'right');
                const end = handleCenter(connection.to, connection.toSide || 'left');
                if (!start || !end) return;

                const path = buildWirePath(start, end, connection.fromSide || 'right', connection.toSide || 'left');
                const shadow = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                const wire = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                shadow.setAttribute('d', path);
                shadow.setAttribute('class', 'query-wire shadow');
                wire.setAttribute('d', path);
                wire.setAttribute('class', `query-wire ${selectedConnection === index ? 'selected' : ''}`);
                wire.dataset.connectionIndex = String(index);
                wires.append(shadow, wire);
            });

            if (dragConnection?.cursor) {
                const sourceRow = dragConnection.handle.closest('.query-field-row');
                const start = handleCenter(sourceRow.dataset.ref, dragConnection.side);
                const end = dragConnection.cursor;
                if (start && end) {
                    const preview = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                    preview.setAttribute('d', buildWirePath(start, end, dragConnection.side, dragConnection.side === 'right' ? 'left' : 'right'));
                    preview.setAttribute('class', 'query-wire preview');
                    wires.append(preview);
                }
            }
        }

        function makeDraggable(node) {
            const handle = node.querySelector('header');
            let drag = null;

            handle.addEventListener('pointerdown', event => {
                drag = {
                    pointerId: event.pointerId,
                    startX: event.clientX,
                    startY: event.clientY,
                    nodeX: node.offsetLeft,
                    nodeY: node.offsetTop
                };
                node.classList.add('dragging');
                handle.setPointerCapture(event.pointerId);
            });

            handle.addEventListener('pointermove', event => {
                if (!drag) return;
                node.style.left = `${Math.max(8, drag.nodeX + event.clientX - drag.startX)}px`;
                node.style.top = `${Math.max(8, drag.nodeY + event.clientY - drag.startY)}px`;
                drawWires();
            });

            handle.addEventListener('pointerup', event => {
                if (!drag) return;
                handle.releasePointerCapture(event.pointerId);
                node.classList.remove('dragging');
                drag = null;
                drawWires();
            });
        }

        function updateSelectedField(row, checked) {
            const table = row.dataset.table;
            const field = row.dataset.field;
            selectedFields = selectedFields.filter(item => !(item.table === table && item.field === field));

            if (checked) {
                const existing = query.fields.find(item => item.table === table && item.field === field);
                selectedFields.push(existing ? { ...existing, show: true } : {
                    table,
                    field,
                    sort: '',
                    show: true,
                    criteria: ''
                });
            }

            renderDesignGrid();
        }

        function finishConnection(targetHandle) {
            if (!dragConnection) {
                return;
            }

            const targetRow = targetHandle?.closest('.query-field-row');
            const sourceRow = dragConnection.handle.closest('.query-field-row');
            const sourceSide = dragConnection.side;
            const targetSide = targetHandle?.dataset.side;

            if (targetRow && sourceRow && sourceRow.dataset.table !== targetRow.dataset.table && sourceSide !== targetSide) {
                const fromIsRight = sourceSide === 'right';
                connections.push({
                    from: fromIsRight ? sourceRow.dataset.ref : targetRow.dataset.ref,
                    fromSide: fromIsRight ? sourceSide : targetSide,
                    to: fromIsRight ? targetRow.dataset.ref : sourceRow.dataset.ref,
                    toSide: fromIsRight ? targetSide : sourceSide
                });
            }

            dragConnection.handle.classList.remove('dragging');
            dragConnection = null;
            drawWires();
        }

        canvas.addEventListener('click', event => {
            const wire = event.target.closest('.query-wire:not(.shadow)');
            if (wire) {
                selectedConnection = Number(wire.dataset.connectionIndex);
                drawWires();
                return;
            }

            const checkbox = event.target.closest('[data-query-field-check]');
            if (checkbox) {
                updateSelectedField(checkbox.closest('.query-field-row'), checkbox.checked);
                return;
            }
        });

        canvas.addEventListener('pointerdown', event => {
            const handle = event.target.closest('.query-handle');
            if (!handle) return;
            selectedConnection = null;
            dragConnection = {
                handle,
                side: handle.dataset.side,
                cursor: canvasPointFromEvent(event)
            };
            handle.classList.add('dragging');
            handle.setPointerCapture(event.pointerId);
            drawWires();
            event.preventDefault();
        });

        canvas.addEventListener('pointermove', event => {
            if (!dragConnection) return;
            dragConnection.cursor = canvasPointFromEvent(event);
            drawWires();
        });

        canvas.addEventListener('pointerup', event => {
            if (!dragConnection) return;
            const dropTarget = document.elementFromPoint(event.clientX, event.clientY);
            const targetHandle = dropTarget?.closest('.query-handle');
            finishConnection(targetHandle);
        });

        canvas.addEventListener('pointercancel', () => {
            if (!dragConnection) return;
            dragConnection.handle.classList.remove('dragging');
            dragConnection = null;
            drawWires();
        });

        canvas.addEventListener('keydown', event => {
            if ((event.key === 'Delete' || event.key === 'Backspace') && selectedConnection !== null) {
                connections.splice(selectedConnection, 1);
                selectedConnection = null;
                drawWires();
            }
        });

        builder.querySelector('[data-clear-connections]').addEventListener('click', () => {
            connections = [];
            selectedConnection = null;
            dragConnection = null;
            drawWires();
        });

        builder.querySelector('[data-add-selected-table]').addEventListener('click', () => {
            tables.add(picker.value);
            renderNodes();
        });

        renderNodes();
        renderDesignGrid();
    });
}

