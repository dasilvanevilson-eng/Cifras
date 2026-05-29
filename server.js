const http = require('http');
const fs = require('fs/promises');
const path = require('path');
const { readJson, writeJson } = require('./lib/githubJsonStore');

const PORT = Number(process.env.PORT || 3000);
const ROOT_DIR = __dirname;

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml; charset=utf-8',
};

function sendJson(response, statusCode, data) {
  response.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(data));
}

function sendText(response, statusCode, text) {
  response.writeHead(statusCode, { 'Content-Type': 'text/plain; charset=utf-8' });
  response.end(text);
}

async function readRequestBody(request) {
  let body = '';

  for await (const chunk of request) {
    body += chunk;
    if (body.length > 10 * 1024 * 1024) {
      throw new Error('Payload muito grande.');
    }
  }

  return body;
}

function resolveStaticPath(urlPath) {
  const decodedPath = decodeURIComponent(urlPath.split('?')[0]);
  const normalizedPath = decodedPath === '/' ? '/index.html' : decodedPath;
  const filePath = path.normalize(path.join(ROOT_DIR, normalizedPath));
  const relativePath = path.relative(ROOT_DIR, filePath);

  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    return null;
  }

  return filePath;
}

async function handleApi(request, response, pathname) {
  if (pathname === '/api/songs' && request.method === 'GET') {
    const songs = await readJson('songs');
    sendJson(response, 200, Array.isArray(songs) ? songs : []);
    return true;
  }

  if (pathname === '/api/songs' && request.method === 'PUT') {
    const data = JSON.parse(await readRequestBody(request));
    if (!Array.isArray(data)) {
      sendJson(response, 400, { error: 'O catálogo de músicas deve ser uma lista.' });
      return true;
    }
    await writeJson('songs', data);
    sendJson(response, 200, { ok: true });
    return true;
  }

  if (pathname === '/api/repertoire' && request.method === 'GET') {
    const repertoire = await readJson('repertoire');
    sendJson(response, 200, repertoire && typeof repertoire === 'object' ? repertoire : { repertorios: [] });
    return true;
  }

  if (pathname === '/api/repertoire' && request.method === 'PUT') {
    const data = JSON.parse(await readRequestBody(request));
    if (!data || typeof data !== 'object' || !Array.isArray(data.repertorios)) {
      sendJson(response, 400, { error: 'O repertório deve ter o formato { "repertorios": [] }.' });
      return true;
    }
    await writeJson('repertoire', data);
    sendJson(response, 200, { ok: true });
    return true;
  }

  return false;
}

async function handleStatic(response, pathname) {
  const filePath = resolveStaticPath(pathname);
  if (!filePath) {
    sendText(response, 403, 'Acesso negado.');
    return;
  }

  try {
    const content = await fs.readFile(filePath);
    const extension = path.extname(filePath).toLowerCase();
    response.writeHead(200, { 'Content-Type': MIME_TYPES[extension] || 'application/octet-stream' });
    response.end(content);
  } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'EISDIR') {
      sendText(response, 404, 'Arquivo não encontrado.');
      return;
    }
    throw error;
  }
}

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host || `localhost:${PORT}`}`);
    if (url.pathname.startsWith('/api/')) {
      const handled = await handleApi(request, response, url.pathname);
      if (!handled) sendJson(response, 404, { error: 'Endpoint não encontrado.' });
      return;
    }

    await handleStatic(response, url.pathname);
  } catch (error) {
    console.error(error);
    sendJson(response, 500, { error: 'Erro interno do servidor.' });
  }
});

server.listen(PORT, () => {
  console.log(`Cifras EPC rodando em http://localhost:${PORT}`);
});
