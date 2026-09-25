# MotorShop — Roadmap de Implementação

> Complemento de [`docs/ARCHITECTURE.md`](./ARCHITECTURE.md).
> **Status atual: FASES 0 a 11 concluídas (FASES 8 e 9 com verificações manuais pendentes; FASE 10 com rotação de segredos no go-live; FASE 11 com o bloqueio de merge a ativar no GitHub). FASE 12 aguardando autorização.**

---

## Como ler este roadmap

Cada fase declara **objetivo**, **funcionalidades**, **arquivos envolvidos**,
**dependências**, **critérios de conclusão** e **testes necessários**.

Regras que valem para todas as fases:

1. **Uma fase não começa antes de a anterior atender seus critérios de
   conclusão.** Critério não atendido é dívida, não progresso.
2. **Nada fora do escopo da fase.** Requisito novo vira fase nova, com sua
   aprovação — não entra por dentro.
3. **Nenhuma dependência é instalada sem justificativa** registrada
   (§2.2 do ARCHITECTURE).
4. **Segurança é transversal.** A FASE 10 audita e endurece; ela não é a
   primeira vez que o tema aparece.
5. **Commits pequenos e verificáveis**, um assunto por commit.

### Marcos

| Marco | Fases | O que passa a existir |
|---|---|---|
| **M1 — API operável** | 1–3 | Loja cadastra e gerencia estoque pelo painel |
| **M2 — Site vendável** | 4–7 | Visitante busca, vê a moto e entra em contato |
| **M3 — Pronto para produção** | 8–12 | Imagens, SEO, segurança, testes, deploy |
| **M4 — Entregável comercial** | 13 | Auditado, documentado, apto a revenda |

---

# FASE 0 — Arquitetura ✅ concluída

### Objetivo
Definir arquitetura, modelos, contratos e riscos **antes** de escrever código,
eliminando retrabalho estrutural.

### Funcionalidades
Nenhuma (fase de análise e projeto).

### Arquivos envolvidos
| Arquivo | Situação |
|---|---|
| `docs/ARCHITECTURE.md` | ✅ criado |
| `docs/ROADMAP.md` | ✅ criado |
| `README.md` | ✅ criado |
| `.env.example` | ✅ criado (sem credenciais reais) |
| `.gitignore` | ✅ criado |

### Dependências
Nenhuma instalada.

### Critérios de conclusão
- [x] Estado atual do repositório analisado e reportado (vazio, sem commits)
- [x] Ambiente e toolchain inventariados
- [x] Problemas e lacunas identificados (P-01 a P-08)
- [x] Arquitetura em camadas definida, com contrato de responsabilidades
- [x] Estrutura de pastas definida e justificada
- [x] Modelos definidos (Moto, Brand, Lead, User, StoreSettings, RefreshToken)
- [x] Endpoints definidos, com ajustes ao briefing justificados
- [x] Fluxo de autenticação definido
- [x] Fluxo frontend → API → MongoDB detalhado passo a passo
- [x] Mongoose vs Prisma avaliado e decidido (D-01)
- [x] Armazenamento de imagens avaliado e decidido (D-02)
- [x] Estratégia de deploy definida
- [x] Riscos mapeados com mitigação (R-01 a R-16)
- [x] Decisões pendentes listadas com recomendação (A–I)
- [x] Limitação de SEO do React SPA explicada, com solução que preserva a stack

### Testes necessários
Não aplicável. A validação desta fase é a sua revisão e aprovação.

### 🚦 Bloqueio
**A FASE 1 não inicia sem sua autorização explícita.**

---

# FASE 1 — Fundação do projeto ✅ concluída

> Relatório completo: [`PHASE-1-REPORT.md`](./PHASE-1-REPORT.md)

### Objetivo
Ter frontend e backend subindo, conversando entre si e falhando de forma clara
quando mal configurados. Nenhuma regra de negócio.

### Funcionalidades
- Monorepo com npm workspaces (`backend`, `frontend`, `shared`)
- Express com os middlewares globais na ordem de §8.1
- Validação de `process.env` com Zod no boot — **o servidor recusa iniciar com
  configuração inválida** (mitiga R-05)
- `GET /api/health` sem detalhe interno
- Envelope de resposta (`ok`/`fail`) e `errorHandler` centralizado
- `ApiError` e `asyncHandler`
- Log estruturado com pino e redaction
- Vite + React + React Router com as 8 rotas públicas (páginas vazias)
- Tailwind com os tokens de tema como CSS custom properties (§14.2)
- Cliente Axios com interceptor que desembrulha o envelope
- ESLint + Prettier nos três workspaces

### Arquivos envolvidos
```
package.json                       workspaces + scripts (dev, build, lint, test)
.gitignore · .env.example
backend/package.json
backend/src/config/{env,logger}.js
backend/src/utils/{ApiError,apiResponse,asyncHandler}.js
backend/src/middlewares/{requestId,notFound,errorHandler}.js
backend/src/routes/index.js
backend/src/app.js · backend/src/server.js
frontend/package.json · vite.config.js · tailwind.config.js · postcss.config.js
frontend/index.html
frontend/src/{main.jsx,styles/index.css}
frontend/src/app/{App,router,providers}.jsx
frontend/src/pages/public/*.jsx     (8 placeholders)
frontend/src/lib/api/{client,interceptors}.js
frontend/src/config/theme.js
shared/package.json · shared/src/{enums,index}.js
eslint.config.js
```

### Dependências
**Backend:** `express`, `zod`, `helmet`, `cors`, `compression`,
`cookie-parser`, `pino`, `pino-http`
**Frontend:** `react`, `react-dom`, `react-router-dom`, `axios`,
`@tanstack/react-query`; dev: `vite`, `@vitejs/plugin-react`, `tailwindcss`,
`postcss`, `autoprefixer`
**Raiz (dev):** `eslint`, `prettier`, `vitest`

> Mongoose **não** entra aqui — a fase não toca o banco.

### Critérios de conclusão
- [x] `npm run dev` na raiz sobe backend e frontend juntos
- [x] `GET /api/health` responde `200` no envelope padrão
- [x] Variável obrigatória inválida → servidor **não** sobe e diz qual e por quê
- [x] Rota inexistente → `404` no envelope de erro
- [x] Erro → resposta **sem stack** em produção, com `requestId` (verificado em execução)
- [x] Rotas navegam sem recarregar a página *(Home e 404; as demais páginas
      públicas são das FASES 4–7, conforme o escopo pedido para esta fase)*
- [x] Trocar um token de `@theme` muda a cor de toda a aplicação
- [x] `npm run lint` limpo
- [ ] ~~`shared/enums.js` importável por frontend **e** backend~~ — **adiado
      para a FASE 2**: sem os enums, o workspace seria um diretório vazio
- [x] Nenhum segredo versionado; `.env.example` sem valor real

### Testes necessários
| Tipo | O que |
|---|---|
| Integração | `/api/health` → 200; rota inexistente → 404; erro → 500 sem stack |
| Unitário | `env.js` rejeita configuração inválida; `ok()`/`fail()` produzem o envelope |
| Manual | navegação entre rotas; troca de token de tema |

---

# FASE 2 — Banco + API ✅ concluída (verificação de banco pendente)

> Relatório: [`PHASE-2-REPORT.md`](./PHASE-2-REPORT.md)

### Objetivo
Persistência real e CRUD completo de motos e marcas na API, com validação e
paginação. Sem autenticação ainda (rotas admin temporariamente abertas **apenas
em desenvolvimento**, fechadas na FASE 3).

### Funcionalidades
- Conexão Mongoose com pool, retry e `listen` só após conectar
- Models: `Moto`, `Brand` (com índices de §9.4)
- Geração de slug com resolução de colisão
- Repositórios com projeção pública (allowlist) e filtro de status no servidor
- CRUD de motos: listar, buscar por slug, criar, atualizar, alterar status,
  soft delete (D-06)
- CRUD de marcas, com bloqueio de exclusão de marca em uso (409)
- `GET /api/motos` com todos os filtros, ordenação whitelisted e paginação
- `GET /api/filtros` (agregação `$facet`) — §6.6
- Schemas Zod `.strict()` para escrita, com coerção na query
- Script de índices (`npm run db:indexes`)
- Seed da loja fictícia: marcas + ~20 motos variadas

