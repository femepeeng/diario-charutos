# 2.11.1: itens menores da Cesta e da Conta — plano de implementação

> **Para agentes:** SUB-SKILL OBRIGATÓRIA: superpowers:executing-plans (execução escolhida: Nativo). Passos com caixas (`- [ ]`).

**Objetivo:** fechar os 15 itens menores deixados pelas revisões finais da 2.10.0 e da 2.11.0, sem recurso novo, sem SQL e sem mudar dados sincronizados.

**Arquitetura:** tudo continua em `index.html` (ES5, `innerHTML`, `data-act`). A navegação ganha `state.msgVisto` (só na memória) e uma nova ordem em `viewHome`. A Cesta passa a esperar as gravações e ganha "Já enviei". Os testes de interface rodam no navegador; `pedGuardar` e `wipeLocalForAccount` ganham um teste em Node com o armazenamento trocado por dublês (`tests/app.test.js`).

**Tecnologia:** HTML, CSS e JS ES5 num arquivo; Node (`vm`, `assert`) para os testes sem navegador; navegador embutido (preview `diario`, porta 8765) para os testes de interface.

**Desenho:** `docs/superpowers/specs/2026-11-25-itens-menores-design.md`

## Restrições globais

- ES5 no app; desenho por `innerHTML`; eventos por `data-act`; texto do usuário sempre por `esc()`.
- Alvos de toque de pelo menos 44 px; sem rolagem horizontal de 360 a 390 px; temas claro e escuro.
- Nada de preço, loja, contato ou link (Lei 9.294/1996, art. 3-A). Nenhum valor técnico inventado.
- Nenhum SQL e nenhum campo sincronizado mudam. A Cesta continua só no aparelho (`localStorage diario-cesta`).
- Testes de interface não gravam no diário (`syncedAt = updatedAt`) e restauram o estado no fim.
- Versão final: `APP_VERSION='2.11.1'`, `APP_BUILD='25/11/2026'`.

## Foco da revisão

1. O administrador lê as conversas em outro aparelho (as não lidas caem) e depois chega mensagem nova: a Conta tem de voltar a abrir em Mensagens. Teste na Task 1 (queda e subida).
2. Sair e entrar com outra conta na mesma sessão do app: o `msgVisto` da conta anterior não pode esconder a mensagem nova da seguinte. Sem login, `viewHome` baixa `msgVisto` a 0; o mesmo teste de queda cobre a regra.
3. Dois toques seguidos em "Guardar no estoque": o segundo não pode tirar o pedido antes de as gravações do primeiro confirmarem. Teste em `tests/app.test.js`.
4. "Guardar no estoque" com tudo já em Estoque (nada a gravar): o pedido sai na hora. Teste em `tests/app.test.js`.
5. Texto do sistema em 130% a 360 px: o rótulo da sub-aba é cortado com reticências e não passa da borda. Conferência visual na Task 3.

---

### Task 1: navegação e acessibilidade (itens 1 a 6)

**Arquivos:**
- Modificar: `index.html`: CSS `.minitabs button` (l. 159); `novaMsg`, `contaTabs` e `viewHome` (l. 1390-1421); `case 'tab'` (l. 1965); comentários que chamam o Perfil de Conta (l. 1049, 1064, 1122, 1150).
- Testes: `tests/ui-guia.js` (seção Navegação da Conta) e `tests/ui-clube.js`.

**Interfaces:**
- Produz: `unreadMsgs(): number` (não lidas de quem está no clube; 0 fora dele); `novaMsg(): boolean` = `unreadMsgs()>0` (o ponto, sem mudança); `msgNaoVista(): boolean` = `unreadMsgs()>(state.msgVisto||0)` (o desvio para o Perfil). `viewHome` grava `state.msgVisto=unreadMsgs()` ao desenhar o Perfil e baixa `state.msgVisto` até `unreadMsgs()` quando elas caem.
- No desvio de administrador: `cloud.club.sec='mensagens'`, `cloud.club.open=null`.

