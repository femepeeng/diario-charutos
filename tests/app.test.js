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
const APP = ['put', 'saveErr', 'pedById', 'pedGuardar', 'wipeLocalForAccount', 'clone', 'cigarById', 'upsertState', 'sortAll', 'uid'].map(fonte).join('\n');
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
function loadAll() { T.loads++; return Promise.resolve(); }
`;
/* Um app novo por teste; putRec decide se cada gravação confirma, falha ou fica pendente. */
function app(putRec) {
  const sb = { OPT: { putRec } };
  vm.createContext(sb);
  vm.runInContext(pick('curadoria').concat(pick('cesta')).join('\n') + '\n' + APP + '\n' + DUBLES, sb);
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