### Arquivos envolvidos
```
backend/src/config/database.js
backend/src/modules/motos/*          (model, repository, service, controller, routes, schema)
backend/src/modules/brands/*
backend/src/middlewares/validate.js
backend/src/utils/{slug,pagination}.js
backend/src/scripts/{seed,createIndexes}.js
shared/src/schemas/{moto,brand}.schema.js
shared/src/enums.js                  (MOTO_STATUS, FUEL, TRANSMISSION)
```

### Dependências
`mongoose`, `slugify`; dev: `supertest`, `mongodb-memory-server`

### Critérios de conclusão

Código e testes escritos para todos. Os marcados com **▶** dependem de um
MongoDB para serem *executados*, e o ambiente desta sessão não tem acesso a um
(ver relatório §11) — o teste existe e roda com `npm test` onde houver banco.

- [ ] ▶ Cluster Atlas criado, com usuário restrito a um database — **você**
- [x] Índices de §9.4 declarados no schema (6) e script `npm run db:indexes`
- [x] `npm run seed` escrito: 6 marcas e 22 motos, cobrindo os 4 status
- [x] CRUD completo implementado; ▶ execução contra banco
- [x] Cada filtro implementado e testado isoladamente e combinado ▶
- [x] Ordenação por preço, ano e km nas duas direções ▶
- [x] Paginação com teto de 48 imposto pelo servidor (testado sem banco)
- [x] Slug no formato esperado e colisão resolvida (testado sem banco)
- [x] Campo desconhecido → `422` (testado sem banco)
- [x] `?sort=<valor inválido>` → `422` (testado sem banco)
- [x] Projeção pública sem `licensePlate`, verificada por teste dedicado
- [x] `INACTIVE` fora do público — imposto no servidor, testado ▶
- [x] Teste de `explain()` escrito exigindo `IXSCAN` e ausência de `COLLSCAN` ▶
- [x] `GET /api/filtros` implementado com `$facet` e testado ▶

### Testes necessários
| Tipo | O que |
|---|---|
| Integração | CRUD de moto e marca; cada filtro; ordenações; paginação; 409 de marca em uso |
| **Segurança** | resposta pública nunca contém `licensePlate` (teste que falha se contiver — mitiga R-14); `INACTIVE` invisível no público; `$` e `.` rejeitados em chave de filtro |
| Unitário | slug e colisão; construção do filtro no repositório; validação Zod de cada schema |
| Performance | `explain()` confirmando uso de índice |

---

# FASE 3 — Autenticação + Admin ✅ concluída (verificação de banco pendente)

> Relatório: [`PHASE-3-REPORT.md`](./PHASE-3-REPORT.md)

### Objetivo
Fechar tudo que é administrativo e entregar o painel funcional de estoque.

### Funcionalidades
**Backend**
- Model `User` (`passwordHash` com `select: false`) e `RefreshToken` (TTL)
- Hash argon2id
- `POST /api/auth/login` com mensagem de erro idêntica nos três casos de falha
  e comparação em tempo constante (§7.2)
- `POST /api/auth/refresh` com rotação e **detecção de reuso** (revoga todas as
  sessões do usuário)
- `POST /api/auth/logout`, `GET /api/auth/me`
- `authenticate` (revalida usuário ativo) e `authorize(...roles)`
- Rate limit específico de login e refresh
- Todas as rotas `/api/admin/*` protegidas
- CRUD de usuários (`SUPER_ADMIN`), com proteção do último super admin
- `GET/PATCH /api/admin/store` (leitura ADMIN, escrita SUPER_ADMIN)
- Script `create:superadmin`

**Frontend**
- `/admin/login`
- Contexto de auth com access token **em memória**
- Interceptor: refresh único em `401`, requisições concorrentes compartilham a
  promessa
- `RequireAuth` / `RequireRole`
- `AdminLayout` com navegação
- `/admin/dashboard` (contadores), `/admin/motos` (lista, busca, filtro por
  status, alteração rápida de status), `/admin/motos/nova`,
  `/admin/motos/:id/editar` (sem imagens — FASE 8), `/admin/marcas`,
  `/admin/usuarios`, `/admin/configuracoes`
- Admin em **chunk lazy separado** do site público (P-08)

### Arquivos envolvidos
```
backend/src/modules/auth/*           (+ refreshToken.model.js)
backend/src/modules/users/*
backend/src/modules/store/*
backend/src/middlewares/{authenticate,authorize,rateLimiters}.js
backend/src/scripts/createSuperAdmin.js
frontend/src/features/auth/*         (useAuth, RequireAuth, RequireRole)
frontend/src/lib/api/interceptors.js (refresh)
frontend/src/components/layout/AdminLayout.jsx
frontend/src/pages/admin/*.jsx
frontend/src/app/router.jsx          (lazy do bloco admin)
shared/src/enums.js                  (USER_ROLE)
```

### Dependências
`jsonwebtoken`, `argon2`, `express-rate-limit`; frontend: `react-hook-form`,
`@hookform/resolvers`

### Critérios de conclusão
- [ ] `create:superadmin` cria o primeiro usuário; **nenhum** endpoint HTTP cria
      o primeiro admin; nenhuma credencial padrão embutida
- [ ] Login correto devolve access token + cookie `httpOnly Secure SameSite=Strict`
- [ ] E-mail inexistente e senha errada produzem **a mesma** resposta
- [ ] `/api/admin/*` sem token → `401`; com token de `ADMIN` em rota de
      `SUPER_ADMIN` → `403`
- [ ] Access token expirado → refresh transparente, usuário não percebe
- [ ] Reapresentar refresh revogado → todas as sessões do usuário caem
- [ ] Desativar um admin invalida seu acesso **imediatamente**
- [ ] 6ª tentativa de login em 15 min → `429`
- [ ] Último `SUPER_ADMIN` ativo não pode ser removido nem rebaixado
- [ ] `passwordHash` nunca aparece em nenhuma resposta
- [ ] Painel permite operar estoque e marcas de ponta a ponta
- [ ] `/admin` **não** está no bundle inicial do site público (verificado no build)

### Testes necessários
| Tipo | O que |
|---|---|
| Integração | login ok/falho; expiração; refresh com rotação; reuso de refresh; logout; matriz de papéis por rota |
| **Segurança** | 401/403 em todas as rotas admin; rate limit; ausência de `passwordHash`; sem *mass assignment* de `role`; proteção do último super admin |
| Unitário | hash/verify argon2; emissão e verificação de JWT; `authorize` |
| Componente | `RequireAuth` redireciona; formulário de login exibe erro |
| Manual | fluxo completo no painel |

---

# FASE 4 — Catálogo público ✅ concluída (verificação de banco pendente)

### Objetivo
Home e `/estoque` completos, responsivos e com identidade visual própria.

### Funcionalidades
**Home** (na ordem especificada): Header com logo, menu e botão WhatsApp · Hero
· Busca de motos · Motos em destaque · Últimas cadastradas · Ofertas ·
Benefícios da loja · Venda sua moto (chamada) · Financiamento (chamada) ·
Sobre a loja · CTA final · Footer com endereço, horários e redes

**`/estoque`**
- Filtros: marca, modelo/busca textual, preço mín/máx, ano, km, cilindrada,
  combustível, câmbio
- Ordenação: preço, ano, km, mais recentes
- **Filtros na URL** (`useSearchParams`) → compartilhável e navegável
- Paginação de servidor
- Estados de carregando (skeleton), vazio e erro
- Contador de resultados e chips de filtro ativo com remoção individual
- Mobile: filtros em painel deslizante

**Transversal**
- Componentes `ui/` (Button, Input, Select, Range, Badge, Card, Skeleton,
  Pagination, EmptyState)
- `MotoCard` com foto, marca, modelo, versão, ano, km, cilindrada e preço
- `PublicLayout`, `Header` responsivo, `Footer`, botão flutuante de WhatsApp
- `/sobre` e `/contato` com dados vindos de `GET /api/store`
- Mobile-first, validado em 360/768/1024/1440 px

