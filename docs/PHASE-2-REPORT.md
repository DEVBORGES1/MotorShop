# Relatório da FASE 2 — Banco + API

**Data:** 2026-09-14
**Branch:** `main`
**Base:** [`ARCHITECTURE.md`](./ARCHITECTURE.md) · [`ROADMAP.md`](./ROADMAP.md)

---

## 1. Resumo

A FASE 2 entrega os modelos `Moto` e `Brand`, a camada de repositórios com
projeção pública, o CRUD completo, o catálogo com filtros, ordenação e
paginação no servidor, o endpoint de faixas de filtro com `$facet`, os scripts
de índices e de seed, e o workspace `shared` — adiado na FASE 1 por não ter
conteúdo real, agora com os enums do domínio.

**102 testes de backend passando** e **50 testes de integração escritos e
prontos**, porém **não executados**: o ambiente desta sessão não tem acesso a
um MongoDB. Esta é a principal ressalva da fase e está detalhada em §11.

Três problemas foram encontrados e corrigidos durante a construção, dois deles
achados pelas próprias verificações (§11).

Nenhuma funcionalidade de fases seguintes foi implementada: não há
autenticação, painel, leads, financiamento nem upload.

---

## 2. Estrutura criada

```
shared/                                  workspace novo (adiado na FASE 1)
├─ package.json
└─ src/
   ├─ enums.js          MOTO_STATUS, FUEL, TRANSMISSION, MOTO_SORT,
   │                    PAGINATION, MOTO_LIMITS + rótulos em pt-BR
   └─ index.js

backend/src/
├─ modules/brands/
│  ├─ brand.model.js          + imageSchema (metadados, nunca binário)
│  ├─ brand.repository.js     projeção pública por allowlist
│  ├─ brand.service.js        bloqueio de exclusão de marca em uso
│  ├─ brand.serializer.js     _id → id
│  ├─ brand.controller.js
│  ├─ brand.routes.js         públicas e administrativas, separadas
│  └─ brand.schema.js         Zod .strict()
├─ modules/motos/
│  ├─ moto.model.js           6 índices de §9.4
│  ├─ moto.repository.js      filtros, ordenação whitelist, $facet, projeções
│  ├─ moto.service.js         regra de negócio e status imposto no servidor
│  ├─ moto.serializer.js      _id → id, centavos → reais
│  ├─ moto.controller.js
│  ├─ moto.routes.js
│  └─ moto.schema.js          coerção na query, .strict() nas escritas
├─ middlewares/
│  ├─ validate.js             Zod para body/query/params
│  ├─ adminGuard.js           trava das rotas admin até a FASE 3
│  └─ requireDatabase.js      503 imediato quando o banco não está pronto
├─ utils/
│  ├─ money.js                reais ⇄ centavos
│  ├─ slug.js                 geração e resolução de colisão
│  └─ pagination.js           skip/limit com teto do servidor
└─ scripts/
   ├─ createIndexes.js        npm run db:indexes
   └─ seed.js                 npm run seed

backend/tests/
├─ globalSetup.js             sobe Mongo em memória; degrada com aviso
├─ helpers/db.js
├─ unit/          money · slug · pagination · moto.schema · brand.schema
│                 moto.repository · adminGuard · env
└─ integration/   motos · brands · health · errors
```

**26 arquivos novos.** Nenhum diretório vazio; nenhum arquivo órfão.

---

## 3. Dependências adicionadas

| Pacote | Onde | Justificativa |
|---|---|---|
| `slugify` | backend | Transliteração pt-BR correta (`Edição` → `edicao`). Regex própria erraria acentuação e pontuação. |
| `@motorshop/shared` | backend | Workspace interno, não é dependência externa |
| `mongodb-memory-server` | backend (dev) | MongoDB real em memória para os testes de integração, sem depender do Atlas |

`mongoose` e `zod` já estavam instalados desde a FASE 1.
**`npm audit`: 0 vulnerabilidades.**

---

## 4. Modelos

### `Moto`

Todos os campos de ARCHITECTURE §5.1. Pontos de projeto:

| Decisão | Motivo |
|---|---|
| `price` e `previousPrice` em **centavos inteiros** | `float` erra em aritmética decimal; erro de arredondamento em preço vira divergência de catálogo (D-04). A API fala reais na borda. |
| `licensePlate` com `select: false` | Defesa em profundidade: nem uma query descuidada devolve a placa. |
| `slug` com `immutable: true` | Regravá-lo quebraria links indexados e já compartilhados no WhatsApp (D-07). |
| `images` como subdocumento embutido | Sempre lidas junto da moto, cardinalidade baixa. Só metadados — o binário fica no provedor externo (FASE 8). |
| `brand` por referência | Renomear "Honda" não pode exigir atualizar N motos. |

