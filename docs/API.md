# MotorShop — Referência da API

> Estado **como construído** ao fim da FASE 13 (2026-09-26). As decisões por
> trás de cada rota estão em [`ARCHITECTURE.md`](./ARCHITECTURE.md) §6–§8.
> Fonte de verdade: `backend/src/routes/index.js` e os `*.routes.js` de cada
> módulo. Os testes `permissions.test.js` e `envelope.test.js` percorrem as
> rotas a partir desse mesmo registro — rota nova já nasce coberta.

---

## 1. Convenções

- **Base:** `/api`. JSON na requisição e na resposta.
- **Caminhos em português** (`/motos`, `/marcas`); **campos em inglês**
  (`price`, `mileage`).
- **Preço sempre em reais** na API (`38900` ou `38900.5`). O banco guarda
  centavos (D-04); a conversão acontece na validação e no serializador.
- **Validação estrita:** corpo, query e parâmetros passam por Zod com
  `.strict()` — campo desconhecido é erro 422, não é ignorado.
- **Identificadores:** ObjectId de 24 caracteres hexadecimais; fotos usam UUID.
- **Datas:** ISO 8601 (`2026-09-26T14:30:00.000Z`).

### 1.1 Envelope de sucesso

```json
{ "success": true, "data": { }, "message": null }
```

Listas paginadas acrescentam `meta`:

```json
{ "success": true, "data": [ ], "meta": { "page": 1, "limit": 12, "total": 87, "totalPages": 8 }, "message": null }
```

`204 No Content` (sem corpo) nas exclusões definitivas.

### 1.2 Envelope de erro

```json
{
  "success": false,
  "message": "Dados inválidos",
  "errors": [{ "field": "price", "code": "too_small", "message": "Preço deve ser maior que zero" }],
  "requestId": "0f5c6a4e-…"
}
```

`errors` é sempre um array (vazio quando não há detalhe por campo). O
`requestId` também vai no cabeçalho `X-Request-Id` e no log do servidor.
Stack trace nunca é serializado.

| Código | Quando |
|---|---|
| `400` | JSON malformado, semântica inválida |
| `401` | sem token, token inválido/expirado, sessão encerrada |
| `403` | papel insuficiente (ex.: ADMIN em rota de SUPER_ADMIN) |
| `404` | recurso inexistente (ou invisível ao público, como moto `INACTIVE`) |
| `409` | conflito: marca com o mesmo nome, marca em uso, e-mail já cadastrado |
| `413` | corpo acima de `BODY_LIMIT` |
| `422` | falha de validação (Zod) |
| `429` | limite de requisições (§1.4) |
| `503` | banco indisponível (`requireDatabase`) ou provedor de imagens não configurado |
| `500` | erro interno (mensagem genérica; detalhe só no log e no Sentry) |

### 1.3 Autenticação

- `POST /api/auth/login` devolve `accessToken` (JWT, 15 min) no corpo e grava o
  **refresh token** em cookie `httpOnly`, `Secure` (produção), `SameSite=Strict`,
  restrito a `/api/auth`.
- Rotas `/api/admin/*` exigem `Authorization: Bearer <accessToken>` de um
  usuário **ativo**. Usuário desativado perde o acesso na próxima requisição.
- `POST /api/auth/refresh` troca o refresh token por um novo (rotação);
  reapresentar um refresh token já trocado é tratado como roubo e **encerra
  todas as sessões** do usuário.

Papéis: **ADMIN** (operação: estoque, marcas, leads) e **SUPER_ADMIN**
(tudo do ADMIN + usuários, configurações da loja, exclusão de leads).

### 1.4 Limites de requisição

Por IP (faixa /56 em IPv6), com cabeçalhos `RateLimit-*` padrão. Tabela em
`backend/src/middlewares/rateLimiters.js` (cada linha é testada).

| Rota | Limite |
|---|---|
| `POST /api/auth/login` | 5 por e-mail+IP e 20 por IP / 15 min |
| `POST /api/auth/refresh` | 30 / 15 min |
| `POST /api/leads` | 5 / hora |
| API pública (`/motos`, `/marcas`, `/store`, `/filtros`) | 900 / 15 min |
| Páginas do site, `sitemap.xml`, `robots.txt` | 600 / 15 min |
| `/api/admin/*` | 600 / 15 min |

> Os contadores ficam em memória (uma instância). Com mais de uma instância,
> trocar por um store compartilhado — ver `TECHNICAL-DEBT.md`.

---

## 2. Público

### Saúde

