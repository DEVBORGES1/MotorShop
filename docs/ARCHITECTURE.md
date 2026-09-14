# MotorShop — Documento de Arquitetura (FASE 0)

> **Status:** FASE 0 — Arquitetura. Nenhuma funcionalidade implementada.
> **Data:** 2026-09-12
> **Escopo deste documento:** definir arquitetura, modelos, contratos de API, fluxos,
> decisões técnicas e riscos **antes** de qualquer implementação.

---

## 0. Análise do estado atual do projeto

Antes de qualquer proposta, foi feita a inspeção completa do repositório.

### 0.1 Estado do repositório

| Item | Resultado |
|---|---|
| Diretório | `/home/user/MotorShop` |
| Repositório git | Sim (`origin` = `https://github.com/DEVBORGES1/MotorShop`) |
| Commits | **Nenhum** (`No commits yet`) |
| Branches remotas | **Nenhuma** |
| Arquivos versionados | **0** |
| Arquivos não-versionados | **0** |
| Branch de trabalho | `claude/nifty-lovelace-oln0x1` |

**Conclusão: o projeto está completamente vazio.** Não existe `package.json`,
código-fonte, configuração, dependência ou histórico. Não há nada em execução e,
portanto, **nada a preservar** — a regra "não substituir código existente" não
se aplica nesta fase por ausência de código.

### 0.2 Dependências existentes

Nenhuma. Não há `package.json`, `package-lock.json`, `pnpm-lock.yaml`,
`node_modules/` nem `Dockerfile`. Toda a árvore de dependências será definida
do zero na FASE 1.

### 0.3 Ambiente de desenvolvimento disponível

| Ferramenta | Versão |
|---|---|
| Node.js | v22.22.2 |
| npm | 10.9.7 |
| pnpm | 10.33.0 |
| yarn | 1.22.22 |
| git | 2.43.0 |
| Docker | disponível (`/usr/bin/docker`) |
| MongoDB local | **não instalado** |

Node 22 (LTS) suporta ESM nativo, `node --watch` e `node:test`, o que reduz
dependências de desenvolvimento (não será necessário `nodemon`).
A ausência de MongoDB local confirma a dependência de **MongoDB Atlas** já
prevista na stack; Docker fica disponível como alternativa para testes de
integração locais.

### 0.4 Problemas e lacunas identificados

Como não há código, os "problemas" são **lacunas de definição** que precisam ser
resolvidas para que a implementação não gere retrabalho:

| # | Lacuna | Impacto se não resolvida | Onde é tratada |
|---|---|---|---|
| P-01 | SEO em SPA React puro: HTML inicial vazio | **Crítico.** Crawlers de WhatsApp/Facebook/Instagram **não executam JavaScript** → links compartilhados não geram preview (título/imagem/descrição). Para uma loja que vende via WhatsApp, é falha de negócio, não estética. | §11 |
| P-02 | Stack em JavaScript, sem tipagem estática | Contratos entre frontend e backend sem verificação em tempo de compilação → erros só aparecem em runtime. | §15 D-01, §15 D-08 |
| P-03 | Dados da loja (WhatsApp, endereço, cores, nome) espalhados pelo código | Impede revenda do produto para outras lojas sem refatoração. | §14 |
| P-04 | Imagens: sem provedor definido | Bloqueia FASE 8 e afeta diretamente performance e custo. | §10 |
| P-05 | Campo `placa` é dado sensível do veículo | Exposição indevida na API pública = vazamento de dado + risco de fraude. | §8.4 |
| P-06 | Leads contêm dados pessoais (nome, telefone, e-mail) | Obrigações de **LGPD**: base legal, retenção, eliminação, acesso restrito. | §8.7 |
| P-07 | "Simulação de financiamento" pode ser interpretada como oferta de crédito | Risco jurídico/regulatório se apresentada como proposta firme. | §16 R-07 |
| P-08 | Painel admin no mesmo bundle do site público | Peso desnecessário no site público + superfície de exposição. | §12.3 |

### 0.5 Sobre o site de referência

O site `https://wlveiculosvideira.com.br/` **não pôde ser acessado** deste
ambiente: o proxy de egresso da sessão bloqueia o domínio
(`EGRESS_BLOCKED`). Portanto:

- O escopo funcional deste documento foi derivado **integralmente da sua
  especificação**, que já enumera de forma completa menu, seções da home,
  filtros do catálogo, campos da página da moto, formulários e integrações.
- Nenhum código, texto, imagem, layout ou identidade visual de terceiros foi
  consultado ou reproduzido — o que é coerente com a exigência de identidade
  visual própria.
- Se houver comportamento específico do site de referência que você queira
  replicar funcionalmente, descreva-o e eu incorporo ao planejamento.

---

## 1. Visão geral

### 1.1 O que é o MotorShop

Plataforma web para **venda e divulgação de motos usadas e seminovas**,
composta de:

- **Site público** — captação de interesse e exposição de estoque, otimizado
  para busca orgânica e compartilhamento em redes sociais/WhatsApp.
- **Painel administrativo** — operação diária da loja (estoque, marcas, leads,
  usuários, configurações).
- **API REST** — única fonte de verdade; consumida pelos dois frontends.

### 1.2 Princípio central: produto base, não projeto descartável

Toda decisão arquitetural aqui é avaliada por dois critérios:

1. **Funciona para a primeira loja (fictícia, demonstração).**
2. **Pode ser revendida para a loja nº 2, 3 e 10 sem reescrita.**

Consequências práticas que atravessam o documento:

- **Zero dados de loja hardcoded.** Nome, logo, cores, WhatsApp, endereço,
  horários e redes sociais vivem em uma única entidade de configuração (§5.5),
  nunca em componentes.
- **Tema por tokens.** Cores e tipografia são variáveis CSS derivadas de uma
  configuração, não classes espalhadas (§14.2).
- **Camada de acesso a dados isolada.** Repositórios são o único ponto que toca
  o banco, para que a futura introdução de `storeId` seja uma alteração
  localizada e não uma varredura global (§14.3).
- **Provedor de imagens atrás de uma porta.** Trocar Cloudinary por R2/S3 é
  trocar um driver (§10.3).

### 1.3 O que este documento **não** faz

Não implementa nada. Não cria `package.json`, não instala dependências, não
escreve código de aplicação. Os únicos artefatos da FASE 0 são
`docs/ARCHITECTURE.md`, `docs/ROADMAP.md`, `README.md`, `.env.example` e
`.gitignore`.

---

## 2. Stack

### 2.1 Stack definida (conforme obrigatoriedade)

> **Versões atualizadas na FASE 1.** Os majores abaixo são os estáveis
> correntes no momento da implementação, verificados no registry — e não os
> assumidos ao escrever a FASE 0. Ver §15 D-09.

| Camada | Tecnologia | Observação |
|---|---|---|
| UI | **React 19** | Conforme exigido |
| Linguagem | **JavaScript (ESM)** | Conforme exigido |
| Build | **Vite 8** | Conforme exigido |
| Rotas | **React Router 7** (`createBrowserRouter`) | Conforme exigido |
| HTTP client | **Axios 1.x** | Conforme exigido |
| Estilo | **Tailwind CSS 4** + tokens em CSS custom properties | v4 é CSS-first (`@theme`), sem `tailwind.config.js` |
| Runtime backend | **Node.js 22 LTS** | Disponível no ambiente |
| Framework | **Express 5** | Encaminha erros de `async` nativamente — ver §15 D-10 |
| Contrato | **API REST** | Conforme exigido |
| Auth | **JWT** | Conforme exigido |
| Validação | **Zod 4** | Conforme exigido |
| Banco | **MongoDB Atlas** | Conforme exigido |
| ODM | **Mongoose 9** | Escolhido — justificativa em §15 D-01 |

### 2.2 Dependências propostas, com justificativa

Nenhuma dependência entra sem motivo. Lista completa do que será instalado na
FASE 1/2, para sua aprovação:

**Backend — produção**

| Pacote | Por quê | Alternativa descartada |
|---|---|---|
| `express` | Exigido | — |
| `mongoose` | ODM escolhido (§15 D-01) | Prisma, driver nativo |
| `zod` | Exigido; valida entrada **e** variáveis de ambiente | Joi, yup |
| `jsonwebtoken` | Emissão/verificação de JWT | `jose` |
| `argon2` | Hash de senha (§15 D-03) | bcrypt |
| `helmet` | Cabeçalhos de segurança (exigido) | manual |
| `cors` | CORS configurável (exigido) | manual |
| `express-rate-limit` | Rate limiting (exigido) | — |
| `cookie-parser` | Ler cookie de refresh token httpOnly | manual |
| `compression` | gzip/brotli nas respostas | nível do proxy |
| `pino` + `pino-http` | Log estruturado, com redaction de campos sensíveis | winston, morgan |
| `cloudinary` | SDK do provedor de imagens (§10) | upload HTTP manual |
| `slugify` | Geração de slug com transliteração pt-BR correta | regex própria |

**Backend — desenvolvimento**

| Pacote | Por quê |
|---|---|
| `vitest` | Runner único para backend e frontend (§ROADMAP FASE 11) |
| `supertest` | Testes de integração HTTP dos endpoints |
| `mongodb-memory-server` | Testes de integração sem depender do Atlas |
| `eslint` + `prettier` | Padronização |

> `nodemon` **não** é necessário: `node --watch` cobre o caso.

**Frontend — produção**

| Pacote | Por quê | Alternativa descartada |
|---|---|---|
| `react`, `react-dom` | Exigido | — |
| `react-router-dom` | Exigido | — |
| `axios` | Exigido | fetch nativo |
| `@tanstack/react-query` | Cache de requisições, deduplicação, estados de loading/erro, invalidação após mutação no admin. Elimina ~centenas de linhas de `useEffect` frágil e resolve diretamente "evitar chamadas HTTP desnecessárias" e "evitar re-renderizações desnecessárias". | `useEffect` manual, SWR, Redux |
| `react-hook-form` | Formulários (moto, venda sua moto, financiamento, contato) com re-render mínimo | estado controlado manual |
| `@hookform/resolvers` | Reutiliza os **mesmos** schemas Zod do backend no cliente | validação duplicada |
| `zod` | Schemas compartilhados via `shared/` | — |

**Frontend — desenvolvimento:** `vite`, `@vitejs/plugin-react`, `tailwindcss`,
`postcss`, `autoprefixer`, `vitest`, `@testing-library/react`.

> Decisão consciente: **sem** biblioteca de componentes (MUI/Chakra/shadcn
> completo). A exigência é identidade visual própria e premium; uma biblioteca
> opinativa atrapalharia e adicionaria peso. Componentes primitivos próprios em
> `components/ui/` com Tailwind, e `@headlessui/react` **apenas se** surgir
> necessidade real de acessibilidade em modal/dropdown/combobox — a decidir na
> FASE 4, não agora.

---

## 3. Arquitetura

### 3.1 Visão macro

