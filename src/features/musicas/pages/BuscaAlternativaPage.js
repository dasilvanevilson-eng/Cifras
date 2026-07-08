import { createPerformanceView } from './MusicaExecucaoPage.js';

export function BuscaAlternativaPage() {
  const page = document.createElement('section');
  page.className = 'page-section';
  page.innerHTML = `
    <header class="page-header">
      <div>
        <h1>Busca alternativa</h1>
        <p data-page-info>Teste para carregar uma cifra por link e executar sem alterar o acervo.</p>
      </div>
    </header>

    <form class="panel-form alternative-search-form" data-role="alternative-search-form">
      <label>
        Link da cifra
        <input name="link" type="url" placeholder="https://..." autocomplete="url" required>
      </label>
      <div class="form-actions">
        <button class="button-link" type="submit">Buscar e executar</button>
      </div>
    </form>

    <div class="page-status" data-role="alternative-search-status" hidden></div>
    <div data-role="alternative-search-result"></div>
  `;

  const form = page.querySelector('[data-role="alternative-search-form"]');
  const status = page.querySelector('[data-role="alternative-search-status"]');
  const result = page.querySelector('[data-role="alternative-search-result"]');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const link = String(new FormData(form).get('link') || '').trim();
    if (!link) return;

    setStatus(status, 'Buscando cifra...', 'loading');
    result.replaceChildren();

    try {
      const html = await fetchHtml(link);
      const musica = parseMusicaFromHtml(html, link);

      if (!musica.cifra_exibicao) {
        throw new Error('Nao foi possivel encontrar um bloco de cifra nesta pagina.');
      }

      setStatus(status, '', '');
      status.hidden = true;
      form.hidden = true;
      result.replaceChildren(createPerformanceView({
        musica,
        returnTo: '/busca-alternativa',
        initiallyExpandedToolbar: true,
        disableSongSearch: true,
      }));
    } catch (error) {
      setStatus(
        status,
        error.message || 'Nao foi possivel buscar a cifra pelo link informado.',
        'error',
      );
    }
  });

  return page;
}

async function fetchHtml(link) {
  assertValidHttpUrl(link);

  const response = await fetch(link);
  if (!response.ok) {
    throw new Error(`O site respondeu com erro ${response.status}.`);
  }

  return response.text();
}

function parseMusicaFromHtml(html, link) {
  const document = new DOMParser().parseFromString(html, 'text/html');
  const title = getText(
    document.querySelector('h1')
      || document.querySelector('[class*="title" i]')
      || document.querySelector('title'),
  );
  const artist = getText(
    document.querySelector('h2')
      || document.querySelector('[class*="artist" i]')
      || document.querySelector('[class*="artista" i]'),
  );
  const cifra = findCifraText(document);

  return {
    id: `alternative-${Date.now()}`,
    titulo: cleanTitle(title),
    artista: cleanTitle(artist),
    tom: '-',
    musica_link: link,
    cifra_original: cifra,
    cifra_chordpro: '',
    cifra_exibicao: cifra,
  };
}

function findCifraText(document) {
  const selectors = [
    'pre',
    '[class*="cifra" i]',
    '[class*="chord" i]',
    '[id*="cifra" i]',
    '[id*="chord" i]',
  ];

  for (const selector of selectors) {
    const candidates = [...document.querySelectorAll(selector)]
      .map((element) => normalizeCifraText(element.textContent))
      .filter((text) => text.length >= 40);

    const best = candidates.sort((a, b) => scoreCifraText(b) - scoreCifraText(a))[0];
    if (best && scoreCifraText(best) > 0) return best;
  }

  return '';
}

function scoreCifraText(text) {
  const chordMatches = text.match(/\b[A-G](?:#|b)?(?:m|maj|min|sus|dim|aug|add)?\d*(?:\/[A-G](?:#|b)?)?\b/g) || [];
  const lineBreaks = text.split('\n').length;

  return chordMatches.length + Math.min(lineBreaks, 40);
}

function normalizeCifraText(value) {
  return String(value || '')
    .replace(/\r\n?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function cleanTitle(value) {
  return String(value || '').replace(/\s+/g, ' ').trim() || '-';
}

function getText(element) {
  return element?.textContent || '';
}

function assertValidHttpUrl(value) {
  let url;

  try {
    url = new URL(value);
  } catch (_error) {
    throw new Error('Informe um link valido.');
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('Informe um link iniciado por http ou https.');
  }
}

function setStatus(status, message, type) {
  status.hidden = false;
  status.className = `page-status${type ? ` ${type}` : ''}`;
  status.textContent = message;
}
