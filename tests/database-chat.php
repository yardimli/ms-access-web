<?php
require_once __DIR__ . '/../lib/database_chat.php';
function check_chat(bool $value, string $message): void { if (!$value) throw new RuntimeException($message); }
function reject_chat(callable $call): void { try { $call(); } catch (Throwable $error) { return; } throw new RuntimeException('Expected rejection.'); }
$db = new SQLiteConnection(':memory:'); ensure_acaciadb_storage($db);
$plan = ['message' => 'Create contacts and objects', 'actions' => [
    ['type'=>'sql','sql'=>'CREATE TABLE Contacts (ID INTEGER PRIMARY KEY AUTOINCREMENT, Name TEXT, Amount REAL)'],
    ['type'=>'sql','sql'=>"INSERT INTO Contacts(Name,Amount) VALUES('private-record-sentinel',1.25)"],
    ['type'=>'sql','sql'=>'ALTER TABLE Contacts ADD COLUMN Email TEXT'],
    ['type'=>'save_object','kind'=>'form','name'=>'Contact Entry','definition'=>['title'=>'Contacts','parentTable'=>'Contacts','parentKey'=>'ID','fields'=>['Name','Email']]],
    ['type'=>'save_object','kind'=>'query','name'=>'Contact List','definition'=>['tables'=>['Contacts'],'sourceSql'=>'SELECT Name,Email FROM Contacts WHERE Amount >= 1.0']],
    ['type'=>'save_object','kind'=>'report','name'=>'Contact Report','definition'=>['title'=>'Contacts','sourceTable'=>'Contacts','columns'=>['Name','Email']]],
]];
check_chat(count(chat_apply($db,$plan)) === 6, 'Actions were not applied.');
check_chat(count(fetch_objects($db,'form')) === 1 && count(fetch_objects($db,'query')) === 1 && count(fetch_objects($db,'report')) === 1, 'Missing objects.');
$db->pdo->exec("UPDATE acaciadb_object_definitions SET definition_json=json_set(definition_json,'$.rows',json('[{\"Name\":\"cached-secret-sentinel\"}]')) WHERE object_type='report'");
$structure = json_encode(chat_structure($db));
check_chat(!str_contains($structure,'private-record-sentinel') && !str_contains($structure,'cached-secret-sentinel'), 'Record data leaked into context.');
reject_chat(fn()=>chat_apply($db,['message'=>'rollback','actions'=>[
    ['type'=>'sql','sql'=>'CREATE TABLE ShouldRollback (ID INTEGER)'],
    ['type'=>'save_object','kind'=>'form','name'=>'Invalid','definition'=>['title'=>'Bad','parentTable'=>'Missing','parentKey'=>'ID','fields'=>['ID']]],
]]));
check_chat(!$db->pdo->query("SELECT name FROM sqlite_master WHERE name='ShouldRollback'")->fetchColumn(), 'Partial changes survived.');
foreach (["ATTACH DATABASE 'elsewhere' AS other", 'PRAGMA writable_schema=ON', 'DROP TABLE sqlite_master', 'DELETE FROM acaciadb_object_definitions', 'CREATE VIRTUAL TABLE x USING fts5(y)', 'CREATE TRIGGER x AFTER INSERT ON Contacts BEGIN DELETE FROM Contacts; END', 'UPDATE Contacts SET Name=load_extension(\'x\')', 'CREATE TABLE x(ID); DROP TABLE Contacts'] as $sql) reject_chat(fn()=>chat_plan(['message'=>'bad','actions'=>[['type'=>'sql','sql'=>$sql]]]));
reject_chat(fn()=>chat_plan(['message'=>'bad','actions'=>[['type'=>'shell','command'=>'bad']]]));
check_chat(chat_sql("UPDATE Contacts SET Name='a;b',Amount=2.5 WHERE ID>=1;") !== '', 'Valid SQL rejected.');
chat_apply($db,['message'=>'edit','actions'=>[['type'=>'sql','sql'=>'ALTER TABLE Contacts RENAME COLUMN Email TO EmailAddress']]]);
check_chat(in_array('EmailAddress',array_column($db->pdo->query('PRAGMA table_info(Contacts)')->fetchAll(),'name')), 'Field edit failed.');
echo "PASS: sequential SQL/object actions, rollback, structure-only context, SQL validation, field editing.\n";
if (in_array('--live', $argv, true)) {
    $live = new SQLiteConnection(':memory:'); ensure_acaciadb_storage($live);
    $response = chat_completion([['role'=>'user','content'=>'Create a Contacts table with an AutoNumber ID and Name text field, and a simple contact entry form.']],chat_structure($live));
    $steps = chat_apply($live,$response);
    check_chat(count($steps)>=2 && count(fetch_objects($live,'form'))>=1,'Live response did not create table/form.');
    echo 'PASS: live OpenRouter response validated and applied to a disposable in-memory database (' . count($steps) . " actions).\n";
}