```
┌──────────────────────────────────────────────────────────────────┐
│                          NAVEGADOR                               │
│  ┌────────────────────────┐      ┌────────────────────────────┐  │
│  │   SPA público          │      │   SPA admin (lazy chunk)   │  │
│  │  / /estoque /motos/:s  │      │   /admin/*                 │  │
│  └───────────┬────────────┘      └─────────────┬──────────────┘  │
└──────────────┼─────────────────────────────────┼─────────────────┘
               │        Axios (JSON, HTTPS)      │
               └─────────────────┬───────────────┘
                                 ▼
┌──────────────────────────────────────────────────────────────────┐
│                     BACKEND — Node + Express                     │
│                                                                  │
│  Middlewares globais: helmet · cors · compression · body limit   │
│                       rate limit · request id · pino             │
│                                 │                                │
│  ┌──────────────────────────────▼───────────────────────────────┐│
│  │ ROUTES        define método + caminho, plugga middlewares    ││
│  ├──────────────────────────────┬───────────────────────────────┤│
│  │ validate(schema)  ← Zod      │  authenticate → authorize     ││
│  ├──────────────────────────────▼───────────────────────────────┤│
│  │ CONTROLLERS   traduz HTTP ⇄ domínio. Sem regra de negócio.   ││
│  ├──────────────────────────────▼───────────────────────────────┤│
│  │ SERVICES      regra de negócio, orquestração, autorização    ││
│  │               de recurso. Sem Express, sem Mongoose.         ││
│  ├──────────────────────────────▼───────────────────────────────┤│
│  │ REPOSITORIES  única camada que fala Mongoose. Retorna POJOs. ││
│  ├──────────────────────────────▼───────────────────────────────┤│
│  │ MODELS        schemas Mongoose, índices, hooks               ││
│  └──────────────────────────────┬───────────────────────────────┘│
│                                 │                                │
│  errorHandler centralizado (último middleware)                   │
│                                                                  │
│  INFRA: storage port ──► Cloudinary provider                     │
└─────────────────────────────────┼────────────────────────────────┘
                                  ▼
                        ┌───────────────────┐   ┌──────────────────┐
                        │  MongoDB Atlas    │   │   Cloudinary     │
                        └───────────────────┘   └──────────────────┘
```

**O frontend nunca toca o banco.** Não existe credencial de banco no frontend,
nem no bundle, nem em variável `VITE_*`. A única superfície que o navegador
conhece é a API REST.

### 3.2 Responsabilidade de cada camada (contrato explícito)

| Camada | Pode | Não pode |
|---|---|---|
| **Routes** | Declarar caminho/método, encadear middlewares | Conter lógica |
| **Controllers** | Ler `req`, chamar service, responder com envelope padrão | Acessar Mongoose, conter regra de negócio |
| **Services** | Regra de negócio, transações, chamar múltiplos repositórios, decidir autorização de recurso | Conhecer `req`/`res`, montar status HTTP |
| **Repositories** | Queries, projeções, agregações, paginação | Conter regra de negócio |
| **Models** | Schema, índices, hooks de persistência | Chamar serviços externos |
| **Middlewares** | Preocupações transversais | Regra de negócio de domínio |
| **Schemas (Zod)** | Validar e **coagir** entrada (query string → número) | Acessar banco |

**Por que Repositories além de Models?** Sem essa camada, `Moto.find({...})`
aparece espalhado em serviços e a futura introdução de `storeId` (multi-loja,
§14.3) exigiria auditar todo o código. Com ela, o filtro de escopo é injetado
em um único lugar. É a peça que torna o produto revendável.

### 3.3 Fluxo detalhado: Frontend → API → MongoDB

Exemplo real — catálogo filtrado (`/estoque?marca=honda&precoMax=35000&page=2`):

```
1. React        Estoque.jsx lê os filtros da URL (useSearchParams).
                A URL é a fonte de verdade do filtro → compartilhável,
                navegável com voltar/avançar, e cacheável.
                        │
2. React Query  useMotos(filtros) — chave de cache = ['motos', filtros].
                Se já houver resposta fresca em cache, não há requisição.
                        │
3. Axios        GET /api/motos?marca=honda&precoMax=35000&page=2&limit=12
                Interceptor adiciona Authorization apenas em rotas /admin.
                        │
4. Express      helmet → cors → compression → rateLimit → requestId → pino
                        │
5. Routes       GET /api/motos → validate(listMotosQuerySchema) → controller
                        │
6. Zod          Coage "35000" → 35000, valida enums, aplica limit máximo (48),
                remove chaves desconhecidas. Falha → 422 com lista de erros.
                        │
7. Controller   motoController.list: extrai req.validated.query,
                chama motoService.listPublic(filters).
                        │
8. Service      Injeta a regra pública: status ∈ {AVAILABLE, RESERVED}.
                O cliente NÃO pode pedir INACTIVE — o filtro de status público
                é do servidor, não do query param. (Proteção contra
                enumeração de estoque inativo — §8.4.)
                        │
9. Repository   Monta o filtro Mongo, aplica projeção pública (sem `placa`,
                sem campos de custo), sort whitelisted, skip/limit,
                e executa find().lean() + countDocuments() em paralelo.
                        │
10. MongoDB     Resolve usando índice composto (status, brand, price) — §9.4
                        │
11. Repository  Retorna { items, total } como objetos puros.
12. Service     Aplica regras de apresentação de domínio (ex.: preço oculto
                quando status = SOLD, se essa política for aprovada — D-06).
13. Controller  res.json(ok(items, { page, limit, total, totalPages }))
14. Axios       Interceptor desembrulha o envelope → retorna data/meta.
15. React Query Guarda em cache, entrega ao componente.
16. React       Renderiza os cards. Imagens com loading="lazy" e srcset
                gerados pelo provedor (§10.4).
```

Em caso de erro em qualquer ponto: `next(error)` → `errorHandler` → envelope de
erro padronizado (§6.3), com `requestId` para correlação no log.

---

## 4. Estrutura de pastas

### 4.1 Decisão: monorepo com npm workspaces

```
MotorShop/
├─ backend/            workspace @motorshop/backend
├─ frontend/           workspace @motorshop/frontend
├─ shared/             workspace @motorshop/shared
├─ docs/
├─ package.json        raiz: workspaces + scripts orquestradores
├─ .env.example
├─ .gitignore
└─ README.md
```

**Por que workspaces e não três repositórios soltos?** `shared/` só tem valor se
for realmente importável pelos dois lados. Com workspaces, `frontend` e
`backend` declaram `@motorshop/shared` como dependência e tanto o Vite quanto o
Node ESM resolvem naturalmente — sem `../../shared/...`, sem build step, sem
duplicação de enums. Enums duplicados entre cliente e servidor são uma das
fontes mais comuns de bug em stack sem tipagem (P-02).

### 4.2 `backend/`

```
backend/
├─ src/
│  ├─ config/
│  │  ├─ env.js                  valida process.env com Zod; falha rápido no boot
│  │  ├─ database.js             conexão Mongoose (pool, retry, eventos)
│  │  ├─ logger.js               pino + redaction (senha, token, authorization)
│  │  └─ constants.js
│  │
│  ├─ modules/                   organização por domínio; camadas por sufixo
│  │  ├─ motos/
│  │  │  ├─ moto.model.js
│  │  │  ├─ moto.repository.js
│  │  │  ├─ moto.service.js
│  │  │  ├─ moto.controller.js
│  │  │  ├─ moto.routes.js
│  │  │  └─ moto.schema.js       Zod: create, update, listQuery
│  │  ├─ brands/                 (mesmos 6 arquivos)
│  │  ├─ leads/
│  │  ├─ users/
│  │  ├─ auth/
│  │  │  ├─ auth.service.js      login, refresh, logout, rotação de token
│  │  │  ├─ auth.controller.js
│  │  │  ├─ auth.routes.js
│  │  │  ├─ auth.schema.js
│  │  │  └─ refreshToken.model.js
│  │  ├─ store/                  configuração da loja (§5.5)
│  │  └─ uploads/                assinatura de upload direto (§10.4)
│  │
│  ├─ middlewares/
│  │  ├─ authenticate.js         verifica JWT, popula req.user
│  │  ├─ authorize.js            authorize('SUPER_ADMIN')
│  │  ├─ validate.js             validate({ body, query, params })
│  │  ├─ rateLimiters.js         limites distintos por tipo de rota
│  │  ├─ requestId.js
│  │  ├─ notFound.js
│  │  └─ errorHandler.js         tratamento centralizado
│  │
│  ├─ infra/
│  │  └─ storage/
│  │     ├─ storage.port.js      interface: sign, destroy, buildUrl
│  │     ├─ cloudinary.provider.js
│  │     └─ index.js             seleciona provider por STORAGE_PROVIDER
│  │
│  ├─ seo/
│  │  ├─ sitemap.controller.js   sitemap.xml dinâmico
│  │  └─ metaInjector.js         injeção de meta tags no HTML (§11.3)
│  │
│  ├─ utils/
│  │  ├─ ApiError.js             erro de domínio com statusCode + code
│  │  ├─ apiResponse.js          ok() / fail() — envelope único
│  │  ├─ asyncHandler.js         captura rejeições de async em rotas
│  │  ├─ slug.js                 geração + resolução de colisão
│  │  └─ pagination.js
│  │
│  ├─ routes/
│  │  └─ index.js                monta /api e agrega os módulos
│  ├─ scripts/
│  │  ├─ createSuperAdmin.js     único caminho para criar o 1º admin (§7.5)
│  │  └─ seed.js                 dados de demonstração da loja fictícia
│  ├─ app.js                     monta o Express (testável, sem listen)
│  └─ server.js                  conecta o banco e faz listen
├─ tests/
│  ├─ integration/
│  └─ unit/
├─ .env.example
├─ eslint.config.js
└─ package.json
```

**Por que módulos por domínio em vez de `controllers/`, `services/`, `models/`
no topo?** Sua exigência é *"separar claramente controllers, services, models,
routes, middlewares, schemas, config, utils"* — e isso é atendido: cada camada é
um arquivo distinto com responsabilidade explícita. A diferença é o eixo de
agrupamento. Em pastas por camada, tocar "moto" abre 6 diretórios diferentes; e
em um produto que será **personalizado por cliente**, um domínio extra
(ex.: `consorcio/`) vira uma pasta isolada em vez de 6 arquivos espalhados. Você
autorizou adaptação estrutural havendo solução melhor; esta é a recomendação.
Se preferir o agrupamento por camada, é uma troca de layout sem impacto
arquitetural — basta dizer.

### 4.3 `frontend/`

