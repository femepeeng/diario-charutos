# Diário de Degustação: contexto do projeto

PWA para registrar sessões de degustação de charutos por terço, com cronômetro, foto da anilha, notas de sabor, análise de paladar, gamificação e, opcionalmente, um clube fechado (Supabase).

- **Dono:** Felipe (usuário GitHub `femepeeng`). Responde em português do Brasil.
- **Produção:** https://femepeeng.github.io/diario-charutos/ (GitHub Pages, branch `main`, raiz).
- **Versão atual:** 2.8.0 (23/11/2026). Constantes `APP_VERSION` e `APP_BUILD` no topo do script de `index.html`, exibidas no rodapé da home.
- **Repositório local:** `C:\Users\femep\Documents\ClaudeDesing\repo-diario` (clone de `femepeeng/diario-charutos`). O Claude faz commit e `git push` direto para a `main`, com o OK do Felipe; o GitHub Pages publica em 1 a 2 minutos.

## Arquivos

| Arquivo | Papel |
|---|---|
| `index.html` | App inteiro: HTML, CSS e JS em um arquivo, sem build e sem framework |
| `sw.js` | Service worker. Página e `config.js` vêm da rede primeiro; o resto vem do cache primeiro. Cache `diario-v2`. Mudou um asset em cache? Suba a versão do cache |
| `config.js` | `window.CLUBE_CONFIG = {url, key}` do Supabase. **Vazio = clube desativado** (o app funciona só como diário local) |
| `supabase.js` | Bundle UMD de `@supabase/supabase-js@2.117.2`, vendorizado para funcionar offline |
| `manifest.webmanifest`, `icon-*.png` | Instalação como app |
| `supabase/supabase-clube.sql` | Esquema, RLS e funções do clube. **Não vai para o GitHub** (repo público; contém o código de fundador de uso único). Está no `.gitignore` |

## Arquitetura

- **Offline-first.** IndexedDB `diario-degustacao` (versão 2), com os stores `cigars`, `sessions`, `photos` (blobs) e `tombstones`. O celular é a fonte da verdade; a nuvem é cópia e vitrine do clube.
- **Render.** Função `render()` com `innerHTML` a partir de `state`. Eventos são delegados por `data-act` (click), `data-input` (input) e `data-change`/ids (change). Na tela de sessão, a edição fica em `draft` e é salva com debounce (`scheduleSave` → `flush` → `put`).
- **Sincronização** (`sync()`, só se `config.js` estiver preenchido e o usuário for membro): sobe fotos ainda não enviadas, aplica tombstones, faz upsert por `(owner_id, local_id)`, puxa os registros próprios e mescla por `client_updated_at` (last-writer-wins). A chave localStorage `clube-owner` impede misturar diários de contas diferentes no mesmo aparelho.
- **Clube:** login por e-mail e senha (o SMTP padrão do Supabase só envia para a equipe do projeto, por isso "Confirm email" fica desligado), convite por código (`join_club`, `create_invite`), feed de sessões com `visibility='club'` e `status='concluida'`, curtidas, comentários e `delete_my_account` (LGPD). As regras de acesso foram testadas em Postgres (36 casos).
- **Backup:** exporta e importa JSON `{app:'diario-degustacao', version:1, cigars, sessions, photos:[{id, dataUrl}]}`.

## Modelo de dados (local)

- **cigar:** `id, name, origin, vitola, strength(1-5), status, expected, pairing, wrapper, order, bandId, updatedAt, syncedAt`
  - `status` é uma lista separada por vírgula com `cesta` e/ou `estoque`. Vazio = `historico`, exibido como **Arquivo**.
  - `wrapper` é uma chave de `WRAPPERS` (connecticut, habano, corojo, camaroes, sumatra, maduro, natural, cubana, matafina).
- **session:** `id, cigarId, cigarName, status('aberta'|'concluida'), visibility('club'|'private'), createdAt, endedAt, moment, drink, thirds[3]{notes[], intensity, text}, strength, burn, draw, feel, rating(0-10, passo 0,5), rebuy, comment, timer{acc, running, resumedAt}, durationMin, bandId, mission, updatedAt, syncedAt`
  - `mission` e o progresso de lições (`localStorage diario-licoes`) não sobem para a nuvem.

## Funcionalidades por área

- **Acervo:** filtros Todos/Cesta/Estoque/Arquivo, botões Cesta e Estoque, editar e remover charuto, ficha do charuto (formato pela bitola, capa, terroir, corte) e sugestão da próxima degustação.
- **Sessão:** cronômetro, momento (pré-preenchido com o da última sessão), bebida, foto da anilha (câmera ou galeria), notas por terço em 8 famílias (incluindo "Gostos na boca"), missão de aroma, dicas do guia por terço e fechamento com força, queima, tiragem, bem-estar (alerta de mal-estar), nota, recompraria, impressão e visibilidade.
- **Histórico:** detalhe, edição com troca de charuto e de duração, ajustar a força no Acervo e adicionar charuto avulso ao Acervo.
- **Paladar:** jornada (níveis Iniciante → Mestre, 15 conquistas calculadas do diário), análise (força × nota, sabores acima e abaixo da média, ranking, força esperada × sentida, hábitos) e Escola do charuto (8 lições).
- **Início** (aba de abertura): com o diário vazio (sem charutos e sem sessões), um bloco "Comece seu diário" no topo leva a "Adicionar primeiro charuto" (abre o formulário no Acervo) e a "Importar backup". Abaixo, o Guia de bolso em carrossel, com a Dica do dia (dia do ano mod 7) e três ferramentas no detalhe do tópico: Conservação (`humidorStatus`), Corte (`cutTipOf` por vitola) e Ritmo (marcador de baforada de 30, 45 ou 60 s).
- **Comparar:** duas sub-abas.
  - **Lado a lado:** duas sessões em tabela e, embaixo, os 3 charutos do catálogo mais parecidos com o da nota maior (`similarTo`).
  - **Para provar:** catálogo de referência (`CAT_LINES`/`CAT_ITEMS`, 475 charutos), ordenado pelo perfil de paladar (`tasteProfile` → `curate`), com filtros Cubanos/Fora de Cuba/Nacionais, busca e "Adicionar à cesta" (cria o charuto no Acervo com status `cesta`). O que já foi provado sai da lista, mas aparece na busca com a nota. Com menos de 3 sessões com nota, a ordem segue a força de referência, de suave a média.
