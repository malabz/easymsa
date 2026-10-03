#!/usr/bin/env python3
"""Offline verification of the public teaching assets (does not submit jobs)."""
import gzip,hashlib,json,lzma,re,zipfile
from pathlib import Path
root=Path(__file__).resolve().parents[1]/'public/examples/v1'
def fasta(data):
 records=[]
 for line in data.decode().splitlines():
  if line.startswith('>'):records.append([line[1:].strip(),''])
  elif line.strip():records[-1][1]+=line.strip()
 assert len(records)>=2
 return records
summary=[]
for e in json.loads((root/'manifest.json').read_text()):
 directory=root/e['id'];input_rows=fasta((directory/'input.fasta').read_bytes());clean=fasta((directory/'clean.fasta').read_bytes());mapping=json.loads((directory/'id-map.json').read_text())
 assert len(input_rows)==len(clean)==len(mapping)==20
 assert [r[1].replace('-','') for r in input_rows]==[r[1].replace('-','') for r in clean]
 for name,meta in e['files'].items():
  data=(directory/name).read_bytes();assert len(data)==meta['bytes'];assert hashlib.sha256(data).hexdigest()==meta['sha256']
  if name.endswith('.zip'):
   with zipfile.ZipFile(directory/name) as z:
    assert z.testzip() is None
    assert set(z.namelist()) <= {'input.fasta','clean.fasta','id-map.json','initial.fasta','refined.fasta','final.fasta','initial.summary.json','refined.summary.json','final.summary.json','provenance.json','README.txt','LICENSE.txt'}
  elif not name.endswith(('.gz','.xz','.bin')):
   assert not re.search(rb'(?i)(token=|BEGIN [A-Z ]*PRIVATE KEY|/var/lib/easymsa|/opt/easymsa|@example.com)',data)
 for stage,dimensions in e['stages'].items():
  raw=(directory/(stage+'.fasta')).read_bytes();rows=fasta(raw)
  assert gzip.decompress((directory/(stage+'.fasta.gz.bin')).read_bytes())==raw
  assert gzip.decompress(lzma.decompress((directory/(stage+'.fasta.gz.xz')).read_bytes()))==raw
  expected=clean if e['kind']=='alignment' else input_rows
  assert [r[0] for r in rows]==[r[0] for r in expected]
  assert [r[1].replace('-','') for r in rows]==[r[1].replace('-','') for r in expected]
  assert len(set(len(r[1]) for r in rows))==1
  assert len(rows)==dimensions['sequenceCount'] and len(rows[0][1])==dimensions['alignmentLength']
  preview=json.loads((directory/(stage+'.alignment.json')).read_text())
  assert [(r['id'].strip(),r['sequence']) for r in preview['sequences']]==[(r[0],r[1]) for r in rows]
 if e['kind']=='realignment':assert (directory/'final.fasta').read_bytes()==(directory/'refined.fasta').read_bytes()
 summary.append({'id':e['id'],'stages':list(e['stages']),'sequences':20,'passed':True})
print(json.dumps(summary,indent=2))
