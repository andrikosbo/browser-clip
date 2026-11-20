#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { openBrowser } from '../src/capture.mjs';
import { record } from '../src/record.mjs';
import { toolVersions, validate } from '../src/video.mjs';

const usage = `Usage:
  browser-clip doctor
  browser-clip record [--url http://127.0.0.1:3000/] [--duration 4] [--output browser-clip-output]
  browser-clip validate <directory> [--duration 4]

The record command uses a bundled local example when --url is omitted.
The output directory must be new.`;

async function main() {
  const [action, ...args] = process.argv.slice(2);
  if (!action || action === 'help' || action === '--help') {
    console.log(usage);
    return;
  }

  if (action === 'doctor' && args.length === 0) {
    const versions = await toolVersions();
    const browser = await openBrowser();
    try {
      console.log(JSON.stringify({ node: process.version, chromium: browser.version(), ...versions }, null, 2));
    } finally {
      await browser.close();
    }
    return;
  }

  if (action === 'record') {
    const { values } = parseArgs({
      args,
      options: { url: { type: 'string' }, duration: { type: 'string' }, output: { type: 'string' } }
    });
    const result = await record(values);
    console.log(`Created clip.mp4, poster.png and clip.json in ${result.destination}`);
    return;
  }

  if (action === 'validate') {
    const { values, positionals } = parseArgs({
      args, allowPositionals: true, options: { duration: { type: 'string' } }
    });
    if (positionals.length !== 1) throw new Error('Pass the directory containing clip.mp4 and poster.png.');
    console.log(JSON.stringify(await validate(positionals[0], values.duration), null, 2));
    return;
  }

  throw new Error(usage);
}

main().catch(error => {
  console.error(`Browser Clip: ${error.message}`);
  process.exitCode = 1;
});
