import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';

export async function serveFixture() {
  const files = new Map([
    ['/', ['text/html; charset=utf-8', await readFile(new URL('../fixtures/stillhouse/index.html', import.meta.url))]],
    ['/style.css', ['text/css; charset=utf-8', await readFile(new URL('../fixtures/stillhouse/style.css', import.meta.url))]]
  ]);
  const server = createServer((request, response) => {
    const file = files.get(request.url);
    if (!file || !['GET', 'HEAD'].includes(request.method)) {
      response.writeHead(file ? 405 : 404).end();
      return;
    }
    response.writeHead(200, {
      'Content-Type': file[0],
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; style-src 'self'; form-action 'none'; frame-ancestors 'none'"
    });
    response.end(request.method === 'HEAD' ? undefined : file[1]);
  });
  const listening = once(server, 'listening');
  server.listen(0, '127.0.0.1');
  await listening;
  return {
    url: new URL(`http://127.0.0.1:${server.address().port}/`),
    async close() {
      await new Promise((resolve, reject) => {
        server.close(error => error ? reject(error) : resolve());
        server.closeAllConnections();
      });
    }
  };
}
