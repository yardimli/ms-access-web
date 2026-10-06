"""Integration tests use disposable browser IDs and never modify MariaDB."""
from pathlib import Path
import base64, hashlib, json, os, socket, sqlite3, subprocess, tempfile, time, urllib.request, urllib.error, uuid

ROOT = Path(__file__).resolve().parents[1]
TEMP = ROOT / 'tests' / '.tmp'
TEMP.mkdir(exist_ok=True)
with socket.socket() as sock:
    sock.bind(('127.0.0.1', 0)); port = sock.getsockname()[1]
log = (TEMP / 'php-test.log').open('w')
process = subprocess.Popen(['php', '-d', 'upload_max_filesize=64M', '-d', 'post_max_size=65M', '-S', f'127.0.0.1:{port}', '-t', str(ROOT)], stdout=log, stderr=log, creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0)
user, other = str(uuid.uuid4()), str(uuid.uuid4())
active = 'sqlite:demo'
checks = 0

def request(endpoint, data=None, identity=None, expected=True, body=None, headers=None, raw=False):
    global checks
    extra = {'X-Acacia-User': identity or user, 'X-Acacia-Database': active}
    if data is not None:
        body = json.dumps(data).encode(); extra['Content-Type'] = 'application/json'
    extra.update(headers or {})
    req = urllib.request.Request(f'http://127.0.0.1:{port}/api/{endpoint}', data=body, headers=extra)
    try:
        with urllib.request.urlopen(req, timeout=90) as response: content = response.read()
    except urllib.error.HTTPError as error:
        content = error.read()
    if raw: return content
    try: result = json.loads(content)
    except Exception: raise AssertionError(content.decode(errors='replace')[:1500])
    assert result.get('ok') is expected, (endpoint, data, result)
    checks += 1
    return result

def upload(path, identity=None):
    boundary = 'acacia-' + uuid.uuid4().hex
    body = f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="{path.name}"\r\nContent-Type: application/octet-stream\r\n\r\n'.encode() + path.read_bytes() + f'\r\n--{boundary}--\r\n'.encode()
    return request('files.php', identity=identity, body=body, headers={'Content-Type': 'multipart/form-data; boundary=' + boundary})

def schema(action, **values): return request('schema.php', {'action': action, 'table': 'Things', **values})

