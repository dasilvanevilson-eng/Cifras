# Historico Codex

## Registro de continuidade

Data: 2026-06-01

Contexto do projeto:
- Pasta atual: `C:\Users\admin\Desktop\cifras_epc`
- Arquivo ativo no VS Code: `RELATORIO_AVALIACAO_PROJETO.txt`

Pontos principais da conversa:
- O usuario perguntou se seria possivel salvar o conteudo deste chat cada vez que o VS Code fosse fechado.
- Foi esclarecido que, usando Codex neste chat, nao ha um mecanismo confiavel para interceptar automaticamente o fechamento do VS Code e salvar a conversa.
- Foi sugerido usar um arquivo local de historico no projeto, chamado `HISTORICO_CODEX.md`, para registrar resumos ou pontos-chave sob demanda.
- O usuario perguntou onde esse arquivo ficaria salvo.
- Foi indicado que ele ficaria em `C:\Users\admin\Desktop\cifras_epc\HISTORICO_CODEX.md`, ao lado de `RELATORIO_AVALIACAO_PROJETO.txt`.
- O usuario pediu um teste para registrar pontos-chave que permitam reiniciar o chat de onde parou em uma nova abertura do VS Code.

Como retomar:
- Ao abrir um novo chat, pedir ao Codex para ler `HISTORICO_CODEX.md`.
- Continuar a partir dos pontos registrados neste arquivo.
- Quando houver uma decisao importante, pedir: "registre no historico".

Estado atual:
- Estamos testando o fluxo de registro manual de continuidade do chat.

## Registro de continuidade - persistencia do chat

Data: 2026-06-02

O usuario informou que o projeto comecou usando arquivos JSON e depois migrou para banco de dados Supabase. Apos essa migracao, ao reabrir o VS Code, o historico do chat do Codex nao fica salvo.

Diagnostico:
- Esse historico e do ambiente Codex/VS Code, nao do app Master Cifras.
- A migracao dos dados do app para Supabase nao controla a persistencia do chat da extensao.
- Nao ha, neste workspace, configuracao `.vscode`, `.codex` ou `.agents` para salvar/restaurar automaticamente conversas.
- Tambem nao ha um mecanismo confiavel para o codigo do projeto interceptar o fechamento do VS Code e copiar o conteudo completo do chat.

Solucao de continuidade adotada:
- Usar este arquivo `HISTORICO_CODEX.md` como memoria local do projeto.
- Ao final de decisoes importantes ou entregas, registrar um resumo objetivo com:
  - o que foi pedido;
  - o que foi alterado;
  - validacoes feitas;
  - proximos passos.
- Ao abrir um novo chat, pedir:

```text
Leia HISTORICO_CODEX.md e docs/ROTINA_IMPLEMENTACAO.md, depois retome o projeto de onde parou.
```

Observacao:
- Esta solucao nao recupera o texto completo de chats antigos automaticamente.
- Ela preserva o contexto util para continuar o desenvolvimento sem depender do historico interno do VS Code.

## Registro de continuidade - ajustes pos-avaliacao minuciosa

Data: 2026-06-02

Diretriz confirmada pelo usuario:
- A visualizacao/edicao do arquivo convertido para ChordPro deve permanecer na inclusao/edicao de musica.
- O objetivo e permitir que o usuario confira se a conversao ficou correta.
- Futuramente essa condicao pode mudar se a conversao ficar confiavel o bastante.

Alteracoes feitas:
- Atualizada a Edge Function `supabase/functions/create-user/index.ts`.
- O CORS agora declara `GET, POST, OPTIONS`, preservando a listagem de usuarios por `GET`.
- A funcao agora aceita `SERVICE_ROLE_KEY` ou `SUPABASE_SERVICE_ROLE_KEY`.
- Criada a migration `supabase/migrations/005_rpc_delete_musica_com_vinculos.sql`.
- A nova RPC `delete_musica_com_vinculos` remove vinculos, exclui repertorios vazios e exclui a musica em uma unica chamada transacional.
- Criada a migration `supabase/migrations/006_rpc_reorder_repertorio_musicas.sql`.
- A nova RPC `swap_repertorio_musicas_ordem` troca a ordem de duas musicas do repertorio em uma unica chamada transacional.
- Atualizados `src/services/musicasService.js` e `src/features/musicas/pages/MusicaDetalhePage.js` para usar a RPC na exclusao de musicas com vinculos.
- Atualizados `src/services/repertoriosService.js` e `src/features/repertorios/pages/RepertorioDetalhePage.js` para usar a RPC na troca de ordem.
- Criadas paginas simples `NotFoundPage` e `AccessDeniedPage` em `src/features/system/pages`.
- Atualizado `src/app/router.js` para exibir 404 em rotas inexistentes e bloquear `/usuarios` antes da pagina quando o usuario nao for admin.

Validacao:
- `npm run build` executou com sucesso.
- `npm test` executou com sucesso e exibiu `chordpro tests passed`.

Acao pendente fora do codigo local:
- Aplicar as migrations `005` e `006` no Supabase.
- Redeploy da Edge Function `create-user` para publicar o ajuste de CORS/env.

## Registro de continuidade - usuarios editar/excluir e campos extras

Data: 2026-06-02

Pedido do usuario:
- Adicionar opcao de editar/excluir em usuarios.
- Completar o cadastro de usuarios com campos `telefone` e `observacao`.
- Manter funcionalidades ja implementadas.

Alteracoes feitas:
- Criada a migration `supabase/migrations/007_add_profile_contact_fields.sql`.
- A migration adiciona `telefone` e `observacao` em `profiles`.
- Atualizada a Edge Function `supabase/functions/create-user/index.ts`.
- A funcao agora aceita `PATCH` para editar dados de usuario.
- A funcao agora aceita `DELETE` para excluir usuario pelo Supabase Auth Admin.
- A funcao impede excluir o proprio usuario.
- A funcao impede o admin remover o proprio papel de admin.
- Atualizado `src/services/usersService.js` com `updateUser` e `deleteUser`.
- Refeita a tela `src/features/usuarios/pages/UsuariosPage.js`.
- O formulario agora cadastra e edita usuarios.
- A tabela agora mostra nome, e-mail, telefone, papel, observacao e acoes.
- Cada usuario tem botoes `Editar` e `Excluir`.
- O botao excluir fica desabilitado para o proprio usuario logado.
- Adicionado estilo `.form-actions` em `src/styles/global.css`.

Validacao:
- `npm run build` executou com sucesso.
- `npm test` executou com sucesso e exibiu `chordpro tests passed`.

Acao pendente fora do codigo local:
- O usuario informou em 2026-06-02 que a migration `007_add_profile_contact_fields.sql` ja foi aplicada no Supabase.
- Fazer redeploy da Edge Function `create-user`.

