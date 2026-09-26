# MotorShop

Plataforma web para lojas de motos usadas e seminovas — site público, catálogo
com busca e filtros, geração de leads e painel administrativo.

Construída como **produto base**: a primeira implementação é uma loja fictícia
de demonstração, e a plataforma é projetada para ser personalizada e revendida
a outras lojas **por configuração, sem alteração de código**.

---

## Status

| Fase | Situação |
|---|---|
| **FASE 0** — Arquitetura | ✅ concluída |
| **FASE 1** — Fundação do projeto | ✅ concluída |
| **FASE 2** — Banco + API | ✅ concluída |
| **FASE 3** — Autenticação + Admin | ✅ concluída |
| **FASE 4** — Catálogo público | ✅ concluída |
| **FASE 5** — Página da moto | ✅ concluída |
| **FASE 6** — Leads + WhatsApp | ✅ concluída |
| **FASE 7** — Financiamento | ✅ concluída |
| **FASE 8** — Upload e gestão de imagens | ✅ concluída — falta o teste com conta Cloudinary real |
| **FASE 9** — SEO + performance | ✅ concluída — falta validar o preview com endereço público |
| **FASE 10** — Segurança | ✅ concluída — segredos são rotacionados no deploy |
| **FASE 11** — Testes | ✅ concluída |
| **FASE 12** — Deploy | 🟡 preparada — falta publicar com as contas da loja ([`DEPLOYMENT.md`](./docs/DEPLOYMENT.md)) |
| **FASE 13** — Auditoria final | ✅ concluída — faltam aparelhos reais, leitor de tela e Lighthouse no domínio ([`FINAL-AUDIT.md`](./docs/FINAL-AUDIT.md)) |

O que existe hoje: site público renderizado no servidor (home, estoque com
filtros, página da moto com galeria e simulador, financiamento, venda sua
moto, sobre, contato, privacidade), SEO com meta, dados estruturados e
sitemap, painel administrativo (motos com fotos, marcas, leads, usuários e
configurações da loja — inclusive logo, cor, diferenciais e SEO), autenticação
com sessões revogáveis, segurança auditada
([`docs/SECURITY.md`](./docs/SECURITY.md)) e ~1.000 testes — unitários,
integração, componentes, segurança, E2E, revenda e acessibilidade — rodando
na CI.

**Produto base comprovado:** uma segunda loja configurada só pelo painel muda
o site inteiro, e um teste confere isso a cada push. Para colocar uma loja
nova no ar: [`docs/CUSTOMIZATION.md`](./docs/CUSTOMIZATION.md).

O que falta: publicar seguindo o [`DEPLOYMENT.md`](./docs/DEPLOYMENT.md)
(FASE 12) e as verificações que dependem do ambiente real
([`docs/TECHNICAL-DEBT.md`](./docs/TECHNICAL-DEBT.md) §1).

---

## Objetivo

Dar a uma loja de motos um site que **vende**: estoque exposto de forma
navegável e indexável, contato imediato por WhatsApp, e um painel onde a equipe
opera o dia a dia sem depender de desenvolvedor.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | React 19 · Vite 8 · React Router 7 · Axios · Tailwind CSS 4 |
| Backend | Node.js 22 · Express 5 · API REST · Zod 4 |
| Banco | MongoDB Atlas · Mongoose 9 |
| Autenticação | JWT (a partir da FASE 3) |
| Imagens | Cloudinary, atrás de uma porta substituível (FASE 8) |
| Qualidade | ESLint 10 · Prettier 3 · Vitest 5 |

Tudo em **JavaScript** (ESM), sem TypeScript — a validação de contratos é feita
em runtime com Zod.

---

## Arquitetura

```
React → Axios → API REST → Routes → Controllers → Services → Repositories → Models → MongoDB
```

