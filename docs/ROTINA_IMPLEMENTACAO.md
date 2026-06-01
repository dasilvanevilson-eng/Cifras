# Rotina de Implementacao - Master Cifras

Data: 2026-06-01

## 1. Posicao atual do projeto

O Master Cifras esta em fase de MVP funcional.

Ja existe:
- Base Vite com JavaScript modular.
- Autenticacao com Supabase.
- Controle inicial de papeis: `admin`, `editor`, `musico`.
- Cadastro, listagem, detalhe e edicao de musicas.
- Cadastro, listagem e detalhe de repertorios.
- Associacao de musicas ao repertorio.
- Ordenacao simples de musicas no repertorio.
- Modo execucao para visualizar o repertorio em sequencia.
- Migration de referencia com RLS.
- Conversor inicial de cifra para ChordPro.

Ainda falta para uso profissional:
- Corrigir risco de seguranca em `profiles.papel`.
- Completar CRUD de repertorios e exclusoes.
- Melhorar busca, filtros e fluxo de navegacao.
- Fortalecer o modo execucao para palco.
- Implementar ferramentas musicais centrais, como transposicao e autoscroll.
- Criar componentes UI consistentes.
- Adicionar testes e rotina de validacao.
- Preparar deploy e operacao.

Diagnostico curto:
- O projeto saiu da fase "estrutura inicial" e entrou na fase "fechar MVP utilizavel".
- A prioridade agora nao deve ser criar muitas funcionalidades novas ao mesmo tempo.
- A melhor estrategia e estabilizar seguranca, fluxo principal e experiencia de uso antes de avancar para recursos avancados.

## 2. Referencias pesquisadas

Funcionalidades observadas em produtos semelhantes:

- Cifra Club:
  - Busca forte por musicas.
  - Organizacao por artistas e estilos.
  - Cifras, tablaturas e conteudos musicais.
  - Padroes editoriais de cifragem e tablatura.
  - Ferramentas musicais como afinador e metronomo.

- Ultimate Guitar:
  - Grande catalogo de cifras, tabs e letras.
  - Favoritos com acesso offline.
  - Autoscroll.
  - Modo noturno para tocar.
  - Diagramas de acordes.
  - Busca por tipo, dificuldade, afinacao e avaliacao.
  - Controle de loop e tempo em tabs interativas.

- SongSelect / CCLI:
  - Foco em igrejas e equipes de louvor.
  - Letras, chord sheets, lead sheets e vocal sheets.
  - Transposicao.
  - Capotraste.
  - Anotacoes.
  - Compartilhamento com equipe.
  - Exportacao em PDF e ChordPro.

- Planning Center Services:
  - Planejamento de culto.
  - Escala de voluntarios.
  - Comunicacao com equipe.
  - Biblioteca de musicas.
  - Arranjos, tons e tags.
  - Importacao de letras, chord charts e arquivos de audio.

Fontes:
- https://www.cifraclub.com.br/
- https://suporte.cifraclub.com.br/pt-BR/support/solutions/articles/64000308284-conheca-o-padr%C3%A3o-de-cifragem-de-acordes-do-cifra-club
- https://play.google.com/store/apps/details?id=com.ultimateguitar.ugpro
- https://fr.ccli.com/songselect/?lang=en
- https://www.planningcenter.com/services/

## 3. Funcionalidades que mais fazem sentido para este projeto

Prioridade alta:
- Busca de musicas por titulo, artista, tom e conteudo.
- Filtros e ordenacao nas listas.
- Modo execucao com tema escuro, tela cheia, tamanho de fonte e autoscroll.
- Transposicao de acordes.
- Exportacao ou impressao limpa de repertorio.
- Metadados de culto: data, horario, local, responsavel e observacoes.
- Duplicar repertorio.
- Evitar duplicidade de musica no repertorio pela interface.
- Area admin para gerenciar usuarios e papeis.

Prioridade media:
- Favoritos.
- Repertorios recentes.
- Tags de musicas.
- Versoes por tom ou arranjo.
- Capotraste.
- Sistema numerico de acordes.
- Links de video/audio de referencia.
- Comentarios internos por musica/repertorio.

Prioridade futura:
- Diagramas de acordes.
- Metronomo.
- Afinador.
- Anexos PDF/audio.
- Offline/PWA.
- Escala completa de equipe.
- Integracoes externas.

## 4. Rotina de implementacao passo a passo

### Fase 0 - Preparacao diaria

Antes de mexer no codigo:
1. Ler `HISTORICO_CODEX.md`.
2. Conferir `RELATORIO_AVALIACAO_PROJETO.txt`.
3. Rodar `npm run build`.
4. Verificar arquivos alterados no Git.
5. Escolher apenas uma entrega pequena por vez.

Criterio para seguir:
- Build funcionando.
- Objetivo do dia definido em uma frase.

### Fase 1 - Seguranca e base do MVP

Objetivo:
- Fechar riscos que podem comprometer permissao e dados.

Passos:
1. Corrigir policy de `profiles` para impedir usuario comum de alterar o proprio `papel`.
2. Criar trigger para gerar profile automaticamente apos cadastro no Supabase Auth.
3. Adicionar `updated_at`, `created_by` e `updated_by` nas tabelas principais.
4. Revisar RLS de musicas, repertorios e associacoes.
5. Criar pagina simples de "sem permissao".
6. Criar pagina 404.