## Registro de continuidade - alteracao e recuperacao de senha

Data: 2026-06-02

Pedido do usuario:
- Implementar alteracao de senha para usuarios.
- Adicionar opcao "Esqueci minha senha".

Alteracoes feitas:
- Atualizado `src/services/authService.js`.
- Adicionadas funcoes `sendPasswordResetEmail` e `updatePassword`.
- Atualizada a tela `src/features/auth/pages/LoginPage.js`.
- A tela de login agora tem botao "Esqueci minha senha".
- O botao envia e-mail de recuperacao pelo Supabase Auth usando redirect para `/alterar-senha`.
- Criada a pagina `src/features/auth/pages/AlterarSenhaPage.js`.
- A pagina permite definir nova senha ao abrir o link de recuperacao.
- Criada a pagina `src/features/auth/pages/MinhaContaPage.js`.
- Usuario logado agora pode alterar a propria senha em `/minha-conta`.
- Atualizado `src/components/layout/MainNav.js` com link "Minha conta".
- Atualizado `src/app/router.js` com rotas `/alterar-senha` e `/minha-conta`.
- `/alterar-senha` foi marcada como rota publica para funcionar a partir do link de recuperacao.

Validacao:
- `npm run build` executou com sucesso.
- `npm test` executou com sucesso e exibiu `chordpro tests passed`.

Acao pendente fora do codigo local:
- O usuario informou que liberou `http://localhost:5173/alterar-senha` no Supabase Auth.
- Quando o projeto for publicado, lembrar o usuario de adicionar `https://SEU_DOMINIO/alterar-senha` nas URLs permitidas do Supabase Auth.

## Registro de continuidade - admin redefine senha de usuario

Data: 2026-06-02

Pedido do usuario:
- Quando o admin editar um usuario, a senha tambem deve aparecer para edicao.

Observacao importante:
- A senha atual nao pode ser exibida, pois o Supabase Auth nao expõe senhas salvas.
- A edicao permite definir uma nova senha.
- Se o campo ficar em branco, a senha atual e mantida.

Alteracoes feitas:
- Atualizada a Edge Function `supabase/functions/create-user/index.ts`.
- No `PATCH`, a funcao aceita `password` opcional.
- Se `password` for informado, valida minimo de 6 caracteres e chama `admin.updateUserById`.
- Atualizada a tela `src/features/usuarios/pages/UsuariosPage.js`.
- Na edicao de usuario, o formulario agora mostra o campo `Nova senha`.
- O campo informa que deve ficar em branco para manter a senha atual.

Validacao:
- `npm run build` executou com sucesso.
- `npm test` executou com sucesso e exibiu `chordpro tests passed`.

Acao pendente fora do codigo local:
- Fazer redeploy da Edge Function `create-user` para publicar a redefinicao de senha pelo admin.

## Registro de continuidade - correcao chamada Edge Function usuarios

Data: 2026-06-02

Problema informado pelo usuario:
- Ao tentar alterar um usuario, apareceu a mensagem `Failed to send a request to the Edge Function`.

Diagnostico provavel:
- A chamada de edicao usava metodo `PATCH`.
- Mesmo com a funcao local atualizada para aceitar `PATCH`, a funcao remota pode ainda estar com a versao antiga ou o navegador pode bloquear por CORS/preflight.

Alteracoes feitas:
- Atualizado `src/services/usersService.js`.
- Edicao de usuario agora chama a Edge Function por `POST` com `action: update-user`.
- Exclusao de usuario agora chama a Edge Function por `POST` com `action: delete-user`.
- Atualizada `supabase/functions/create-user/index.ts`.
- A funcao continua aceitando `PATCH` e `DELETE`, mas tambem entende `POST` com `action`.
- Isso reduz risco de bloqueio de CORS/preflight para editar/excluir usuarios.

Validacao:
- `npm run build` executou com sucesso.
- `npm test` executou com sucesso e exibiu `chordpro tests passed`.

Acao pendente fora do codigo local:
- Fazer redeploy da Edge Function `create-user`.
- Sem redeploy, o Supabase remoto continua executando a versao antiga e o erro pode continuar.
- O usuario informou em 2026-06-02 que a migration `007_add_profile_contact_fields.sql` ja foi aplicada no Supabase.

## Registro de continuidade - estado atual Supabase usuarios

Data: 2026-06-02

Estado confirmado pelo usuario:
- A migration `007_add_profile_contact_fields.sql` ja foi aplicada no Supabase.
- Essa migration adiciona os campos `telefone` e `observacao` na tabela `profiles`.

Pendencia atual:
- Fazer redeploy da Edge Function `create-user`.
- O arquivo atual da funcao usa `SERVICE_ROLE_KEY` ou `SUPABASE_SERVICE_ROLE_KEY`.
- A funcao atual tambem aceita edicao/exclusao de usuario por `POST` com `action`, para evitar problemas de CORS com `PATCH`/`DELETE`.

Motivo da pendencia:
- Enquanto a Edge Function remota nao for redeployada, o Supabase continua executando a versao antiga.
- Isso pode manter o erro `Failed to send a request to the Edge Function` ao editar usuario.

Atualizacao:
- Em 2026-06-02 foi executado `npx supabase functions deploy create-user`.
- Deploy concluido com sucesso no projeto Supabase `bslfsilmjvtksxmcujmc`.
- Saida informada pela CLI: `Deployed Functions on project bslfsilmjvtksxmcujmc: create-user`.
- A CLI tambem exibiu `WARNING: Docker is not running`, mas o deploy foi concluido e o arquivo `supabase/functions/create-user/index.ts` foi enviado.

## Registro de continuidade - correcao current_user_role ausente

Data: 2026-06-02

Problema informado pelo usuario:
- Ao salvar um usuario, apareceu o erro `function public.current_user_role() does not exist`.

Diagnostico:
- O banco remoto nao tem a funcao `public.current_user_role()`.
- Essa funcao e usada por policies/triggers para checar o papel do usuario.
- Sem ela, operacoes em `profiles` podem falhar, inclusive edicao de usuario feita pela Edge Function.

Alteracao feita:
- Criada a migration `supabase/migrations/008_ensure_current_user_role.sql`.
- A migration cria ou substitui `public.current_user_role()`.
- A migration concede execucao para `authenticated` e `service_role`.

Validacao local:
- `npm run build` executou com sucesso.
- `npm test` executou com sucesso e exibiu `chordpro tests passed`.

Acao pendente fora do codigo local:
- Aplicar a migration `008_ensure_current_user_role.sql` no Supabase.
- Depois testar novamente salvar/editar usuario.

