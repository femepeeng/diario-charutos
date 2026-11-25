# Diário de Degustação: contexto do projeto

PWA para registrar sessões de degustação de charutos por terço, com cronômetro, foto da anilha, notas de sabor, análise de paladar, gamificação e, opcionalmente, um clube fechado (Supabase).

- **Dono:** Felipe (usuário GitHub `femepeeng`). Responde em português do Brasil.
- **Produção:** https://femepeeng.github.io/diario-charutos/ (GitHub Pages, branch `main`, raiz).
- **Versão atual:** 2.10.0 (24/11/2026). Constantes `APP_VERSION` e `APP_BUILD` no topo do script de `index.html`, exibidas no rodapé da home.
- **Repositório local:** `C:\Users\femep\Documents\ClaudeDesing\repo-diario` (clone de `femepeeng/diario-charutos`). O Claude faz commit e `git push` direto para a `main`, com o OK do Felipe; o GitHub Pages publica em 1 a 2 minutos.

## Arquivos

| Arquivo | Papel |
|---|---|
| `index.html` | App inteiro: HTML, CSS e JS em um arquivo, sem build e sem framework |
| `sw.js` | Service worker. Página e `config.js` vêm da rede primeiro; o resto vem do cache primeiro. Cache `diario-v2`. Mudou um asset em cache? Suba a versão do cache |
| `config.js` | `window.CLUBE_CONFIG = {url, key}` do Supabase. **Vazio = clube desativado** (o app funciona só como diário local) |
| `supabase.js` | Bundle UMD de `@supabase/supabase-js@2.117.2`, vendorizado para funcionar offline |
| `manifest.webmanifest`, `icon-*.png` | Instalação como app |
| `supabase/supabase-clube.sql` | Fase 1: esquema, RLS e funções do clube. **A pasta `supabase/` não vai para o GitHub** (repo público; o SQL gera o código de fundador de uso único). Está no `.gitignore` |
| `supabase/supabase-clube-fase2.sql` | Fase 2 (app 2.9.0): administração, mensagens, avisos e suspensão. Aplique depois da fase 1; se rodar a fase 1 de novo, rode a fase 2 logo em seguida (a fase 1 recria funções e permissões na versão anterior). **Publique o SQL antes do app**; o app tolera a ordem inversa e esconde os painéis novos |
| `supabase/tests/fase2.test.mjs` | 31 casos das regras de acesso num Postgres embutido (PGlite 0.3.0, instalado em `supabase/node_modules` com `npm install`), com stubs de `auth`, `storage` e do privilégio padrão do Supabase |

## Arquitetura

- **Offline-first.** IndexedDB `diario-degustacao` (versão 2), com os stores `cigars`, `sessions`, `photos` (blobs) e `tombstones`. O celular é a fonte da verdade; a nuvem é cópia e vitrine do clube.
- **Render.** Função `render()` com `innerHTML` a partir de `state`. Eventos são delegados por `data-act` (click), `data-input` (input) e `data-change`/ids (change). Na tela de sessão, a edição fica em `draft` e é salva com debounce (`scheduleSave` → `flush` → `put`).
- **Sincronização** (`sync()`, só se `config.js` estiver preenchido e o usuário for membro): sobe fotos ainda não enviadas, aplica tombstones, faz upsert por `(owner_id, local_id)`, puxa os registros próprios e mescla por `client_updated_at` (last-writer-wins). A chave localStorage `clube-owner` impede misturar diários de contas diferentes no mesmo aparelho.
- **Clube:** login por e-mail e senha (o SMTP padrão do Supabase só envia para a equipe do projeto, por isso "Confirm email" fica desligado), convite por código (`join_club`, `create_invite`), feed de sessões com `visibility='club'` e `status='concluida'`, curtidas, comentários e `delete_my_account` (LGPD). As regras de acesso foram testadas em Postgres (36 casos).
- **Administração do clube (fase 2):** `club_me()` devolve o estado de quem chama (administrador, suspenso, mensagens não lidas, aviso não lido mais recente) e registra o último acesso a cada 10 min. Conversa por inscrito em `messages` (escrita só por `send_message`), avisos em `announcements`, funções `admin_*` que checam `is_admin()`. Membros só leem `id, display_name, is_admin, created_at` dos perfis; o resto sai pelas funções. Suspenso deixa de ser membro (`is_member()`), perde feed e sincronização, e as sessões dele somem do feed, mas a conversa continua. **O dono sempre lê e apaga os próprios registros** (políticas `cigars_owner_read`/`_delete` e `sessions_owner_read`/`_delete`): se a nuvem devolver lista vazia ao dono, a `mergeRemote` apaga do celular tudo o que já tinha subido. Pelo mesmo motivo, `canSync()` só libera com o estado do clube confirmado nesta sessão (`cloud.me` ou `cloud.clubMissing`). No app, a camada `clubApi` faz as chamadas e `refreshClub()` atualiza ao abrir, ao voltar para o app (no máximo 1x/min) e ao abrir a Conta.
- **Backup:** exporta e importa JSON `{app:'diario-degustacao', version:1, cigars, sessions, photos:[{id, dataUrl}]}`.

