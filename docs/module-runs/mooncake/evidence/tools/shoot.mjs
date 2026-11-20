// Headless-Chrome capture harness for the Mooncake chapter evidence.
// Usage: node docs/module-runs/mooncake/evidence/tools/shoot.mjs [name-filter]
// Requires a dev server at http://127.0.0.1:5183 and Chrome at the default path.
import {spawn} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = 'http://127.0.0.1:5183/';
const OUT = 'docs/module-runs/mooncake/evidence';
const PORT = Number(process.env.CDP_PORT || 9341);
const USER_DATA = path.resolve('tmp/cdp-profile');
fs.mkdirSync(OUT, {recursive: true});
fs.mkdirSync(USER_DATA, {recursive: true});
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const waitForJson = async (url, timeout = 20000) => {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    try { const response = await fetch(url); if (response.ok) return response.json(); } catch {}
    await sleep(200);
  }
  throw new Error(`Timed out waiting for ${url}`);
};

class Session {
  constructor(socket) {
    this.socket = socket; this.nextId = 1; this.pending = new Map(); this.events = []; this.sessionId = null;
    socket.addEventListener('message', event => {
      const message = JSON.parse(event.data);
      if (message.id && this.pending.has(message.id)) {
        const {resolve, reject} = this.pending.get(message.id);
        this.pending.delete(message.id);
        if (message.error) reject(new Error(message.error.message)); else resolve(message.result);
      } else if (message.method) this.events.push(message);
    });
  }
  send(method, params = {}, sessionId = this.sessionId) {
    const id = this.nextId++;
    const payload = {id, method, params};
    if (sessionId) payload.sessionId = sessionId;
    return new Promise((resolve, reject) => {
      this.pending.set(id, {resolve, reject});
      this.socket.send(JSON.stringify(payload));
      setTimeout(() => { if (this.pending.has(id)) { this.pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); } }, 40000);
    });
  }
}

const evaluate = async (session, expression) => {
  const result = await session.send('Runtime.evaluate', {expression, awaitPromise: true, returnByValue: true, userGesture: true});
  if (result.exceptionDetails) throw new Error(`evaluate failed: ${result.exceptionDetails.text} :: ${expression.slice(0, 120)}`);
  return result.result?.value;
};
const waitForSelector = async (session, selector, timeout = 25000) => {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    if (await evaluate(session, `Boolean(document.querySelector(${JSON.stringify(selector)}))`)) return true;
    await sleep(200);
  }
  throw new Error(`selector never appeared: ${selector}`);
};

async function shot(session, plan) {
  const {name, width, height, lang, theme, hash = '#mooncake', full = false, scrollTo = null, actions = [], settle = 350} = plan;
  await session.send('Emulation.setDeviceMetricsOverride', {width, height, deviceScaleFactor: 1, mobile: width < 500});
  const seed = `try{localStorage.setItem('llm-infra.language','${lang}');localStorage.setItem('infra-explorer-theme','${theme}');}catch(e){}`;
  if (session.seedId) await session.send('Page.removeScriptToEvaluateOnNewDocument', {identifier: session.seedId});
  const {identifier} = await session.send('Page.addScriptToEvaluateOnNewDocument', {source: seed});
  session.seedId = identifier;
  await session.send('Page.navigate', {url: 'about:blank'});
  await sleep(120);
  await session.send('Page.navigate', {url: `${BASE}${hash}`});
  await waitForSelector(session, '[data-chapter]');
  await evaluate(session, 'document.fonts && document.fonts.ready');
  await sleep(settle);
  for (const action of actions) { await evaluate(session, action); await sleep(settle); }
  if (scrollTo) {
    await evaluate(session, `(document.querySelector(${JSON.stringify(scrollTo)})||{scrollIntoView(){}}).scrollIntoView({block:'start'})`);
    await sleep(settle);
  }
  const metrics = await evaluate(session, `(() => {
    const doc = document.documentElement, body = document.body;
    return {
      viewport: {width: innerWidth, height: innerHeight},
      contentHeight: Math.max(doc.scrollHeight, body.scrollHeight),
      documentWidth: Math.max(doc.scrollWidth, body.scrollWidth),
      overflowX: Math.max(doc.scrollWidth, body.scrollWidth) > innerWidth + 1,
      theme: doc.dataset.theme, lang: doc.lang,
      katexErrors: document.querySelectorAll('.katex-error').length,
      clippedCells: [...document.querySelectorAll('.mk-cell')].filter(el => el.textContent.trim() !== '·' && el.scrollWidth > el.clientWidth + 1).length,
      clippedNodes: [...document.querySelectorAll('.mk-node')].filter(el => el.scrollWidth > el.clientWidth + 2).length,
      sections: [...document.querySelectorAll('[data-section-anchor]')].map(el => el.dataset.sectionAnchor),
      buttons: document.querySelectorAll('[data-chapter] button').length,
      title: document.querySelector('[data-chapter] h1')?.textContent?.trim()
    };
  })()`);
  if (full) {
    const target = Math.min(Math.max(metrics.contentHeight, 900), 16000);
    await session.send('Emulation.setDeviceMetricsOverride', {width, height: target, deviceScaleFactor: 1, mobile: width < 500});
    await sleep(settle);
  }
  const {data} = await session.send('Page.captureScreenshot', {format: 'png', fromSurface: true, captureBeyondViewport: full});
  const file = path.join(OUT, `${name}.png`);
  fs.writeFileSync(file, Buffer.from(data, 'base64'));
  await session.send('Emulation.setDeviceMetricsOverride', {width, height, deviceScaleFactor: 1, mobile: width < 500});
  console.log(JSON.stringify({name, viewport: metrics.viewport, overflowX: metrics.overflowX, clippedCells: metrics.clippedCells, clippedNodes: metrics.clippedNodes, theme: metrics.theme, katexErrors: metrics.katexErrors, bytes: fs.statSync(file).size}));
  return {name, metrics, file};
}

