// Testes das funções do app que gravam no armazenamento (IndexedDB e localStorage), rodadas com dublês.
// Uso: node tests/app.test.js
// Extrai de index.html o código de put, saveErr, pedById, pedGuardar e wipeLocalForAccount, e dos auxiliares
// clone, cigarById, upsertState, sortAll e uid (do "function" até a chave que fecha o corpo), mais os blocos
// @pure:curadoria e @pure:cesta. Roda tudo num sandbox vm em que putRec, clearStore, loadAll, ls, toast e render
// são dublês: nada toca num banco de verdade.
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const pick = tag => [...html.matchAll(new RegExp('\\/\\* @pure:' + tag + ' \\*\\/([\\s\\S]*?)\\/\\* @end:' + tag + ' \\*\\/', 'g'))].map(m => m[1]);
/* Código-fonte de uma função do app, pulando o que está entre aspas ao contar as chaves. */
function fonte(nome) {
  const m = new RegExp('(?:async )?function ' + nome + '\\(').exec(html);
  if (!m) throw new Error(nome + ' não encontrada em index.html');
  let prof = 0, aspa = '';
  for (let j = html.indexOf('{', m.index); j < html.length; j++) {
    const ch = html[j];
    if (aspa) { if (ch === '\\') j++; else if (ch === aspa) aspa = ''; continue; }
    if (ch === "'" || ch === '"' || ch === '`') aspa = ch;
    else if (ch === '{') prof++;
    else if (ch === '}' && --prof === 0) return html.slice(m.index, j + 1);
  }
  throw new Error(nome + ': chaves sem par');
}
/* Função que ainda não existe vira um comentário: o teste dela falha sozinho, sem derrubar o arquivo. */
const APP = ['put', 'saveErr', 'pedById', 'pedGuardar', 'wipeLocalForAccount', 'clone', 'cigarById', 'upsertState', 'sortAll', 'uid',
  'enviadosHtml', 'flush', 'finishSaved'].map(n => { try { return fonte(n); } catch (e) { return '/* ' + n + ' ausente */'; } }).join('\n');
const DUBLES = `
var T = { toasts: [], renders: 0, persisted: 0, loads: 0, writes: [], lsMap: {} };
var state = { cigars: [], sessions: [], confirm: '', pedOpen: null };
var cesta = cestaLoad(null), cloud = { user: { id: 'u2' }, ownerMismatch: true }, photoURL = {};
var URL = { revokeObjectURL: function () {} };
function toast(m) { T.toasts.push(m); }
function render() { T.renders++; }
function cestaPersist() { T.persisted++; }
function scheduleSync() {}
function sync() {}
function ls(k, v) { if (v === undefined) return k in T.lsMap ? T.lsMap[k] : null; if (v === null) { delete T.lsMap[k]; return null; } T.lsMap[k] = String(v); }
function putRec(col, o) { T.writes.push(o); return OPT.putRec(o); }
function clearStore() { return Promise.resolve(); }
function loadAll() { T.loads++; return OPT.loadAll ? OPT.loadAll() : Promise.resolve(); }
var draft = null, saveTimer = null, sessionSaver = function (d) { return put('sessions', d); };
function clearTimeout() {}
`;
/* Um app novo por teste; putRec decide se cada gravação confirma, falha ou fica pendente, e loadAll (opcional) se a leitura funciona. */
function app(putRec, loadAll) {
  const sb = { OPT: { putRec, loadAll } };
  vm.createContext(sb);
  vm.runInContext(pick('base').concat(pick('curadoria'), pick('cesta')).join('\n') + '\n' + APP + '\n' + DUBLES, sb);
  return sb;
}
const plain = v => JSON.parse(JSON.stringify(v));
const flush = () => new Promise(r => setImmediate(r));
/* Pedido com Cohiba Siglo II (no Acervo, com Cesta: vira Estoque) e Montecristo Nº 4 (fora do Acervo: é criado). */
function montar(sb, cigars) {
  sb.state.cigars = cigars || [{ id: 'k1', name: 'Cohiba Siglo II', status: 'cesta', strength: 4, order: 1 }];
  sb.cesta.enviados = [{ id: 'p1', em: '2026-11-24T15:00:00.000Z', seg: 'todos', texto: 't', itens: [
    { key: 'cohiba siglo ii', name: 'Cohiba Siglo II', bitola: '129 x 42', origin: 'Cuba', strength: 4, wrapper: 'cubana', cigarId: 'k1', veio: true },
    { key: 'montecristo n 4', name: 'Montecristo Nº 4', bitola: '129 x 42', origin: 'Cuba', strength: 3, wrapper: 'cubana', cigarId: '', veio: true }] }];
}