Atualizacao:
- O usuario aplicou/testou a correcao e informou que salvar usuario passou a funcionar corretamente.
- O erro `function public.current_user_role() does not exist` foi resolvido.

## Registro de continuidade - busca no cadastro de usuarios

Data: 2026-06-02

Pedido do usuario:
- Eliminar a tela/secao "Usuarios cadastrados".
- Criar um campo de busca entre o titulo "Usuarios" e "Novo usuario".
- Ao clicar sobre o usuario buscado, carregar seus dados para edicao.

Alteracoes feitas:
- Atualizada `src/features/usuarios/pages/UsuariosPage.js`.
- Removida a secao visual "Usuarios cadastrados".
- Adicionado campo "Buscar usuario" logo abaixo do titulo "Usuarios".
- A busca considera nome, e-mail, telefone, papel e observacao.
- Os resultados aparecem como lista suspensa de selecao.
- Ao clicar em um resultado, os dados do usuario sao carregados no formulario de edicao.
- A opcao de excluir usuario foi preservada dentro do formulario de edicao.
- O cadastro de novo usuario continua disponivel quando nenhum usuario esta selecionado.
- Atualizado `src/styles/global.css` com estilos da busca de usuarios.

Validacao:
- `npm run build` executou com sucesso.
- `npm test` executou com sucesso e exibiu `chordpro tests passed`.

Atualizacao de UX:
- O usuario pediu que a aba/lista em cascata abaixo de "Buscar usuario" so abra quando o foco estiver no campo de busca.
- Atualizada `src/features/usuarios/pages/UsuariosPage.js`.
- A lista de resultados nao abre mais automaticamente apos carregar usuarios.
- A lista abre ao focar/digitar no campo de busca.
- A lista fecha ao sair do campo, cancelar, salvar, excluir ou selecionar um usuario.
- `npm run build` e `npm test` executaram com sucesso apos o ajuste.

## Registro de continuidade - editor de cifras lado a lado

Data: 2026-06-02

Pedido do usuario:
- Na opcao "Musicas Cifradas", quando o sistema detectar que a tela permite abrir "Cifra original" e "ChordPro interno" lado a lado, deve providenciar esse layout.

Alteracoes feitas:
- Atualizado `src/features/musicas/components/MusicaForm.js`.
- O formulario agora mede o espaco disponivel do container `.cifra-editor-grid`.
- Quando o container tem largura suficiente, adiciona a classe `can-show-side-by-side`.
- Atualizado `src/styles/global.css`.
- O editor fica empilhado por padrao.
- Com a classe `can-show-side-by-side`, os campos "Cifra original" e "ChordPro interno" aparecem lado a lado.
- Em telas pequenas/mobile, o layout permanece empilhado.

Validacao:
- `npm run build` executou com sucesso.
- `npm test` executou com sucesso e exibiu `chordpro tests passed`.

Atualizacao:
- O usuario informou que, ao expandir o site no desktop, a tela "Cifra original" ainda ocupava toda a largura.
- Atualizado `src/features/musicas/components/MusicaForm.js`.
- A medicao responsiva do editor agora roda com `requestAnimationFrame` e `setTimeout(0)`, para acontecer depois que o formulario entra no layout.
- Objetivo: garantir que a classe `can-show-side-by-side` seja aplicada corretamente em desktop quando houver espaco suficiente.
- `npm run build` e `npm test` executaram com sucesso apos o ajuste.

Nova atualizacao:
- O usuario informou que "Cifra original" continuava expandindo lateralmente ate o final no desktop.
- Atualizado `src/styles/global.css`.
- Adicionada regra `@media (min-width: 980px)` para forcar `.musicas-page .cifra-editor-grid` em duas colunas.
- Essa regra independe da classe calculada via JavaScript e garante lado a lado no desktop.
- Em telas menores, o layout continua empilhado.
- `npm run build` e `npm test` executaram com sucesso apos o ajuste.

Nova correcao:
- O usuario informou que o problema persistiu.
- Atualizado novamente `src/styles/global.css`.
- O container `.cifra-editor-grid` passou de CSS Grid para Flexbox com `flex-wrap`.
- Cada editor agora usa `flex: 1 1 360px`.
- Isso faz "Cifra original" e "ChordPro interno" ficarem lado a lado quando houver espaco real, e quebrarem para baixo apenas quando nao couberem.
- Em telas pequenas, a regra mobile continua empilhando os campos.
- `npm run build` e `npm test` executaram com sucesso apos o ajuste.

Confirmacao:
- O usuario testou e informou que a correcao funcionou.

## Registro de continuidade - tabela sugestoes de musicas

Data: 2026-06-02

Pedido do usuario:
- Gerar codigo para cadastrar corretamente os campos do fluxo em que musicos enviam sugestoes de musicas.

Alteracao feita:
- Criada a migration `supabase/migrations/009_create_sugestoes_musicas.sql`.
- A tabela criada e `sugestoes_musicas`.
- Campos incluidos:
  - `id`
  - `titulo`
  - `artista`
  - `tom`
  - `cifra_original`
  - `musica_link`
  - `observacao`
  - `status`
  - `motivo_rejeicao`
  - `musica_id`
  - `enviado_por`
  - `revisado_por`
  - `created_at`
  - `reviewed_at`
- Status permitidos: `pendente`, `aprovada`, `rejeitada`.
- RLS ativado.
- Usuarios autenticados podem enviar sugestoes proprias.
- Usuarios autenticados podem ler as proprias sugestoes.
- Admin/editor podem ler todas as sugestoes.
- Admin/editor podem revisar sugestoes.
- Criados indices para `status`, `enviado_por` e `created_at`.

Acao pendente fora do codigo local:
- Aplicar a migration `009_create_sugestoes_musicas.sql` no Supabase.
- Depois criar service e telas para envio/revisao das sugestoes.

Atualizacao:
- O usuario aplicou a migration `009_create_sugestoes_musicas.sql` no Supabase.
- O SQL Editor retornou `Success. No rows returned`.
- A tabela `sugestoes_musicas` esta criada/aplicada no banco remoto.

## Registro de continuidade - telas de sugestoes de musicas

Data: 2026-06-02

Pedido do usuario:
- Seguir para a proxima etapa depois de aplicar a tabela `sugestoes_musicas`.

Alteracoes feitas:
- Criado `src/services/sugestoesMusicasService.js`.
- O service inclui:
  - `createSugestaoMusica`
  - `listMinhasSugestoes`
  - `listSugestoesPendentes`
  - `approveSugestaoMusica`
  - `rejectSugestaoMusica`