## Modelo de dados (local)

- **cigar:** `id, name, origin, vitola, strength(1-5), status, expected, pairing, wrapper, order, bandId, updatedAt, syncedAt`
  - `status` é uma lista separada por vírgula com `cesta` e/ou `estoque`. Vazio = `historico`, exibido como **Arquivo**.
  - `wrapper` é uma chave de `WRAPPERS` (connecticut, habano, corojo, camaroes, sumatra, maduro, natural, cubana, matafina).
- **session:** `id, cigarId, cigarName, status('aberta'|'concluida'), visibility('club'|'private'), createdAt, endedAt, moment, drink, thirds[3]{notes[], intensity, text}, strength, burn, draw, feel, rating(0-10, passo 0,5), rebuy, comment, timer{acc, running, resumedAt}, durationMin, bandId, mission, updatedAt, syncedAt`
  - `mission` e o progresso de lições (`localStorage diario-licoes`) não sobem para a nuvem.
- **cesta** (`localStorage diario-cesta`, lido por `cestaLoad` e gravado por `cestaPersist`): `{v:1, size(3-8), seg('todos'|'c'|'f'|'n'), fora[], enviados[]}`.
  - `fora` guarda as trocas (nomes normalizados, até 200).
  - `enviados` guarda até 20 pedidos `{id, em, seg, itens[{key, name, bitola, origin, strength, wrapper, cigarId, veio}], texto}`. Cada item guarda os dados do charuto, e não o id do catálogo (`linha-índice`), que muda quando o catálogo é atualizado.
  - Fica só no aparelho: fora do backup e do clube. Valor ausente ou inválido volta ao padrão (tamanho 5, Todos).

## Funcionalidades por área

- **Acervo:** filtros Todos/Cesta/Estoque/Arquivo, botões Cesta e Estoque, editar e remover charuto, ficha do charuto (formato pela bitola, capa, terroir, corte) e sugestão da próxima degustação.
- **Sessão:** cronômetro, momento (pré-preenchido com o da última sessão), bebida, foto da anilha (câmera ou galeria), notas por terço em 8 famílias (incluindo "Gostos na boca"), missão de aroma, dicas do guia por terço e fechamento com força, queima, tiragem, bem-estar (alerta de mal-estar), nota, recompraria, impressão e visibilidade.
- **Histórico:** duas sub-abas.
  - **Sessões:** detalhe, edição com troca de charuto e de duração, ajustar a força no Acervo e adicionar charuto avulso ao Acervo.
  - **Lado a lado** (era a aba Comparar até a 2.9.0): duas sessões em tabela e, embaixo, os 3 charutos do catálogo mais parecidos com o da nota maior (`similarTo`).