const testes = [];
function test(nome, fn) { testes.push([nome, fn]); }

// ---- Guardar no estoque ----
test('Guardar no estoque espera as gravações: o pedido só sai depois que todas confirmam', async () => {
  const pend = [], sb = app(() => new Promise(res => pend.push(res)));
  montar(sb);
  const r = sb.pedGuardar('p1'); await flush();
  assert.strictEqual(sb.cesta.enviados.length, 1, 'o pedido saiu antes de as gravações confirmarem');
  assert.strictEqual(pend.length, 2, 'eram 2 gravações');
  pend.forEach(f => f()); await r; await flush();
  assert.strictEqual(sb.cesta.enviados.length, 0, 'o pedido não saiu depois das gravações');
  assert.ok(sb.T.persisted > 0, 'a Cesta não foi gravada');
  assert.strictEqual(sb.T.toasts[sb.T.toasts.length - 1], '2 charutos foram para o Estoque, no Acervo.');
});
test('uma gravação que falha mantém o pedido, recarrega o estado e pede para tentar de novo', async () => {
  let n = 0; const sb = app(() => (++n === 2 ? Promise.reject(new Error('falhou')) : Promise.resolve()));
  montar(sb);
  await sb.pedGuardar('p1'); await flush();
  assert.strictEqual(sb.cesta.enviados.length, 1, 'o pedido saiu mesmo com a gravação falhando');
  assert.strictEqual(sb.T.loads, 1, 'o estado não foi recarregado do armazenamento');
  assert.ok(/Tente de novo/.test(sb.T.toasts[sb.T.toasts.length - 1] || ''), sb.T.toasts.join(' | '));
  assert.ok(!sb.T.toasts.some(t => /foram para o Estoque/.test(t)), 'avisou sucesso: ' + sb.T.toasts.join(' | '));
});
test('gravação e leitura falhando: o estado volta ao de antes do toque, e o segundo toque grava de novo e mantém o pedido', async () => {
  const perdida = () => Promise.reject(new Error('Connection to Indexed Database server lost'));
  const sb = app(perdida, perdida);
  montar(sb);
  assert.strictEqual(await sb.pedGuardar('p1'), false);
  await flush();
  assert.deepStrictEqual(plain(sb.state.cigars.map(c => [c.name, c.status])), [['Cohiba Siglo II', 'cesta']], 'a memória ficou com o que não foi gravado');
  assert.strictEqual(sb.T.writes.length, 2);
  await sb.pedGuardar('p1'); await flush();
  assert.strictEqual(sb.T.writes.length, 4, 'o segundo toque não tentou gravar de novo');
  assert.strictEqual(sb.cesta.enviados.length, 1, 'o pedido saiu sem nada gravado');
});
test('dois toques seguidos: o pedido só sai quando as gravações do primeiro confirmam', async () => {
  const pend = [], sb = app(() => new Promise(res => pend.push(res)));
  montar(sb);
  const r1 = sb.pedGuardar('p1'), r2 = sb.pedGuardar('p1');
  await r2; await flush();
  assert.strictEqual(sb.cesta.enviados.length, 1, 'o segundo toque tirou o pedido antes de o primeiro gravar');
  pend.forEach(f => f()); await r1; await flush();
  assert.strictEqual(sb.cesta.enviados.length, 0);
  assert.strictEqual(sb.T.writes.length, 2, 'gravou ' + sb.T.writes.length + ' vezes');
});
test('com tudo já no Estoque, nada a gravar: o pedido sai na hora', async () => {
  const sb = app(() => Promise.reject(new Error('não deveria gravar')));
  montar(sb, [{ id: 'k1', name: 'Cohiba Siglo II', status: 'estoque', strength: 4 }, { id: 'k2', name: 'Montecristo Nº 4', status: 'estoque', strength: 3 }]);
  await sb.pedGuardar('p1'); await flush();
  assert.strictEqual(sb.T.writes.length, 0);
  assert.strictEqual(sb.cesta.enviados.length, 0);
});

