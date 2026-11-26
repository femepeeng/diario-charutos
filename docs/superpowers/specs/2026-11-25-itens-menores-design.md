# 2.11.1: os 15 itens menores da Cesta (2.10.0) e da Conta (2.11.0)

## Intenção

O Felipe pediu, ao publicar a 2.11.0, uma correção que junte os itens menores deixados pelas revisões finais da 2.10.0 (Cesta) e da 2.11.0 (Conta como centro). Nenhum quebra o app hoje. Juntos, eles deixam a navegação estável, evitam perder um pedido quando o celular falha ao gravar e fecham lacunas de teste e de acessibilidade.

Fora do escopo: qualquer recurso novo, mudança de dados sincronizados ou de SQL.

## Abordagens

| | Abordagem | Troca |
|---|---|---|
| **1** | **Uma versão de correção (2.11.1) com os 15 itens, em três blocos: navegação, Cesta e documentação (escolhida)** | Uma revisão final só; os itens são pequenos e independentes |
| 2 | Uma versão por item ou por área | Mais publicações e mais revisões para mudanças de poucas linhas |
| 3 | Corrigir só os itens que o usuário vê | Deixaria lacunas de teste e a falha de gravação do pedido |

## Desenho

### Navegação e acessibilidade (itens da 2.11.0)

1. **Mensagem nova para o administrador.** Quando a mensagem nova faz a Conta abrir o Perfil e quem toca é administrador, a Administração abre na seção Mensagens. O desvio para o Perfil só se repete quando chega mensagem nova desde o último desvio (`state.msgVisto`, só na memória); o ponto continua aceso enquanto houver mensagem não lida. Para o inscrito nada muda: abrir o Perfil já marca a conversa como lida.
2. **Testes que faltavam:** a volta pela coroa (nenhuma aba marcada no Clube; ao tocar em Conta, valem as regras), o "Fazer backup" e o "Ver" do aviso abrem o Perfil com a Conta marcada. Como o código já está certo, cada teste é conferido quebrando o código de propósito (o teste tem de falhar) e desfazendo.
3. **ui-guia com o clube desativado:** as três verificações que dependem do clube configurado só rodam com `cloud.configured`.
4. **Barra parada.** O resumo do diário (sessões, nota média, favorito) e a faixa "Há registros novos sem backup" passam para baixo das fileiras de abas. O resumo abre o conteúdo do Acervo e do Histórico. Assim a barra e as sub-abas da Conta ficam no mesmo lugar em todas as abas. O cartão de sessão em andamento continua acima da barra (ele não muda de uma aba para outra).
5. **Nomes:** a barra ganha `aria-label="Seções"`. O CLAUDE.md (refreshClub "ao abrir a Conta"), os comentários do código e os nomes de verificações do ui-clube passam a dizer Perfil onde é o Perfil.
6. **Texto grande do sistema:** as sub-abas (`.minitabs`) cortam o rótulo com reticências quando ele não cabe, em vez de passar da borda. A 100% de texto nada muda.

### Cesta (itens da 2.10.0)

7. **Guardar no estoque espera a gravação.** O pedido só sai de Pedidos enviados depois que todas as gravações no celular confirmarem. Se alguma falhar, o pedido fica, e o aviso diz para tentar de novo.
8. **Apagar os registros do aparelho** (troca de conta) também zera a Cesta deste aparelho, que guardava pedidos e trocas da conta anterior.
9. **"Já enviei".** Quando a cópia falha e o texto fica selecionado para copiar à mão, aparece o botão "Já enviei", que guarda o pedido como os outros envios. Ele some se a cesta mudar.
10. **"Chegou" com nome:** cada botão diz para o leitor de tela "Chegou: nome do charuto".
11. **Reenviar não fica em silêncio:** se o compartilhamento falhar (sem ser cancelado), o app copia o texto e avisa.
12. **Repor de sessão avulsa:** o charuto criado na chegada recebe a força sentida na sessão mais recente e, quando a marca é conhecida, a origem e a capa que o app já deduz da marca (Romeo y Julieta → Cuba, capa cubana). Sem marca conhecida, a origem fica vazia: nada é inventado.
13. **Seleção que some:** o texto selecionado do pedido sobrevive ao redesenho da sincronização, como já acontece com a busca e as mensagens.
14. **Testes da Cesta e da curadoria** restauram o estado mesmo quando uma verificação quebra no meio (try/finally).

### Fechamento

15. Versão 2.11.1, CLAUDE.md e verificação a 360 e 390 px, nos temas claro e escuro.

## Restrições

As do CLAUDE.md: ES5 no app, `innerHTML`, `data-act`, `esc()`, alvos de 44 px, sem rolagem horizontal de 360 a 390 px, temas claro e escuro, nada de preço, loja ou link, e nenhum valor técnico inventado. Nenhum dado sincronizado e nenhum SQL mudam.

## Decisões tomadas pelo Claude (para conferir)

- O desvio do item 1 só se repete com mensagem nova; antes, repetia enquanto houvesse qualquer mensagem não lida.
- No item 4, o resumo do diário e a faixa de backup descem também no Acervo, e não só na Conta, para a barra nunca pular.
- No item 6, reticências em vez de diminuir a letra: quem aumentou o texto do sistema continua com letra grande.
- No item 12, a força vem da sessão (a força sentida pelo próprio Felipe), e a origem só da marca.
- Os itens 7 e 8 tocam no armazenamento e não podem rodar nos testes de interface (gravariam no diário). Eles ganham um teste em Node que roda a função do app num ambiente isolado, com o armazenamento trocado por dublês.

## Testes

- `tests/app.test.js` (novo): Guardar no estoque e Apagar os registros, com dublês.
- `tests/cesta.test.js`: Repor de sessão avulsa.
- `tests/ui-cesta.js`: Já enviei, Chegou com nome, Reenviar com falha e seleção que sobrevive ao redesenho.
- `tests/ui-clube.js`: administrador abre em Mensagens e o desvio só se repete com mensagem nova; volta pela coroa; "Ver" do aviso.
- `tests/ui-guia.js`: barra parada entre as abas, nome da barra, reticências nas sub-abas, "Fazer backup" e as três verificações protegidas.
- Tudo a 360 e 390 px, nos temas claro e escuro.