- **Clube:** feed, curtidas e comentários. Fora da barra de abas: abre pela coroa no cabeçalho. **Conta:** login, convites (admin), backup e atalho para o guia.

### Catálogo da curadoria

- Vem das listas de compra que o Felipe consulta (cubanos, fora de Cuba e nacionais, de 19/11/2026). Entram **só nome, bitola e origem**: preço, loja, código e contato ficam de fora (Lei 9.294/1996, art. 3-A). Caixas, latas, petacas e amostradores viram um item só, ou saem quando não são charutos (purera, umidor).
- `CAT_LINES`: `[marca, linha, país, capa, força, segmento]`. A força é uma referência aproximada por linha, de classificações públicas de fabricantes e da crítica. Sem consenso seguro, fica `null`, e o mesmo vale para país e capa (vazios). Não preencha por palpite.
- `CAT_ITEMS`: `[nome, bitola, força do item, capa do item ('-' = nenhuma)]`. Bitola vazia onde a lista não traz o dado ou traz um valor incoerente.
- Para atualizar com uma lista nova: acrescente linhas e itens, rode `node tests/curadoria.test.js` (ele barra preço, loja e códigos) e suba a versão.

## Regras e restrições

- **Deploy:** por `git push` a partir do repositório local (acima). Se o Felipe estiver só no celular, ele também pode subir arquivos pela interface web do GitHub.
- **Toda entrega atualiza `APP_VERSION`/`APP_BUILD`** (MAIOR.MENOR.CORREÇÃO: correção = último número, recurso = do meio, estrutura = primeiro).
- **Mudanças de dados sempre compatíveis com registros existentes.** Os dados ficam no IndexedDB dos usuários; nunca quebre a leitura de backups antigos. Campo novo de cigar ou session que deva sincronizar exige coluna no SQL (`alter table ... add column if not exists`) e mapeamento em `cigarRow`/`rowToCigar` ou `sessionRow`/`rowToSession`.
- **Nunca** coloque a chave `secret`/`service_role` no app ou no repositório. A publishable/anon é pública por natureza.
- **Conteúdo:** sem preços, lojas ou links de compra no app (Lei 9.294/1996, art. 3-A, restringe propaganda de fumígenos por meio eletrônico). Nada que ensine a tragar. Informação técnica deve ser conservadora; onde não há consenso, o texto diz isso.
- **UI:** mobile-first (testar em 360 a 390 px, sem rolagem horizontal), tema escuro por padrão com tema claro via tokens CSS, fontes Bricolage Grotesque, IBM Plex Sans e IBM Plex Mono, alvos de toque de pelo menos 44 px, sem emoji como ícone.
- **Testes:** `node tests/guia.test.js` e `node tests/curadoria.test.js` testam as funções puras entre os marcadores `/* @pure:guia */` e `/* @pure:curadoria */` (fecham com `/* @end:... */`). `tests/ui-guia.js` e `tests/ui-curadoria.js` rodam no navegador com o app aberto (`eval(await (await fetch('/tests/ui-guia.js?' + Date.now())).text())`; o `?` evita a cópia do service worker). Eles não gravam nada: trocam charutos e sessões só na memória, com `syncedAt = updatedAt` para nunca subirem ao clube, e restauram no fim. O botão "Adicionar à cesta" grava no diário; confira-o à mão num navegador sem login no clube. Python não roda nesta máquina; sirva a pasta com Node (preview `diario` no `.claude/launch.json` da pasta ClaudeDesing). Teste em 360 e 390 px, nos temas claro e escuro.
- **Privacidade:** backups JSON contêm dados pessoais e fotos; não versionar (`*.json` está no `.gitignore`). O `migracao-diario.json` foi removido na 2.6.1 (ainda existe no histórico do Git).

## Pendências conhecidas

1. Recuperação de senha depende de SMTP próprio (por exemplo Brevo ou Resend); hoje o administrador apaga o usuário e reconvida.
2. Erros HTTP 400 no console com o clube logado, provavelmente downloads de fotos de anilha ausentes no Storage: investigar.
3. Home em formato de blog: artigos tirados do guia. A lista de "charutos para provar" já existe, na aba Comparar (2.8.0).
4. Catálogo da curadoria: 272 dos 475 itens estão sem força de referência e 96 sem país. Preencher só com fonte verificável (site do fabricante ou review publicada), nunca por palpite.
5. Ideias em aberto: quantidade em estoque com baixa automática ao encerrar sessão, perfil do membro no clube com conquistas, quiz do guia valendo pontos, canal beta com IndexedDB separado.
