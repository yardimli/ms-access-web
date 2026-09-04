const acaciadbInputMaskPresets = [
    { name: 'Phone Number', mask: '(999) 000-0000', example: '(206) 555-1212' },
    { name: 'Social Security Number', mask: '000-00-0000', example: '831-86-7180' },
    { name: 'Zip Code', mask: '00000-9999', example: '98052-6399' },
    { name: 'Extension', mask: '99999', example: '63215' },
    { name: 'Password', mask: 'Password', example: '********' },
    { name: 'Long Time', mask: '00:00:00', example: '1:12:00 PM' }
];

function formatInputMaskPreview(value, mask, placeholder = '_') {
    if (!mask) return String(value || '');
    if (mask === 'Password') return '*'.repeat(String(value || '').length);
    const source = [...String(value || '').replace(/[^A-Za-z0-9]/g, '')];
    let sourceIndex = 0;
    let caseMode = '';
    let escaped = false;
    const output = [];
    const matchesToken = (token, character) => {
        if (['0', '9', '#'].includes(token)) return /[0-9]/.test(character);
        if (['L', '?'].includes(token)) return /[A-Za-z]/.test(character);
        if (['A', 'a'].includes(token)) return /[A-Za-z0-9]/.test(character);
        return true;
    };

    for (const token of mask) {
        if (escaped) {
            output.push(token);
            escaped = false;
            continue;
        }
        if (token === '\\') {
            escaped = true;
            continue;
        }
        if (token === '>') {
            caseMode = 'upper';
            continue;
        }
        if (token === '<') {
            caseMode = 'lower';
            continue;
        }
        if (token === '!') continue;
        if (!['0', '9', '#', 'L', '?', 'A', 'a', '&', 'C'].includes(token)) {
            output.push(token);
            continue;
        }
        let character = '';
        while (sourceIndex < source.length && !matchesToken(token, source[sourceIndex])) sourceIndex += 1;
        if (sourceIndex < source.length) character = source[sourceIndex++];
        if (caseMode === 'upper') character = character.toUpperCase();
        if (caseMode === 'lower') character = character.toLowerCase();
        output.push(character || placeholder);
    }
    return output.join('');
}

function showInputMaskHelpDialog() {
    const rows = [
        ['0', 'Numbers 0 to 9 required; plus and minus signs not allowed.', '&', 'Character or space required.'],
        ['9', 'Numbers 0 to 9 optional.', 'C', 'Character or space optional.'],
        ['#', 'Number, space, plus or minus sign optional.', '<', 'Converts the following characters to lowercase.'],
        ['. , : ; - /', 'Decimal point, thousands, date, and time separators.', '>', 'Converts the following characters to uppercase.'],
        ['A', 'Letter or number required.', '!', 'Displays characters from right to left, rather than left to right.'],
        ['a', 'Letter or number optional.', '\\', 'Displays the following input mask character. For example, \\* would display *.'],
        ['L', 'Letters A to Z required.', 'Password', 'Displays an asterisk (*) for each character you type.'],
        ['?', 'Letter or number optional.', '', '']
    ];
    const dialog = document.createElement('dialog');
    dialog.className = 'acaciadb-dialog input-mask-help-dialog';
    dialog.innerHTML = `<form method="dialog"><div class="acaciadb-dialog-title"><span><i class="fas fa-question-circle"></i> Input Mask Characters</span><button type="button" data-mask-help-close aria-label="Close"><i class="fas fa-times"></i></button></div>
        <div class="input-mask-help-body"><p>Use these characters to control which values can be entered and how they are displayed.</p>
        <div class="input-mask-help-table-wrap"><table><thead><tr><th>Character</th><th>Description</th><th>Character</th><th>Description</th></tr></thead><tbody>
        ${rows.map(row => `<tr>${row.map((cell, index) => `<td class="${index % 2 === 0 ? 'mask-character' : ''}">${escapeHtml(cell)}</td>`).join('')}</tr>`).join('')}
        </tbody></table></div></div><div class="dialog-actions"><button class="primary" type="submit">OK</button></div></form>`;
    document.body.appendChild(dialog);
    dialog.querySelector('[data-mask-help-close]').addEventListener('click', () => dialog.close());
    dialog.addEventListener('close', () => dialog.remove(), { once: true });
    showMovableModal(dialog);
}

