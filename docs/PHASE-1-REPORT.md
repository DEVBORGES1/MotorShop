# Relatório da FASE 1 — Fundação do projeto

**Data:** 2026-09-14
**Branch:** `claude/nifty-lovelace-oln0x1`
**Base:** [`ARCHITECTURE.md`](./ARCHITECTURE.md) · [`ROADMAP.md`](./ROADMAP.md)

---

## 1. Resumo

A FASE 1 entrega uma fundação funcional e verificada: monorepo com npm
workspaces, API Express com health check, tratamento centralizado de erros,
segurança básica, conexão MongoDB preparada, SPA React consumindo a API, além
de lint, formatação e testes rodando nos dois workspaces.

**Todos os 16 critérios de conclusão da seção 18 foram atendidos**, e as 12
validações da seção 19 foram executadas — incluindo teste em navegador real.

Estado do repositório antes de começar: um único commit (documentação da
FASE 0), nenhuma alteração pendente, nenhum código de aplicação. Nada precisou
ser preservado ou substituído.

**Três problemas reais foram encontrados durante a validação e corrigidos** —
um deles seria um defeito de produção silencioso (§11).

Nenhuma funcionalidade das fases seguintes foi implementada.

---

## 2. Estrutura criada

```
MotorShop/
├─ backend/
│  ├─ src/
│  │  ├─ config/
│  │  │  ├─ env.js              valida process.env com Zod; falha no boot
│  │  │  ├─ database.js         conexão Mongoose + leitura de estado
│  │  │  └─ logger.js           pino com redaction de campos sensíveis
│  │  ├─ middlewares/
│  │  │  ├─ requestId.js        id por requisição (correlação com o log)
│  │  │  ├─ notFound.js         rota inexistente → erro padronizado
│  │  │  └─ errorHandler.js     tratamento global
│  │  ├─ modules/health/
│  │  │  ├─ health.service.js   monta o estado operacional
│  │  │  ├─ health.controller.js
│  │  │  └─ health.routes.js
│  │  ├─ routes/index.js        agregador de /api
│  │  ├─ utils/
│  │  │  ├─ ApiError.js         erro operacional com status HTTP
│  │  │  └─ apiResponse.js      envelope único (ok / fail)
│  │  ├─ app.js                 monta o Express, sem listen (testável)
│  │  └─ server.js              conecta o banco, sobe e encerra ordenadamente
│  ├─ tests/
│  │  ├─ integration/health.test.js
│  │  ├─ integration/errors.test.js
│  │  └─ unit/env.test.js
│  ├─ vitest.config.js
│  └─ package.json
│
├─ frontend/
│  ├─ public/favicon.svg
│  ├─ src/
│  │  ├─ components/ApiStatusCard.jsx    apresentação pura
│  │  ├─ config/env.js                   única leitura de import.meta.env
│  │  ├─ hooks/useHealth.js              estado da consulta à API
│  │  ├─ layouts/RootLayout.jsx          casca das páginas públicas
│  │  ├─ pages/{Home,NotFound}.jsx
│  │  ├─ routes/index.jsx                mapa de rotas
│  │  ├─ services/
│  │  │  ├─ api.js                       única camada que conhece Axios
│  │  │  ├─ api.test.js
│  │  │  └─ healthService.js
│  │  ├─ styles/index.css                tokens de design (variáveis CSS)
│  │  ├─ App.jsx
│  │  └─ main.jsx
│  ├─ index.html · vite.config.js · .env.example · package.json
│
├─ docs/{ARCHITECTURE,ROADMAP,SETUP,PHASE-1-REPORT}.md
├─ eslint.config.js · .prettierrc.json · .prettierignore
├─ .env.example · .gitignore · package.json · README.md
```

**30 arquivos criados.** Nenhum diretório vazio e nenhum arquivo sem uso — a
verificação de órfãos (todo módulo é importado por alguém) passou limpa.

### Diretórios propostos no briefing que **não** foram criados