- Criada a tela `src/features/sugestoes/pages/EnviarSugestaoPage.js`.
- A tela permite usuario autenticado enviar sugestao com titulo, artista, tom, link, observacao e cifra original.
- A tela tambem mostra as proprias sugestoes e seus status.
- Criada a tela `src/features/sugestoes/pages/RevisarSugestoesPage.js`.
- Admin/editor podem ver sugestoes pendentes.
- Admin/editor podem revisar campos antes de aprovar.
- Ao aprovar, o sistema cria uma musica oficial em `musicas`, convertendo `cifra_original` para `cifra_chordpro`.
- Ao rejeitar, o sistema exige motivo de rejeicao.
- Atualizado `src/app/router.js` com:
  - `/sugestoes/enviar`
  - `/sugestoes`
- Atualizado `src/components/layout/MainNav.js`.
- Usuarios logados veem `Enviar musica`.
- Admin/editor tambem veem `Sugestoes`.

Validacao:
- `npm run build` executou com sucesso.
- `npm test` executou com sucesso e exibiu `chordpro tests passed`.

Proximo teste recomendado:
- Entrar como musico e enviar uma sugestao.
- Entrar como admin/editor e conferir se a sugestao aparece em `/sugestoes`.
- Aprovar a sugestao e conferir se a musica aparece em `Musicas Cifradas`.
- Rejeitar outra sugestao e conferir se o motivo aparece para o usuario que enviou.

Atualizacao no fluxo de aprovacao:
- O usuario pediu que, ao clicar em "Aprovar e cadastrar", o sistema abra a opcao "Musicas Cifradas" e carregue os dados da musica sugerida.
- Atualizado `src/features/sugestoes/pages/RevisarSugestoesPage.js`.
- O botao "Aprovar e cadastrar" agora salva temporariamente os dados revisados em `sessionStorage` e redireciona para `/musicas`.
- Atualizado `src/features/musicas/pages/MusicasPage.js`.
- A tela "Musicas Cifradas" agora detecta sugestao pendente em `sessionStorage` e carrega os dados no formulario de cadastro.
- Ao salvar a musica oficial, a sugestao e marcada como `aprovada` e recebe o `musica_id`.
- Atualizado `src/services/sugestoesMusicasService.js` com `markSugestaoMusicaAprovada`.
- `npm run build` e `npm test` executaram com sucesso apos o ajuste.

Atualizacao visual:
- O usuario informou que, ao abrir "Musicas Cifradas" a partir de "Sugestoes", os campos "Cifra original" e "ChordPro interno" ficavam desalinhados.
- Atualizado `src/features/musicas/components/MusicaForm.js`.
- O recalculo responsivo do editor agora roda tambem apos pequeno atraso, alem de `requestAnimationFrame` e `resize`.
- Atualizado `src/features/musicas/pages/MusicasPage.js`.
- Quando a tela abre com sugestao pendente, o app rola para o formulario depois da renderizacao.
- Objetivo: abrir o formulario vindo de sugestao com o mesmo comportamento visual de incluir/editar musica diretamente.
- `npm run build` e `npm test` executaram com sucesso apos o ajuste.

Nova atualizacao visual:
- O usuario informou que os campos "Cifra original" e "ChordPro interno" continuavam desalinhados quando a tela era aberta a partir de "Sugestoes".
- Atualizado `src/features/musicas/pages/MusicasPage.js`.
- Removido o `scrollIntoView` especifico do fluxo vindo de sugestoes, para nao criar comportamento visual diferente do fluxo normal de "Musicas Cifradas".
- Atualizado `src/styles/global.css`.
- `textarea` de cifra original e `.chordpro-editor` agora usam a mesma altura base (`height: 62vh`, `min-height: 420px`, `max-height: 72vh`) no desktop.
- No mobile, ambos usam `height: 42vh` e `min-height: 320px`.
- Objetivo: manter os dois paineis alinhados visualmente independentemente de o formulario vir de sugestao, inclusao direta ou edicao.
- `npm run build` e `npm test` executaram com sucesso apos o ajuste.

## Registro de continuidade - regra de senha com letras e numeros

Data: 2026-06-02

Contexto:
- O usuario alterou provisoriamente a senha de um musico para `123456`.
- O Google Password Manager alertou que a senha foi encontrada em violacao de dados.

Pedido do usuario:
- No cadastramento de senha, obrigar o uso de numeros e letras.

Alteracoes feitas:
- Criado `src/utils/password.js` com `validatePassword`.
- A regra exige:
  - minimo de 6 caracteres;
  - pelo menos uma letra;
  - pelo menos um numero.
- Atualizada `src/features/auth/pages/AlterarSenhaPage.js`.
- Alteracao/recuperacao de senha pelo usuario agora valida letras e numeros.
- Atualizada `src/features/usuarios/pages/UsuariosPage.js`.
- Cadastro de usuario e redefinicao de senha pelo admin agora validam letras e numeros no frontend.
- Atualizada `supabase/functions/create-user/index.ts`.
- Criacao de usuario e redefinicao de senha pelo admin tambem validam letras e numeros na Edge Function.

Validacao:
- `npm run build` executou com sucesso.
- `npm test` executou com sucesso e exibiu `chordpro tests passed`.
- Foi executado `npx supabase functions deploy create-user`.
- Deploy concluido com sucesso no projeto `bslfsilmjvtksxmcujmc`.
- A CLI exibiu `WARNING: Docker is not running`, mas o deploy foi concluido.

## Registro de continuidade - sugestoes pendentes e dados do remetente

Data: 2026-06-02

Pedido do usuario:
- A letra da opcao `Sugestoes` deve ficar em negrito enquanto houver sugestoes em aberto.
- No menu superior, no lugar do e-mail deve aparecer o nome do usuario.
- Ao receber a musica enviada por um usuario, devem vir tambem os dados de quem estava logado no momento do envio.

Alteracoes feitas:
- Criada a migration `supabase/migrations/010_add_sender_snapshot_sugestoes.sql`.
- A migration adiciona em `sugestoes_musicas`:
  - `enviado_por_nome`
  - `enviado_por_email`
  - `enviado_por_papel`
- Atualizado `src/services/sugestoesMusicasService.js`.
- Ao criar sugestao, o service envia os dados do usuario logado.
- Adicionada funcao `countSugestoesPendentes`.
- Atualizado `src/features/sugestoes/pages/EnviarSugestaoPage.js`.
- A sugestao agora salva nome, e-mail e papel do usuario logado no momento do envio.
- Atualizado `src/features/sugestoes/pages/RevisarSugestoesPage.js`.
- A lista e o formulario de revisao mostram os dados de quem enviou.
- Atualizado `src/app/startApp.js`.
- Admin/editor carregam a contagem de sugestoes pendentes no layout.
- Atualizado `src/components/layout/MainNav.js`.
- O topo agora mostra `profile.nome` no lugar do e-mail.
- A opcao `Sugestoes` recebe classe `has-pending` quando ha pendencias.
- Atualizado `src/styles/global.css`.
- `.main-nav-links a.has-pending` fica em negrito.

