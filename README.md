# Master Cifras

Master Cifras e um sistema web para cadastro, organizacao, exibicao e execucao de musicas cifradas. O projeto usa Supabase para banco de dados, autenticacao, perfis de usuario, permissoes, convites publicos e funcoes RPC.

## Logica geral do sistema

- `musicas`: cadastro, edicao, busca, detalhes, letras, sugestoes e execucao de cifras.
- `repertorios`: montagem de sequencias musicais, privacidade, historico, PDF e modo de execucao.
- `banda_coral`: area para coordenar execucao com integrantes, lideranca e sincronizacao.
- `convites_publicos`: links externos para execucao de musicas, repertorios, letras e Banda/Coral.
- `usuarios`: perfis, papeis e permissoes por modulo/acao.
- `personalizacao`: configuracoes visuais globais aplicadas via CSS variables.

O principio principal do projeto e preservar a logica de negocio ja existente ao evoluir telas, estilos e fluxos de uso.

## Estrutura

- `src/app`: inicializacao, compatibilidade e rotas.
- `src/components`: layout principal, navegacao e componentes visuais reutilizaveis.
- `src/features`: telas e logica de cada area do sistema.
- `src/lib/supabase`: cliente Supabase.
- `src/services`: acesso ao banco, RPCs e regras de persistencia.
- `src/utils`: funcoes auxiliares de cifra, performance, download, senha, preferencias e player.
- `src/styles/global.css`: estilos globais, tokens visuais, responsividade e temas.
- `supabase/migrations`: evolucao do schema, policies, seeds e funcoes RPC.
- `docs`: documentacao complementar.
- `test`: testes automatizados.

## Direcao de UX/UI

A experiencia deve ser mobile-first, porque musicos, lideres e participantes tendem a usar o sistema em celular ou tablet durante ensaios, cultos, apresentacoes e consultas rapidas.

Diretrizes atuais:

- manter a mesma logica de dados, services, permissoes e RPCs sempre que possivel;
- priorizar leitura, toque rapido e contraste nos modos de execucao;
- usar desktop/tablet horizontal para administracao, cadastro e revisao;
- usar mobile/tablet vertical para consulta, execucao, repertorios, Banda/Coral e links publicos;
- manter fontes de cifras monoespacadas para evitar desalinhamento;
- aplicar configuracoes visuais globais por meio de `src/utils/systemSettings.js`.

## Estado recente

### Link publico Banda/Coral

- A migration `supabase/migrations/043_public_banda_reset_leader.sql` criou a RPC `reset_public_banda_coral_leader`.
- A RPC exige usuario autenticado e permite resetar a lideranca do convite publico Banda/Coral.
- Quando ja existe lider conectado, o integrante nao deve ver a opcao `Lider`; a acao disponivel deve ser `Resetar Lider`.
- O integrante deve seguir automaticamente o lider quando o lider ja estiver conectado ou quando conectar depois.
- O espelhamento do integrante deve tolerar ausencia de `is_stage_active`, mas respeitar `is_stage_active = false`.
- Arquivos principais:
  - `src/features/public/pages/PublicBandaCoralPage.js`;
  - `src/services/publicInvitesService.js`;
  - `supabase/migrations/043_public_banda_reset_leader.sql`.

### Personalizacao visual

- A tela `Personalizacao` possui grupos para identidade, tema, cifras e modo execucao.
- Preferencias globais incluem tema do sistema, densidade visual, cor principal, cor de destaque, cor dos acordes, fonte monoespacada, tamanho padrao das cifras, tema do modo execucao, tamanho inicial da fonte, velocidade da rolagem e preferencia por duas colunas.
- A migration `supabase/migrations/044_seed_extended_system_settings.sql` popula as chaves de configuracao estendidas.
- Os controles `A-` e `A+` no modo execucao partem do tamanho real aplicado na tela, inclusive apos ajuste automatico no mobile.

### Reestilizacao

- Dashboard, Cifras, Repertorios, modos de execucao, Sugestoes, Minha conta, Alterar senha, Acesso negado e Pagina nao encontrada receberam camada visual mais consistente.
- `src/styles/global.css` concentra tokens, temas, estados, responsividade, modo escuro automatico e densidade compacta.
- A navegacao mobile usa barra inferior em `src/components/layout/MainNav.js`.

### Permissoes e futuro comercial

- A tela de Permissoes deve evoluir para acoes reais do sistema, nao apenas permissoes genericas.
- A evolucao comercial deve vir depois das permissoes detalhadas.
- Uma estrutura futura pode incluir Admin Master, organizacoes/clientes isolados, administradores por organizacao, `organizacao_id`, RLS forte no Supabase, planos por modulo e limites de uso.

## Como rodar

```bash
npm install
npm run dev
```

## Validacao

Comandos usados nas rodadas recentes:

```bash
npm test
npm run build
```

O build pode emitir o aviso conhecido de chunks grandes do Vite.
