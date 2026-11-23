# Aba Início com Guia de bolso interativo: plano de implementação

> **Para agentes:** sub-skill obrigatória: use superpowers:subagent-driven-development (recomendado) ou superpowers:executing-plans para executar este plano tarefa por tarefa. Os passos usam caixas de seleção (`- [ ]`) para acompanhamento.

**Objetivo:** criar a aba Início, primeira aba e tela de abertura, com o Guia de bolso em carrossel e três mini-ferramentas (Conservação, Corte, Ritmo). Versão 2.7.0.

**Arquitetura:** tudo em `index.html`, seguindo o padrão do arquivo:
- funções `viewX()` que devolvem HTML;
- `render()` com `innerHTML`;
- eventos delegados por `data-act`, `data-input` e `data-change`;
- estado em `state`.

As ferramentas são funções puras, testáveis no console. O marcador de Ritmo atualiza o DOM direto, sem `render()`.

**Tecnologias:** HTML, CSS e JS ES5 no estilo do arquivo, sem build. Os testes rodam no navegador embutido (preview `diario`, servidor Node na porta 8765).

**Especificação:** `docs/superpowers/specs/2026-11-22-inicio-guia-design.md`

## Restrições globais

- Um único arquivo, `index.html`, sem framework e sem dependências novas.
- Mobile-first, de 360 a 390 px, sem rolagem horizontal da página. Alvos de toque de pelo menos 44 px.
- Tema escuro e claro só pelos tokens CSS existentes (`--surface`, `--surface2`, `--line`, `--fg`, `--muted`, `--faint`, `--ember`, `--ember-ink`).
- Ícones em SVG inline (`viewBox 0 0 24 24`, `stroke="currentColor"`, `stroke-width 1.8`, `aria-hidden`), sem emoji.
- Conteúdo técnico só a partir do `GUIDE` existente. Nada que ensine a tragar; sem preços, lojas ou links.
- Nada novo no IndexedDB nem no Supabase.
- `APP_VERSION='2.7.0'`.

## Foco da revisão

1. **`render()` durante o Ritmo** (sincronização, toast, rerender): o intervalo não pode duplicar nem morrer em silêncio. O anel continua depois de um render. Teste na Tarefa 3.
2. **Entrada inválida na Conservação:** campo vazio, decimal com vírgula ("16,5"), valores absurdos (150%, -5 °C). Vírgula é aceita; vazio mostra uma instrução, não um erro; absurdo mostra "Confira o valor". Teste na Tarefa 2.
3. **Carrossel em 360 px:** só o carrossel rola na horizontal; `documentElement.scrollWidth <= innerWidth`. Teste na Tarefa 1.
4. **Sair da tela do guia com o Ritmo ligado** (Voltar, trocar de aba, abrir sessão): o intervalo é limpo. Teste na Tarefa 3.
5. **Sessão em andamento:** o cartão "Sessão em andamento" continua aparecendo no Início. Teste na Tarefa 1.

---

### Tarefa 1: aba Início, carrossel e regras de ouro

**Arquivos:** modificar `index.html`:
- `GUIDE` (por volta da linha 408);
- `state` (por volta da 431);
- lista de abas em `viewHome` (por volta da 776);
- roteamento de abas (por volta das 777 a 781);
- painel do guia em Conta (por volta da 1026);
- CSS perto de `.tabs`.

**Interfaces que a tarefa produz:**
- Cada item de `GUIDE` passa a ser `[titulo, html, regra]`. A regra é exatamente a da tabela da especificação.
- `GUIDE_ICONS`: array de 7 strings SVG, na ordem de `GUIDE`.
- `GUIDE_TOOL`: `{0:'umidor', 2:'corte', 4:'ritmo'}` (índice em `GUIDE` → ferramenta).
- `guideOfDay(date) -> number`: `(dia do ano, a partir de 1) % GUIDE.length`.
- `viewInicio() -> string`.
- `data-act="guia" data-id="<índice>"` abre o detalhe (Tarefa 2).

- [ ] **Passo 1. Escrever as verificações (devem falhar).** Com o preview em 390x844, no console:
  ```js
  [...document.querySelectorAll('[role=tab]')].map(b=>b.innerText).join(',') === 'Início,Acervo,Histórico,Paladar,Comparar,Conta'
  document.querySelector('[role=tab][aria-selected=true]').innerText === 'Início'
  document.querySelectorAll('.gcard').length === 7
  document.querySelector('.gcard').innerText.includes('Dica do dia')
  __t.guideOfDay(new Date(2026,0,1)) === 1   // 1º de janeiro → índice 1
  document.documentElement.scrollWidth <= innerWidth   // também em 360x780
  ```
  Expor `guideOfDay` e `humidorStatus` em `window.__t` (só para teste), já que o script roda dentro de uma IIFE.
