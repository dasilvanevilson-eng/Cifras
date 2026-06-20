# Histórico Codex — resumo de continuidade

Atualizado em: 2026-06-05

## Como retomar

Ao iniciar um novo chat, leia este arquivo, `docs/ROTINA_IMPLEMENTACAO.md`,
`docs/ARQUITETURA.md` e o estado atual do Git. Antes de alterar código, execute:

```bash
npm test
npm run build
```

## Projeto atual

- **Master Cifras**: aplicação Vite + JavaScript ES modules + Supabase JS.
- O código-fonte fica em `src/`; acesso ao Supabase em `src/services/`; schema e
  mudanças de banco em `supabase/migrations/`.
- Autenticação e permissões usam os papéis `admin`, `editor` e `musico`.
- O banco remoto deve receber as migrations do repositório, em ordem. Antes de
  criar ou aplicar uma nova migration, conferir quais já foram aplicadas no
  projeto Supabase.

## Funcionalidades entregues

- CRUD de músicas, repertórios, usuários e sugestões, com permissões por papel.
- Cifras armazenadas como original e ChordPro interno; a edição permite conferir
  a conversão antes de salvar.
- Repertórios aceitam ordenação de músicas, duplicação, privacidade, execução,
  impressão/PDF e links públicos quando habilitados.
- A música pode permanecer visível em repertórios após ter sido excluída do
  acervo; exclusões e reordenações críticas usam RPCs/migrations.
- O vínculo música–repertório possui `observacao` independente (por exemplo,
  Entrada ou Ofertório). A migration `014_add_observacao_repertorio_musicas.sql`
  foi informada como aplicada.
- Execução individual e de repertório possuem transposição, capo, tamanho de
  fonte, tema claro/escuro, rolagem automática, tela cheia, impressão, link e
  opção de duas colunas (uma coluna em telas móveis).
- O painel (`/dashboard`) permite buscar e executar músicas e repertórios.

## Convenções e decisões que não devem regredir

- O campo ChordPro é interno; a cifra original continua disponível e a
  pré-visualização pertence à inclusão/edição de música.
- Barras de execução usam `-1/2`, `Tom` e `+1/2`. Sem transposição, o status é
  `Tom`; com transposição, exibe a quantidade de semitons aplicada.
- A leitura das cifras usa fonte monoespaçada, sem quebra automática de linha e
  com rolagem horizontal quando necessário, para preservar o alinhamento dos
  acordes.
- Em repertórios, a observação pertence à associação da música, não ao cadastro
  global da música.
- Preferências de tema e tamanho de fonte de leitura são salvas no `localStorage`.
- A normalização de papéis deve continuar aceitando variações de maiúsculas e
  espaços para reconhecer administradores corretamente.

## Cuidados técnicos

- As policies/RLS do Supabase são a barreira de segurança efetiva; não confiar
  somente em bloqueios na interface.
- Ao mexer em exclusão de músicas, ordenação, convites públicos ou permissões,
  verificar as RPCs e migrations relacionadas antes de simplificar o fluxo.
- Não assumir que uma migration existente foi aplicada no Supabase remoto: validar
  o histórico de migrations do ambiente alvo.

## Próxima ação

Não há uma entrega pendente registrada. Escolher a próxima tarefa em
`docs/ROTINA_IMPLEMENTACAO.md` ou `docs/ROADMAP.md`, confirmar o estado atual
da aplicação e implementar uma entrega pequena por vez.

## Registro futuro

Adicionar somente decisões duradouras, migrations aplicadas, alterações que
exijam contexto para manutenção e validações relevantes. O Git preserva o
histórico detalhado das alterações de código.
