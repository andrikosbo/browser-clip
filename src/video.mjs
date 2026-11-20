import { execFile } from 'node:child_process';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { fps, frame, parseDuration } from './spec.mjs';

const execute = promisify(execFile);

export async function command(program, args) {
  try {
    const { stdout } = await execute(program, args, { timeout: 120_000, maxBuffer: 4 * 1024 * 1024 });
    return stdout;
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(`${program} is required on PATH.`, { cause: error });
    }
    const detail = error.stderr?.trim().split('\n').slice(-4).join('\n');
    throw new Error(`${program} failed${detail ? `: ${detail}` : ''}`, { cause: error });
  }
}

export async function toolVersions() {
  const [encoder, probe, list] = await Promise.all([
    command('ffmpeg', ['-version']),
    command('ffprobe', ['-version']),
    command('ffmpeg', ['-hide_banner', '-encoders'])
  ]);
  if (!/\blibx264\b/.test(list)) throw new Error('Your FFmpeg build must include the libx264 encoder.');
  return { ffmpeg: encoder.split('\n')[0], ffprobe: probe.split('\n')[0] };
}

export async function compose(directory, seconds) {
  const video = join(directory, 'clip.mp4');
  const poster = join(directory, 'poster.png');
  const overlay = `[0:v][1:v]overlay=${frame.screen.x}:${frame.screen.y}:shortest=1[v]`;

  await command('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-nostdin', '-n',
    '-loop', '1', '-framerate', String(fps), '-i', join(directory, 'frame.png'),
    '-framerate', String(fps), '-start_number', '0', '-i', join(directory, 'screen-%03d.png'),
    '-filter_complex', overlay, '-map', '[v]', '-frames:v', String(seconds * fps),
    '-c:v', 'libx264', '-preset', 'fast', '-crf', '17', '-pix_fmt', 'yuv420p',
    '-map_metadata', '-1', '-movflags', '+faststart', video
  ]);
  await command('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-nostdin', '-n', '-i', video,
    '-frames:v', '1', '-threads', '1', '-map_metadata', '-1', '-update', '1', poster
  ]);
}

async function probe(file) {
  const output = await command('ffprobe', [
    '-v', 'error', '-show_streams', '-show_format', '-of', 'json', file
  ]);
  return JSON.parse(output);
}

export async function validate(directory, seconds) {
  const [video, poster] = await Promise.all([
    probe(join(directory, 'clip.mp4')),
    probe(join(directory, 'poster.png'))
  ]);
  const stream = video.streams[0];
  const still = poster.streams[0];
  const duration = Number(video.format.duration);
  const expected = seconds === undefined ? Math.round(duration) : parseDuration(seconds);
  const [rate, unit] = (stream?.avg_frame_rate ?? '').split('/').map(Number);
  if (
    video.streams.length !== 1 || stream?.codec_name !== 'h264' || stream?.codec_type !== 'video' ||
    stream.width !== frame.width || stream.height !== frame.height || stream.pix_fmt !== 'yuv420p' ||
    rate / unit !== fps || !Number.isFinite(duration) || Math.abs(duration - expected) > 1 / fps ||
    Number(stream.nb_frames) !== expected * fps || expected < 2 || expected > 12 ||
    !video.format.format_name.split(',').includes('mp4')
  ) {
    throw new Error('clip.mp4 does not match the expected silent H.264 clip, dimensions, frame rate or duration.');
  }
  if (poster.streams.length !== 1 || still?.codec_name !== 'png' || still.width !== frame.width || still.height !== frame.height) {
    throw new Error('poster.png is missing or has the wrong dimensions.');
  }

  return { width: frame.width, height: frame.height, fps, duration, frames: Number(stream.nb_frames), videoCodec: 'h264' };
}
