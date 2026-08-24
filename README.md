# N-Plus-One Guardian

O **N-Plus-One Guardian** é uma GitHub Action desenvolvida para analisar e proteger seus Pull Requests contra um dos problemas de performance de banco de dados mais comuns: o famoso **N+1**.

Embora o projeto tenha "Laravel" no nome original, a action é poliglota e **atualmente suporta nativamente PHP, TypeScript, JavaScript e Python**. Ela utiliza a poderosa ferramenta de parsing [Tree-sitter](https://tree-sitter.github.io/tree-sitter/) para analisar a Árvore Sintática Abstrata (AST) do seu código e detectar chamadas de banco de dados feitas de forma indevida dentro de laços de repetição (loops).

## 🚀 Como Funciona

A Action varre apenas os arquivos modificados em cada Pull Request aberto ou atualizado. Se ela encontrar métodos comuns de consultas de ORMs sendo executados de dentro de loops (`for`, `foreach`, `while`), o guardião entra em ação e faz o seguinte:

1. **Comenta no Pull Request**: Cria um comentário de review inline exatamente na linha onde a infração foi detectada.
2. **Bloqueia a Action**: Falha a execução do CI (com status de erro), sinalizando que o desenvolvedor precisa refatorar as queries e carregar os dados de forma antecipada (eager loading) fora do loop.

## 📦 Linguagens e ORMs Suportados

A ferramenta rastreia os métodos mais populares associados a bibliotecas de banco de dados nas seguintes linguagens:

- **PHP** (Laravel Eloquent / Doctrine): `get`, `find`, `first`, `all`, `update`, `save`, `delete`, etc.
- **TypeScript & JavaScript** (Prisma / TypeORM): `findMany`, `findUnique`, `findOne`, `query`, `execute`, etc.
- **Python** (Django ORM / SQLAlchemy): `filter`, `exclude`.

## 🛠 Como Usar (Instalação)

Para integrar o **N-Plus-One Guardian** ao seu repositório GitHub, basta criar um arquivo de workflow em `.github/workflows/n-plus-one.yml` e adicionar o conteúdo abaixo:

```yaml
name: N+1 Guardian

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  analyzer:
    runs-on: ubuntu-latest
    permissions:
      pull-requests: write # Necessário para postar os comentários no PR
      contents: read
    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4

      - name: Executar Guardião de N+1
        uses: PDG-Team/n-plus-one-guardian@main # Atualize para apontar para a versão ou branch correta
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
```

### Inputs

| Input | Descrição | Obrigatório | Padrão |
| --- | --- | --- | --- |
| `github_token` | Token de autenticação da GitHub API. Utilizado para buscar o diff do PR e inserir os comentários inline. | **Sim** | N/A |

## 💻 Desenvolvimento Local

Este projeto é desenvolvido com **Node.js** (v20+) e **TypeScript**. A lógica de detecção depende de bindings do Tree-sitter para múltiplas linguagens.

### Requisitos
- Node.js
- NPM

### Comandos Úteis

- Instalar dependências:
  ```bash
  npm install
  ```
- Gerar a build da Action (usando `@vercel/ncc` para unificar o código em `dist/index.js`):
  ```bash
  npm run build
  ```
- Executar os testes (utilizando `jest`):
  ```bash
  npm run test
  ```

Lembre-se de rodar `npm run build` antes de fazer um commit com as alterações da Action, já que o GitHub vai executar diretamente o arquivo contido na pasta `dist/`.

## 📜 Licença

Distribuído sob a licença **ISC**.
