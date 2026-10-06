function databaseChatKey(database) {
    return `acaciadb.chat.v1:${browserUserId}:${database}`;
}
function readDatabaseChat(database) {
    try {
        const messages = JSON.parse(localStorage.getItem(databaseChatKey(database)) || '[]');
        return Array.isArray(messages) ? messages.filter(message => ['user', 'assistant'].includes(message.role) && typeof message.content === 'string') : [];
    } catch { return []; }
}
async function openDatabaseChat() {
    if (activeDatabaseReference.startsWith('mysql:')) {
        await showMessageDialog({ title: 'Database Chat', message: 'Chat currently only works with SQLite databases.', confirmText: 'OK' });
        return;
    }
    if (!currentDatabaseName || currentDatabaseName !== activeDatabaseReference) {
        await showMessageDialog({ title: 'Database Chat', message: 'Open a SQLite database from File first.', confirmText: 'OK' });
        return;
    }
    if (document.querySelector('.database-chat-dialog')) return;
    const database = activeDatabaseReference;
    const messages = readDatabaseChat(database);
    const dialog = document.createElement('dialog');
    dialog.className = 'acaciadb-dialog database-chat-dialog';
    dialog.innerHTML = `<div class="acaciadb-dialog-title"><strong>Tell me what you want to do</strong><button type="button" data-chat-close aria-label="Close">×</button></div>
        <p class="database-chat-help">Ask to create or change tables, forms, queries, or reports. Changes are applied to the open SQLite database. Only database structure and this conversation are sent to the assistant.</p>
        <div class="database-chat-messages" role="log" aria-live="polite"></div><p data-chat-status role="status"></p>
        <form class="database-chat-form"><label for="database-chat-prompt">Your request</label><textarea id="database-chat-prompt" required maxlength="12000" rows="3" placeholder="Create a contacts table and a form for it"></textarea>
        <div class="dialog-actions"><button type="button" data-chat-reset>Reset Chat</button><button type="submit">Send</button></div></form>`;
    document.body.appendChild(dialog);
    const history = dialog.querySelector('.database-chat-messages');
    const prompt = dialog.querySelector('textarea');
    const feedback = dialog.querySelector('[data-chat-status]');
    let busy = false;
    const render = () => {
        history.replaceChildren();
        for (const message of messages) {
            const entry = document.createElement('div'); entry.className = `database-chat-message ${message.role}`;
            const title = document.createElement('strong'); title.textContent = message.role === 'user' ? 'You' : 'Assistant';
            const text = document.createElement('div'); text.textContent = message.content;
            entry.append(title, text); history.appendChild(entry);
        }
        history.scrollTop = history.scrollHeight;
    };
    const persist = () => localStorage.setItem(databaseChatKey(database), JSON.stringify(messages));
    const setBusy = value => {
        busy = value;
        dialog.querySelectorAll('button, textarea').forEach(control => { control.disabled = value; });
    };
    dialog.querySelector('[data-chat-close]').onclick = () => { if (!busy) dialog.close(); };
    dialog.addEventListener('cancel', event => { if (busy) event.preventDefault(); });
    dialog.addEventListener('close', () => dialog.remove(), { once: true });
    dialog.querySelector('[data-chat-reset]').onclick = () => {
        if (busy) return;
        localStorage.removeItem(databaseChatKey(database)); messages.length = 0; feedback.textContent = ''; render();
    };
    dialog.querySelector('form').onsubmit = async event => {
        event.preventDefault();
        const text = prompt.value.trim();
        if (busy || !text) return;
        setBusy(true);
        try {
            if (activeDatabaseReference !== database) throw new Error('The active database changed. Close and reopen chat.');
            if (!await prepareDatabaseSwitch()) { feedback.textContent = 'Resolve unsaved changes before sending your request.'; return; }
            messages.push({ role: 'user', content: text }); persist(); prompt.value = ''; render();
            feedback.textContent = 'Thinking and applying changes…';
            let result;
            try {
                result = await databaseApi('api/chat.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages }) });
            } catch (error) {
                messages.push({ role: 'assistant', content: `Request failed: ${error.message}` }); persist(); render();
                feedback.textContent = 'Request failed. For a connection failure, inspect the database before resending; the server may have completed the request.';
                return;
            }
            messages.push({ role: 'assistant', content: `${result.message}\n\n${result.applied} action(s) applied.` + (result.actions.length ? `\n${JSON.stringify(result.actions, null, 2)}` : '') });
            persist(); render(); feedback.textContent = `${result.applied} action(s) applied.`;
            if (result.applied) {
                try { await refreshDatabaseWorkspace(database); }
                catch (error) { feedback.textContent += ` Changes were saved, but the workspace could not refresh: ${error.message}`; }
            }
        } catch (error) { feedback.textContent = error.message; }
        finally { setBusy(false); prompt.focus(); }
    };
    render(); showMovableModal(dialog); prompt.focus();
}
document.querySelector('[data-database-chat]').addEventListener('click', openDatabaseChat);
