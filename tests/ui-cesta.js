/* Verificações de interface da Cesta (sub-aba da Conta), rodadas no navegador com o app aberto.
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
  var bk = { c: S.cigars, s: S.sessions, tab: S.tab, sec: S.contaSec, view: S.view, q: S.catQ, n: S.catN, confirm: S.confirm, pedOpen: S.pedOpen, cesta: JSON.stringify(__t.cesta()), ls: localStorage.getItem(LS) };
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
  check('Conta tem a sub-aba Cesta e não há Comparar', !!q('.minitabs [data-act="tab"][data-id="cesta"]') && !q('[data-id="comparar"]'));
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
  /* A busca não remonta a cesta: os selos seguem a cesta que está na tela, mesmo que o estado mude antes do próximo desenho. */
  var key2 = nv && nv.getAttribute('data-key');
  if (key2) __t.cesta().fora.push(key2);
  if (inp && nome) { inp.value = nome + ' '; inp.dispatchEvent(new Event('input', { bubbles: true })); await wait(100); inp.value = nome; inp.dispatchEvent(new Event('input', { bubbles: true })); await wait(100); }
  var cc2 = qa('#cat-list .catc').filter(function (c) { return c.querySelector('h3').textContent === nome; })[0];
  check('durante a busca, os selos seguem a cesta que está na tela', !!cc2 && /Na cesta/.test(cc2.textContent));
  if (key2) __t.cesta().fora.pop();
  if (inp) { inp.value = ''; inp.dispatchEvent(new Event('input', { bubbles: true })); inp.blur(); }
  click(act('cestasize', '6')); await wait(100); click(act('catseg', 'f')); await wait(100);
  var guardado = {}; try { guardado = JSON.parse(localStorage.getItem(LS) || '{}'); } catch (e) {}
  check('tamanho e origem ficam guardados', guardado.size === 6 && guardado.seg === 'f');
  click(act('catseg', 'todos')); await wait(100); click(act('cestasize', '5')); await wait(120);
  check('alvos de 44 px: tamanho, origem e Trocar', qa('[data-act="cestasize"]').length === 6 &&
    qa('[data-act="cestasize"],[data-act="catseg"],[data-act="cestatroca"]').every(grande));
  check('página sem rolagem horizontal', document.documentElement.scrollWidth <= innerWidth);

  // ---- Envio ----
  /* navigator.share e navigator.clipboard falsos, que guardam o texto recebido; os originais voltam no finally. */
  var shared = [], copied = [], shareMode = 'ok';
  var dShare = Object.getOwnPropertyDescriptor(navigator, 'share'), dClip = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
  function fakeShare(o) { if (shareMode === 'abort') return Promise.reject({ name: 'AbortError' }); shared.push(o && o.text); return Promise.resolve(); }
  Object.defineProperty(navigator, 'share', { configurable: true, value: fakeShare });
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: function (t) { copied.push(t); return Promise.resolve(); } } });
  try {
    __t.cesta({ v: 1, size: 5, seg: 'todos', fora: [], enviados: [] }); S.confirm = ''; __t.render(); await wait(120);
    check('Enviar pedido aparece quando há compartilhamento', !!act('cestaenviar'));
    click(q('#cesta-list .cestac:last-child [data-act="cestatroca"]')); await wait(100);
    var txt1 = ((q('#cesta-texto') || {}).value) || '', k1 = keys();
    click(act('cestaenviar')); await wait(200);
    check('Enviar compartilha exatamente o texto da tela', shared.length === 1 && !!txt1 && shared[0] === txt1);
    var peds = qa('#enviados details[data-ped]');
    check('Pedidos enviados mostra 1 pedido, com o resumo', peds.length === 1 && /charutos?$/.test(((peds[0] && peds[0].querySelector('summary')) || {}).textContent || ''));
    var sm = peds[0] && peds[0].querySelector('summary');
    check('o bloco do pedido mostra o marcador de abrir e fechar, com 44 px', !!sm && getComputedStyle(sm).display === 'list-item' && sm.getBoundingClientRect().height >= 44);
    check('a cesta se remonta sem os charutos enviados', keys().length > 0 && keys().every(function (k) { return k1.indexOf(k) < 0; }));
    check('as trocas se apagam depois do envio', __t.cesta().fora.length === 0);
    click(q('#enviados [data-act="pedveio"][data-val="0"]')); await wait(100);
    __t.render(); await wait(100);
    var b0 = q('#enviados [data-act="pedveio"][data-val="0"]'), det = q('#enviados details[data-ped]');
    check('Chegou desligado continua desligado depois do redesenho, com o bloco aberto', !!b0 && b0.getAttribute('aria-pressed') === 'false' && !!det && det.open);
    var txt2 = ((q('#cesta-texto') || {}).value) || '';
    click(act('cestacopiar')); await wait(200);
    check('Copiar guarda um segundo pedido com o texto da tela', copied.length === 1 && !!txt2 && copied[0] === txt2 && qa('#enviados details[data-ped]').length === 2);
    shareMode = 'abort'; click(act('cestaenviar')); await wait(200); shareMode = 'ok';
    check('compartilhamento cancelado não guarda pedido', qa('#enviados details[data-ped]').length === 2 && __t.cesta().enviados.length === 2);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: function () { return Promise.reject(new Error('negado')); } } });
    click(act('cestacopiar')); await wait(200);
    check('cópia que falha seleciona o texto e não guarda pedido', __t.cesta().enviados.length === 2 && document.activeElement === q('#cesta-texto'));
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: function (t) { copied.push(t); return Promise.resolve(); } } });
    Object.defineProperty(navigator, 'share', { configurable: true, value: undefined }); __t.render(); await wait(100);
    check('sem navigator.share, só Copiar aparece', !act('cestaenviar') && !!act('cestacopiar'));
    Object.defineProperty(navigator, 'share', { configurable: true, value: fakeShare }); __t.render(); await wait(100);
    var p1 = __t.cesta().enviados[0], alvo = p1 && p1.itens[p1.itens.length - 1], inp3 = q('#cat-q');
    if (inp3 && alvo) { inp3.focus(); inp3.value = alvo.name; inp3.dispatchEvent(new Event('input', { bubbles: true })); await wait(100); }
    var ce = alvo && qa('#cat-list .catc').filter(function (c) { return c.querySelector('h3').textContent === alvo.name; })[0];
    check('Catálogo marca Pedido enviado', !!ce && /Pedido enviado/.test(ce.textContent) && !ce.querySelector('[data-act="catcesta"]'));
    if (inp3) { inp3.value = ''; inp3.dispatchEvent(new Event('input', { bubbles: true })); inp3.blur(); }
    var p2 = __t.cesta().enviados[1], k2s = p2 ? p2.itens.map(function (x) { return x.key; }) : [];
    click(p2 && q('#enviados [data-act="peddescartar"][data-id="' + p2.id + '"]')); await wait(100);
    var conf = p2 && q('#enviados [data-act="pedconfirm"][data-id="' + p2.id + '"]');
    click(conf); await wait(150);
    var kk = keys();
    check('Descartar pede confirmação e devolve os charutos à montagem', !!conf && __t.cesta().enviados.length === 1 &&
      kk.length === k2s.length && kk.every(function (k) { return k2s.indexOf(k) >= 0; }));
    var d1 = q('#enviados details[data-ped]'); if (d1 && !d1.open) { d1.open = true; await wait(80); }
    check('alvos de 44 px: Enviar, Copiar, Chegou, Guardar no estoque, Reenviar e Descartar',
      ['cestaenviar', 'cestacopiar', 'pedveio', 'pedguardar', 'pedreenviar', 'peddescartar'].every(function (a) { var el = qa('[data-act="' + a + '"]'); return el.length > 0 && el.every(grande); }));
    check('página sem rolagem horizontal com o pedido aberto', document.documentElement.scrollWidth <= innerWidth);
  } finally {
    if (dShare) Object.defineProperty(navigator, 'share', dShare); else delete navigator.share;
    if (dClip) Object.defineProperty(navigator, 'clipboard', dClip); else delete navigator.clipboard;
  }

  S.cigars = bk.c; S.sessions = bk.s; S.tab = bk.tab; S.contaSec = bk.sec; S.view = bk.view; S.catQ = bk.q; S.catN = bk.n; S.confirm = bk.confirm; S.pedOpen = bk.pedOpen;
  __t.cesta(JSON.parse(bk.cesta));
  if (bk.ls == null) localStorage.removeItem(LS); else localStorage.setItem(LS, bk.ls);
  __t.render(); await wait(80);
  var falhas = R.filter(function (s) { return s.indexOf('FAIL') === 0; }).length;
  return { ok: falhas === 0, falhas: falhas, resultados: R };
})();