```
frontend/
├─ public/
│  ├─ robots.txt
│  └─ favicon/ ...
├─ src/
│  ├─ app/
│  │  ├─ App.jsx
│  │  ├─ router.jsx              rotas públicas + admin (lazy)
│  │  └─ providers.jsx           QueryClient, Auth, Store config, Helmet
│  │
│  ├─ pages/
│  │  ├─ public/
│  │  │  ├─ Home.jsx
│  │  │  ├─ Estoque.jsx
│  │  │  ├─ MotoDetalhe.jsx
│  │  │  ├─ VendaSuaMoto.jsx
│  │  │  ├─ Financiamento.jsx
│  │  │  ├─ Sobre.jsx
│  │  │  ├─ Contato.jsx
│  │  │  └─ NotFound.jsx
│  │  └─ admin/
│  │     ├─ Login.jsx
│  │     ├─ Dashboard.jsx
│  │     ├─ MotosList.jsx
│  │     ├─ MotoForm.jsx         nova + editar (mesmo formulário)
│  │     ├─ Marcas.jsx
│  │     ├─ Leads.jsx
│  │     ├─ Usuarios.jsx
│  │     └─ Configuracoes.jsx
│  │
│  ├─ features/                  lógica por domínio, reaproveitada entre páginas
│  │  ├─ motos/
│  │  │  ├─ api.js               chamadas Axios do domínio
│  │  │  ├─ hooks.js             useMotos, useMoto, useCreateMoto...
│  │  │  └─ components/          MotoCard, MotoFilters, MotoGallery, MotoSpecs
│  │  ├─ brands/
│  │  ├─ leads/                  InterestForm, SellMotoForm, ContactForm
│  │  ├─ financing/              FinancingSimulator (cálculo puro + testável)
│  │  └─ auth/                   useAuth, RequireAuth, RequireRole
│  │
│  ├─ components/
│  │  ├─ ui/                     Button, Input, Select, Badge, Card, Modal,
│  │  │                          Skeleton, Pagination, EmptyState
│  │  └─ layout/                 PublicLayout, AdminLayout, Header, Footer,
│  │                             WhatsAppFloatingButton, Breadcrumbs
│  ├─ lib/
│  │  ├─ api/
│  │  │  ├─ client.js            instância Axios + baseURL
│  │  │  └─ interceptors.js      token, refresh em 401, desembrulho do envelope
│  │  ├─ seo/
│  │  │  ├─ Seo.jsx              title, description, OG, canonical
│  │  │  └─ jsonld.js            Vehicle, AutoDealer, BreadcrumbList
│  │  ├─ format.js               BRL, km, cilindrada, data
│  │  ├─ whatsapp.js             monta wa.me com mensagem contextual
│  │  └─ image.js                srcset/sizes a partir do provedor
│  ├─ config/
│  │  ├─ theme.js                tokens → CSS custom properties
│  │  └─ storeFallback.js        defaults até a API responder
│  ├─ styles/index.css
│  └─ main.jsx
├─ index.html                    contém os placeholders de meta (§11.3)
├─ vite.config.js
├─ tailwind.config.js
├─ .env.example
└─ package.json
```

### 4.4 `shared/`

```
shared/
├─ src/
│  ├─ enums.js        MOTO_STATUS, FUEL, TRANSMISSION, LEAD_TYPE,
│  │                  LEAD_STATUS, USER_ROLE  — fonte única
│  ├─ schemas/        schemas Zod reutilizados no cliente e no servidor
│  └─ index.js
└─ package.json       name: @motorshop/shared, type: module
```

Resolve P-02 no ponto mais crítico: os enums e as regras de validação passam a
existir **uma vez**. Um `combustivel: "FLEX"` inválido não chega a sair do
navegador, e a mesma regra é reaplicada no servidor (validação de cliente nunca
substitui a de servidor).

---

## 5. Modelos

Todos os modelos usam `timestamps: true` (gera `createdAt`/`updatedAt`). IDs são
`ObjectId` do MongoDB, expostos na API como `id` (string), nunca `_id`.

### 5.1 `Moto` — recurso principal

| Campo | Tipo | Regras | Público? |
|---|---|---|---|
| `_id` | ObjectId | — | ✅ como `id` |
| `brand` | ObjectId → `Brand` | obrigatório, deve existir e estar ativa | ✅ (populado) |
| `model` | String | obrigatório, trim, 1–80 | ✅ |
| `version` | String | opcional, ≤ 80 | ✅ |
| `year` | Number | obrigatório, 1950 ≤ y ≤ anoAtual+1 | ✅ |
| `mileage` | Number | obrigatório, ≥ 0, inteiro | ✅ |
| `price` | Number | obrigatório, > 0, **em centavos** (§15 D-04) | ✅ |
| `engineCapacity` | Number | obrigatório, cc, 49–3000 | ✅ |
| `fuel` | Enum | `GASOLINE \| FLEX \| ELECTRIC` | ✅ |
| `transmission` | Enum | `MANUAL \| AUTOMATIC \| CVT \| DCT` | ✅ |
| `color` | String | obrigatório | ✅ |
| `licensePlate` | String | **opcional**, normalizado, `select: false` | ❌ **nunca** |
| `description` | String | opcional, ≤ 5000 | ✅ |
| `features` | [String] | opcionais da moto, ≤ 40 itens | ✅ |
| `images` | [ImageSubdoc] | ≤ 20, ver §5.1.1 | ✅ |
| `mainImageId` | String | referencia um `images[].id` | ✅ |
| `featured` | Boolean | default `false` — seção "destaques" | ✅ |
| `onSale` | Boolean | default `false` — seção "ofertas" | ✅ |
| `previousPrice` | Number | **condicional**: exigido se `onSale = true` | ✅ |
| `status` | Enum | `AVAILABLE \| RESERVED \| SOLD \| INACTIVE`, default `AVAILABLE` | ✅ |
| `slug` | String | único, imutável após criação (§5.1.2) | ✅ |
| `createdAt` / `updatedAt` | Date | automáticos | ✅ |

Notas de projeto:

- `previousPrice` existe porque "oferta" sem preço anterior não comunica
  desconto. É o único campo adicionado além da sua lista, e é condicionado a
  `onSale` — não é campo especulativo.
- **Não** foram incluídos campos antecipatórios frequentes e não pedidos
  (`purchaseCost`, `views`, `chassis`, `renavam`, `owners`, `ipvaPaid`). Se
  "motos mais vistas" entrar no escopo, entra com o contador na fase certa.
- `licensePlate` fica com `select: false` no schema: só aparece se explicitamente
  requisitado por um repositório administrativo. É defesa em profundidade contra
  P-05 — esquecer de remover o campo não vaza o dado.

#### 5.1.1 Subdocumento de imagem

```js
{
  id:       String,   // estável, usado por mainImageId e pela UI
  publicId: String,   // identificador no provedor (Cloudinary public_id)
  url:      String,   // URL canônica devolvida pelo provedor
  width:    Number,
  height:   Number,   // width/height evitam layout shift (CLS) — §12
  alt:      String,   // acessibilidade + SEO de imagem
  order:    Number
}
```

O binário **nunca** entra no MongoDB (§10). Guardar `width`/`height` permite
reservar o espaço da imagem antes do carregamento, eliminando salto de layout.

#### 5.1.2 Slug

- Gerado de `marca-modelo-versao-ano`, transliterado e minúsculo.
  Ex.: `honda-cb-500f-2024`.
- Colisão resolvida com sufixo curto derivado do id: `honda-cb-500f-2024-7b3f`.
- **Imutável após a criação.** Regravar slug quebra links já indexados e já
  compartilhados no WhatsApp. Se o modelo for corrigido, o slug antigo
  permanece. (Se você quiser permitir troca, a solução correta é uma coleção de
  redirects 301 — é a decisão D-07.)

### 5.2 `Brand`

| Campo | Tipo | Regras |
|---|---|---|
| `name` | String | obrigatório, único (case-insensitive) |
| `slug` | String | único, gerado do nome |
| `logo` | ImageSubdoc | opcional |
| `active` | Boolean | default `true` |

Exclusão de marca com motos vinculadas é **bloqueada** (409) — a alternativa,
desativar (`active: false`), é oferecida. Isso evita moto órfã, que quebraria a
página de detalhe.

### 5.3 `Lead`

Coleção única com campo discriminador `type` e um bloco `data` validado por
união discriminada em Zod. Justificativa em §15 D-05.

| Campo | Tipo | Regras |
|---|---|---|
| `type` | Enum | `MOTO_INTEREST \| SELL_MOTO \| CONTACT \| FINANCING` |
| `name` | String | obrigatório |
| `phone` | String | obrigatório, normalizado E.164 |
| `email` | String | opcional, validado |
| `message` | String | opcional, ≤ 2000 |
| `moto` | ObjectId → `Moto` | obrigatório se `type = MOTO_INTEREST` |
| `data` | Mixed validado | específico por tipo, ver abaixo |
| `status` | Enum | `NEW \| IN_PROGRESS \| WON \| LOST`, default `NEW` |
| `source` | Object | `{ page, referrer, utm }` — de onde veio |
| `notes` | [{ text, author, createdAt }] | anotações da equipe |
| `consent` | Object | `{ accepted: Boolean, at: Date, textVersion: String }` |

`data` por tipo:

- `SELL_MOTO` — `{ brand, model, year, mileage, expectedPrice?, condition? }`
- `FINANCING` — `{ motoId?, vehiclePrice, downPayment, installments }`
- `MOTO_INTEREST` / `CONTACT` — vazio

`consent` não é enfeite: é o registro da base legal exigido pela LGPD (P-06),
com versionamento do texto aceito.

### 5.4 `User` (administrativo)

| Campo | Tipo | Regras |
|---|---|---|
| `name` | String | obrigatório |
| `email` | String | único, minúsculo, índice |
| `passwordHash` | String | **`select: false`**, argon2id |
| `role` | Enum | `ADMIN \| SUPER_ADMIN` |
| `active` | Boolean | default `true` — desativar em vez de excluir |
| `lastLoginAt` | Date | auditoria |

- **Não existe endpoint público de registro.** O primeiro `SUPER_ADMIN` nasce
  por script de linha de comando (§7.5); os demais são criados por um
  `SUPER_ADMIN` autenticado.
- `passwordHash` com `select: false` garante que nenhuma query genérica o
  devolva por acidente.

### 5.5 `StoreSettings` — chave da revenda

Documento **único** (singleton) que concentra tudo que muda de loja para loja:

```js
{
  name, legalName?, slogan?,
  logo: ImageSubdoc, favicon?: ImageSubdoc, ogImage?: ImageSubdoc,
  theme: { primary, secondary, accent, neutral, radius, fontHeading, fontBody },
  contact: { whatsapp, phone, email },
  address: { street, number, complement?, district, city, state, zipCode,
             mapsUrl?, geo?: { lat, lng } },
  social:  { instagram?, facebook?, youtube?, tiktok? },
  businessHours: [{ weekday, opensAt, closesAt, closed }],
  seo: { defaultTitle, titleTemplate, defaultDescription, siteUrl },
  features: { financingEnabled, sellMotoEnabled, tradeInEnabled }
}
```

Consequência direta: **nada** como `const whatsapp = "49999999999"` no código.
O frontend lê `GET /api/store` uma vez, guarda em contexto + cache, e aplica o
tema como variáveis CSS. Trocar a loja = trocar um documento, não recompilar.

`features` é o interruptor que permite vender o produto com módulos ligados ou
desligados por cliente, sem branch de código.

> Já é a futura entidade `Store`/`Tenant`. Não há `storeId` em Moto/Brand/Lead
> agora — seria campo morto (você pediu para não antecipar). O caminho de
> migração está em §14.3.

### 5.6 `RefreshToken`