try:
    for _ in range(50):
        try:
            with socket.create_connection(('127.0.0.1', port), timeout=.2): break
        except OSError: time.sleep(.1)
    original_hash = hashlib.sha256((ROOT / 'data/northwind-demo.sqlite').read_bytes()).hexdigest()
    catalog = request('databases.php')['databases']
    assert len(catalog) == 1 and catalog[0]['id'] == 'sqlite:demo'
    request('database.php')
    customers = request('view.php?view=table-customers')['view']['data']['tables']['customers']
    assert len(customers['data']) == 29
    demo_row = dict(customers['data'][0]); demo_row['company'] = 'Only browser A'
    request('records.php', {'action': 'update', 'table': 'customers', 'primaryKeyValue': demo_row['id'], 'row': demo_row})
    other_customers = request('view.php?view=table-customers', identity=other)['view']['data']['tables']['customers']
    assert other_customers['data'][0]['company'] != 'Only browser A'
    assert hashlib.sha256((ROOT / 'data/northwind-demo.sqlite').read_bytes()).hexdigest() == original_hash
    created = request('databases.php', {'action': 'create', 'database': 'Test Workspace', 'engine': 'sqlite'})
    active = created['database']
    request('databases.php?database=' + active, identity=other, expected=False)
    request('database.php', identity=other, expected=False)
    schema('createTable', name='Things')
    schema('addColumn', name='name', type='Short Text')
    schema('addColumn', name='amount', type='Currency')
    record = request('records.php', {'action': 'insert', 'table': 'Things', 'row': {'name': "O'Brien", 'amount': 12.25}})['row']
    assert record['ID'] == 1
    record['name'] = 'Updated'
    request('records.php', {'action': 'update', 'table': 'Things', 'primaryKeyValue': 1, 'row': record})
    schema('setColumnValidation', column='name', property='required', enabled=True)
    schema('setColumnValidation', column='name', property='unique', enabled=True)
    schema('renameColumn', oldName='name', newName='display name')
    payload = schema('applyDesignChanges', columns=[], primaryKey='ID', columnOrder=['ID','amount','display name'], tableProperties={'description': 'SQLite design'})['payload']
    assert [column['name'] for column in payload['structure']['columns']] == ['ID','amount','display name']
    assert payload['data'][0]['display name'] == 'Updated'
    request('schema.php', {'action': 'setColumnType', 'table': 'Things', 'column': 'display name', 'type': 'Number'}, expected=False)
    # A later failure in a batch must roll back earlier schema changes.
    request('schema.php', {'action': 'applyDesignChanges', 'table': 'Things', 'primaryKey': 'ID', 'columns': [
        {'isNew': True, 'name': 'rollback_test', 'type': 'Short Text'},
        {'originalName': 'missing', 'name': 'missing', 'type': 'Number'}]}, expected=False)
    names = [c['name'] for c in request('view.php?view=table-things')['view']['data']['tables']['Things']['structure']['columns']]
    assert 'rollback_test' not in names
    schema('setColumnFormat', column='amount', format='Currency', decimalPlaces=3)
    schema('applyDesignChanges', columns=[{'originalName': 'display name', 'name': 'display name', 'type': 'Short Text', 'comment': "Customer's name"}], primaryKey='ID')
    schema('setDefaultValue', column='amount', expression='5', javascript='5')
    schema('setValidationRule', column='amount', rule='>= 0', javascript='value >= 0')
    schema('addColumn', name='notes', type='Long Text')
    schema('setMemoSetting', column='notes', setting='appendOnly', enabled=True)
    schema('createTable', name='Labels')
    schema('addColumn', table='Labels', name='label', type='Short Text')
    request('records.php', {'action': 'insert', 'table': 'Labels', 'row': {'label': 'One'}})
    schema('createLookupField', name='labels', lookup={'kind': 'table', 'sourceObjectType': 'table', 'sourceObjectName': 'Labels', 'keyColumn': 'ID', 'displayColumns': ['label'], 'allowMultiple': True, 'storageMode': 'relationship'})
    row = request('view.php?view=table-things')['view']['data']['tables']['Things']['data'][0]
    row.update({'labels': '1', 'notes': 'history entry'})
    request('records.php', {'action': 'update', 'table': 'Things', 'primaryKeyValue': 1, 'row': row})
    result_row = request('view.php?view=table-things')['view']['data']['tables']['Things']['data'][0]
    assert result_row['labels'] == '1'
    schema('addColumn', name='test', type='Short Text')
    schema('setColumnType', column='test', type='Number')
    schema('deleteColumn', column='test')
    snapshot = request('files.php?action=download&database=' + active, raw=True)
    target = TEMP / 'roundtrip.sqlite'; target.write_bytes(snapshot)
    with sqlite3.connect(target) as db:
        assert db.execute('PRAGMA integrity_check').fetchone()[0] == 'ok'
        assert db.execute('SELECT "display name" FROM Things').fetchone()[0] == 'Updated'
    uploaded = upload(target)['item']['id']
    request('files.php', {'action': 'delete', 'database': uploaded}, identity=other, expected=False)
    request('files.php', {'action': 'delete', 'database': uploaded})
    # A composite key must never update several rows using one key component.
    compound = TEMP / 'compound.sqlite'
    if compound.exists(): compound.unlink()
    with sqlite3.connect(compound) as db:
        db.execute('CREATE TABLE Pair (a INTEGER, b INTEGER, value TEXT, PRIMARY KEY(a,b))')
        db.executemany('INSERT INTO Pair VALUES (?,?,?)', [(1,1,'first'),(2,1,'second')])
    compound_id = upload(compound)['item']['id']
    previous_active = active
    active = compound_id
    request('records.php', {'action': 'update', 'table': 'Pair', 'primaryKeyValue': 1, 'row': {'a': 1, 'b': 1, 'value': 'bad'}}, expected=False)
    assert [row['value'] for row in request('view.php?view=table-pair')['view']['data']['tables']['Pair']['data']] == ['first', 'second']
    request('files.php', {'action': 'delete', 'database': compound_id})
    active = previous_active
    request('databases.php?database=' + uploaded, expected=False)
    request('files.php', {'action': 'delete', 'database': active})
    # Connection parameters come from the request, not the server's selected database.
    settings = subprocess.run(['php', '-r', "require 'lib/db.php'; echo json_encode(mysql_browser_settings());"], cwd=ROOT, capture_output=True, check=True).stdout
    mysql_headers = {'X-Acacia-Connection': base64.b64encode(settings).decode()}
    server_catalog = request('databases.php?source=mysql', headers=mysql_headers)['databases']
    assert any(item['id'] == 'mysql:northwind' for item in server_catalog)
    active = 'mysql:northwind'
    assert 'customers' in request('database.php', headers=mysql_headers)['tables']
    active = 'sqlite:demo'
    assert all(item['engine'] == 'sqlite' for item in request('databases.php', headers=mysql_headers)['databases'])
    active = 'sqlite:demo'
    request('files.php', {'action': 'reset', 'database': 'sqlite:demo'})
    restored = request('view.php?view=table-customers')['view']['data']['tables']['customers']['data'][0]
    assert restored['company'] != 'Only browser A'
    # A real Access fixture is generated by the same public library used by the reader.
    fixture = TEMP / 'fixture.accdb'
    java = 'C:/Program Files/JetBrains/PhpStorm 2026.1.1/jbr/bin/java.exe' if os.name == 'nt' else 'java'
    subprocess.run([java, '-cp', str(ROOT / 'tools/access/lib/*'), str(ROOT / 'tests/CreateAccessFixture.java'), str(fixture)], check=True, capture_output=True)
    preview = upload(fixture)
    assert preview['kind'] == 'access'
    assert next(table for table in preview['manifest']['tables'] if table['name'] == 'People')['rowCount'] == 2
    request('files.php', {'action': 'import', 'token': preview['token'], 'selection': {'tables': ['People'], 'queries': []}, 'name': 'Imported'}, identity=other, expected=False)
    converted = request('files.php', {'action': 'import', 'token': preview['token'], 'selection': {'tables': ['People'], 'queries': []}, 'name': 'Imported'})
    assert converted['counts']['People'] == 2
    active = converted['item']['id']
    imported = request('view.php?view=table-people')['view']['data']['tables']['People']
    assert imported['data'][0]['Name'] == "O'Brien"
    assert 'Omitted' not in request('database.php')['tables']
    request('files.php', {'action': 'delete', 'database': active})
    print(f'PASS: {checks} API checks; SQLite CRUD/schema/download/upload, workspace isolation, demo reset, Access conversion.')
    # Jackcess's Apache-licensed query fixture exercises real MDB saved-query extraction.
    query_fixture = TEMP / 'queryTestV2000.mdb'
    if not query_fixture.exists():
        query_fixture.write_bytes(urllib.request.urlopen('https://raw.githubusercontent.com/jahlborn/jackcess/be0a2139b087a227d14cafd4ea231306a5a3a862/src/test/data/V2000/queryTestV2000.mdb').read())
    preview = upload(query_fixture)
    queries = [query for query in preview['manifest']['queries'] if query['supported']]
    assert queries
    query = queries[0]
    imported_query = request('files.php', {'action': 'import', 'token': preview['token'], 'selection': {'tables': [], 'queries': [query['name']]}, 'name': 'MDB queries'})
    active = imported_query['item']['id']
    overview = request('database.php')
    view = overview['queries'][query['name']]['view']
    loaded = request('view.php?view=' + view)['view']['data']['queries'][query['name']]
    assert loaded['sourceSql'] == query['sql']
    loaded['sourceSql'] += '\n-- Saved edit'
    request('objects.php', {'name': query['name'], 'definition': loaded})
    assert request('view.php?view=' + view)['view']['data']['queries'][query['name']]['sourceSql'].endswith('-- Saved edit')
    request('files.php', {'action': 'delete', 'database': active})
    print(f'PASS: {checks} total API checks including MDB query extraction and saving.')
finally:
    process.terminate(); process.wait(timeout=10); log.close()