- [ ] **Passo 2. Rodar e confirmar que falham.** O preview `diario` ainda mostra a barra antiga e não tem `.gcard`.
- [ ] **Passo 3. Implementar:**
  - acrescentar a regra em cada item de `GUIDE`;
  - criar `GUIDE_ICONS`, `GUIDE_TOOL`, `guideOfDay` e `viewInicio`;
  - `state.tab: 'inicio'`;
  - pôr a aba `['inicio','Início']` em primeiro;
  - rotear `state.tab==='inicio'`.

  Detalhes do carrossel:
  - Container `.gcar` com `display:flex; overflow-x:auto; scroll-snap-type:x mandatory; scrollbar-width:none`.
  - Cartão `.gcard`: `flex:0 0 85%; scroll-snap-align:start`; é um `<button>` com ícone, título, regra e selos "Dica do dia" e "Ferramenta".
  - Ordem dos cartões: começa no índice do dia e segue circular.
  - Pontos `.gdots` atualizados no evento `scroll` do `.gcar`, por `Math.round(scrollLeft / largura do cartão)`, sem `render()`.
  - Em Conta, trocar o painel do guia por um texto curto e o botão `data-act="tab" data-id="inicio"`, "Abrir o Guia de bolso".
- [ ] **Passo 4. Rodar as verificações do Passo 1 e confirmar que passam,** em 390x844 e 360x780. Abrir uma sessão de teste? Não: conferir no código que o bloco `live` de `viewHome` vem antes das abas, portanto aparece no Início.
- [ ] **Passo 5. Commit:**
  ```bash
  git add index.html && git commit -m "feat: aba Início com carrossel do Guia de bolso"
  ```

### Tarefa 2: detalhe do tópico e ferramentas Conservação e Corte

**Arquivos:** modificar `index.html`:
- roteamento de `state.view` em `render()`;
- handlers de `data-act`, `data-input` e `data-change`;
- novas funções perto de `cutTipOf` (por volta da linha 260).

**Interfaces:**
- Consome: `GUIDE`, `GUIDE_ICONS`, `GUIDE_TOOL` e `cutTipOf(c)` (que recebe `{vitola}`).
- Produz:
  - `state.view = 'guia'` e `state.guiaIdx: number`;
  - `viewGuia() -> string`;
  - `humidorStatus(umidade, temperatura) -> {nivel:'ideal'|'atencao'|'risco'|'vazio'|'invalido', texto:string}`, que aceita string com vírgula ou número;
  - `VITOLAS_CORTE` = `['Petit Corona','Corona','Robusto','Toro','Churchill','Lancero','Torpedo','Pirâmide','Belicoso','Perfecto']`.

**Regras de `humidorStatus`** (valores da especificação):

| Condição | Nível |
|---|---|
| algum campo vazio | `vazio` |
| umidade fora de 0–100 ou temperatura fora de -10–50 | `invalido` |
| temperatura ≥ 24 | `risco` (cita o besouro do tabaco) |
| umidade entre 65 e 70 **e** temperatura entre 16 e 18 | `ideal` |
| demais casos | `atencao` |

No nível `atencao`, o texto explica cada desvio:
- umidade acima de 70: "favorece mofo e queima irregular";
- umidade abaixo de 65: "resseca; o charuto queima rápido e quente";
- temperatura fora de 16 a 18 °C: lembra a faixa ideal.

- [ ] **Passo 1. Escrever as verificações:**
  ```js
  __t.humidorStatus('67','17').nivel==='ideal'
  __t.humidorStatus('67,5','16,5').nivel==='ideal'
  __t.humidorStatus('80','17').nivel==='atencao' && /mofo/.test(__t.humidorStatus('80','17').texto)
  __t.humidorStatus('60','17').nivel==='atencao'
  __t.humidorStatus('67','25').nivel==='risco'
  __t.humidorStatus('','17').nivel==='vazio'
  __t.humidorStatus('150','17').nivel==='invalido'
  ```
  Na interface:
  - tocar no cartão "Corte" abre o título "Corte" e mostra 10 botões de vitola;
  - tocar em "Torpedo" mostra um texto com "diagonal";
  - tocar em "Robusto" mostra "corte reto";
  - Anterior e Próximo circulam entre os 7 tópicos;
  - Voltar retorna a `state.view='home'` com a aba Início.