Validacao:
- `npm run build` executou com sucesso.
- `npm test` executou com sucesso e exibiu `chordpro tests passed`.

Acao pendente fora do codigo local:
- Aplicar a migration `010_add_sender_snapshot_sugestoes.sql` no Supabase antes de testar novo envio de sugestoes com dados do remetente.

Atualizacao:
- O usuario informou que a migration `010_add_sender_snapshot_sugestoes.sql` foi cadastrada/aplicada no Supabase.

## Registro de continuidade - organizacao tela de revisao de sugestoes

Data: 2026-06-02

Pedido do usuario:
- Ajustar a tela onde sao recebidas as sugestoes de novas musicas, pois estava baguncada.

Alteracoes feitas:
- Atualizado `src/features/sugestoes/pages/RevisarSugestoesPage.js`.
- A tela de revisao deixou de usar a classe `musica-form`, que era especifica do cadastro de musicas.
- Criado layout proprio para revisao com `suggestions-review-grid`.
- O formulario de revisao agora usa fieldsets:
  - `Dados do envio`
  - `Musica`
  - `Revisao`
- Os dados do remetente e data do envio aparecem em campos desabilitados.
- Atualizado `src/styles/global.css`.
- Adicionados estilos especificos para `.suggestions-review-grid` e `.suggestion-review-form`.
- A lista de pendentes fica em uma coluna e o formulario em outra no desktop.
- Em telas menores, o layout empilha.

Validacao:
- `npm run build` executou com sucesso.
- `npm test` executou com sucesso e exibiu `chordpro tests passed`.

## Registro de continuidade - pre-visualizacao com acordes finais

Data: 2026-06-02

Problema informado pelo usuario:
- A conversao para ChordPro esta correta.
- Na pre-visualizacao de musicas, quando ha mais de um acorde ao final de uma frase, aparecia apenas o ultimo acorde.

Diagnostico:
- O problema estava em `renderChordProForDisplay`, na funcao auxiliar `writeAt`.
- Quando mais de um acorde caia na mesma posicao visual, o acorde seguinte sobrescrevia o anterior.

Alteracoes feitas:
- Atualizado `src/utils/chordpro.js`.
- `writeAt` agora detecta colisao na posicao de escrita e posiciona o proximo acorde apos o trecho ja escrito, separado por espacos.
- Atualizado `test/chordpro.test.js`.
- Adicionado teste para `renderChordProForDisplay('GRANDE ES TU [G][D/F#][Em]')`.

Validacao:
- `npm test` executou com sucesso e exibiu `chordpro tests passed`.
- `npm run build` executou com sucesso.

## Registro de continuidade - acordes em laranja nas cifras

Data: 2026-06-02

Pedido do usuario:
- Em todos os lugares onde ha visualizacao de musicas cifradas, os acordes devem aparecer na cor laranja.

Alteracoes feitas:
- Atualizado `src/utils/chordpro.js`.
- Criada a funcao `renderCifraOriginalForDisplayHtml`.
- A funcao renderiza a cifra de forma segura e envolve linhas de acordes com `<span class="chord-line">`.
- Tambem detecta linhas de sistema numerico quando exibidas.
- Atualizado `src/features/musicas/pages/MusicaDetalhePage.js`.
- Atualizado `src/features/musicas/pages/MusicaExecucaoPage.js`.
- Atualizado `src/features/repertorios/pages/RepertorioExecucaoPage.js`.
- Atualizado `src/features/musicas/components/MusicaForm.js`.
- A pre-visualizacao do formulario tambem passa a destacar os acordes.
- Atualizado `src/styles/global.css` com `.chord-line { color: #c8792b; }`.
- Atualizado `test/chordpro.test.js` com teste da renderizacao HTML dos acordes.

Validacao:
- `npm test` executou com sucesso e exibiu `chordpro tests passed`.
- `npm run build` executou com sucesso.

## Registro de continuidade - visualizacao unica igual a pre-visualizacao

Data: 2026-06-02

Diretriz do usuario:
- Em todas as partes do sistema em que as cifras sao exibidas de alguma forma, o conteudo visto deve ser sempre identico ao da pre-visualizacao.

Alteracoes feitas:
- Atualizado `src/utils/chordpro.js`.
- Criada a funcao `renderCifraOriginalPreviewHtml`.
- Essa funcao converte a cifra original para ChordPro internamente, renderiza para display e aplica o HTML seguro com acordes destacados.
- Atualizado `src/features/musicas/pages/MusicaDetalhePage.js`.
- Atualizado `src/features/musicas/pages/MusicaExecucaoPage.js`.
- Atualizado `src/features/repertorios/pages/RepertorioExecucaoPage.js`.
- As exibicoes de cifra nessas telas agora usam o mesmo resultado visual da pre-visualizacao.
- A visualizacao em sistema numerico continua usando renderizacao propria com destaque de acordes/numeros.
- Atualizado `test/chordpro.test.js` com teste para `renderCifraOriginalPreviewHtml`.

Validacao:
- `npm test` executou com sucesso e exibiu `chordpro tests passed`.
- `npm run build` executou com sucesso.

## Registro de continuidade - sincronizacao Cifra original e ChordPro interno

Data: 2026-06-02

Problema informado pelo usuario:
- A conversao estava acontecendo corretamente.
- Porem, ao sair da tela/campo de "Cifra original" e retornar novamente, ela perdia a conexao com "ChordPro interno".

Diagnostico:
- O formulario usava uma flag booleana simples para saber se o ChordPro interno tinha sido editado manualmente.
- Esse estado podia ficar fragil depois de alternar foco entre os campos.

Alteracao feita:
- Atualizado `src/features/musicas/components/MusicaForm.js`.
- A sincronizacao agora compara o conteudo atual do ChordPro com o ultimo ChordPro gerado automaticamente.
- Se o ChordPro interno ainda estiver igual ao ultimo gerado automaticamente, ele continua acompanhando alteracoes da "Cifra original".
- Se o usuario editar manualmente o ChordPro interno, o sistema preserva essa edicao e para de sobrescrever automaticamente.

Validacao:
- `npm run build` executou com sucesso.
- `npm test` executou com sucesso e exibiu `chordpro tests passed`.

## Registro de continuidade - avaliacao do projeto

Data: 2026-06-01

O usuario pediu para avaliar a posicao atual do projeto, pesquisar funcoes usadas em outros sites/aplicativos e criar uma rotina de implementacao passo a passo.