const setRange = (section, index, value) => `(() => {
  const input = document.querySelectorAll('.mk-section')[${section}].querySelectorAll('input[type=range]')[${index}];
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  setter.call(input, '${value}');
  input.dispatchEvent(new Event('input', {bubbles: true}));
  input.dispatchEvent(new Event('change', {bubbles: true}));
})()`;
const clickNext = (section, times) => Array.from({length: times}, () => `document.querySelectorAll('.mk-section')[${section}].querySelectorAll('.mk-playback button')[2].click()`);
const clickToggle = (section, group, index) => `document.querySelectorAll('.mk-section')[${section}].querySelectorAll('.mk-toggle')[${group}].querySelectorAll('button')[${index}].click()`;

const SHARE_HASH = `#mooncake?section=mooncake-cost&setup=${encodeURIComponent(JSON.stringify({v: 1, values: {'Mooncake.mode': 'instance', 'Mooncake.poolPages': 48, 'Mooncake.cost': {medium: 'slow', hitTokens: 512, prefillRate: 24000}}}))}`;

// Section indices: 0 = arch, 1 = tiers, 2 = hit, 3 = cost
const PLAN = [
  {name: 'zh-light-1440-arch', width: 1440, height: 1180, lang: 'zh', theme: 'light', scrollTo: '[data-section-anchor="mooncake-arch"]'},
  {name: 'zh-light-1440-arch-local', width: 1440, height: 1180, lang: 'zh', theme: 'light', scrollTo: '[data-section-anchor="mooncake-arch"]', actions: [clickToggle(0, 0, 1)]},
  {name: 'zh-light-1440-arch-proxy', width: 1440, height: 1180, lang: 'zh', theme: 'light', scrollTo: '[data-section-anchor="mooncake-arch"]', actions: [clickToggle(0, 0, 2)]},
  {name: 'zh-light-1440-arch-step7', width: 1440, height: 1180, lang: 'zh', theme: 'light', scrollTo: '[data-section-anchor="mooncake-arch"]', actions: ["document.querySelectorAll('.mk-arch-steps button')[6].click()"]},
  {name: 'zh-dark-1440-arch', width: 1440, height: 1180, lang: 'zh', theme: 'dark', scrollTo: '[data-section-anchor="mooncake-arch"]'},
  {name: 'zh-system-1440-arch', width: 1440, height: 1180, lang: 'zh', theme: 'system', scrollTo: '[data-section-anchor="mooncake-arch"]'},
  {name: 'en-light-1440-arch', width: 1440, height: 1180, lang: 'en', theme: 'light', scrollTo: '[data-section-anchor="mooncake-arch"]'},
  {name: 'en-dark-900-arch', width: 900, height: 1100, lang: 'en', theme: 'dark', scrollTo: '[data-section-anchor="mooncake-arch"]'},
  {name: 'zh-light-390-arch', width: 390, height: 844, lang: 'zh', theme: 'light', scrollTo: '[data-section-anchor="mooncake-arch"]'},

  {name: 'zh-light-1440-tiers', width: 1440, height: 1180, lang: 'zh', theme: 'light', scrollTo: '[data-section-anchor="mooncake-tiers"]'},
  {name: 'zh-light-1440-tiers-round5', width: 1440, height: 1180, lang: 'zh', theme: 'light', scrollTo: '[data-section-anchor="mooncake-tiers"]', actions: ["document.querySelector('.mk-jump-btn').click()"]},
  {name: 'zh-light-1440-tiers-end', width: 1440, height: 1180, lang: 'zh', theme: 'light', scrollTo: '[data-section-anchor="mooncake-tiers"]', actions: [setRange(1, 1, 48)]},
  {name: 'zh-light-1440-tiers-instance', width: 1440, height: 1180, lang: 'zh', theme: 'light', scrollTo: '[data-section-anchor="mooncake-tiers"]', actions: [clickToggle(1, 0, 0), setRange(1, 1, 48)]},
  {name: 'zh-light-1440-tiers-pool24', width: 1440, height: 1180, lang: 'zh', theme: 'light', scrollTo: '[data-section-anchor="mooncake-tiers"]', actions: [setRange(1, 0, 24), setRange(1, 1, 48)]},
  {name: 'zh-dark-1440-tiers', width: 1440, height: 1180, lang: 'zh', theme: 'dark', scrollTo: '[data-section-anchor="mooncake-tiers"]', actions: [setRange(1, 1, 40)]},
  {name: 'en-light-1440-tiers', width: 1440, height: 1180, lang: 'en', theme: 'light', scrollTo: '[data-section-anchor="mooncake-tiers"]', actions: [setRange(1, 1, 40)]},
  {name: 'en-dark-900-tiers', width: 900, height: 1100, lang: 'en', theme: 'dark', scrollTo: '[data-section-anchor="mooncake-tiers"]', actions: [setRange(1, 1, 40)]},
  {name: 'zh-light-390-tiers', width: 390, height: 844, lang: 'zh', theme: 'light', scrollTo: '[data-section-anchor="mooncake-tiers"]', actions: [setRange(1, 1, 40)]},

  {name: 'zh-light-1440-hit', width: 1440, height: 1180, lang: 'zh', theme: 'light', scrollTo: '[data-section-anchor="mooncake-hit"]'},
  {name: 'zh-light-1440-hit-prefetch', width: 1440, height: 1180, lang: 'zh', theme: 'light', scrollTo: '[data-section-anchor="mooncake-hit"]', actions: clickNext(2, 4)},
  {name: 'zh-light-1440-hit-done', width: 1440, height: 1180, lang: 'zh', theme: 'light', scrollTo: '[data-section-anchor="mooncake-hit"]', actions: clickNext(2, 8)},
  {name: 'zh-dark-1440-hit', width: 1440, height: 1180, lang: 'zh', theme: 'dark', scrollTo: '[data-section-anchor="mooncake-hit"]', actions: clickNext(2, 6)},
  {name: 'en-light-1440-hit', width: 1440, height: 1180, lang: 'en', theme: 'light', scrollTo: '[data-section-anchor="mooncake-hit"]', actions: clickNext(2, 4)},
  {name: 'zh-light-390-hit', width: 390, height: 844, lang: 'zh', theme: 'light', scrollTo: '[data-section-anchor="mooncake-hit"]', actions: clickNext(2, 4)},
  {name: 'en-light-390-hit', width: 390, height: 844, lang: 'en', theme: 'light', scrollTo: '[data-section-anchor="mooncake-hit"]', actions: clickNext(2, 8)},

  {name: 'zh-light-1440-cost', width: 1440, height: 1180, lang: 'zh', theme: 'light', scrollTo: '[data-section-anchor="mooncake-cost"]'},
  {name: 'zh-light-1440-cost-slow', width: 1440, height: 1180, lang: 'zh', theme: 'light', scrollTo: '[data-section-anchor="mooncake-cost"]', actions: [clickToggle(3, 0, 3)]},
  {name: 'zh-light-1440-cost-ssd-lookup', width: 1440, height: 1180, lang: 'zh', theme: 'light', scrollTo: '[data-section-anchor="mooncake-cost"]', actions: [clickToggle(3, 0, 2), setRange(3, 0, 5), setRange(3, 1, 18000)]},
  {name: 'zh-dark-1440-cost', width: 1440, height: 1180, lang: 'zh', theme: 'dark', scrollTo: '[data-section-anchor="mooncake-cost"]'},
  {name: 'zh-dark-1440-cost-ssd', width: 1440, height: 1180, lang: 'zh', theme: 'dark', scrollTo: '[data-section-anchor="mooncake-cost"]', actions: [clickToggle(3, 0, 2)]},
  {name: 'en-light-1440-cost', width: 1440, height: 1180, lang: 'en', theme: 'light', scrollTo: '[data-section-anchor="mooncake-cost"]'},
  {name: 'en-dark-900-cost', width: 900, height: 1100, lang: 'en', theme: 'dark', scrollTo: '[data-section-anchor="mooncake-cost"]'},
  {name: 'zh-dark-390-cost', width: 390, height: 844, lang: 'zh', theme: 'dark', scrollTo: '[data-section-anchor="mooncake-cost"]'},

  {name: 'zh-light-1440-full', width: 1440, height: 1180, lang: 'zh', theme: 'light', full: true},
  {name: 'zh-light-1440-share-open', width: 1440, height: 860, lang: 'zh', theme: 'light', actions: [clickToggle(3, 0, 3), `document.querySelector('.site-share-button').click()`]},
  {name: 'zh-light-1440-share-load', width: 1440, height: 1180, lang: 'zh', theme: 'light', hash: SHARE_HASH, scrollTo: '[data-section-anchor="mooncake-cost"]'},
];

