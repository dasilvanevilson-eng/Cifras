const { readJson, writeJson } = require('../lib/githubJsonStore');
const { handleOptions, readJsonBody, sendJson } = require('./_utils');

module.exports = async function handler(request, response) {
  try {
    if (handleOptions(request, response)) return;

    if (request.method === 'GET') {
      const repertoire = await readJson('repertoire');
      sendJson(response, 200, repertoire && typeof repertoire === 'object' ? repertoire : { repertorios: [] });
      return;
    }

    if (request.method === 'PUT') {
      const repertoire = await readJsonBody(request);
      if (!repertoire || typeof repertoire !== 'object' || !Array.isArray(repertoire.repertorios)) {
        sendJson(response, 400, { error: 'O repertório deve ter o formato { "repertorios": [] }.' });
        return;
      }

      await writeJson('repertoire', repertoire);
      sendJson(response, 200, { ok: true });
      return;
    }

    sendJson(response, 405, { error: 'Método não permitido.' });
  } catch (error) {
    console.error(error);
    sendJson(response, 500, { error: error.message || 'Erro interno do servidor.' });
  }
};