### `Brand`

`name` com índice **único case-insensitive** (collation `pt`, strength 2): sem
isso, "Honda" e "honda" coexistiriam como marcas diferentes.

### Índices — os 6 de §9.4

```
{ slug: 1 } unique                              detalhe da moto
{ status: 1, featured: -1, createdAt: -1 }      home e listagem padrão
{ status: 1, brand: 1, price: 1 }               marca + faixa de preço
{ status: 1, price: 1 }                         ordenar por preço
{ status: 1, year: -1 }                         ordenar/filtrar por ano
{ model, version, description } text            busca textual (?q=)
```

**Deliberadamente ausentes:** `mileage`, `engineCapacity`, `fuel`,
`transmission`, `color`, `onSale`. São filtros de refinamento sobre um conjunto
já reduzido; indexá-los agora é o overengineering que o projeto evita. Entram se
o `explain()` mostrar necessidade.

---

## 5. API criada

### Público

| Método | Rota | Observação |
|---|---|---|
| `GET` | `/api/motos` | Filtros, ordenação e paginação — tudo no servidor |
| `GET` | `/api/motos/slug/:slug` | URL canônica |
| `GET` | `/api/motos/slug/:slug/similares` | Mesma marca ou faixa de preço próxima |
| `GET` | `/api/marcas` | Somente ativas |
| `GET` | `/api/filtros` | Faixas reais do estoque, em uma agregação `$facet` |

Filtros aceitos: `q`, `marca` (lista), `precoMin/Max`, `anoMin/Max`,
`kmMin/Max`, `ccMin/Max`, `combustivel` (lista), `cambio` (lista), `destaque`,
`oferta`, `sort`, `page`, `limit`.

### Administrativo

| Método | Rota |
|---|---|
| `GET/POST` | `/api/admin/motos` |
| `GET/PATCH/DELETE` | `/api/admin/motos/:id` |
| `PATCH` | `/api/admin/motos/:id/status` |
| `GET/POST` | `/api/admin/marcas` |
| `GET/PATCH/DELETE` | `/api/admin/marcas/:id` |

`DELETE` de moto **desativa** (`status: INACTIVE`), não apaga (D-06): leads
futuros referenciarão a moto, links indexados precisam de resposta coerente, e
apagar um cadastro com 20 fotos por engano é irreversível.

`DELETE` de marca **em uso** responde `409` e sugere desativar.

### `GET /api/filtros`

Devolve `total`, faixas de `price` (em reais), `year`, `mileage`,
`engineCapacity`, e as marcas/combustíveis/câmbios presentes **com contagem**.
Sem ele, a tela de filtros precisaria baixar o catálogo inteiro só para
descobrir os limites dos sliders — exatamente o que o projeto proíbe.

---

## 6. Decisão A aplicada (moto vendida)

Você não respondeu às decisões A–I, então segui a recomendação registrada, como
combinado. Na prática:

| Status | Na listagem pública | Por slug |
|---|---|---|
| `AVAILABLE` | ✅ | ✅ |
| `RESERVED` | ✅ | ✅ |
| `SOLD` | ❌ | ✅ **acessível** — preserva o SEO acumulado e gera lead |
| `INACTIVE` | ❌ | ❌ |

Isso está isolado em duas constantes de `shared/src/enums.js`
(`PUBLIC_LIST_STATUSES` e `PUBLIC_DETAIL_STATUSES`). Se você preferir outro
comportamento, é alterar uma linha — não há regra espalhada.

---

## 7. Segurança

| Controle | Como |
|---|---|
| **Status imposto pelo servidor** | A lista de status não é parâmetro de query. Não existe caminho para `?status=INACTIVE` no público — o schema público rejeita o parâmetro. |
| **Projeção por allowlist** | Consultas públicas listam os campos permitidos. Campo novo no schema **não** vira público sozinho; há teste que falha se a lista mudar. |
| **`licensePlate` nunca pública** | `select: false` no schema + fora da allowlist + teste dedicado (R-14). |
| **Sem mass assignment** | `.strict()` em toda escrita: enviar `slug` ou `createdAt` é `422`, não silêncio. |
| **Sem injeção NoSQL** | Nenhum valor do cliente vira chave de query. `sort` é whitelist mapeada; busca textual usa índice `$text`, não `RegExp` montada com entrada do usuário (que também abriria ReDoS). |
| **Rotas admin separadas** | O código público não possui rota capaz de devolver campo privado — não há o `if` esquecido que vazaria dados. |
| **`adminGuard`** | `/api/admin/*` responde **503 em produção** até a FASE 3. Um deploy acidental nesta fase não expõe escrita sem credencial. |
| **Teto de paginação** | `limit` máximo de 48 imposto pelo servidor. |