| Diretório | Motivo |
|---|---|
| `backend/src/{controllers,services,models,repositories,schemas}/` | Ver §13, decisão estrutural. As camadas existem, agrupadas por domínio em `modules/`. |
| `frontend/src/{utils,assets}/` | Sem conteúdo real nesta fase. Entram quando houver o que colocar. |
| `shared/` | Sem conteúdo real: os enums que justificam o workspace nascem na FASE 2 (ver §13). |

Isso atende à regra 17 do briefing — *"não crie arquivos vazios apenas para
encher a arquitetura"*.

---

## 3. Dependências adicionadas

**336 pacotes instalados · `npm audit`: 0 vulnerabilidades.**

### Backend — produção

| Pacote | Versão | Justificativa |
|---|---|---|
| `express` | 5.2 | Framework HTTP (exigido) |
| `zod` | 4.6 | Validação do ambiente (exigido) |
| `mongoose` | 9.10 | Conexão MongoDB (decisão D-01) |
| `helmet` | 8.3 | Cabeçalhos de segurança (exigido) |
| `cors` | 2.8 | CORS configurável (exigido) |
| `compression` | 1.8 | Compressão de resposta (ARCHITECTURE §8.1) |
| `pino` + `pino-http` | 10 / 11 | Log estruturado com *redaction* |

### Frontend — produção

| Pacote | Versão | Justificativa |
|---|---|---|
| `react` + `react-dom` | 19.3 | Exigido |
| `react-router-dom` | 7.18 | Exigido |
| `axios` | 1.20 | Exigido |

### Desenvolvimento

| Pacote | Onde | Justificativa |
|---|---|---|
| `vite` + `@vitejs/plugin-react` | frontend | Build (exigido) |
| `tailwindcss` + `@tailwindcss/vite` | frontend | Estilo (exigido) |
| `vitest` | ambos | Runner único para backend e frontend |
| `supertest` | backend | Teste HTTP dos endpoints |
| `eslint` + `@eslint/js` + `globals` | raiz | Lint (exigido) |
| `prettier` + `eslint-config-prettier` | raiz | Formatação (exigido) |
| `eslint-plugin-react-hooks` | raiz | Erros de hooks são silenciosos em runtime |
| `concurrently` | raiz | `npm run dev` sobe os dois serviços |

### Deliberadamente **não** instalado

| Pacote | Por quê |
|---|---|
| `nodemon` | `node --watch` é nativo no Node 22 |
| `dotenv` | `node --env-file-if-exists` é nativo no Node 22 |
| `express-rate-limit` | Rate limiting é da FASE 3; o ponto de montagem está marcado em `app.js` |
| `@tanstack/react-query` | Previsto na FASE 1 do roadmap, mas para uma única chamada seria overengineering. Entra na FASE 4, com o catálogo. |
| `pino-pretty` | Log em JSON basta; menos uma dependência |
| `jsdom` + `@testing-library/react` | Testes de componente são da FASE 11 |
| `cookie-parser` | Só faz sentido com o refresh token, na FASE 3 |
| Docker | Decisão registrada — ver §13 e ARCHITECTURE D-12 |

---

## 4. Configurações realizadas

### Ambiente

Configuração centralizada em `backend/src/config/env.js`, validada com Zod
**no boot**. Variável inválida ou ausente derruba o processo com mensagem
explícita:

```
✖ Configuração de ambiente inválida:
  • MONGODB_URI: deve começar com "mongodb://" ou "mongodb+srv://"
  • JWT_SECRET: deve ter no mínimo 32 caracteres
```

**O valor da variável nunca é impresso** — apenas o nome e o motivo. Há teste
automatizado para isso.

| Variável | Obrigatória | Padrão |
|---|---|---|
| `NODE_ENV` | não | `development` |
| `PORT` | não | `3000` |
| `FRONTEND_URL` | não | `http://localhost:5173` (aceita lista) |
| `MONGODB_URI` | **em produção** | — |
| `JWT_SECRET` | **em produção**, mín. 32 caracteres | — |
| `LOG_LEVEL` | não | `info` |
| `BODY_LIMIT` | não | `100kb` |

