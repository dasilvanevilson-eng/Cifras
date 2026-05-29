function sendJson(response, statusCode, data) {
  response.statusCode = statusCode;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.end(JSON.stringify(data));
}

async function readJsonBody(request) {
  if (request.body && typeof request.body === 'object') {
    return request.body;
  }

  if (typeof request.body === 'string') {
    return JSON.parse(request.body);
  }

  let body = '';
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 10 * 1024 * 1024) {
      throw new Error('Payload muito grande.');
    }
  }

  return body ? JSON.parse(body) : null;
}

function handleOptions(request, response) {
  if (request.method !== 'OPTIONS') return false;
  response.statusCode = 204;
  response.end();
  return true;
}

module.exports = {
  handleOptions,
  readJsonBody,
  sendJson,
};
