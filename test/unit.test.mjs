import assert from 'node:assert/strict';
import test from 'node:test';
import { frame, localPage, parseDuration, scrollPosition } from '../src/spec.mjs';

test('accepts whole durations from two to twelve seconds', () => {
  assert.equal(parseDuration(), 4);
  assert.equal(parseDuration('2'), 2);
  assert.equal(parseDuration('12'), 12);
  for (const invalid of ['1', '13', '2.5', '4s', '', ' 4', '04']) {
    assert.throws(() => parseDuration(invalid), /Duration must be/);
  }
});

test('allows explicit loopback HTTP URLs and rejects other origins or embedded credentials', () => {
  assert.equal(localPage('http://127.0.0.1:8080/examples').hostname, '127.0.0.1');
  assert.equal(localPage('http://[::1]:8080/').hostname, '[::1]');
  for (const url of [
    'https://127.0.0.1/', 'http://localhost/', 'http://127.0.0.2/',
    'file:///fixtures/demo.html', 'http://example.org/', 'http://example.org@127.0.0.1/'
  ]) {
    assert.throws(() => localPage(url), /Only HTTP URLs/);
  }
});

test('holds the opening and closing shots and scrolls monotonically in between', () => {
  const offsets = Array.from({ length: 96 }, (_, index) => scrollPosition(index, 96, 888));
  assert.equal(offsets[0], 0);
  assert.equal(offsets[10], 0);
  assert.ok(offsets[48] > 400 && offsets[48] < 500);
  assert.equal(offsets[85], 888);
  assert.equal(offsets[95], 888);
  assert.ok(offsets.every((offset, index) => index === 0 || offset >= offsets[index - 1]));
  assert.equal(scrollPosition(40, 96, 0), 0);
});

test('the screen stays inside the landscape frame on even pixel boundaries', () => {
  assert.equal(frame.width / frame.height, 16 / 9);
  const { x, y, width, height } = frame.screen;
  assert.ok(x > 0 && y > 0 && x + width < frame.width && y + height < frame.height);
  assert.ok([x, y, width, height].every(pixel => pixel % 2 === 0));
});
