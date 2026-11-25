# Conta como centro: Histórico, Paladar e Cesta viram sub-abas (v2.11.0)

## Intenção

O Felipe quer enxugar a barra de abas. Histórico, Paladar e Cesta saem da barra e passam a ser sub-abas da Conta, abertas para todos, com ou sem login no clube. A barra fica com Início, Acervo e Conta e passa a caber inteira a 360 px (cerca de 185 px dos 326 visíveis). Isso também resolve a pendência 5 do CLAUDE.md: a Conta, com o ponto de mensagem nova, não sai mais da tela.

## Abordagens

| | Abordagem | Troca |
|---|---|---|
| **1** | **Sub-abas na Conta, no formato `.minitabs` que o app já usa (escolhida)** | Pouco código e navegação já conhecida; o Histórico fica com duas fileiras de sub-abas |
| 2 | Conta como menu, com telas próprias e botão "Voltar" | Mais toques e um tipo de navegação novo no app |
| 3 | Sub-abas só depois do login no clube | Quem não tem convite perderia o próprio histórico, o paladar e a cesta; contraria o app funcionar sem o clube. O Felipe descartou |

## Desenho

- **Barra:** Início, Acervo, Conta.
- **Conta:** sub-abas Histórico, Paladar, Cesta e Perfil.
  - **Perfil** é o que a Conta mostra hoje: clube (login, mensagens, administração), backup, guia e instalação.
  - O Histórico mantém as sub-abas Sessões e Lado a lado.
- **Tocar em Conta:**
  - com mensagem não lida, abre o Perfil, onde está a conversa;
  - sem ela, abre a última sub-aba usada nesta sessão do app, ou o Histórico na primeira vez.
- **Ponto de mensagem nova:** aparece na aba Conta e na sub-aba Perfil.
- **Atalhos:** os links que já apontam para Histórico, Paladar, Cesta ou Conta abrem a sub-aba certa:
  - o nível no cabeçalho abre o Paladar;
  - "Fazer backup", "Ir para Conta" e o aviso do Início abrem o Perfil;
  - apagar uma sessão volta para o Histórico.
- **Resumo do diário:** o quadro de sessões, nota média e favorito continua no Acervo e em Conta › Histórico.
- **Textos:** "na aba Conta" vira "em Conta › Perfil", e "o catálogo na aba Cesta" vira "o catálogo em Conta › Cesta".
- **Alvos de toque:** as sub-abas (`.minitabs`) passam a ter 44 px de altura, a regra do projeto (hoje têm 40).

## Restrições

As do CLAUDE.md: ES5, render por `innerHTML`, `data-act`, mobile-first de 360 a 390 px, alvos de 44 px e temas claro e escuro. Nenhum dado muda, e nada muda no SQL.

## Decisões tomadas pelo Claude (para conferir)

- O nome "Perfil" para a sub-aba que reúne o que a Conta tinha.
- A última sub-aba fica só na memória da sessão do app; ao abrir o app de novo, a Conta volta ao Histórico.
- Com mensagem não lida, tocar em Conta abre o Perfil. É um ajuste feito depois da aprovação: assim o ponto leva à conversa.
- O Lado a lado continua como sub-aba do Histórico.

## Testes

- `tests/ui-guia.js` ganha a seção Navegação:
  - a barra tem Início, Acervo e Conta e cabe a 360 px;
  - a Conta abre o Histórico na primeira vez e lembra a última sub-aba;
  - as sub-abas têm 44 px.
- `tests/ui-clube.js`:
  - com mensagem nova, a aba Conta abre o Perfil;
  - o helper que abre a Conta passa a escolher a sub-aba Perfil.
- `tests/ui-curadoria.js` e `tests/ui-cesta.js` trocam a verificação "barra tem Cesta" pela das sub-abas da Conta.
- Tudo a 360 e 390 px, nos temas claro e escuro.