const waitForUrl = async (url, timeout = 25000) => {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    try { const response = await fetch(url); if (response.ok) return true; } catch {}
    await sleep(200);
  }
  throw new Error(`Timed out waiting for ${url}`);
};

const vite = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5183', '--strictPort'], {stdio: 'ignore'});
let chrome = null;
try {
  await waitForUrl(BASE);
  chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--force-device-scale-factor=1', `--remote-debugging-port=${PORT}`, `--user-data-dir=${USER_DATA}`, '--window-size=1440,1180', 'about:blank'], {stdio: 'ignore'});
  const version = await waitForJson(`http://127.0.0.1:${PORT}/json/version`);
  const socket = new WebSocket(version.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve); socket.addEventListener('error', reject); });
  const session = new Session(socket);
  const {targetId} = await session.send('Target.createTarget', {url: 'about:blank'});
  const attached = await session.send('Target.attachToTarget', {targetId, flatten: true});
  session.sessionId = attached.sessionId;
  await session.send('Page.enable');
  await session.send('Runtime.enable');
  await session.send('Log.enable');
  const selected = process.argv[2] ? PLAN.filter(plan => plan.name.includes(process.argv[2])) : PLAN;
  const results = [];
  for (const plan of selected) results.push(await shot(session, plan));
  const events = session.events.filter(event => ['Runtime.consoleAPICalled', 'Runtime.exceptionThrown', 'Log.entryAdded'].includes(event.method));
  const consoleLog = events.map(event => {
    if (event.method === 'Runtime.consoleAPICalled') return {type: event.params.type, text: event.params.args.map(arg => arg.value ?? arg.description ?? arg.type).join(' ')};
    if (event.method === 'Runtime.exceptionThrown') return {type: 'exception', text: event.params.exceptionDetails.text + ' ' + (event.params.exceptionDetails.exception?.description || '')};
    return {type: event.params.entry.level, text: event.params.entry.text};
  });
  fs.writeFileSync(path.join(OUT, 'shots.json'), JSON.stringify({base: BASE, results, console: consoleLog}, null, 2));
  const bad = consoleLog.filter(entry => ['error', 'exception', 'warning'].includes(entry.type));
  console.log(`shots: ${results.length}; console entries: ${consoleLog.length}; warnings/errors: ${bad.length}`);
  for (const entry of bad.slice(0, 10)) console.log(` - [${entry.type}] ${entry.text.slice(0, 200)}`);
  await session.send('Target.closeTarget', {targetId});
  socket.close();
} finally {
  if (chrome) chrome.kill();
  vite.kill();
}