// ---- 2.12.1: Guardando… e o aviso do fim de sessão ----
test('Guardar no estoque mostra Guardando… e desativa o botão enquanto grava', async () => {
  const pend = [], sb = app(() => new Promise(res => pend.push(res)));
  montar(sb);
  sb.cesta.enviados.push({ id: 'p2', em: '2026-11-25T15:00:00.000Z', seg: 'todos', texto: 't2',
    itens: [{ key: 'outro', name: 'Outro', bitola: '', origin: '', strength: 0, wrapper: '', cigarId: '', veio: true }] });
  assert.strictEqual(typeof sb.enviadosHtml, 'function', 'enviadosHtml não encontrada');
  const antes = sb.T.renders, r = sb.pedGuardar('p1');
  assert.ok(sb.T.renders > antes, 'não redesenhou ao travar');
  const partes = sb.enviadosHtml().split('<details class="ped"').slice(1), parte = id => partes.find(x => x.indexOf('data-ped="' + id + '"') >= 0) || '';
  assert.ok(/data-act="pedguardar" data-id="p1" disabled>Guardando…</.test(parte('p1')), 'o p1 não mostra Guardando…');
  assert.ok(/data-act="pedguardar" data-id="p2">Guardar no estoque</.test(parte('p2')), 'o p2 deixou de mostrar Guardar no estoque');
  pend.forEach(f => f()); await r; await flush();
  assert.ok(sb.enviadosHtml().indexOf('Guardando…') < 0, 'continuou Guardando… depois de gravar');
});
test('fim de sessão com a gravação falhando: fica o aviso de falha, sem "salva"', async () => {
  const sb = app(() => Promise.reject(new Error('falhou')));
  sb.draft = { id: 's1', thirds: [] };
  assert.strictEqual(typeof sb.finishSaved, 'function', 'finishSaved não encontrada');
  await sb.finishSaved(false); await flush();
  assert.ok(sb.T.toasts.indexOf('Não foi possível salvar. Tente de novo.') >= 0, sb.T.toasts.join(' | '));
  assert.ok(sb.T.toasts.indexOf('Sessão salva no diário') < 0, 'avisou "salva" com a gravação falhando');
});
test('fim de sessão com a gravação pendente: nada de "salva" antes de confirmar', async () => {
  const pend = [], sb = app(() => new Promise(res => pend.push(res)));
  sb.draft = { id: 's1', thirds: [] };
  assert.strictEqual(typeof sb.finishSaved, 'function', 'finishSaved não encontrada');
  const r = sb.finishSaved(false); await flush();
  assert.ok(sb.T.toasts.indexOf('Sessão salva no diário') < 0, 'avisou antes de gravar');
  pend.forEach(f => f()); await r; await flush();
  assert.ok(sb.T.toasts.indexOf('Sessão salva no diário') >= 0, 'não avisou depois de gravar');
});
test('fim de sessão com a gravação certa: "Sessão salva no diário", ou "Alterações salvas" na edição', async () => {
  const sb = app(() => Promise.resolve());
  sb.draft = { id: 's1', thirds: [] };
  assert.strictEqual(typeof sb.finishSaved, 'function', 'finishSaved não encontrada');
  await sb.finishSaved(false); await flush();
  assert.strictEqual(sb.T.toasts[sb.T.toasts.length - 1], 'Sessão salva no diário');
  await sb.finishSaved(true); await flush();
  assert.strictEqual(sb.T.toasts[sb.T.toasts.length - 1], 'Alterações salvas');
});

// ---- Troca de conta ----
test('Apagar os registros do aparelho também zera a Cesta', async () => {
  const sb = app(() => Promise.resolve());
  montar(sb); sb.cesta.fora = ['x']; sb.cesta.size = 7; sb.T.lsMap['diario-cesta'] = '{"v":1,"size":7}';
  await sb.wipeLocalForAccount(); await flush();
  assert.deepStrictEqual(plain(sb.cesta), { v: 1, size: 5, seg: 'todos', fora: [], enviados: [] });
  assert.ok(!('diario-cesta' in sb.T.lsMap), 'diario-cesta continuou no localStorage');
  assert.strictEqual(sb.T.lsMap['clube-owner'], 'u2');
});

(async () => {
  console.log('App: funções que gravam no armazenamento (com dublês)');
  let pass = 0, fail = 0;
  for (const [nome, fn] of testes) {
    try { await fn(); pass++; console.log('  ok   ' + nome); }
    catch (e) { fail++; console.log('  FAIL ' + nome + '\n       ' + e.message); }
  }
  console.log(`\n${pass} ok, ${fail} falha(s)`);
  process.exit(fail ? 1 : 0);
})();
