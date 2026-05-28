# Família EPC - Catálogo de músicas cifradas

Aplicação web estática para editar músicas em formato ChordPro, organizar repertórios e visualizar cifras para execução.

## Como publicar no GitHub Pages

1. Envie todos os arquivos deste projeto para um repositório GitHub.
2. No GitHub, acesse `Settings > Pages`.
3. Em `Build and deployment`, selecione `Deploy from a branch`.
4. Escolha a branch principal (`main` ou `master`) e a pasta `/root`.
5. Salve e aguarde o link público ser gerado.

O arquivo `index.html` está na raiz do projeto, então o GitHub Pages consegue abrir o app diretamente.

## Funcionamento na nuvem

No GitHub Pages, o app roda como página estática:

- o catálogo inicial é carregado de `Musicas_ChordPro/Musicas_Json.json`;
- repertórios, tema e preferências ficam salvos no navegador do usuário;
- alterações no arquivo de músicas exigem um navegador com File System Access API, como Chrome ou Edge, e a seleção da pasta local `Musicas_ChordPro`;
- o GitHub Pages não grava alterações de volta no repositório automaticamente.

## Arquivos principais

- `index.html`: estrutura da aplicação.
- `styles.css`: layout e identidade visual.
- `main.js`: lógica do editor, catálogo, repertórios e visualização.
- `assets/guadalupe.jpg`: capa do menu principal.
- `Musicas_ChordPro/Musicas_Json.json`: catálogo inicial publicado junto com o site.

## Compatibilidade

Para apenas visualizar o catálogo publicado, navegadores modernos devem funcionar. Para editar e salvar o JSON localmente, use Chrome ou Edge em ambiente seguro (`https://` ou `localhost`).
