# Família EPC - Catálogo de músicas cifradas

Aplicação web para editar músicas em formato ChordPro, organizar repertórios e visualizar cifras para execução.

O app usa dois arquivos JSON como fonte de dados:

- `Musicas_ChordPro/Musicas_Json.json`;
- `Musicas_ChordPro/Repertorios_Json.json`.

Quando publicado na Vercel, a API do app pode ler e salvar esses arquivos diretamente no GitHub. Assim, computador, celular e outros dispositivos usam a mesma informação.

## Como executar localmente

1. Abra um terminal na pasta do projeto.
2. Execute `npm start`.
3. Acesse `http://localhost:3000`.

Sem variáveis do GitHub configuradas, o servidor local salva diretamente nos arquivos do seu computador:

- `Musicas_ChordPro/Musicas_Json.json`;
- `Musicas_ChordPro/Repertorios_Json.json`.

Se você configurar as mesmas variáveis do GitHub também no seu computador, o servidor local passa a salvar no GitHub, igual à Vercel.

## Como configurar na Vercel

Para que qualquer dispositivo leia e salve no mesmo lugar, configure a Vercel para usar a GitHub API.

### 1. Criar um token no GitHub

1. Entre no GitHub.
2. Clique na sua foto no canto superior direito.
3. Vá em `Settings`.
4. No menu esquerdo, desça até `Developer settings`.
5. Clique em `Personal access tokens`.
6. Prefira `Fine-grained tokens`.
7. Clique em `Generate new token`.
8. Escolha o repositório deste projeto.
9. Em permissões, libere `Contents` como `Read and write`.
10. Gere o token e copie o valor.

Guarde esse token com cuidado. Ele funciona como uma senha para alterar arquivos do repositório.

### 2. Criar variáveis na Vercel

No painel da Vercel:

1. Abra o projeto.
2. Vá em `Settings`.
3. Clique em `Environment Variables`.
4. Crie estas variáveis:

| Nome | Valor |
| --- | --- |
| `GITHUB_TOKEN` | o token que você copiou do GitHub |
| `GITHUB_OWNER` | seu usuário ou organização no GitHub |
| `GITHUB_REPO` | nome do repositório |
| `GITHUB_BRANCH` | normalmente `main` |

Exemplo:

```text
GITHUB_OWNER=meu-usuario
GITHUB_REPO=cifras_epc
GITHUB_BRANCH=main
```

Depois de criar as variáveis, faça um novo deploy na Vercel. Pode ser clicando em `Redeploy` no painel ou fazendo um novo `git push`.

### 3. Testar

1. Abra o site publicado na Vercel.
2. Cadastre ou altere um repertório.
3. Abra o arquivo `Musicas_ChordPro/Repertorios_Json.json` no GitHub.
4. Confira se apareceu um commit novo com a alteração.
5. Abra o site no celular e atualize a página.

Se o token e as variáveis estiverem corretos, todos os dispositivos passam a ver a mesma informação.

## Arquivos principais

- `index.html`: estrutura da aplicação.
- `styles.css`: layout e identidade visual.
- `main.js`: lógica do editor, catálogo, repertórios e visualização.
- `server.js`: backend local para desenvolvimento.
- `api/songs.js`: API da Vercel para ler e salvar o catálogo de músicas.
- `api/repertoire.js`: API da Vercel para ler e salvar repertórios.
- `lib/githubJsonStore.js`: lógica compartilhada para ler/salvar em arquivo local ou GitHub.
- `assets/guadalupe.jpg`: capa do menu principal.
- `Musicas_ChordPro/Musicas_Json.json`: catálogo inicial publicado junto com o site.
- `Musicas_ChordPro/Repertorios_Json.json`: repertórios salvos junto ao catálogo.

## Compatibilidade

Para editar e salvar os JSONs localmente, execute o backend com `npm start` e use o endereço `http://localhost:3000`.

Para editar e salvar pela Vercel, configure as variáveis do GitHub no painel da Vercel.
