import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
import zipfile

spec = importlib.util.spec_from_file_location('downloads', Path(__file__).with_name('prepare-benchmark-downloads.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class DownloadsTest(unittest.TestCase):
    def fixture(self, root):
        source = root / 'source'
        source.mkdir()
        original = b'>title with spaces\nACGTN\n>duplicate\r\nAUCG\r\n'
        (source / 'input.fasta').write_bytes(original)
        manifest = dict(version='test-v1', cases=[dict(id='rna_255', input='input.fasta', input_sha256=hashlib.sha256(original).hexdigest())])
        (source / 'manifest.json').write_text(json.dumps(manifest))
        return source, manifest, original

    def test_exact_fasta_and_archive_with_public_metadata(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            source, manifest, original = self.fixture(root)
            result = module.prepare(source, root / 'output')
            self.assertEqual((root / 'output/test-v1/rna_255.fasta').read_bytes(), original)
            self.assertEqual(result['files'][0]['sequence_count'], 2)
            self.assertEqual((source / 'input.fasta').read_bytes(), original)
            with zipfile.ZipFile(root / 'output/test-v1/all-inputs.zip') as archive:
                self.assertEqual(archive.namelist(), ['rna_255.fasta'])
                self.assertEqual(archive.read('rna_255.fasta'), original)
            self.assertNotIn(str(source), json.dumps(result))
            with self.assertRaises(FileExistsError):
                module.prepare(source, root / 'output')

    def test_checksum_failure_produces_no_published_files(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            source, manifest, original = self.fixture(root)
            (source / 'input.fasta').write_bytes(b'>changed\nNN\n')
            with self.assertRaisesRegex(ValueError, 'checksum'):
                module.prepare(source, root / 'output')
            self.assertFalse((root / 'output').exists())

    def test_rejects_manifest_paths_outside_source(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            source, manifest, original = self.fixture(root)
            manifest['cases'][0]['input'] = '../outside.fasta'
            (root / 'outside.fasta').write_bytes(original)
            (source / 'manifest.json').write_text(json.dumps(manifest))
            with self.assertRaisesRegex(ValueError, 'outside'):
                module.prepare(source, root / 'output')


if __name__ == '__main__':
    unittest.main()
