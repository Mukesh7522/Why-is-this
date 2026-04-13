import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  buildRationaleId, findRationaleForRange, writeRationaleFile, readRationaleFile
} from '../trace/rationale';

let tmpDir: string;
beforeEach(() => { tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wit-')); });
afterEach(() => { fs.rmSync(tmpDir, { recursive: true }); });

test('buildRationaleId creates deterministic id', () => {
  const id = buildRationaleId('src/payments/retry.ts', 47, 50, 'a3f91c');
  expect(id).toBe('payments-retry-47-50-a3f91c');
});

test('writeRationaleFile + readRationaleFile roundtrip', () => {
  const file: any = {
    schema: 'why-is-this/rationale@1.0', id: 'test-1',
    target: { file: 'src/a.ts', lineRange: [1, 5], contentHash: 'sha256:abc', commitAtAnnotation: 'x' },
    rationale: { author: 'a@b.com', authorGitHub: 'a', createdAt: 'now', updatedAt: 'now',
      summary: 'test', detail: 'detail', alternativesConsidered: [], constraintsAtTime: [], tags: [], stillValid: null },
    chainLinks: [],
  };
  writeRationaleFile(tmpDir, file);
  const loaded = readRationaleFile(path.join(tmpDir, '.rationale', 'test-1.json'));
  expect(loaded?.id).toBe('test-1');
});

test('findRationaleForRange finds matching file', () => {
  const file: any = {
    schema: 'why-is-this/rationale@1.0', id: 'test-2',
    target: { file: 'src/a.ts', lineRange: [10, 20], contentHash: 'x', commitAtAnnotation: 'y' },
    rationale: { author: 'x', authorGitHub: 'x', createdAt: '', updatedAt: '', summary: '', detail: '',
      alternativesConsidered: [], constraintsAtTime: [], tags: [], stillValid: null },
    chainLinks: [],
  };
  writeRationaleFile(tmpDir, file);
  const found = findRationaleForRange(tmpDir, 'src/a.ts', 15, 15);
  expect(found?.id).toBe('test-2');
});
