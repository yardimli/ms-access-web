(function () {
    const builtInFunctions = window.AccessExpressionFunctions;
    const functionGroups = builtInFunctions.groups;

    const operatorGroups = {
        Arithmetic: ['-', '*', '/', '\\', '^', '+', 'Mod'],
        Comparison: ['<', '<=', '<>', '=', '>', '>=', 'Between', 'In', 'Like'],
        Logical: ['And', 'Eqv', 'Imp', 'Not', 'Or', 'Xor'],
        String: ['&']
    };

    const constants = ['"" - EmptyString', 'False', 'Null', 'True'];
    const descriptions = {
        Between: 'Compares a value against a lower and upper boundary.',
        Like: 'Compares a string value to a pattern.',
        '"" - EmptyString': 'Inserts an empty text string.'
    };

    function escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function insertAtCursor(textarea, text, selectInsideParentheses = false) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const value = textarea.value;
        textarea.value = `${value.slice(0, start)}${text}${value.slice(end)}`;
        let cursor = start + text.length;
        if (selectInsideParentheses) {
            cursor -= 1;
        }
        textarea.focus();
        textarea.setSelectionRange(cursor, cursor);
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
    }

    function renderButtons(container, items, activeValue, dataName) {
        container.innerHTML = items.map(item => {
            const label = typeof item === 'string' ? item : item.label;
            const value = typeof item === 'string' ? item : item.value;
            const icon = typeof item === 'string' ? '' : item.icon;
            const active = value === activeValue ? ' active' : '';
            return `<button type="button" class="expression-choice${active}" data-${dataName}="${escapeHtml(value)}">${icon}${escapeHtml(label)}</button>`;
        }).join('');
    }

    function validateExpression(expression, columns) {
        const source = expression.trim();
        if (!source) {
            return 'Enter an expression before clicking OK.';
        }

        let inString = false;
        const parens = [];
        for (let index = 0; index < source.length; index += 1) {
            const char = source[index];
            if (char === '"') {
                if (source[index + 1] === '"') {
                    index += 1;
                } else {
                    inString = !inString;
                }
                continue;
            }
            if (inString) {
                continue;
            }
            if (char === '(') {
                parens.push(char);
            } else if (char === ')') {
                if (!parens.pop()) {
                    return 'The expression contains a closing parenthesis without a matching opening parenthesis.';
                }
            }
        }
        if (inString) {
            return 'The expression contains an unterminated text string.';
        }
        if (parens.length) {
            return 'The expression contains an opening parenthesis without a matching closing parenthesis.';
        }

        const columnNames = new Set(columns.map(column => column.name.toLowerCase()));
        const bracketMatches = [...source.matchAll(/\[([^\]]+)\]/g)];
        for (const match of bracketMatches) {
            const name = match[1].trim().toLowerCase();
            if (!name || !columnNames.has(name)) {
                return `Unknown field reference [${match[1]}].`;
            }
        }
        const strippedBrackets = source.replace(/\[[^\]]+\]/g, ' ');
        if (/\[|\]/.test(strippedBrackets)) {
            return 'The expression contains an unmatched field bracket.';
        }

        const allowedWords = new Set([
            ...Object.values(functionGroups).flat(),
            ...Object.values(operatorGroups).flat(),
            'False', 'Null', 'True', 'EmptyString'
        ].map(word => word.toLowerCase()));

        const noStrings = strippedBrackets.replace(/"(?:""|[^"])*"/g, ' ');
        const identifiers = noStrings.match(/[A-Za-z_][A-Za-z0-9_$]*/g) || [];
        for (const identifier of identifiers) {
            const key = identifier.toLowerCase();
            if (!allowedWords.has(key) && !columnNames.has(key)) {
                return `Unknown name "${identifier}". Use a field in brackets or a listed function, constant, or operator.`;
            }
        }

        if (/[{};]/.test(noStrings)) {
            return 'The expression contains characters that are not valid in this builder.';
        }

        return '';
    }

    function sampleValueForColumn(column) {
        const type = String(column.mysqlType || column.type || '').toLowerCase();
        if (type.includes('tinyint') || column.type === 'Yes/No') {
            return true;
        }
        if (type.includes('int') || type.includes('decimal') || column.type === 'Currency' || column.type === 'Number' || column.type === 'AutoNumber') {
            return 10;
        }
        if (type.includes('date') || type.includes('time') || column.type === 'Date/Time') {
            return '2026-06-30';
        }
        return `${column.name || 'value'} value`;
    }

    function sampleFields(columns) {
        return Object.fromEntries(columns.map(column => [column.name, sampleValueForColumn(column)]));
    }

    function assertSafeJavascript(source) {
        if (/\b(fetch|XMLHttpRequest|eval|Function|document|window|globalThis|localStorage|sessionStorage|import|require|accessFns)\b/.test(source)) {
            throw new Error('Generated JavaScript uses a blocked API.');
        }
    }

    function compileJavascriptFunction(source) {
        const trimmed = String(source || '').trim();
        if (!trimmed) {
            throw new Error('JavaScript function is empty.');
        }

        assertSafeJavascript(trimmed);

        try {
            const expressionFunction = Function('"use strict"; return (' + trimmed + ');')();
            if (typeof expressionFunction === 'function') {
                return expressionFunction;
            }
        } catch (error) {
            // Try declaration style below.
        }

        const declaredFunction = Function('"use strict"; let validate, expression, rule; ' + trimmed + '; return validate || expression || rule;')();
        if (typeof declaredFunction !== 'function') {
            throw new Error('JavaScript must evaluate to a function.');
        }
        return declaredFunction;
    }

    function runJavascriptFunctionPreview(source, columns) {
        const fn = compileJavascriptFunction(source);
        const result = fn(sampleFields(columns));
        return { js: source.trim(), result };
    }

    async function requestJavascriptFromLlm({ expression, columns, tableName, fieldName, signal }) {
        const response = await fetch('api/expression.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ expression, columns, tableName, fieldName }),
            signal
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload.ok) {
            throw new Error(payload.error || 'Expression conversion failed.');
        }
        return payload;
    }

    function openExpressionBuilder(options = {}) {
        const template = document.getElementById('template-expression-builder');
        if (!template) {
            return Promise.reject(new Error('Expression Builder template is missing.'));
        }

        const columns = Array.isArray(options.columns) ? options.columns : [];
        const dialog = template.content.firstElementChild.cloneNode(true);
        const form = dialog.querySelector('[data-expression-builder-form]');
        const textarea = dialog.querySelector('[data-expression-input]');
        const elements = dialog.querySelector('[data-expression-elements]');
        const categories = dialog.querySelector('[data-expression-categories]');
        const values = dialog.querySelector('[data-expression-values]');
        const description = dialog.querySelector('[data-expression-description]');
        const error = dialog.querySelector('[data-expression-error]');
        const browser = dialog.querySelector('[data-expression-browser]');
        const lessButton = dialog.querySelector('[data-expression-less]');
        const preview = dialog.querySelector('[data-expression-preview]');
        const previewJs = dialog.querySelector('[data-expression-js]');
        const previewResult = dialog.querySelector('[data-expression-result]');
        const jsEditor = dialog.querySelector('[data-expression-js-editor]');
        const jsInput = dialog.querySelector('[data-expression-js-input]');
        const tableName = options.tableName || 'Table';

        let elementMode = 'table';
        let selectedCategory = columns[0]?.name || '';
        let selectedValue = '<Value>';
        let generatedJavascript = options.javascript || '';
        let lastConvertedExpression = generatedJavascript ? (options.expression || (options.fieldName ? `[${options.fieldName}]` : '')).trim() : '';
        let debounceTimer = null;
        let pendingController = null;

        textarea.value = options.expression || (options.fieldName ? `[${options.fieldName}]` : '');
        jsInput.value = generatedJavascript;

        function setError(message) {
            error.textContent = message;
            error.hidden = !message;
        }

        function setDescription(value) {
            const functionDescription = builtInFunctions.canonicalName(value)
                ? builtInFunctions.describe(value)
                : '';
            description.innerHTML = value
                ? `<a href="#">${escapeHtml(functionNameSet().has(value) ? builtInFunctions.signature(value) : value)}</a><br>${escapeHtml(functionDescription || descriptions[value] || `Inserts ${value} into the expression.`)}`
                : '';
        }

        function formatPreviewResult(value) {
            if (value instanceof Date) {
                return Number.isNaN(value.getTime()) ? 'Invalid Date' : value.toISOString();
            }
            if (value === undefined) {
                return 'undefined';
            }
            if (typeof value === 'string') {
                return `"${value}"`;
            }
            return JSON.stringify(value);
        }

        function updatePreview() {
            try {
                if (!generatedJavascript) {
                    preview.classList.remove('is-error');
                    previewJs.textContent = '';
                    previewResult.textContent = textarea.value.trim()
                        ? 'Waiting for LLM JavaScript conversion...'
                        : 'Enter an expression to convert.';
                    return;
                }
                const result = runJavascriptFunctionPreview(generatedJavascript, columns);
                preview.classList.remove('is-error');
                previewJs.textContent = result.js;
                previewResult.textContent = formatPreviewResult(result.result);
            } catch (errorMessage) {
                preview.classList.add('is-error');
                previewJs.textContent = '';
                previewResult.textContent = errorMessage.message || String(errorMessage);
            }
        }

        function setGeneratedJavascript(value, sourceExpression = textarea.value.trim()) {
            generatedJavascript = String(value || '').trim();
            lastConvertedExpression = generatedJavascript ? sourceExpression : '';
            if (jsInput.value !== generatedJavascript) {
                jsInput.value = generatedJavascript;
            }
            updatePreview();
        }

        function queueLlmConversion() {
            window.clearTimeout(debounceTimer);
            if (pendingController) {
                pendingController.abort();
                pendingController = null;
            }

            const expression = textarea.value.trim();
            if (!expression) {
                setGeneratedJavascript('');
                return;
            }
            if (generatedJavascript && expression === lastConvertedExpression) {
                updatePreview();
                return;
            }

            preview.classList.remove('is-error');
            previewResult.textContent = 'Converting with LLM...';
            debounceTimer = window.setTimeout(async () => {
                pendingController = new AbortController();
                try {
                    const payload = await requestJavascriptFromLlm({
                        expression,
                        columns,
                        tableName,
                        fieldName: options.fieldName || '',
                        signal: pendingController.signal
                    });
                    compileJavascriptFunction(payload.javascript);
                    setGeneratedJavascript(payload.javascript, expression);
                } catch (errorMessage) {
                    if (errorMessage.name === 'AbortError') {
                        return;
                    }
                    generatedJavascript = '';
                    lastConvertedExpression = '';
                    jsInput.value = '';
                    preview.classList.add('is-error');
                    previewJs.textContent = '';
                    previewResult.textContent = errorMessage.message || String(errorMessage);
                } finally {
                    pendingController = null;
                }
            }, 850);
        }

        function functionNameSet() {
            return new Set(builtInFunctions.names);
        }

        function renderElements() {
            const items = [
                { value: 'table', label: tableName, icon: '<i class="fas fa-table"></i>' },
                { value: 'functions', label: 'Functions', icon: '<i class="fas fa-superscript"></i>' },
                { value: 'builtins', label: 'Built-In Functions', icon: '<i class="fas fa-superscript"></i>' },
                { value: 'constants', label: 'Constants', icon: '<i class="fas fa-plus-square"></i>' },
                { value: 'operators', label: 'Operators', icon: '<i class="fas fa-plus-square"></i>' }
            ];
            renderButtons(elements, items, elementMode, 'expression-element');
        }

        function renderBrowser() {
            renderElements();
            if (elementMode === 'table') {
                const fields = columns.map(column => column.name);
                selectedCategory = fields.includes(selectedCategory) ? selectedCategory : fields[0] || '';
                selectedValue = '<Value>';
                renderButtons(categories, fields, selectedCategory, 'expression-category');
                renderButtons(values, ['<Value>'], selectedValue, 'expression-value');
                setDescription(selectedCategory ? `[${selectedCategory}]` : '');
                return;
            }
            if (elementMode === 'constants') {
                selectedCategory = '<All>';
                selectedValue = constants.includes(selectedValue) ? selectedValue : constants[0];
                renderButtons(categories, ['<All>'], selectedCategory, 'expression-category');
                renderButtons(values, constants, selectedValue, 'expression-value');
                setDescription(selectedValue);
                return;
            }
            if (elementMode === 'operators') {
                const groups = ['<All>', ...Object.keys(operatorGroups)];
                selectedCategory = groups.includes(selectedCategory) ? selectedCategory : '<All>';
                const groupValues = selectedCategory === '<All>' ? Object.values(operatorGroups).flat() : operatorGroups[selectedCategory];
                selectedValue = groupValues.includes(selectedValue) ? selectedValue : groupValues[0];
                renderButtons(categories, groups, selectedCategory, 'expression-category');
                renderButtons(values, groupValues, selectedValue, 'expression-value');
                setDescription(selectedValue);
                return;
            }

            const groups = ['<All>', ...Object.keys(functionGroups)];
            selectedCategory = groups.includes(selectedCategory) ? selectedCategory : '<All>';
            const groupValues = selectedCategory === '<All>' ? Object.values(functionGroups).flat() : functionGroups[selectedCategory];
            selectedValue = groupValues.includes(selectedValue) ? selectedValue : groupValues[0];
            renderButtons(categories, groups, selectedCategory, 'expression-category');
            renderButtons(values, groupValues, selectedValue, 'expression-value');
            setDescription(selectedValue);
        }

        function insertChoice(value) {
            if (!value) {
                return;
            }
            if (elementMode === 'table') {
                insertAtCursor(textarea, `[${selectedCategory}]`);
                return;
            }
            if (elementMode === 'constants') {
                insertAtCursor(textarea, value === '"" - EmptyString' ? '""' : value);
                return;
            }
            if (elementMode === 'operators') {
                insertAtCursor(textarea, ` ${value} `);
                return;
            }
            insertAtCursor(textarea, builtInFunctions.insertText(value), true);
        }

        dialog.addEventListener('click', event => {
            const elementButton = event.target.closest('[data-expression-element]');
            if (elementButton) {
                elementMode = elementButton.dataset.expressionElement;
                selectedCategory = elementMode === 'table' ? columns[0]?.name || '' : '<All>';
                renderBrowser();
                return;
            }

            const categoryButton = event.target.closest('[data-expression-category]');
            if (categoryButton) {
                selectedCategory = categoryButton.dataset.expressionCategory;
                renderBrowser();
                return;
            }

            const valueButton = event.target.closest('[data-expression-value]');
            if (valueButton) {
                selectedValue = valueButton.dataset.expressionValue;
                values.querySelectorAll('[data-expression-value]').forEach(button => {
                    button.classList.toggle('active', button === valueButton);
                });
                setDescription(selectedValue);
                if (event.detail > 1) {
                    insertChoice(selectedValue);
                }
                return;
            }

            if (event.target.closest('[data-expression-cancel]')) {
                dialog.close('cancel');
                return;
            }

            if (event.target.closest('[data-expression-help], [data-expression-help-button]')) {
                event.preventDefault();
                setDescription('Double-click a value to insert it. Field names are inserted in square brackets.');
                return;
            }

            if (event.target.closest('[data-expression-toggle-js]')) {
                jsEditor.hidden = !jsEditor.hidden;
                if (!jsEditor.hidden) {
                    jsInput.focus();
                }
                return;
            }

            if (event.target.closest('[data-expression-less]')) {
                const collapsed = browser.toggleAttribute('hidden');
                lessButton.textContent = collapsed ? 'More >>' : '<< Less';
            }
        });

        form.addEventListener('submit', event => {
            event.preventDefault();
            if (!textarea.value.trim()) {
                setGeneratedJavascript('');
                dialog.close('ok');
                return;
            }
            const message = validateExpression(textarea.value, columns);
            if (message) {
                setError(message);
                textarea.focus();
                return;
            }
            if (!generatedJavascript && !jsInput.value.trim()) {
                setError('The expression has not been converted to valid JavaScript yet.');
                return;
            }
            try {
                compileJavascriptFunction(generatedJavascript || jsInput.value);
            } catch (errorMessage) {
                setError(errorMessage.message || String(errorMessage));
                jsEditor.hidden = false;
                jsInput.focus();
                return;
            }
            dialog.close('ok');
        });

        textarea.addEventListener('input', () => {
            setError('');
            if (textarea.value.trim() !== lastConvertedExpression) {
                generatedJavascript = '';
                jsInput.value = '';
            }
            updatePreview();
            queueLlmConversion();
        });

        jsInput.addEventListener('input', () => {
            setError('');
            setGeneratedJavascript(jsInput.value, textarea.value.trim());
        });

        document.body.appendChild(dialog);
        renderBrowser();
        updatePreview();
        if (!generatedJavascript) {
            queueLlmConversion();
        }

        return new Promise(resolve => {
            dialog.addEventListener('close', () => {
                window.clearTimeout(debounceTimer);
                pendingController?.abort();
                const value = dialog.returnValue === 'ok'
                    ? {
                        expression: textarea.value.trim(),
                        javascript: (generatedJavascript || jsInput.value).trim()
                    }
                    : null;
                dialog.remove();
                resolve(value);
            }, { once: true });
            dialog.showModal();
            textarea.focus();
            textarea.setSelectionRange(textarea.value.length, textarea.value.length);
        });
    }

    window.ExpressionBuilder = {
        open: openExpressionBuilder,
        validate: validateExpression
    };
}());