- **Paladar:** jornada (níveis Iniciante → Mestre, 15 conquistas calculadas do diário), análise (força × nota, sabores acima e abaixo da média, ranking, força esperada × sentida, hábitos) e Escola do charuto (8 lições).
- **Início** (aba de abertura): com o diário vazio (sem charutos e sem sessões), um bloco "Comece seu diário" no topo leva a "Adicionar primeiro charuto" (abre o formulário no Acervo) e a "Importar backup". Abaixo, o Guia de bolso em carrossel, com a Dica do dia (dia do ano mod 7) e três ferramentas no detalhe do tópico: Conservação (`humidorStatus`), Corte (`cutTipOf` por vitola) e Ritmo (marcador de baforada de 30, 45 ou 60 s).
- **Cesta** (2.10.0, no lugar da aba Comparar): monta um pedido de 3 a 8 charutos para o Felipe mandar à loja pelo WhatsApp. O app só escreve a lista, sem preço, loja nem link.
  - **Montagem** (`cestaPlan`, pura):
    - Primeiro entram os charutos do Acervo com Cesta.
    - Depois, até ⌊N/3⌋ de **Repor**: provados cuja resposta mais recente de "Recompraria" é Sim, fora o que está em Estoque.
    - O resto são **Novos** do catálogo, pela afinidade (`curate`), sem repetir linha e com no máximo 2 da mesma marca.
    - O filtro de origem (Todos/Cubanos/Fora de Cuba/Nacionais) vale para a cesta e para o Catálogo.
    - "Trocar" passa a vaga ao próximo candidato; "Desfazer trocas" esvazia a lista de trocas.
    - Charuto do Acervo sem origem conhecida só entra no filtro Todos.
  - **Pedido:** o texto (`pedidoTexto`) sai em "Olá! Gostaria de fazer um pedido:", com uma linha "1 Nome (bitola)" por charuto, usando o nome e a bitola do catálogo.
    - "Enviar pedido (WhatsApp…)" usa `navigator.share` e só aparece quando ele existe.
    - "Copiar" usa `navigator.clipboard`; quando falha, seleciona o texto e não guarda o pedido.
    - Os dois guardam o **pedido enviado**, apagam as trocas e remontam a cesta sem os nomes enviados, para o pedido da loja seguinte.
  - **Pedidos enviados:** um bloco por pedido, cada charuto com "Chegou".
    - "Guardar no estoque" (`chegadaPlan`, pura) usa os dados do envio: tira Cesta e põe Estoque no que já está no Acervo, cria o que falta e deixa na Cesta o que não chegou.
    - Há também "Reenviar" e "Descartar", com confirmação.
  - **Catálogo** (ex-Para provar): catálogo de referência (`CAT_LINES`/`CAT_ITEMS`, 475 charutos), ordenado pelo perfil de paladar (`tasteProfile` → `curate`), com busca e "Adicionar à cesta" (cria o charuto no Acervo com status `cesta`, que entra na cesta montada).
    - O que já foi provado sai da lista, mas aparece na busca com a nota.
    - Com menos de 3 sessões com nota, a ordem segue a força de referência, de suave a média.
    - Os selos "Na cesta" e "Pedido enviado" marcam o que já está na montagem ou a caminho.
  - **Reforço do Acervo** (2.10.0): charutos com Cesta ou Estoque ainda sem nota reforçam de leve a marca, a linha, a origem, a capa e o formato deles (`ACV_W`, teto de 0,6 por item). O motivo aparece como "Parecido com o que você tem no Acervo: …".
- **Clube:** feed, curtidas e comentários. Fora da barra de abas: abre pela coroa no cabeçalho.
- **Conta:** login, backup e atalho para o guia.
  - **Inscrito:** painel Mensagens (conversa com a administração e avisos). Aviso não lido vira faixa no Início; mensagem não lida acende um ponto na aba Conta.
  - **Administrador:** painel Administração com Inscritos (suspender/reativar, tornar/tirar administrador, com confirmação), Mensagens (caixa de entrada por inscrito), Avisos e Convites (gerar link, usos, desativar).

### Catálogo da curadoria

- Vem das listas de compra que o Felipe consulta (cubanos, fora de Cuba e nacionais, de 19/11/2026). Entram **só nome, bitola e origem**: preço, loja, código e contato ficam de fora (Lei 9.294/1996, art. 3-A). Caixas, latas, petacas e amostradores viram um item só, ou saem quando não são charutos (purera, umidor).
- `CAT_LINES`: `[marca, linha, país, capa, força, segmento]`. A força é uma referência aproximada por linha, de classificações públicas de fabricantes e da crítica. Sem consenso seguro, fica `null`, e o mesmo vale para país e capa (vazios). Não preencha por palpite.
- `CAT_ITEMS`: `[nome, bitola, força do item, capa do item ('-' = nenhuma)]`. Bitola vazia onde a lista não traz o dado ou traz um valor incoerente.
- Para atualizar com uma lista nova: acrescente linhas e itens, rode `node tests/curadoria.test.js` (ele barra preço, loja e códigos) e `node tests/cesta.test.js`, e suba a versão. Os ids de item (`linha-índice`) mudam quando se insere um item no meio da lista; por isso os pedidos enviados guardam os dados de cada charuto, e não o id.

## Regras e restrições

