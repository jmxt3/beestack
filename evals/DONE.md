# Critérios de pronto

Cada linha é uma pergunta de sim ou não, com o sítio onde se verifica. Nada disto afirma que está feito sem evidência.

## Repositório

- [ ] O repositório `jmxt3/beestack` existe e é **privado**. (Página do GitHub: o cadeado / “Private”.)
- [ ] O trabalho original está sob licença MIT, com o copyright de João Machete. (`LICENSE`)
- [ ] `NOTICE.md` atribui OpenBot, pstack (MIT, Lauren Tan), gstack (MIT, Garry Tan), e declara o que não está no repo.
- [ ] Não há código-fonte do OpenBot (PolyForm Noncommercial), nem cópia do Dr. Eggbot do Grok Bot, nem um fork das skills oficiais incluído no repo ou das 52 skills pstack. (`git grep` / revisão da árvore)

## Conteúdo da casa

- [ ] A persona do BeeStack em `agents/beestack/AGENT.md` tem os quatro campos (um trabalho, anti-jobs, voz, quando acordar), é texto original, e o `description` tem no máximo 2000 caracteres.
- [ ] O trabalho único é aplicar convenções da casa; criar agentes novos está nos anti-jobs e é do Dr. Eggbot.
- [ ] A skill `joao-openbot-conventions` tem frontmatter `name` + `description` (1–1024 caracteres) e cobre língua, forma, barra, handoff e anti-jobs da frota.
- [ ] Os modelos em `templates/` são originais e não reproduzem playbooks pstack.

## Import e conversa (o critério de produto)

- [ ] `./install/build-import-zip.sh` gera um ZIP com `openbot-import.json` (`format: openbot-agent-import`, `version: 1`) e `agents/beestack/`.
- [ ] O João instala o OpenBot, liga um provider, instala o Dr. Eggbot no Marketplace, e consegue conversar com ele. (`install/CHECKLIST.md`)
- [ ] O João importa o ZIP em Server Settings → Import, vê o BeeStack na barra lateral, e consegue conversar com ele.
- [ ] A skill `joao-openbot-conventions` aparece no agente importado.
- [ ] Num agente de código criado pelo Eggbot, o João consegue acrescentar o pstack pelo Marketplace.

## Fora deste MVP (não bloquear o “pronto”)

- Submeter ao Marketplace.
- Um agente BeeStack que substitua o Dr. Eggbot (caminho B, recusado).
- Instalar skills de Marketplace noutro agente por API (limitação do produto OpenBot).
- Templates partilháveis `openbot://agents/<id>`.