---

## 8. Testes

**152 testes no backend: 102 executados e passando, 50 escritos aguardando banco.**

### Executados aqui (102)

| Arquivo | Cobre |
|---|---|
| `unit/money.test.js` (4) | Conversão, arredondamento, ida e volta, erro de ponto flutuante |
| `unit/slug.test.js` (9) | Formato, acentos, partes ausentes, colisão, falha alto |
| `unit/pagination.test.js` (6) | Padrões, skip, teto do servidor |
| `unit/moto.schema.test.js` (28) | Coerção, whitelist de sort, faixa invertida, campo desconhecido, regras de oferta |
| `unit/brand.schema.test.js` (10) | Validação e rejeição de slug forjado |
| `unit/moto.repository.test.js` (24) | **Allowlist de projeção**, construção de filtro, whitelist de ordenação, tentativa de injeção |
| `unit/adminGuard.test.js` (2) | Bloqueio em produção |
| `unit/env.test.js` (9) | Herdados da FASE 1 |
| `integration/errors.test.js` (7) | Envelope, CORS, helmet, **503 imediato sem banco** |
| `integration/health.test.js` (3) | Health check |

### Escritos, aguardando banco (50)

`integration/motos.test.js` (39) e `integration/brands.test.js` (11) cobrem:
CRUD completo, geração e colisão de slug, preço em centavos no banco e reais na
API, cada filtro isolado e combinado, as 6 ordenações, paginação e `meta`,
similares, `/api/filtros` com e sem estoque, 409 de marca em uso, e os testes de
segurança (placa nunca pública, `INACTIVE` invisível, `SOLD` acessível por slug,
sem `_id`/`__v`). Há ainda 3 testes de `explain()` exigindo `IXSCAN` e ausência
de `COLLSCAN`.

Eles **não falham** onde não há banco: se marcam como pulados com aviso
explícito. Preferi isso a fingir que passaram.

---

## 9. Validações executadas

| # | Validação | Resultado |
|---|---|---|
| 1 | `npm run lint` | ✅ zero erros e zero avisos |
| 2 | `npm run format:check` | ✅ |
| 3 | `npm test` | ✅ 106 passando (102 backend + 4 frontend), 50 pulados |
| 4 | `npm run build` | ✅ backend e frontend |
| 5 | Todos os módulos carregam | ✅ |
| 6 | Slugs do seed | ✅ `honda-cb-500f-2024`, `suzuki-v-strom-650-xt-2021` |
| 7 | Coerção de query em execução | ✅ `precoMin='15000'` → `1500000` centavos |
| 8 | `.strict()` nos 4 schemas derivados | ✅ |
| 9 | Índices declarados | ✅ os 6 de §9.4 |
| 10 | API sem banco | ✅ 503 em 0,002 s (antes: 500 em 10,018 s) |
| 11 | `process.env` fora de `config/env.js` | ✅ nenhum |
| 12 | `npm audit` | ✅ 0 vulnerabilidades |

---

## 10. Problemas encontrados

### Problema 1 — Endpoint de marcas quebrava a convenção da API 🟠

`GET /api/marcas` devolvia `_id` e `__v`; `GET /api/motos` devolvia `id`. O
mesmo cliente precisaria tratar as duas formas, e `ARCHITECTURE.md` §6.1 diz
explicitamente que a API expõe `id` e nunca `_id`.

Achado por um **erro do ESLint** ao reclamar de variáveis não usadas no
serializador — ao investigar, ficou claro que marcas não passavam por
serializador nenhum.

### Problema 2 — API travava 10 segundos por requisição sem banco 🟠

Sem `MONGODB_URI`, cada chamada a `/api/motos` ficava presa no buffer do
Mongoose e devolvia `500 Erro interno do servidor` após **10,018 s**. Dois
problemas: conexão presa por 10 s é superfície barata de negação de serviço, e a
mensagem não dizia nada a quem opera.

### Problema 3 — `seed.js` violava a própria regra do projeto 🟡

Lia `process.env.NODE_ENV` diretamente, contrariando a regra do `CLAUDE.md` de
que só `config/env.js` acessa `process.env`. Pior: a checagem de produção vinha
**depois** de conectar, e o script apaga motos e marcas.

### Problema 4 — API do Zod 4 diferente do esperado 🟡

`.superRefine()` em Zod 4 devolve um `ZodObject` (não `ZodEffects`), então
`.innerType()` não existe mais.

