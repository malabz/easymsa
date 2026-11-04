"""Prepare byte-identical Benchmark FASTA downloads outside the Git repository.

python scripts/prepare-benchmark-downloads.py --source FROZEN_DATA --output DOWNLOADS
The output is served as /benchmark/datasets/<version>/; it contains no reports or logs.
"""
import argparse
import hashlib
import json
from pathlib import Path
import re
import shutil
import zipfile


def digest(path):
    with path.open('rb') as stream:
        checksum = hashlib.sha256()
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            checksum.update(chunk)
        return checksum.hexdigest()


def prepare(source, output):
    source = Path(source).resolve()
    output = Path(output).resolve()
    manifest = json.loads((source / 'manifest.json').read_text(encoding='utf-8'))
    version = manifest['version']
    if not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9._-]*', version):
        raise ValueError('Invalid data version')
    cases = manifest['cases']
    if not cases or len({case['id'] for case in cases}) != len(cases):
        raise ValueError('Missing or duplicate cases')
    # Validate every source before creating any output; source files stay untouched.
    checked = []
    for case in cases:
        if not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9._-]*', case['id']):
            raise ValueError('Invalid case ID')
        path = (source / case['input']).resolve()
        if not path.is_relative_to(source) or not path.is_file():
            raise ValueError('Input outside frozen data')
        if digest(path) != case['input_sha256']:
            raise ValueError(f"Input checksum mismatch: {case['id']}")
        with path.open('rb') as stream:
            records = sum(line.startswith(b'>') for line in stream)
        if records == 0:
            raise ValueError('Input is not FASTA')
        checked.append((case, path, records))
    target = output / version
    target.mkdir(parents=True, exist_ok=False)
    files = []
    with zipfile.ZipFile(target / 'all-inputs.zip', 'w', zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
        for case, path, records in checked:
            name = case['id'] + '.fasta'
            destination = target / name
            shutil.copyfile(path, destination)
            if digest(destination) != case['input_sha256']:
                raise ValueError('Copied input checksum mismatch')
            archive.write(destination, arcname=name)
            files.append(dict(id=case['id'], filename=name, bytes=destination.stat().st_size,
                              sha256=case['input_sha256'], sequence_count=records))
    result = dict(version=version, files=files, archive=dict(filename='all-inputs.zip',
                  bytes=(target / 'all-inputs.zip').stat().st_size, sha256=digest(target / 'all-inputs.zip')))
    (target / 'manifest.json').write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8')
    return result


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', required=True)
    parser.add_argument('--output', required=True)
    args = parser.parse_args()
    result = prepare(args.source, args.output)
    print(json.dumps(dict(version=result['version'], datasets=len(result['files']), archive_bytes=result['archive']['bytes'])))
