// The workspace key and server connection belong to this browser, not the PHP session.
const browserUserKey = 'acaciadb.browser-user.v1';
const connectionStorageKey = 'acaciadb.mysql-connection.v1';
const activeDatabaseStorageKey = 'acaciadb.active-database.v1';
const recentDatabaseStorageKey = 'acaciadb.recent-databases.v1';
let browserUserId = localStorage.getItem(browserUserKey);
if (!/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(browserUserId || '')) {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 15) | 64; bytes[8] = (bytes[8] & 63) | 128;
    const hex = [...bytes].map(value => value.toString(16).padStart(2, '0')).join('');
    browserUserId = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    localStorage.setItem(browserUserKey, browserUserId);
    localStorage.removeItem(activeDatabaseStorageKey);
    localStorage.removeItem(recentDatabaseStorageKey);
    localStorage.removeItem('acaciadb.workspace.v1');
}
let activeDatabaseReference = localStorage.getItem(activeDatabaseStorageKey) || 'sqlite:demo';
function savedMysqlConnection() {
    try { return JSON.parse(localStorage.getItem(connectionStorageKey) || 'null'); } catch { return null; }
}
function mysqlConnectionIdentity() {
    const settings = savedMysqlConnection();
    return settings ? `${settings.host}:${settings.port}:${settings.username}` : '';
}
function setActiveDatabaseReference(reference) {
    activeDatabaseReference = reference;
    localStorage.setItem(activeDatabaseStorageKey, reference);
}
const originalAppFetch = window.fetch.bind(window);
window.fetch = (input, options = {}) => {
    const url = new URL(typeof input === 'string' ? input : input.url, location.href);
    if (url.origin === location.origin && /\/api\/[^/]+\.php$/.test(url.pathname)) {
        const headers = new Headers(options.headers || (input instanceof Request ? input.headers : undefined));
        headers.set('X-Acacia-User', browserUserId);
        headers.set('X-Acacia-Database', activeDatabaseReference);
        const connection = savedMysqlConnection();
        if (connection) headers.set('X-Acacia-Connection', btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(connection)))));
        options = { ...options, headers };
    }
    return originalAppFetch(input, options);
};
function recentDatabases() {
    let recent;
    try { recent = JSON.parse(localStorage.getItem(recentDatabaseStorageKey) || '[]'); } catch { recent = []; }
    return Array.isArray(recent) ? recent : [];
}
function rememberDatabase(database) {
    const item = { id: database.id, name: database.name, engine: database.engine,
        connection: database.engine === 'mysql' ? mysqlConnectionIdentity() : '', openedAt: new Date().toISOString() };
    localStorage.setItem(recentDatabaseStorageKey, JSON.stringify([item, ...recentDatabases().filter(old => old.id !== item.id || old.connection !== item.connection)].slice(0, 10)));
}
