/* Verificações de interface da aba Cesta, rodadas no navegador com o app aberto.
   Uso no console (ou javascript_tool): eval(await (await fetch('/tests/ui-cesta.js?' + Date.now())).text())
   Devolve {ok, falhas, resultados}. Não grava no diário: troca charutos e sessões só na memória e restaura no fim.
   Os registros falsos levam syncedAt = updatedAt, então uma sincronização no meio do teste não os envia ao clube.
   Guarda e restaura o estado da Cesta (objeto e localStorage diario-cesta).
   "Adicionar à cesta" e "Guardar no estoque" gravam no diário e não são clicados aqui: confira-os à mão. */
(async function () {
  var R = [], wait = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  function check(nome, cond) { R.push((cond ? 'ok   ' : 'FAIL ') + nome); }
  function q(s) { return document.querySelector(s); }
  function qa(s) { return Array.prototype.slice.call(document.querySelectorAll(s)); }
  function click(el) { if (el) el.click(); }
  function act(a, id) { return q('[data-act="' + a + '"]' + (id != null ? '[data-id="' + id + '"]' : '')); }
  var S = window.__t && __t.state;
  check('estado exposto para teste', !!S && !!__t.render && typeof __t.cesta === 'function');
  if (!S || !__t.render || typeof __t.cesta !== 'function') return { ok: false, falhas: 1, resultados: R };
  var LS = 'diario-cesta';
  var bk = { c: S.cigars, s: S.sessions, tab: S.tab, view: S.view, q: S.catQ, n: S.catN, confirm: S.confirm, cesta: JSON.stringify(__t.cesta()), ls: localStorage.getItem(LS) };
  var T = { updatedAt: 1, syncedAt: 1 };
  function rec(o) { return Object.assign({}, T, o); }
  S.cigars = [
    rec({ id: 'uc-k1', name: 'Cohiba Siglo II', origin: 'Cuba', vitola: '129 x 42', strength: 4, status: 'cesta', order: 1 }),
    rec({ id: 'uc-k2', name: 'Montecristo #4', origin: 'Cuba', vitola: '129 x 42', strength: 3, status: '' }),
    rec({ id: 'uc-k3', name: 'Hoyo de Monterrey Epicure No. 2', origin: 'Cuba', vitola: '124 x 50', strength: 2, status: 'estoque' }),
    rec({ id: 'uc-k4', name: 'Partagás Serie D Nº 4', origin: 'Cuba', vitola: '124 x 50', strength: 5, status: '' }),
    rec({ id: 'uc-k5', name: 'Oliva Serie V Melanio Robusto', origin: 'Nicarágua', vitola: '5 x 52', strength: 4, status: '' }),
    rec({ id: 'uc-k6', name: 'Charuto do tio', origin: '', vitola: '', strength: 2, status: 'cesta', order: 2 })
  ];
  function ses(id, cid, nm, r, rb, d) {
    return rec({ id: id, cigarId: cid, cigarName: nm, status: 'concluida', visibility: 'private', rating: r, rebuy: rb, strength: 3,
      createdAt: '2026-' + d + 'T20:00:00Z', endedAt: '2026-' + d + 'T21:00:00Z', thirds: [{}, {}, {}] });
  }
  S.sessions = [
    ses('uc-s1', 'uc-k2', 'Montecristo #4', 9, 'Sim', '11-01'),
    ses('uc-s2', 'uc-k2', 'Montecristo #4', 8.5, '', '11-05'),
    ses('uc-s3', 'uc-k3', 'Hoyo de Monterrey Epicure No. 2', 8, 'Sim', '11-03'),
    ses('uc-s4', 'uc-k4', 'Partagás Serie D Nº 4', 7, 'Sim', '10-01'),
    ses('uc-s5', 'uc-k4', 'Partagás Serie D Nº 4', 5, 'Não', '11-08'),
    ses('uc-s6', 'uc-k5', 'Oliva Serie V Melanio Robusto', 8, 'Talvez', '11-09'),
    ses('uc-s7', '', 'Romeo y Julieta Short Churchill', 8.8, 'Sim', '11-10')
  ];
  __t.cesta({ v: 1, size: 5, seg: 'todos', fora: [], enviados: [] });
  S.view = 'home'; S.tab = 'cesta'; S.catQ = ''; S.catN = 12; S.confirm = '';
  __t.render(); await wait(150);
  function cards() { return qa('#cesta-list .cestac'); }
  function keys() { return cards().map(function (c) { return c.getAttribute('data-key'); }); }
  function chip(c) { var x = c.querySelector('.chip'); return x ? x.textContent : ''; }
  function grande(b) { var r = b.getBoundingClientRect(); return r.height >= 44 && r.width >= 44; }

  // ---- Montagem ----
  check('barra tem Cesta e não tem Comparar', !!q('[data-act="tab"][data-id="cesta"]') && !q('[data-id="comparar"]'));
  check('tamanho 5 mostra 5 cartões', cards().length === 5);
  check('o primeiro cartão é Da cesta', cards().length > 0 && chip(cards()[0]) === 'Da cesta');
  var rep = cards().filter(function (c) { return chip(c) === 'Repor'; })[0];
  check('um cartão Repor explica Recompraria: Sim', !!rep && /Recompraria: Sim/.test(rep.textContent));
  click(act('cestasize', '8')); await wait(120); var n8 = cards().length;
  click(act('cestasize', '3')); await wait(120); var n3 = cards().length;
  check('tamanho 8 mostra 8 e tamanho 3 mostra 3', n8 === 8 && n3 === 3);
  click(act('cestasize', '5')); await wait(120);
  var antes = keys(), ult = antes[antes.length - 1];
  click(q('#cesta-list .cestac:last-child [data-act="cestatroca"]')); await wait(120);
  check('Trocar tira o charuto e mantém o tamanho', !!ult && keys().indexOf(ult) < 0 && cards().length === 5);
  click(act('cestadesfaz')); await wait(120);
  check('Desfazer trocas devolve o charuto', keys().indexOf(ult) >= 0 && !act('cestadesfaz'));
  var tx = (q('#cesta-texto') || {}).value || '', lin = tx.split('\n'), cs = cards();
  check('texto do pedido confere com a cesta', lin[0] === 'Olá! Gostaria de fazer um pedido:' && lin.length === cs.length + 2 &&
    lin.slice(1, -1).every(function (l, i) { return l.indexOf('1 ' + cs[i].getAttribute('data-name')) === 0; }) &&
    /^São \d+ charutos\. Pode me confirmar a disponibilidade\?$/.test(lin[lin.length - 1]));
  check('nenhum preço, loja ou link na aba', !/R\$|\d+,\d{2}\b|https?:|www\./i.test(((q('#cesta') || {}).textContent || 'x') + ((q('#cat-list') || {}).textContent || '')));
  click(act('catseg', 'c')); await wait(150);
  check('filtro Cubanos deixa a cesta só com Cuba', cards().length > 0 && cards().every(function (c) { var m = c.querySelector('.meta'); return !!m && /^Cuba/.test(m.textContent); }));
  click(act('catseg', 'todos')); await wait(150);
  var nv = cards().filter(function (c) { return chip(c) === 'Novo'; })[0], nome = nv && nv.getAttribute('data-name'), inp = q('#cat-q');
  if (inp && nome) { inp.focus(); inp.value = nome; inp.dispatchEvent(new Event('input', { bubbles: true })); await wait(100); }
  var cc = qa('#cat-list .catc').filter(function (c) { return c.querySelector('h3').textContent === nome; })[0];
  check('Catálogo mostra Na cesta para um charuto da montagem, sem o botão', !!cc && /Na cesta/.test(cc.textContent) && !cc.querySelector('[data-act="catcesta"]'));
  if (inp) { inp.value = ''; inp.dispatchEvent(new Event('input', { bubbles: true })); inp.blur(); }
  click(act('cestasize', '6')); await wait(100); click(act('catseg', 'f')); await wait(100);
  var guardado = {}; try { guardado = JSON.parse(localStorage.getItem(LS) || '{}'); } catch (e) {}
  check('tamanho e origem ficam guardados', guardado.size === 6 && guardado.seg === 'f');
  click(act('catseg', 'todos')); await wait(100); click(act('cestasize', '5')); await wait(120);
  check('alvos de 44 px: tamanho, origem e Trocar', qa('[data-act="cestasize"]').length === 6 &&
    qa('[data-act="cestasize"],[data-act="catseg"],[data-act="cestatroca"]').every(grande));
  check('página sem rolagem horizontal', document.documentElement.scrollWidth <= innerWidth);

  // ---- Envio ---- (Task 5)

  S.cigars = bk.c; S.sessions = bk.s; S.tab = bk.tab; S.view = bk.view; S.catQ = bk.q; S.catN = bk.n; S.confirm = bk.confirm;
  __t.cesta(JSON.parse(bk.cesta));
  if (bk.ls == null) localStorage.removeItem(LS); else localStorage.setItem(LS, bk.ls);
  __t.render(); await wait(80);
  var falhas = R.filter(function (s) { return s.indexOf('FAIL') === 0; }).length;
  return { ok: falhas === 0, falhas: falhas, resultados: R };
})();
