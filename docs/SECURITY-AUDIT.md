# MotorShop — Auditoria de segurança

> 2026-09-28. Análise estática do código inteiro, testes controlados (sem
> exploits destrutivos) e conferência dos cabeçalhos do site publicado. Os
> controles já documentados continuam em [`SECURITY.md`](./SECURITY.md); aqui
> estão o que foi verificado de novo, o que foi encontrado e o que mudou.

## 1. Resumo

| Severidade | Encontradas | Corrigidas | Aceitas (documentadas) |
|---|---|---|---|
| Crítica | 0 | — | — |
| Alta | 0 | — | — |
| Média | 1 | 1 | 0 |
| Baixa | 5 | 3 | 2 |

Nenhum segredo exposto, nenhum endpoint administrativo sem proteção,
`npm audit` em zero.

## 2. Achados

| # | Sev. | Achado | Status |
|---|---|---|---|
| S-01 | Média | **CORS não liberava `PUT`.** A rota `PUT /api/admin/store/imagens/:tipo` (logo e imagem de compartilhamento) era barrada no preflight sempre que o site roda em outra origem que a API — em desenvolvimento (`:5173` → `:3000`) ou num deploy com frontend separado. Em produção passava só por ser a mesma origem. É disponibilidade, não brecha | **Corrigido** em `app.js`. Teste novo percorre **todas** as rotas da API e confere que o preflight libera cada método usado |
| S-02 | Baixa | **Algoritmo do JWT não fixado.** `jwt.verify` aceitava qualquer HMAC com o segredo — um token `HS512` passava (provado por teste). `none` já era recusado pela biblioteca, mas por padrão dela, não por decisão nossa | **Corrigido**: `HS256` fixo na emissão e na verificação |
| S-03 | Baixa | **`siteUrl` aceitava `javascript:`** (`z.url()` sem conferir o esquema). Só o SUPER_ADMIN altera, e o valor vira texto em canonical, Open Graph e na mensagem do WhatsApp — não link clicável | **Corrigido**: mesma regra `http(s)` dos outros links |
| S-04 | Baixa | **`/api/auth/logout` e `/api/auth/me` sem limitador** — as únicas rotas que consultam o banco sem limite | **Corrigido**: limite do site público |
| S-05 | Baixa | **Sem teto de login por conta entre IPs diferentes** (limites atuais: IP+conta e só IP) | **Aceito** — um teto por conta deixaria qualquer um trancar o dono fora do painel. Senha ≥ 12, lista de senhas previsíveis e argon2id tornam a adivinhação inviável. [`TECHNICAL-DEBT.md`](./TECHNICAL-DEBT.md) DT-15 |
| S-06 | Baixa | **Tamanho do upload conferido pelo `bytes` que o navegador informa** — a assinatura do provedor não impõe tamanho | **Aceito** — só a equipe logada obtém assinatura; o provedor tem teto próprio e reduz a foto a 2560 px. DT-16 |

## 3. O que foi verificado e está correto

### Autenticação
- Senhas com **argon2id** (19 MiB, t=2), tempo igual para e-mail inexistente
  e senha errada (hash fictício).
- Access token JWT de 15 min só em memória; refresh opaco de 7 dias em
  cookie `httpOnly`, `Secure` em produção, `SameSite=Strict`, `Path=/api/auth`,
  guardado só como hash, com rotação e detecção de reuso.
- `issuer` e `audience` conferidos; `JWT_SECRET` < 32 caracteres impede o boot.
- Sem cadastro público; primeiro SUPER_ADMIN por script.
- Limites: login 5/15 min por IP+conta e 20/15 min por IP (IPv6 agrupado por
  faixa), refresh 30/15 min.

### Autorização
- Todo `/api/admin/*` passa por `authenticate` → limitador do painel; o papel
  vem **do banco** a cada requisição (rebaixar ou desativar vale na hora).
- SUPER_ADMIN exigido em usuários, configurações da loja, imagens da loja e
  exclusão de leads. Matriz de permissões testada rota a rota
  (`backend/tests/integration/permissions.test.js`).
- Usuário não altera o próprio papel nem se desativa; o sistema nunca fica
  sem SUPER_ADMIN ativo; trocar senha ou desativar derruba as sessões.
- IDOR/BOLA: loja única por instalação — não há recurso "de outro usuário"
  a proteger entre admins; todo acesso por id passa pelo papel. Rotas públicas
  não têm caminho que devolva `licensePlate` ou moto `INACTIVE`.

### Entrada e injeção
- Toda query, parâmetro e corpo passa por Zod `.strict()` (campo inesperado =
  422, sem mass assignment). Nenhum `passthrough`, `z.any()` ou `z.record()`.
- MongoDB: filtros montados campo a campo a partir de valores já tipados;
  busca por `$text` (sem regex com entrada do usuário); ordenação por lista
  fixa; ids validados como ObjectId.
- XSS: nenhum `dangerouslySetInnerHTML`; HTML do servidor com `escapeHtml` e
  JSON embutido com `<` escapado; CSP `script-src 'self'` sem inline nem eval.
- Links configuráveis (`http(s)` apenas) e iframe do mapa restrito a
  `https://www.google.com/maps/embed`.
- `BODY_LIMIT` 100 kb; JSON malformado vira 400 no envelope padrão.
- Sem execução de comando, leitura de caminho vindo do usuário ou busca de URL
  arbitrária no servidor (sem superfície de command injection, path traversal
  ou SSRF).

### Upload de imagens
- O arquivo vai do navegador direto ao Cloudinary com **assinatura presa à
  pasta** da moto/loja, formatos permitidos (`jpg, jpeg, png, webp, avif,
  heic` — **sem SVG**) e redução a 2560 px.
- O servidor só aceita metadados com assinatura de resposta conferida
  (`timingSafeEqual`), `publicId` dentro da pasta certa, formato na lista e
  dimensões limitadas; a URL gravada é montada pelo servidor. Máximo de 20
  fotos por moto, aplicado de forma atômica.

### Infraestrutura (site publicado, conferido em 2026-09-28)
- CSP, HSTS (2 anos), `X-Frame-Options: DENY`, `nosniff`,
  `Referrer-Policy: no-referrer`, `Permissions-Policy` restritiva.
- `/api/health` só expõe estado, uptime e banco — sem versões.
- Painel com `noindex, nofollow`; robots bloqueia `/admin` e `/api`.

### Segredos e dependências
- Nenhum segredo na árvore, no histórico do git ou no bundle
  ([`AUDIT-INVENTORY.md`](./AUDIT-INVENTORY.md) §5).
- `npm audit`: 0 vulnerabilidades (produção e desenvolvimento).

### Logs
- Pino com redação de `authorization`, cookies, senha e tokens
  (`config/logger.js`, testado); Sentry com o mesmo filtro (`scrubEvent`).
- Nenhum `console.log` em código de produção.

## 4. Observação de ambiente

O endereço publicado (`motorshop-y3vl.onrender.com`) está com configuração de
**staging**: `robots.txt` com `Disallow: /` e imagens na pasta `staging`. É o
esperado para o ambiente de demonstração; no go-live, o serviço de produção
usa `ROBOTS_POLICY=allow` e `STORAGE_FOLDER=prod` (`render.yaml`) — ver
checklist em [`SECURITY.md`](./SECURITY.md) §9.