| Campo | Tipo | Observação |
|---|---|---|
| `user` | ObjectId → `User` | |
| `tokenHash` | String | **hash** do token, nunca o token |
| `jti` | String | identificador único, indexado |
| `expiresAt` | Date | índice TTL → limpeza automática |
| `revokedAt` | Date | rotação/logout |
| `userAgent`, `ip` | String | auditoria de sessão |

Existe para permitir **revogação real** de sessão — JWT puro não revoga.

---

## 6. API

### 6.1 Convenções

- Base: `/api`. Versionamento adiado deliberadamente (§14.4).
- JSON em requisição e resposta; `Content-Type: application/json`.
- Nomes de caminho em **português** (`/motos`, `/marcas`), alinhados ao domínio
  do cliente e às rotas do frontend; campos do payload em **inglês**
  (`price`, `mileage`), alinhados ao código. Coerência interna é o que importa.
- Recursos administrativos usam os **mesmos** caminhos, diferenciados por
  autenticação e por projeção — exceto quando a semântica difere de fato.
- `PATCH` para atualização parcial (`PUT` não é usado, pois nenhuma tela envia
  o recurso completo).

### 6.2 Envelope de sucesso

```json
{ "success": true, "data": {}, "message": null }
```

Listas paginadas acrescentam `meta`:

```json
{
  "success": true,
  "data": [ { } ],
  "meta": { "page": 2, "limit": 12, "total": 87, "totalPages": 8 },
  "message": null
}
```

### 6.3 Envelope de erro

```json
{
  "success": false,
  "message": "Dados inválidos",
  "errors": [ { "field": "price", "code": "too_small", "message": "Preço deve ser maior que zero" } ],
  "requestId": "01J9X2..."
}
```

`errors` é sempre um array (vazio quando não há detalhamento por campo) —
o cliente nunca precisa checar o tipo. `requestId` correlaciona com o log do
servidor sem expor nada interno. **Em produção, `stack` nunca é serializada.**

Códigos usados: `400` semântica inválida · `401` não autenticado ·
`403` sem permissão · `404` inexistente · `409` conflito (slug, marca em uso) ·
`422` falha de validação Zod · `429` rate limit · `500` erro interno.

### 6.4 Endpoints

#### Público — Motos

| Método | Caminho | Descrição |
|---|---|---|
| `GET` | `/api/motos` | Lista paginada + filtros + ordenação |
| `GET` | `/api/motos/slug/:slug` | **Rota canônica** da página de detalhe |
| `GET` | `/api/motos/:id/similares` | Motos relacionadas (mesma faixa/marca) |
| `GET` | `/api/marcas` | Marcas ativas, com contagem de motos |
| `GET` | `/api/store` | Configuração pública da loja |
| `GET` | `/api/filtros` | Faixas reais para montar os filtros (§6.6) |

Query params de `GET /api/motos` (todos opcionais, todos validados):

```
q          busca textual (modelo, versão, descrição)
marca      slug da marca (aceita múltiplos: marca=honda,yamaha)
precoMin   precoMax      (em reais na API, convertidos p/ centavos)
anoMin     anoMax
kmMin      kmMax
ccMin      ccMax
combustivel  cambio      (enums de shared/)
destaque   oferta        (boolean)
sort       preco_asc | preco_desc | ano_desc | ano_asc |
           km_asc | km_desc | recentes   (whitelist estrita)
page       limit         (limit padrão 12, máximo 48)
```

> `GET /api/motos/:id` **não** é exposto publicamente. A rota pública é por
> slug; o acesso por id é administrativo. Reduz enumeração de recursos e
> mantém uma URL canônica única por moto (bom para SEO, §11).

#### Administrativo — Motos (requer autenticação)

| Método | Caminho | Papel |
|---|---|---|
| `GET` | `/api/admin/motos` | ADMIN — inclui `INACTIVE`, `placa`, e filtro por status |
| `GET` | `/api/admin/motos/:id` | ADMIN |
| `POST` | `/api/admin/motos` | ADMIN |
| `PATCH` | `/api/admin/motos/:id` | ADMIN |
| `PATCH` | `/api/admin/motos/:id/status` | ADMIN — operação mais frequente da loja |
| `DELETE` | `/api/admin/motos/:id` | ADMIN — **soft delete** (§15 D-06) |
| `POST` | `/api/admin/motos/:id/imagens` | ADMIN — vincula imagens já enviadas |
| `PATCH` | `/api/admin/motos/:id/imagens/ordem` | ADMIN — reordena / define principal |
| `DELETE` | `/api/admin/motos/:id/imagens/:imageId` | ADMIN |

> **Por que separar `/api/admin/*` do público?** Com o mesmo caminho servindo os
> dois, a projeção correta depende de um `if` dentro do serviço — e um `if`
> esquecido vaza `placa` ou estoque inativo. Com caminhos distintos, o público
> **não tem** código capaz de devolver campo privado. É a mitigação estrutural
> de P-05 e de IDOR/BOLA (§8.4).

#### Marcas, Leads, Usuários, Configurações, Uploads, SEO

| Método | Caminho | Acesso |
|---|---|---|
| `POST` | `/api/admin/marcas` | ADMIN |
| `PATCH` | `/api/admin/marcas/:id` | ADMIN |
| `DELETE` | `/api/admin/marcas/:id` | ADMIN (409 se em uso) |
| `POST` | `/api/leads` | **público**, rate limit agressivo |
| `GET` | `/api/admin/leads` | ADMIN — filtro por tipo/status/período |
| `GET` | `/api/admin/leads/:id` | ADMIN |
| `PATCH` | `/api/admin/leads/:id` | ADMIN — status e anotações |
| `DELETE` | `/api/admin/leads/:id` | SUPER_ADMIN — LGPD, eliminação a pedido |
| `POST` | `/api/auth/login` | público, rate limit por IP+e-mail |
| `POST` | `/api/auth/refresh` | cookie httpOnly |
| `POST` | `/api/auth/logout` | autenticado |
| `GET` | `/api/auth/me` | autenticado |
| `GET` | `/api/admin/usuarios` | SUPER_ADMIN |
| `POST` | `/api/admin/usuarios` | SUPER_ADMIN |
| `PATCH` | `/api/admin/usuarios/:id` | SUPER_ADMIN |
| `DELETE` | `/api/admin/usuarios/:id` | SUPER_ADMIN (desativa) |
| `GET` | `/api/admin/store` | ADMIN |
| `PATCH` | `/api/admin/store` | SUPER_ADMIN |
| `POST` | `/api/admin/uploads/assinatura` | ADMIN — upload direto (§10.4) |
| `GET` | `/sitemap.xml` | público, gerado da base |
| `GET` | `/robots.txt` | público |
| `GET` | `/api/health` | público, sem detalhe interno |

**Simulação de financiamento roda no cliente** (função pura, testável) — não há
endpoint. É cálculo determinístico sem dado sensível; ir ao servidor só
adicionaria latência. O endpoint existente é `POST /api/leads` com
`type: FINANCING`, quando o usuário decide enviar a simulação.

### 6.5 Ajustes propostos aos endpoints do briefing

| No briefing | Proposto | Motivo |
|---|---|---|
| `GET /api/motos/:id` público | somente administrativo | URL canônica única + menos enumeração |
| `POST/PATCH/DELETE /api/motos` | sob `/api/admin/motos` | impossibilita vazamento de campo privado por engano |
| `GET /api/leads` | `GET /api/admin/leads` | contém dado pessoal (LGPD) |
| — | `PATCH /motos/:id/status` | operação diária mais comum, evita PATCH genérico |
| — | `GET /api/filtros` | evita baixar todo o estoque para montar os filtros |

### 6.6 `GET /api/filtros`

Retorna as faixas **reais** do estoque (min/max de preço, ano, km, cc; marcas
com contagem; enums em uso). Sem isso, a tela de filtros precisaria de todas as
motos para saber os limites dos sliders — exatamente o que você proibiu
("não carregar todas as motos desnecessariamente"). Resolvido com uma única
agregação, cacheada (§12.4).

---

## 7. Autenticação

### 7.1 Estratégia

**Access token JWT curto + refresh token opaco em cookie httpOnly.**

| Token | Forma | Validade | Onde fica |
|---|---|---|---|
| Access | JWT assinado HS256 | 15 min | **memória** do JS (React context) |
| Refresh | aleatório 256 bits, opaco | 7 dias | cookie `httpOnly` + `Secure` + `SameSite=Strict`, `Path=/api/auth` |

**Por que não JWT em `localStorage`?** `localStorage` é legível por qualquer
script — um XSS entrega uma sessão administrativa completa, com poder de
apagar o estoque. Cookie `httpOnly` não é acessível por JS. Access token em
memória limita a janela de exposição a 15 minutos e desaparece ao recarregar.
O custo é um endpoint de refresh e CORS com credenciais — preço baixo para
proteger o painel.

Conteúdo do JWT: `{ sub, role, iat, exp, iss, aud }`. **Nada sensível** —
nunca e-mail, nome ou permissões detalhadas. É assinado, não criptografado:
qualquer pessoa lê o conteúdo.

### 7.2 Fluxo de login

```
Admin envia e-mail + senha
   POST /api/auth/login          (rate limit: 5 tentativas / 15 min por IP+e-mail)
        │
   Zod valida o formato
        │
   Busca usuário por e-mail, com .select('+passwordHash')
        │
   Usuário inexistente OU inativo OU senha incorreta
        └─► 401 "Credenciais inválidas"   ← mensagem IDÊNTICA nos três casos
            (não revela se o e-mail existe — evita enumeração de usuários)
            Compara o hash mesmo quando o usuário não existe, com um hash
            fictício, para não vazar a diferença por tempo de resposta.
        │
   Sucesso:
     - gera access JWT (15 min)
     - gera refresh opaco; grava apenas o HASH em RefreshToken
     - Set-Cookie httpOnly Secure SameSite=Strict
     - atualiza lastLoginAt
     - responde { user: { id, name, role }, accessToken }
```

### 7.3 Renovação com rotação

`POST /api/auth/refresh` valida o cookie, **revoga** o refresh usado e emite um
novo par (rotação). Se um refresh já revogado for reapresentado, é sinal de
roubo de token: **todas** as sessões daquele usuário são revogadas e o evento
é logado. Isso é detecção de reuso, e é o que torna o refresh token seguro.

No cliente, um interceptor Axios trata `401` uma única vez: chama refresh,
repete a requisição original e, em caso de falha, redireciona para o login.
Requisições concorrentes compartilham uma única promessa de refresh para não
disparar N refreshes simultâneos (que a rotação interpretaria como ataque).

### 7.4 Autorização

```js
// Duas checagens independentes e encadeadas
router.post('/usuarios', authenticate, authorize('SUPER_ADMIN'), ...)
```

- `authenticate` — valida assinatura/expiração, confirma que o usuário **ainda
  existe e está ativo** (um admin desativado perde acesso imediatamente, sem
  esperar o token expirar), popula `req.user`.
- `authorize(...roles)` — compara o papel.

