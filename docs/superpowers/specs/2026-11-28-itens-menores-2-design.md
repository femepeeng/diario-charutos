# 2.12.1: os 12 itens menores adiados da 2.11.1 e da 2.12.0

## Intenção

O Felipe pediu para fechar os itens menores que as revisões finais da 2.11.1 (5 itens) e da 2.12.0 (7 itens) deixaram para depois. O desenho curto foi aprovado com "Siga" em 28/11/2026. Esta versão não tem recurso novo, não muda SQL e não muda dados gravados.

## Abordagens

Cada item tem uma correção direta. O único com escolha é o item 1:

| | Abordagem | Troca |
|---|---|---|
| **A** | **Regra no app (escolhida):** quando o número de não lidas cai fora do Perfil, as que sobraram contam como não vistas | Nada muda no servidor. Custo: se o Felipe ler só parte das conversas em outro aparelho, a Conta abre uma vez a mais em Mensagens, onde ainda há mensagem não lida |
| B | SQL: `club_me()` passa a devolver a hora da última mensagem não lida, e o visto passa a ser por hora | Resolve sem desvio a mais, mas exige aplicar SQL em produção |

## Os 12 itens

| # | Problema | Correção |
|---|---|---|
| 1 | O administrador lê as conversas em outro aparelho, chega mensagem nova, e o celular só vê o número de não lidas cair (2 para 1). A Conta não abre em Mensagens | Em `viewHome`, quando as não lidas caem com o Perfil fechado, `state.msgVisto` vai a 0, e não ao novo número |
| 2 | Com texto grande (140%, tela de 360 px), a reticência esconde o ponto de mensagem nova da sub-aba Perfil | O ponto da sub-aba fica no canto superior direito do botão (`position:absolute`), fora do corte do texto |
| 3 | A trava de "Guardar no estoque" ignora o segundo toque em silêncio | O app redesenha ao travar. O botão daquele pedido mostra "Guardando…" e fica `disabled` até a gravação terminar |
| 4 | O `tests/ui-guia.js` não restaura `state.msgVisto` | O teste guarda e devolve o valor |
| 5 | Ao encerrar a sessão, "Sessão salva no diário" cobre o aviso de falha do `saveErr` | O fim da sessão vai para a função `finishSaved(wasDone)`, que só mostra "Sessão salva no diário" (ou "Alterações salvas") quando a gravação confirma |
| 6 | Uma fonte que carrega depois do `document.fonts.ready` do início deixa os rótulos da roda sem ajuste até o próximo redesenho | No redesenho da sessão, com `document.fonts.status==='loading'`, `rodaFit` roda de novo quando as fontes terminam de carregar |
| 7 | Uma nota que não é texto (número ou `null`, de backup editado à mão) não sai pelo chip, porque a busca pelo índice é estrita | A nova função pura `notaIdx(notas, val)` acha a nota pelo texto. `null` casa com `""` |
| 8 | O cartão "Fora da roda" fala em "antes da roda", mas todos os nomes de antes estão na roda | O texto passa a ser "Nota de outra versão do app ou de um backup editado à mão." |
| 9 | O teclado perde o foco ao tirar o último chip e depois de "Abrir na roda" | Sem chip, o foco vai para o primeiro botão da roda. "Abrir na roda", quando estava com o foco, passa o foco para a primeira nota da família aberta |
| 10 | Duas verificações do `ui-sabores.js` são fracas | O cursor passa a ficar no meio de `canela` (posição 2), e o ajuste dos rótulos é medido com a roda aberta em cada uma das 11 famílias |
| 11 | O CSS `.fam` e `.fam .lbl` ficou sem uso | Os dois saem |
| 12 | Miudezas | `state.rodaAnim` passa a ser zerado em `render()`, e não dentro de `viewSession`; "‹ VOLTAR" ganha a classe própria `hub-back`, com 12 unidades (uns 10 px a 360 px, antes 7,7); `normSabor` junta espaços repetidos; os regex de acento de `normSabor` e `normName` passam a usar `̀-ͯ` em vez de caracteres invisíveis |

## Restrições

- As do `CLAUDE.md`: ES5, `innerHTML`, `data-act`, `esc()`, alvos de 44 px, temas claro e escuro, de 360 a 390 px.
- Versão 2.12.1. O `APP_BUILD` recebe a data da publicação, conferida com `date` antes, porque o relógio da máquina já saltou de dia uma vez.
- Nenhum SQL e nenhum formato de dados mudam.
- Os testes de interface não gravam e restauram o estado.

## Testes

Cada correção ganha um teste que falha antes. Os itens 4 e 10 mexem nos próprios testes; a prova é uma sabotagem do código, que o teste novo pega e o antigo não pegava. O item 11 é só limpeza: as suítes inteiras continuam passando.
