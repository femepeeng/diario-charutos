// Testes das funções puras do Guia de bolso.
// Uso: node tests/guia.test.js
// Avalia, num sandbox vm, os trechos de index.html entre /* @pure:guia */ e /* @end:guia */.
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const blocks = [...html.matchAll(/\/\* @pure:guia \*\/([\s\S]*?)\/\* @end:guia \*\//g)].map(m => m[1]);
const sb = {};
vm.createContext(sb);
vm.runInContext(blocks.join('\n') + '\nthis.__x={GUIDE:typeof GUIDE!=="undefined"?GUIDE:undefined,GUIDE_ICONS:typeof GUIDE_ICONS!=="undefined"?GUIDE_ICONS:undefined,GUIDE_TOOL:typeof GUIDE_TOOL!=="undefined"?GUIDE_TOOL:undefined,guideOfDay:typeof guideOfDay!=="undefined"?guideOfDay:undefined,humidorStatus:typeof humidorStatus!=="undefined"?humidorStatus:undefined,cutTipOf:typeof cutTipOf!=="undefined"?cutTipOf:undefined,VITOLAS_CORTE:typeof VITOLAS_CORTE!=="undefined"?VITOLAS_CORTE:undefined};', sb);
const X = sb.__x;

let pass = 0, fail = 0;
function test(name, fn) {
  try { fn(); pass++; console.log('  ok   ' + name); }
  catch (e) { fail++; console.log('  FAIL ' + name + '\n       ' + e.message); }
}

console.log('Guia de bolso: funções puras');

// ---- Tarefa 1 ----
const REGRAS = [
  'Conservação', '65–70% de umidade · 16–18 °C',
  'Viagem e praia', 'Hermético, longe do sol e de perfumes',
  'Corte', 'Reto de 2 a 3 mm nos parejos, diagonal nos figurados',
  'Acendimento', 'Chama limpa, toste sem encostar',
  'Ritmo e cinza', 'Uma baforada a cada 30 a 60 segundos',
  'Paladar', 'O retrohale revela as notas; charuto não se traga',
  'Quando parar', 'Quando o prazer acaba'
];
test('GUIDE tem 7 tópicos com [titulo, html, regra] e as regras da especificação', () => {
  assert.ok(Array.isArray(X.GUIDE), 'GUIDE não encontrado no bloco @pure:guia');
  assert.strictEqual(X.GUIDE.length, 7);
  for (let i = 0; i < 7; i++) {
    assert.strictEqual(X.GUIDE[i][0], REGRAS[i * 2]);
    assert.ok(/<p>/.test(X.GUIDE[i][1]), 'html do tópico ' + i);
    assert.strictEqual(X.GUIDE[i][2], REGRAS[i * 2 + 1]);
  }
});
test('GUIDE_ICONS tem 7 SVGs decorativos', () => {
  assert.ok(Array.isArray(X.GUIDE_ICONS), 'GUIDE_ICONS não encontrado');
  assert.strictEqual(X.GUIDE_ICONS.length, 7);
  X.GUIDE_ICONS.forEach((s, i) => assert.ok(/^<svg[^>]*aria-hidden="true"/.test(s), 'ícone ' + i));
});
test('GUIDE_TOOL liga Conservação, Corte e Ritmo às ferramentas', () => {
  assert.deepStrictEqual(JSON.parse(JSON.stringify(X.GUIDE_TOOL)), { 0: 'umidor', 2: 'corte', 4: 'ritmo' });
});
test('guideOfDay usa o dia do ano mod 7', () => {
  assert.strictEqual(typeof X.guideOfDay, 'function', 'guideOfDay não encontrado');
  assert.strictEqual(X.guideOfDay(new Date(2026, 0, 1)), 1);
  assert.strictEqual(X.guideOfDay(new Date(2026, 0, 7)), 0);
  assert.strictEqual(X.guideOfDay(new Date(2026, 11, 31)), 365 % 7);
});

console.log(`\n${pass} ok, ${fail} falha(s)`);
process.exit(fail ? 1 : 0);
