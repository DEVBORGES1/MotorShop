# MotorShop — Como personalizar para um novo cliente

> Para quem vai colocar a plataforma no ar para **mais uma loja**. Parte do
> princípio de que o deploy já é conhecido ([`DEPLOYMENT.md`](./DEPLOYMENT.md))
> e mostra o que muda de uma loja para outra — e onde.
>
> A regra que torna isto possível: **nenhum dado de loja está no código**.
> O teste E2E `e2e/6-revenda.spec.js` prova isso a cada push: configura uma
> segunda loja, completamente diferente, só pelo painel, e confere o site
> inteiro (título, cor, logo, ícone da aba, rodapé, WhatsApp, política de
> privacidade, módulo desligado).

---

## 1. Em resumo

| O que muda | Onde se muda | Precisa de deploy? |
|---|---|---|
| Nome, slogan, razão social, logo, imagem de compartilhamento | Painel → Configurações | não |
| WhatsApp, telefone, e-mail, endereço, mapa, redes sociais, horários | Painel → Configurações | não |
| Cor da marca | Painel → Configurações → Cores | não |
| Diferenciais da página inicial | Painel → Configurações → Diferenciais | não |
| Módulos (financiamento, venda sua moto) e taxa do simulador | Painel → Configurações | não |
| Endereço do site, título e descrição no Google | Painel → Configurações → Endereço e busca | não |
| Estoque, fotos, marcas | Painel → Motos / Marcas | não |
| Banco, provedor de fotos, domínio, segredos | Variáveis do serviço (Render) | reinício |
| Tipografia, tons de cinza, cantos, layout | Código (`frontend/src/styles/index.css`) | sim — é mudança de **produto**, vale para todas as lojas |

Tudo o que está no painel aparece no site **na hora** (o cache do site é
limpo a cada alteração salva), sem compilar nada.

---

## 2. Passo a passo para uma loja nova

Cada loja tem **o seu próprio** serviço, banco e pasta de fotos — os dados de
uma nunca ficam ao alcance de outra (a plataforma é de loja única por
instalação; ver §14.3 do ARCHITECTURE para o caminho multi-loja).

### 2.1 Infraestrutura (uma vez por loja)

1. **Banco:** um cluster no Atlas (ou um database novo), com usuário restrito
   a esse database. Nome sugerido: `<loja>_prod`.
2. **Fotos:** na conta Cloudinary, uma pasta por loja e ambiente —
   `STORAGE_FOLDER=<loja>/prod`. As assinaturas de envio só valem para essa
   pasta.
3. **Servidor:** no Render, *New → Blueprint* com este repositório. O
   `render.yaml` cria produção e staging; renomeie os serviços para a loja.
4. **Variáveis** (painel do Render, nunca no repositório):

   | Variável | Valor para a loja nova |
   |---|---|
   | `MONGODB_URI` | a string do banco **desta** loja |
   | `JWT_SECRET` | gerado pelo Render (`generateValue`) — nunca copiado de outra loja |
   | `FRONTEND_URL` | `https://www.<dominio-da-loja>` |
   | `STORAGE_PROVIDER`, `CLOUDINARY_*` | credenciais da conta de fotos |
   | `STORAGE_FOLDER` | `<loja>/prod` (ou `<loja>/staging`) |
   | `SENTRY_DSN` | um projeto Sentry por loja (ou um só, com `SENTRY_ENVIRONMENT` distinto) |
   | `ROBOTS_POLICY` | `allow` em produção, `disallow` em staging |
   | `TRUST_PROXY_HOPS` | `1` só Render, `2` com Cloudflare na frente |

5. **Domínio:** DNS e HTTPS como em DEPLOYMENT §6.

### 2.2 Primeiro acesso

No Shell do serviço:

```bash
npm run create:superadmin      # o dono da loja: nome, e-mail e senha forte
npm run db:check               # confere banco, índices e administrador
```

### 2.3 Configurar a loja no painel

Entre em `/admin/login` com a conta criada → **Configurações**. Seções, na
ordem da tela:

| Seção | O que preencher | Onde aparece no site |
|---|---|---|
| **Identidade** | Nome, slogan, razão social | Cabeçalho, título das páginas, home (o slogan é o título principal), rodapé, política de privacidade (a razão social é a controladora dos dados) |
| **Logo e imagem de compartilhamento** | Logo (PNG com fundo transparente, qualquer proporção) e imagem 1200 × 630 px | Logo: cabeçalho (44 px de altura) e ícone da aba. Imagem: preview do link no WhatsApp, Facebook etc. Sem ela, o preview usa o logo |
| **Contato** | WhatsApp (com DDD), telefone, e-mail | Botões de WhatsApp em todo o site, mensagem pronta com o link da moto, rodapé, contato |
| **Endereço** | Rua, número, bairro, cidade, UF, CEP, link do mapa | Rodapé, sobre, contato, dados estruturados do Google (negócio local) |
| **Horários de funcionamento** | Por dia; dias seguidos com o mesmo horário são agrupados | Rodapé, sobre, contato |
| **Redes sociais** | Links completos | Rodapé |
| **Módulos** | Financiamento e "Venda sua moto" | Desligado: some do menu, da home e do sitemap; a página responde 404 e a API recusa o formulário |
| **Financiamento** | Taxa (% ao mês), prazos oferecidos, entrada mínima | Simulador da página da moto e de `/financiamento`. Sem taxa ou sem prazo, o site não simula — mostra só o contato |
| **Diferenciais** | Até 3 promessas, com explicação opcional | Faixa da página inicial. Sem nenhum, a faixa não aparece — **escreva só o que a loja cumpre** |
| **Endereço e busca (SEO)** | Endereço definitivo do site; título e descrição da home | Base de todos os links gerados (Google, sitemap, preview, mensagem do WhatsApp) e o texto do resultado de busca |
| **Cores** | A cor da marca | Botões, links, destaques, menu ativo. Hover e cor do texto sobre ela são calculados. Cores escuras demais para o fundo do site são **clareadas no mesmo tom** até o texto ficar legível (contraste AA) |

Só o **super administrador** altera configurações; administradores comuns
enxergam a tela em modo leitura.

### 2.4 Estoque e equipe

1. **Marcas** → cadastre as que a loja trabalha (ou deixe o formulário da
   moto criar sob demanda).
2. **Motos** → cadastre, depois **Fotos** (arraste para ordenar; a primeira é
   a capa; descreva cada foto para leitores de tela e Google).
3. **Usuários** → crie os vendedores como **Administrador** (operam estoque e
   leads, não mexem em configuração nem excluem leads).

### 2.5 Conferir antes de entregar

```bash
npm run smoke -- https://www.<dominio-da-loja>
```

E à mão: enviar o link da home no WhatsApp (preview com a imagem da loja),
um formulário de interesse de ponta a ponta, e o
[Teste de pesquisa aprimorada](https://search.google.com/test/rich-results)
na página de uma moto.

---

## 3. Loja de demonstração (para vender a plataforma)

No **staging**, nunca na produção de uma loja real:

```bash
npm run seed -- --confirmar-apagar-estoque
```

Cria 22 motos e, se ainda não houver, a loja "MotorShop Demonstração" com
diferenciais de exemplo. **Apaga motos e marcas antes.** As fotos entram pelo
painel.

---

## 4. O que é do produto (e não da loja)

Mudar o que está abaixo altera **todas** as lojas na próxima versão — é
decisão de produto, com commit, testes e deploy.

| O quê | Onde |
|---|---|
| Tema escuro, tons de cinza, cor padrão (verde `#4CD62B`), estados (sucesso, aviso, erro) | `frontend/src/styles/index.css` (`@theme`). Os contrastes estão anotados no topo do arquivo; o E2E de acessibilidade confere |
| Tipografia (Archivo, Barlow, servidas pelo próprio site) | `frontend/src/styles/index.css` e os imports `@fontsource` de `frontend/src/main.jsx` |
| Cálculo dos tons derivados da cor da loja | `frontend/src/utils/cor.js` |
| Textos fixos das páginas (títulos de seção, perguntas do financiamento, política de privacidade) | `frontend/src/pages/public/*` |
| Versão do texto de consentimento LGPD | `CONSENT_TEXT_VERSION` em `shared/src/enums.js` — mude sempre que o texto do consentimento mudar |
| Limites (fotos por moto, tamanho de arquivo, parcelas, lote de exclusão) | `shared/src/enums.js` |
| Valores padrão enquanto a loja não foi configurada ("MotorShop", sem contato) | `backend/src/modules/store/store.service.js` e `frontend/src/config/storeFallback.js` — genéricos de propósito |

> O modelo guarda também `theme.secondary` e `theme.accent`, previstos na
> arquitetura, mas o site hoje deriva tudo da cor primária — ver
> [`TECHNICAL-DEBT.md`](./TECHNICAL-DEBT.md).

---

## 5. Checklist de entrega de uma loja nova

- [ ] Banco, pasta de fotos e segredos **exclusivos** desta loja
- [ ] `create:superadmin` com o e-mail do dono; senha entregue por canal seguro
- [ ] Configurações: todas as seções da §2.3 revisadas com o dono
- [ ] Endereço do site (`siteUrl`) igual ao domínio definitivo
- [ ] Logo e imagem de compartilhamento enviados; preview conferido no WhatsApp
- [ ] Diferenciais só com promessas que a loja cumpre
- [ ] Módulos ligados conforme o contrato; taxa do simulador acordada com a financeira
- [ ] Estoque inicial com fotos e descrição
- [ ] `npm run smoke` verde no domínio; Lighthouse ≥ 90 no domínio
- [ ] Checklist de go-live do [`SECURITY.md`](./SECURITY.md) cumprido
