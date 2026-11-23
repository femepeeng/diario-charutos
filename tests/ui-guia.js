/* Verificações de interface do Guia de bolso, rodadas no navegador com o app aberto.
   Uso no console (ou javascript_tool): eval(await (await fetch('/tests/ui-guia.js')).text())
   Devolve {ok, falhas, resultados}. Não altera dados: só navega entre telas. */
(async function () {
  var R = [], wait = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  function check(nome, cond) { R.push((cond ? 'ok   ' : 'FAIL ') + nome); }
  function q(s) { return document.querySelector(s); }
  function qa(s) { return Array.prototype.slice.call(document.querySelectorAll(s)); }
  function click(el) { if (el) el.click(); }
  async function irInicio() { click(qa('[role=tab]').filter(function (b) { return b.innerText.trim() === 'Início'; })[0]); await wait(150); }

  // ---- Tarefa 1 ----
  check('abas: Início,Acervo,Histórico,Paladar,Comparar,Conta',
    qa('[role=tab]').map(function (b) { return b.innerText.trim(); }).join(',') === 'Início,Acervo,Histórico,Paladar,Comparar,Conta');
  check('aba aberta ao carregar é Início', (q('[role=tab][aria-selected=true]') || {}).innerText === 'Início');
  await irInicio();
  check('carrossel tem 7 cartões', qa('.gcard').length === 7);
  check('primeiro cartão é a Dica do dia', !!q('.gcard') && q('.gcard').textContent.indexOf('Dica do dia') >= 0);
  check('primeiro cartão é o tópico do dia', !!q('.gcard') && q('.gcard').getAttribute('data-id') === String(window.__t && __t.guideOfDay(new Date())));
  check('3 cartões têm o selo Ferramenta', qa('.gcard').filter(function (c) { return c.textContent.indexOf('Ferramenta') >= 0; }).length === 3);
  check('7 pontos indicadores', qa('.gdots i').length === 7);
  check('página sem rolagem horizontal', document.documentElement.scrollWidth <= innerWidth);
  check('cartões com alvo de toque >= 44px', qa('.gcard').every(function (c) { return c.getBoundingClientRect().height >= 44; }));

  // ---- Tarefa 2 ----
  function titulo() { var h = q('h1'); return h ? h.textContent.trim() : ''; }
  function act(a, id) { return q('[data-act="' + a + '"]' + (id != null ? '[data-id="' + id + '"]' : '')); }
  click(q('.gcard[data-id="2"]')); await wait(120);
  check('cartão Corte abre o tópico Corte', titulo() === 'Corte');
  check('tópico Corte tem 10 botões de vitola', qa('[data-act="corte"]').length === 10);
  click(qa('[data-act="corte"]').filter(function (b) { return b.textContent.trim() === 'Torpedo'; })[0]); await wait(120);
  check('Torpedo mostra corte diagonal', /diagonal/.test((q('#corte-out') || {}).textContent || ''));
  click(qa('[data-act="corte"]').filter(function (b) { return b.textContent.trim() === 'Robusto'; })[0]); await wait(120);
  check('Robusto mostra corte reto', /corte reto/.test((q('#corte-out') || {}).textContent || ''));
  check('vitola escolhida fica marcada', (qa('[data-act="corte"][aria-pressed="true"]')[0] || {}).textContent === 'Robusto');
  click(act('guia-nav', '1')); await wait(120);
  check('Próximo vai de Corte para Acendimento', titulo() === 'Acendimento');
  click(act('guia-nav', '-1')); await wait(120); click(act('guia-nav', '-1')); await wait(120);
  check('Anterior volta até Viagem e praia', titulo() === 'Viagem e praia');
  click(act('guia-nav', '-1')); await wait(120); click(act('guia-nav', '-1')); await wait(120);
  check('Anterior em Conservação dá a volta para Quando parar', titulo() === 'Quando parar');
  click(act('guia-nav', '1')); await wait(120);
  check('Próximo em Quando parar dá a volta para Conservação', titulo() === 'Conservação');
  var u = q('[data-gin="umid"]'), t = q('[data-gin="temp"]');
  check('Conservação tem campos de umidade e temperatura decimais', !!u && !!t && u.getAttribute('inputmode') === 'decimal' && t.getAttribute('inputmode') === 'decimal');
  check('sem valores, o resultado pede os dois números', /umidade e a temperatura/i.test((q('#umid-out') || {}).textContent || ''));
  if (u && t) {
    u.focus(); u.value = '67'; u.dispatchEvent(new Event('input', { bubbles: true }));
    t.value = '17'; t.dispatchEvent(new Event('input', { bubbles: true })); await wait(60);
    check('67% e 17 °C dá Ideal', /Ideal/.test((q('#umid-out') || {}).textContent || ''));
    check('campo continua o mesmo elemento após digitar (sem re-render)', q('[data-gin="temp"]') === t);
    t.value = '25'; t.dispatchEvent(new Event('input', { bubbles: true })); await wait(60);
    check('25 °C dá Risco com besouro', /Risco/.test(q('#umid-out').textContent) && /besouro/.test(q('#umid-out').textContent));
    check('resultado tem aria-live', q('#umid-out').getAttribute('aria-live') === 'polite');
  }
  check('botões de navegação com 44px', qa('[data-act="guia-nav"],[data-act="home"]').every(function (b) { return b.getBoundingClientRect().height >= 44; }));
  check('página do tópico sem rolagem horizontal', document.documentElement.scrollWidth <= innerWidth);
  click(act('home')); await wait(150);
  check('Voltar retorna à aba Início', (q('[role=tab][aria-selected=true]') || {}).innerText === 'Início' && qa('.gcard').length === 7);

  // ---- Tarefa 3 ----
  var rit = window.__t && __t.ritmo;
  check('ritmo exposto para teste', !!rit);
  click(q('.gcard[data-id="4"]')); await wait(150);
  check('cartão Ritmo abre Ritmo e cinza', titulo() === 'Ritmo e cinza');
  check('3 botões de intervalo (30, 45, 60 s)', qa('[data-act="ritmo-per"]').map(function (b) { return b.getAttribute('data-id'); }).join(',') === '30,45,60');
  check('anel e número presentes', !!q('#ritmo-ring') && !!q('#ritmo-num'));
  click(act('ritmo-per', '30')); await wait(80);
  check('30 s fica marcado e o número mostra 30', (q('[data-act="ritmo-per"][aria-pressed="true"]') || {}).getAttribute && q('[data-act="ritmo-per"][aria-pressed="true"]').getAttribute('data-id') === '30' && q('#ritmo-num').textContent === '30');
  click(act('ritmo-toggle')); await wait(1250);
  var n1 = parseInt((q('#ritmo-num') || {}).textContent, 10);
  check('após ~1,2 s o número mostra 29 ou 28', n1 === 29 || n1 === 28);
  check('botão vira Parar', /Parar/.test((act('ritmo-toggle') || {}).textContent || ''));
  var timerAntes = rit && rit.timer;
  if (window.__t && __t.render) __t.render();
  await wait(1100);
  var n2 = parseInt((q('#ritmo-num') || {}).textContent, 10);
  check('depois de um render o número continua descendo', n2 < n1);
  check('render não cria um segundo intervalo', !!rit && rit.timer === timerAntes && rit.timer != null);
  check('anel avançou (dashoffset > 0)', parseFloat((q('#ritmo-ring') || { getAttribute: function () { return '0'; } }).getAttribute('stroke-dashoffset')) > 0);
  check('controles do marcador com 44px', qa('[data-act="ritmo-per"],[data-act="ritmo-toggle"]').every(function (b) { return b.getBoundingClientRect().height >= 44; }));
  click(act('guia-nav', '1')); await wait(150);
  check('trocar de tópico para o marcador', !!rit && rit.on === false && rit.timer === null);
  click(act('guia-nav', '-1')); await wait(150);
  click(act('ritmo-toggle')); await wait(300);
  click(act('home')); await wait(150);
  check('Voltar para o marcador', !!rit && rit.on === false && rit.timer === null);

  var falhas = R.filter(function (s) { return s.indexOf('FAIL') === 0; }).length;
  return { ok: falhas === 0, falhas: falhas, resultados: R };
})();