### Arquivos envolvidos
```
frontend/src/components/ui/*
frontend/src/components/layout/{PublicLayout,Header,Footer,WhatsAppFloatingButton}.jsx
frontend/src/features/motos/{api,hooks}.js
frontend/src/features/motos/components/{MotoCard,MotoFilters,MotoGrid,SortSelect}.jsx
frontend/src/features/brands/{api,hooks}.js
frontend/src/features/store/{api,hooks}.js        contexto de configuração
frontend/src/pages/public/{Home,Estoque,Sobre,Contato}.jsx
frontend/src/lib/{format,whatsapp,image}.js
frontend/src/config/storeFallback.js
```

### Dependências
Nenhuma nova. (`@headlessui/react` **somente** se houver necessidade real de
acessibilidade no painel de filtros — a decidir aqui, não antes.)

### Critérios de conclusão
- [ ] Todas as 13 seções da home presentes e na ordem especificada
- [ ] Nenhum dado da loja hardcoded — tudo de `GET /api/store` (R-15)
- [ ] Todo filtro funciona, isolado e combinado, **via API**
- [ ] Filtros refletidos na URL; recarregar preserva o estado; voltar/avançar
      funciona
- [ ] Nenhuma requisição devolve o estoque inteiro (verificado na aba de rede)
- [ ] Paginação de servidor; nenhuma filtragem feita no cliente
- [ ] Skeleton durante o carregamento; estado vazio com ação de limpar filtros
- [ ] Layout íntegro em 360/768/1024/1440 px, sem scroll horizontal
- [ ] Botão WhatsApp abre conversa com mensagem pré-preenchida
- [ ] Identidade visual própria — nenhuma semelhança com o site de referência
- [ ] Navegação por teclado funcional; contraste AA nos textos

### Testes necessários
| Tipo | O que |
|---|---|
| Componente | `MotoCard` (inclusive sem imagem); `MotoFilters` emite os parâmetros certos; `Pagination` |
| Integração | página de catálogo com API mockada: filtro → requisição correta → grade renderizada |
| Unitário | `format.js` (BRL, km); `whatsapp.js` (montagem do link) |
| Manual | responsividade nos 4 breakpoints; navegação por teclado |

---

# FASE 5 — Página da moto ✅ concluída (verificação de banco pendente)

### Objetivo
Página de detalhe completa em `/motos/:slug` — a página que efetivamente vende.

### Funcionalidades
- Busca por slug; `404` dedicado para slug inexistente
- Galeria: imagem principal grande, miniaturas navegáveis, modal em tela cheia
  com teclado (setas, `Esc`) e gesto de arrastar no mobile
- Especificações: marca, modelo, versão, ano, km, preço, cilindrada,
  combustível, câmbio, cor
- Descrição e lista de opcionais
- Selo de status (Disponível / Reservada / Vendida) conforme decisão **A**
- CTA de WhatsApp com mensagem contextual (modelo, ano e link da moto)
- Botão "Tenho interesse" (abre formulário — enviado na FASE 6)
- Simulador de financiamento embutido (FASE 7)
- Bloco de motos similares
- Breadcrumb Home › Estoque › Moto
- Layout mobile: galeria no topo, preço e CTA fixos no rodapé (barra fixa)

### Arquivos envolvidos
```
frontend/src/pages/public/MotoDetalhe.jsx
frontend/src/features/motos/components/{MotoGallery,MotoSpecs,MotoFeatures,SimilarMotos,StatusBadge}.jsx
frontend/src/components/layout/Breadcrumbs.jsx
frontend/src/components/ui/{Modal,Tabs}.jsx
backend/src/modules/motos/*          endpoint /similares
```

### Dependências
Nenhuma nova.

### Critérios de conclusão
- [x] `/motos/honda-cb-500f-2024` carrega a moto correta
- [x] Slug inexistente → página 404 própria (não tela branca)
- [x] Moto `INACTIVE` não é acessível publicamente nem por URL direta
- [x] Galeria: miniaturas trocam a principal; modal abre, navega por teclado e
      fecha com `Esc`
- [x] Todos os campos especificados exibidos; ausentes são omitidos sem
      "undefined"
- [x] CTA de WhatsApp inclui modelo, ano e URL da moto na mensagem
- [x] Similares excluem a própria moto e respeitam o filtro de status público
- [x] Sem salto de layout no carregamento das imagens (CLS ≈ 0) — medido
      0,0006 no desktop com API simulada
- [x] Barra fixa de preço e CTA funcional no mobile

### Como ficou (diferenças em relação ao planejado)
- **"Tenho interesse" abre o WhatsApp**, não um formulário: o formulário só
  teria para onde enviar na FASE 6. Um formulário que não envia é pior que
  nenhum.
- **Simulador de financiamento** fica para a FASE 7, como previsto — nenhum
  espaço reservado na página até lá.
- **Moto vendida (decisão A):** selo "Vendida", CTA "Avise-me de uma similar"
  e **preço removido na API** (`serializePublicMotoDetail`), não só na tela.
- **`Tabs.jsx` não foi criado:** ficha, descrição e opcionais cabem em seções
  corridas, que no celular leem melhor que abas.
- Componentes em `components/moto/`, seguindo a organização que o projeto já
  usa (`components/catalogo/`), em vez de `features/motos/`.
- Testes de componente com `react-dom/server` (sem dependência nova); teclado
  e arraste testados como funções puras em `utils/galeria.js`.
- De brinde, dois saltos de layout do site todo corrigidos: cabeçalho que
  crescia quando o botão de WhatsApp chegava e fallback de carregamento que
  puxava o rodapé para o meio da tela.

### Testes necessários
| Tipo | O que |
|---|---|
| Componente | `MotoGallery` (teclado, miniaturas, 1 imagem, 0 imagem); `MotoSpecs` com campos ausentes |
| Integração | rota com slug válido e inválido; `/similares` |
| **Segurança** | slug de moto `INACTIVE` → 404 |
| Manual | galeria no mobile; leitura por leitor de tela |

---

# FASE 6 — Leads + WhatsApp ✅ concluída

### Objetivo
Converter visita em contato e dar à loja uma tela onde o lead não se perde.

### Funcionalidades
**Backend**
- Model `Lead` com discriminador (§5.3) e `consent` versionado
- `POST /api/leads` público, com união discriminada em Zod, honeypot e rate
  limit de 5/hora por IP
- Captura de origem (`page`, `referrer`, `utm`)
- `GET /api/admin/leads` com filtro por tipo, status e período, paginado
- `PATCH /api/admin/leads/:id` (status e anotações)
- `DELETE /api/admin/leads/:id` (`SUPER_ADMIN`, LGPD)

**Frontend**
- "Tenho interesse" na página da moto (vincula `motoId`)
- `/venda-sua-moto`: marca, modelo, ano, km, preço pretendido, estado, contato
- `/contato`: formulário + endereço + horários + mapa
- Checkbox de consentimento com link para a política
- Estados de enviando / sucesso / erro; proteção contra envio duplo
- `/admin/leads`: lista, filtros, detalhe, mudança de status, anotações,
  atalho de WhatsApp para o telefone do lead

### Arquivos envolvidos
```
backend/src/modules/leads/*
backend/src/middlewares/rateLimiters.js      limitador de lead
shared/src/schemas/lead.schema.js            união discriminada
shared/src/enums.js                          LEAD_TYPE, LEAD_STATUS
frontend/src/features/leads/components/{InterestForm,SellMotoForm,ContactForm,ConsentCheckbox}.jsx
frontend/src/features/leads/{api,hooks}.js
frontend/src/pages/public/{VendaSuaMoto,Contato}.jsx
frontend/src/pages/admin/Leads.jsx
```

### Dependências
Nenhuma nova (Zod e react-hook-form já presentes).

### Critérios de conclusão
- [x] Os 4 tipos de lead são criados e persistidos corretamente
- [x] Lead de interesse referencia a moto certa
- [x] Tipo inválido ou `data` incompatível com o tipo → `422`
- [x] 6º envio na mesma hora → `429`
- [x] Honeypot preenchido → descartado silenciosamente
- [x] `consent` gravado com data e versão do texto
- [x] `GET /api/admin/leads` exige autenticação (`401` sem token)
- [x] Exclusão de lead só por `SUPER_ADMIN`
- [x] Log de criação de lead **não** contém telefone nem e-mail (R-08)
- [x] Atalho de WhatsApp do painel abre a conversa com o lead
- [x] Clique duplo no envio não cria dois leads
- [x] Origem (`page`/`referrer`/`utm`) registrada