window.AcaciaDBInputMaskWizard = {
    open(options = {}) {
        return new Promise(resolve => {
            const existingMask = String(options.mask || '');
            const matchedPreset = acaciadbInputMaskPresets.find(preset => preset.mask === existingMask);
            const state = {
                step: 0,
                name: options.name || matchedPreset?.name || (existingMask ? 'Custom' : acaciadbInputMaskPresets[0].name),
                mask: existingMask || matchedPreset?.mask || acaciadbInputMaskPresets[0].mask,
                placeholder: options.placeholder ?? '_',
                storeSymbols: options.storeSymbols !== false,
                tryValue: ''
            };
            let result = null;
            const dialog = document.createElement('dialog');
            dialog.className = 'acaciadb-dialog input-mask-wizard-dialog';
            document.body.appendChild(dialog);

            const selectedPreset = () => acaciadbInputMaskPresets.find(preset => preset.name === state.name);
            const preview = () => formatInputMaskPreview(state.tryValue, state.mask, state.placeholder);
            const finish = value => {
                result = value;
                dialog.close(value ? 'finish' : 'cancel');
            };

            function tryBox() {
                return `<label class="input-mask-try"><span>Try It:</span><input data-mask-try value="${escapeHtml(state.tryValue)}" autocomplete="off"><output data-mask-preview>${escapeHtml(preview())}</output></label>`;
            }

            function stepBody() {
                if (state.step === 0) {
                    return `<div class="input-mask-copy"><p>Which input mask matches how you want data to look?</p><p>To see how a selected mask works, use the Try It box.<br>To change the Input Mask list, click the Edit List button.</p></div>
                        <div class="input-mask-list-head"><span>Input Mask:</span><span>Data Look:</span></div>
                        <div class="input-mask-list" role="listbox">${acaciadbInputMaskPresets.map(preset => `<button type="button" role="option" aria-selected="${preset.name === state.name}" class="${preset.name === state.name ? 'selected' : ''}" data-mask-preset="${escapeHtml(preset.name)}"><span>${escapeHtml(preset.name)}</span><span>${escapeHtml(preset.example)}</span></button>`).join('')}</div>
                        ${tryBox()}`;
                }
                if (state.step === 1) {
                    return `<div class="input-mask-copy"><p>Do you want to change the input mask?</p></div>
                        <div class="input-mask-form">
                            <label><span>Input Mask Name:</span><input data-mask-name value="${escapeHtml(state.name)}"></label>
                            <label><span>Input Mask:</span><input data-mask-pattern value="${escapeHtml(state.mask)}" spellcheck="false"></label>
                            <p>What placeholder character do you want the field to display?</p>
                            <p>Placeholders are replaced as you enter data into the field.</p>
                            <label><span>Placeholder character:</span><select data-mask-placeholder>${['_', '#', '•', ' '].map(item => `<option value="${escapeHtml(item)}" ${item === state.placeholder ? 'selected' : ''}>${item === ' ' ? '(space)' : escapeHtml(item)}</option>`).join('')}</select></label>
                        </div>${tryBox()}`;
                }
                if (state.step === 2) {
                    const withSymbols = formatInputMaskPreview('4287262103', state.mask, '').replace(/_/g, '');
                    const withoutSymbols = '4287262103';
                    return `<div class="input-mask-copy"><p>How do you want to store the data?</p></div>
                        <div class="input-mask-storage">
                            <label><input type="radio" name="maskStorage" value="with" ${state.storeSymbols ? 'checked' : ''}><span>With the symbols in the mask, like this:<strong>${escapeHtml(withSymbols)}</strong></span></label>
                            <label><input type="radio" name="maskStorage" value="without" ${!state.storeSymbols ? 'checked' : ''}><span>Without the symbols in the mask, like this:<strong>${escapeHtml(withoutSymbols)}</strong></span></label>
                        </div>`;
                }
                return `<div class="input-mask-finish"><div class="input-mask-finish-art"><i class="fas fa-flag-checkered"></i></div><div><p>That's all the information the wizard needs to create your input mask.</p><dl><dt>Name</dt><dd>${escapeHtml(state.name)}</dd><dt>Mask</dt><dd>${escapeHtml(state.mask)}</dd><dt>Store symbols</dt><dd>${state.storeSymbols ? 'Yes' : 'No'}</dd></dl></div></div>`;
            }

            function render() {
                dialog.innerHTML = `<form method="dialog"><div class="acaciadb-dialog-title"><span>Input Mask Wizard</span><button type="button" data-mask-cancel aria-label="Close"><i class="fas fa-times"></i></button></div>
                    <div class="input-mask-wizard-body">${stepBody()}</div>
                    <div class="input-mask-wizard-footer">
                        <div class="input-mask-footer-tools"><button type="button" data-mask-help><i class="fas fa-question-circle"></i> Help</button>${state.step === 0 ? '<button type="button" data-mask-edit-list>Edit List</button>' : ''}</div>
                        <div><button type="button" data-mask-cancel>Cancel</button><button type="button" data-mask-back ${state.step === 0 ? 'disabled' : ''}>&lt; Back</button><button type="button" data-mask-next ${state.step === 3 ? 'disabled' : ''}>Next &gt;</button><button class="primary" type="button" data-mask-finish>Finish</button></div>
                    </div></form>`;

                dialog.querySelectorAll('[data-mask-cancel]').forEach(button => button.addEventListener('click', () => finish(null), { once: true }));
                dialog.querySelector('[data-mask-help]')?.addEventListener('click', showInputMaskHelpDialog);
                dialog.querySelector('[data-mask-back]')?.addEventListener('click', () => { state.step = Math.max(0, state.step - 1); render(); });
                dialog.querySelector('[data-mask-next]')?.addEventListener('click', () => { state.step = Math.min(3, state.step + 1); render(); });
                dialog.querySelector('[data-mask-edit-list]')?.addEventListener('click', () => { state.step = 1; render(); });
                dialog.querySelector('[data-mask-finish]')?.addEventListener('click', () => finish({
                    name: state.name || 'Custom', mask: state.mask, placeholder: state.placeholder, storeSymbols: state.storeSymbols
                }));
                dialog.querySelectorAll('[data-mask-preset]').forEach(button => button.addEventListener('click', () => {
                    const preset = acaciadbInputMaskPresets.find(item => item.name === button.dataset.maskPreset);
                    if (!preset) return;
                    state.name = preset.name;
                    state.mask = preset.mask;
                    render();
                }));
                dialog.querySelector('[data-mask-name]')?.addEventListener('input', event => { state.name = event.target.value; });
                dialog.querySelector('[data-mask-pattern]')?.addEventListener('input', event => {
                    state.mask = event.target.value;
                    const output = dialog.querySelector('[data-mask-preview]');
                    if (output) output.textContent = preview();
                });
                dialog.querySelector('[data-mask-placeholder]')?.addEventListener('change', event => { state.placeholder = event.target.value; render(); });
                dialog.querySelectorAll('input[name="maskStorage"]').forEach(input => input.addEventListener('change', () => { state.storeSymbols = input.value === 'with'; }));
                dialog.querySelector('[data-mask-try]')?.addEventListener('input', event => {
                    state.tryValue = event.target.value;
                    const output = dialog.querySelector('[data-mask-preview]');
                    if (output) output.textContent = preview();
                });
            }

            dialog.addEventListener('cancel', event => { event.preventDefault(); finish(null); });
            dialog.addEventListener('close', () => { dialog.remove(); resolve(result); }, { once: true });
            render();
            showMovableModal(dialog);
        });
    }
};
