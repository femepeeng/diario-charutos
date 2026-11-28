// Testes das funções puras da nova Início (2.13.0): lista da folha "Iniciar sessão", progresso do nível e textos do herói.
// Uso: node tests/inicio.test.js
// Avalia, num sandbox vm, os blocos @pure:base, @pure:sabores (normSabor) e @pure:inicio de index.html.
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const pick = tag => [...html.matchAll(new RegExp('\\/\\* @pure:' + tag + ' \\*\\/([\\s\\S]*?)\\/\\* @end:' + tag + ' \\*\\/', 'g'))].map(m => m[1]);
const NOMES = ['inicioCharutos', 'abaInicial', 'nivelProgresso', 'quandoTexto', 'ultimaSessaoTexto'];
const sb = {};
vm.createContext(sb);
vm.runInContext(pick('base').concat(pick('sabores'), pick('inicio')).join('\n') + '\nthis.__x={' + NOMES.map(n => n + ':typeof ' + n + '!=="undefined"?' + n + ':undefined').join(',') + '};', sb);
const X = sb.__x;
const plain = v => JSON.parse(JSON.stringify(v));

let pass = 0, fail = 0;
function test(name, fn) {
  try { fn(); pass++; console.log('  ok   ' + name); }
  catch (e) { fail++; console.log('  FAIL ' + name + '\n       ' + e.message); }
}

console.log('Nova Início: funções puras');

const A = { id: 'a', name: 'Partagás D4', status: 'estoque', order: 2, origin: 'Cuba', strength: 4, vitola: '124 x 50' };
const B = { id: 'b', name: 'Bolívar', status: 'cesta', order: 1, strength: 4, vitola: '124 x 50' };
const C = { id: 'c', name: 'Cohiba', status: 'estoque,cesta', order: 3 };
const D = { id: 'd', name: 'Davidoff', status: '', order: 4 };
const AGORA = new Date(2026, 10, 28, 12, 0).getTime();
const dia = n => new Date(2026, 10, 28 - n, 12, 0).toISOString();

test('inicioCharutos: estoque, acervo, busca sem acento e ordem', () => {
  assert.strictEqual(typeof X.inicioCharutos, 'function', 'inicioCharutos fora do bloco @pure:inicio');
  assert.deepStrictEqual(plain(X.inicioCharutos([D, C, B, A], 'estoque', '')).map(c => c.id), ['a', 'c']);
  assert.deepStrictEqual(plain(X.inicioCharutos([D, C, B, A], 'acervo', '')).map(c => c.id), ['b', 'a', 'c', 'd']);
  assert.deepStrictEqual(plain(X.inicioCharutos([D, C, B, A], 'acervo', 'partagas')).map(c => c.id), ['a']);
  assert.strictEqual(X.inicioCharutos([A], 'acervo', '')[0].meta, 'Cuba · força 4/5 · 124 x 50');
  assert.strictEqual(X.inicioCharutos([B], 'acervo', '')[0].meta, 'força 4/5 · 124 x 50');
});
test('abaInicial: estoque, acervo ou avulso', () => {
  assert.strictEqual(X.abaInicial([B, A]), 'estoque');
  assert.strictEqual(X.abaInicial([B, D]), 'acervo');
  assert.strictEqual(X.abaInicial([]), 'avulso');
});
test('nivelProgresso: barra, faltam N e nível máximo', () => {
  const p = plain(X.nivelProgresso({ xp: 28, name: 'Iniciante', floor: 0, next: [40, 'Apreciador'] }));
  assert.strictEqual(p.pct, 70); assert.strictEqual(p.faltam, 12); assert.strictEqual(p.proximo, 'Apreciador'); assert.strictEqual(p.max, false);
  const m = plain(X.nivelProgresso({ xp: 500, name: 'Mestre', floor: 450, next: null }));
  assert.strictEqual(m.max, true); assert.strictEqual(m.pct, 100); assert.strictEqual(m.faltam, 0);
});
test('quandoTexto: hoje, ontem, há N dias e data', () => {
  assert.strictEqual(X.quandoTexto(dia(0), AGORA), 'hoje');
  assert.strictEqual(X.quandoTexto(dia(1), AGORA), 'ontem');
  assert.strictEqual(X.quandoTexto(dia(3), AGORA), 'há 3 dias');
  assert.strictEqual(X.quandoTexto(dia(40), AGORA), 'em 19/10');
  assert.strictEqual(X.quandoTexto('x', AGORA), '');
});
test('ultimaSessaoTexto: a concluída mais recente, nota com vírgula', () => {
  const ss = [
    { cigarName: 'Antiga', status: 'concluida', rating: 9, endedAt: dia(10) },
    { cigarName: 'Oliva V Melanio', status: 'concluida', rating: 7.5, endedAt: dia(3) },
    { cigarName: 'Aberta', status: 'aberta', createdAt: dia(0) }];
  assert.strictEqual(X.ultimaSessaoTexto(ss, AGORA), 'Última sessão: Oliva V Melanio · nota 7,5 · há 3 dias');
  assert.strictEqual(X.ultimaSessaoTexto([{ cigarName: 'Sem nota', status: 'concluida', rating: null, endedAt: dia(1) }], AGORA), 'Última sessão: Sem nota · ontem');
  assert.strictEqual(X.ultimaSessaoTexto([{ cigarName: 'Aberta', status: 'aberta' }], AGORA), '');
});

console.log(`\n${pass} ok, ${fail} falha(s)`);
process.exit(fail ? 1 : 0);