- [ ] **Passo 1: testes do `ui-guia.js`.** Na seção Navegação da Conta, guardar e restaurar `diario-dirty` e `diario-last-backup`. Verificações novas:
  - `a barra se chama Seções para o leitor de tela`: `q('.tabs').getAttribute('aria-label') === 'Seções'`.
  - `as sub-abas cortam o rótulo com reticências`: nas 4 sub-abas, `textOverflow === 'ellipsis'` e `overflowX === 'hidden'`.
  - Com `diario-dirty='2'` e `diario-last-backup='1'` (faixa de backup ligada) e uma sessão com nota (resumo ligado), percorrendo Início, Acervo e as 4 sub-abas: `a barra fica no mesmo lugar em Início, Acervo e nas quatro sub-abas` (topo de `.tabs` igual nas 6) e `as sub-abas da Conta ficam no mesmo lugar nas quatro`.
  - `o resumo e a faixa de backup vêm abaixo das abas`: no Acervo, `.banner` e `.stats` depois de `.tabs`; no Histórico, depois da fileira da Conta.
  - `Fazer backup abre o Perfil com a Conta marcada`.
  - As três verificações que dependem do clube configurado (linha de estado, texto do Clube e "Ir para Conta") só rodam com `cloud.configured`; sem ele, entram como `pula`.
- [ ] **Passo 2: testes do `ui-clube.js`.** Guardar e restaurar `state.msgVisto`; zerar no começo de cada parte. Inscrito: `"Ver" do aviso abre o Perfil com a Conta marcada e marca o aviso como lido`; `a coroa abre o Clube sem nenhuma aba da barra marcada`; `do Clube, a aba Conta abre a última sub-aba` (última = Paladar). Administrador, com `unread_msgs` 2:
  - `administrador com mensagem nova: a Conta abre o Perfil em Mensagens` (`state.tab==='conta'`, `cloud.club.sec==='mensagens'`, linha do inscrito M na caixa de entrada).
  - `sem mensagem nova desde o desvio, a Conta abre a última sub-aba e o ponto continua` (última = Cesta).
  - `mensagem nova depois do desvio: a Conta volta a abrir em Mensagens` (`unread_msgs` 3).
  - `não lidas caem e depois chega uma nova: a Conta volta a abrir em Mensagens` (0, depois 1).
  - Renomear para Perfil as verificações que falam do Perfil (painel Mensagens, marcar como lida, avisos, regras, rolagem, suspenso, painel Administração).
- [ ] **Passo 3: rodar e ver falhar.** `ui-guia` e `ui-clube` a 360 px. Esperado: FAIL em Seções, reticências, as duas da barra parada, resumo abaixo e as quatro do administrador. Passam já: Fazer backup, Ver e coroa (o código está certo).
- [ ] **Passo 4: conferir que os testes do código já certo pegam o erro.** Quebrar de propósito, rodar, ver FAIL, desfazer: `case 'avisover'` com `state.tab='historico'` (Ver); botão da faixa com `data-id="historico"` (Fazer backup); `case 'tab'` com `'historico'` no lugar de `state.contaSec||'historico'` (volta do Clube). Depois, `git diff` só com o que é desta tarefa.
- [ ] **Passo 5: implementar.** CSS `overflow:hidden; text-overflow:ellipsis` em `.minitabs button`; `aria-label="Seções"` na barra; em `viewHome`, a faixa de backup e o resumo passam para depois da barra e de `contaTabs()`; `unreadMsgs`, `msgNaoVista` e o desvio no `case 'tab'`; comentários.
- [ ] **Passo 6: rodar e ver passar.** Os quatro `ui-*.js` a 360 px, sem FAIL. Com `__t.cloud.configured=false` só na memória, `ui-guia` sem FAIL e com 3 `pula`; depois voltar a `true`.
- [ ] **Passo 7: testes em Node.** `node tests/guia.test.js`, `node tests/curadoria.test.js`, `node tests/clube.test.js` e `node tests/cesta.test.js`, todos com 0 falhas.
- [ ] **Passo 8: commit** `fix: Conta abre Mensagens para o administrador só com mensagem nova; barra parada e acessível`.

### Task 2: Cesta (itens 7 a 14)

