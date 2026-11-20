export const frame = Object.freeze({
  width: 1280,
  height: 720,
  screen: Object.freeze({ x: 160, y: 64, width: 960, height: 540 })
});

export const fps = 24;

export function parseDuration(value = '4') {
  const seconds = Number(value);
  if (!/^(?:[2-9]|1[0-2])$/.test(String(value))) {
    throw new Error('Duration must be a whole number between 2 and 12 seconds.');
  }
  return seconds;
}

export function localPage(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error('Use a loopback URL such as http://127.0.0.1:3000/.');
  }
  if (url.protocol !== 'http:' || !['127.0.0.1', '[::1]'].includes(url.hostname) || url.username || url.password) {
    throw new Error('Only HTTP URLs on 127.0.0.1 or [::1] without credentials are supported.');
  }
  return url;
}

export function scrollPosition(index, count, distance) {
  const progress = index / (count - 1);
  const travel = Math.max(0, Math.min(1, (progress - 0.12) / 0.76));
  const eased = travel * travel * (3 - 2 * travel);
  return Math.round(eased * distance);
}
