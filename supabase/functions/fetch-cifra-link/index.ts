const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Metodo nao permitido.' }, 405);
  }

  let payload: Record<string, unknown>;

  try {
    payload = await req.json();
  } catch (_error) {
    return jsonResponse({ error: 'Dados invalidos.' }, 400);
  }

  const link = String(payload?.link || '').trim();
  const validationError = validateLink(link);

  if (validationError) {
    return jsonResponse({ error: validationError }, 400);
  }

  try {
    const response = await fetch(link, {
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'User-Agent': 'MasterCifras/0.1 alternative-search',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(12000),
    });

    if (!response.ok) {
      return jsonResponse({ error: `O site respondeu com erro ${response.status}.` }, 502);
    }

    const contentType = response.headers.get('content-type') || '';

    if (contentType && !contentType.toLowerCase().includes('html')) {
      return jsonResponse({ error: 'O link informado nao retornou uma pagina HTML.' }, 415);
    }

    const html = await response.text();

    return jsonResponse({
      html,
      finalUrl: response.url,
    });
  } catch (error) {
    return jsonResponse({
      error: error instanceof Error && error.name === 'TimeoutError'
        ? 'O site demorou demais para responder.'
        : 'Nao foi possivel buscar o link pelo servidor.',
    }, 502);
  }
});

function validateLink(value: string) {
  let url: URL;

  try {
    url = new URL(value);
  } catch (_error) {
    return 'Informe um link valido.';
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    return 'Informe um link iniciado por http ou https.';
  }

  return '';
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}
