# Checklist de instalação

Passos manuais. Nada disto gasta créditos nossos nem publica o repositório. O OpenBot usa um provider que o João já tenha.

## 1. Aplicativo OpenBot

- [ ] Instalar a partir de [openbot.run/download](https://openbot.run/download).
- [ ] Ligar um provider (Grok serve).
- [ ] Ler o aviso do primeiro arranque: após consentimento, os agentes correm com acesso amplo.

## 2. Dr. Eggbot (designer)

- [ ] Marketplace → instalar **Dr. Eggbot**.
- [ ] Abrir o chat e mandar a primeira mensagem (onboarding: fuso, voz, healthchecks vêm pausados até os ligar).
- [ ] Confirmar que consegue criar um agente de teste e que o perfil ao vivo corresponde ao que pediu.

## 3. Pacote BeeStack (convenções da casa)

- [ ] Neste repositório, correr `./install/build-import-zip.sh`. O ZIP fica em `install/dist/beestack-openbot-import.zip`.
- [ ] OpenBot → **Server Settings → Import** → escolher esse ZIP → importar o agente BeeStack.
- [ ] Abrir o BeeStack na barra lateral e pedir um parecer sobre um perfil (o do teste, ou um rascunho).
- [ ] Confirmar que a skill `joao-openbot-conventions` veio com o agente.

## 4. pstack, nos agentes de código

- [ ] No agente de código (o que o Eggbot criou), Skills → “Add from marketplace” → [pstack](https://openbot.run/marketplace/skills/pstack).
- [ ] Confirmar no perfil ou na lista de skills do agente. A API do OpenBot não instala skills de Marketplace noutro agente; este passo é sempre manual.

## 5. Pronto a trabalhar

- [ ] Conversar com o Dr. Eggbot para desenhar o próximo agente, usando os modelos em `templates/` se ajudar.
- [ ] Passar o perfil pelo BeeStack antes de o dar como fechado.
- [ ] Trabalho de implementação vai para o Engineering Lead; o Eggbot e o BeeStack não o fazem.