- [ ] **Passo 2. Rodar e confirmar que falham.**
- [ ] **Passo 3. Implementar:**
  - `viewGuia()`: cabeçalho com Voltar, eyebrow "Guia de bolso", ícone, título, regra, o HTML de `GUIDE[i][1]`, a ferramenta e Anterior/Próximo.
  - Ferramenta Conservação: `<input inputmode="decimal">` com `data-input="umid"` e `data-input="temp"`. O resultado vai num `<div id="umid-out" aria-live="polite">`, atualizado direto no evento `input`, sem `render()`, para não perder o foco.
  - Ferramenta Corte: botões com `data-act="corte"`. Guardar em `state.corteVit` e chamar `render()`.
- [ ] **Passo 4. Rodar as verificações e confirmar que passam.**
- [ ] **Passo 5. Commit:**
  ```bash
  git commit -am "feat: detalhe do guia com ferramentas de umidor e corte"
  ```

### Tarefa 3: marcador de Ritmo

**Arquivos:** modificar `index.html` (`viewGuia`, handlers e `render()`).

**Interfaces:**
- Consome: `viewGuia` e `GUIDE_TOOL[4]==='ritmo'`.
- Produz, numa variável do módulo:
  - `ritmo = {on:false, periodo:45, inicio:0, timer:null}`;
  - `ritmoStart()`, `ritmoStop()`, `ritmoPaint()`;
  - botões `data-act="ritmo-per" data-id="30|45|60"` e `data-act="ritmo-toggle"`.

Comportamento:
- `ritmoPaint()` acha `#ritmo-ring` e `#ritmo-num` e atualiza o `stroke-dashoffset` do anel SVG e os segundos restantes.
- No fim de cada ciclo: `navigator.vibrate&&navigator.vibrate(120)` e reinício.
- `setInterval` de 250 ms.
- No fim de `render()`: se `ritmo.on` e a tela não for o guia de Ritmo, chamar `ritmoStop()`; senão, chamar `ritmoPaint()`. O intervalo continua o mesmo, porque ele procura os elementos pelo id a cada tick.
- Com `prefers-reduced-motion`: sem transição no anel.

- [ ] **Passo 1. Escrever as verificações:**
  - abrir o tópico Ritmo, tocar em 30 e depois em Iniciar;
  - após cerca de 1,2 s, `#ritmo-num` mostra 29 ou 28;
  - chamar `render()` pelo console, por exemplo trocando o tema ou indiretamente; após 1 s, o número continua diminuindo e existe um só intervalo (`ritmo.timer` é o mesmo id antes e depois);
  - tocar em Voltar faz `ritmo.on===false` e `ritmo.timer===null`.

  Expor `ritmo` em `__t` para o teste.
- [ ] **Passo 2. Rodar e confirmar que falham.**
- [ ] **Passo 3. Implementar.**
- [ ] **Passo 4. Rodar as verificações e confirmar que passam.**
- [ ] **Passo 5. Commit:**
  ```bash
  git commit -am "feat: marcador de ritmo de baforada no guia"
  ```

### Tarefa 4: acabamento, versão e publicação

**Arquivos:** modificar `index.html` (`APP_VERSION`) e `CLAUDE.md`.

- [ ] **Passo 1. Verificação visual** em 360x780 e 390x844, nos temas escuro e claro: Início, detalhe de cada ferramenta e Conta. Sem rolagem horizontal, sem erros no console e alvos ≥ 44 px. Conferir com `getBoundingClientRect` nos botões de vitola, de período e de Anterior/Próximo.
- [ ] **Passo 2.** Acertar `APP_VERSION='2.7.0'`. O `window.__t` fica, expondo só `guideOfDay`, `humidorStatus` e `ritmo`.
- [ ] **Passo 3. Atualizar `CLAUDE.md`:**
  - versão 2.7.0;
  - aba Início em "Funcionalidades";
  - o Clube sai da barra e abre pela coroa;
  - o deploy agora é por `git push` a partir de `repo-diario`;
  - pendências 1 e 2 dadas como concluídas.
- [ ] **Passo 4. Commit e push:**
  ```bash
  git commit -am "v2.7.0: aba Início com Guia de bolso interativo"
  git push origin main
  ```
  Depois, consultar `https://femepeeng.github.io/diario-charutos/index.html` até aparecer `APP_VERSION='2.7.0'`.