Foi criado o documento `docs/ROTINA_IMPLEMENTACAO.md` com:
- Diagnostico da posicao atual: MVP funcional, ainda antes de uso profissional continuo.
- Referencias pesquisadas: Cifra Club, Ultimate Guitar, SongSelect/CCLI e Planning Center Services.
- Funcionalidades mais adequadas ao Master Cifras.
- Rotina de implementacao em fases: seguranca, CRUD completo, busca, modo execucao, ferramentas musicais, repertorio profissional, admin/usuarios, qualidade/deploy.
- Ordem recomendada para a proxima execucao:
  1. Corrigir seguranca de `profiles.papel`.
  2. Completar edicao/exclusao de repertorios.
  3. Adicionar exclusao de musicas.
  4. Implementar busca de musicas.
  5. Melhorar modo execucao com tema escuro, fonte e autoscroll.

Para retomar em novo chat:
- Pedir ao Codex: "Leia HISTORICO_CODEX.md e docs/ROTINA_IMPLEMENTACAO.md, depois continue da proxima tarefa recomendada."

## Registro de continuidade - primeiro passo executado

Data: 2026-06-01

O usuario pediu para executar o primeiro passo da rotina recomendada: corrigir a seguranca de `profiles.papel`.

Alteracoes feitas:
- Atualizado `supabase/migrations/001_reference_schema.sql`.
- Criado `supabase/migrations/002_fix_profiles_role_escalation.sql`.
- A nova migration cria a funcao `public.prevent_profile_role_escalation()`.
- A nova migration cria o trigger `prevent_profile_role_escalation` em `profiles`.
- O trigger bloqueia alteracao de `papel` quando o usuario atual nao for `admin`.
- `service_role` foi liberado para rotinas administrativas do Supabase.

Validacao:
- O SQL foi revisado por leitura.
- `npm run build` foi tentado, mas nao iniciou por falha do sandbox do Windows: `windows sandbox: spawn setup refresh`.

Proximo passo recomendado:
- Aplicar a migration `supabase/migrations/002_fix_profiles_role_escalation.sql` no Supabase.
- Depois seguir para "Completar edicao/exclusao de repertorios".

## Registro de continuidade - CRUD de repertorios

Data: 2026-06-01

O usuario confirmou que a migration de seguranca foi aplicada no Supabase e pediu para seguir para o proximo item da rotina.

Alteracoes feitas:
- Criado `src/features/repertorios/pages/RepertorioEditarPage.js`.
- Registrada a rota `/repertorios/editar` em `src/app/router.js`.
- Atualizado `src/features/repertorios/components/RepertorioForm.js` para aceitar `initialValues`, `submitLabel` e `keepValuesAfterSubmit`.
- Adicionado `deleteRepertorio` em `src/services/repertoriosService.js`.
- Atualizado `src/features/repertorios/pages/RepertorioDetalhePage.js` com acoes de editar e excluir repertorio para admin/editor.
- A exclusao de repertorio pede confirmacao e redireciona para `/repertorios`.
- O seletor de musicas do repertorio agora desabilita musicas ja adicionadas e mostra erro se houver tentativa de duplicidade.
- Adicionado estilo `.button-link.secondary` em `src/styles/global.css`.

Validacao:
- `npm run build` executou com sucesso.
- Build gerado com 66 modulos transformados.
- Bundle JS: 236.56 kB, gzip 60.41 kB.

Proximo passo recomendado:
- Testar visualmente no navegador: editar um repertorio, excluir um repertorio de teste e tentar adicionar musica duplicada.
- Depois seguir para "Adicionar exclusao de musicas".

## Registro de continuidade - exclusao de musicas

Data: 2026-06-01

O usuario informou que os testes de repertorio foram feitos e estavam funcionando, depois pediu para seguir ao proximo item.

Alteracoes feitas:
- Atualizado `src/features/musicas/pages/MusicaDetalhePage.js`.
- Adicionado botao "Excluir" na pagina de detalhe da musica para admin/editor.
- A exclusao pede confirmacao antes de apagar.
- Apos excluir com sucesso, o usuario e redirecionado para `/musicas`.
- Quando o Supabase retorna erro `23503`, a interface informa que a musica esta vinculada a repertorios e precisa ser removida deles antes da exclusao.

Validacao:
- `npm run build` executou com sucesso.
- Build gerado com 66 modulos transformados.
- Bundle JS: 237.31 kB, gzip 60.55 kB.

Proximo passo recomendado:
- Testar visualmente excluir uma musica sem repertorio.
- Testar tentar excluir uma musica vinculada a repertorio e confirmar a mensagem de bloqueio.
- Depois seguir para "Implementar busca de musicas".

## Registro de continuidade - correcao da exclusao de musicas vinculadas

Data: 2026-06-01

O usuario testou a exclusao de musicas e informou que uma musica vinculada a repertorio tambem foi excluida normalmente.

Diagnostico:
- A aplicacao esperava que o banco bloqueasse a exclusao por chave estrangeira.
- O Supabase real permitiu a exclusao, indicando que a restricao no banco aplicado nao esta impedindo esse caso.

Alteracoes feitas:
- Atualizado `src/services/musicasService.js` com `countRepertoriosComMusica`.
- Atualizado `src/features/musicas/pages/MusicaDetalhePage.js` para verificar se a musica esta em repertorios antes de confirmar/excluir.
- Se houver vinculo com repertorio, a interface bloqueia a exclusao e mostra mensagem orientando remover a musica dos repertorios primeiro.
- Criado `supabase/migrations/003_prevent_delete_musica_em_repertorio.sql`.
- Atualizado `supabase/migrations/001_reference_schema.sql` com o mesmo trigger de referencia.
- A migration `003` cria o trigger `prevent_delete_musica_em_repertorio` em `musicas`.
- O trigger bloqueia exclusao no banco quando existir registro em `repertorio_musicas` para a musica.

Validacao:
- `npm run build` executou com sucesso.
- Build gerado com 66 modulos transformados.
- Bundle JS: 237.85 kB, gzip 60.65 kB.

Acao pendente fora do codigo local:
- Aplicar `supabase/migrations/003_prevent_delete_musica_em_repertorio.sql` no SQL Editor do Supabase.

Proximo passo recomendado:
- Aplicar a migration `003` no Supabase.
- Recriar ou usar uma musica vinculada a repertorio e testar a exclusao novamente.
- Depois seguir para "Implementar busca de musicas".

## Registro de continuidade - confirmacao com repertorios vinculados

Data: 2026-06-01

O usuario pediu que, ao excluir uma musica presente em repertorios, o sistema mostre aviso, relacione os repertorios onde ela esta presente e pergunte se confirma a exclusao da musica.

