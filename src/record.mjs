import { constants } from 'node:fs';
import { copyFile, lstat, mkdir, mkdtemp, rm, rmdir, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { capture } from './capture.mjs';
import { serveFixture } from './fixture.mjs';
import { fps, localPage, parseDuration } from './spec.mjs';
import { compose, toolVersions, validate } from './video.mjs';

const results = ['clip.mp4', 'poster.png', 'clip.json'];

async function publish(directory, destination) {
  await mkdir(destination);
  const published = [];
  try {
    for (const name of results) {
      const target = join(destination, name);
      await copyFile(join(directory, name), target, constants.COPYFILE_EXCL);
      published.push(target);
    }
  } catch (error) {
    for (const file of published) {
      await unlink(file).catch(() => {});
    }
    await rmdir(destination).catch(() => {});
    throw error;
  }
}

export async function record({ url, duration, output }) {
  const seconds = parseDuration(duration);
  const destination = resolve(output ?? 'browser-clip-output');
  const target = url === undefined ? null : localPage(url);
  try {
    await lstat(destination);
    throw new Error('The output folder already exists. Choose a new path with --output.');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }

  const versions = await toolVersions();
  const temporary = await mkdtemp(join(tmpdir(), 'browser-clip-'));
  let fixture;
  try {
    if (!target) fixture = await serveFixture();
    const chromium = await capture(target ?? fixture.url, seconds * fps, temporary);
    await compose(temporary, seconds);
    const info = await validate(temporary, seconds);
    await writeFile(join(temporary, 'clip.json'), JSON.stringify({ ...info, engines: { chromium, ...versions } }, null, 2) + '\n');
    await mkdir(dirname(destination), { recursive: true });
    await publish(temporary, destination);
    return { ...info, destination };
  } finally {
    try {
      if (fixture) await fixture.close();
    } finally {
      await rm(temporary, { recursive: true, force: true });
    }
  }
}
