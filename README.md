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
| **FASE 2** — Banco + API | ✅ concluída — falta executar os testes com banco |
| **FASE 3** — Autenticação + Admin | ✅ concluída — falta executar os testes com banco |
| **FASE 4** — Catálogo público | ⏳ aguardando autorização |

O que existe hoje: monorepo configurado, API REST com catálogo de motos
(filtros, ordenação e paginação no servidor), CRUD de motos e marcas, modelos
com índices, seed da loja fictícia, segurança básica, SPA React consumindo a
API, lint, formatação e testes.

Também: autenticação com JWT, painel administrativo completo (motos, marcas,
usuários e configurações da loja) e gestão de sessões revogáveis.

O que **ainda não** existe: catálogo no site público, página da moto, leads,
financiamento e upload de imagens — cada um na sua fase
([`docs/ROADMAP.md`](./docs/ROADMAP.md)).

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
npm test                                  # os dois workspaces
npm test --workspace @motorshop/backend   # apenas a API
```

Os testes de integração sobem um MongoDB em memória automaticamente. Onde isso
não for possível, eles se marcam como **pulados** com aviso — não passam em
falso.

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
```

Ambos exigem `MONGODB_URI` no `.env`. O `seed` apaga motos e marcas antes de
inserir, e se recusa a rodar em produção.

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
├─ backend/                    API REST (Express + Mongoose)
│  ├─ src/
│  │  ├─ config/               env validado, conexão do banco, logger
│  │  ├─ middlewares/          validate, requireDatabase, adminGuard,
│  │  │                        requestId, notFound, errorHandler
│  │  ├─ modules/              um diretório por domínio
│  │  │  ├─ motos/             model · repository · service · serializer
│  │  │  ├─ brands/            controller · routes · schema
│  │  │  └─ health/
│  │  ├─ routes/               agregador de /api
│  │  ├─ scripts/              seed e criação de índices
│  │  ├─ utils/                ApiError, envelope, money, slug, pagination
│  │  ├─ app.js                monta o Express (sem listen — testável)
│  │  └─ server.js             conecta o banco e sobe o servidor
│  └─ tests/                   integração e unitários
│
├─ shared/                     enums do domínio, usados pelos dois lados
│  └─ src/enums.js
│
├─ frontend/                   SPA React (Vite)
│  ├─ public/
│  └─ src/
│     ├─ components/           componentes de apresentação
│     ├─ config/               configuração centralizada (VITE_*)
│     ├─ hooks/                estado e efeitos reutilizáveis
│     ├─ layouts/              cascas de página
│     ├─ pages/                Home, NotFound
│     ├─ routes/               mapa de rotas
│     ├─ services/             única camada que conhece Axios
│     └─ styles/               tokens de design (variáveis CSS)
│
├─ docs/
│  ├─ ARCHITECTURE.md          arquitetura, decisões e riscos
│  ├─ ROADMAP.md               fases 0 a 13
│  ├─ SETUP.md                 configuração do ambiente local
│  ├─ PHASE-1-REPORT.md        relatório da FASE 1
│  ├─ PHASE-2-REPORT.md        relatório da FASE 2
│  └─ PHASE-3-REPORT.md        relatório da FASE 3
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
rate limiting. A auditoria completa é a FASE 10.
Ver [`ARCHITECTURE.md` §8](./docs/ARCHITECTURE.md#8-segurança).

## Licença

Proprietário. Todos os direitos reservados.
