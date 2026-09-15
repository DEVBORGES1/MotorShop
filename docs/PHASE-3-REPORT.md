# Relatório da FASE 3 — Autenticação + Admin

**Data:** 2026-09-15
**Branch:** `main`
**Base:** [`ARCHITECTURE.md`](./ARCHITECTURE.md) · [`ROADMAP.md`](./ROADMAP.md)

---

## 1. Resumo

A FASE 3 fecha as rotas administrativas de verdade. Até aqui, `/api/admin/*`
aceitava escrita sem credencial — estava seguro apenas por uma trava que
recusava tudo em produção. Essa trava foi **removida** e substituída por
autenticação real.

Entrega: modelos `User` e `RefreshToken`, hash argon2id, login com resposta
idêntica nos três casos de falha, refresh com rotação e detecção de reuso,
`authenticate`/`authorize`, rate limiting, gestão de usuários, configurações da
loja, e o painel administrativo completo consumindo a API.

**122 testes passando** (118 backend + 4 frontend) e **126 de integração
escritos aguardando banco** — mesma limitação de ambiente da FASE 2 (§9).

Dois problemas de segurança foram encontrados durante a construção, um deles
uma **vulnerabilidade real** no meu próprio código (§8).

---

## 2. Estrutura criada

```
backend/src/
├─ modules/auth/
│  ├─ password.js           argon2id + comparação em tempo constante
│  ├─ tokens.js             JWT curto + refresh opaco, cookie httpOnly
│  ├─ refreshToken.model.js sessões revogáveis, com TTL
│  ├─ auth.repository.js
│  ├─ auth.service.js       login, refresh com rotação, detecção de reuso
│  ├─ auth.controller.js
│  ├─ auth.routes.js
│  └─ auth.schema.js
├─ modules/users/           model · repository · service · serializer
│                           controller · routes · schema
├─ modules/store/           configuração da loja (singleton)
├─ middlewares/
│  ├─ authenticate.js       valida token e reconfere o usuário no banco
│  ├─ authorize.js          authorize('SUPER_ADMIN')
│  └─ rateLimiters.js       limites por perfil de rota
└─ scripts/createSuperAdmin.js

frontend/src/
├─ contexts/AuthContext.jsx       sessão, restauração e logout
├─ components/admin/RequireAuth.jsx
├─ components/ui/                 Button · Field · Alert
├─ hooks/{useAuth,useAsyncData}.js
├─ layouts/AdminLayout.jsx
├─ pages/admin/                   Login · Dashboard · MotosList · MotoForm
│                                 Marcas · Usuarios · Configuracoes
├─ services/{authService,adminService}.js
└─ utils/format.js
```

**Removido:** `middlewares/adminGuard.js` e seu teste — a trava provisória da
FASE 2 não tem mais razão de existir.

---

## 3. Fluxo de autenticação

```
Login  →  argon2id verifica  →  access JWT (15 min, MEMÓRIA do JS)
                            →  refresh opaco (7 dias, cookie httpOnly)

401  →  interceptor renova UMA vez  →  repete a requisição original
                                    →  falhou? sessão encerrada na UI
```

| Token | Forma | Onde fica | Por quê |
|---|---|---|---|
| Access | JWT assinado, 15 min | **Memória** do JS | `localStorage` é legível por qualquer script: um XSS entregaria uma sessão administrativa completa |
| Refresh | Aleatório opaco, 7 dias | Cookie `httpOnly` `Secure` `SameSite=Strict`, `Path=/api/auth` | JavaScript não o alcança; e sendo opaco, pode ser **revogado** — JWT não pode |

O banco guarda apenas o **hash** do refresh: vazar a coleção de sessões não
entrega nenhuma sessão.

### Rotação e detecção de reuso

Cada refresh revoga o token usado e emite um novo. Se um token **já revogado**
reaparece, é sinal de roubo: **todas** as sessões daquele usuário são
encerradas e o evento é registrado no log.

No cliente, uma única renovação fica em voo por vez. Sem isso, N requisições
que recebessem 401 ao mesmo tempo dispariam N refreshes — e a rotação
interpretaria os extras exatamente como reuso de token roubado, derrubando a
sessão do próprio usuário legítimo.

---

## 4. Decisões de segurança