| Recurso | ADMIN | SUPER_ADMIN |
|---|---|---|
| Motos, marcas, imagens (CRUD) | ✅ | ✅ |
| Leads: ler, atualizar status | ✅ | ✅ |
| Leads: excluir (LGPD) | ❌ | ✅ |
| Usuários (CRUD) | ❌ | ✅ |
| Configurações da loja: ler | ✅ | ✅ |
| Configurações da loja: alterar | ❌ | ✅ |

Um `SUPER_ADMIN` não pode rebaixar nem desativar a si mesmo, e o sistema recusa
remover o **último** `SUPER_ADMIN` ativo — caso contrário o painel fica
inacessível sem intervenção no banco.

### 7.5 Primeiro usuário

`npm run create:superadmin` (script interativo, `backend/src/scripts/`). Lê a
senha sem ecoar no terminal e sem persistir em histórico de shell.
**Nenhum endpoint HTTP cria o primeiro administrador** e não há credencial
padrão embutida — as duas falhas mais comuns nesse tipo de sistema.

### 7.6 Proteção de rotas no frontend

`RequireAuth` e `RequireRole` envolvem as rotas `/admin/*`. Isso é **UX, não
segurança**: a autorização real é do servidor, e toda rota administrativa é
verificada no backend independentemente do que o cliente exiba.

---

## 8. Segurança

Segurança entra desde a FASE 1, não como fase final. A FASE 10 do roadmap é
auditoria e endurecimento — não a primeira aparição do tema.

### 8.1 Middlewares globais (ordem importa)

```js
app.set('trust proxy', 1);          // IP real atrás do proxy → rate limit correto
app.use(requestId);                 // correlação de logs
app.use(helmet({ ... }));           // CSP, HSTS, noSniff, frameguard, referrer
app.use(cors(corsOptions));         // origens por env, credentials: true
app.use(express.json({ limit: '100kb' }));   // payload mínimo necessário
app.use(cookieParser());
app.use(compression());
app.use(pinoHttp({ redact: [...] }));
app.use('/api', globalRateLimit);
// ... rotas ...
app.use(notFound);
app.use(errorHandler);              // sempre o último
```

`limit: '100kb'` é suficiente porque **imagens não passam pela API** (§10.4) —
o maior payload é um cadastro de moto com descrição. Limite baixo é defesa
direta contra exaustão de memória.

### 8.2 CORS

Origens permitidas vêm de `CORS_ORIGINS` (lista separada por vírgula), nunca
`*` — incompatível com `credentials: true` e inaceitável para um painel
administrativo. Métodos e cabeçalhos são whitelistados.

### 8.3 Rate limiting por perfil de rota

| Escopo | Limite | Razão |
|---|---|---|
| `POST /api/auth/login` | 5 / 15 min por IP + e-mail | força bruta |
| `POST /api/auth/refresh` | 30 / 15 min por IP | abuso de rotação |
| `POST /api/leads` | 5 / hora por IP | spam de formulário |
| `GET /api/*` público | 300 / 15 min por IP | scraping abusivo |
| `/api/admin/*` | 600 / 15 min por usuário | operação normal folgada |

Armazenamento em memória no MVP (instância única). Com múltiplas instâncias, o
contador precisa ser compartilhado (Redis) — registrado como R-06.

### 8.4 IDOR / BOLA e exposição de campos

Quatro camadas, propositalmente redundantes:

1. **Separação de caminhos** — o código público não possui rota capaz de
   devolver recurso privado (§6.4).
2. **Projeção explícita no repositório** — as consultas públicas listam os
   campos permitidos (allowlist); nunca devolvem o documento cru. Um campo novo
   no schema **não** se torna público automaticamente.
3. **`select: false` no schema** para `licensePlate` e `passwordHash` —
   proteção mesmo contra query descuidada.
4. **Filtro de status imposto pelo servidor** — o cliente não escolhe ver
   `INACTIVE`. O filtro público é constante de servidor, não parâmetro.

Como não há recurso "pertencente a um usuário final" (sem área de cliente), a
superfície clássica de IDOR é pequena; o risco real é **exposição de campo** e
**enumeração de estoque**, e é isso que está coberto.

### 8.5 Validação e sanitização

- **Toda** entrada (body, query, params) passa por Zod antes do controller.
  `.strict()` nas escritas: chave desconhecida é erro, não é ignorada — impede
  *mass assignment* (ex.: enviar `role: "SUPER_ADMIN"` em um update de perfil).
- Coerção explícita de query string (`"2024"` → `2024`).
- `sort` e filtros são **whitelist**; nunca há interpolação de entrada do
  usuário em objeto de query Mongo. Chaves iniciadas por `$` ou contendo `.`
  são rejeitadas — bloqueia injeção de operador NoSQL.
- Texto livre (`description`, `message`) é armazenado sem HTML e sempre
  renderizado como texto pelo React (nunca `dangerouslySetInnerHTML`), o que
  neutraliza XSS armazenado.
- `q` (busca textual) usa índice de texto do MongoDB, **não** `RegExp` montado
  com entrada do usuário (ReDoS).

### 8.6 Senhas e segredos

- **argon2id** (§15 D-03), com parâmetros explícitos de memória/tempo.
- Senha mínima de 12 caracteres para conta administrativa; verificação contra
  lista de senhas obviamente fracas.
- Nenhum segredo no frontend. Tudo `VITE_*` é público por definição — ali só
  entram `VITE_API_URL` e afins. `JWT_SECRET`, string do Mongo e chaves do
  Cloudinary existem **apenas** no servidor.
- `.env` no `.gitignore`; `.env.example` sem valor real.
- `JWT_SECRET` com no mínimo 32 bytes aleatórios, distinto por ambiente; o
  servidor **recusa iniciar** com segredo ausente ou curto (validação Zod no
  boot). Isso impede o clássico "subiu em produção com o segredo de exemplo".

### 8.7 Logs e LGPD

- `pino` com *redaction* de `authorization`, `cookie`, `password`,
  `passwordHash`, `token`, `refreshToken`.
- Log de lead registra o `id`, **não** telefone e e-mail.
- Leads contêm dado pessoal: acesso restrito a autenticados, exclusão restrita
  a `SUPER_ADMIN`, `consent` versionado registrado na criação, política de
  retenção a definir (decisão **E**), exportação/eliminação a pedido do titular
  suportadas pelo endpoint de exclusão.
- Em produção, `stack` nunca vai para a resposta HTTP; vai para o log, atrelada
  ao `requestId`.

### 8.8 Erros centralizados

Um único `errorHandler`: converte `ApiError`, `ZodError`,
`mongoose.ValidationError`, `CastError` e erro de chave duplicada (11000) no
envelope de §6.3. Qualquer exceção não mapeada vira `500` com mensagem genérica
— sem detalhe interno, sem nome de coleção, sem stack.

---

## 9. Banco de dados

### 9.1 MongoDB Atlas

- MVP em **M0 (gratuito)**: suficiente para catálogo de dezenas a centenas de
  motos e tráfego inicial. Limites relevantes: ~500 conexões, sem métricas
  avançadas, performance compartilhada.
- Caminho de crescimento: **M10** ao entrar em produção comercial séria (backup
  contínuo, restauração pontual, métricas, Atlas Search).
- **Network Access:** no MVP a plataforma de deploy não garante IP fixo, então
  `0.0.0.0/0` é tecnicamente necessário — e isso torna a força da senha do
  usuário do banco a única barreira. Registrado como R-03, com mitigação em
  §13.4 (peering/IP dedicado ao migrar para plano pago).
- Usuário do banco com permissão **restrita a um único database**, nunca
  `atlasAdmin`.

### 9.2 Conexão

Pool único reaproveitado pelo processo (`maxPoolSize: 10`), conectado **antes**
de aceitar tráfego, com log dos eventos de desconexão/reconexão.
`server.js` conecta e só então faz `listen` — evita a janela em que o serviço
responde 500 porque o banco ainda não subiu.

### 9.3 Modelagem: referência vs. embutido

| Relação | Decisão | Motivo |
|---|---|---|
| Moto → Brand | **referência** (`ObjectId`) | marca é entidade própria, editável; renomear "Honda" não pode exigir atualizar N motos |
| Moto → Images | **embutido** | sempre lidas junto com a moto, cardinalidade baixa (≤ 20), nunca consultadas isoladamente |
| Lead → Moto | **referência** | lead precisa apontar para a moto real |
| Lead → Notes | **embutido** | pertencem ao lead, poucas |

A denormalização de `brandName`/`brandSlug` dentro de `Moto` (que evitaria
`populate` na listagem) foi **deliberadamente descartada por ora**: cria
inconsistência a manter e o `populate` de uma marca sobre 12 documentos é
trivial. Deve ser reavaliada com `explain()` real, não por antecipação.

### 9.4 Índices — só o que se justifica

Princípio: índice acelera leitura e **encarece escrita**. Aqui a leitura domina
(visitantes) e a escrita é raríssima (a loja cadastra algumas motos por dia), o
que favorece índices — mas não os torna gratuitos em armazenamento e em tempo
de build.

**`motos`**

| Índice | Serve | Justificativa |
|---|---|---|
| `{ slug: 1 }` unique | `GET /motos/slug/:slug` | consulta de toda página de detalhe; unicidade é regra |
| `{ status: 1, featured: -1, createdAt: -1 }` | home (destaques, últimas) e listagem padrão | `status` como prefixo serve também a filtros que só usam status |
| `{ status: 1, brand: 1, price: 1 }` | filtro por marca + faixa de preço + ordenação por preço | combinação mais usada do catálogo |
| `{ status: 1, price: 1 }` | ordenar por preço sem filtro de marca | não coberto pelo anterior (prefixo não contém `brand`) |
| `{ status: 1, year: -1 }` | ordenar/filtrar por ano | segunda ordenação mais usada |
| `{ model: 'text', version: 'text', description: 'text' }` | parâmetro `q` | alternativa a `RegExp` (lento e vulnerável a ReDoS) |

**Não** serão criados de saída: `mileage`, `engineCapacity`, `fuel`,
`transmission`, `color`, `onSale`. São filtros de **refinamento**, aplicados
sobre um conjunto já reduzido pelos índices acima; indexar tudo é o
overengineering que você pediu para evitar. Entram se `explain()` mostrar
necessidade.

**Demais coleções**

| Coleção | Índices |
|---|---|
| `brands` | `{ slug: 1 }` unique · `{ active: 1, name: 1 }` |
| `leads` | `{ createdAt: -1 }` · `{ status: 1, createdAt: -1 }` · `{ type: 1, createdAt: -1 }` |
| `users` | `{ email: 1 }` unique |
| `refreshtokens` | `{ jti: 1 }` unique · `{ expiresAt: 1 }` **TTL** · `{ user: 1 }` |

O TTL em `refreshtokens` faz o MongoDB limpar sessões expiradas sozinho — sem
job de manutenção.

`autoIndex` fica **desligado em produção** (construir índice a cada deploy é
custo desnecessário); a criação é feita por script explícito de migração.

### 9.5 Paginação