| Método | Caminho | Resposta |
|---|---|---|
| `GET` | `/api` | nome da API e os caminhos de saúde e catálogo |
| `GET` | `/api/health` | `200` com `database.status: "connected"`; **`503`** com o banco fora (é o que o Render usa para não trocar o tráfego) |

### Loja

| Método | Caminho | Resposta |
|---|---|---|
| `GET` | `/api/store` | Configuração pública: `name`, `legalName`, `slogan`, `logo`, `ogImage`, `theme`, `contact`, `address`, `social`, `businessHours`, `highlights`, `seo`, `features`, `financing`, `configured`. Sem loja configurada, devolve o padrão genérico com `configured: false`. `Cache-Control: public, max-age=300`. |

### Catálogo

| Método | Caminho | Resposta |
|---|---|---|
| `GET` | `/api/motos` | Lista paginada (só `AVAILABLE` e `RESERVED`) |
| `GET` | `/api/motos/slug/:slug` | Detalhe pela URL canônica. Moto vendida continua acessível (`status: "SOLD"`) para quem tem o link — decisão A; `INACTIVE` ou inexistente → `404` |
| `GET` | `/api/motos/slug/:slug/similares` | Até 4 motos da mesma marca ou faixa de preço |
| `GET` | `/api/marcas` | Marcas ativas com contagem de motos à venda |
| `GET` | `/api/filtros` | Faixas reais do estoque público (preço, ano, km, cc), marcas com contagem e enums em uso — uma agregação, sem baixar as motos |

Query de `GET /api/motos` (todos opcionais; faixa invertida é `422`):

```
q             busca textual (2–80 caracteres)
marca         slug(s) da marca: marca=honda,yamaha
precoMin      precoMax      em reais
anoMin        anoMax        1950 até o ano que vem
kmMin         kmMax
ccMin         ccMax
combustivel   GASOLINE, FLEX, ELECTRIC… (vírgula para vários)
cambio        MANUAL, AUTOMATIC… (vírgula para vários)
destaque      oferta        true | false | 1 | 0
sort          recentes (padrão) | preco_asc | preco_desc | ano_desc | ano_asc | km_asc | km_desc
page          limit         limit padrão 12, máximo 48
```

Cada moto pública traz `id`, `slug`, `brand {name, slug}`, `model`,
`version`, `year`, `mileage`, `engineCapacity`, `fuel`, `transmission`,
`color`, `price`, `previousPrice`, `onSale`, `featured`, `status`, `images`
(`url`, `alt`, `width`, `height`, `isMain`), `features`, `description`,
`createdAt`. **Nunca** `licensePlate` nem motos `INACTIVE`.

### Leads

| Método | Caminho | Resposta |
|---|---|---|
| `POST` | `/api/leads` | `201` com o lead registrado (sem dado interno). Limite de 5/hora por IP |

Corpo: um de quatro tipos (`type` discrimina), todos com os campos de contato
e o consentimento LGPD:

```jsonc
{
  "type": "MOTO_INTEREST",          // | "SELL_MOTO" | "CONTACT" | "FINANCING"
  "name": "Maria Souza",            // 2–80 caracteres
  "phone": "(49) 99123-4567",       // normalizado para +55…; DDD e celular validados
  "email": "maria@exemplo.com",     // opcional
  "message": "Aceita troca?",       // opcional (obrigatória em CONTACT, 5+)
  "source": { "page": "/motos/honda-cb-500f-2024", "referrer": "…", "utm": { "source": "instagram" } },
  "consent": { "accepted": true, "textVersion": "2026-09-v1" },   // versão vigente do texto (shared)
  "website": "",                    // honeypot: preenchido → descartado em silêncio

  "moto": "665f…",                  // MOTO_INTEREST (obrigatório) e FINANCING (opcional)
  "data": { }                       // SELL_MOTO e FINANCING, abaixo
}
```

- `SELL_MOTO.data`: `brand`, `model`, `year`, `mileage`, `expectedPrice?`
  (reais), `condition?`. Com o módulo `sellMotoEnabled` desligado → `422`
  (`field: "type"`, `code: "disabled"`).
- `FINANCING.data`: `vehiclePrice`, `downPayment`, `installments` (6–72).
  O servidor confere prazo e entrada mínima com a configuração da loja e
  **refaz a conta com a taxa dele** — a parcela enviada pelo navegador é
  ignorada. Com `financingEnabled` desligado → `422`, como acima.
- O mesmo envio repetido em 2 minutos (clique duplo) devolve o lead já
  gravado, sem duplicar.

---

## 3. Autenticação