`MONGODB_URI` e `JWT_SECRET` são opcionais em desenvolvimento de propósito: a
FASE 1 não tem model nem autenticação, e exigir uma conta no Atlas para rodar
`npm run dev` seria atrito sem retorno. Em produção são obrigatórias.

### Qualidade de código

- **ESLint 10** em *flat config* única na raiz, com escopos distintos para
  backend (globais do Node), frontend (globais do navegador + regras de hooks),
  testes e arquivos de configuração. `eslint-config-prettier` por último.
- **Prettier 3**: 100 colunas, aspas simples, ponto e vírgula, vírgula final.
  `*.md` fica de fora — a documentação tem quebras de linha intencionais.

### Scripts (todos a partir da raiz)

| Comando | Ação |
|---|---|
| `npm run dev` | Backend + frontend em paralelo |
| `npm run dev:backend` / `dev:frontend` | Individualmente |
| `npm start` | API em modo produção |
| `npm run build` | Build do frontend + verificação de módulos do backend |
| `npm test` | Testes dos dois workspaces |
| `npm run lint` / `lint:fix` | ESLint |
| `npm run format` / `format:check` | Prettier |
| `npm run verify` | lint + format + testes + build |

---

## 5. API criada

### `GET /api/health`

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "uptime": 12,
    "timestamp": "2026-09-14T12:11:51.824Z",
    "database": { "status": "not_configured", "configured": false }
  },
  "message": "API is running"
}
```

Não expõe versão, ambiente, host nem caminho: um health check é público e não
deve ajudar a mapear a infraestrutura.

**Retorna 200 mesmo sem banco**, reportando o estado em `database.status`.
Nesta fase nenhum endpoint depende do MongoDB; a partir da FASE 2 o critério de
saúde passa a incluir a conexão.

### `GET /api` — raiz informativa

```json
{ "success": true, "data": { "name": "MotorShop API", "health": "/api/health" }, "message": "API is running" }
```

### Envelope de erro

```json
{
  "success": false,
  "message": "Rota não encontrada: GET /api/nao-existe",
  "errors": [],
  "requestId": "67887324-7647-4fb3-8e9e-2a4072a3b49c"
}
```

`errors` é **sempre** um array — o cliente nunca precisa checar o tipo.
`requestId` correlaciona com o log sem expor nada interno.

Casos já tratados: rota inexistente (404), JSON malformado (400), payload acima
do limite (413), origem barrada pelo CORS (403) e erro inesperado (500 com
mensagem genérica).

---

## 6. Integração Frontend → Backend

```
Home.jsx  →  useHealth()  →  healthService  →  api.js (Axios)  →  GET /api/health
```

Quatro camadas, cada uma com uma responsabilidade:

| Camada | Responsabilidade | Não faz |
|---|---|---|
| `pages/Home.jsx` | Renderiza | Não conhece HTTP |
| `hooks/useHealth.js` | Estado da consulta (loading / erro / dados) | Não conhece Axios |
| `services/healthService.js` | Contrato do endpoint | Não trata estado de UI |
| `services/api.js` | Instância Axios, interceptor, normalização de erro | Não conhece componentes |

Atende às regras 12 e 17 do briefing: **nenhuma URL de API fora de
`config/env.js`**, e **nenhuma lógica de API dentro de componente React** —
ambos verificados por varredura automatizada (§10).

`normalizeApiError` converte qualquer falha do Axios num erro previsível com
mensagem apresentável, e tem testes próprios.

Não há proxy do Vite para `/api`, **de propósito**: chamar a API na origem real
exercita a configuração de CORS durante o desenvolvimento em vez de mascará-la.

---

## 7. MongoDB

Apenas a infraestrutura de conexão. **Nenhum model foi criado** — nem `User`,
`Moto`, `Brand`, `Lead` ou qualquer outro, conforme a regra 13 do briefing.

`backend/src/config/database.js` entrega:

- `connectDatabase()` — conecta com pool de 10 e timeout de seleção de 10 s;
  sem `MONGODB_URI` em desenvolvimento, registra aviso e segue sem banco
- `getDatabaseStatus()` — estado legível para o health check, **sem** expor
  host, usuário ou credencial
- `disconnectDatabase()` — encerramento ordenado em `SIGTERM`/`SIGINT`
- Log dos eventos de conexão, desconexão e erro

O servidor conecta **antes** de aceitar tráfego (ARCHITECTURE §9.2), evitando a
janela em que a API responderia erro porque o banco ainda não subiu.

---

## 8. Segurança

| Item | Estado | Implementação |
|---|---|---|
| Helmet | ✅ | CSP, HSTS, `noSniff`, `frameguard`, `Referrer-Policy` |
| CORS por origem explícita | ✅ | Lista de `FRONTEND_URL`; **nunca `*`**; `credentials: true` |
| Limite de payload | ✅ | `100kb` configurável — imagens não passarão pela API (FASE 8) |
| Tratamento global de erros | ✅ | Middleware único; erro não operacional nunca vaza mensagem |
| Sem stack em produção | ✅ | Verificado em execução (§10) |
| `x-powered-by` removido | ✅ | `app.disable('x-powered-by')` |
| Validação de ambiente | ✅ | Zod no boot; segredo curto é recusado |
| Segredo fora do frontend | ✅ | `.env` do backend não é lido pelo Vite (§11, problema 2) |
| Log sem dado sensível | ✅ | `redact` de `authorization`, `cookie`, `password`, `token`, `refreshToken` |
| `trust proxy` | ✅ | IP real correto atrás de proxy — base para o rate limit da FASE 3 |
| `.env` fora do git | ✅ | Verificado com `git check-ignore` |
| Rate limiting | ⏳ FASE 3 | Ponto de montagem marcado em `app.js` |
| Autenticação | ⏳ FASE 3 | Não implementada, conforme o briefing |

---

## 9. Testes

**Vitest** nos dois workspaces. **22 testes, todos passando.**

### Backend — 18 testes

| Arquivo | Cobre |
|---|---|
| `integration/health.test.js` (3) | 200, `success === true`, `data.status === "ok"`, mensagem; estado do banco sem vazar a string de conexão; `GET /api` |
| `integration/errors.test.js` (6) | 404 no envelope padrão; JSON malformado; payload grande; cabeçalhos do Helmet; CORS recusando origem estranha; CORS aceitando a configurada |
| `unit/env.test.js` (9) | Padrões; lista de origens; URI inválida; segredo curto; obrigatórias em produção; **valor da variável nunca aparece na mensagem de erro**; porta fora da faixa; variável declarada porém vazia |

O teste exigido pelo briefing (seção 11) é o primeiro: HTTP 200,
`success === true`, `data.status === "ok"`.

### Frontend — 4 testes

`services/api.test.js` cobre a normalização de erro: mensagem vinda da API,
lista de erros por campo, falha de conexão e erro inesperado.

Testes de componente são da FASE 11 — por isso `jsdom` e `@testing-library`
ainda não foram instalados.

---

## 10. Validações executadas

As 12 validações da seção 19, mais verificações de segurança adicionais:

| # | Validação | Resultado |
|---|---|---|
| 1 | `npm run lint` | ✅ zero avisos |
| 2 | `npm test` | ✅ 22/22 |
| 3 | `npm run build` (frontend) | ✅ 367 kB · **118,66 kB gzip** |
| 4 | `npm run build` (backend) | ✅ módulos carregam |
| 5 | Frontend inicia | ✅ Vite em 5173 |
| 6 | Backend inicia | ✅ API em 3000 |
| 7 | `GET /api/health` | ✅ HTTP 200 com o envelope esperado |
| 8 | Frontend → API | ✅ **navegador real**: home exibe `Status: ok` |
| 9 | MongoDB | ✅ sem URI reporta `not_configured`; URI inválida é recusada no boot |
| 10 | Nenhum segredo exposto | ✅ ver varredura abaixo |
| 11 | Arquivos criados | ✅ 30 arquivos, nenhum órfão |
| 12 | Código morto | ✅ nenhum `console.log`, `TODO` ou `FIXME` |

### Validação em navegador real (Chromium)

| Verificação | Resultado |
|---|---|
| Home consulta `GET /api/health` | ✅ |
| Home exibe `Status: ok` e o estado do banco | ✅ |
| Rota inexistente renderiza o 404 do SPA | ✅ |
| Mobile 360 px sem scroll horizontal | ✅ |
| Erros no console | ✅ nenhum |
| **CORS bloqueia origem não configurada** | ✅ confirmado com o navegador rejeitando `:4173` |

### Varredura de segurança

| Verificação | Resultado |
|---|---|
| Credencial hardcoded no código | ✅ nenhuma |
| `process.env` fora de `config/env.js` | ✅ nenhum |
| `import.meta.env` fora de `config/env.js` | ✅ nenhum |
| URL de API em componente | ✅ nenhuma |
| `axios` importado fora de `services/` | ✅ nenhum |
| `.env` versionado | ✅ ignorado; só os `.example` entram no git |
| Stack em produção | ✅ ausente (testado com `NODE_ENV=production`) |
| `npm audit` | ✅ 0 vulnerabilidades |

---

## 11. Problemas encontrados

### Problema 1 — A cópia do `.env.example` impedia a API de subir 🔴

`MONGODB_URI=` e `JWT_SECRET=` vazios no `.env.example` eram lidos como
*string vazia*, que reprovava na validação. Ou seja: seguir a instrução do
README (`cp .env.example .env`) resultava em API que não inicia. Atingiria
todo desenvolvedor no primeiro contato com o projeto.

### Problema 2 — Build de produção embarcava o React de **desenvolvimento** 🔴

O mais grave, e silencioso: o build **parecia** correto.

Eu havia apontado o `envDir` do Vite para a raiz, para que um único `.env`
servisse os dois workspaces. O efeito colateral é que o Vite passou a ler o
`NODE_ENV=development` do backend e a resolver o React pelo build de
desenvolvimento.

Resultado: **577 kB (180 kB gzip)** de bundle "de produção" contendo código de
desenvolvimento do React — mais pesado, mais lento e com verificações que não
deveriam existir em produção.

Só apareceu porque o tamanho do bundle destoou do esperado para uma página
praticamente vazia, e a checagem por marcador exclusivo confirmou: zero
ocorrências de `Minified React error` (presente apenas no build de produção) e
uma ocorrência de string de aviso exclusiva do build de desenvolvimento.

### Problema 3 — Teste com fixture errada 🟡

O teste que verifica a recusa de `JWT_SECRET` curto usava uma string com
exatamente 32 caracteres — ou seja, **válida**. O teste falhava porque a
expectativa estava errada, não o código.

### Observação — referências cruzadas erradas no `ARCHITECTURE.md` 🟡

Três remissões da FASE 0 apontavam para decisões trocadas: retenção de leads
citava "D-09" (inexistente) em vez da decisão pendente **E**, e o
comportamento de moto vendida citava "D-06" (soft delete) em vez da decisão
pendente **A**.

---

## 12. Problemas corrigidos

| # | Correção | Verificação |
|---|---|---|
| 1 | `parseEnv` passou a tratar variável declarada e vazia como ausente | 2 testes de regressão (`MONGODB_URI=''`, e ainda obrigatória em produção) |
| 2 | `envDir` removido; o frontend passou a ter o seu próprio `frontend/.env`, contendo apenas `VITE_*` | Bundle caiu para **367 kB (118,66 kB gzip)** — **−36%**; marcador de produção confirmado presente e o de desenvolvimento ausente |
| 3 | Fixture do teste trocada por uma string realmente curta | 18/18 no backend |
| 4 | Três referências cruzadas corrigidas no `ARCHITECTURE.md` | — |
| 5 | Favicon adicionado (navegador real requisita `/favicon.ico`) | Console limpo |

A correção 2 virou decisão arquitetural registrada (**D-11**): além de resolver
o defeito, separar os arquivos torna explícita a fronteira entre o que é
secreto e o que é público — o `.env` do backend nunca é lido pelo Vite.

---

## 13. Pendências

### Decisões estruturais tomadas — confirme ou corrija

O briefing da FASE 1 propôs uma estrutura e, ao mesmo tempo, instruiu a adaptá-la
ao `ARCHITECTURE.md` e a não criar diretórios vazios. Onde houve conflito,
segui o documento de arquitetura. São reversíveis e nenhuma afeta o
comportamento da aplicação:

| # | Decisão | Motivo | Como reverter |
|---|---|---|---|
| **E-1** | Backend agrupado por **domínio** (`modules/health/`) em vez de `controllers/`, `services/`, `models/` no topo | ARCHITECTURE §4.2 (decisão **I**, que segue pendente da sua confirmação desde a FASE 0). As camadas continuam separadas — mudou o eixo de agrupamento, não a arquitetura | Mover 3 arquivos |
| **E-2** | `shared/` **não** foi criado | Não há conteúdo real: os enums que o justificam nascem na FASE 2. Criá-lo agora seria o "diretório vazio" que a regra 17 proíbe | Criar na FASE 2 |
| **E-3** | `PORT=3000` | Conforme o briefing da FASE 1 (a FASE 0 registrava 4000) | Variável de ambiente |
| **E-4** | `FRONTEND_URL` no lugar de `CORS_ORIGINS` | Nome pedido no briefing; aceita lista separada por vírgula, preservando ARCHITECTURE §8.2 | — |
| **E-5** | React Query adiado para a FASE 4 | Para uma única chamada seria overengineering | — |

### Decisões da FASE 0 ainda em aberto

As decisões **A–I** de `ARCHITECTURE.md` §15 seguem sem resposta. Nenhuma
bloqueou a FASE 1, mas **A, C, D e I** afetam as próximas fases:

| # | Questão | Afeta |
|---|---|---|
| **A** | Moto vendida: página permanece no ar? | FASES 2, 4, 5 |
| **C** | Plataforma de deploy | FASE 12 |
| **D** | Domínio da loja de demonstração | FASES 9, 12 |
| **E** | Retenção de leads (LGPD) | FASE 6 |
| **I** | Confirmar E-1 acima | quanto antes, menos arquivos para mover |

### Ponto de atenção técnico

**Orçamento de performance apertado.** O bundle inicial está em **118,66 kB
gzip** com apenas duas páginas quase vazias. O orçamento definido no
`ROADMAP.md` para a FASE 9 é **< 180 kB gzip**, restando ~61 kB para todo o
resto. A composição é React DOM (~45 kB), React Router 7 (~30 kB) e
Axios (~35 kB).

Não é um problema hoje, e nada deve ser feito agora. Mas a FASE 9 provavelmente
precisará de *code splitting* por rota mais agressivo do que o previsto — em
especial isolando o bloco `/admin`. Registrado para não virar surpresa.

### Sem pendências de qualidade

Nenhum `TODO`, `FIXME`, `console.log`, arquivo órfão, dependência vulnerável ou
erro de lint.

---

## 14. Próxima fase recomendada

**FASE 2 — Banco + API** ([`ROADMAP.md`](./ROADMAP.md)).

Entrega: conexão efetiva com o Atlas, models `Moto` e `Brand` com os índices de
ARCHITECTURE §9.4, camada de repositórios com projeção pública, CRUD completo,
filtros, ordenação e paginação no servidor, `GET /api/filtros` e seed da loja
fictícia.

O que a FASE 1 já deixou pronto para ela: envelope de resposta, tratamento de
erros, validação de ambiente, conexão do banco, estrutura de módulos e
infraestrutura de testes com `supertest`.

Antes de iniciar, o ideal é ter:

1. **Cluster MongoDB Atlas** criado, com usuário restrito a um database
   (passo a passo em [`SETUP.md`](./SETUP.md) §4).
2. Resposta às decisões **A** e **I** — as duas que mudam código na FASE 2.

> **A FASE 2 não será iniciada sem a sua autorização.**
