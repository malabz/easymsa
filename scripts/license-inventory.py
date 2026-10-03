#!/usr/bin/env python3
"""Snapshot installed frontend package licenses without executing package code."""
from pathlib import Path
import json, shutil
root=Path(__file__).resolve().parents[1]; packages=json.loads((root/'package-lock.json').read_text())['packages']; rows=[]
for path,meta in packages.items():
 if not path:continue
 directory=root/path
 installed=json.loads((directory/'package.json').read_text()) if (directory/'package.json').exists() else {}
 notices=[]
 if directory.is_dir():
  for f in directory.iterdir():
   if f.is_file() and any(f.name.lower().startswith(n) for n in ['license','licence','copying','notice']):
    try:notices.append({'name':f.name,'text':f.read_text()})
    except (UnicodeError,OSError):pass
 rows.append({'name':path.split('node_modules/')[-1],'version':meta.get('version'),'license':installed.get('license') or meta.get('license','NOASSERTION'),'developmentOnly':meta.get('dev',False),'installed':bool(installed),'notices':notices})
(root/'public/legal/frontend-dependencies.json').write_text(json.dumps(rows,indent=2)+'\n')
shutil.copyfile(root/'e2e/fonts/LICENSE.txt',root/'public/legal/test-font-license.txt')
print(f'{len(rows)} dependency entries; unresolved license metadata: {sum(r["license"]=="NOASSERTION" for r in rows)}')
# Pinned optional platform packages may not be installed on this machine.
# Resolve their declared license from the exact npm version when requested.
if '--resolve-metadata' in __import__('sys').argv:
 import concurrent.futures, requests
 def resolve(row):
  if row['license'] != 'NOASSERTION': return
  url='https://registry.npmjs.org/'+row['name']+'/'+row['version']
  response=requests.get(url,timeout=30); response.raise_for_status()
  row['license']=response.json().get('license','NOASSERTION');row['metadataSource']=url
 with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:list(pool.map(resolve,rows))
 (root/'public/legal/frontend-dependencies.json').write_text(json.dumps(rows,indent=2)+'\n')
 print('Unresolved after metadata lookup:',sum(row['license']=='NOASSERTION' for row in rows))
