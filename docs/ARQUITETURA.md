# Arquitetura do Master Cifras

Este documento explica a organizacao inicial do projeto.

## Ideia principal

O navegador mostra as telas. As telas chamam os `services`. Os `services` conversam com o Supabase.

Fluxo simples:

```text
Tela -> Service -> Supabase -> Banco de dados
```

## Areas do sistema

- `auth`: login, logout, usuario atual e permissoes.
- `musicas`: cadastro, edicao, listagem e conversao para ChordPro.
- `repertorios`: cadastro, edicao e organizacao de musicas.
- `usuarios`: papeis de acesso como admin, editor e musico.

## Banco de dados

Tabelas principais:

- `musicas`
- `repertorios`
- `repertorio_musicas`
- `profiles`

A tabela `profiles` sera usada para guardar dados extras do usuario, como nome e papel.