`skip`/`limit` no MVP. É o padrão adequado porque a UI precisa de números de
página e o `skip` só degrada em offsets muito altos — com dezenas/centenas de
motos e `limit` máximo de 48, isso não acontece. Se o estoque crescer a
milhares, a alternativa é paginação por cursor; registrado em §14.

`countDocuments()` roda em paralelo com o `find()` (`Promise.all`), não em
série.

### 9.6 Transações

MongoDB Atlas é replica set, então transações estão disponíveis. Serão usadas
**apenas** onde há real necessidade de atomicidade entre documentos — na
prática, quase nada neste domínio. Não haverá transação decorativa envolvendo
escrita de documento único (já atômica por natureza).

---

## 10. Imagens

### 10.1 Regra absoluta

Binário de imagem **nunca** entra no MongoDB. Motivos: limite de 16 MB por
documento, inflação do working set (toda leitura de moto carregaria megabytes),
impossibilidade de servir por CDN e custo de armazenamento em banco.
O banco guarda **apenas metadados** (§5.1.1).

### 10.2 Escolha do provedor: Cloudinary

| Critério | **Cloudinary** | Cloudflare R2 | AWS S3 |
|---|---|---|---|
| Transformação on-the-fly (resize/crop) | ✅ nativa, por URL | ❌ requer Cloudflare Images (extra) | ❌ requer Lambda@Edge/CloudFront Functions |
| WebP/AVIF automático por navegador | ✅ `f_auto` | ❌ próprio | ❌ próprio |
| Qualidade adaptativa | ✅ `q_auto` | ❌ | ❌ |
| CDN incluída | ✅ | ✅ | precisa CloudFront |
| Upload direto do navegador | ✅ assinado | ✅ presigned | ✅ presigned |
| Custo de egresso | incluído na cota | **zero** | pago |
| Esforço até funcionar | **baixo** | médio-alto | alto |
| Plano gratuito | sim, suficiente p/ MVP | 10 GB | limitado |

**Decisão: Cloudinary para o MVP.**

Justificativa: o gargalo real de uma plataforma deste tipo é **imagem** — são
15–20 fotos por moto, tiradas em celular, com 3–6 MB cada. Sem um pipeline de
redimensionamento e conversão de formato, a home e o catálogo ficam lentos no
4G, que é onde o cliente está. Com R2 ou S3, esse pipeline é **nosso** para
construir e manter (sharp, geração de variantes, invalidação, armazenamento das
variantes). Com Cloudinary, é um parâmetro na URL. Para um MVP cuja meta é
demonstrar e vender o produto, comprar esse trabalho pronto é a decisão certa.

O ponto fraco do Cloudinary é o custo em escala (muitas lojas, muito tráfego) —
e é exatamente por isso que ele fica atrás de uma porta (§10.3). Quando o custo
justificar, o destino natural é **R2 + sharp no backend**, pelo egresso zero.

### 10.3 Porta de armazenamento

```js
// infra/storage/storage.port.js — contrato que todo provedor cumpre
export const StoragePort = {
  createSignedUpload({ folder, resourceType }), // credencial p/ upload direto
  destroy(publicId),                            // remove o arquivo
  buildUrl(publicId, { width, quality, format }) // URL derivada/otimizada
};
```

Nenhum serviço, controller ou model importa `cloudinary`. Só
`cloudinary.provider.js` importa. `infra/storage/index.js` escolhe o provedor
por `STORAGE_PROVIDER`. Trocar de provedor = escrever um segundo arquivo que
cumpra o contrato, mais migração dos arquivos existentes — sem tocar no domínio.

### 10.4 Fluxo de upload: direto do navegador

```
1. Admin escolhe as fotos no MotoForm
2. POST /api/admin/uploads/assinatura   (autenticado, ADMIN)
   → backend devolve assinatura + timestamp + pasta + restrições
     (formatos permitidos, tamanho máximo)
3. Navegador envia o arquivo DIRETO ao Cloudinary (não passa pela API)
4. Cloudinary devolve { public_id, secure_url, width, height, format, bytes }
5. POST /api/admin/motos/:id/imagens  com esses metadados
6. Backend VALIDA os metadados com Zod, confere o prefixo da pasta
   e persiste o subdocumento
```

Por que direto, e não via API: multipart de 20 arquivos × 5 MB através do Node
consome memória, prende o event loop, estoura timeout de plataformas
serverless e obriga um `body limit` alto (contradizendo §8.1). No fluxo direto,
o maior payload da API continua sendo JSON pequeno.

Ponto de atenção de segurança: a assinatura é emitida **só** para admin
autenticado, com escopo de pasta, formatos e tamanho máximo — e o backend
**revalida** o que o cliente afirma ter enviado. Não se confia no metadado
vindo do navegador.

### 10.5 Entrega otimizada

- `f_auto` (AVIF/WebP conforme suporte) e `q_auto` em toda URL de exibição.
- `srcset` + `sizes` por contexto: miniatura (~160px), card (~480px),
  galeria (~1280px), OG (1200×630).
- `loading="lazy"` + `decoding="async"` em tudo, **exceto** a imagem principal
  do topo da home e a primeira da galeria, que recebem `fetchpriority="high"`
  (é o LCP da página — atrasá-la piora a métrica em vez de melhorar).
- `width`/`height` sempre presentes → CLS próximo de zero.

### 10.6 Exclusão

Remover imagem de uma moto remove o metadado **e** chama `destroy` no provedor.
Falha no provedor não deve derrubar a operação: o metadado sai, e a falha é
logada para reconciliação. Arquivo órfão no CDN é problema menor do que
referência quebrada na página.

---

## 11. SEO

### 11.1 O problema, com precisão

`GET /` de um SPA Vite devolve:

```html
<div id="root"></div>
```

Consequências:

| Consumidor | Executa JS? | Resultado |
|---|---|---|
| Googlebot | Sim (renderização em 2ª onda) | Indexa, mas com atraso e sem garantia de que o `<title>` correto seja usado |
| **WhatsApp** | **Não** | **Sem preview: link cru, sem foto, sem preço** |
| Facebook / Instagram | **Não** | Sem preview |
| X / Telegram / LinkedIn | **Não** | Sem preview |
| Bing / outros | Parcial | Indexação pior |

Para esta plataforma, a linha crítica é a do WhatsApp. Uma loja de motos vende
mandando o link da moto no WhatsApp; se o link não mostra foto, modelo e preço,
o canal principal de vendas está quebrado. **Isto é falha de produto, não
detalhe técnico** — e é o motivo pelo qual não se pode "deixar SEO para depois".

### 11.2 Alternativas avaliadas

| Abordagem | Resolve OG? | Mantém React+Vite+JS? | Custo | Veredito |
|---|---|---|---|---|
| Só `react-helmet` (meta no cliente) | ❌ | ✅ | baixo | **Insuficiente** — crawler social não roda JS |
| Pré-renderização no build | Parcial | ✅ | médio | Não serve `/motos/:slug`: exigiria rebuild+redeploy a cada cadastro |
| **Injeção de meta no servidor** | ✅ | ✅ | **baixo** | **Recomendado** |
| SSR com `renderToString` | ✅ | ✅ | alto | Caminho de escalada, se necessário |
| Trocar para Next.js | ✅ | ❌ | alto | **Fora de escopo** — exigiria sua autorização |

### 11.3 Solução recomendada: injeção de meta no servidor

O Node que serve o `index.html` intercepta a requisição, identifica a rota,
busca os dados necessários e devolve o **mesmo** HTML do SPA com as meta tags
já preenchidas.

```
GET /motos/honda-cb-500f-2024
        │
  metaInjector: casa a rota, busca a moto (cache 5 min)
        │
  substitui os placeholders do index.html:
    <title>Honda CB 500F 2024 — 12.000 km | {Loja}</title>
    <meta name="description" content="Honda CB 500F 2024, 12.000 km, ...">
    <meta property="og:title" ...>  <meta property="og:image" content="{1200x630}">
    <meta property="og:type" content="product">
    <link rel="canonical" href="https://.../motos/honda-cb-500f-2024">
    <script type="application/ld+json"> { Vehicle + Offer } </script>
        │
  devolve o HTML. O React hidrata normalmente e assume a navegação.
```

Por que isto é a escolha certa:

- **Zero mudança de stack.** React, Vite, JavaScript, React Router e Axios
  permanecem exatamente como especificado. É um middleware no backend, não um
  framework novo.
- **Resolve o caso crítico.** Crawler social lê meta tag no HTML inicial — e
  ela está lá. Preview do WhatsApp funciona.
- **Resolve o Google de verdade.** `title`, `description`, canonical e dados
  estruturados chegam na primeira resposta, sem depender da fila de
  renderização.
- **Custo pequeno e contido.** Um arquivo (`seo/metaInjector.js`), um mapa de
  rotas, cache em memória.
- **Escala.** Se o dia depois exigir HTML completo, a mesma camada evolui para
  `renderToString` sem mudar a arquitetura.

Esta abordagem **exige que o HTML seja servido por um processo Node** —
condição que orienta a decisão de deploy em §13.

### 11.4 Demais itens de SEO

- **URLs amigáveis** — `/motos/honda-cb-500f-2024`, slug imutável (§5.1.2),
  canonical em toda página; filtros de catálogo em query string marcada
  `noindex, follow` para não gerar milhares de URLs quase idênticas
  (canibalização).
- **`sitemap.xml` dinâmico** — gerado da base a cada requisição (com cache):
  páginas estáticas + toda moto indexável, com `lastmod = updatedAt`.
  Nunca arquivo estático, que ficaria desatualizado a cada cadastro.
- **`robots.txt`** — libera o público, bloqueia `/admin` e `/api`, aponta o
  sitemap. Em ambiente de *staging*, `Disallow: /` — impede que a loja de
  demonstração concorra com o site do cliente real no índice.
- **Dados estruturados (JSON-LD)** — `Vehicle`/`Product` + `Offer`
  (`price`, `priceCurrency: BRL`, `availability` derivada do `status`) na página
  da moto; `AutoDealer` com endereço, telefone e horários na home;
  `BreadcrumbList` na navegação. Habilita resultado rico no Google.
- **Status → `availability`** — `AVAILABLE` → `InStock`,
  `RESERVED` → `LimitedAvailability`, `SOLD` → `SoldOut` ou `410`,
  conforme a decisão **A**.
- **Imagens** — `alt` obrigatório (é campo do subdocumento, §5.1.1).
- **Idioma** — `<html lang="pt-BR">`.

---

## 12. Performance

### 12.1 Orçamento (metas verificáveis)

Medido em 4G simulado, mobile, na home e na página da moto:

| Métrica | Meta |
|---|---|
| LCP | < 2,5 s |
| CLS | < 0,1 |
| INP | < 200 ms |
| JS inicial (gzip) do site público | < 180 kB |
| Lighthouse Performance (mobile) | ≥ 90 |

Meta sem medição é opinião: a verificação entra como critério de conclusão da
FASE 9 no roadmap.

### 12.2 Backend

- **Filtragem, ordenação e paginação sempre no servidor.** O cliente nunca
  recebe o estoque inteiro — nem para montar filtros (§6.6).
