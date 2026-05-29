# Família EPC - Catálogo de músicas cifradas

Aplicação web local para editar músicas em formato ChordPro, organizar repertórios e visualizar cifras para execução.

## Como executar localmente

1. Abra um terminal na pasta do projeto.
2. Execute `npm start`.
3. Acesse `http://localhost:3000`.

Os salvamentos feitos pelo site sobrescrevem diretamente:

- `Musicas_ChordPro/Musicas_Json.json`;
- `Musicas_ChordPro/Repertorios_Json.json`.

Depois de salvar no site, os arquivos ficam alterados no repositório local e prontos para `git add`, `git commit` e `git push`.

## Como publicar no GitHub Pages

1. Envie todos os arquivos deste projeto para um repositório GitHub.
2. No GitHub, acesse `Settings > Pages`.
3. Em `Build and deployment`, selecione `Deploy from a branch`.
4. Escolha a branch principal (`main` ou `master`) e a pasta `/root`.
5. Salve e aguarde o link público ser gerado.

O arquivo `index.html` está na raiz do projeto, então o GitHub Pages consegue abrir o app diretamente.

## Funcionamento na nuvem

No GitHub Pages, o app roda como página estática, então serve apenas para visualização:

- o catálogo inicial é carregado de `Musicas_ChordPro/Musicas_Json.json`;
- repertórios são carregados e salvos em `Musicas_ChordPro/Repertorios_Json.json`;
- alterações nos arquivos JSON exigem o backend local deste projeto;
- o GitHub Pages não grava alterações de volta no repositório automaticamente.

## Arquivos principais

- `index.html`: estrutura da aplicação.
- `styles.css`: layout e identidade visual.
- `main.js`: lógica do editor, catálogo, repertórios e visualização.
- `server.js`: backend local que lê e sobrescreve os arquivos JSON.
- `assets/guadalupe.jpg`: capa do menu principal.
- `Musicas_ChordPro/Musicas_Json.json`: catálogo inicial publicado junto com o site.
- `Musicas_ChordPro/Repertorios_Json.json`: repertórios salvos junto ao catálogo.

## Compatibilidade

Para editar e salvar os JSONs localmente, execute o backend com `npm start` e use o endereço `http://localhost:3000`.