| Método | Caminho | Acesso | Resposta |
|---|---|---|---|
| `POST` | `/api/auth/login` | público | `{ accessToken, user }` + cookie de refresh. Credencial errada: `401` com mensagem única (não revela se o e-mail existe) |
| `POST` | `/api/auth/refresh` | cookie | novo `{ accessToken, user }` e novo cookie |
| `POST` | `/api/auth/logout` | cookie | encerra a sessão e apaga o cookie |
| `GET` | `/api/auth/me` | Bearer | usuário atual |
| `GET` | `/api/auth/sessao` | cookie (opcional) | Consulta **sem renovar**: `{ name, role }` de quem está logado, ou `data: null`. Não emite token nem troca o cookie — é o que o site público usa para mostrar a faixa da equipe e o botão "Editar". `Cache-Control: no-store`; limite da API pública |

---

## 4. Painel (`/api/admin`, Bearer obrigatório)

Toda escrita bem-sucedida no painel limpa o cache do site público, para a
mudança aparecer na hora.

### Motos — ADMIN

| Método | Caminho | Resposta |
|---|---|---|
| `GET` | `/admin/motos` | Lista paginada, incluindo `INACTIVE` e `licensePlate`; mesma query do público + `status` |
| `GET` | `/admin/motos/:id` | Detalhe completo |
| `POST` | `/admin/motos` | `201`. Corpo: `brand` (id), `model`, `version?`, `year`, `mileage`, `price`, `previousPrice?`, `engineCapacity`, `fuel`, `transmission`, `color`, `licensePlate?`, `description?`, `features?`, `featured?`, `onSale?` (exige `previousPrice` maior que `price`), `status?` |
| `PATCH` | `/admin/motos/:id` | Atualização parcial (mesmos campos). O slug não muda (D-07) |
| `PATCH` | `/admin/motos/:id/status` | `{ "status": "AVAILABLE" \| "RESERVED" \| "SOLD" \| "INACTIVE" }` |
| `DELETE` | `/admin/motos/:id` | Desativa (`INACTIVE`, D-06) e devolve a moto — não é exclusão física |

### Fotos das motos — ADMIN

O arquivo nunca passa pela API: o navegador envia direto ao Cloudinary com
uma assinatura de uso único; a API só vincula os metadados **depois de
verificar a assinatura da resposta do provedor**.

| Método | Caminho | Resposta |
|---|---|---|
| `POST` | `/admin/uploads/assinatura` | `{ motoId }` → parâmetros assinados (pasta da moto, formatos, validade). `Cache-Control: no-store` |
| `POST` | `/admin/motos/:id/imagens` | `201`. Corpo: `publicId`, `version`, `signature`, `format` (jpg, png, webp, avif), `bytes` (≤ 10 MB), `width`, `height`, `alt?`. Recusa pasta de outra moto e assinatura inválida. Máximo de 20 fotos |
| `PATCH` | `/admin/motos/:id/imagens/ordem` | `{ order: [uuid…], mainImageId }` — todas as fotos, sem faltar nem repetir |
| `PATCH` | `/admin/motos/:id/imagens/:imageId` | `{ alt }` |
| `DELETE` | `/admin/motos/:id/imagens/:imageId` | Remove do registro e apaga no provedor (em segundo plano) |

### Marcas — ADMIN

| Método | Caminho | Resposta |
|---|---|---|
| `GET` | `/admin/marcas` | Todas, inclusive inativas e sem moto |
| `GET` | `/admin/marcas/:id` | Detalhe |
| `POST` | `/admin/marcas` | `201`. `{ name, active? }`; nome repetido → `409` |
| `PATCH` | `/admin/marcas/:id` | Parcial; renomear para nome existente → `409` |
| `DELETE` | `/admin/marcas/:id` | `204`; marca com moto → `409` (desative em vez de excluir) |

### Leads — ADMIN (exclusão: SUPER_ADMIN)

| Método | Caminho | Resposta |
|---|---|---|
| `GET` | `/admin/leads` | Paginada. Query: `tipo`, `status` (vírgula para vários), `de`, `ate` (ISO com fuso), `page`, `limit` |
| `GET` | `/admin/leads/:id` | Detalhe com a moto vinculada e o histórico de anotações |
| `PATCH` | `/admin/leads/:id` | `{ status?, note? }` — pelo menos um. Status: `NEW`, `IN_PROGRESS`, `WON`, `LOST` |
| `DELETE` | `/admin/leads/:id` | `204`. **SUPER_ADMIN** — eliminação a pedido do titular (LGPD) |
| `POST` | `/admin/leads/exclusao` | **SUPER_ADMIN**. `{ ids: [id…] }` (1–100, repetidos ignorados) → `{ deleted }`. `POST` porque proxies podem descartar corpo de `DELETE` |