Verificado contra MongoDB real (imagem `mongo:7`) e, ponta a ponta, no
navegador com backend e banco reais: formulários, painel, `429` no 6º envio
e ausência de telefone, nome e e-mail no log.

### Como ficou (diferenças em relação ao planejado)
- **Formulário de financiamento** é da FASE 7, junto com o simulador. A API já
  aceita o tipo `FINANCING`.
- **Moto do financiamento** vai no campo `moto` do lead, não em `data.motoId`:
  uma referência só, populável na listagem (ARCHITECTURE §5.3 atualizada).
- **Envio repetido:** além da trava no formulário, o servidor devolve o lead
  existente quando o mesmo telefone manda o mesmo tipo (e a mesma moto) em
  até 2 minutos.
- **Moto vendida:** "Avise-me de uma similar" abre o mesmo formulário de
  interesse, vinculado à moto vendida (decisão A).
- **`/privacidade`** criada, porque o consentimento precisa apontar para uma
  política. Gerada da configuração da loja; o documento completo de
  conformidade continua na FASE 10. **Não promete prazo de retenção**: a
  decisão **E** estava pendente (depois decidida: até a loja excluir).
- **"Venda sua moto"** some (página, menu e chamada da home) quando o módulo
  está desligado nas Configurações.
- Painel inicial mostra quantos leads novos aguardam resposta.
- Componentes em `components/leads/`, seguindo a organização do projeto.
- Testes de componente: schemas dos formulários e a trava de clique duplo como
  funções puras; o comportamento na tela foi verificado no navegador.

### Testes necessários
| Tipo | O que |
|---|---|
| Integração | criação de cada tipo; validação por tipo; rate limit; honeypot; listagem com filtros; matriz de permissão da exclusão |
| **Segurança** | `/api/admin/leads` sem token → 401; ADMIN não exclui; ausência de PII no log |
| Componente | cada formulário: validação, envio, sucesso, erro, duplo clique |
| Unitário | normalização de telefone; construção do `data` por tipo |

---

# FASE 7 — Financiamento ✅ concluída

### Objetivo
Simulador claro e honesto, que gera lead qualificado sem prometer crédito.

### Funcionalidades
- Cálculo **puro no cliente** (função testável, sem endpoint — §6.4):
  entradas `valor`, `entrada`, `parcelas`; saída `parcela`, `total`, `juros`
- Tabela Price, com taxa e prazos configuráveis em `StoreSettings` (decisão F)
- Página `/financiamento`: simulador + explicação do processo + documentos
  necessários + FAQ
- Simulador embutido na página da moto, já com o preço preenchido
- **Aviso explícito**: "Simulação com valores aproximados. Não constitui
  proposta de crédito; sujeita a análise da instituição financeira." (R-07)
- Envio da simulação como lead `FINANCING` (opcional para o usuário)
- Sem coleta de CPF, renda ou qualquer dado de análise de crédito
- Faixas de entrada e parcelas validadas (entrada < valor; parcelas na lista
  permitida)

### Arquivos envolvidos
```
frontend/src/features/financing/{calculator.js,hooks.js}
frontend/src/features/financing/components/{FinancingSimulator,InstallmentTable,DisclaimerNote}.jsx
frontend/src/pages/public/Financiamento.jsx
frontend/src/pages/public/MotoDetalhe.jsx        integração
backend/src/modules/store/store.model.js         parâmetros de financiamento
shared/src/schemas/financing.schema.js
```

### Dependências
Nenhuma nova. **Sem** biblioteca financeira: tabela Price são poucas linhas e
manter o cálculo próprio o torna auditável e testável.

### Critérios de conclusão
- [x] Cálculo conferido contra valores de referência (erro < R$ 0,01)
- [x] Entrada ≥ valor da moto → erro claro, não `NaN` nem `Infinity`
- [x] Taxa zero tratada (divisão por zero na Price)
- [x] Taxa e prazos vêm de `StoreSettings`, **não** de constante no código
- [x] Aviso legal visível em toda superfície de simulação
- [x] Simulador na página da moto já vem com o preço preenchido
- [x] Envio gera lead `FINANCING` com os parâmetros simulados
- [x] Nenhum dado de análise de crédito é coletado
- [x] Funcional e legível no mobile

Valores de referência calculados de forma independente (Python, `Decimal`).
Verificado ponta a ponta com backend e MongoDB reais: configuração pelo
painel, simulação, envio e lead no painel.

### Como ficou (diferenças em relação ao planejado)
- **Cálculo no pacote compartilhado** (`shared/src/financing.js`), não só no
  cliente: o site simula e o **servidor refaz a conta** ao receber o lead, com
  a taxa configurada. A parcela e a taxa gravadas no lead são as do servidor,
  e o prazo e a entrada mínima são conferidos contra as regras da loja.
- **Sem taxa padrão no código.** Enquanto a loja não configura taxa e prazos,
  o simulador não aparece: `/financiamento` explica o processo e oferece o
  contato, e a página da moto não mostra a seção.
- Parâmetros editados na seção **Financiamento** das Configurações: taxa
  (% a.m.), entrada mínima (%) e prazos oferecidos (6x a 72x).
- Moto vendida não tem simulador (não tem preço público, decisão A).
- Tabela de prazos no próprio simulador: a parcela de cada prazo oferecido,
  clicável.
- A configuração pública tem cache de 5 minutos (FASE 4): depois de salvar,
  o próprio navegador do lojista pode levar esse tempo para ver a mudança.
- Corrigido de passagem: em 360px, a barra fixa da página da moto cortava o
  preço.

### Testes necessários
| Tipo | O que |
|---|---|
| **Unitário (crítico)** | `calculator.js`: casos de referência, taxa zero, entrada = valor, entrada > valor, 1 parcela, parcela máxima, arredondamento |
| Componente | simulador recalcula ao mudar entrada; exibe erro de validação; aviso presente |
| Integração | envio gera lead `FINANCING` com `data` correto |

---

# FASE 8 — Upload e gestão de imagens ✅ concluída (teste com conta Cloudinary real pendente)

### Objetivo
Loja consegue subir, ordenar e escolher fotos pelo painel, com entrega
otimizada.

### Funcionalidades
**Backend**
- `storage.port.js` + `cloudinary.provider.js` + seletor por env (§10.3)
- `POST /api/admin/uploads/assinatura` — assinatura escopada (pasta, formatos,
  tamanho máximo), só para ADMIN autenticado
- `POST /api/admin/motos/:id/imagens` — **revalida** os metadados e confere o
  prefixo da pasta (não confia no cliente)
- `PATCH .../imagens/ordem` — reordena e define a principal
- `DELETE .../imagens/:imageId` — remove metadado + `destroy` no provedor, com
  falha do provedor logada e não bloqueante
- Limite de 20 imagens por moto

**Frontend**
- Upload direto do navegador para o provedor (§10.4), com progresso por arquivo
- Arrastar-e-soltar, múltiplos arquivos, pré-visualização
- Reordenar arrastando; marcar a principal; excluir com confirmação
- Campo `alt` por imagem (acessibilidade e SEO)
- `image.js`: `srcset`/`sizes` por contexto, `f_auto`, `q_auto`
- `loading="lazy"` em tudo, exceto LCP com `fetchpriority="high"`
- Placeholder para moto sem foto

### Arquivos envolvidos
```
backend/src/infra/storage/{storage.port,cloudinary.provider,index}.js
backend/src/modules/uploads/*
backend/src/modules/motos/{moto.service,moto.controller,moto.routes,moto.schema}.js
frontend/src/features/motos/components/{ImageUploader,ImageManager,ImageSortable}.jsx
frontend/src/lib/image.js
frontend/src/pages/admin/MotoForm.jsx
```