- `.lean()` em toda leitura: documentos Mongoose completos custam CPU e memória
  sem benefício quando o objetivo é serializar JSON.
- **Projeção** de campos: a listagem não traz `description`, `features` nem o
  array completo de imagens — só o necessário para o card.
- `find()` e `countDocuments()` em paralelo.
- `compression()` nas respostas.
- Índices cobrindo as consultas reais (§9.4), validados com `explain()`.

### 12.3 Frontend

- **Code splitting por rota** com `React.lazy`. Crítico: `/admin/*` é um chunk
  separado, então **um visitante do site público nunca baixa o painel
  administrativo** — resolve P-08 (peso e superfície).
- **React Query** elimina refetch redundante: navegar catálogo → detalhe →
  voltar não redispara requisição, e a mutação no admin invalida exatamente as
  chaves afetadas.
- **URL como estado dos filtros**: sem estado duplicado, sem re-render em
  cascata, e o filtro fica compartilhável.
- Evitar re-render: `useMemo`/`useCallback` onde há custo **medido**,
  `react-hook-form` (que isola o re-render por campo), listas com `key`
  estável. Não haverá memoização preventiva em todo componente — isso adiciona
  custo e complexidade sem ganho.
- **Skeletons** em vez de spinner de página: percepção de velocidade e
  estabilidade de layout.
- Fontes: `font-display: swap`, subset latino, `preconnect` — fonte bloqueante
  é causa comum de LCP ruim.
- Tailwind purga classes não usadas no build; CSS final pequeno.

### 12.4 Cache

| Camada | O quê | TTL | Por quê |
|---|---|---|---|
| CDN | assets com hash | 1 ano, immutable | nome muda a cada build |
| CDN | `index.html` | sem cache | precisa refletir deploy e meta injetada |
| HTTP | `GET /api/store` | 5 min (`Cache-Control`) | muda raramente |
| HTTP | `GET /api/filtros` | 5 min | agregação mais caro do sistema |
| Memória (servidor) | dados do `metaInjector` | 5 min | evita ir ao banco por crawler |
| Cliente | React Query | 1–5 min por chave | evita requisição repetida |

Sem Redis no MVP: cache em memória de processo único basta, e introduzir Redis
agora seria infraestrutura sem demanda. O limite dessa escolha aparece com
múltiplas instâncias (R-06).

---

## 13. Deploy

### 13.1 Requisito que define a topologia

§11.3 exige que o HTML passe por um processo Node (injeção de meta). Isso
elimina a hospedagem puramente estática do frontend como solução completa.

### 13.2 Topologia recomendada para o MVP: serviço Node único atrás de CDN

```
        Visitante / Crawler
                │
        ┌───────▼─────────┐
        │  Cloudflare     │  DNS · TLS · cache de assets · WAF básico (grátis)
        └───────┬─────────┘
                │
        ┌───────▼──────────────────────────────┐
        │  Render / Railway — Node 22          │
        │  ├─ /api/*      → API REST           │
        │  ├─ /assets/*   → estáticos do build │
        │  ├─ /sitemap.xml, /robots.txt        │
        │  └─ /*          → index.html + meta injetada
        └───────┬──────────────────────────────┘
                │
     ┌──────────┴───────────┐
     ▼                      ▼
MongoDB Atlas          Cloudinary
```

Por que um serviço só no MVP:

- A injeção de meta fica trivial — o mesmo processo tem o HTML e o acesso ao
  banco.
- **Sem CORS entre site e API** (mesma origem) e o cookie de refresh pode ser
  `SameSite=Strict`, a configuração mais segura. Em domínios separados isso
  exigiria `SameSite=None`, que é mais frágil.
- Um alvo de deploy, um conjunto de variáveis, um log. Menos peça para quebrar.
- Custo: Cloudflare grátis + um serviço pequeno + Atlas M0 ≈ o mínimo possível.
- Cloudflare à frente absorve o tráfego de assets, então o Node só atende HTML
  e API.

O custo dessa escolha é acoplamento de deploy (frontend e backend sobem juntos)
e ausência de entrega estática na borda. Ambos aceitáveis nesta escala, e
reversíveis (§13.3).

### 13.3 Topologia de escala (quando houver demanda)

```
Cloudflare Pages/Vercel  →  SPA estático na borda
   + edge middleware      →  injeção de meta na borda (mesma lógica)
Render/Fly.io (N réplicas)→  apenas a API
Redis                     →  rate limit e cache compartilhados
```

A migração é viável sem reescrita porque o `metaInjector` é uma função isolada
(§4.2) e o frontend já fala com a API por `VITE_API_URL` configurável.

### 13.4 Ambientes

| | Development | Staging | Production |
|---|---|---|---|
| Banco | Atlas M0 (db `motorshop_dev`) | M0 (`_staging`) | M10 (`_prod`) |
| Cloudinary | pasta `dev/` | `staging/` | `prod/` |
| `robots.txt` | — | **`Disallow: /`** | permissivo |
| Stack trace na resposta | sim | não | **não** |
| `autoIndex` Mongoose | sim | não | **não** |
| Segredos | `.env` local | painel do provedor | painel do provedor |

`JWT_SECRET` **diferente** por ambiente: um token de staging não pode valer em
produção.

### 13.5 Rotina de deploy

1. Push na branch → CI: `lint` → `test` → `build`.
2. Build do frontend gera `frontend/dist`, servido pelo backend.
3. Migração de índices por script explícito (`npm run db:indexes`), nunca
   `autoIndex` em produção.
4. Health check em `/api/health`; o provedor só troca o tráfego após passar.
5. Rollback = redeploy do build anterior.

### 13.6 Backup

- Atlas M0 **não tem** backup automático → no MVP, `mongodump` agendado
  (registrado em R-04). É a lacuna mais séria da topologia gratuita.
- M10 traz backup contínuo com restauração pontual. **Antes de o cliente
  cadastrar estoque real, o plano pago é obrigatório.**
- Cloudinary guarda os originais; as variantes são derivadas e recriáveis.

---

## 14. Escalabilidade

### 14.1 Escalar tráfego

Backend **stateless** (sessão vive em token, não em memória de processo), o que
permite escala horizontal por réplicas. As duas dependências de estado local
hoje são o rate limit e o cache em memória — ambas resolvidas por Redis quando
houver mais de uma instância (R-06). Nada além disso impede replicar.

### 14.2 Escalar visualmente: tema por tokens

```
StoreSettings.theme  ──►  GET /api/store  ──►  <html style="--color-primary: ...">
                                                      │
                                          Tailwind lê as CSS custom properties
```

`tailwind.config.js` define cores como `var(--color-primary)`. Componentes usam
`bg-primary`, jamais `bg-[#FF6B00]`. Resultado: a identidade visual de um novo
cliente é **um documento no banco**, sem rebuild e sem tocar componente.

Regra que sustenta isso: **nenhum componente contém dado de loja**. Nome, logo,
WhatsApp, endereço, horário e redes vêm todos do contexto de configuração
(§5.5).

### 14.3 Escalar para multi-loja (sem implementar agora)

Você pediu explicitamente para não implementar multi-tenancy. O que está sendo
feito é **não fechar a porta**:

1. `StoreSettings` já é a entidade `Store` — muda de singleton para coleção.
2. A camada de repositório é o **único** lugar que monta query; injetar
   `storeId` em um ponto cobre todo o sistema (é a razão de ela existir, §3.2).
3. Índices já começam com prefixo de filtro fixo (`status`), então virar
   `{ storeId, status, ... }` é evolução natural do padrão.
4. Resolução de loja por domínio/subdomínio entra como middleware que popula
   `req.store`, sem tocar no domínio.

Estimativa: migração localizada em repositórios, models e um middleware.
**Nenhum campo `storeId` é criado agora** — seria campo morto, contra sua
instrução de não antecipar.

### 14.4 Versionamento da API

Sem `/v1` agora: com um único cliente (nosso frontend), versionar
antecipadamente é cerimônia sem benefício. O envelope padronizado (§6.2) é o
que realmente permite evoluir de forma compatível. Quando houver consumidor
externo (app, integração com portal de anúncios), entra `/api/v2` convivendo
com o atual.

---

## 15. Decisões técnicas

### D-01 — Mongoose em vez de Prisma ✅ decidido

**Contexto:** MongoDB Atlas, backend em **JavaScript** (sem TypeScript).

| Critério | Mongoose 8 | Prisma (MongoDB) |
|---|---|---|
| Principal vantagem do Prisma | — | **tipagem gerada** |
| …vale em JavaScript? | — | **Não.** Sem TS, o ganho central desaparece; sobram o schema em DSL e o client gerado |
| Índices | declarados no schema, incluindo TTL, texto, parcial e sparse | suporte mais limitado; TTL e índice de texto ficam fora do fluxo |
| Agregação | pipeline completo (`$facet` para `GET /api/filtros`) | requer `aggregateRaw`, perdendo a abstração |
| Busca textual | `$text` com índice de texto | sem suporte de primeira classe |
| Hooks de persistência | `pre('save')` — geração de slug, normalização | não há equivalente |
| Subdocumentos (imagens) | schema aninhado com validação | tipos compostos, menos flexíveis |
| `populate` (Moto → Brand) | nativo | `include` (funciona) |
| Etapa de build | nenhuma | `prisma generate` obrigatório |
| Maturidade com MongoDB | padrão de mercado | mais recente, com ressalvas documentadas |

**Decisão: Mongoose.** Em JavaScript, Prisma cobra uma DSL, um passo de
geração e limitações reais em agregação, busca textual e índices — e paga com
um benefício (tipagem) que a stack escolhida não pode aproveitar. Mongoose se
alinha ao modelo de documentos, entrega exatamente os recursos que este projeto
usa (`$facet` para os filtros, `$text` para a busca, TTL para refresh tokens,
hook para slug) e é o padrão consolidado do ecossistema.

*Se a stack migrasse para TypeScript, a comparação mereceria reabertura.*

### D-02 — Cloudinary como provedor inicial de imagens ✅ decidido
Detalhado em §10.2. Reversível por construção (§10.3). Escolhido pela
transformação on-the-fly, que é o que de fato protege a performance mobile
sem construirmos um pipeline de imagem.

### D-03 — argon2id em vez de bcrypt ✅ decidido
Vencedor da Password Hashing Competition, resistente a ataque por GPU/ASIC via
custo de memória, sem o limite de 72 bytes do bcrypt. Custo: dependência
nativa (compilação). Aceitável, e `bcryptjs` fica como contingência caso a
plataforma de deploy não compile o módulo nativo.

### D-04 — Preço em centavos (inteiro) ✅ decidido
`float` em dinheiro produz erro de arredondamento (`0.1 + 0.2`). `Decimal128`
resolveria, mas complica serialização JSON e o cálculo do financiamento.
Inteiro em centavos é exato, ordenável por índice e trivial de formatar.
A API recebe e devolve **reais** na borda; a conversão acontece em um único
utilitário, e isso fica documentado no README para não gerar erro de fator 100.

