"""Install pinned Access reader dependencies from Maven Central. Requires Java 11+."""
from pathlib import Path
import hashlib
import urllib.request

root = Path(__file__).resolve().parents[1] / 'tools' / 'access' / 'lib'
root.mkdir(parents=True, exist_ok=True)
artifacts = [
    'com/healthmarketscience/jackcess/jackcess/4.0.8/jackcess-4.0.8.jar',
    'org/apache/commons/commons-lang3/3.17.0/commons-lang3-3.17.0.jar',
    'commons-logging/commons-logging/1.3.4/commons-logging-1.3.4.jar',
    'com/google/code/gson/gson/2.11.0/gson-2.11.0.jar',
]
for artifact in artifacts:
    url = 'https://repo.maven.apache.org/maven2/' + artifact
    data = urllib.request.urlopen(url).read()
    expected = urllib.request.urlopen(url + '.sha1').read().decode().split()[0]
    if hashlib.sha1(data).hexdigest() != expected:
        raise RuntimeError('Checksum mismatch for ' + artifact)
    (root / artifact.split('/')[-1]).write_bytes(data)
    print('Installed', artifact.split('/')[-1])
