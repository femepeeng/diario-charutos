# Cesta: pedido montado pela afinidade (v2.10.0)

## Intenção

Hoje o Felipe faz o pedido pelo WhatsApp: pede o catálogo à loja, escolhe e escreve a solicitação. A aba Cesta assume a escolha e a escrita. Ele diz quantos charutos quer (de 3 a 8), e o app monta a cesta com o que já estava marcado para comprar, com reposição do que ele aprovou e com novidades parecidas com o que ele gosta. Depois o app escreve o texto do pedido, que ele envia pelo WhatsApp para a loja que escolher. Quando o pedido chega, os charutos vão para o Estoque do Acervo.

O catálogo do app (475 charutos) já veio das listas dessas lojas, de 19/11/2026, então os nomes batem com os que a loja usa. Como é uma foto daquele dia, a loja continua confirmando a disponibilidade.

## Objetivos

- Aba **Cesta** na barra, no lugar de Comparar: Início, Acervo, Histórico, Paladar, Cesta, Conta.
- Tamanho do pedido de 3 a 8 e filtro de origem (Todos, Cubanos, Fora de Cuba, Nacionais), para montar um pedido por loja.
- Cesta montada sozinha, em três grupos: **Da cesta** (marcados Cesta no Acervo), **Repor** (provados com "Recompraria: Sim") e **Novos** (do catálogo, pela afinidade). Cada charuto diz por que entrou e tem "Trocar".
- Texto do pedido pronto, com "Enviar pedido" (folha de compartilhamento, que abre o WhatsApp) e "Copiar".
- Pedidos enviados guardados no aparelho (um por loja, se for o caso), com "Guardar no estoque" quando chegarem.
- Afinidade que leva em conta o Acervo, e não só as notas das sessões.
- O Para provar vira a seção Catálogo da aba Cesta; o Lado a lado vira uma sub-aba do Histórico.

## Fora do escopo

Integração com loja, preço, disponibilidade em tempo real, quantidade maior que 1 por charuto (ajusta-se no WhatsApp), histórico de pedidos antigos, envio da cesta para a nuvem ou para o backup, e a barra de abas no rodapé com ícones (pendência 5 do CLAUDE.md, para uma entrega própria).

## Anti-objetivos

- Nome de loja, preço, contato ou link de compra no app ou no texto do pedido (Lei 9.294/1996, art. 3-A).
- A cesta criar ou apagar charutos no Acervo enquanto o Felipe só olha ou troca sugestões. Só "Adicionar à cesta" e "Guardar no estoque" gravam no diário.
- Sugerir charuto bem acima da faixa de força dele sem o aviso que o Para provar já mostra.
- Quebrar o Para provar ou o Lado a lado na mudança de lugar.
- O pedido marcado como chegado trazer charutos diferentes dos que foram enviados.

## Restrições

- Arquivo único (`index.html`), JavaScript ES5, render por `innerHTML`, eventos delegados por `data-act`.
- Nenhum campo novo em charuto ou sessão e nada novo no SQL. Charutos criados ou alterados pela Cesta sincronizam como hoje.
- Mobile-first (360 a 390 px, sem rolagem horizontal da página), alvos de 44 px, temas escuro e claro pelos tokens, sem emoji como ícone.
- Funções de montagem puras e testáveis em Node, como as da curadoria.

## Abordagens consideradas

**Onde a Cesta entra.** A barra tem 326 px visíveis a 360 px, e as seis abas de hoje somam 417 px (medido no app).

| | Abordagem | Troca |
|---|---|---|
| **1** | **Cesta no lugar de Comparar; Para provar dentro da Cesta; Lado a lado no Histórico (escolhida)** | A barra cai para 389 px. A Conta continua pedindo rolagem a 360 px, como hoje, mas nada novo fica escondido. Move duas funções conhecidas |
| 2 | Sétima aba ao lado de Comparar | Nada muda de lugar, mas a barra vai a 474 px, e a 360 px Cesta e Conta ficam fora da tela |
| 3 | Barra no rodapé com ícone e rótulo curto | Cabem as sete abas, mas muda a navegação de todas as telas e pede sete ícones novos |

**O que entra na cesta.**