O frontend **nunca** acessa o banco diretamente, e nenhuma credencial de banco
existe no bundle. Detalhes e justificativas em
[`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md).

---

## Instalação

Requer **Node.js ≥ 22**.

```bash
git clone <url-do-repositorio>
cd MotorShop
npm install
```

Um `npm install` na raiz cobre os dois workspaces.

## Configuração do `.env`

São dois arquivos, com propósitos diferentes:

```bash
cp .env.example .env                    # backend — contém segredos
cp frontend/.env.example frontend/.env  # frontend — é público, vai no bundle
```

Os valores padrão já funcionam para desenvolvimento local. **MongoDB é opcional
nesta fase**: sem `MONGODB_URI` a API sobe e o health check reporta
`not_configured`.

Passo a passo completo, incluindo Atlas: [`docs/SETUP.md`](./docs/SETUP.md).

## Como iniciar

```bash
npm run dev            # backend + frontend juntos
npm run dev:backend    # somente a API      → http://localhost:3000
npm run dev:frontend   # somente o site     → http://localhost:5173
```

A home exibe o resultado do health check — confirmação visual de que o frontend
está falando com o backend.

## Testes

```bash
npm test                          # shared, backend e frontend (~1 min)
npm run test:coverage             # idem, com limites de cobertura
npm run build && npm run test:e2e # fluxos, revenda e acessibilidade no navegador (Playwright)
```

Os testes de integração usam um MongoDB em memória ou, com
`TEST_MONGODB_URI`, um MongoDB seu. Sem banco disponível, eles se marcam
como **pulados** com aviso — não passam em falso (e na CI, falham). Detalhes
em [`docs/SETUP.md`](./docs/SETUP.md#testes).

## Primeiro acesso ao painel

```bash
npm run create:superadmin    # cria o primeiro administrador
npm run dev                  # http://localhost:5173/admin/login
```

Não existe cadastro público: este script é o **único** caminho para criar o
primeiro administrador, e não há credencial padrão embutida.

## Banco de dados

```bash
npm run seed        # popula a loja fictícia: 6 marcas e 22 motos
npm run db:indexes  # cria e lista os índices
npm run db:check    # confere banco, loja, administradores e índices
```

Ambos exigem `MONGODB_URI` no `.env`. O `seed` apaga motos e marcas antes de
inserir, e em produção só roda com `--confirmar-apagar-estoque`.

## Lint e formatação

```bash
npm run lint          # ESLint
npm run lint:fix
npm run format        # Prettier
npm run format:check

npm run verify        # lint + format + testes + build (rode antes de commitar)
```

---

## Estrutura do projeto

```
MotorShop/
├─ backend/                    API REST (Express + Mongoose) e servidor do site
│  ├─ src/
│  │  ├─ config/               env validado, banco, índices, logger, segurança, Sentry
│  │  ├─ middlewares/          authenticate, authorize, validate, rateLimiters,
│  │  │                        requireDatabase, requestId, errorHandler…
│  │  ├─ modules/              um diretório por domínio: auth, motos, brands,
│  │  │                        leads, store, users, uploads, health
│  │  │                        (routes · controller · service · repository ·
│  │  │                        model · schema · serializer)
│  │  ├─ infra/                porta de armazenamento de imagens (Cloudinary)
│  │  ├─ seo/                  HTML renderizado no servidor, meta, sitemap, robots
│  │  ├─ routes/               agregador de /api
│  │  ├─ scripts/              seed, índices, create:superadmin, db:check
│  │  ├─ utils/                ApiError, envelope, money, slug, pagination
│  │  ├─ app.js                monta o Express (sem listen — testável)
│  │  └─ server.js             conecta o banco e sobe o servidor
│  └─ tests/                   unitários, integração, segurança e fábricas
│
├─ shared/                     usado pelos dois lados: enums, schemas Zod,
│  └─ src/                     cálculo de financiamento, imagens e SEO
│
├─ frontend/                   React (Vite), renderizado no servidor
│  └─ src/
│     ├─ components/           ui, layout, catálogo, moto, leads, admin
│     ├─ config/               configuração centralizada (VITE_*)
│     ├─ contexts/ hooks/      loja, sessão, SEO
│     ├─ layouts/              cascas do site e do painel
│     ├─ pages/                public/ e admin/
│     ├─ routes/               mapa de rotas (lazy por página)
│     ├─ services/             única camada que conhece Axios
│     ├─ styles/               tokens de design (variáveis CSS)
│     ├─ utils/                formatação, cor do tema, simulador…
│     └─ entry-server.jsx      renderização no servidor
│
├─ e2e/                       fluxos, revenda e acessibilidade (Playwright)
├─ scripts/fumaca.mjs         teste de fumaça de um site publicado
├─ render.yaml                serviços de produção e staging no Render
├─ .github/workflows/         CI (lint, formato, testes, build, E2E) e fumaça
│
├─ docs/
│  ├─ design/                  protótipo visual de referência
│  ├─ ARCHITECTURE.md          arquitetura, decisões e riscos
│  ├─ ROADMAP.md               fases 0 a 13
│  ├─ API.md                   referência de endpoints
│  ├─ CUSTOMIZATION.md         como personalizar para um novo cliente
│  ├─ SETUP.md                 configuração do ambiente local
│  ├─ SECURITY.md              segurança verificada, OWASP e LGPD
│  ├─ DEPLOYMENT.md            deploy, backup, rollback e operação
│  ├─ FINAL-AUDIT.md           auditoria final: requisitos, revenda, a11y
│  ├─ TECHNICAL-DEBT.md        débito técnico e backlog pós-lançamento
│  └─ PHASE-{1,2,3}-REPORT.md  relatórios das primeiras fases
│
├─ .env.example                variáveis do backend
└─ package.json                workspaces e scripts
```

**Regra de camadas:** rota não acessa banco, controller não tem regra de
negócio, componente React não conhece Axios. Só o repositório fala Mongoose —
é o que permitirá introduzir multi-loja alterando um ponto, e não o código todo.

**Dinheiro** é armazenado em centavos inteiros e convertido para reais na borda
da API (`utils/money.js`), porque `float` erra em aritmética decimal.

---

## Segurança

Tratada desde a FASE 1, não ao final: Helmet, CORS por origem explícita
(nunca `*`), limite de payload, validação de ambiente no boot, erros
centralizados sem stack em produção e logs com *redaction* de campos sensíveis.

A FASE 3 acrescentou: senhas com **argon2id**, access token curto guardado
apenas em memória (nunca `localStorage`), refresh token opaco em cookie
`httpOnly` com rotação e detecção de reuso, controle de acesso por papel e
rate limiting. A FASE 10 auditou e endureceu tudo isso — estado verificado,
checklist OWASP Top 10, política LGPD e checklist de go-live em
[`docs/SECURITY.md`](./docs/SECURITY.md).

## Licença

Proprietário. Todos os direitos reservados.