### Dependências
Backend: `cloudinary`. Frontend: nenhuma (`dnd` nativo de HTML5; biblioteca de
arrastar-e-soltar só se a necessidade se confirmar).

### Critérios de conclusão
- [x] Upload de 10 fotos de ~4 MB conclui sem passar pela API *(provedor
      simulado; maior corpo enviado à API: 192 bytes)*
- [x] `body limit` da API segue em 100 kB (§8.1) — confirma o fluxo direto
- [x] Assinatura exige autenticação de ADMIN (`401` anônimo)
- [x] Assinatura escopada: formato/pasta fora do permitido é recusado pelo
      provedor; tamanho, pelo navegador e pelo servidor ao vincular (ver §10.4)
- [x] Backend rejeita metadado com `public_id` fora da pasta esperada
- [x] Reordenar persiste; imagem principal reflete no card *(OG é da FASE 9)*
- [x] Excluir imagem remove metadado **e** pede a exclusão no provedor
- [x] Falha do provedor na exclusão não derruba a operação (e é logada)
- [x] 21ª imagem recusada
- [x] URLs de entrega com `f_auto`/`q_auto` e `srcset` por contexto
      *(o formato efetivamente entregue depende da conta real)*
- [x] `width`/`height` presentes; sem salto de layout
- [x] Nenhum import de `cloudinary` fora de `cloudinary.provider.js`

**Pendente — teste manual com conta real:** este ambiente não alcança o
Cloudinary e não há credenciais. O fluxo foi verificado de ponta a ponta com
o provedor **simulado** no navegador (respostas assinadas com o segredo, como
o Cloudinary faz). Falta, com uma conta real (docs/SETUP.md §4.1): enviar 10
fotos, conferir no painel do Cloudinary a pasta e a exclusão, e ver na aba de
rede o formato entregue (AVIF/WebP).

### Como ficou (diferenças em relação ao planejado)
- **Prova do upload por assinatura:** o backend confere a assinatura que o
  Cloudinary põe na resposta e **monta a URL ele mesmo**; a URL vinda do
  navegador nem é aceita.
- **Brecha fechada:** o cadastro e a edição da moto aceitavam `images` com
  qualquer URL, sem verificação. Agora as fotos só entram pelas rotas de
  imagem.
- Limite de 20 conferido na própria escrita (sem corrida entre envios).
- `PATCH .../imagens/:imageId` para o texto alternativo, além de ordem e
  exclusão.
- Moto nova: depois de salvar, o painel segue para a edição, onde ficam as
  fotos (o envio precisa do id da moto para escopar a pasta).
- Reordenar tem botões ← → além do arrastar (teclado e toque).
- Sem provedor configurado (`STORAGE_PROVIDER=none`), o site funciona e só o
  envio responde 503 com a instrução.
- Componentes em `components/admin/fotos/`; entrega otimizada em
  `utils/imagem.js`.

### Testes necessários
| Tipo | O que |
|---|---|
| Integração | assinatura (autorizado/anônimo); vínculo com metadado válido e inválido; ordem; exclusão; limite de 20 |
| **Segurança** | assinatura sem auth → 401; `public_id` fora da pasta → 422; escopo da assinatura |
| Unitário | `image.js` monta `srcset` correto; provedor cumpre o contrato da porta |
| Manual | upload real de 10 fotos; reordenação; verificação do formato entregue |

---

# FASE 9 — SEO + performance ✅ concluída (verificações manuais pendentes)

### Objetivo
Resolver **R-01** (preview de link) e atingir o orçamento de performance de
§12.1. Fase de maior impacto comercial.

### Funcionalidades
**SEO**
- `metaInjector.js` no servidor (§11.3): `title`, `description`, OG, Twitter
  Card e canonical preenchidos **no HTML inicial**, por rota, com cache de 5 min
- `Seo.jsx` no cliente para navegação SPA (mantém os metadados coerentes após
  troca de rota)
- JSON-LD: `Vehicle`+`Offer` (detalhe), `AutoDealer` (home),
  `BreadcrumbList`
- `sitemap.xml` dinâmico com `lastmod`
- `robots.txt` por ambiente (`Disallow: /` em staging)
- `noindex, follow` em catálogo filtrado; canonical em todas as páginas
- `availability` derivada do `status`; comportamento de moto vendida conforme
  decisão A
- `<html lang="pt-BR">`

**Performance**
- Code splitting por rota; admin fora do bundle público (verificado)
- Análise do bundle e remoção do que não se justifica
- `Cache-Control` conforme §12.4
- Fontes com `swap`, subset e `preconnect`
- Revisão de re-render com o React DevTools Profiler (onde houver custo medido)
- Prefetch da rota de detalhe ao passar o mouse no card

### Arquivos envolvidos
```
backend/src/seo/{metaInjector,sitemap.controller}.js
backend/src/app.js                     servir index.html + estáticos + rotas SEO
frontend/src/lib/seo/{Seo.jsx,jsonld.js}
frontend/public/robots.txt
frontend/index.html                    placeholders de meta
frontend/vite.config.js                chunks manuais
frontend/src/app/router.jsx            lazy + prefetch
```

### Dependências
Nenhuma para meta no servidor (substituição de string). No cliente, ou
`react-helmet-async`, ou um hook próprio de ~30 linhas — a decidir aqui,
preferindo o hook próprio se for suficiente.

### Critérios de conclusão
- [x] `curl` de `/motos/<slug>` (**sem JS**) retorna HTML **com** `title`,
      `description` e `og:image` corretos ← *resolve R-01*
- [ ] Preview validado no depurador de links do Facebook e em um envio real de
      WhatsApp *(manual: exige o site num endereço público — FASE 12)*
- [x] `sitemap.xml` lista as páginas estáticas e todas as motos indexáveis, com
      `lastmod`
- [x] `robots.txt` bloqueia `/admin` e `/api` e aponta o sitemap
- [x] Staging com `Disallow: /` (`ROBOTS_POLICY=disallow`)
- [ ] JSON-LD sem erro no Rich Results Test do Google *(manual, com endereço
      público; a estrutura é coberta por testes)*
- [x] Catálogo filtrado com `noindex`; canonical correto em todas as páginas
- [x] Lighthouse mobile ≥ 90 em Performance, e 100 em SEO e Best Practices
      *(ver medições; a moto com foto pesada sem otimização fica em 84)*
- [x] LCP < 2,5 s · CLS < 0,1 · INP < 200 ms (4G) — resolvido depois da
      fase com **renderização no servidor**: LCP 1,5–1,6 s nas três páginas
      com o 4G aplicado de verdade (era 2,4–3,4 s); ver "Depois da fase" abaixo
- [x] JS inicial do site público < 180 kB gzip (**138 kB**)
- [x] `/admin` ausente do bundle inicial público
- [x] Meta correta após navegação SPA (não só no carregamento inicial)

**Medições** (Lighthouse 12, mobile, 4G simulado, backend servindo o build
de produção com MongoDB real; mediana de 3 execuções):

| Página | Perf. | SEO | Boas práticas | LCP | CLS | TBT |
|---|---|---|---|---|---|---|
| `/` | 97 | 100 | 100 | 2,12 s | 0,001 | 84 ms |
| `/estoque` | 95 | 100 | 100 | 2,53 s | 0 | 68 ms |
| `/motos/…` (sem foto) | 95 | 100 | 100 | 2,65 s | 0 | 53 ms |
| `/motos/…` (foto de 314 kB **sem** otimização) | 84 | 100 | 100 | 4,22 s | 0 | 63 ms |

A última linha é um pior caso artificial: este ambiente não alcança o
Cloudinary, então a foto foi servida crua. Com o provedor real, o celular
baixaria a versão de 640 px em AVIF/WebP (~50 kB), e o LCP tende ao da linha
sem foto. INP não é medido pelo Lighthouse de navegação; TBT é o indicador
disponível.

