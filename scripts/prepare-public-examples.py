#!/usr/bin/env python3
"""Build public teaching examples from real EasyMSA jobs. No credentials are saved.
Run with --api http://127.0.0.1:18000/api --ssh-helper /path/to/authorized/remote.py. This submits two small, email-free jobs.
Only explicitly selected public artifacts are written. Python requests required.
"""
import argparse, subprocess, tempfile, gzip, hashlib, json, lzma, random, time, zipfile
from pathlib import Path
from datetime import datetime
import requests
p=argparse.ArgumentParser(); p.add_argument('--api', required=True); p.add_argument('--ssh-helper', required=True); args=p.parse_args()
root=Path(__file__).resolve().parents[1]/'public/examples/v1'; root.mkdir(parents=True,exist_ok=True)
rng=random.Random(20261002); ancestor=''.join(rng.choice('ACGT') for _ in range(500))
records=[]
for i in range(20):
    s=list(ancestor)
    for j in rng.sample(range(500),12+i%5): s[j]=rng.choice('ACGT'.replace(s[j],''))
    if i%3==0: del s[210:213]
    if i%4==0: s[340:340]=list(''.join(rng.choice('ACGT') for _ in range(5)))
    records.append((f'demo_{i+1:02d} synthetic teaching DNA', ''.join(s)))
raw=''.join(f'>{n}\n{s}\n' for n,s in records).encode()

def fasta(data):
    out=[]
    for line in data.decode().splitlines():
        if line.startswith('>'): out.append([line[1:], ''])
        elif line.strip(): out[-1][1]+=line.strip()
    return out

def validate(data, expected):
    rows=fasta(data); source=fasta(expected)
    assert len(rows)==len(source)==20
    assert len(set(len(s) for _,s in rows))==1
    assert [n.split()[0] for n,s in rows]==[n.split()[0] for n,s in source], ([n for n,s in rows][:3],[n for n,s in source][:3])
    assert [s.replace('-','').upper() for n,s in rows]==[s.replace('-','').upper() for n,s in source]
    return rows

def job(path, data, name, extra):
    response=requests.post(args.api+path,files={'input_file':('input.fasta',data,'text/plain')},data={'job_name':name,'language':'en',**extra},timeout=60)
    assert response.status_code==202, f'Submission returned {response.status_code}'
    access=response.json(); jobid=access['jobId']; token=access['token']; started=time.monotonic()
    def get(suffix='',stage='final'):
        r=requests.get(f'{args.api}/jobs/{jobid}{suffix}',params={'token':token,'stage':stage},timeout=90)
        assert r.ok, f'Result endpoint returned {r.status_code}'
        return r
    while time.monotonic()-started<600:
        detail=get().json()
        if detail['status'] in ('completed','failed','deleted'): break
        time.sleep(2)
    assert detail['status']=='completed', 'Example computation did not complete'
    print(f'{name}: completed in {time.monotonic()-started:.2f}s',flush=True)
    stages={}
    for stage in (['initial','refined','final'] if path=='/realign/jobs' else ['final']):
        data=gzip.decompress(get('/download/alignment/gz',stage).content)
        summary=get('/results/summary',stage).json()
        preview=get('/results/alignment',stage).json()
        stages[stage]=(data,summary,preview)
    # Only allowlisted metadata is retained; never task IDs/tokens/URLs or logs.
    clean = ''.join(f">{name}\n{sequence.replace('-', '')}\n" for name,sequence in fasta(input_data)).encode()
    if path == '/jobs':
        with tempfile.NamedTemporaryFile(mode='w',suffix='.sh') as script:
            script.write("cd /opt/easymsa/current\n/opt/easymsa/python311/bin/python - <<'CLEAN'\nfrom dotenv import load_dotenv\nload_dotenv('/etc/easymsa/production.env')\nfrom easymsa_server.db.session import SessionLocal\nfrom easymsa_server.db.models import Job\nfrom sqlalchemy import select\nfrom pathlib import Path\nwith SessionLocal() as session:\n job=session.scalars(select(Job).where(Job.job_name=='Public synthetic example alignment').order_by(Job.created_at.desc())).first()\n print(Path(job.preprocess_clean_fasta_path).read_text(),end='')\nCLEAN\n");script.flush()
            result=subprocess.run(['python3',args.ssh_helper,script.name],capture_output=True,check=True)
            clean=result.stdout
        assert [s for n,s in fasta(clean)] == [s for n,s in fasta(input_data)], 'Unexpected preprocessing sequence changes'
    return stages, {k:detail.get(k) for k in ['algorithm','preprocess','realignment','startedAt','completedAt']}, clean, time.monotonic()-started