**Arquivos:**
- Modificar: `index.html`: `cestaRepor`, `cestaPlan` (vagas de Repor) e `pedidoItem` (bloco `@pure:cesta`, l. 671-710); `put` (l. 957); `wipeLocalForAccount` (l. 1322); campos preservados em `render` (l. 1367); `cestaAcoesHtml`, `cestaRegistrar`, `copyPedido`, `enviadosHtml` e `pedGuardar` (l. 1644-1665); `case 'cestacopiar'`, `case 'pedreenviar'` e o novo `case 'cestajaenviei'` (l. 2006-2009).
- Criar: `tests/app.test.js`.
- Testes: `tests/cesta.test.js`, `tests/ui-cesta.js`, `tests/ui-curadoria.js`.

**Interfaces:**
- Produz:
  - Os itens de `cestaRepor` ganham `st: number`: a força da sessão concluída mais recente que tem força de 1 a 5 (0 se nenhuma). As entradas Repor de `cestaPlan(...).list` levam `st`.
  - `pedidoItem(e)`: sem item do catálogo e sem charuto do Acervo, `origin` e `wrapper` vêm de `cigarAttrs({name:e.name})` (`country`, `wrapper`) e `strength` é `e.st||0`.
  - `put(col,obj): Promise<boolean>`: `true` gravou, `false` falhou (o aviso continua em `saveErr`).
  - `pedGuardar(id): Promise<boolean>`: tira o pedido só se todas as gravações derem `true`. Se alguma der `false`, recarrega o estado do IndexedDB (`loadAll`) e mantém o pedido. Enquanto grava, `state.pedGuardando=id` e outro toque não faz nada.
  - `copyPedido(text, ok, fbId, fail)`: `fail()` roda antes de selecionar o texto.
  - `state.cestaCopia: string`: o texto cuja cópia falhou. `cestaRegistrar` o limpa. O botão `data-act="cestajaenviei"` ("Já enviei") aparece enquanto `state.cestaCopia === pedidoTexto(plan.list)`.

- [ ] **Passo 1: teste em `tests/cesta.test.js`.** `Repor de sessão avulsa: força da sessão mais recente; origem e capa pela marca`. Sessões avulsas (sem charuto no Acervo), todas concluídas: "Romeo y Julieta Edição Rara" com força 5 em 02/11 e 3 em 11/11 (Recompraria: Sim); "Charuto da feira" com força 4 em 10/11 (Sim) e sem força em 12/11 (sem resposta). `cestaPlan(ITEMS, [], AV, {size:6})`, entradas Repor passadas por `pedidoItem`:

  ```js
  assert.deepStrictEqual([rj.origin, rj.strength, rj.wrapper], ['Cuba', 3, 'cubana']);
  assert.deepStrictEqual([fe.origin, fe.strength, fe.wrapper], ['', 4, '']);
  ```
- [ ] **Passo 2: criar `tests/app.test.js`.** Extrai de `index.html`, casando as chaves, as funções `put`, `saveErr`, `pedById`, `pedGuardar`, `wipeLocalForAccount`, `clone`, `cigarById`, `upsertState`, `sortAll` e `uid`, mais os blocos `@pure:curadoria` e `@pure:cesta`, e roda tudo num `vm` com dublês de `putRec`, `clearStore`, `loadAll`, `ls`, `toast`, `render`, `cestaPersist`, `scheduleSync` e `sync`. Pedido de teste: Cohiba Siglo II (k1, no Acervo com Cesta) e Montecristo Nº 4 (fora do Acervo), as duas gravações. Testes:
  - `Guardar no estoque espera as gravações: o pedido só sai depois que todas confirmam` (com as gravações pendentes, o pedido continua; depois de confirmadas, sai, e o aviso diz "2 charutos foram para o Estoque").
  - `uma gravação que falha mantém o pedido, recarrega o estado e pede para tentar de novo` (`loadAll` 1 vez; último aviso com "Tente de novo"; nenhum aviso de sucesso).
  - `dois toques seguidos: o pedido só sai quando as gravações do primeiro confirmam` (2 gravações no total).
  - `com tudo já no Estoque, nada a gravar: o pedido sai na hora` (0 gravações).
  - `Apagar os registros do aparelho também zera a Cesta` (`cesta` volta a `{v:1,size:5,seg:'todos',fora:[],enviados:[]}` e `diario-cesta` sai do localStorage).