| Decisão | Motivo |
|---|---|
| **Mensagem única nas 3 falhas de login** | E-mail inexistente, conta desativada e senha errada devolvem exatamente `"E-mail ou senha inválidos"`. Distinguir revelaria quais e-mails estão cadastrados. |
| **Comparação roda mesmo sem usuário** | Um hash fictício é verificado quando o e-mail não existe. Sem isso, a resposta voltaria muito mais rápido, e o tempo vazaria a mesma informação. |
| **Papel vem do banco, não do token** | `authenticate` reconsulta o usuário a cada requisição. Um administrador desativado ou rebaixado perde acesso **na hora**, não em até 15 minutos. |
| **Sem endpoint de cadastro** | O primeiro SUPER_ADMIN nasce por `npm run create:superadmin`. Não há credencial padrão embutida. |
| **Senha lida sem eco** | O script não aceita a senha por argumento, que ficaria no histórico do shell. |
| **Trocar senha ou desativar encerra sessões** | Manter uma sessão viva depois disso anularia o motivo da mudança. |
| **Rotas admin em caminho separado** | O código público não tem rota capaz de devolver campo privado. |
| **Painel em chunk separado** | Verificado no build: o bundle público não contém uma linha do painel. |

### Matriz de permissões

| Recurso | ADMIN | SUPER_ADMIN |
|---|---|---|
| Motos e marcas (CRUD) | ✅ | ✅ |
| Configurações da loja: ler | ✅ | ✅ |
| Configurações da loja: alterar | ❌ | ✅ |
| Usuários (CRUD) | ❌ | ✅ |

Um usuário não pode alterar o próprio papel nem se desativar — seria trancar-se
do lado de fora.

---

## 5. Rate limiting

| Rota | Limite | Chave |
|---|---|---|
| `POST /auth/login` | 5 / 15 min | IP **+** e-mail |
| `POST /auth/refresh` | 30 / 15 min | IP |
| `/api/*` público | 300 / 15 min | IP |
| `/api/admin/*` | 600 / 15 min | id do usuário |

A chave do login combina IP e e-mail de propósito: só por IP, um escritório
inteiro atrás de um NAT se bloquearia; só por e-mail, trocar o e-mail
contornaria.

Armazenamento em memória — suficiente para uma instância, que é a topologia do
MVP. Com réplicas, o contador precisa ser compartilhado (risco R-06).

---

## 6. Painel administrativo

| Página | O que faz |
|---|---|
| `/admin/login` | Autenticação; rota protegida redireciona para cá e volta depois |
| `/admin` | Contadores por status e atalhos |
| `/admin/motos` | Lista paginada, busca, filtro por status e **troca de status na própria linha** — a operação mais frequente da loja |
| `/admin/motos/nova` e `/:id/editar` | Formulário completo, com as mesmas regras do servidor |
| `/admin/marcas` | Criar, ativar/desativar, excluir (com o 409 explicado) |
| `/admin/usuarios` | SUPER_ADMIN: criar e desativar |
| `/admin/configuracoes` | Identidade, contato, endereço, redes e cores da loja |

A tela de configurações é o que torna o produto revendável: trocar de cliente é
preencher esse formulário, não editar código.

---

## 7. Validações executadas

| # | Validação | Resultado |
|---|---|---|
| 1 | `npm run lint` | ✅ zero erros |
| 2 | `npm run format:check` | ✅ |
| 3 | `npm test` | ✅ 122 passando, 126 pulados |
| 4 | `npm run build` | ✅ backend e frontend |
| 5 | Rotas admin registradas | ✅ respondem 503 (sem banco), não 404 |
| 6 | Sem cadastro público | ✅ `/register`, `/signup`, `/usuarios` → 404 |
| 7 | **Painel no navegador** | ✅ ver abaixo |
| 8 | Bundle público sem código admin | ✅ 0 ocorrências de 6 termos administrativos |
| 9 | Token fora de `localStorage` | ✅ só em memória |
| 10 | `npm audit` | ✅ 0 vulnerabilidades |

### No navegador (Chromium)

| Verificação | Resultado |
|---|---|
| `/admin/motos` sem sessão redireciona para o login | ✅ |
| Campo de senha é `type="password"` | ✅ |
| Validação do cliente sem ida à rede | ✅ |
| Erro do servidor exibido ao usuário | ✅ |
| Mobile 360 px sem scroll horizontal | ✅ |
| Erros de JavaScript | ✅ nenhum |

