# Segurança e LGPD

Resultado da auditoria da FASE 10: o que está em pé, como foi verificado e o
que ainda depende de ação antes do go-live. Complementa o ARCHITECTURE §8,
que registra as decisões de projeto; este documento registra o **estado
verificado**.

> **Pendências antes do go-live** (detalhe em [§9](#9-checklist-de-go-live)):
> rotação de todos os segredos e revisão dos rate limits com tráfego real.

---

## 1. Cabeçalhos HTTP

Configurados em `backend/src/config/security.js` e verificados em
`tests/unit/security.headers.test.js`.

| Cabeçalho | Valor | Por quê |
|---|---|---|
| `Content-Security-Policy` | ver abaixo | Um XSS não consegue carregar nem executar script de fora |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains` (só produção) | Obriga HTTPS por 2 anos; fora de produção quebraria o `localhost` |
| `X-Content-Type-Options` | `nosniff` | O navegador não "adivinha" tipo de arquivo |
| `X-Frame-Options` | `DENY` | Nenhum site embute o painel num iframe (clickjacking) |
| `Referrer-Policy` | `no-referrer` | Endereços do painel não vazam para sites externos |
| `Permissions-Policy` | câmera, microfone, geolocalização, pagamento, USB, serial, Bluetooth, sensores e `browsing-topics` desligados | O site não usa nenhum; um script injetado também não |
| `Cross-Origin-Opener-Policy` | `same-origin` | Isola a janela de popups de outros domínios |
| `X-Powered-By` | removido | Não anuncia Express nem versão |

**CSP:**

```
default-src 'self';
script-src 'self';
style-src 'self' 'unsafe-inline';
font-src 'self';
img-src 'self' data: blob: https:;
connect-src 'self' <origem de upload do provedor de imagens>;
frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'
```

- **`script-src 'self'` sem `unsafe-inline` e sem `unsafe-eval`.** O JSON-LD
  e os dados de partida vão em `<script type="application/ld+json">` e
  `application/json` — blocos de dados, que a CSP não executa. O `zod` roda em
  modo `jitless` para não usar `new Function`.
- `style-src 'unsafe-inline'` fica: o React aplica `style={…}` (barras do
  painel inicial) e bibliotecas podem injetar estilo. Estilo inline não
  executa código; o risco residual é vazamento por CSS, sem dado sensível na
  página pública.
- `img-src https:`: as fotos vêm do CDN do provedor e o logo pode ser qualquer
  URL https cadastrada pela loja.
- `connect-src` inclui só a origem de upload do provedor configurado — é para
  onde o navegador envia as fotos (§6).

Verificado no navegador: o site público e o painel funcionam sem nenhuma
violação de CSP no console.

## 2. CORS

- Origens permitidas: `FRONTEND_URL` (lista separada por vírgula) **mais** a
  própria origem do servidor (o site é servido pelo mesmo processo).
- O boot **recusa** origem com `*`, caminho ou formato inválido
  (`env.test.js`): `*` com `credentials: true` deixaria qualquer site chamar a
  API em nome de quem está logado no painel.
- Métodos (`GET POST PATCH DELETE OPTIONS`) e cabeçalhos (`Content-Type`,
  `Authorization`) em lista fechada.
- Origem não listada recebe 403 (teste de integração).

**No go-live:** `FRONTEND_URL` com o domínio real (e o `www`, se existir).
Se o site e a API ficarem no mesmo domínio, basta ele.

## 3. Autenticação e sessão

- Senha com **argon2id** (19 MiB, 2 iterações — mínimo do OWASP), mínimo de
  12 caracteres e recusa de senhas previsíveis (`senha`, `123456`, `admin`…),
  inclusive no script do primeiro `SUPER_ADMIN`.
- **Login sem enumeração:** mesma mensagem e mesmo tempo para e-mail
  inexistente e senha errada (quando o e-mail não existe, verifica contra um
  hash fictício). Medido: 29 ms × 28 ms na mediana de 12 tentativas
  alternadas.
- **Access token** JWT de 15 min, só na memória do navegador (nunca em
  `localStorage`).
- **Refresh token** opaco de 7 dias em cookie `httpOnly`, `Secure` em
  produção, `SameSite=Strict`, `Path=/api/auth`. Guardado só como hash.
  **Rotação** a cada uso e **detecção de reuso**: um token já revogado que
  reaparece derruba todas as sessões do usuário.
- Usuário desativado perde as sessões na hora.
- Não existe cadastro público; o primeiro `SUPER_ADMIN` nasce por script.
- `JWT_SECRET` com menos de 32 caracteres impede o boot; em produção, ausente
  também.

## 4. Autorização — matriz de permissões

Toda rota administrativa exige token válido. O teste
`tests/integration/permissions.test.js` **descobre as rotas sozinho** a partir
de `ADMIN_ROUTERS` (`routes/index.js`) e confere, em cada uma: anônimo → 401,
token inválido → 401, `ADMIN` → 403 onde a rota exige `SUPER_ADMIN`, e acesso
liberado para quem tem o papel. Uma rota nova entra na verificação sem
ninguém lembrar de escrever teste.

| Área | `ADMIN` | `SUPER_ADMIN` |
|---|---|---|
| Motos: listar, criar, editar, status, fotos | ✅ | ✅ |
| Marcas | ✅ | ✅ |
| Leads: listar, ver, mudar status, anotar | ✅ | ✅ |
| Leads: **excluir** (pedido do titular) | ❌ | ✅ |
| Loja: ler configuração | ✅ | ✅ |
| Loja: **alterar** configuração | ❌ | ✅ |
| Usuários (todas as operações) | ❌ | ✅ |
| Assinatura de upload | ✅ | ✅ |

**IDOR:** não há recurso de "usuário final" (sem área de cliente); todo
recurso administrativo é da loja inteira, e a equipe da loja pode vê-lo por
definição. Um `SUPER_ADMIN` não consegue rebaixar nem desativar a si mesmo
(evita ficar sem ninguém com acesso). Na API pública, trocar o slug ou o id
não revela moto `INACTIVE`: o filtro de status é constante do servidor.

## 5. Dados expostos e validação de entrada

- **Varredura automatizada** (`tests/integration/publicExposure.test.js`):
  percorre **todas** as respostas públicas (loja, marcas, catálogo, moto,
  similares, simulação de lead, health) e o bloco de dados do HTML, procurando
  recursivamente `licensePlate`, `passwordHash`, `_id`, `__v`, `tokenHash` e
  `key`, e também os **valores** (placa, hash argon2, telefone e e-mail de
  leads) — pega o vazamento mesmo com outro nome de campo.
- Projeção explícita nos repositórios, `select: false` em `licensePlate` e
  `passwordHash`, serializers por contexto (público × admin).
- **Injeção NoSQL** (`tests/integration/injection.test.js`): operadores
  (`$ne`, `$gt`, `$in`, `$regex`) na query do catálogo e dos filtros, no
  corpo do login e do lead e no slug recebem 422 — o Zod exige tipos primitivos e `.strict()` recusa
  chave desconhecida (também impede *mass assignment*, como `role` num
  update).
- **XSS armazenado** testado no navegador: HTML com script na descrição da
  moto e na mensagem do lead aparece como texto no site e no painel, sem
  executar. O React escapa; o servidor escapa o
  que injeta no HTML; o JSON-LD troca `<` por `<`.
- Links cadastrados (mapa, redes) aceitam só `https:` — `javascript:` é
  recusado.
- Busca textual usa índice de texto, não `RegExp` com entrada do usuário
  (ReDoS).
- Corpo das requisições limitado a 100 kB (`BODY_LIMIT`); fotos não passam
  pela API.

## 6. Upload de imagens

Revisado o fluxo direto ao provedor (ARCHITECTURE §10.4):

1. **Assinatura escopada:** só para a pasta da moto pedida (que precisa
   existir), só JPEG/PNG/WebP/AVIF/HEIC, validade de 1 h (regra do provedor). O
   segredo do provedor nunca sai do servidor.
2. **Revalidação ao vincular:** o servidor confere que o `publicId` está na
   pasta daquela moto, **verifica a assinatura da resposta do provedor** (o
   navegador não consegue forjar um upload) e confere de novo formato e
   tamanho (até 10 MB) — valores cobertos pela assinatura verificada.
3. **URL montada pelo servidor** a partir do `publicId` — o navegador não
   escolhe a URL que vai para o banco.
4. **Limite de 20 fotos** aplicado de forma atômica no banco (dois envios
   simultâneos não passam do limite).
5. Rota de assinatura sob o limite do painel, exige login.

## 7. Limites de requisição

Tabela única em `backend/src/middlewares/rateLimiters.js`
(`RATE_LIMITS`); `tests/unit/rateLimits.test.js` percorre cada linha e confere
que a tentativa limite + 1 recebe 429.

| Escopo | Limite | Chave | Razão |
|---|---|---|---|
| `POST /api/auth/login` | 5 / 15 min | IP + e-mail | força bruta contra uma conta |
| `POST /api/auth/login` | 20 / 15 min | IP | *credential stuffing*: a linha acima deixava testar a mesma senha em e-mails ilimitados |
| `POST /api/auth/refresh` | 30 / 15 min | IP | o painel renova a cada 15 min |
| `POST /api/leads` | 5 / hora | IP | spam de formulário (há também o honeypot) |
| `GET /api/*` público | 900 / 15 min | IP | ~1/s; operadoras móveis põem muita gente atrás do mesmo IP (CGNAT) — o 300 original bloquearia pessoas antes de robôs |
| Páginas HTML, `sitemap.xml`, `robots.txt` | 600 / 15 min | IP | cada página de moto consulta o banco; slugs aleatórios em massa seriam uma sobrecarga barata |
| `/api/admin/*` | 600 / 15 min | usuário | a equipe divide a conexão da loja |

> **Os números vêm do uso esperado, não de tráfego medido** — o site ainda
> não está no ar. Revisar com os logs das primeiras semanas (quantos 429, de
> quem).

Contadores em memória: servem para uma instância. Com mais de uma réplica,
precisam de armazenamento compartilhado (Redis) — risco R-06.

### IP real atrás de proxy — `TRUST_PROXY_HOPS`

Os limites por IP dependem de o servidor saber o IP real do visitante. Atrás
de proxy, o IP vem do `X-Forwarded-For`, e **quantos proxies** confiar precisa
bater com a hospedagem:

| Topologia | Valor |
|---|---|
| Servidor exposto direto | `0` |
| Render (padrão) | `1` |
| Cloudflare na frente do Render | `2` |

Valor **alto demais**: o visitante escreve o próprio `X-Forwarded-For` e troca
de "IP" a cada tentativa — os limites deixam de existir. **Baixo demais**:
todos aparecem com o IP do proxy e se bloqueiam entre si. Coberto por
`tests/unit/trustProxy.test.js`.

## 8. Erros, logs e dependências

- **Erro em produção** (`tests/unit/errorHandler.production.test.js`): 500
  com mensagem genérica e `requestId`; sem stack, sem mensagem interna, sem
  nome de coleção nem de campo de índice em erro de duplicidade. A stack vai
  para o log, ligada ao `requestId`. `/api/health` não informa versão nem
  host.
- **Redaction dos logs** (`tests/unit/logger.redact.test.js`): removidos
  (não mascarados) `authorization`, `cookie`, `set-cookie`, senha, hash,
  tokens, assinaturas, telefone e e-mail, no nível raiz e aninhados. Lead é
  logado pelo `id`.
- **`npm audit`**: 0 vulnerabilidades (produção e desenvolvimento) em
  25/09/2026.
- **Segredos no histórico do git:** varredura de todos os commits
  (padrões de chave privada, URI do Mongo com senha, chaves de API, JWT,
  `.env`). Nenhum segredo real; só os marcadores `USUARIO:SENHA` da
  documentação. Versionados apenas os `.env.example`.

## 9. Checklist de go-live

- [ ] **Rotacionar todos os segredos** — os usados em desenvolvimento e
      testes não vão para produção:
  - [ ] `JWT_SECRET`: novo, aleatório (`openssl rand -base64 48`), exclusivo
        de produção. Trocar derruba todas as sessões — é o esperado.
  - [ ] Usuário e senha do MongoDB Atlas: usuário próprio de produção,
        permissão só no banco da loja, acesso de rede restrito.
  - [ ] `CLOUDINARY_API_SECRET`: gerar novo par de chaves e revogar o antigo.
  - [ ] Senha do primeiro `SUPER_ADMIN`: definida pelo dono, nunca a de teste.
- [ ] `NODE_ENV=production` (liga HSTS, cookie `Secure`, erros genéricos).
- [ ] `FRONTEND_URL` com o domínio real.
- [ ] `TRUST_PROXY_HOPS` conforme a hospedagem (§7).
- [ ] Após 2–4 semanas: revisar rate limits com o tráfego real.

## 10. LGPD

### 10.1 Dados pessoais tratados

Só os leads (formulários de interesse, financiamento e venda de moto) e as
contas da equipe. O site público não usa cookie de rastreamento nem
analytics; as fontes são servidas pelo próprio domínio (o IP do visitante não
vai ao Google).

| Dado | Origem | Finalidade |
|---|---|---|
| Nome, telefone | obrigatórios no formulário | a loja retornar o contato |
| E-mail, mensagem | opcionais | idem |
| Moto de interesse / simulação / dados da moto do cliente | formulário | contexto do atendimento |
| Página, referência, UTM | navegador | saber de onde veio o contato |
| Aceite, data e versão do texto | formulário | prova da base legal |
| Anotações da equipe | painel | histórico do atendimento |

**Não coletados** (de propósito): CPF, renda, documento, endereço, IP — dados
de análise de crédito são da financeira, no momento da proposta (R-07).

### 10.2 Base legal

**Consentimento** (art. 7º, I): caixa não marcada por padrão, texto com link
para a política de privacidade, envio impossível sem o aceite. Cada lead
guarda `consent.accepted`, `consent.at` e `consent.textVersion` (hoje
`2026-09-v1`, em `shared/src/enums.js`). Mudou o texto do aceite, muda a
versão — cada lead continua apontando para o texto que a pessoa leu.

### 10.3 Acesso e eliminação

- Leads só são vistos no painel, por usuários autenticados; nenhuma rota
  pública devolve lead (varredura da §5).
- **Eliminação a pedido do titular:** `SUPER_ADMIN` exclui o lead no painel
  (botão "Excluir dados (pedido do titular)"), de forma definitiva. `ADMIN`
  não consegue (403, coberto pela matriz).
- **Acesso a pedido do titular:** o detalhe do lead no painel mostra tudo o
  que foi guardado, incluindo origem e consentimento, para a loja responder.
- Logs não guardam telefone nem e-mail (§8).

### 10.4 Retenção — decisão **E**

**Decidido pelo dono (25/09/2026):** o lead fica guardado **até a loja
excluir** — sem prazo fixo e sem exclusão automática. Nenhum contato some
sozinho, mesmo sem resposta.

- O `SUPER_ADMIN` exclui um lead no detalhe ou **vários de uma vez** na lista
  (marcar e "Excluir selecionados", até 100 por vez —
  `POST /api/admin/leads/exclusao`). `ADMIN` não exclui.
- A política de privacidade diz que os dados ficam "enquanto forem úteis para
  o atendimento" e que a loja revisa e exclui os que não precisa mais —
  sem prometer um prazo que o sistema não aplica.
- **Recomendação à loja:** revisar a lista periodicamente (por exemplo, a
  cada 6 meses) e excluir o que já não tem uso. A LGPD pede que o dado seja
  guardado só enquanto necessário à finalidade (art. 15 e 16); a
  responsabilidade de fazer essa limpeza é da loja, como controladora.

### 10.5 Papel de cada um

A loja que usa a plataforma é a **controladora** dos dados dos seus leads e
responde ao titular; a política de privacidade do site é preenchida com os
dados dela nas Configurações. Quem hospeda e mantém a plataforma atua como
**operador**.

## 11. OWASP Top 10 (2021)

| # | Categoria | Situação | Onde |
|---|---|---|---|
| A01 | Controle de acesso quebrado | ✅ Matriz testada rota por rota, descoberta automática; filtro de status público no servidor; CORS fechado | §2, §4 |
| A02 | Falhas criptográficas | ✅ argon2id; refresh só como hash; HSTS; cookie `Secure`; segredo curto impede o boot. ⚠️ Rotação no go-live | §3, §9 |
| A03 | Injeção | ✅ Zod estrito em toda entrada; operadores NoSQL → 422; sem `RegExp` do usuário; XSS escapado no React, no HTML e no JSON-LD; CSP sem script inline | §1, §5 |
| A04 | Design inseguro | ✅ Separação público/admin por caminho; imagens fora da API; sem dado de crédito; limites de tamanho e de fotos | §5, §6 |
| A05 | Configuração insegura | ✅ Cabeçalhos completos; `X-Powered-By` removido; erros genéricos; env validado no boot; `FRONTEND_URL` e `TRUST_PROXY_HOPS` validados | §1, §7, §8 |
| A06 | Componentes vulneráveis | ✅ `npm audit` zerado; dependências novas só com justificativa (ARCHITECTURE §2.2). Rever a cada entrega | §8 |
| A07 | Falhas de identificação e autenticação | ✅ Limites por conta e por IP; mensagem e tempo iguais; rotação e reuso de refresh; sessão cai com a desativação | §3, §7 |
| A08 | Integridade de software e dados | ✅ Resposta do provedor de imagens verificada por assinatura; URL da foto montada no servidor; lockfile versionado | §6 |
| A09 | Falhas de log e monitoramento | ✅ Log estruturado com `requestId` em toda requisição (inclusive 401 e 429), reuso de refresh token registrado como alerta, PII removida. ⚠️ Alertas dependem da hospedagem (FASE 12) | §8 |
| A10 | SSRF | ✅ O servidor não busca URL informada pelo usuário: a foto é enviada pelo navegador e o servidor só monta a URL a partir do `publicId` | §6 |

## 12. Riscos aceitos

- `style-src 'unsafe-inline'` (§1).
- Rate limit em memória numa única instância (R-06).
- Números dos limites sem tráfego real (§7).
- Sem MFA no painel: equipe pequena, senha forte obrigatória e limites de
  tentativa. Candidato a melhoria futura.
