# Master Cifras

Master Cifras sera um site para cadastro, organizacao e exibicao de musicas cifradas.

O projeto sera construido por partes, usando Supabase para:

- banco de dados;
- login e senha;
- controle de usuarios;
- permissoes por papel.

## Funcionalidades planejadas

- Cadastro de musicas cifradas.
- Conversao automatica para formato ChordPro.
- Cadastro e edicao de repertorios.
- Associacao de musicas a repertorios.
- Login com Supabase Auth.
- Permissoes para `admin`, `editor` e `musico`.

## Estrutura

- `src/app`: inicio da aplicacao e rotas.
- `src/components`: componentes visuais reutilizaveis.
- `src/features`: areas principais do sistema.
- `src/lib`: integracoes externas, como Supabase.
- `src/services`: acesso ao banco de dados.
- `src/utils`: funcoes auxiliares.
- `src/styles`: estilos globais.
- `supabase`: scripts e documentacao do banco.
- `docs`: explicacoes do projeto.

## Direcao de UX/UI e reestilizacao

O projeto deve evoluir visualmente sem perder a logica interna ja construida. A proposta e criar uma identidade visual propria para o Master Cifras, mantendo os mesmos modulos, permissoes, fluxos de dados, services, funcoes RPC e regras do Supabase sempre que possivel.

O foco da reestilizacao e melhorar a praticidade de uso e a aparencia geral do sistema, principalmente em dispositivos moveis. A experiencia deve ser pensada como mobile-first, pois musicos, lideres e participantes provavelmente usarao o sistema em celular ou tablet durante ensaios, cultos, apresentacoes e consultas rapidas.

### Objetivo visual

- Transformar o sistema em um aplicativo de cifras moderno, musical e atraente.
- Melhorar leitura, navegacao e velocidade de uso.
- Diferenciar areas administrativas, areas musicais e modo de execucao.
- Criar uma identidade consistente entre desktop, tablet e mobile.
- Manter a logica existente e reduzir riscos de regressao.

### Estrategia de layout

O sistema deve ter uma identidade visual unica, mas layouts adaptados por dispositivo:

- Desktop/tablet horizontal: layout mais completo, com menu lateral, topbar, busca global, paineis e listas amplas.
- Mobile/tablet vertical: layout direto, com navegacao inferior, telas em uma coluna, acoes principais faceis de tocar e foco em execucao.

O desktop tende a ser melhor para cadastro, administracao, permissoes, revisao de sugestoes, personalizacao e gerenciamento de convites. O mobile tende a ser melhor para consulta, execucao de cifras, acompanhamento de repertorios, Banda/Coral e links publicos.

### Primeira etapa planejada

A primeira etapa da reestilizacao e criar a base de identidade visual e design system do Master Cifras antes de alterar telas especificas.

Essa etapa deve definir:

- paleta de cores;
- tema claro, escuro e automatico;
- tipografia geral;
- fonte e destaque visual para cifras e acordes;
- botoes, campos, listas, cards e badges;
- estados de carregamento, erro, sucesso e vazio;
- padrao de navegacao desktop;
- padrao de navegacao mobile;
- layout base das telas administrativas;
- layout base das telas musicais;
- layout base do modo execucao.

As primeiras telas recomendadas para validar essa direcao sao:

- Dashboard em desktop e mobile;
- Lista de musicas em desktop e mobile;
- Modo execucao em desktop e mobile;
- Personalizacao, com opcoes visuais mais completas e previa do resultado.

Status inicial: a primeira camada visual foi iniciada em `src/styles/global.css`, com tokens de identidade, cores, raios, sombras, foco, botoes, campos, cards/listas, estados e ajustes mobile-first do menu. Essa etapa e uma fundacao visual e nao altera a logica dos modulos.

### Segunda etapa planejada

A segunda etapa da reestilizacao e melhorar a navegacao e o layout base do sistema. O objetivo e facilitar o acesso aos modulos principais, principalmente em dispositivos moveis, mantendo o menu geral completo como acesso secundario.

Status inicial: a navegacao mobile recebeu uma barra inferior em `src/components/layout/MainNav.js`, com atalhos para Inicio, Cifras, Repertorios, Banda e Menu. O menu geral continua existindo como painel compacto e completo. Essa etapa deve seguir sem alterar regras de negocio, services ou funcoes do Supabase.

### Terceira etapa planejada

A terceira etapa da reestilizacao e transformar o Dashboard em uma central musical mais clara e pratica. O objetivo e que a primeira tela ajude o usuario a buscar, executar e continuar rapidamente repertorios ou musicas, principalmente no celular e tablet.

Status inicial: a tela do Dashboard foi reorganizada em `src/features/dashboard/pages/DashboardPage.js` e recebeu novos estilos em `src/styles/global.css`. A tela agora tem cabecalho visual, busca principal, acoes rapidas, itens recentes e resumo do acervo. A logica de busca, selecao de musicas, execucao de repertorios e links publicos foi mantida.

### Quarta etapa planejada

A quarta etapa da reestilizacao e melhorar a tela de Cifras/Musicas como biblioteca de uso diario. O objetivo e facilitar o caminho entre buscar uma musica, executar a cifra ou abrir a edicao, com melhor leitura e botoes mais adequados para toque em celular e tablet.

Status inicial: a tela de Cifras foi reorganizada em `src/features/musicas/pages/MusicasPage.js` e recebeu novos estilos em `src/styles/global.css`. A busca continua usando a mesma logica, mas os resultados passaram a ser exibidos como cards com informacoes principais, tom, tags e acoes de executar/editar. O formulario de cadastro e revisao foi preservado.

### Quinta etapa planejada

A quinta etapa da reestilizacao e melhorar o modo de execucao da cifra. O objetivo e priorizar leitura, contraste, toque rapido e sensacao de palco, pois esta e uma das telas mais importantes durante ensaios, cultos e apresentacoes.

Status inicial: o modo de execucao de musica recebeu uma camada visual em `src/features/musicas/pages/MusicaExecucaoPage.js` e `src/styles/global.css`. A tela passou a ter cabecalho de execucao com titulo e tom em destaque, superficie de leitura mais limpa e ajustes responsivos para celular/tablet. Os controles existentes de tom, capo, fonte, tema, rolagem, tela cheia e impressao foram mantidos.

### Personalizacao futura

A area de Personalizacao deve se tornar mais completa, permitindo que o usuario ajuste a experiencia conforme seu gosto pessoal e contexto de uso.

Possibilidades futuras:

- tema claro, escuro ou automatico;
- cor principal do sistema;
- cor dos acordes;
- tamanho padrao da cifra;
- fonte das cifras;
- densidade visual da interface;
- logo do sistema;
- imagem de fundo do login;
- preferencias do modo execucao;
- preferencias de tela publica.

## Como rodar futuramente

Depois que instalarmos as dependencias:

```bash
npm install
npm run dev
```