### Problema 5 — Dois testes escritos errados 🟡

Um chamava `buildFilter({ kmMax })` — mas `kmMax → mileageMax` é tradução do
*service*; o repositório recebe o nome de domínio. O código estava certo.

---

## 11. Problemas corrigidos

| # | Correção | Verificação |
|---|---|---|
| 1 | `brand.serializer.js` criado e aplicado nos 5 endpoints de marca; `moto.serializer` passou a reutilizá-lo | Teste de integração exigindo `id` e ausência de `_id`/`__v` |
| 2 | `requireDatabase` responde 503 de imediato, com mensagem acionável | **10,018 s → 0,002 s**, confirmado em execução; teste que falha se passar de 1 s |
| 3 | `seed.js` usa `env.isProduction`, e a checagem foi movida para **antes** de conectar | Varredura de `process.env` limpa |
| 4 | Schemas derivados de uma base sem refinamento, aplicando o refinamento em cada schema final | Teste confirmando `.strict()` nos 4 schemas derivados |
| 5 | Testes corrigidos para usar os nomes de domínio | 102 passando |

### Ressalva principal — sem MongoDB neste ambiente 🔴

**O código de banco desta fase não foi executado contra um MongoDB real.**

O que foi tentado:

| Caminho | Resultado |
|---|---|
| `mongodb-memory-server` | ❌ `403` do proxy ao baixar `fastdl.mongodb.org` |
| Docker | ❌ sem daemon (`/var/run/docker.sock` não existe) |
| `mongod` local | ❌ não instalado na imagem |

O `403` é política de egresso da organização; o manual do proxy é explícito em
**reportar, não contornar** — então não tentei espelhos alternativos.

**O que isso significa na prática:** filtros, ordenações, agregação `$facet`,
geração de slug contra o banco, uso de índice e o seed estão *implementados e
cobertos por teste*, mas não *comprovados em execução*. Os 102 testes que
rodaram cobrem toda a lógica que não depende do banco — validação, projeções,
construção de filtros, whitelist de ordenação, conversão de dinheiro e slug.

**Como fechar isso na sua máquina, em cerca de 5 minutos:**

```bash
npm test                       # os 50 testes de integração passam a rodar
                               # (mongodb-memory-server baixa o binário)

# e, com um cluster Atlas em MONGODB_URI:
npm run db:indexes             # cria e lista os índices
npm run seed                   # 6 marcas e 22 motos
npm run dev
curl "http://localhost:3000/api/motos?marca=honda&sort=preco_asc"
curl "http://localhost:3000/api/filtros"
```

Se algum teste falhar, me mande a saída — corrijo antes da FASE 3.

---

## 12. Pendências

### Bloqueante para declarar a FASE 2 fechada

1. **Executar `npm test` com banco** (acima). É o único item que falta.
2. **Criar o cluster Atlas** — passo a passo em [`SETUP.md`](./SETUP.md) §4.

### Decisões da FASE 0 ainda em aberto

Segui as recomendações, como combinado. Duas já viraram código:

| # | Questão | O que está valendo |
|---|---|---|
| **A** | Moto vendida | Fora da listagem, acessível por slug (§6). Reversível em uma linha. |
| **I** | Estrutura do backend | `modules/` por domínio, mantido da FASE 1 |
| **C**, **D**, **E** | Deploy, domínio, retenção de leads | Ainda não afetam código; **E** afeta a FASE 6 |

### Efeito colateral registrado

`requireDatabase` roda **antes** da validação, então com o banco fora do ar um
`?sort=invalido` responde `503` em vez de `422`. Foi escolha consciente: a
guarda no nível do router é à prova de esquecimento quando rotas novas forem
adicionadas, enquanto repeti-la em cada rota abriria espaço para omissão. Com o
banco no ar — o caso normal — a resposta é `422`, como especificado.

### Sem pendências de qualidade

Nenhum `TODO`, `FIXME`, `console.log` indevido, arquivo órfão, dependência
vulnerável ou erro de lint.

---

## 13. Próxima fase recomendada

**FASE 3 — Autenticação + Admin**, depois que o item bloqueante de §12 for
fechado.

Entrega: model `User` com argon2id, `RefreshToken` com TTL, login com resposta
idêntica nos três casos de falha, refresh com rotação e detecção de reuso,
`authenticate` e `authorize`, rate limit de login, e o painel administrativo
consumindo a API.

O que a FASE 2 já deixou pronto: `validate`, envelope, serializadores,
repositórios, `adminGuard` (que a FASE 3 **substitui** por `authenticate`) e a
infraestrutura de testes.

> **A FASE 3 não será iniciada sem a sua autorização.**
