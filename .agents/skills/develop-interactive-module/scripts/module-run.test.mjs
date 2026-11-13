import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRun, main, validateRun } from './module-run.mjs';

// These are synthetic bookkeeping fixtures, never claimed as rendered chapter QA.
function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'module-evidence-test-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const directory = path.join(root, 'docs/module-runs/demo');
  fs.mkdirSync(directory, { recursive: true });
  const run = createRun('demo', 'Synthetic evidence fixture');
  run.status = 'complete';
  run.snapshotAt = new Date(Date.now() - 10000).toISOString();
  fs.writeFileSync(path.join(root, 'model.js'), 'export const capacity = n => 2 * n;\n');
  run.inputs = { '../../../model.js': crypto.createHash('sha256').update(fs.readFileSync(path.join(root, 'model.js'))).digest('hex') };
  for (const file of ['brief.md', 'research.md', 'reader-review.md']) fs.writeFileSync(path.join(directory, file), 'Synthetic test note, not source or rendered QA.');
  fs.writeFileSync(path.join(root, 'design-qa.md'), 'Synthetic test QA.');
  fs.writeFileSync(path.join(directory, 'check.log'), 'Synthetic fixture log.');
  fs.writeFileSync(path.join(directory, 'view.png'), Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64'));
  run.artifacts.push({ id: 'log', kind: 'log', path: 'check.log' }, { id: 'view', kind: 'screenshot', path: 'view.png' });
  for (const check of run.checks) Object.assign(check, {
    status: 'passed', startedAt: new Date(Date.now() - 5000).toISOString(), artifactIds: ['log', 'view'],
    ...(['model', 'conventions', 'build', 'integration'].includes(check.kind) ? { command: 'node synthetic-fixture-check.mjs', exitCode: 0 } : {}),
  });
  Object.assign(run.checks.find(check => check.kind === 'reader'), {
    route: '#demo, synthetic language/state', readingPath: ['Opening -> main mechanism -> alternatives -> return -> ending'],
    retelling: 'Synthetic reconstructed answer for validation fixtures, not an actual read-through.', frictions: [],
    artifactIds: ['reader-review', 'view'],
  });
  run.claims = [{ id: 'growth', statement: 'Synthetic capacity grows', source: 'https://example.com/fixture', locator: 'fixture', boundary: 'Synthetic only', model: 'capacity(n)', trigger: 'Increase n', expected: 'Bar grows', checkIds: ['model', 'browser'] }];
  run.journeys = [{ id: 'adjust', action: 'Change n', expected: 'capacity changes', checkIds: ['browser'] }];
  for (const review of run.reviews) Object.assign(review, { verdict: 'pass', observation: 'Synthetic reviewer observation for gate tests only.', artifactIds: ['view', 'qa'] });
  return { root, directory, run, validate: () => validateRun(run, directory, root) };
}

test('consistent synthetic record passes; fresh initialization cannot pass', t => {
  const f = fixture(t);
  assert.deepEqual(f.validate(), []);
  assert.ok(validateRun(createRun('demo', 'Pending'), f.directory, f.root).some(e => e.includes('not complete')));
});

test('changed implementation invalidates completion', t => {
  const f = fixture(t);
  fs.appendFileSync(path.join(f.root, 'model.js'), '// changed after QA\n');
  assert.ok(f.validate().some(e => e.includes('Input changed')));
});

test('missing artifacts, fake PNG and stale evidence are rejected', t => {
  const f = fixture(t);
  fs.writeFileSync(path.join(f.directory, 'view.png'), 'not an image');
  fs.utimesSync(path.join(f.directory, 'check.log'), new Date(0), new Date(0));
  f.run.checks[0].artifactIds.push('absent');
  const errors = f.validate();
  assert.ok(errors.some(e => e.includes('must be a complete PNG')));
  assert.ok(errors.some(e => e.includes('predates snapshot')));
  assert.ok(errors.some(e => e.includes('missing artifact: absent')));
});

test('checks from before snapshot and failed commands cannot pass', t => {
  const f = fixture(t);
  f.run.checks.find(c => c.kind === 'model').startedAt = new Date(0).toISOString();
  f.run.checks.find(c => c.kind === 'build').exitCode = 1;
  const errors = f.validate();
  assert.ok(errors.some(e => e.includes('must run after')));
  assert.ok(errors.some(e => e.includes('exitCode 0')));
});

test('browser failure or skip blocks completion despite passing build', t => {
  const f = fixture(t);
  const browser = f.run.checks.find(c => c.kind === 'browser');
  for (const status of ['blocked', 'skipped', 'pending', 'failed']) {
    browser.status = status;
    browser.reason = 'Browser unavailable';
    assert.ok(f.validate().some(e => e.includes('Check browser did not pass')));
  }
});

