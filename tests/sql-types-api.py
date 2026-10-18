"""Schema and record checks against a disposable SQLite workspace."""
from pathlib import Path
import json, os, socket, subprocess, time, urllib.request, urllib.error, uuid

root = Path(__file__).resolve().parents[1]
with socket.socket() as sock:
    sock.bind(('127.0.0.1', 0))
    port = sock.getsockname()[1]
process = subprocess.Popen(['php', '-S', f'127.0.0.1:{port}', '-t', str(root)],
    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0)
identity, active = str(uuid.uuid4()), ''

def request(endpoint, data=None, ok=True):
    headers = {'X-Acacia-User': identity, 'X-Acacia-Database': active, 'Content-Type': 'application/json'}
    req = urllib.request.Request(f'http://127.0.0.1:{port}/api/{endpoint}',
        data=json.dumps(data).encode() if data is not None else None, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=15) as response:
            result = json.load(response)
    except urllib.error.HTTPError as error:
        result = json.load(error)
    assert result.get('ok') is ok, (data, result)
    return result

def schema(action, **args):
    return request('schema.php', {'action': action, 'table': 'Types', **args})

try:
    for _ in range(50):
        try:
            with socket.create_connection(('127.0.0.1', port), timeout=.1):
                break
        except OSError:
            time.sleep(.1)
    active = request('databases.php', {'action': 'create', 'database': 'SQL type tests', 'engine': 'sqlite'})['database']
    schema('createTable', name='Types')
    for name, sql, kind in [('title', 'VARCHAR(512)', 'Short Text'), ('ratio', 'DECIMAL(4,4)', 'Number'),
                            ('binary_value', 'BLOB', 'OLE Object'), ('choice', "ENUM('small','Large')", 'Short Text'),
                            ('tags', "SET('one','two')", 'Short Text')]:
        result = schema('addColumn', name=name, type=kind, mysqlType=sql)
        column = next(c for c in result['payload']['structure']['columns'] if c['name'] == name)
        assert column['mysqlType'] == sql, column
    result = schema('setColumnType', column='title', acaciadbType='Short Text', mysqlType='VARCHAR(1024)')
    column = next(c for c in result['payload']['structure']['columns'] if c['name'] == 'title')
    assert column['fieldSize'] == 1024, column
    result = schema('applyDesignChanges', columns=[{'originalName': 'title', 'name': 'title', 'type': 'Short Text', 'mysqlType': 'VARCHAR(768)', 'fieldSize': 768}])
    column = next(c for c in result['payload']['structure']['columns'] if c['name'] == 'title')
    assert column['mysqlType'] == 'VARCHAR(768)' and column['fieldSize'] == 768, column
    result = request('records.php', {'action': 'insert', 'table': 'Types', 'row': {'title': 'x' * 512, 'ratio': '0.1234', 'binary_value': 'blob content', 'choice': 'Large', 'tags': 'one,two'}})
    assert float(result['row']['ratio']) == .1234, result
    request('schema.php', {'action': 'setColumnType', 'table': 'Types', 'column': 'ratio', 'mysqlType': 'DECIMAL(4,5)'}, ok=False)
    order = [c['name'] for c in result['payload']['structure']['columns']]
    order = list(reversed(order))
    schema('applyDesignChanges', columns=[], columnOrder=order)
    renamed = schema('renameColumn', oldName='title', newName='renamed_title')
    expected = ['renamed_title' if name == 'title' else name for name in order]
    assert [c['name'] for c in renamed['payload']['structure']['columns']] == expected
    assert renamed['payload']['data'][0]['renamed_title'] == 'x' * 512
    rule = 'function(fields) { return fields.renamed_title !== "invalid"; }'
    schema('setValidationRule', column='renamed_title', rule=rule, javascript=rule)
    schema('setValidationMessage', column='renamed_title', message='Please enter a valid title.')
    def title_column():
        structure = request('view.php?view=design-types')['view']['data']['tables']['Types']['structure']
        return next(c for c in structure['columns'] if c['name'] == 'renamed_title')
    column = title_column()
    assert column['validationText'] == 'Please enter a valid title.', column
    assert column['validationJavascript'] == rule, column
    schema('setValidationMessage', column='renamed_title', message='')
    column = title_column()
    assert column['validationText'] == '' and column['validationJavascript'] == rule, column
    request('schema.php', {'action': 'setValidationMessage', 'table': 'Types', 'column': 'missing_field', 'message': 'Test'}, ok=False)
    print('PASS: Field validation messages persist, clear, preserve rules, and reject missing fields.')
    design = request('view.php?view=design-types')['view']['data']['tables']['Types']['structure']
    assert design['schemaOptions']['engine'] == 'sqlite'
    assert 'NOCASE' in [c['name'] for c in design['schemaOptions']['collations']]
    schema('addColumn', name='default_text', type='Short Text', mysqlType='VARCHAR(255)')
    schema('addColumn', name='created_at', type='Date/Time', mysqlType='DATETIME')
    def settings(name, kind, sql, **values):
        result = schema('applyDesignChanges', columns=[{'originalName': name, 'name': name, 'type': kind, 'mysqlType': sql, **values}])
        return next(c for c in result['payload']['structure']['columns'] if c['name'] == name)
    column = settings('default_text', 'Short Text', 'VARCHAR(255)', collation='NOCASE', sqlDefaultMode='defined', sqlDefaultValue="O'Brien")
    assert column['collation'] == 'NOCASE' and column['sqlDefaultValue'] == "O'Brien", column
    settings('created_at', 'Date/Time', 'DATETIME', sqlDefaultMode='current_timestamp')
    inserted = request('records.php', {'action': 'insert', 'table': 'Types', 'row': {'renamed_title': 'defaults'}})['row']
    assert inserted['default_text'] == "O'Brien" and inserted['created_at'], inserted
    column = settings('default_text', 'Short Text', 'VARCHAR(255)', sqlDefaultMode='null')
    assert column['sqlDefaultMode'] == 'null', column
    column = settings('default_text', 'Short Text', 'VARCHAR(255)', sqlDefaultMode='none')
    assert column['sqlDefaultMode'] == 'none', column
    column = settings('default_text', 'Short Text', 'VARCHAR(255)', sqlDefaultMode='defined', sqlDefaultValue='CURRENT_TIMESTAMP')
    assert column['sqlDefaultMode'] == 'defined' and column['sqlDefaultValue'] == 'CURRENT_TIMESTAMP', column
    for invalid in [{'sqlDefaultMode': 'current_timestamp'}, {'collation': 'not_a_real_collation'}, {'sqlAttribute': 'UNSIGNED'}]:
        request('schema.php', {'action': 'applyDesignChanges', 'table': 'Types', 'columns': [
            {'originalName': 'default_text', 'name': 'default_text', 'type': 'Short Text', 'mysqlType': 'VARCHAR(255)', **invalid}]}, ok=False)
    state = schema('getTableManagement')['management']
    assert state['autoColumn'] == 'ID', state
    schema('saveIndex', name='title_ratio', type='INDEX', columns=[{'name': 'renamed_title'}, {'name': 'ratio', 'direction': 'DESC'}])
    state = schema('getTableManagement')['management']
    index = next(i for i in state['indexes'] if i['name'] == 'title_ratio')
    assert len(index['columns']) == 2 and index['columns'][1]['direction'] == 'DESC', index
    schema('saveIndex', originalName='title_ratio', name='renamed_index', type='UNIQUE', columns=[{'name': 'renamed_title'}])
    state = schema('getTableManagement')['management']
    assert any(i['name'] == 'renamed_index' and i['type'] == 'UNIQUE' for i in state['indexes'])
    assert not any(i['name'] == 'title_ratio' for i in state['indexes'])
    request('schema.php', {'action': 'saveIndex', 'table': 'Types', 'originalName': 'renamed_index', 'name': 'bad', 'type': 'INDEX', 'columns': [{'name': 'not_a_field'}]}, ok=False)
    assert any(i['name'] == 'renamed_index' for i in schema('getTableManagement')['management']['indexes'])
    schema('deleteIndex', originalName='renamed_index', name='renamed_index', type='UNIQUE')
    schema('configureAutoIncrement', column='ID', enabled=True, next='1000')
    inserted = request('records.php', {'action': 'insert', 'table': 'Types', 'row': {'renamed_title': 'aaa'}})['row']
    assert int(inserted['ID']) == 1000, inserted
    first = request('view.php?view=table-types&limit=1&sortColumn=renamed_title&sortDirection=asc')['view']['data']['tables']['Types']['data']
    last = request('view.php?view=table-types&limit=1&sortColumn=renamed_title&sortDirection=desc')['view']['data']['tables']['Types']['data']
    assert first[0]['renamed_title'] == 'aaa' and last[0]['renamed_title'] == 'x' * 512, (first, last)
    request('view.php?view=table-types&sortColumn=missing&sortDirection=asc', ok=False)
    request('schema.php', {'action': 'configureAutoIncrement', 'table': 'Types', 'column': 'ID', 'enabled': True, 'next': '1'}, ok=False)
    schema('addColumn', name='manual_lookup', type='Short Text', mysqlType='VARCHAR(512)')
    pairs = [{'key': '9007199254740993', 'value': 'Large ID'}, {'key': 'two', 'value': 'Second'}]
    schema('applyDesignChanges', columns=[{'originalName': 'manual_lookup', 'name': 'manual_lookup', 'type': 'Short Text', 'mysqlType': 'VARCHAR(512)',
        'lookup': {'kind': 'static', 'mode': 'single', 'columns': 2, 'keyColumn': 'Col1', 'displayColumns': ['Col2'], 'source': pairs, 'limitToList': False}}])
    refreshed = request('view.php?view=design-types')['view']['data']['tables']['Types']['structure']['columns']
    lookup_column = next(c for c in refreshed if c['name'] == 'manual_lookup')
    assert lookup_column['mysqlType'] == 'VARCHAR(512)' and lookup_column['lookup']['source'] == pairs, lookup_column
    for value in ['9007199254740993', 'free input']:
        row = request('records.php', {'action': 'insert', 'table': 'Types', 'row': {'manual_lookup': value}})['row']
        assert row['manual_lookup'] == value, row
    print('PASS: Design lookup save/reload, key/value pairs, original SQL type, large keys, and free values.')
    renamed = schema('saveTableOptions', name='RenamedTypes')
    assert renamed['table'] == 'RenamedTypes' and renamed['management']['name'] == 'RenamedTypes'
    assert next(c for c in renamed['payload']['structure']['columns'] if c['name'] == 'renamed_title')['validationJavascript'] == rule
    print('PASS: Composite index create/edit/delete, invalid edit preservation, next AUTO_INCREMENT, server sorting, and table rename.')
    print('PASS: Connection collations, default values, NULL/None, timestamps, and incompatible settings.')
    print('PASS: API create, resize, design save, ENUM/SET/BLOB, decimal data preservation, invalid type rejection.')
finally:
    if active:
        request('files.php', {'action': 'delete', 'database': active})
    process.terminate()
    process.wait(timeout=10)