### D-05 — Lead em coleção única com discriminador ✅ decidido
Quatro coleções separadas (interesse/venda/contato/financiamento) exigiriam
quatro CRUDs, quatro telas e uma união para a listagem "todos os leads" — que é
como a loja realmente trabalha. Uma coleção com `type` + `data` validado por
união discriminada em Zod dá uma tela, uma consulta ordenada por data e
validação estrita por tipo.

### D-06 — Exclusão de moto é `INACTIVE` (soft delete) ✅ decidido
`DELETE /api/admin/motos/:id` marca `status: INACTIVE`. Motivos: leads antigos
referenciam a moto (apagar quebraria o histórico comercial), links indexados
precisam de resposta coerente, e exclusão acidental de um cadastro com 20 fotos
é irreversível. Exclusão física fica disponível apenas a `SUPER_ADMIN` como
operação explícita e separada, se você quiser.

### D-07 — Slug imutável ✅ decidido
Trocar slug quebra link indexado e link já enviado por WhatsApp. Alterar
modelo/ano não altera o slug. Se a troca vier a ser necessária, a solução
correta é uma coleção de redirects 301 — fora do escopo atual.

### D-09 — Versões: majores estáveis correntes ✅ decidido (FASE 1)
A FASE 0 registrou React 18, Vite 5, Tailwind 3, Express 4, Mongoose 8 e Zod 3.
Na implementação, a consulta ao registry mostrou React 19, Vite 8, Tailwind 4,
Express 5, Mongoose 9 e Zod 4 como estáveis correntes. Projeto novo não deve
nascer um major atrás: a atualização depois custa mais do que começar certo, e
nenhuma das versões antigas oferecia vantagem para este caso. A tabela de §2.1
reflete o que está instalado.

### D-10 — Sem `asyncHandler` ✅ decidido (FASE 1)
O Express 5 encaminha automaticamente a rejeição de um handler `async` para o
middleware de erro — comportamento que no Express 4 exigia um wrapper. O
utilitário `asyncHandler` previsto em §4.2 deixou de ter função e **não foi
criado**. Menos um arquivo e menos ruído em toda rota assíncrona.

### D-11 — Dois arquivos `.env`, não um ✅ decidido (FASE 1)
A FASE 1 tentou servir backend e frontend com um único `.env` na raiz
(via `envDir` do Vite). O resultado foi um **defeito de produção**: o Vite lê o
`NODE_ENV=development` do backend e passa a gerar o bundle com o **React de
desenvolvimento** — 577 kB em vez de 367 kB, além de mais lento em runtime.

Passaram a existir dois arquivos: `.env` na raiz (backend, contém segredos) e
`frontend/.env` (somente `VITE_*`, embutido no bundle e público). Além de
corrigir o defeito, a separação torna a fronteira de segurança explícita:
um arquivo nunca é lido pelo Vite, o outro é público por definição.

### D-12 — Docker deliberadamente adiado ✅ decidido (FASE 1)
**Não há Docker no projeto**, e a ausência é intencional.

Docker resolve duas coisas: orquestrar serviços locais e igualar ambientes.
Aqui, o único serviço externo é o MongoDB, que é **gerenciado na nuvem**
(Atlas) — não há o que orquestrar localmente. E o runtime é Node puro, sem
dependência de sistema operacional. Nesse cenário, Docker adiciona uma etapa de
build e um ciclo de reinício a cada alteração, em troca de nada.

Reavaliar na **FASE 12**, quando a plataforma de deploy estiver escolhida: se
ela exigir imagem de container, um `Dockerfile` de produção entra lá — sem
impor Docker ao desenvolvimento local.

### D-08 — JavaScript com Zod como contrato de runtime ✅ decidido
A stack exige JavaScript. A mitigação de P-02 é: Zod como fonte única de
validação (compartilhada via `shared/`), JSDoc nas assinaturas públicas de
serviços e repositórios (dá autocomplete no editor sem build step) e testes de
integração cobrindo o contrato de cada endpoint.

---

### Decisões que dependem de você antes da FASE 1

| # | Questão | Recomendação | Impacto |
|---|---|---|---|
| **A** | **Motos vendidas: o que acontece com a página?** | Manter acessível com selo "Vendida", preço oculto, `availability: SoldOut` e CTA "avise-me sobre similar". Preserva SEO acumulado e gera lead. | Modelo, API pública, SEO |
| **B** | **Preço "sob consulta" é necessário?** | Não no MVP — preço visível converte melhor. Se sim, entra `priceOnRequest: Boolean` e a ordenação por preço precisa decidir onde esses itens ficam. | Modelo, filtros, ordenação |
| **C** | **Plataforma de deploy** | Render (previsível, simples, health check nativo). Railway e Fly.io são equivalentes. | FASE 12 |
| **D** | **Domínio para a loja de demonstração** | Necessário para configurar canonical, `siteUrl`, OG e CORS. Se não houver, uso o domínio provisório do provedor e ajusto depois. | SEO, CORS, cookie |
| **E** | **Retenção de leads (LGPD)** | 24 meses, com eliminação por `SUPER_ADMIN` a pedido do titular. Define se haverá job de expurgo. | Modelo, FASE 6 |
| **F** | **Financiamento: parâmetros das taxas** | Taxa e prazos configuráveis em `StoreSettings` (cada loja tem acordo próprio com financeiras) + aviso claro "simulação, não é proposta de crédito". | FASE 7 |
| **G** | **WhatsApp: link `wa.me` ou API oficial?** | `wa.me` com mensagem pré-preenchida no MVP: zero custo, zero aprovação, funciona hoje. API oficial só se houver necessidade de automação. | FASE 6 |
| **H** | **Idioma do código** | Código, campos e commits em inglês; UI e rotas públicas em português. Já assumido neste documento. | Todo o código |
| **I** | **Estrutura de pastas do backend** | Módulos por domínio (§4.2). Confirme se prefere o agrupamento por camada. | FASE 1 |

Recomendações em A–I já estão assumidas como padrão no restante do documento;
se você não sinalizar divergência, sigo com elas.

---

## 16. Riscos

| # | Risco | Prob. | Impacto | Mitigação |
|---|---|---|---|---|
| **R-01** | **Preview de link quebrado no WhatsApp/redes** (SPA sem meta no HTML) | Alta se ignorado | **Crítico** — atinge o canal de venda | Injeção de meta no servidor (§11.3), entregue na FASE 9 e validada com o depurador de links das plataformas |
| **R-02** | **Imagens pesadas degradam o site no 4G** — 20 fotos de celular por moto | Alta | Alto — perda de visitante e de ranking | Cloudinary com `f_auto`/`q_auto`, `srcset`, lazy loading, `width`/`height`; orçamento de performance verificado (§12.1) |
| **R-03** | **Atlas com `0.0.0.0/0`** por falta de IP fixo no plano gratuito | Média | Alto | Senha longa e única, usuário restrito a um database, rotação de credencial; IP dedicado/peering ao migrar para plano pago |
| **R-04** | **Sem backup no M0** — perda de estoque cadastrado | Média | **Crítico** | `mongodump` agendado no MVP; **M10 obrigatório antes de dado real de cliente** |
| **R-05** | **Segredo fraco ou vazado** (`JWT_SECRET`, Atlas, Cloudinary) | Média | Crítico | Validação Zod no boot recusa segredo curto/ausente; `.env` ignorado no git; segredo distinto por ambiente; nada sensível em `VITE_*` |
| **R-06** | **Rate limit e cache em memória** deixam de funcionar com múltiplas instâncias | Média (ao escalar) | Médio | Documentado; Redis na topologia de escala (§13.3); MVP roda instância única |
| **R-07** | **Simulação de financiamento interpretada como oferta de crédito** | Média | Médio (jurídico) | Aviso explícito de que é estimativa e não proposta; taxas configuráveis; sem análise de crédito; sem coleta de CPF na simulação |
| **R-08** | **LGPD** — dado pessoal em leads sem base legal, retenção ou controle de acesso | Média | Médio-alto | `consent` versionado, acesso somente autenticado, exclusão por `SUPER_ADMIN`, retenção definida (decisão **E**), redaction em log |
| **R-09** | **Ausência de tipagem** gera divergência silenciosa frontend/backend | Média | Médio | Zod compartilhado em `shared/`, JSDoc, testes de contrato por endpoint |
| **R-10** | **Enumeração/scraping do estoque** por concorrente | Média | Baixo-médio | Rate limit em rotas públicas, `limit` máximo de 48, sem `GET /motos/:id` público, Cloudflare à frente |
| **R-11** | **Spam nos formulários públicos** de lead | Alta | Médio (polui a operação) | Rate limit de 5/hora por IP, honeypot, validação estrita; CAPTCHA só se o spam se confirmar (não adicionar atrito antes de haver problema) |
| **R-12** | **Cold start / limites da hospedagem gratuita** — primeira visita lenta | Média | Médio | Plano com instância sempre ativa em produção; Cloudflare servindo assets; health check periódico |
| **R-13** | **Custo do Cloudinary ao escalar** para várias lojas | Baixa no MVP | Médio | Porta de armazenamento (§10.3) permite migrar a R2 (egresso zero) sem tocar no domínio |
| **R-14** | **Vazamento de campo privado** (`placa`) na API pública | Baixa | Alto | Quatro camadas em §8.4; teste automatizado que falha se a resposta pública contiver campo privado |
| **R-15** | **Personalização por cliente virar fork** do código | Média | Alto (mata a revenda) | `StoreSettings` + tema por tokens + flags de `features`; nenhum dado de loja em componente (§14.2) |
| **R-16** | **Escopo crescer durante a implementação** (troca, consórcio, seguro, comparador) | Alta | Médio | Roadmap por fases com critérios de conclusão; escopo novo só entra em fase nova, com sua aprovação |

---

## 17. Próximas fases

Detalhamento completo — objetivo, funcionalidades, arquivos, dependências,
critérios de conclusão e testes de cada fase — em **[`docs/ROADMAP.md`](./ROADMAP.md)**.

| Fase | Nome | Entrega central |
|---|---|---|
| 0 | Arquitetura | **este documento** + roadmap |
| 1 | Fundação | monorepo, Vite, Express, env validado, health check |
| 2 | Banco + API | models, índices, CRUD de motos e marcas, seed |
| 3 | Autenticação + Admin | login, JWT, RBAC, painel |
| 4 | Catálogo público | home, `/estoque`, filtros, paginação |
| 5 | Página da moto | galeria, especificações, slug |
| 6 | Leads + WhatsApp | formulários, gestão de leads |
| 7 | Financiamento | simulador |
| 8 | Imagens | upload direto, ordenação, otimização |
| 9 | SEO + performance | meta injection, sitemap, JSON-LD, orçamento |
| 10 | Segurança | auditoria e endurecimento |
| 11 | Testes | unitários, integração, E2E |
| 12 | Deploy | produção, CI/CD, backup |
| 13 | Auditoria final | revisão completa e handoff |

### Situação atual

FASE 0 concluída. **Nenhuma linha de código de aplicação foi escrita, nenhuma
dependência instalada, nenhum arquivo de configuração criado** — conforme sua
instrução.

**Aguardo sua autorização para iniciar a FASE 1**, preferencialmente junto com
as respostas às decisões A–I de §15.