test('green local checks and reviews cannot waive a missing or unperformed reader pass', t => {
  const f = fixture(t);
  const reader = f.run.checks.find(check => check.kind === 'reader');
  for (const status of ['pending', 'skipped', 'failed', 'blocked']) {
    reader.status = status;
    assert.ok(f.validate().some(error => error.includes('Check reader did not pass')));
  }
  f.run.checks = f.run.checks.filter(check => check.kind !== 'reader');
  assert.ok(f.validate().includes('Missing check kind: reader'));
});

test('reader pass needs owner, route, continuous reading, reconstruction and inspected evidence', t => {
  const f = fixture(t);
  const reader = f.run.checks.find(check => check.kind === 'reader');
  Object.assign(reader, {reviewer: 'independent', route: '', readingPath: [], retelling: '', frictions: null, artifactIds: ['log']});
  const errors = f.validate();
  for (const message of ['performed by the owner', 'actual reader route', 'continuous reading path', 'reconstructed after reading', 'observed frictions', 'reader-review note', 'screenshot evidence']) {
    assert.ok(errors.some(error => error.includes(message)), message);
  }
});

test('a failed whole-chapter judgement blocks completion despite a filled reader record', t => {
  const f = fixture(t);
  f.run.reviews.find(review => review.area === 'teaching').verdict = 'fail';
  assert.ok(f.validate().some(error => error.includes('Review teaching needs passing observation')));
  f.run.findings.push({id:'disconnected-hierarchy',severity:'P2',status:'open',description:'Parent choice opens an unrelated explanation',checkIds:[]});
  assert.ok(f.validate().some(error => error.includes('Open blocking finding: disconnected-hierarchy')));
});

test('reader pass cannot reuse an earlier revision or stale screenshot', t => {
  const f = fixture(t);
  const reader = f.run.checks.find(check => check.kind === 'reader');
  reader.startedAt = new Date(0).toISOString();
  assert.ok(f.validate().some(error => error.includes('Check reader must run after the snapshot')));
  reader.startedAt = new Date().toISOString();
  fs.copyFileSync(path.join(f.directory,'view.png'),path.join(f.directory,'reader-old.png'));
  fs.utimesSync(path.join(f.directory,'reader-old.png'),new Date(0),new Date(0));
  f.run.artifacts.push({id:'reader-old',kind:'screenshot',path:'reader-old.png'});
  reader.artifactIds = ['reader-review','reader-old'];
  assert.ok(f.validate().some(error => error.includes('Check reader evidence predates snapshot')));
});

test('claims and journeys require successful behavioral/model evidence', t => {
  const f = fixture(t);
  f.run.claims[0].checkIds = ['conventions'];
  f.run.journeys[0].checkIds = ['visual'];
  const errors = f.validate();
  assert.ok(errors.some(e => e.includes('Claim growth needs a passed model')));
  assert.ok(errors.some(e => e.includes('Claim growth needs a passed browser')));
  assert.ok(errors.some(e => e.includes('Journey adjust needs a passed browser')));
});

test('open P2 blocks, fixed findings need regression, open P3 can be disclosed', t => {
  const f = fixture(t);
  const finding = { id: 'end-jump', severity: 'P2', status: 'open', description: 'Terminal frame jumps', checkIds: [] };
  f.run.findings.push(finding);
  assert.ok(f.validate().some(e => e.includes('Open blocking')));
  finding.status = 'fixed';
  assert.ok(f.validate().some(e => e.includes('Fixed finding end-jump needs checkIds')));
  finding.checkIds = ['browser'];
  assert.deepEqual(f.validate(), []);
  finding.status = 'open'; finding.severity = 'P3';
  assert.deepEqual(f.validate(), []);
});

test('path escapes and absolute evidence paths are rejected without reading them', t => {
  const f = fixture(t);
  f.run.artifacts.find(a => a.id === 'view').path = '../../../../outside.png';
  assert.ok(f.validate().some(e => e.includes('Path escapes repository')));
  f.run.artifacts.find(a => a.id === 'view').path = path.join(f.root, 'model.js');
  assert.ok(f.validate().some(e => e.includes('relative file path')));
});

test('null entries and malformed lists return validation errors, not exceptions', t => {
  const f = fixture(t);
  for (const key of ['checks', 'artifacts', 'claims', 'journeys', 'reviews', 'findings']) f.run[key] = [null];
  assert.ok(f.validate().length > 0);
  f.run.inputs = [];
  f.run.capabilities = 'timeline';
  assert.ok(f.validate().some(e => e.includes('must be an array')));
});