Alteracoes feitas:
- Atualizado `src/services/musicasService.js`.
- `countRepertoriosComMusica` foi substituido por `listRepertoriosComMusica`.
- Adicionado `removeMusicaDeTodosRepertorios`.
- Atualizado `src/features/musicas/pages/MusicaDetalhePage.js`.
- Antes de excluir, a tela consulta os repertorios vinculados.
- Se houver vinculos, a confirmacao lista os repertorios e informa que a musica sera removida deles antes da exclusao definitiva.
- Se o usuario confirmar, o app remove os vinculos em `repertorio_musicas` e depois exclui a musica.
- Atualizado comentario de `supabase/migrations/003_prevent_delete_musica_em_repertorio.sql` para deixar claro que o trigger bloqueia exclusoes diretas, mas a interface pode remover vinculos primeiro mediante confirmacao.

Validacao:
- `npm run build` executou com sucesso.
- Build gerado com 66 modulos transformados.
- Bundle JS: 238.65 kB, gzip 60.90 kB.

Proximo passo recomendado:
- Aplicar a migration `003` no Supabase, se ainda nao foi aplicada.
- Testar excluir uma musica presente em um ou mais repertorios e conferir a lista exibida na confirmacao.
- Depois seguir para "Implementar busca de musicas".

## Registro de continuidade - excluir repertorio vazio apos excluir musica

Data: 2026-06-01

O usuario testou o fluxo de exclusao de musica vinculada e informou que funcionou. Em seguida pediu que, se um repertorio ficar sem nenhuma musica apos a exclusao de uma musica, o repertorio tambem seja excluido.

Alteracoes feitas:
- Atualizado `src/services/musicasService.js` com:
  - `countMusicasNoRepertorio`
  - `deleteRepertorios`
- Atualizado `src/features/musicas/pages/MusicaDetalhePage.js`.
- Antes da confirmacao, o app conta quantas musicas existem em cada repertorio vinculado.
- A confirmacao agora marca repertorios que serao excluidos porque ficarao sem musicas.
- Ao confirmar, o app remove os vinculos da musica, exclui os repertorios que ficaram vazios e depois exclui a musica.

Validacao:
- `npm run build` executou com sucesso.
- Build gerado com 66 modulos transformados.
- Bundle JS: 239.63 kB, gzip 61.15 kB.

Proximo passo recomendado:
- Testar excluir uma musica que seja a unica musica de um repertorio e confirmar que o repertorio tambem desaparece.
- Testar excluir uma musica que esteja em um repertorio com outras musicas e confirmar que o repertorio permanece.
- Depois seguir para "Implementar busca de musicas".

## Registro de continuidade - busca de musicas

Data: 2026-06-01

O usuario informou que o teste da exclusao de repertorios vazios funcionou e pediu para seguir para a proxima etapa.

Alteracoes feitas:
- Atualizado `src/features/musicas/pages/MusicasPage.js`.
- Criado filtro de busca na listagem de musicas.
- A busca considera titulo, artista, tom, cifra original e cifra ChordPro.
- A busca ignora maiusculas/minusculas e acentos.
- Adicionada ordenacao por titulo, artista, tom e mais recentes.
- Adicionado resumo de quantidade de musicas exibidas.
- Atualizado `src/styles/global.css` com estilos para barra de busca, ordenacao e responsividade.

Validacao:
- `npm run build` executou com sucesso.
- Build gerado com 66 modulos transformados.
- Bundle JS: 241.66 kB, gzip 61.71 kB.

Proximo passo recomendado:
- Testar busca por titulo, artista, tom e trecho da cifra.
- Testar ordenacao por titulo, artista, tom e mais recentes.
- Depois seguir para melhorias do modo execucao: tema escuro, tamanho de fonte e autoscroll.

## Registro de continuidade - ajuste da busca e modo execucao

Data: 2026-06-01

O usuario confirmou que a busca estava funcionando, informou que busca por tom era desnecessaria e pediu para ajustar e seguir para a proxima etapa.

Alteracoes feitas:
- Atualizado `src/features/musicas/pages/MusicasPage.js`.
- Removida busca por tom.
- Removida ordenacao por tom.
- O tom continua visivel na tabela de musicas.
- Atualizado `src/features/repertorios/pages/RepertorioExecucaoPage.js`.
- Adicionada toolbar no modo execucao.
- Adicionado botao de tema escuro/claro.
- Adicionado controle de tamanho de fonte.
- Adicionado autoscroll com iniciar/pausar.
- Adicionado controle de velocidade do autoscroll.
- Preferencias de tema, fonte e velocidade sao salvas no `localStorage`.
- Atualizado `src/styles/global.css` com estilos do modo execucao e tema escuro.

Validacao:
- `npm run build` executou com sucesso.
- Build gerado com 66 modulos transformados.
- Bundle JS: 243.34 kB, gzip 62.19 kB.

Proximo passo recomendado:
- Testar modo execucao no navegador: tema escuro, tamanho da fonte, autoscroll e velocidade.
- Depois melhorar o modo execucao com tela cheia e navegacao proxima/anterior musica.

## Registro de continuidade - modo execucao tela cheia e navegacao

Data: 2026-06-01

O usuario informou que o modo execucao estava funcionando e pediu para seguir para a proxima etapa.

Alteracoes feitas:
- Atualizado `src/features/repertorios/pages/RepertorioExecucaoPage.js`.
- Adicionado botao "Anterior" no modo execucao.
- Adicionado botao "Proxima" no modo execucao.
- Cada musica do repertorio agora recebe um `id` e pode receber foco.
- Os botoes anterior/proxima rolam suavemente ate a musica correspondente.
- Adicionado botao "Tela cheia".
- O botao alterna entre entrar e sair de tela cheia.
- O texto do botao muda conforme o estado de tela cheia.

Validacao:
- `npm run build` executou com sucesso.
- Build gerado com 66 modulos transformados.
- Bundle JS: 244.64 kB, gzip 62.57 kB.

Proximo passo recomendado:
- Testar no navegador os botoes Anterior, Proxima e Tela cheia.
- Depois seguir para a proxima etapa da rotina: transposicao de acordes ou refinamento do modo execucao.

## Registro de continuidade - correcao anterior/proxima

Data: 2026-06-01

O usuario testou o modo execucao e informou:
- Tela cheia funcionando.
- Botoes Anterior/Proxima nao funcionando.

Correcao feita:
- Atualizado `src/features/repertorios/pages/RepertorioExecucaoPage.js`.
- A inicializacao dos controles do modo execucao foi movida para depois da renderizacao das musicas.
- Antes, os botoes eram configurados quando a lista de musicas ainda estava vazia.

Validacao:
- `npm run build` executou com sucesso.
- Build gerado com 66 modulos transformados.
- Bundle JS: 244.64 kB, gzip 62.57 kB.

Proximo passo recomendado:
- Testar novamente Anterior/Proxima no modo execucao.