Criterio de aceite:
- Usuario `musico` nao consegue virar `admin` ou `editor`.
- `admin` continua conseguindo gerenciar perfis.
- App tem resposta clara para rota inexistente e acesso negado.

### Fase 2 - CRUD completo

Objetivo:
- Completar o ciclo basico de cadastro, edicao e remocao.

Passos:
1. Criar edicao de repertorio usando `updateRepertorio`.
2. Criar exclusao de repertorio com confirmacao.
3. Criar exclusao de musica com confirmacao.
4. Melhorar mensagens quando o Supabase retornar erro.
5. Evitar musica duplicada no repertorio antes de enviar ao banco.
6. Remover `window.location.reload` onde for possivel.

Criterio de aceite:
- Admin/editor consegue criar, editar e excluir musicas e repertorios.
- Musico apenas visualiza.
- A interface nao depende de recarregar a pagina inteira apos cada acao.

### Fase 3 - Busca e organizacao

Objetivo:
- Tornar o catalogo utilizavel quando houver muitas musicas.

Passos:
1. Adicionar campo de busca em musicas.
2. Buscar por titulo, artista, tom e trecho da cifra.
3. Adicionar ordenacao por titulo, artista, tom e data.
4. Criar empty states melhores.
5. Adicionar filtros basicos em repertorios: futuros, passados e todos.
6. Criar dashboard inicial com repertorios proximos e musicas recentes.

Criterio de aceite:
- Usuario encontra rapidamente uma musica.
- Repertorios proximos ficam visiveis sem precisar procurar manualmente.

### Fase 4 - Modo execucao para palco

Objetivo:
- Transformar o modo execucao no principal diferencial pratico.

Passos:
1. Adicionar tema escuro no modo execucao.
2. Adicionar controle de tamanho da fonte.
3. Adicionar botao de tela cheia.
4. Adicionar autoscroll com iniciar, pausar e velocidade.
5. Adicionar navegacao proxima/anterior musica.
6. Adicionar opcao de esconder/mostrar acordes.
7. Persistir preferencias do usuario no `localStorage`.

Criterio de aceite:
- Um musico consegue usar o repertorio em celular/tablet no palco.
- A leitura fica confortavel em ambiente escuro.
- Autoscroll nao atrapalha a leitura.

### Fase 5 - Ferramentas musicais essenciais

Objetivo:
- Sair de "cadastro de texto" para ferramenta musical.

Passos:
1. Melhorar parser de acordes.
2. Criar testes para acordes comuns.
3. Implementar transposicao por semitons.
4. Mostrar tom original e tom atual.
5. Adicionar capotraste.
6. Adicionar exportacao/importacao ChordPro.
7. Criar impressao limpa de musica e repertorio.

Criterio de aceite:
- Transposicao funciona com acordes maiores, menores, setimas, sustenidos, bemois e baixos.
- O usuario consegue imprimir ou exportar um repertorio.

### Fase 6 - Repertorio profissional

Objetivo:
- Aproximar o app do uso real de equipes de louvor.

Passos:
1. Adicionar tipo de evento.
2. Adicionar horario, local, responsavel e observacoes.
3. Adicionar status: rascunho, em revisao, aprovado, executado.
4. Criar duplicacao de repertorio.
5. Adicionar tags de musicas.
6. Criar versoes por arranjo/tom.
7. Adicionar comentarios internos.

Criterio de aceite:
- Lider consegue planejar um culto completo, reaproveitar repertorios e deixar observacoes para a equipe.

### Fase 7 - Admin e usuarios

Objetivo:
- Dar controle real para administradores.

Passos:
1. Criar pagina de usuarios.
2. Listar perfis.
3. Permitir admin alterar papel.
4. Permitir admin ativar/desativar usuario, se o modelo de dados for ampliado.
5. Registrar auditoria basica de alteracoes importantes.

Criterio de aceite:
- Permissoes podem ser gerenciadas sem mexer direto no Supabase.

### Fase 8 - Qualidade e deploy

Objetivo:
- Preparar o projeto para uso continuo.

Passos:
1. Adicionar ESLint e Prettier.
2. Adicionar Vitest.
3. Testar parser/conversor ChordPro.
4. Adicionar Playwright para fluxos principais.
5. Criar checklist de deploy.
6. Configurar ambiente de producao.
7. Documentar backup e restauracao.

Criterio de aceite:
- Build, lint e testes rodam antes de publicar.
- Existe documentacao suficiente para reinstalar o projeto do zero.

## 5. Ordem recomendada para a proxima execucao

Comecar por:
1. Corrigir seguranca de `profiles.papel`.
2. Completar edicao/exclusao de repertorios.
3. Adicionar exclusao de musicas.
4. Implementar busca de musicas.
5. Melhorar modo execucao com tema escuro, fonte e autoscroll.

Motivo:
- Esses pontos corrigem risco real, completam o MVP e melhoram diretamente a experiencia principal do usuario.

## 6. Rotina de trabalho com Codex

Para cada ciclo:
1. Usuario escolhe uma fase ou item.
2. Codex le arquivos relacionados.
3. Codex implementa a menor entrega completa possivel.
4. Codex roda build/testes disponiveis.
5. Codex registra a decisao em `HISTORICO_CODEX.md` quando solicitado.
6. Usuario valida visualmente no navegador ou pelo resultado gerado.

Comando util para retomar em novo chat:

```text
Leia HISTORICO_CODEX.md e docs/ROTINA_IMPLEMENTACAO.md, depois continue da proxima tarefa recomendada.
```