- **Deploy:** por `git push` a partir do repositório local (acima). Se o Felipe estiver só no celular, ele também pode subir arquivos pela interface web do GitHub.
- **Toda entrega atualiza `APP_VERSION`/`APP_BUILD`** (MAIOR.MENOR.CORREÇÃO: correção = último número, recurso = do meio, estrutura = primeiro).
- **Mudanças de dados sempre compatíveis com registros existentes.** Os dados ficam no IndexedDB dos usuários; nunca quebre a leitura de backups antigos. Campo novo de cigar ou session que deva sincronizar exige coluna no SQL (`alter table ... add column if not exists`) e mapeamento em `cigarRow`/`rowToCigar` ou `sessionRow`/`rowToSession`.
- **Nunca** coloque a chave `secret`/`service_role` no app ou no repositório. A publishable/anon é pública por natureza.
- **Conteúdo:** sem preços, lojas ou links de compra no app (Lei 9.294/1996, art. 3-A, restringe propaganda de fumígenos por meio eletrônico). Nada que ensine a tragar. Informação técnica deve ser conservadora; onde não há consenso, o texto diz isso.
- **UI:** mobile-first (testar em 360 a 390 px, sem rolagem horizontal), tema escuro por padrão com tema claro via tokens CSS, fontes Bricolage Grotesque, IBM Plex Sans e IBM Plex Mono, alvos de toque de pelo menos 44 px, sem emoji como ícone.
- **Testes:**
  - **Funções puras:** `node tests/guia.test.js`, `node tests/curadoria.test.js`, `node tests/clube.test.js` e `node tests/cesta.test.js` testam o que fica entre os marcadores `/* @pure:guia */`, `/* @pure:curadoria */`, `/* @pure:clube */` e `/* @pure:cesta */` (fecham com `/* @end:... */`). O teste da Cesta carrega a curadoria junto.
  - **SQL:** `node supabase/tests/fase2.test.mjs` testa o SQL do clube no PGlite.
  - **Interface:** `tests/ui-guia.js`, `tests/ui-curadoria.js`, `tests/ui-clube.js` e `tests/ui-cesta.js` rodam no navegador com o app aberto: `eval(await (await fetch('/tests/ui-guia.js?' + Date.now())).text())`. O `?` evita a cópia do service worker.
    - Eles não gravam nada: trocam charutos e sessões só na memória, com `syncedAt = updatedAt` para nunca subirem ao clube, e restauram no fim.
    - O `ui-clube.js` também troca o cliente Supabase e o `clubApi` por versões falsas em memória (ganchos `__t.cloud`, `__t.setClubApi`, `__t.refreshClub`, `__t.canSync`).
    - O `ui-cesta.js` e o `ui-curadoria.js` guardam e restauram o estado da Cesta (gancho `__t.cesta` e `localStorage diario-cesta`). O `ui-cesta.js` também troca `navigator.share` e `navigator.clipboard` por versões falsas.
  - **À mão:** os botões "Adicionar à cesta" e "Guardar no estoque" gravam no diário; confira-os num navegador sem login no clube e apague depois os charutos de teste. No navegador embutido do app desktop, a área de transferência real falha, e o "Copiar" cai na seleção do texto. Python não roda nesta máquina; sirva a pasta com Node (preview `diario` no `.claude/launch.json` da pasta ClaudeDesing). Teste em 360 e 390 px, nos temas claro e escuro.
- **Privacidade:** backups JSON contêm dados pessoais e fotos; não versionar (`*.json` está no `.gitignore`). O `migracao-diario.json` foi removido na 2.6.1 (ainda existe no histórico do Git).

## Pendências conhecidas

1. Recuperação de senha depende de SMTP próprio (por exemplo Brevo ou Resend); hoje o administrador apaga o usuário e reconvida.
2. Erros HTTP 400 no console com o clube logado, provavelmente downloads de fotos de anilha ausentes no Storage: investigar.
3. Home em formato de blog: artigos tirados do guia. A lista de "charutos para provar" já existe, no Catálogo da aba Cesta (2.10.0).
4. Catálogo da curadoria: 272 dos 475 itens estão sem força de referência e 96 sem país. Preencher só com fonte verificável (site do fabricante ou review publicada), nunca por palpite.
5. Clube: mensagens chegam quando o app abre (sem tempo real nem notificação push; push exigiria servidor e, no iPhone, app instalado). A 360 px a barra de abas rola, e a aba Conta, com o ponto de mensagem nova, pode ficar fora da tela. Na 2.10.0 a Cesta entrou no lugar de Comparar, e as abas passaram a somar 389 px para 326 px visíveis (eram 417 px). A solução definitiva seria uma barra no rodapé, com ícones.
6. Ideias em aberto: quantidade em estoque com baixa automática ao encerrar sessão, perfil do membro no clube com conquistas, quiz do guia valendo pontos, canal beta com IndexedDB separado.