index=[]
for example_id,kind,input_data,api_path,params in [('alignment-small','alignment',raw,'/jobs',{'algorithm':'minipoa','preprocess_mode':'audit'}),('realignment-small','realignment',None,'/realign/jobs',{'realign_pattern':'1'})]:
    if input_data is None: input_data=initial
    out=root/example_id; out.mkdir(exist_ok=True)
    stages,metadata,clean,elapsed=job(api_path,input_data,'Public synthetic example '+kind,params)
    (out/'clean.fasta').write_bytes(clean);
    (out/'id-map.json').write_text(json.dumps([{'inputHeader':a[0], 'cleanHeader':b[0]} for a,b in zip(fasta(input_data),fasta(clean))],indent=2)+'\n');
    (out/'input.fasta').write_bytes(input_data); (out/'input.fasta.gz.bin').write_bytes(gzip.compress(input_data,mtime=0))
    artifacts={}; manifest_stages={}
    for stage,(data,summary,preview) in stages.items():
        rows=validate(data,clean if kind=='alignment' else input_data)
        public_id=f'example:{example_id}:v1:{stage}'
        if kind=='realignment' and stage=='initial': summary['algorithm']={'name':'minipoa','resolvedName':'minipoa'}
        summary={'jobId':public_id,'algorithm':summary.get('algorithm'), 'summary':{k:summary['summary'].get(k) for k in ['preprocess','alignment']}}
        summary['summary']['outputFiles']=['alignment.fasta','alignment.fasta.gz','all_results.zip']
        preview={k:preview[k] for k in ['truncated','sequenceCount','alignmentLength','sequences']}; preview['jobId']=public_id
        assert not preview['truncated']; assert len(preview['sequences'])==20
        (out/f'{stage}.fasta').write_bytes(data)
        (out/f'{stage}.fasta.gz.bin').write_bytes(gzip.compress(data,mtime=0))
        (out/f'{stage}.fasta.gz.xz').write_bytes(lzma.compress(gzip.compress(data,mtime=0)))
        (out/f'{stage}.summary.json').write_text(json.dumps(summary,indent=2)+'\n')
        (out/f'{stage}.alignment.json').write_text(json.dumps(preview,indent=2)+'\n')
        manifest_stages[stage]={'sequenceCount':len(rows),'alignmentLength':len(rows[0][1]),'algorithm':summary['algorithm']}
    if kind=='alignment': initial=stages['final'][0]
    refinement=metadata.get('realignment') or {}
    # Inspect only safe scalar performance/version fields; no arbitrary backend messages.
    safe_refinement={k:refinement[k] for k in ['status','pattern','version','elapsedSeconds','durationSeconds'] if k in refinement}
    provenance={'schema':1,'exampleId':example_id,'version':'v1','kind':kind,'source':'Synthetic teaching DNA; not a biological benchmark','seed':20261002,'generator':'scripts/prepare-public-examples.py','parameters':params,'collectionElapsedSeconds':round(elapsed,3),'taskElapsedSeconds':round((datetime.fromisoformat(metadata['completedAt'].replace('Z','+00:00'))-datetime.fromisoformat(metadata['startedAt'].replace('Z','+00:00'))).total_seconds(),3) if metadata.get('completedAt') and metadata.get('startedAt') else None,'preprocessingNote':('Audit assigns normalized IDs; id-map.json records the original-to-clean mapping.' if kind=='alignment' else 'Standalone refinement preserves aligned input; ordinary preprocessing is not applicable.'),'tools':{'MiniPOA':'1.0','ReAlign-N':'01a602e-easymsa.1','MAFFT':'7.526','easymsa-prep':'4bb04fb'},'realignment':safe_refinement,'stages':manifest_stages,'sameInitialAndRefined':stages.get('initial',[None])[0]==stages.get('refined',[None])[0] if kind=='realignment' else None}
    (out/'provenance.json').write_text(json.dumps(provenance,indent=2)+'\n')
    (out/'README.txt').write_text('EasyMSA synthetic teaching example. Seed 20261002. MIT for these synthetic data and explanatory materials.\nReal tool results; no claim of biological accuracy or improvement. See provenance.json.\n')
    (out/'LICENSE.txt').write_text((Path(__file__).resolve().parents[1]/'LICENSE').read_text())
    for stage in stages:
        with zipfile.ZipFile(out/f'{stage}.zip','w',zipfile.ZIP_DEFLATED) as z:
            for name in ['input.fasta','clean.fasta','id-map.json',*[(s+'.fasta') for s in stages],stage+'.summary.json','provenance.json','README.txt','LICENSE.txt']:
                z.write(out/name,name)
    for f in sorted(out.iterdir()):
        if f.name!='hashes.json': artifacts[f.name]={'sha256':hashlib.sha256(f.read_bytes()).hexdigest(),'bytes':f.stat().st_size}
    (out/'hashes.json').write_text(json.dumps(artifacts,indent=2)+'\n')
    index.append({'id':example_id,'version':'v1','kind':kind,'stages':manifest_stages,'files':artifacts,'sameInitialAndRefined':provenance['sameInitialAndRefined']})
(root/'manifest.json').write_text(json.dumps(index,indent=2)+'\n')
print('Public assets validated and written; no job access credentials retained.',flush=True)