| | Abordagem | Troca |
|---|---|---|
| **1** | **Da cesta, depois reposição (até um terço), depois novos (escolhida)** | Parece um pedido de verdade; mais regras de montagem |
| 2 | Só novos, como o Para provar | Mais descoberta; favoritos só à mão |
| 3 | Só reposição | Quem já sabe o que quer; com poucas sessões, a cesta sai curta |

O Felipe escolheu a 1 nas duas.

## Desenho

### Montagem da cesta

Uma função pura recebe o catálogo, os charutos e as sessões do diário e as opções (tamanho N, origem, lista de trocados, nomes que estão em pedidos enviados) e devolve a lista de até N charutos, quantas vagas ficaram sem candidato e quantos charutos marcados Cesta não couberam. A identidade de um charuto, em toda a montagem, é o nome normalizado (`normName`), o mesmo que a curadoria usa para "provado" e "no acervo". Nome que está num pedido enviado não entra na cesta, para o pedido seguinte não repetir o anterior.

A cesta se preenche nesta ordem, sem repetir nome:

1. **Da cesta.** Charutos do Acervo com Cesta marcada, fora os trocados e os de outra origem quando há filtro. Ordem pela pontuação de afinidade do item de catálogo de mesmo nome (sem item, conta 0), depois pela ordem do Acervo. Entram até N; os que passam disso são avisados ("2 charutos da cesta ficaram de fora; aumente o tamanho ou troque algum").
2. **Repor.** Charutos já provados cuja sessão concluída mais recente com "Recompraria" respondido diz "Sim" (a mais recente pela data de fim, ou de início quando não houver). Ficam de fora os que estão com Estoque marcado, os trocados e os de outra origem. Ordem pela média das notas, da maior para a menor, e no empate pela sessão mais recente. Ocupam até ⌊N/3⌋ vagas (1 para N de 3 a 5, 2 para N de 6 a 8), limitadas às vagas que sobraram.
3. **Novos.** A lista do catálogo pela afinidade, na ordem que a seção Catálogo mostra sem busca, sem os já provados, sem os que estão no Acervo em qualquer situação, sem os trocados e no filtro de origem. A busca do Catálogo não mexe na cesta. Para variar, os novos evitam repetir uma linha que já está na cesta e evitam passar de 2 charutos da mesma marca. Se isso deixar vagas sem candidato (Nacionais, por exemplo, têm só 3 linhas), a cesta aceita repetir linha e, se ainda faltar, repetir marca. Completam as vagas restantes.

Quando os candidatos acabam (por exemplo, Nacionais com tudo já provado), a cesta sai menor e diz quantas vagas ficaram sem opção com aquele filtro.

**Origem de um charuto do Acervo:** o segmento do item de catálogo de mesmo nome. Sem item, vale o país da origem: Cuba para Cubanos, Brasil para Nacionais, outro país para Fora de Cuba. Sem país conhecido, o charuto só entra com o filtro Todos.

**Trocar** põe o nome do charuto na lista de trocados e remonta: a vaga passa para o próximo candidato, na ordem acima. Um charuto "Da cesta" trocado continua com Cesta marcada no Acervo e só fica fora deste pedido. "Desfazer trocas" esvazia a lista.

### Afinidade com o acervo

O perfil de paladar (`tasteProfile`) passa a contar também os charutos do Acervo com Cesta ou Estoque que ainda não têm sessão com nota. Cada um reforça de leve a marca, a linha, a origem, a capa e o formato dele, com até dois charutos contados por atributo. O reforço total de um item tem teto de 0,6 ponto, abaixo do peso de uma marca com média um ponto acima da geral em duas sessões (0,8), para as notas mandarem quando existem. Os charutos já avaliados não entram no reforço, porque já pesam pelas notas.

O motivo aparece no cartão como "Parecido com o que você tem no Acervo: marca Oliva". A seção Catálogo e os Novos da cesta usam a mesma pontuação. Com o diário vazio, nada muda: a ordem continua pela força de referência, de suave a média.

### Tela da Cesta

