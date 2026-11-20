import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, readFile, readdir, rm, writeFile, mkdir } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execute = promisify(execFile);
const cli = fileURLToPath(new URL('../bin/browser-clip.mjs', import.meta.url));
const run = (...args) => execute(process.execPath, [cli, ...args], { timeout: 80_000 });

async function scratch(t) {
  const folder = await mkdtemp(join(tmpdir(), 'browser-clip-test-'));
  t.after(() => rm(folder, { recursive: true, force: true }));
  return folder;
}

async function listen(t, handler) {
  const server = createServer(handler);
  const listening = once(server, 'listening');
  server.listen(0, '127.0.0.1');
  await listening;
  t.after(() => new Promise(resolve => {
    server.close(resolve);
    server.closeAllConnections();
  }));
  return `http://127.0.0.1:${server.address().port}`;
}

test('record bundles a valid video, poster and report from the synthetic fixture', { timeout: 90_000 }, async t => {
  const output = join(await scratch(t), 'fixture output');
  await run('record', '--duration', '2', '--output', output);
  assert.deepEqual((await readdir(output)).sort(), ['clip.json', 'clip.mp4', 'poster.png']);
  const { stdout } = await run('validate', output, '--duration', '2');
  assert.deepEqual(JSON.parse(stdout), {
    width: 1280, height: 720, fps: 24, duration: 2, frames: 48, videoCodec: 'h264'
  });
  const report = JSON.parse(await readFile(join(output, 'clip.json'), 'utf8'));
  assert.deepEqual(Object.keys(report.engines).sort(), ['chromium', 'ffmpeg', 'ffprobe']);
  await assert.rejects(run('validate', output, '--duration', '3'), { stderr: /does not match/ });
});

test('explicit local capture blocks cross-origin requests, redirects and writes', { timeout: 90_000 }, async t => {
  let externalRequests = 0;
  const external = await listen(t, (_request, response) => {
    externalRequests++;
    response.writeHead(200).end('Outside the recorded origin');
  });
  const requests = [];
  const fixture = await listen(t, (request, response) => {
    requests.push([request.method, request.url]);
    if (request.url === '/redirect') {
      response.writeHead(302, { Location: external + '/redirect-target' }).end();
    } else if (request.url === '/') {
      response.writeHead(200, { 'Content-Type': 'text/html' }).end(`<!doctype html>
        <main style="min-height:1100px;background:#ffe0af;color:#322236">
          <h1>Local Browser Clip test page</h1>
          <img alt="" src="${external}/foreign.png"><img alt="" src="/redirect">
          <script>fetch('/update', {method:'POST'}).catch(() => {});</script>
        </main>`);
    } else {
      response.writeHead(404).end();
    }
  });
  const output = join(await scratch(t), 'local output');
  await run('record', '--url', fixture + '/', '--duration', '2', '--output', output);
  assert.deepEqual(JSON.parse((await run('validate', output)).stdout).frames, 48);
  assert.ok(requests.some(([,path]) => path === '/redirect'));
  assert.ok(requests.every(([method]) => method === 'GET' || method === 'HEAD'));
  assert.equal(externalRequests, 0);
});

test('record preserves existing output folders and refuses non-loopback URLs', async t => {
  const folder = await scratch(t);
  const output = join(folder, 'keep');
  await mkdir(output);
  await writeFile(join(output, 'keep.txt'), 'original');
  await assert.rejects(run('record', '--output', output), { stderr: /output folder already exists/ });
  assert.equal(await readFile(join(output, 'keep.txt'), 'utf8'), 'original');
  await assert.rejects(run('record', '--url', 'https://example.org', '--output', join(folder, 'reject')), {
    stderr: /Only HTTP URLs/
  });
  assert.deepEqual(await readdir(folder), ['keep']);
});
