const fs = require('fs/promises');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT_DIR, 'Musicas_ChordPro');

const FILES = {
  songs: {
    repoPath: 'Musicas_ChordPro/Musicas_Json.json',
    localPath: path.join(DATA_DIR, 'Musicas_Json.json'),
    fallback: [],
    commitLabel: 'catálogo de músicas',
  },
  repertoire: {
    repoPath: 'Musicas_ChordPro/Repertorios_Json.json',
    localPath: path.join(DATA_DIR, 'Repertorios_Json.json'),
    fallback: { repertorios: [] },
    commitLabel: 'repertórios',
  },
};

function getGitHubConfig() {
  return {
    token: process.env.GITHUB_TOKEN || '',
    owner: process.env.GITHUB_OWNER || '',
    repo: process.env.GITHUB_REPO || '',
    branch: process.env.GITHUB_BRANCH || 'main',
  };
}

function hasGitHubConfig() {
  const config = getGitHubConfig();
  return Boolean(config.token && config.owner && config.repo && config.branch);
}

function isVercelRuntime() {
  return Boolean(process.env.VERCEL);
}

function assertGitHubConfigForVercel() {
  if (!isVercelRuntime() || hasGitHubConfig()) return;
  throw new Error('Configure GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO e GITHUB_BRANCH nas variáveis de ambiente da Vercel.');
}

function getFileConfig(fileKey) {
  const fileConfig = FILES[fileKey];
  if (!fileConfig) {
    throw new Error(`Arquivo JSON desconhecido: ${fileKey}`);
  }
  return fileConfig;
}

async function githubRequest(url, options = {}) {
  const config = getGitHubConfig();
  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${config.token}`,
      'Content-Type': 'application/json; charset=utf-8',
      'User-Agent': 'cifras-epc-vercel',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message = data?.message || response.statusText || 'Erro na GitHub API';
    throw new Error(`GitHub API ${response.status}: ${message}`);
  }

  return data;
}

function getGitHubContentsUrl(repoPath) {
  const config = getGitHubConfig();
  const encodedPath = repoPath.split('/').map(encodeURIComponent).join('/');
  return `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${encodedPath}`;
}

async function readJsonFromGitHub(fileKey) {
  const fileConfig = getFileConfig(fileKey);
  const config = getGitHubConfig();
  const url = `${getGitHubContentsUrl(fileConfig.repoPath)}?ref=${encodeURIComponent(config.branch)}`;
  const data = await githubRequest(url);
  const content = Buffer.from(data.content || '', 'base64').toString('utf8');
  return content.trim() ? JSON.parse(content) : fileConfig.fallback;
}

async function writeJsonToGitHub(fileKey, jsonData) {
  const fileConfig = getFileConfig(fileKey);
  const config = getGitHubConfig();
  const url = getGitHubContentsUrl(fileConfig.repoPath);
  const currentFile = await githubRequest(`${url}?ref=${encodeURIComponent(config.branch)}`);
  const serialized = `${JSON.stringify(jsonData, null, 2)}\n`;

  await githubRequest(url, {
    method: 'PUT',
    body: JSON.stringify({
      message: `Atualiza ${fileConfig.commitLabel}`,
      content: Buffer.from(serialized, 'utf8').toString('base64'),
      branch: config.branch,
      sha: currentFile.sha,
    }),
  });
}

async function readJsonFromDisk(fileKey) {
  const fileConfig = getFileConfig(fileKey);
  try {
    const text = await fs.readFile(fileConfig.localPath, 'utf8');
    return text.trim() ? JSON.parse(text) : fileConfig.fallback;
  } catch (error) {
    if (error.code === 'ENOENT') return fileConfig.fallback;
    throw error;
  }
}

async function writeJsonToDisk(fileKey, jsonData) {
  const fileConfig = getFileConfig(fileKey);
  await fs.mkdir(path.dirname(fileConfig.localPath), { recursive: true });
  await fs.writeFile(fileConfig.localPath, `${JSON.stringify(jsonData, null, 2)}\n`, 'utf8');
}

async function readJson(fileKey) {
  assertGitHubConfigForVercel();
  if (hasGitHubConfig()) {
    return readJsonFromGitHub(fileKey);
  }
  return readJsonFromDisk(fileKey);
}

async function writeJson(fileKey, jsonData) {
  assertGitHubConfigForVercel();
  if (hasGitHubConfig()) {
    await writeJsonToGitHub(fileKey, jsonData);
    return;
  }
  await writeJsonToDisk(fileKey, jsonData);
}

module.exports = {
  hasGitHubConfig,
  readJson,
  writeJson,
};