```
Pedidos enviados                        (só aparece quando há algum)
  24/11 · Cubanos · 5 charutos                      [abre e fecha]

Cesta
Monte o pedido e envie para a loja pelo WhatsApp. O app escreve a lista;
preço e disponibilidade ficam com a loja.
Tamanho   [3] [4] [5] [6] [7] [8]
Origem    [Todos] [Cubanos] [Fora de Cuba] [Nacionais]

1  Cohiba Siglo II                                  Da cesta
   Cuba · Corona · 129 x 42
   Marcado na Cesta do Acervo                       [Trocar]
2  Montecristo Nº 4                                 Repor
   Recompraria: Sim · sua média 8,8 em 2 sessões    [Trocar]
3  …                                                Novo
   Marca Montecristo: sua média 8,8 em 2 sessões    [Trocar]

Texto do pedido (somente leitura)
[ Enviar pedido (WhatsApp…) ]  [ Copiar ]     Desfazer trocas

Catálogo  (ex-Para provar: busca, Mostrar mais, Adicionar à cesta)
```

- O tamanho começa em 5 e o app lembra o último usado. O filtro de origem é um só para a cesta e para o Catálogo.
- Os cartões da cesta seguem o `catCard` do Para provar: nome, origem, formato e bitola, força de referência, um ou dois motivos e um aviso de força quando houver.
- Com a cesta vazia (filtro sem candidatos), Enviar e Copiar ficam desativados.
- No Catálogo, o item que já está na cesta montada mostra o selo "Na cesta", e o que está num pedido enviado mostra "Pedido enviado", no lugar do botão. "Adicionar à cesta" continua criando o charuto no Acervo com Cesta marcada, e ele entra na cesta no grupo Da cesta.

### Texto do pedido

Exato, sem preço, loja nem link:

```
Olá! Gostaria de fazer um pedido:
1 Cohiba Siglo II (129 x 42)
1 Montecristo Nº 4 (129 x 42)
1 Oliva Serie V Melanio Robusto
São 3 charutos. Pode me confirmar a disponibilidade?
```

- Uma linha por charuto: "1 ", o nome e, entre parênteses, a bitola. Nome e bitola vêm do item de catálogo de mesmo nome normalizado, porque é o nome que a loja usa. Sem item, valem o nome e a vitola do Acervo, e a vitola só aparece quando preenchida.
- A última linha concorda em número ("É 1 charuto." quando sobra um só).

### Envio e chegada

- **Enviar pedido** usa a folha de compartilhamento do aparelho (`navigator.share` com o texto), como o link de convite. Sem ela (computador), fica só **Copiar**.
- Envio concluído ou cópia bem-sucedida guardam um **pedido enviado** neste aparelho: data, origem, itens e texto. Cancelar a folha de compartilhamento não guarda nada. Cada item guarda os próprios dados (nome, bitola, origem, força, capa e o id do charuto no Acervo, se houver), e não só o id do catálogo, porque esses ids mudam quando o catálogo é atualizado.
- Depois do envio, a lista de trocados se apaga e a cesta se remonta sem os nomes enviados. Dá para montar o pedido da loja seguinte na hora, com outro filtro de origem.
- Os pedidos enviados ficam numa seção acima da cesta, um bloco por pedido, que abre e fecha ("24/11 · Cubanos · 5 charutos"). Aberto, o bloco lista os charutos com o botão "Chegou" ligado em cada um, e a marcação fica guardada no pedido. Tem também "Guardar no estoque", "Reenviar" e "Descartar", que pede confirmação como as outras remoções do app e devolve os charutos à montagem.
- **Guardar no estoque** usa os itens guardados no envio, nunca a cesta remontada. Para cada charuto que chegou, procura no Acervo pelo id e depois pelo nome. Se acha, tira a marca Cesta e põe Estoque; se não acha, cria o charuto com os dados do envio e Estoque. O que não chegou e estava com Cesta continua na Cesta. Depois o pedido sai da lista, e um aviso diz quantos charutos foram para o Estoque.
- A regra de chegada também é uma função pura: recebe os itens e os charutos e devolve o que atualizar e o que criar.

### Estado

- `localStorage` `diario-cesta`: versão, tamanho, origem, lista de trocados e a lista de pedidos enviados. Leitura protegida: valor ausente ou inválido volta ao padrão (tamanho 5, Todos, sem trocas, sem pedidos).
- Fica só no aparelho, como o progresso das lições: não vai para o backup nem para o clube.

### Mudanças de lugar

