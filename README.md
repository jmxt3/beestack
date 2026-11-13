# BeeStack

Camada privada de convenções do João para agentes no [OpenBot](https://openbot.run/). O designer de agentes é o [Dr. Eggbot oficial](https://openbot.run/marketplace) — este repositório não o reconstrói.

O BeeStack traz o que é da casa: a forma de um agente (um trabalho, anti-jobs, voz, quando acordar), a barra de qualidade nas nossas palavras, o handoff para o Engineering Lead, templates originais, e um ZIP de import só com material nosso.

Este repositório é **privado**. Não submete nada ao Marketplace.

## Como falar com estes agentes no OpenBot

1. Instale o aplicativo: [openbot.run/download](https://openbot.run/download) (macOS 13+, Windows 10+ x64, Linux AppImage). É gratuito para uso não comercial; uso comercial do OpenBot precisa de licença em licenses@openbot.run.
2. Ligue um provider que você já tenha (Grok serve). O OpenBot não vende modelo — cada agente usa a sua chave ou plano.
3. No Marketplace, instale o **Dr. Eggbot**. Na primeira conversa ele corre o onboarding (fuso, voz, healthchecks pausados até você ligar).
4. Importe o pacote BeeStack: gere o ZIP com `./install/build-import-zip.sh` e, no OpenBot, vá a **Server Settings → Import** e escolha o ficheiro. Isso cria o agente BeeStack (convenções da casa) com a skill `joao-openbot-conventions`.
5. Abra o chat na barra lateral e escreva. Apps iOS/Android ligam ao computador que corre o OpenBot, não a um servidor deles.
6. Para agentes de código que o Eggbot criar, adicione a skill [pstack](https://openbot.run/marketplace/skills/pstack) em Skills do agente → “Add from marketplace”. Não há API que instale uma skill do Marketplace noutro agente — isso é um passo seu. A lista está em [`install/CHECKLIST.md`](install/CHECKLIST.md).

Guia geral: [OpenBot 101](https://openbot.run/guides/openbot-101). Atenção: após o consentimento no primeiro arranque, os agentes correm com acesso amplo (`danger-full-access`).

## O que cada peça faz

| Peça | Papel |
| --- | --- |
| Dr. Eggbot (Marketplace) | Desenha e cria agentes OpenBot: intake curto, `create_agent`, verificação com `read_agent`. |
| BeeStack (este repo, import) | Aplica as convenções da casa sobre um perfil. Não cria agentes novos. |
| `skills/joao-openbot-conventions` | Língua, forma, barra de qualidade, anti-jobs da frota, handoff ao Engineering Lead. |
| `templates/` | Personas-exemplo originais (código vs. resto). Não são playbooks pstack. |
| `docs/` | Forma do agente e barra de qualidade, nas nossas palavras. |

## Barra de qualidade

Resumo: um trabalho; prosa curta e sem enchimento; não faça o que não muda o resultado; subtraia antes de acrescentar; o utilizador vê o efeito, não um ensaio; prove que funciona, com evidência. O texto completo está em [`docs/quality-bar.md`](docs/quality-bar.md). Nos agentes de código, aponte para a skill oficial `$pstack-poteto-mode` depois de instalar o pstack pelo Marketplace.

## Critérios de pronto

Estão em [`evals/DONE.md`](evals/DONE.md). Em resumo: você consegue instalar o OpenBot, o Dr. Eggbot e o ZIP BeeStack, conversar com os dois, e um agente novo que o Eggbot criar cumpre a forma da casa.

## Licença

Trabalho original neste repositório: [MIT](LICENSE). Atribuições e o que deliberadamente não está aqui: [NOTICE.md](NOTICE.md).