A exclusão é registrada no log com quem excluiu e quantos — sem o dado pessoal.

### Usuários — SUPER_ADMIN

| Método | Caminho | Resposta |
|---|---|---|
| `GET` | `/admin/usuarios` | Lista (sem hash de senha) |
| `GET` | `/admin/usuarios/:id` | Detalhe |
| `POST` | `/admin/usuarios` | `201`. `{ name, email, password, role? }`; senha com 12+ caracteres e sem termos óbvios (`senha`, `123456`, `admin`…); e-mail repetido → `409` |
| `PATCH` | `/admin/usuarios/:id` | `{ name?, email?, password?, role?, active? }`. Ninguém altera o próprio papel nem se desativa, e o último SUPER_ADMIN ativo não pode deixar de sê-lo. Trocar a senha ou desativar encerra as sessões do usuário |
| `DELETE` | `/admin/usuarios/:id` | Desativa (nunca exclui fisicamente) e encerra as sessões |

### Configuração da loja — leitura ADMIN, escrita SUPER_ADMIN

| Método | Caminho | Resposta |
|---|---|---|
| `GET` | `/admin/store` | Documento completo; `404` se a loja ainda não foi configurada |
| `PATCH` | `/admin/store` | Parcial, **SUPER_ADMIN**. Campos na tabela abaixo |
| `POST` | `/admin/store/imagens/assinatura` | **SUPER_ADMIN**. Parâmetros assinados para a pasta `…/loja` |
| `PUT` | `/admin/store/imagens/:tipo` | **SUPER_ADMIN**. `tipo`: `logo` ou `ogImage`. Mesmo corpo do vínculo de foto de moto; substitui a anterior (a antiga é apagada no provedor) |
| `DELETE` | `/admin/store/imagens/:tipo` | **SUPER_ADMIN**. Remove a imagem; o site volta ao nome em texto / sem imagem de compartilhamento |

Campos de `PATCH /admin/store`:

| Grupo | Campos |
|---|---|
| Identidade | `name`, `legalName`, `slogan` |
| Tema | `theme.primary` (hex). A cor é clareada no site se ficar ilegível sobre o fundo escuro |
| Contato | `contact.whatsapp`, `contact.phone`, `contact.email` |
| Endereço | `address.street`, `number`, `complement`, `district`, `city`, `state` (UF), `zipCode`, `mapsUrl` |
| Redes | `social.instagram`, `facebook`, `youtube` (URLs) |
| Horários | `businessHours: [{ weekday 0–6, opensAt "08:00", closesAt "18:00", closed? }]` |
| Diferenciais | `highlights: [{ title ≤ 40, text? ≤ 140 }]`, até 3 — aparecem na home; vazio, a seção some |
| SEO | `seo.siteUrl`, `seo.defaultTitle` (≤ 70), `seo.defaultDescription` (≤ 180) |
| Módulos | `features.financingEnabled`, `features.sellMotoEnabled` |
| Financiamento | `financing.monthlyRate`, `installmentOptions`, `minDownPaymentPercent` |

---

## 5. Site (fora de `/api`)

| Caminho | O que é |
|---|---|
| `/`, `/estoque`, `/motos/:slug`, `/financiamento`, `/venda-sua-moto`, `/sobre`, `/contato`, `/privacidade` | HTML renderizado no servidor, com título, descrição, Open Graph, dados estruturados (JSON-LD) e o tema da loja já aplicados. Página inexistente, moto inexistente e módulo desligado respondem **404** de verdade |
| `/admin/*` | Painel (SPA), `noindex` |
| `/sitemap.xml` | Páginas e motos à venda, com o domínio de `seo.siteUrl` |
| `/robots.txt` | `Disallow: /admin` e `/api`, com o endereço do sitemap; `Disallow: /` quando `ROBOTS_POLICY=disallow` (staging) |

---

## 6. Exemplos

```bash
# Catálogo: Honda e Yamaha até R$ 30 mil, mais baratas primeiro
curl 'https://loja.exemplo/api/motos?marca=honda,yamaha&precoMax=30000&sort=preco_asc'

# Login e uso do token
TOKEN=$(curl -s -c cookies.txt -H 'Content-Type: application/json' \
  -d '{"email":"dono@loja.exemplo","password":"…"}' \
  https://loja.exemplo/api/auth/login | jq -r .data.accessToken)

curl -H "Authorization: Bearer $TOKEN" 'https://loja.exemplo/api/admin/leads?status=NEW'

# Marcar como vendida
curl -X PATCH -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"status":"SOLD"}' https://loja.exemplo/api/admin/motos/<id>/status
```