- **Barra:** Comparar sai, e Cesta entra no lugar dele.
- **Histórico:** sub-abas "Sessões" (a lista de hoje) e "Lado a lado" (a tabela e o painel "Para provar a partir desta comparação", sem mudanças). O texto do Lado a lado vazio passa a apontar para o catálogo na aba Cesta.
- **Para provar:** vira a seção Catálogo da aba Cesta, com busca, Mostrar mais e Adicionar à cesta. O texto de abertura passa a dizer que a ordem segue as sessões e o Acervo.
- **Textos:** todo texto do app que cite a aba Comparar ou o Para provar passa a apontar para Histórico › Lado a lado ou para a Cesta.
- **CLAUDE.md:** versão, as áreas Cesta e Histórico, o fim da aba Comparar e os testes novos.

### Testes

- **Funções puras** (`node tests/cesta.test.js`, sobre um bloco `/* @pure:cesta */` carregado junto com a curadoria):
  - ordem de preenchimento;
  - ⌊N/3⌋ vagas de reposição;
  - "Recompraria" mais recente vale e "Talvez" não entra;
  - charuto com Estoque fora da reposição;
  - variedade por linha e marca;
  - filtro de origem, incluindo charuto sem país;
  - trocar e desfazer;
  - sobra e vagas sem candidato;
  - texto exato, com singular e plural, e sem `R$`, valor em reais, `http` ou `www`;
  - nomes de pedidos enviados fora da montagem;
  - regra de chegada: atualizar, criar e o que não chegou.
- **Curadoria** (`node tests/curadoria.test.js`): os casos de hoje continuam passando. Entram casos do reforço do acervo: sem notas, um charuto em Estoque puxa a marca dele para cima; com notas, a marca bem avaliada continua à frente; charuto já avaliado não reforça.
- **Interface** (`tests/ui-cesta.js` no navegador; `tests/ui-curadoria.js` passa a abrir o Lado a lado no Histórico e o Catálogo na Cesta). Cobre:
  - barra sem Comparar e com Cesta;
  - tamanho muda a quantidade;
  - Trocar substitui;
  - texto confere;
  - envio e cópia com `navigator.share` e `clipboard` falsos, guardando e restaurando `diario-cesta`;
  - seção de pedidos enviados, com a cesta remontada sem os nomes enviados;
  - alvos de 44 px e página sem rolagem horizontal a 360 e 390 px, nos temas claro e escuro.
- **Teste à mão:** "Guardar no estoque" e "Adicionar à cesta" gravam no diário, então são conferidos à mão num navegador sem login no clube.

### Versão e publicação

Versão 2.10.0 (recurso novo). Sem SQL, então a publicação é só o app, por `git push` com o OK do Felipe.

## Decisões tomadas pelo Claude (para conferir)

- Uma unidade de cada charuto; quantidade maior se ajusta no WhatsApp.
- Tamanho padrão 5, lembrado entre aberturas.
- Reposição: vale a resposta de "Recompraria" da sessão mais recente; "Talvez" não entra.
- Variedade nos novos é preferência: primeiro sem repetir linha e com no máximo 2 charutos da mesma marca; quando isso deixaria a cesta curta, ela repete linha e depois marca. Na primeira versão a regra era rígida, e a revisão final mostrou cestas de Cubanos e de Nacionais paradas abaixo do tamanho escolhido.
- Reforço do acervo: só charutos com Cesta ou Estoque ainda sem nota, com teto de 0,6 ponto por item.
- Charuto do Acervo sem origem conhecida só entra com o filtro Todos.
- Copiar ou enviar marca o pedido como enviado; "Descartar" desfaz e devolve os charutos à montagem.
- Vários pedidos podem estar a caminho ao mesmo tempo (um por loja). Depois de cada envio, a cesta se remonta sem os nomes enviados, e as trocas se apagam.
- No texto do pedido, nome e bitola vêm do catálogo quando há item de mesmo nome.
- "Guardar no estoque" tira a marca Cesta e põe Estoque; o que não chegou continua na Cesta.
- Os pedidos enviados ficam só neste aparelho.
- O Para provar passa a se chamar Catálogo dentro da Cesta.

## Decisões deixadas a quem implementar

- Layout fino dos cartões e microcopy secundária.
- Pesos de cada atributo no reforço do acervo, dentro do teto de 0,6.
- Formato da data do pedido enviado.
- Como a lista de trocados é limitada para não crescer sem fim (por exemplo, as 200 mais recentes).
