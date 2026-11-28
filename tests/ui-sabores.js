/* Verificações de interface da roda de sabores, rodadas no navegador com o app aberto.
   Uso no console (ou javascript_tool): eval(await (await fetch('/tests/ui-sabores.js?' + Date.now())).text())
   Devolve {ok, falhas, resultados}. Não grava nada: abre uma sessão falsa só na memória (__t.sessao) e troca o gravador
   da sessão por um falso (__t.setSessionSaver), que só conta as chamadas. No fim, fecha a sessão e devolve o gravador. */
(async function () {
  var R = [], wait = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  function check(nome, cond) { R.push((cond ? 'ok   ' : 'FAIL ') + nome); }
  function q(s) { return document.querySelector(s); }
  function qa(s) { return Array.prototype.slice.call(document.querySelectorAll(s)); }
  /* As fatias são <g> de SVG, que não têm .click(): o clique vai por evento. */
  function tap(el) { if (el) el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })); }
  function tecla(el, k) { if (el) el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true })); }
  function fams() { return qa('#roda [data-act="roda-fam"]'); }
  function notas() { return qa('#roda [data-act="note"]'); }
  function fam(id) { return q('#roda [data-act="roda-fam"][data-id="' + id + '"]'); }
  function nota(n) { return q('#roda [data-act="note"][data-val="' + n + '"]'); }
  function texto(s) { var e = q(s); return e ? e.textContent : ''; }
  function cur() { var d = __t.sessao(); return d ? d.thirds[__t.state.step].notes : []; }
  function cabem() { return qa('#roda text[data-max]').every(function (t) { return t.getBBox().width <= +t.getAttribute('data-max') + 0.5; }); }
  function buscar(v) { var i = q('#sabor-q'); if (!i) return; i.value = v; i.dispatchEvent(new Event('input', { bubbles: true })); }

  var S = __t.state, bk = { tab: S.tab, view: S.view, step: S.step, sec: S.contaSec }, nGrav = 0, gravAntes = null;
  var falsa = { id: 't-roda', cigarId: '', cigarName: 'Teste da roda', status: 'aberta', visibility: 'private', mission: 'flor', createdAt: new Date().toISOString(),
    timer: { acc: 0, running: false, resumedAt: null },
    thirds: [{ notes: ['Cedro'], intensity: 0, text: '' }, { notes: [], intensity: 0, text: '' }, { notes: [], intensity: 0, text: '' }] };
  try {
    gravAntes = __t.setSessionSaver(function () { nGrav++; return Promise.resolve(true); });
    __t.sessao(falsa); await wait(120);

    check('a roda fechada mostra 11 famílias', fams().length === 11);

    tap(fam('especiaria')); await wait(30);
    check('tocar numa família abre a roda nela', notas().length === 12 && texto('#roda-card').indexOf('Especiarias') >= 0);

    tap(nota('Canela'));
    check('toque logo depois de abrir é ignorado', !!nota('Canela') && nota('Canela').getAttribute('aria-pressed') === 'false' && cur().indexOf('Canela') < 0);

    await wait(350); tap(nota('Canela'));
    check('tocar na nota marca no terço, mostra o cartão e o chip',
      cur().indexOf('Canela') >= 0 && texto('#roda-card').indexOf('Lembra:') >= 0 && !!q('#roda-sel [data-val="Canela"]'));

    tap(q('#roda-card [data-act="note"]'));
    check('o botão do cartão desmarca', cur().indexOf('Canela') < 0);

    tap(nota('Canela')); tap(q('#roda-sel [data-act="note"][data-val="Canela"]'));
    check('o chip tira a nota', cur().indexOf('Canela') < 0 && !q('#roda-sel [data-val="Canela"]'));

    tap(q('#roda [data-act="roda-volta"]'));
    check('voltar fecha a roda', fams().length === 11);

    buscar('chumbo');
    var achou = !!q('#sabor-res [data-val="Grafite"]');
    tap(q('#sabor-res [data-val="Grafite"]'));
    check('a busca acha pelo nome da imagem e marca',
      achou && cur().indexOf('Grafite') >= 0 && notas().length === 6 && (q('#sabor-q') || {}).value === 'chumbo' &&
      !!q('#sabor-res [data-val="Grafite"]') && q('#sabor-res [data-val="Grafite"]').getAttribute('aria-pressed') === 'true');

    var inp = q('#sabor-q');
    if (inp) { inp.focus(); buscar('can'); inp.setSelectionRange(3, 3); }
    __t.render(); await wait(30);
    var ae = document.activeElement;
    check('a busca mantém o foco num redesenho', !!ae && ae.id === 'sabor-q' && ae.value === 'can' && ae.selectionStart === 3);
    buscar('');

    tap(q('#roda [data-act="roda-volta"]')); await wait(30);
    var fr = fam('fruta'); if (fr) fr.focus();
    tecla(fr, 'Enter'); await wait(30);
    var foco = document.activeElement, abriu = notas().length === 10 && !!foco && foco.getAttribute && foco.getAttribute('data-act') === 'note';
    await wait(350);
    var v = foco && foco.getAttribute ? foco.getAttribute('data-val') : '';
    tecla(document.activeElement, 'Enter'); await wait(30);
    check('Enter abre a família e marca a nota pelo teclado',
      abriu && !!v && cur().indexOf(v) >= 0 && !!document.activeElement && document.activeElement.getAttribute && document.activeElement.getAttribute('data-val') === v);

    tap(q('#roda [data-act="roda-volta"]')); await wait(30);
    var fechadaCabe = cabem();
    tap(fam('especiaria')); await wait(30);
    check('nenhum rótulo passa do espaço da fatia', fechadaCabe && cabem());

    tap(q('[data-act="step"][data-id="1"]')); await wait(60);
    check('trocar de terço fecha a roda e mostra as notas do terço',
      fams().length === 11 && texto('#roda-sel').indexOf('Nada marcado ainda.') >= 0 && __t.state.saborQ === '');

    tap(q('.mission [data-act="roda-fam"]')); await wait(30);
    check('a missão pendente abre a família na roda', notas().length === 4);

    var svg = q('#roda svg'), k = svg ? svg.getBoundingClientRect().width / 360 : 0;
    function circulo(theta, r0, r1) { var s = Math.sin(theta * Math.PI / 360); return r1 * (1 - s) / (1 + s) >= r0 ? k * 2 * r1 * s / (1 + s) : 0; }
    check('alvo de toque de pelo menos 44 px (' + Math.round(circulo(360 / 11, 52, 140)) + ' e ' + Math.round(circulo(30, 52, 175)) + ' px)',
      circulo(360 / 11, 52, 140) >= 44 && circulo(30, 52, 175) >= 44);
    check('sem rolagem horizontal', document.documentElement.scrollWidth <= innerWidth);

    await wait(700);
    check('nada foi gravado no diário', nGrav >= 1 && !__t.state.sessions.some(function (s) { return s.id === 't-roda'; }));

    /* A lição não é aberta: abrir grava a leitura. O texto já está no <details> fechado. */
    __t.sessao(null); S.tab = 'paladar'; S.view = 'home'; __t.render(); await wait(80);
    var lic = q('details[data-lesson="paladar"]');
    check('a lição Treinando o paladar fala da roda', !!lic && lic.innerHTML.indexOf('a roda de sabores ajuda') >= 0);
  } catch (e) {
    check('sem exceção no teste: ' + e.message, false);
  } finally {
    if (__t.sessao) __t.sessao(null);
    if (gravAntes && __t.setSessionSaver) __t.setSessionSaver(gravAntes);
    S.tab = bk.tab; S.view = bk.view; S.step = bk.step; S.contaSec = bk.sec;
    __t.render(); await wait(60);
  }
  var falhas = R.filter(function (s) { return s.indexOf('FAIL') === 0; }).length;
  return { ok: falhas === 0, falhas: falhas, resultados: R };
})();
