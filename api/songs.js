const { readJson, writeJson } = require('../lib/githubJsonStore');
const { handleOptions, readJsonBody, sendJson } = require('./_utils');

module.exports = async function handler(request, response) {
  try {
    if (handleOptions(request, response)) return;

    if (request.method === 'GET') {
      const songs = await readJson('songs');
      sendJson(response, 200, Array.isArray(songs) ? songs : []);
      return;
    }

    if (request.method === 'PUT') {
      const songs = await readJsonBody(request);
      if (!Array.isArray(songs)) {
        sendJson(response, 400, { error: 'O catálogo de músicas deve ser uma lista.' });
        return;
      }

      await writeJson('songs', songs);
      sendJson(response, 200, { ok: true });
      return;
    }

    sendJson(response, 405, { error: 'Método não permitido.' });
  } catch (error) {
    console.error(error);
    sendJson(response, 500, { error: error.message || 'Erro interno do servidor.' });
  }
};