test('only redesign integration is skippable, with a reason', t => {
  const f = fixture(t);
  const check = f.run.checks.find(c => c.kind === 'integration');
  check.status = 'skipped'; check.reason = 'No integration change in this redesign';
  assert.ok(f.validate().some(e => e.includes('Check integration did not pass')));
  f.run.kind = 'redesign';
  assert.deepEqual(f.validate(), []);
  f.run.kind = 'qa';
  assert.ok(f.validate().some(e => e.includes('Check integration did not pass')));
  f.run.kind = 'redesign';
  delete check.reason;
  assert.ok(f.validate().some(e => e.includes('Check integration did not pass')));
});

test('truncated PNG magic is rejected as unreadable evidence', t => {
  const f = fixture(t);
  fs.writeFileSync(path.join(f.directory, 'view.png'), Buffer.from('89504e470d0a1a0a', 'hex'));
  assert.ok(f.validate().some(e => e.includes('must be a complete PNG')));
});

test('reviews cannot reuse stale screenshot while checks use a fresh one', t => {
  const f = fixture(t);
  fs.copyFileSync(path.join(f.directory, 'view.png'), path.join(f.directory, 'old.png'));
  fs.utimesSync(path.join(f.directory, 'old.png'), new Date(0), new Date(0));
  f.run.artifacts.push({ id: 'old', kind: 'screenshot', path: 'old.png' });
  f.run.reviews[0].artifactIds = ['old'];
  assert.ok(f.validate().some(e => e.includes('Review technical evidence predates snapshot')));
});

test('chapter identity cannot be coerced from a non-string', t => {
  const f = fixture(t);
  f.run.chapterId = ['demo'];
  assert.ok(f.validate().includes('Invalid chapterId'));
});

// Structural frame/scan fixture; this test establishes bookkeeping, not pixel decoding.
const jpegFrame = Buffer.from('ffd8ffe000104a46494600010100000100010000ffc0000b080001000101011100ffda0008010100003f0000ffd9', 'hex');
test('native JPEG framing with a matching filename is accepted', t => {
  const f = fixture(t);
  const jpg = path.join(f.directory, 'view.jpg');
  fs.writeFileSync(jpg, jpegFrame);
  f.run.artifacts.find(a => a.id === 'view').path = 'view.jpg';
  assert.deepEqual(f.validate(), []);
});

test('native image bytes with a misleading extension are rejected', t => {
  const f = fixture(t);
  fs.writeFileSync(path.join(f.directory, 'view.png'), jpegFrame);
  assert.ok(f.validate().some(e => e.includes('extension does not match jpeg')));
});

test('truncated JPEG and SOI/EOI-only magic cannot pass as screenshots', t => {
  const f = fixture(t);
  const file = path.join(f.directory, 'view.jpg');
  f.run.artifacts.find(a => a.id === 'view').path = 'view.jpg';
  for (const data of [jpegFrame.subarray(0,jpegFrame.length-2),Buffer.from('ffd8ffd9','hex')]) {
    fs.writeFileSync(file,data);
    assert.ok(f.validate().some(e => e.includes('complete PNG or JPEG')));
  }
});

test('CLI init refuses overwrite and snapshot invalidates checks/reviews', t => {
  const f = fixture(t);
  const target = path.join(f.directory, 'run.json');
  fs.writeFileSync(target, JSON.stringify(f.run));
  assert.throws(() => main(['init', 'demo', '--topic', 'Do not overwrite'], f.root), /EEXIST/);
  assert.equal(JSON.parse(fs.readFileSync(target)).topic, f.run.topic);
  const relative = file => path.relative(process.cwd(), file);
  assert.equal(main(['snapshot', relative(target), relative(path.join(f.root, 'model.js'))], f.root), 0);
  const updated = JSON.parse(fs.readFileSync(target));
  assert.equal(updated.status, 'in_progress');
  assert.ok(updated.checks.every(c => c.status === 'pending' && c.startedAt === null));
  assert.ok(updated.reviews.every(r => r.verdict === 'pending'));
  assert.equal(updated.checks.find(c => c.kind === 'reader').retelling, '');
  assert.deepEqual(updated.checks.find(c => c.kind === 'reader').readingPath, []);
  assert.ok(validateRun(updated, f.directory, f.root).length > 0);
});

test('CLI init creates pending record and rejects invalid IDs/options', t => {
  const f = fixture(t);
  assert.equal(main(['init', 'fresh-run', '--topic', 'Topic with spaces', '--kind', 'redesign'], f.root), 0);
  const record = JSON.parse(fs.readFileSync(path.join(f.root, 'docs/module-runs/fresh-run/run.json')));
  assert.equal(record.status, 'in_progress');
  assert.equal(record.topic, 'Topic with spaces');
  assert.throws(() => main(['init', '../escape', '--topic', 'Topic'], f.root));
  assert.throws(() => main(['init', 'valid', '--unknown', 'x'], f.root));
});