### Peso do bundle

| | gzip |
|---|---|
| Inicial público | **116,1 kB** (era 118,66 — *caiu*) |
| Painel completo, sob demanda | 41,1 kB |

O bundle público **diminuiu** mesmo com todo o painel adicionado: o Zod (35 kB)
saiu do carregamento inicial ao virar dependência exclusiva dos formulários
administrativos.

---

## 8. Problemas encontrados e corrigidos

### Problema 1 — Burla do rate limit de login por IPv6 🔴

**Vulnerabilidade real no meu código.** Eu havia escrito o `keyGenerator` do
limitador usando `req.ip` cru. Como um bloco IPv6 /64 tem 2^64 endereços, um
atacante com uma faixa IPv6 teria uma chave diferente a cada tentativa e
**contornaria o limite de login por completo** — justamente a proteção contra
força bruta.

Foi a própria biblioteca que recusou a configuração
(`ERR_ERL_KEY_GEN_IPV6`). Corrigido com `ipKeyGenerator`, que agrupa a faixa
antes de usá-la como chave.

### Problema 2 — Guarda do "último super admin" era inalcançável 🟡

Eu havia escrito uma guarda impedindo remover o único SUPER_ADMIN ativo, e ia
testá-la por HTTP. Ao montar o teste, percebi que ela **não pode ser atingida
pela API**: toda rota de usuários exige um SUPER_ADMIN ativo, que já conta como
"outro" quando o alvo é outra pessoa; e quando o alvo é ele mesmo, as regras de
autoalteração barram antes.

Não removi — é defesa em profundidade e protege quem chamar o serviço por fora
do HTTP. Mas documentei o alcance real no código e **movi o teste para o nível
do serviço**, em vez de escrever um teste HTTP que fingisse exercitá-la.

### Problema 3 — `JWT_SECRET` ausente quebraria o desenvolvimento 🟡

A FASE 1 deixou `JWT_SECRET` opcional fora de produção. Com autenticação, isso
faria o login quebrar em qualquer máquina sem configuração.

Agora um segredo temporário é gerado no boot, com aviso explícito de que as
sessões não sobrevivem a um reinício. Em produção a variável segue
**obrigatória** e validada. Um teste da FASE 1 precisou ser atualizado, porque
o contrato mudou de propósito.

### Problema 4 — Três erros de lint em descarte de variáveis 🟢

Campos descartados por destructuring (`passwordHash`, `key`) precisavam do
prefixo `_` para comunicar a intenção.

---

## 9. Pendências

### A mesma limitação da FASE 2 — sem MongoDB neste ambiente

126 testes de integração estão escritos e **pulados**: o proxy de egresso
bloqueia o download do `mongod` (403), não há daemon Docker nem binário local.

Os pulados cobrem o que mais importa nesta fase: mensagem idêntica nas três
falhas de login, rotação de refresh, **detecção de reuso**, matriz completa de
autorização (16 rotas × anônimo/token inválido, 5 rotas × ADMIN → 403),
desativação encerrando sessões, troca de senha invalidando a anterior, e a
garantia de que nenhuma resposta contém `passwordHash`.

Na sua máquina, `npm test` roda todos eles sem precisar de Atlas.

### Para usar o painel

```bash
npm install                  # argon2, jsonwebtoken e react-hook-form são novos
# com MONGODB_URI no .env:
npm run create:superadmin    # cria o primeiro acesso
npm run dev                  # http://localhost:5173/admin/login
```

### Decisões da FASE 0 ainda em aberto

**C** (deploy), **D** (domínio) e **E** (retenção de leads, afeta a FASE 6).
**A** e **I** seguem implementados conforme a recomendação.

---

## 10. Próxima fase recomendada

**FASE 4 — Catálogo público**: home com as 13 seções, `/estoque` com filtros na
URL, paginação de servidor e o tema vindo de `GET /api/store`.

É a primeira fase em que o **visitante** vê o resultado — e a que passa a
consumir a configuração da loja que a FASE 3 tornou editável.

> **A FASE 4 não será iniciada sem a sua autorização.**
