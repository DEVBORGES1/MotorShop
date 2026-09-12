# MotorShop

Plataforma web para lojas de motos usadas e seminovas — site público,
catálogo com busca e filtros, geração de leads e painel administrativo.

Construída como **produto base**: a primeira implementação é uma loja fictícia
de demonstração, e a plataforma é projetada para ser personalizada e revendida
a outras lojas **por configuração, sem alteração de código**.

---

## ⚠️ Status: FASE 0 — Arquitetura

Este repositório contém, neste momento, **apenas a documentação de
arquitetura**. Nenhum código de aplicação foi escrito e nenhuma dependência foi
instalada.

| Documento | Conteúdo |
|---|---|
| **[docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)** | Análise do estado atual, arquitetura, modelos, API, autenticação, segurança, banco, imagens, SEO, performance, deploy, escalabilidade, decisões técnicas e riscos |
| **[docs/ROADMAP.md](./docs/ROADMAP.md)** | Fases 0 a 13, com objetivo, funcionalidades, arquivos, dependências, critérios de conclusão e testes |

A implementação (FASE 1) **aguarda autorização**, junto com as respostas às
decisões pendentes **A–I** (§15 do ARCHITECTURE).

---

## Stack definida

**Frontend:** React 18 · JavaScript (ESM) · Vite · React Router 6 · Axios ·
Tailwind CSS
**Backend:** Node.js 22 · Express 4 · API REST · JWT · Zod
**Banco:** MongoDB Atlas · Mongoose ([por que não Prisma](./docs/ARCHITECTURE.md#d-01--mongoose-em-vez-de-prisma--decidido))
**Imagens:** Cloudinary, atrás de uma porta de armazenamento substituível

## Arquitetura

```
React → Axios → API REST → Routes → Controllers → Services → Repositories → Models → MongoDB
```

O frontend **nunca** acessa o banco diretamente. Detalhes em
[ARCHITECTURE §3](./docs/ARCHITECTURE.md#3-arquitetura).

## Estrutura prevista

```
MotorShop/
├─ backend/     API REST (Express + Mongoose)
├─ frontend/    SPA React (Vite)
├─ shared/      enums e schemas Zod usados pelos dois lados
├─ docs/        documentação
├─ .env.example
└─ README.md
```

---

## Como rodar

Ainda não aplicável — não há código. A partir da FASE 1, esta seção conterá
instalação, variáveis de ambiente e scripts.

Pré-requisitos já previstos: Node.js 22+, conta no MongoDB Atlas e conta no
Cloudinary.

## Variáveis de ambiente

Ver [`.env.example`](./.env.example). Nenhum segredo é versionado.
Variáveis `VITE_*` são **públicas** por definição (vão para o bundle) — nenhum
segredo pode ser colocado nelas.

## Segurança

Tratada desde a FASE 1, não ao final: Helmet, CORS configurável, rate limiting,
validação com Zod, argon2id para senhas, JWT curto com refresh token em cookie
`httpOnly`, limite de payload, erros centralizados sem stack em produção e logs
com redaction. Ver [ARCHITECTURE §8](./docs/ARCHITECTURE.md#8-segurança).

## Licença

Proprietário. Todos os direitos reservados.