## Registro de continuidade - transposicao de acordes

Data: 2026-06-01

O usuario informou que tela cheia e navegacao anterior/proxima estavam funcionando e pediu o proximo passo.

Alteracoes feitas:
- Atualizado `src/utils/chordpro.js`.
- Adicionadas funcoes `transposeChordPro` e `transposeKey`.
- A transposicao altera acordes dentro de colchetes ChordPro.
- Suporte inicial a notas com sustenido, bemol ASCII e simbolos `♭`/`♯`.
- Atualizado `src/features/musicas/pages/MusicaDetalhePage.js`.
- A pagina de detalhe da musica agora tem controles `-1 semitom`, `+1 semitom` e `Original`.
- O tom exibido e a cifra renderizada mudam sem alterar o banco.
- Atualizado `src/features/repertorios/pages/RepertorioExecucaoPage.js`.
- O modo execucao agora tem controles de transposicao global para todas as musicas do repertorio.
- Atualizado `src/styles/global.css` com estilos para controles de transposicao.

Validacao:
- `npm run build` executou com sucesso.
- Build gerado com 66 modulos transformados.
- Bundle JS: 247.27 kB, gzip 63.21 kB.

Proximo passo recomendado:
- Testar transposicao em musica individual e no modo execucao.
- Conferir acordes com baixo, exemplo `C/E`, `D/F#`, e acordes menores.
- Depois seguir para capotraste, impressao/exportacao ou refinamento do parser de acordes.

## Registro de continuidade - capotraste

Data: 2026-06-01

O usuario informou que os testes de transposicao estavam ok e pediu o proximo passo.

Alteracoes feitas:
- Atualizado `src/features/musicas/pages/MusicaDetalhePage.js`.
- Adicionado seletor de capotraste na pagina de detalhe da musica.
- Atualizado `src/features/repertorios/pages/RepertorioExecucaoPage.js`.
- Adicionado seletor de capotraste no modo execucao.
- O capotraste ajusta os acordes exibidos sem alterar o tom real mostrado.
- No modo execucao, a preferencia de capotraste e salva no `localStorage`.
- Atualizado `src/styles/global.css` com estilos para selects de capotraste.

Validacao:
- `npm run build` executou com sucesso.
- Build gerado com 66 modulos transformados.
- Bundle JS: 248.29 kB, gzip 63.42 kB.

Proximo passo recomendado:
- Testar capotraste na musica individual e no modo execucao.
- Exemplo: musica em tom D com capotraste casa 2 deve mostrar posicoes equivalentes a C, mantendo o tom real como D.
- Depois seguir para impressao/exportacao ou refinamento do parser de acordes.

## Registro de continuidade - impressao limpa

Data: 2026-06-01

O usuario informou que o capotraste estava funcionando e pediu o proximo passo.

Alteracoes feitas:
- Atualizado `src/features/musicas/pages/MusicaDetalhePage.js`.
- Adicionado botao "Imprimir" na pagina de detalhe da musica.
- Atualizado `src/features/repertorios/pages/RepertorioExecucaoPage.js`.
- Adicionado botao "Imprimir" no modo execucao do repertorio.
- Atualizado `src/styles/global.css`.
- Criados estilos `@media print` para esconder navegacao, controles e formularios.
- Impressao usa fundo branco, texto preto e cifra monoespacada.
- No modo execucao, cada musica tenta evitar quebra interna de pagina.
- A impressao respeita a visualizacao atual, incluindo transposicao e capotraste aplicados.

Validacao:
- `npm run build` executou com sucesso.
- Build gerado com 66 modulos transformados.
- Bundle JS: 248.64 kB, gzip 63.47 kB.

Proximo passo recomendado:
- Testar imprimir/salvar PDF em uma musica individual.
- Testar imprimir/salvar PDF no modo execucao de um repertorio.
- Depois seguir para exportacao ChordPro ou refinamento do parser de acordes.

## Registro de continuidade - exportacao ChordPro

Data: 2026-06-01

O usuario confirmou que a impressao estava funcionando e pediu para seguir para a proxima etapa.

Alteracoes feitas:
- Criado `src/utils/download.js`.
- Adicionado utilitario `downloadTextFile`.
- Adicionado utilitario `slugifyFilename`.
- Atualizado `src/features/musicas/pages/MusicaDetalhePage.js`.
- Adicionado botao "Exportar ChordPro" na musica individual.
- A exportacao da musica inclui metadados de titulo, tom e capotraste quando aplicavel.
- A exportacao respeita transposicao e capotraste aplicados na visualizacao.
- Atualizado `src/features/repertorios/pages/RepertorioExecucaoPage.js`.
- Adicionado botao "Exportar ChordPro" no modo execucao.
- A exportacao do repertorio baixa um arquivo `.cho` com metadados do repertorio e blocos separados por musica.
- A exportacao do repertorio tambem respeita transposicao e capotraste aplicados.

Validacao:
- `npm run build` executou com sucesso.
- Build gerado com 67 modulos transformados.
- Bundle JS: 250.77 kB, gzip 64.03 kB.

Proximo passo recomendado:
- Testar exportar ChordPro em uma musica individual.
- Testar exportar ChordPro no modo execucao de um repertorio.
- Depois seguir para refinamento do parser de acordes ou sistema numerico.

## Registro de continuidade - ChordPro como informacao interna

Data: 2026-06-01

O usuario definiu uma diretriz de produto:
- O formato ChordPro deve ser tratado como informacao interna do sistema.
- Todas as interacoes com o usuario devem usar o formato original da cifra.
- A unica interacao com ChordPro deve acontecer internamente na inclusao/alteracao da musica.

Alteracoes feitas:
- Removido `src/utils/download.js`.
- Removidos botoes "Exportar ChordPro" da musica individual e do modo execucao.
- Atualizado `src/features/musicas/pages/MusicaDetalhePage.js`.
- A pagina de detalhe voltou a exibir `cifra_original`.
- Atualizado `src/features/repertorios/pages/RepertorioExecucaoPage.js`.
- O modo execucao voltou a exibir `cifra_original`.
- Atualizado `src/utils/chordpro.js`.
- Adicionada funcao `transposeCifraOriginal` para transpor linhas de acordes no formato original sem expor ChordPro ao usuario.
- Transposicao e capotraste continuam funcionando sobre a cifra original.

Validacao:
- `npm run build` executou com sucesso.
- Build gerado com 66 modulos transformados.
- Bundle JS: 248.63 kB, gzip 63.47 kB.

Proximo passo recomendado:
- Testar uma musica no formato original com linhas de acordes separadas da letra.
- Validar transposicao e capotraste no detalhe da musica e no modo execucao.
- Depois seguir para refinamento do parser de acordes ou sistema numerico.
