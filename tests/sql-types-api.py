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
    print('PASS: Connection collations, default values, NULL/None, timestamps, and incompatible settings.')
    print('PASS: API create, resize, design save, ENUM/SET/BLOB, decimal data preservation, invalid type rejection.')
finally:
    if active:
        request('files.php', {'action': 'delete', 'database': active})
    process.terminate()
    process.wait(timeout=10)