**Depois da fase — renderização no servidor** (decisão do dono: "quanto menos
tempo melhor"). O piso do SPA era o próprio JS: nada aparecia antes de ~140 kB
baixarem e executarem. Agora o servidor manda a página pronta (ARCHITECTURE
§11.3) e o JS só liga a interatividade.

Medido com o Lighthouse aplicando o 4G e a CPU lenta de verdade
(`--throttling-method=devtools`), mesmo banco, sem foto; duas rodadas:

| Página | LCP antes (SPA) | LCP depois (servidor) | TTI antes → depois |
|---|---|---|---|
| `/` | 2,4 s | **1,6 s** | 2,4 → 2,4 s |
| `/motos/…` | 2,7–3,4 s | **1,5–1,6 s** | 2,5 → 3,0 s |
| `/estoque` | 2,7 s | **1,5 s** | 2,4 → 2,9 s |

O custo aparece no TTI: com o JS em prioridade baixa, os botões passam a
responder ~0,5 s mais tarde nas páginas pesadas — mas o conteúdo aparece
~1 s antes, e os links funcionam desde o primeiro instante.

No modo **simulado** do Lighthouse (o padrão, usado na tabela acima desta
seção), o ganho quase não aparece: LCP 2,3–2,6 s, Performance 97–98. O
simulador parte da execução local, onde o JS termina de baixar antes da
primeira pintura, e o conta como se bloqueasse a tela — o que não acontece
num celular de verdade, onde o HTML chega muito antes do JS.

### Como ficou (diferenças em relação ao planejado)
- **Fonte única de metadados** (`shared/src/seo.js`) para servidor e cliente;
  hook próprio (`useSeo`), sem `react-helmet-async`.
- **Dados de partida no HTML** (loja e moto) e pré-anúncio do código da página
  e da foto principal — cortou a ida à API antes da primeira pintura. O CLS
  da home caiu de 0,079 para 0,001 (o slogan chegava depois).
- **Fontes no próprio domínio** (`@fontsource`, dependência nova): o CSS do
  Google bloqueava a pintura por 780 ms e enviava o IP do visitante ao Google.
- **`zod` fora do caminho crítico**: `sideEffects: false` no pacote
  compartilhado, schemas em arquivos próprios e formulário/simulador da
  página da moto carregados sob demanda. JS inicial: 157 → 138 kB.
- **Sessão só no painel**: o site público renovava a sessão a cada visita
  (401 no console de todo visitante). Agora a renovação só ocorre nas rotas
  do painel.
- **CSP própria e CORS de mesma origem**, necessários para o site e a API no
  mesmo processo.
- Páginas de módulo desligado e motos inexistentes respondem 404 de verdade.
- Revisão de re-render com o Profiler: não havia custo medido (TBT < 90 ms),
  então nada foi memoizado.

### Testes necessários
| Tipo | O que |
|---|---|
| **Integração (crítico)** | requisição sem JS a cada tipo de rota → meta esperada no HTML; `sitemap.xml` válido; `robots.txt` por ambiente |
| Unitário | `metaInjector` casa rotas e escapa HTML nos valores injetados; `jsonld.js` gera estrutura válida |
| Performance | Lighthouse CI com orçamento; análise do bundle |
| Manual | depurador de links do Facebook; WhatsApp real; Rich Results Test |

> **Atenção de segurança:** todo valor injetado no HTML (modelo, descrição)
> precisa ser escapado — injetar texto do banco sem escape é XSS. Coberto por
> teste unitário explícito.

---

# FASE 10 — Segurança ✅ concluída (rotação de segredos no go-live pendente)

### Objetivo
Auditar e endurecer o que foi construído. Não é a introdução de segurança — é a
verificação de que tudo previsto em §8 está de fato em pé.

### Funcionalidades
- Auditoria de cabeçalhos: CSP definitiva (sem `unsafe-inline` no script),
  HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`
- Revisão de CORS com a lista real de origens de produção
- Revisão de todos os rate limits com números reais de tráfego
- Varredura de campos sensíveis em **todas** as respostas públicas
- Revisão de permissões rota por rota (matriz completa)
- `npm audit` e atualização de dependências vulneráveis
- Verificação de que nenhum segredo está versionado (varredura no histórico)
- Confirmação de ausência de stack trace e detalhe interno em produção
- Revisão da redaction dos logs
- Rotação de todos os segredos antes do go-live
- Checklist OWASP Top 10 aplicado ao projeto
- Documento de conformidade LGPD: base legal, retenção (decisão E), fluxo de
  eliminação e acesso
- Conferência do fluxo de upload: escopo da assinatura e revalidação

### Arquivos envolvidos
```
backend/src/app.js                        trust proxy configurável, Permissions-Policy, limite nas páginas
backend/src/config/security.js            CSP, HSTS, frame, referrer e Permissions-Policy
backend/src/config/env.js                 FRONTEND_URL validado, TRUST_PROXY_HOPS
backend/src/config/logger.js              redaction ampliada (tabela exportada e testada)
backend/src/middlewares/rateLimiters.js   tabela única RATE_LIMITS
backend/src/middlewares/authorize.js      papéis expostos para a matriz de testes
backend/src/routes/index.js               ADMIN_ROUTERS (fonte da matriz de permissões)
backend/src/modules/auth/auth.routes.js   limite de login por IP
backend/tests/**                          8 arquivos de teste de segurança
docs/SECURITY.md                          estado verificado, OWASP, LGPD, go-live (novo)
.env.example · docs/SETUP.md              TRUST_PROXY_HOPS
```

### Dependências
Nenhuma nova. Ferramentas de auditoria são de linha de comando.

### Critérios de conclusão
- [x] CSP ativa e sem `unsafe-inline` em `script-src`; site funciona com ela
- [x] HSTS ativo em produção
- [x] CORS restrito às origens reais; `*` ausente *(o boot recusa `*`; o
      domínio real entra em `FRONTEND_URL` no deploy)*
- [x] Nenhuma resposta pública contém `licensePlate`, `passwordHash`, `_id` cru
      ou `__v` (teste automatizado)
- [x] Matriz de permissões verificada: toda rota admin recusa anônimo e papel
      insuficiente
- [x] `npm audit` sem vulnerabilidade alta ou crítica *(zero, de qualquer
      nível)*
- [x] Nenhum segredo no histórico do git (varredura executada)
- [x] Produção: sem stack trace, sem nome de coleção, sem versão de dependência
      nas respostas
- [x] Logs sem senha, token, cookie ou PII de lead
- [ ] Segredos rotacionados antes do go-live *(depende do ambiente de
      produção — checklist em SECURITY §9, executado na FASE 12)*
- [x] `docs/SECURITY.md` publicado
- [x] Checklist OWASP Top 10 revisado item a item

### O que a auditoria encontrou e corrigiu
- **Credential stuffing no login:** o limite era por IP + e-mail, então um IP
  podia testar a mesma senha em e-mails ilimitados. Novo limite só por IP
  (20 / 15 min), somado ao anterior.
- **`trust proxy` fixo em 1:** atrás de Cloudflare + Render todos os
  visitantes ficariam com o IP do Cloudflare (e se bloqueariam entre si); sem
  proxy, qualquer um forjaria o `X-Forwarded-For` e escaparia dos limites.
  Agora é `TRUST_PROXY_HOPS`, por ambiente.
- **Páginas HTML sem limite:** cada página de moto consulta o banco; pedir
  slugs aleatórios em massa era uma sobrecarga barata. Limite de 600 / 15 min
  nas páginas, sitemap e robots.
- **API pública em 300 / 15 min** bloquearia clientes de operadora móvel
  atrás do mesmo IP (CGNAT) antes de robôs: subiu para 900.
- **`FRONTEND_URL` aceitava qualquer texto**, inclusive `*`: agora o boot
  recusa o que não for origem.
- **Cabeçalhos:** faltava `Permissions-Policy`; `X-Frame-Options` passou de
  `SAMEORIGIN` a `DENY`; HSTS passou de 1 a 2 anos e só é enviado em produção
  (em desenvolvimento prendia o `localhost` em HTTPS).
- **Redaction dos logs** estava correta, mas sem teste: agora a tabela é
  exportada e um teste confere, com um logger real, que senha, token, cookie,
  telefone e e-mail somem.
- Conferido e **sem problema**: enumeração de usuário por tempo de resposta no
  login (29 × 28 ms), cookie de sessão, CORS com origem não listada, XSS
  armazenado (site e painel), injeção NoSQL, escopo e revalidação do upload.

### Pendências
- **Rotação dos segredos** (`JWT_SECRET`, usuário do MongoDB, chave do
  Cloudinary, senha do primeiro `SUPER_ADMIN`): só faz sentido no ambiente de
  produção — checklist em [SECURITY §9](./SECURITY.md#9-checklist-de-go-live).
- ~~**Decisão E (retenção de leads)**~~ — **decidida** depois da fase: o lead
  fica guardado até a loja excluir, com exclusão em lote no painel
  ([SECURITY §10.4](./SECURITY.md#104-retenção--decisão-e)).
- **Rate limits com tráfego real:** os números são do uso esperado; revisar
  depois das primeiras semanas no ar.

### Testes necessários
| Tipo | O que |
|---|---|
| **Segurança automatizada** | varredura de campo sensível em toda resposta pública; matriz de autorização completa; rate limit de cada rota limitada |
| Integração | CSP não quebra a aplicação; CORS recusa origem não listada |
| Manual | tentativa de injeção NoSQL; XSS armazenado em descrição e em lead; IDOR por troca de id; enumeração de usuário no login |
| Ferramentas | `npm audit`; análise de cabeçalhos; varredura de segredo no histórico |

---

# FASE 11 — Testes ✅ concluída (bloqueio de merge depende de configuração no GitHub)

### Objetivo
Rede de segurança que permita evoluir o produto e personalizá-lo por cliente
sem medo de regressão. É o que diferencia um produto base de um projeto único.

### Funcionalidades
- Vitest configurado nos três workspaces
- `mongodb-memory-server` para integração sem depender do Atlas
- Fábricas de dados de teste (moto, marca, usuário, lead)
- **Unitários:** cálculo de financiamento, slug, formatadores, construção de
  filtro, validação Zod de cada schema, hash de senha, JWT, `metaInjector`
- **Integração (API):** todo endpoint no caminho feliz e de falha, autorização por
  papel, validação, paginação, rate limit
- **Componentes:** `MotoCard`, `MotoFilters`, `MotoGallery`, formulários,
  `RequireAuth`
- **E2E** dos fluxos que sustentam o negócio:
  1. Visitante filtra o catálogo → abre a moto → envia interesse
  2. Admin faz login → cadastra moto com fotos → ela aparece no site
  3. Admin altera status → moto sai do catálogo público
  4. Visitante simula financiamento → envia lead
  5. Visitante envia "venda sua moto" → lead aparece no painel
- **Testes de regressão de segurança** (das FASES 2/3/6/8/10) no mesmo conjunto
- CI executando tudo a cada push
- Cobertura mínima de 70% global e **90%** em serviços e no cálculo de
  financiamento

### Arquivos envolvidos
```
shared/{vitest.config.js,tests/**}          testes do pacote compartilhado (movidos do backend)
backend/tests/{unit,integration}/**          + endpoints.test.js, invalidateSiteCache.test.js
backend/tests/factories/index.js             fábricas: marca, moto, lead, loja, usuário
backend/tests/globalSetup.js                 TEST_MONGODB_URI; na CI, sem banco = falha
frontend/src/**/*.test.jsx                   componentes e telas (Testing Library + jsdom)
frontend/src/test/{setup.js,renderizar.jsx}  provedores da aplicação para os testes
e2e/**                                       5 fluxos, servidor e dados do E2E
playwright.config.js
.github/workflows/ci.yml
*/vitest.config.js, frontend/vite.config.js  cobertura com limites
```

### Dependências
`@vitest/coverage-v8`, `@testing-library/react`, `@testing-library/user-event`,
`jsdom` (o ambiente de navegador dos testes de componente — sem ele não há
DOM no Node) e `@playwright/test` fixado em 1.56.1, a versão do Chromium já
instalado no ambiente. `vitest` passou a ser dependência também do `shared`.
`npm audit`: zero vulnerabilidades.

### Critérios de conclusão
- [x] `npm test` na raiz roda tudo e passa *(unitários, integração,
      componentes e segurança dos três workspaces; o E2E é
      `npm run test:e2e`, porque exige o build e um navegador)*
- [x] Cobertura ≥ 70% global e ≥ 90% em serviços e no simulador *(limites
      configurados — a suíte falha abaixo deles)*
- [x] Todo endpoint tem teste de caminho feliz e de falha *(os 41, conferidos
      um a um)*
- [x] Toda rota admin tem teste de autorização *(matriz descoberta das
      próprias rotas, desde a FASE 10)*
- [x] Os 5 fluxos E2E passam
- [x] Testes de regressão de segurança no conjunto principal
- [ ] CI verde, com bloqueio de merge em caso de falha — **o workflow está
      pronto; a primeira execução acontece no GitHub com este push, e o
      bloqueio de merge é uma regra do repositório que só o dono ativa**
      (Settings → Branches → regra para `main` exigindo os checks
      "Lint, formato, testes com cobertura e build" e "E2E (Playwright)")
- [x] Suíte completa em menos de 5 min *(~1 min os testes; ~15 s o E2E)*
- [x] Nenhum teste depende do Atlas nem de rede externa *(MongoDB local ou
      em memória; Cloudinary simulado)*

### Resultados

| Pacote | Testes | Linhas | Funções | Ramos |
|---|---|---|---|---|
| shared | 54 | 92,7% | 88,9% | 76,7% |
| backend | 564 | 96,5% | 96,9% | 84,0% |
| frontend | 324 | 91,2% | 82,5% | 81,8% |
| E2E | 5 fluxos | — | — | — |

Serviços do backend ≥ 90% (linhas, funções e comandos) e ≥ 80% em ramos;
`shared/src/financing.js` e `frontend/src/utils/simulador.js` ≥ 90% em tudo.

**E2E** (`e2e/`), contra o build de produção servido pelo backend, num banco
só dele:
1. Visitante filtra o estoque → abre a moto → envia interesse (conferido no
   painel: vinculado à moto, com a página de origem).
2. Admin entra → cadastra moto → envia duas fotos → a moto aparece no
   estoque e na página, com as fotos. O "Cloudinary" é simulado no navegador
   e confere a assinatura emitida pelo servidor.
3. Admin marca a moto como vendida → ela sai do estoque; a página segue no
   ar como vendida, sem preço.
4. Visitante simula o financiamento → envia → a parcela recalculada pelo
   servidor bate com a da tela.
5. Visitante envia "venda sua moto" → o lead aparece no painel com os dados
   da moto.

### O que os testes encontraram e foi corrigido
- **Página pública desatualizada por até 5 minutos** depois de uma mudança
  no painel (a moto vendida aparecia disponível, com preço). Com a página
  renderizada no servidor a partir do cache, o efeito ficou visível. Toda
  alteração bem-sucedida no painel agora apaga o cache do site.
- **Clique antes da hidratação se perdia** num filtro do estoque. A
  hidratação agora começa assim que o JS roda (o atraso de um quadro não
  melhorava nenhuma medida), e `<html data-pronto>` marca a página
  interativa.
- **Painel inicial dizia que fotos e leads "entram nas próximas fases"** —
  existiam desde as FASES 6 e 8. Virou um atalho para os leads.
- Quatro endpoints só tinham teste de acesso, não de comportamento (loja no
  painel, leitura de marca, usuário e lead por id): cobertos.
- Na CI, testes de banco sem banco agora **falham** em vez de serem pulados.

### Testes necessários
Esta fase **é** os testes. A verificação é a própria suíte verde, com a
cobertura atingida e o tempo de execução dentro do limite.

---

# FASE 12 — Deploy

### Objetivo
Colocar em produção, com CI/CD, backup e monitoramento — pronto para
demonstração comercial.

### Funcionalidades
- Provisionamento conforme §13.2 (decisão C)
- Atlas de produção em **M10** (backup contínuo — R-04), usuário restrito
- Cloudinary com pastas por ambiente
- Cloudflare: DNS, TLS, cache de assets, WAF básico
- Variáveis de ambiente no painel do provedor (nunca no repositório)
- Build: frontend → `dist`, servido pelo backend com meta injection
- CI/CD: push → lint → test → build → deploy
- Índices por script explícito; `autoIndex` desligado
- Health check em `/api/health` com troca de tráfego condicionada
- Monitoramento de erro (Sentry ou equivalente) e uptime
- Rotina de backup verificada com **restauração de teste**
- Domínio e HTTPS configurados (decisão D)
- Seed da loja fictícia em produção para demonstração
- Rollback documentado e testado

### Arquivos envolvidos
```
.github/workflows/{ci,deploy}.yml
backend/package.json                   scripts de start e migração
backend/src/app.js                     servir estáticos em produção
docs/DEPLOYMENT.md                     runbook (novo)
.env.example                           conjunto final de variáveis
```

### Dependências
`@sentry/node` (ou equivalente) — justificativa: sem captura de erro em
produção, falha de cliente só se descobre por reclamação.

### Critérios de conclusão
- [ ] Site público acessível por HTTPS no domínio definitivo
- [ ] Painel admin acessível e funcional em produção
- [ ] Push na branch principal → deploy automático após CI verde
- [ ] Health check bloqueia deploy defeituoso
- [ ] Atlas M10 com backup contínuo ativo
- [ ] **Restauração de backup testada com sucesso** (backup não testado não é
      backup)
- [ ] Índices criados em produção e verificados
- [ ] Nenhuma variável sensível no repositório
- [ ] Monitoramento de erro recebendo eventos; alerta configurado
- [ ] Rollback executado com sucesso em teste
- [ ] Loja de demonstração populada e apresentável
- [ ] Staging com `Disallow: /` confirmado
- [ ] `docs/DEPLOYMENT.md` permite a outra pessoa operar o sistema

### Testes necessários
| Tipo | O que |
|---|---|
| Fumaça em produção | home, catálogo, detalhe, formulário, login admin, CRUD |
| Integração | health check; `sitemap.xml` e `robots.txt` em produção; preview de OG no domínio real |
| Operacional | restauração de backup; rollback; falha proposital de CI bloqueando deploy |
| Performance | Lighthouse **no domínio de produção** (não só local) |

---

# FASE 13 — Auditoria final

### Objetivo
Confirmar que a plataforma é um **produto base revendável**, não um site único —
e entregar documentação que permita personalizá-la para o próximo cliente.

### Funcionalidades
- Revisão de requisitos: cada item do briefing conferido como entregue,
  adiado (com motivo) ou descartado (com justificativa)
- **Teste de revenda:** configurar uma segunda loja fictícia (outro nome, logo,
  cores, WhatsApp, endereço) **sem alterar código** — a prova de R-15
- Varredura por valor de loja hardcoded no código
- Revisão de qualidade: código morto, `TODO` pendente, inconsistência de padrão
- Revisão da consistência do envelope em **todos** os endpoints
- Revisão de acessibilidade (contraste, foco, rótulos, teclado, leitor de tela)
- Revisão de responsividade em dispositivo real
- Reexecução da auditoria de segurança da FASE 10
- Documentação final:
  - `README.md` — visão geral, instalação, scripts
  - `docs/CUSTOMIZATION.md` — como personalizar para um novo cliente
  - `docs/API.md` — referência de endpoints
  - `docs/ARCHITECTURE.md` — atualizado com o que foi construído de fato
  - `docs/DEPLOYMENT.md`, `docs/SECURITY.md`
- Registro do débito técnico conhecido e do backlog pós-lançamento

### Arquivos envolvidos
```
README.md
docs/{ARCHITECTURE,ROADMAP,CUSTOMIZATION,API,DEPLOYMENT,SECURITY}.md
docs/TECHNICAL-DEBT.md                 (novo)
todo o código                          revisão
```

### Dependências
Nenhuma.

### Critérios de conclusão
- [ ] Todo requisito do briefing classificado como entregue / adiado /
      descartado, com justificativa
- [ ] **Segunda loja fictícia configurada sem tocar em código** — critério
      central do produto base
- [ ] Varredura confirma zero dado de loja hardcoded
- [ ] Envelope de resposta consistente em todos os endpoints
- [ ] Acessibilidade: contraste AA, navegação por teclado completa, foco
      visível, rótulos em todos os campos
- [ ] Responsividade validada em dispositivo real (não só emulador)
- [ ] Auditoria de segurança reexecutada, sem pendência
- [ ] Testes verdes; cobertura mantida
- [ ] Lighthouse mantido ≥ 90 em produção
- [ ] `docs/CUSTOMIZATION.md` permite a um terceiro personalizar a plataforma
- [ ] `docs/TECHNICAL-DEBT.md` com o que ficou para depois e o porquê
- [ ] Nenhum `console.log` ou `TODO` esquecido em produção

### Testes necessários
| Tipo | O que |
|---|---|
| Regressão completa | suíte inteira (unit, integração, E2E) |
| Aceitação | percorrer o briefing item a item contra o sistema em produção |
| **Revenda** | criar a segunda loja só por configuração |
| Acessibilidade | axe DevTools + navegação por teclado + leitor de tela |
| Manual | dispositivos reais: Android e iOS, tablet, desktop |

---

## Resumo de dependências por fase

| Fase | Novas dependências |
|---|---|
| 1 | express, zod, helmet, cors, compression, cookie-parser, pino, pino-http, react, react-dom, react-router-dom, axios, @tanstack/react-query, vite, @vitejs/plugin-react, tailwindcss, postcss, autoprefixer, eslint, prettier, vitest |
| 2 | mongoose, slugify, supertest, mongodb-memory-server |
| 3 | jsonwebtoken, argon2, express-rate-limit, react-hook-form, @hookform/resolvers |
| 4 | — (`@headlessui/react` só se justificado) |
| 5 | — |
| 6 | — |
| 7 | — |
| 8 | cloudinary |
| 9 | — (ou `react-helmet-async`, se o hook próprio não bastar) |
| 10 | — |
| 11 | @testing-library/react, @testing-library/user-event, @vitest/coverage-v8, @playwright/test |
| 12 | @sentry/node (ou equivalente) |
| 13 | — |

Nenhuma dependência entra sem justificativa registrada.

---

## O que este roadmap deliberadamente **não** inclui

Itens fora do briefing, registrados para não entrarem por dentro do escopo
(R-16). Cada um pode virar uma fase futura, com sua aprovação:

- Multi-tenancy real (a arquitetura está preparada — §14.3 — mas não é
  implementada)
- Área de cliente / conta para o comprador
- Pagamento ou reserva on-line
- Avaliação automática de moto na troca
- Comparador de motos
- Chat ao vivo ou chatbot
- Integração com portais de anúncio (Webmotors, OLX, iCarros)
- E-mail transacional e notificação de novo lead
- Blog ou área de conteúdo
- Aplicativo móvel
- Relatórios e BI avançados no painel
- Internacionalização

---

## Situação atual

**FASES 0 a 11 concluídas.** Backend com catálogo, autenticação, painel
administrativo e leads; site público com home, estoque filtrável, página da
moto (galeria, ficha, similares, interesse, simulador), financiamento, venda
sua moto, sobre, contato e privacidade; fotos das motos com envio direto ao
provedor; SEO com meta, dados estruturados e sitemap no HTML inicial. A FASE 8
aguarda o teste manual com uma conta Cloudinary real; a FASE 9, a validação de
preview com endereço público. As páginas públicas são renderizadas no
servidor (LCP 1,5–1,7 s em 4G).

A FASE 10 auditou e endureceu a segurança: estado verificado, checklist
OWASP Top 10, política LGPD e checklist de go-live em
[`SECURITY.md`](./SECURITY.md). A rotação dos segredos acontece no deploy
(FASE 12).

A FASE 11 fechou a rede de testes: ~950 testes (unitários, integração,
componentes, segurança e 5 fluxos E2E), cobertura com limites e CI no
GitHub Actions a cada push. Sem MongoDB disponível, os testes de banco
aparecem como **pulados** — nunca aprovados — e na CI falham. Como rodar:
[`SETUP.md`](./SETUP.md#testes).

O design de referência das telas está em
[`docs/design/README.md`](./design/README.md).

**Próximo passo:** sua autorização para a **FASE 12** (deploy). Antes dela,
vale ativar no GitHub o bloqueio de merge com os checks da CI (Settings →
Branches).
