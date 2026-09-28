# MotorShop — Inventário da auditoria

> Levantado em 2026-09-28, antes de qualquer alteração, a partir de `git
> ls-files` (o que está versionado) e de varreduras automáticas. Serve de base
> para [`CLEANUP.md`](./CLEANUP.md) e [`FINAL-AUDIT.md`](./FINAL-AUDIT.md).

## 1. Estrutura

| Área | Arquivos versionados | Observação |
|---|---|---|
| `backend/src` | 89 | Express 5 + Mongoose, módulos por domínio (rota → controller → service → repository) |
| `backend/tests` | 49 | 27 unitários, 18 de integração (supertest + MongoDB em memória), apoio |
| `frontend/src` | 161 | React 19 + Vite, SSR próprio (`entry-server.jsx`), 46 arquivos de teste junto do código |
| `shared/src` | 7 | Regras que site e servidor usam iguais: enums, schemas de lead, financiamento, SEO, imagens |
| `shared/tests` | 4 | |
| `e2e` | 11 | 8 especificações Playwright + servidor, dados e apoio |
| `docs` | 14 | Arquitetura, roadmap, segurança, deploy, API, customização, relatórios |
| `scripts` | 1 | `fumaca.mjs` — teste de fumaça de um site publicado (usado no workflow) |
| Configuração | `package.json` ×4, `eslint.config.js`, `playwright.config.js`, `render.yaml`, `.github/workflows` ×2, `.env.example` ×2, `.prettierrc.json`, `.node-version` | |

Total: **361 arquivos versionados**; 218 de código de produção (JS/JSX), 103
de teste. Não há Docker, migrations nem assets binários fora de
`frontend/public` (1 favicon) e `docs/design` (protótipo HTML de referência).

## 2. Código sem uso

Varredura: para cada arquivo, se algum outro o importa; para cada `export`,
se algum arquivo **de produção** o referencia.

| Achado | Onde | Veredito |
|---|---|---|
| Arquivo de código que ninguém importa | — | **Nenhum.** Os pontos de entrada (`main.jsx`, `entry-server.jsx`, `server.js`, scripts de `backend/src/scripts`) são chamados por `package.json` ou pelo build |
| `fetchMe` | `frontend/src/services/authService.js` | Sem uso no app (só num teste). **Removido** — a rota `/api/auth/me` continua, é API documentada |
| `urlOtimizada` | `frontend/src/utils/imagem.js` | Alias sem uso do `optimizedImageUrl` do shared; seus 2 testes repetiam os do shared. **Removido** |
| `getAccessToken` | `frontend/src/services/api.js` | Só testes leem. **Mantido**: é o acesso de leitura ao token em memória, que fica privado ao módulo |
| Exports usados só em testes (`RATE_LIMITS`, `ADMIN_ROUTERS`, `parseEnv`, `REDACT`, `scrubEvent`…) | backend | **Mantidos**: são as tabelas que os testes percorrem ("uma rota/limite novo já nasce testado") |

## 3. Depuração, pendências e comentários

| Busca | Resultado |
|---|---|
| `console.log/debug/info/trace`, `debugger` | Nenhum em código de produção. Só em scripts de linha de comando (`backend/src/scripts`, `scripts/`, `e2e/`), que existem para imprimir |
| `console.error` fora de scripts | Só em `backend/src/config/env.js`, ao recusar a configuração — acontece antes de o logger existir |
| `TODO`, `FIXME`, `HACK`, `XXX` | Nenhum (as ocorrências de "TODOS" são a palavra em português) |
| Código comentado sem finalidade | Nenhum encontrado; os comentários explicam decisões |

## 4. Dependências

| Verificação | Resultado |
|---|---|
| `npm audit` (inclui dev) | **0 vulnerabilidades** |
| Declaradas e não importadas | Nenhuma. `@fontsource/*` é importado por CSS; `jsdom`, `@vitest/coverage-v8` e `concurrently` são usados por configuração e scripts |
| Desatualizadas | Só patch/minor dentro da faixa declarada (Mongoose 9.10.0 → 9.10.2, Vite 8.3.0 → 8.3.1, Vitest 5.0.0 → 5.0.2, React Router 7.18.3 → 7.18.4, entre outras). Nenhuma major pendente |
| APIs depreciadas em uso | Opção `new` do Mongoose (aviso a cada atualização) — **trocada** por `returnDocument` |

## 5. Segredos

| Onde | Resultado |
|---|---|
| Árvore atual | Nenhum segredo real. Só o marcador `USUARIO:SENHA` na documentação |
| Histórico inteiro do git | Nenhum `.env` jamais versionado (só `.env.example`); nenhuma URI com senha real, chave privada ou segredo preenchido |
| Bundle do site (`frontend/dist`) | Nenhuma ocorrência de URI do banco ou segredo. Único `import.meta.env` lido: `VITE_API_URL` e `DEV` |
| `render.yaml` | Segredos como `sync: false` (só no painel); `JWT_SECRET` gerado pelo Render |

## 6. Arquivos avaliados e mantidos

| Arquivo | Por que fica |
|---|---|
| `docs/PHASE-{1,2,3}-REPORT.md` | Histórico das primeiras fases, citado no README |
| `docs/design/rafa-motos.prototype.html` | Referência visual do design (tokens), citada em `docs/design/README.md` |
| `scripts/fumaca.mjs` | Chamado por `npm run smoke` e pelo workflow de fumaça |
| `e2e/servidor.mjs`, `e2e/dados.mjs`, `e2e/apoio.js` | Infraestrutura do Playwright (`playwright.config.js`) |
| `test-results/` (não versionado) | Saída do Playwright; já no `.gitignore` |
