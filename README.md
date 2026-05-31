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

## Como rodar futuramente

Depois que instalarmos as dependencias:

```bash
npm install
npm run dev
```

