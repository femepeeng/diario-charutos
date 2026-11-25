/* Verificações de interface da curadoria: Catálogo (aba Cesta) e Lado a lado (sub-aba do Histórico), rodadas no navegador com o app aberto.
   Uso no console (ou javascript_tool): eval(await (await fetch('/tests/ui-curadoria.js?' + Date.now())).text())
   Devolve {ok, falhas, resultados}. Não grava nada: troca charutos e sessões só na memória e restaura no fim.
   Os registros falsos levam syncedAt = updatedAt, então uma sincronização no meio do teste não os envia ao clube.
   O botão "Adicionar à cesta" não é clicado aqui (gravaria no diário); confira-o à mão. */
(async function () {
  var R = [], wait = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  function check(nome, cond) { R.push((cond ? 'ok   ' : 'FAIL ') + nome); }
  function q(s) { return document.querySelector(s); }
  function qa(s) { return Array.prototype.slice.call(document.querySelectorAll(s)); }
  function click(el) { if (el) el.click(); }
  function act(a, id) { return q('[data-act="' + a + '"]' + (id != null ? '[data-id="' + id + '"]' : '')); }
  function titles() { return qa('.catc h3').map(function (h) { return h.textContent; }); }
  var S = window.__t && __t.state;
  check('estado exposto para teste', !!S && !!__t.render);
  if (!S || !__t.render) return { ok: false, falhas: 1, resultados: R };
  var bk = { c: S.cigars, s: S.sessions, tab: S.tab, view: S.view, hist: S.histMode, seg: S.catSeg, q: S.catQ, n: S.catN, a: S.cmpA, b: S.cmpB };
  var T = { updatedAt: 1, syncedAt: 1 };
  function rec(o) { return Object.assign({}, T, o); }
  S.cigars = [
    rec({ id: 'ui-c1', name: 'Montecristo #4', origin: 'Cuba', vitola: '129 x 42', strength: 3, status: 'estoque' }),
    rec({ id: 'ui-c2', name: 'Partagás Serie D Nº 4', origin: 'Cuba', vitola: '124 x 50', strength: 5, status: '' }),
    rec({ id: 'ui-c3', name: 'Oliva Serie V Melanio Robusto', origin: 'Nicarágua', vitola: '5 x 52', strength: 4, status: 'cesta' }),
    rec({ id: 'ui-c4', name: 'Hoyo de Monterrey Epicure No. 2', origin: 'Cuba', vitola: '124 x 50', strength: 2, status: '' })
  ];
  function ses(id, cid, nm, r, st, d) { return rec({ id: id, cigarId: cid, cigarName: nm, status: 'concluida', visibility: 'private', rating: r, strength: st, createdAt: d, thirds: [{}, {}, {}] }); }
  S.sessions = [
    ses('ui-s1', 'ui-c1', 'Montecristo #4', 9, 3, '2026-11-01T20:00:00Z'),
    ses('ui-s2', 'ui-c1', 'Montecristo #4', 8.5, 3, '2026-11-05T20:00:00Z'),
    ses('ui-s3', 'ui-c2', 'Partagás Serie D Nº 4', 5, 5, '2026-11-08T20:00:00Z'),
    ses('ui-s4', 'ui-c4', 'Hoyo de Monterrey Epicure No. 2', 8, 2, '2026-11-10T20:00:00Z')
  ];
  S.view = 'home'; S.tab = 'historico'; S.histMode = 'lado'; S.catSeg = 'todos'; S.catQ = ''; S.catN = 12; S.cmpA = 'ui-s1'; S.cmpB = 'ui-s3';
  __t.render(); await wait(120);

  // ---- Barra e Histórico ----
  check('barra tem Cesta e não tem Comparar', !!q('[data-act="tab"][data-id="cesta"]') && !q('[data-id="comparar"]'));
  check('Histórico tem as sub-abas Sessões e Lado a lado', !!act('histmode', 'sessoes') && !!act('histmode', 'lado'));

  // ---- Lado a lado ----
  check('Lado a lado continua com a tabela', !!q('.cmp table'));
  var sim = q('.cmpsim');
  check('Lado a lado mostra parecidos com a sessão de nota maior', !!sim && /Montecristo #4/.test(sim.textContent) && /nota maior/.test(sim.textContent));
  check('parecidos: 3 cartões', qa('.cmpsim .catc').length === 3);
  check('parecidos não repetem o charuto provado', qa('.cmpsim .catc h3').every(function (h) { return h.textContent !== 'Montecristo Nº 4'; }));
  click(act('histmode', 'sessoes')); await wait(120);
  check('sub-aba Sessões lista as 4 sessões', qa('[data-act="detail"]').length === 4);

  // ---- Catálogo (aba Cesta) ----
  click(q('[data-act="tab"][data-id="cesta"]')); await wait(150);
  var tabC = q('[data-act="tab"][data-id="cesta"]');
  check('aba Cesta fica selecionada', !!tabC && tabC.getAttribute('aria-selected') === 'true');
  check('aba Cesta mostra o Catálogo', qa('h2').some(function (h) { return h.textContent === 'Catálogo'; }));
  check('lista começa com 12 cartões', qa('.catc').length === 12);
  check('primeiro cartão é da marca de nota mais alta (Montecristo)', /^Montecristo /.test(titles()[0] || ''));
  check('primeiro cartão explica o porquê', /Marca Montecristo/.test((q('.catc .catwhy') || {}).textContent || ''));
  check('charuto já provado fica fora da lista', titles().indexOf('Montecristo Nº 4') < 0);
  check('nenhum preço ou loja na tela', !/R\$|\d+,\d{2}\b|2\s?GO|WhatsApp/i.test((q('#cat-list') || {}).textContent || 'x'));
  check('botões Adicionar à cesta com 44px', qa('[data-act="catcesta"]').length > 0 && qa('[data-act="catcesta"]').every(function (b) { return b.getBoundingClientRect().height >= 44; }));
  check('filtros de origem com 44px', qa('[data-act="catseg"]').length === 4 && qa('[data-act="catseg"]').every(function (b) { return b.getBoundingClientRect().height >= 44; }));
  check('página sem rolagem horizontal', document.documentElement.scrollWidth <= innerWidth);
  click(act('catmore')); await wait(120);
  check('Mostrar mais traz mais 12', qa('.catc').length === 24);

  click(act('catseg', 'c')); await wait(120);
  check('filtro Cubanos: só cartões de Cuba', qa('.catc').length > 0 && qa('.catc .head .meta').every(function (m) { return /^Cuba/.test(m.textContent); }));
  check('filtro Cubanos: 19 não provados', /19 charutos/.test((q('#cat-list') || {}).textContent || ''));
  check('Partagás (nota baixa, força acima) não aparece entre os 12 primeiros', titles().every(function (t) { return !/^Partagás/.test(t); }));
  click(act('catmore')); await wait(120);
  var par = qa('.catc').filter(function (c) { return /^Partagás/.test(c.querySelector('h3').textContent); })[0];
  check('Partagás traz aviso de força acima da faixa', !!par && /acima da sua faixa/.test(par.textContent));
  click(act('catseg', 'todos')); await wait(120);

  var inp = q('#cat-q');
  check('campo de busca presente', !!inp);
  if (inp) {
    inp.focus(); inp.value = 'opus'; inp.dispatchEvent(new Event('input', { bubbles: true })); await wait(80);
    check('busca "opus" mostra só Opus X', titles().length > 0 && titles().every(function (t) { return /Opus X/.test(t); }));
    check('busca não tira o foco do campo', document.activeElement === inp && q('#cat-q') === inp);
    inp.value = 'melanio robusto'; inp.dispatchEvent(new Event('input', { bubbles: true })); await wait(80);
    var mel = qa('.catc').filter(function (c) { return c.querySelector('h3').textContent === 'Oliva Serie V Melanio Robusto'; })[0];
    check('item que já está na cesta aparece marcado, sem botão', !!mel && /Na cesta/.test(mel.textContent) && !mel.querySelector('[data-act="catcesta"]'));
    inp.value = 'partagas serie d'; inp.dispatchEvent(new Event('input', { bubbles: true })); await wait(80);
    var d4 = qa('.catc').filter(function (c) { return c.querySelector('h3').textContent === 'Partagás Serie D Nº 4'; })[0];
    check('busca mostra o já provado, com a sua nota', !!d4 && /5,0/.test((d4.querySelector('.score') || {}).textContent || ''));
    inp.value = 'xyz-nada'; inp.dispatchEvent(new Event('input', { bubbles: true })); await wait(80);
    check('busca sem resultado mostra aviso', /Nada encontrado/.test((q('#cat-list') || {}).textContent || ''));
    inp.value = 'oli'; inp.dispatchEvent(new Event('input', { bubbles: true })); await wait(40);
    if (__t.rerender) __t.rerender(); await wait(120);
    var inp2 = q('#cat-q');
    check('redesenho pela sincronização mantém foco e texto da busca', !!inp2 && document.activeElement === inp2 && inp2.value === 'oli' && inp2.selectionStart === 3);
    inp = inp2 || inp;
    inp.value = ''; inp.dispatchEvent(new Event('input', { bubbles: true })); inp.blur();
  }

  // ---- Poucas sessões ----
  S.sessions = S.sessions.slice(0, 1); __t.render(); await wait(120);
  check('com menos de 3 sessões avisa que a ordem segue a força', /A partir de 3 sessões com nota/.test(document.body.textContent));

  S.cigars = bk.c; S.sessions = bk.s; S.tab = bk.tab; S.view = bk.view; S.histMode = bk.hist; S.catSeg = bk.seg; S.catQ = bk.q; S.catN = bk.n; S.cmpA = bk.a; S.cmpB = bk.b;
  __t.render(); await wait(80);
  var falhas = R.filter(function (s) { return s.indexOf('FAIL') === 0; }).length;
  return { ok: falhas === 0, falhas: falhas, resultados: R };
})();