- [ ] **Passo 3: testes do `ui-cesta.js`.** O corpo inteiro passa para `try { } catch (e) { check('sem exceção no teste: ' + e.message, false) } finally { restaura navigator e estado }`. Verificações novas:
  - `cada Chegou diz o nome do charuto ao leitor de tela` (`aria-label === 'Chegou: ' + nome`).
  - `Reenviar com falha no compartilhamento copia o texto e avisa` (o texto copiado é `pedido.texto`; o aviso diz "O pedido foi copiado") e `Reenviar cancelado não copia nada`.
  - Com a cópia falhando: `cópia que falha mostra Já enviei, com 44 px, sem guardar o pedido e com o texto todo selecionado`; `a seleção do texto sobrevive ao redesenho` (outro elemento, com foco e seleção do início ao fim); `Já enviei some quando a cesta muda` (Trocar); `Já enviei guarda o pedido com o texto que ficou na tela` (depois de Desfazer trocas).
- [ ] **Passo 4: `ui-curadoria.js`** com o mesmo `try/catch/finally`.
- [ ] **Passo 5: rodar e ver falhar.** `node tests/cesta.test.js` (1 FAIL), `node tests/app.test.js` (4 FAIL; "nada a gravar" já passa) e `ui-cesta` a 360 px (FAIL em Chegou, Reenviar com falha, Já enviei e seleção).
- [ ] **Passo 6: implementar** conforme as Interfaces. O aviso do Reenviar com falha: "Não foi possível abrir o compartilhamento. O pedido foi copiado." O aviso da cópia que falha: "Selecione e copie o texto do pedido. Depois de enviar, toque em Já enviei." O "Já enviei" guarda com "Pedido guardado em Pedidos enviados.". `wipeLocalForAccount` faz `cesta=cestaLoad(null)` e apaga `diario-cesta`.
- [ ] **Passo 7: rodar e ver passar.** Os cinco testes em Node e os quatro `ui-*.js` a 360 px, sem FAIL. Conferir o `finally` quebrando de propósito, só na memória: `__t.cesta` lançando erro na 6ª chamada durante o `ui-cesta`, e `__t.render` na 3ª durante o `ui-curadoria`. O resultado tem de trazer `sem exceção no teste` como FAIL, e `__t.state.cigars` tem de voltar a ser o original.
- [ ] **Passo 8: commit** `fix: Cesta espera a gravação, ganha Já enviei e não perde a seleção`.

### Task 3: fechamento (item 15)

**Arquivos:**
- Modificar: `index.html` (`APP_VERSION` e `APP_BUILD`, l. 315) e `CLAUDE.md`.

- [ ] **Passo 1: versão** `2.11.1` e `25/11/2026`.
- [ ] **Passo 2: CLAUDE.md.** Versão atual; Navegação (`msgNaoVista` e `state.msgVisto`, o administrador abre em Mensagens, o resumo e a faixa de backup abaixo das abas); Arquitetura, "ao abrir o Perfil"; Cesta ("Já enviei", "Guardar no estoque" espera as gravações, Reenviar com falha copia, Repor avulso com a força da sessão e a origem e a capa pela marca, troca de conta zera a Cesta); Testes, `node tests/app.test.js` e o que ele cobre.
- [ ] **Passo 3: verificação.** Os cinco testes em Node e `node supabase/tests/fase2.test.mjs`. Os quatro `ui-*.js` a 360×800 e 390×844, nos temas claro e escuro. Console sem erro. Captura de tela de Conta › Histórico a 360 px no escuro. Sub-abas com a letra forçada a 18,2 px (14 × 1,3): reticências visíveis, sem passar da borda.
- [ ] **Passo 4: commit** `feat: 2.11.1 com os itens menores da Cesta e da Conta`.
