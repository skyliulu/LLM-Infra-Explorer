#!/usr/bin/env node
// Evidence bookkeeping only. Never execute commands contained in a run record.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const scriptPath = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(scriptPath), '../../../..');
const kinds = ['research', 'model', 'browser', 'visual', 'reader', 'conventions', 'build', 'integration'];
const areas = ['technical', 'teaching', 'interaction', 'visual', 'integration'];
const capabilities = ['timeline', 'multiple-modes', 'resource-metrics', 'structural-comparison', 'data-movement', 'dense-layout', 'math'];
const nonempty = value => typeof value === 'string' && value.trim().length > 0;
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const rows = value => Array.isArray(value) ? value : [];
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
// Check structural completeness, not just a filename or magic prefix. This does
// not establish screenshot content/quality; rendered review remains necessary.
const isPng = data => {
  if (data.length < 57 || data.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') return false;
  if (data.readUInt32BE(8) !== 13 || data.toString('ascii', 12, 16) !== 'IHDR'
    || !data.readUInt32BE(16) || !data.readUInt32BE(20)) return false;
  let hasData = false;
  for (let offset = 8; offset + 12 <= data.length;) {
    const size = data.readUInt32BE(offset);
    const end = offset + size + 12;
    if (end > data.length) return false;
    const type = data.toString('ascii', offset + 4, offset + 8);
    if (type === 'IDAT' && size > 0) hasData = true;
    if (type === 'IEND') return size === 0 && hasData && end === data.length;
    offset = end;
  }
  return false;
};
const isJpeg = data => {
  if (data.length < 32 || data.readUInt16BE(0) !== 0xffd8 || data.readUInt16BE(data.length - 2) !== 0xffd9) return false;
  let offset = 2, frame = false;
  const frames = new Set([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf]);
  while (offset + 4 <= data.length) {
    if (data[offset++] !== 0xff) return false;
    while (data[offset] === 0xff) offset += 1;
    const marker = data[offset++];
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (offset + 2 > data.length) return false;
    const size = data.readUInt16BE(offset);
    if (size < 2 || offset + size > data.length) return false;
    if (frames.has(marker)) {
      if (size < 8 || !data.readUInt16BE(offset + 3) || !data.readUInt16BE(offset + 5)) return false;
      frame = true;
    }
    // Verify frame/scan framing and a terminal EOI, not decoded pixels/entropy.
    if (marker === 0xda) return frame && size >= 6 && offset + size < data.length - 2;
    offset += size;
  }
  return false;
};
const inside = (root, file) => {
  const relative = path.relative(root, file);
  return relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
};

function localFile(root, directory, relative) {
  if (!nonempty(relative) || path.isAbsolute(relative)) throw Error('Expected a relative file path');
  const file = path.resolve(directory, relative);
  if (!inside(root, file)) throw Error('Path escapes repository');
  const real = fs.realpathSync(file);
  if (!inside(fs.realpathSync(root), real)) throw Error('Symlink escapes repository');
  if (!fs.statSync(real).isFile()) throw Error('Expected a regular file');
  return real;
}

export function createRun(chapterId, topic, kind = 'create') {
  if (typeof chapterId !== 'string' || !/^[a-z][a-z0-9-]{0,63}$/.test(chapterId)) throw Error('Use a lowercase chapter ID, starting with a letter (max 64 characters)');
  if (!nonempty(topic) || !['create', 'redesign', 'qa'].includes(kind)) throw Error('Supply a topic and kind create|redesign|qa');
  return {
    schemaVersion: 1, chapterId, topic, kind, status: 'in_progress',
    nextAction: 'Resolve identity and write brief.md and research.md; then implement and verify the chapter.',
    capabilities: [], assumptions: [], inputs: {}, snapshotAt: null,
    artifacts: [
      { id: 'brief', kind: 'note', path: 'brief.md' },
      { id: 'research', kind: 'note', path: 'research.md' },
      { id: 'qa', kind: 'note', path: '../../../design-qa.md' },
      { id: 'reader-review', kind: 'note', path: 'reader-review.md' },
    ],
    claims: [], journeys: [],
    checks: kinds.map(kind => ({ id: kind, kind, status: 'pending', startedAt: null, artifactIds: [],
      ...(kind === 'reader' ? { reviewer: 'owner', route: '', readingPath: [], retelling: '', frictions: [] } : {}),
    })),
    reviews: areas.map(area => ({ area, verdict: 'pending', observation: '', artifactIds: [] })),
    findings: [],
  };
}

export function validateRun(run, directory, root = repoRoot) {
  const errors = [];
  const need = (condition, message) => { if (!condition) errors.push(message); };
  if (!object(run)) return ['Run must be an object'];
  need(run.schemaVersion === 1, 'Unsupported schemaVersion');
  need(typeof run.chapterId === 'string' && /^[a-z][a-z0-9-]{0,63}$/.test(run.chapterId), 'Invalid chapterId');
  need(nonempty(run.topic), 'Missing topic');
  need(['create', 'redesign', 'qa'].includes(run.kind), 'Invalid kind');
  need(run.status === 'complete', `Run is ${run.status || 'missing status'}, not complete`);
  for (const key of ['artifacts', 'claims', 'checks', 'journeys', 'reviews', 'findings', 'capabilities', 'assumptions']) {
    need(Array.isArray(run[key]), `${key} must be an array`);
  }
  need(rows(run.capabilities).every(value => capabilities.includes(value)), 'Unknown capability');
  need(rows(run.assumptions).every(nonempty), 'Assumptions must be nonempty strings');
  const snapshot = Date.parse(run.snapshotAt);
  need(Number.isFinite(snapshot) && snapshot <= Date.now(), 'Missing/invalid/future snapshotAt');
  need(object(run.inputs) && Object.keys(run.inputs).length > 0, 'Snapshot relevant implementation files before final checks');
  for (const [relative, digest] of Object.entries(object(run.inputs) ? run.inputs : {})) {
    try {
      need(/^[a-f0-9]{64}$/.test(digest) && hash(localFile(root, directory, relative)) === digest, `Input changed or hash invalid: ${relative}`);
    } catch (error) { errors.push(`Input ${relative}: ${error.message}`); }
  }
  const index = (entries, label) => {
    const map = new Map();
    for (const entry of entries) {
      if (!object(entry) || !nonempty(entry.id)) { errors.push(`${label} needs an id`); continue; }
      need(!map.has(entry.id), `Duplicate ${label} id: ${entry.id}`);
      map.set(entry.id, entry);
    }
    return map;
  };
  const artifacts = index(rows(run.artifacts), 'artifact');
  const files = new Map();
  for (const artifact of artifacts.values()) {
    need(['note', 'log', 'screenshot'].includes(artifact.kind), `Invalid artifact kind: ${artifact.id}`);
    try {
      const file = localFile(root, directory, artifact.path);
      const stat = fs.statSync(file);
      need(stat.size > 0, `Empty artifact: ${artifact.id}`);
      if (artifact.kind === 'screenshot') {
        const data = fs.readFileSync(file);
        const format = isPng(data) ? 'png' : isJpeg(data) ? 'jpeg' : null;
        need(format, `Screenshot must be a complete PNG or JPEG: ${artifact.id}`);
        if (format) need((format === 'png' ? ['.png'] : ['.jpg','.jpeg']).includes(path.extname(artifact.path).toLowerCase()), `Screenshot extension does not match ${format}: ${artifact.id}`);
      }
      files.set(artifact.id, { file, mtime: stat.mtimeMs });
    } catch (error) { errors.push(`Artifact ${artifact.id}: ${error.message}`); }
  }
  for (const id of ['brief', 'research', 'qa', 'reader-review']) need(artifacts.get(id)?.kind === 'note', `Missing note artifact: ${id}`);
  const artifactRefs = (entry, label, fresh = false) => {
    need(Array.isArray(entry.artifactIds) && entry.artifactIds.length > 0, `${label} needs evidence artifacts`);
    for (const id of rows(entry.artifactIds)) {
      need(artifacts.has(id), `${label} references missing artifact: ${id}`);
      if (fresh && ['log', 'screenshot'].includes(artifacts.get(id)?.kind)) {
        need(files.has(id) && files.get(id).mtime >= snapshot, `${label} evidence predates snapshot: ${id}`);
      }
    }
  };
  const checks = index(rows(run.checks), 'check');
  const isCommand = check => ['model', 'conventions', 'build', 'integration'].includes(check.kind) || nonempty(check.command);
  for (const check of checks.values()) {
    const label = `Check ${check.id}`;
    need(kinds.includes(check.kind), `${label} has unknown kind`);
    const skipped = check.status === 'skipped' && check.kind === 'integration' && run.kind === 'redesign' && nonempty(check.reason);
    need(check.status === 'passed' || skipped, `${label} did not pass (only redesign integration can be skipped with a reason)`);
    if (skipped) continue;
    const started = Date.parse(check.startedAt);
    need(Number.isFinite(started) && started >= snapshot && started <= Date.now(), `${label} must run after the snapshot`);
    artifactRefs(check, label, true);
    if (isCommand(check)) {
      need(nonempty(check.command) && check.exitCode === 0, `${label} needs an executed command and exitCode 0`);
      need(rows(check.artifactIds).some(id => artifacts.get(id)?.kind === 'log'), `${label} needs a command log`);
    }
    if (['browser', 'visual', 'reader'].includes(check.kind)) {
      need(rows(check.artifactIds).some(id => artifacts.get(id)?.kind === 'screenshot'), `${label} needs screenshot evidence`);
    }
    if (check.kind === 'reader') {
      need(check.reviewer === 'owner', `${label} must be performed by the owner`);
      need(nonempty(check.route), `${label} needs the actual reader route`);
      need(Array.isArray(check.readingPath) && check.readingPath.length > 0 && check.readingPath.every(nonempty), `${label} needs an actual continuous reading path`);
      need(nonempty(check.retelling), `${label} needs the answer reconstructed after reading`);
      need(Array.isArray(check.frictions) && check.frictions.every(nonempty), `${label} needs observed frictions (an empty array is allowed)`);
      need(rows(check.artifactIds).includes('reader-review'), `${label} needs the reader-review note`);
    }
  }
  for (const kind of kinds) need([...checks.values()].some(check => check.kind === kind), `Missing check kind: ${kind}`);
  const checkRefs = (entry, label, requiredKinds = []) => {
    need(Array.isArray(entry.checkIds) && entry.checkIds.length > 0, `${label} needs checkIds`);
    for (const id of rows(entry.checkIds)) need(checks.get(id)?.status === 'passed', `${label} references missing/non-passing check: ${id}`);
    for (const kind of requiredKinds) need(rows(entry.checkIds).some(id => checks.get(id)?.kind === kind && checks.get(id)?.status === 'passed'), `${label} needs a passed ${kind} check`);
  };
  need(rows(run.claims).length > 0, 'Declare central claims');
  for (const claim of index(rows(run.claims), 'claim').values()) {
    for (const key of ['statement', 'source', 'locator', 'boundary', 'model', 'trigger', 'expected']) need(nonempty(claim[key]), `Claim ${claim.id} needs ${key}`);
    try { need(['https:', 'http:'].includes(new URL(claim.source).protocol), `Claim ${claim.id} needs a primary-source URL`); }
    catch { errors.push(`Claim ${claim.id} has invalid source URL`); }
    checkRefs(claim, `Claim ${claim.id}`, ['model', 'browser']);
  }
  need(rows(run.journeys).length > 0, 'Declare behavioral journeys');
  for (const journey of index(rows(run.journeys), 'journey').values()) {
    need(nonempty(journey.action) && nonempty(journey.expected), `Journey ${journey.id} needs action and expected result`);
    checkRefs(journey, `Journey ${journey.id}`, ['browser']);
  }
  const reviews = new Map();
  for (const review of rows(run.reviews)) {
    if (!object(review)) { errors.push('Review must be an object'); continue; }
    need(areas.includes(review.area) && !reviews.has(review.area), `Invalid/duplicate review area: ${review.area}`);
    reviews.set(review.area, review);
    need(review.verdict === 'pass' && nonempty(review.observation), `Review ${review.area} needs passing observation`);
    artifactRefs(review, `Review ${review.area}`, true);
  }
  for (const area of areas) need(reviews.has(area), `Missing review area: ${area}`);
  for (const finding of index(rows(run.findings), 'finding').values()) {
    need(['P0', 'P1', 'P2', 'P3'].includes(finding.severity) && ['open', 'fixed'].includes(finding.status) && nonempty(finding.description), `Invalid finding: ${finding.id}`);
    need(finding.status === 'fixed' || finding.severity === 'P3', `Open blocking finding: ${finding.id}`);
    if (finding.status === 'fixed') checkRefs(finding, `Fixed finding ${finding.id}`);
  }
  return errors;
}

export function main(args, root = repoRoot) {
  const [command, target, ...rest] = args;
  if (!command || command === '--help') {
    console.log('Usage: module-run.mjs init <chapter-id> --topic <topic> [--kind create|redesign|qa]\n       module-run.mjs snapshot <run.json> <input-file>...\n       module-run.mjs verify <run.json>');
    return command ? 0 : 2;
  }
  if (command === 'init') {
    const options = {};
    for (let i = 0; i < rest.length; i += 2) {
      if (!['--topic', '--kind'].includes(rest[i]) || !nonempty(rest[i + 1])) throw Error('Invalid init options');
      options[rest[i]] = rest[i + 1];
    }
    const run = createRun(target, options['--topic'], options['--kind']);
    const directory = path.join(root, 'docs/module-runs', target);
    // Existing symlinked parents must not redirect initialization outside this repository.
    let parent = directory;
    while (!fs.existsSync(parent)) parent = path.dirname(parent);
    if (!inside(fs.realpathSync(root), fs.realpathSync(parent))) throw Error('Run directory escapes repository');
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(path.join(directory, 'run.json'), `${JSON.stringify(run, null, 2)}\n`, { flag: 'wx' });
    console.log(`Created pending run: ${path.join(directory, 'run.json')}`);
    return 0;
  }
  if (!['verify', 'snapshot'].includes(command)) throw Error('Unknown command');
  const file = localFile(root, process.cwd(), target);
  const directory = path.dirname(file);
  const run = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (command === 'snapshot') {
    if (!rest.length) throw Error('Supply relevant implementation files');
    const inputs = {};
    for (const input of rest) {
      const source = localFile(root, process.cwd(), input);
      if (source === file) throw Error('Do not snapshot the run record itself');
      inputs[path.relative(directory, source).split(path.sep).join('/')] = hash(source);
    }
    run.inputs = inputs;
    run.snapshotAt = new Date().toISOString();
    run.status = 'in_progress';
    run.nextAction = 'Run final checks on these inputs; record fresh evidence, reviews and result.';
    // Invalidate final checks explicitly; earlier evidence remains for baseline/progress inspection.
    for (const check of rows(run.checks)) if (object(check)) {
      check.status = 'pending'; check.startedAt = null;
      if (check.kind === 'reader') {
        check.readingPath = []; check.retelling = ''; check.frictions = []; check.artifactIds = [];
      }
    }
    for (const review of rows(run.reviews)) if (object(review)) review.verdict = 'pending';
    fs.writeFileSync(file, `${JSON.stringify(run, null, 2)}\n`);
    console.log(`Snapshotted ${Object.keys(inputs).length} input(s); final checks/reviews are pending.`);
    return 0;
  }
  if (rest.length) throw Error('Unexpected verify arguments');
  const errors = validateRun(run, directory, root);
  for (const error of errors) console.error(`FAIL  ${error}`);
  if (!errors.length) console.log('PASS  Run record is consistent and evidence files exist. Technical and visual truth still require review.');
  return errors.length ? 1 : 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  try { process.exitCode = main(process.argv.slice(2)); }
  catch (error) { console.error(`FAIL  ${error.message}`); process.exitCode = 2; }
}
