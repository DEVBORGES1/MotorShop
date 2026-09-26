# Instruções do projeto

## Commits

**Autoria:** todo commit deve ser autorado e commitado como o dono do projeto:

```
João Vitor <joaovitorpereira.10112@gmail.com>
```

No início de cada sessão, configure antes de commitar:

```bash
git config user.name "João Vitor"
git config user.email "joaovitorpereira.10112@gmail.com"
```

**Não adicione linhas de atribuição ao Claude** nas mensagens de commit — nem
`Co-Authored-By:`, nem `Claude-Session:`, nem "Generated with". O commit deve
aparecer no GitHub com um único perfil: o do dono do projeto.

**Branch:** commitar direto na `main`, salvo instrução em contrário.

**Ao concluir cada fase:** rodar `npm run verify`, commitar na `main` e fazer
`git push` — sem esperar pedido. Antes do push, conferir que o commit tem só a
conta do dono como autor e committer, sem nenhuma linha de coautoria.

**Mensagens:** em português, no formato `tipo: descrição` (`feat:`, `fix:`,
`docs:`, `refactor:`, `test:`, `chore:`). O corpo explica *o que* mudou e
*por quê*, incluindo problemas encontrados e corrigidos.

## Antes de commitar

```bash
npm run verify    # lint + format + testes + build
```

Não commite com a verificação falhando.

## Orientação do projeto

Plataforma para lojas de motos, desenvolvida como **produto base** revendável —
nenhum dado de loja (nome, WhatsApp, cores, endereço) pode ser escrito
diretamente no código.

| Documento | Conteúdo |
|---|---|
| `docs/ARCHITECTURE.md` | Arquitetura, modelos, API, decisões e riscos |
| `docs/ROADMAP.md` | Fases 0 a 13, com critérios de conclusão |
| `docs/SETUP.md` | Configuração do ambiente local |
| `docs/SECURITY.md` | Segurança verificada, OWASP Top 10, LGPD e checklist de go-live |
| `docs/DEPLOYMENT.md` | Deploy, backup, rollback, monitoramento e operação |
| `docs/API.md` | Referência de endpoints, como construídos |
| `docs/CUSTOMIZATION.md` | Como configurar a plataforma para uma loja nova |
| `docs/FINAL-AUDIT.md` | Auditoria final: matriz de requisitos, revenda, acessibilidade |
| `docs/TECHNICAL-DEBT.md` | Débito técnico conhecido e backlog pós-lançamento |
| `docs/design/README.md` | Protótipo visual de referência e tokens de design |

**O trabalho é executado por fases.** Não implemente funcionalidades de fases
seguintes sem autorização explícita do dono do projeto.

### Regras de camada

- Rota não acessa banco · controller não tem regra de negócio
- Componente React não conhece Axios — a chamada HTTP vive em `services/`
- Nenhuma URL de API fora de `frontend/src/config/env.js`
- Nenhum acesso a `process.env` fora de `backend/src/config/env.js`
- Segredo nunca em variável `VITE_*` (elas vão para o bundle e são públicas)
