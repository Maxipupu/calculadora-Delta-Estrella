import test from 'node:test';
import assert from 'node:assert/strict';
import { parseComplexInput, solveComplex, toPolar, formatPolar, formatRectangular } from '../src/operacionesComplejas.js';
const near = (actual, expected, epsilon = 1e-9) => assert.ok(Math.abs(actual - expected) < epsilon, `Se esperaba ${expected}, se obtuvo ${actual}`);

test('acepta rectangulares, polares, i/j y coma decimal', () => {
  assert.deepEqual(parseComplexInput('3+4j'), { r: 3, i: 4, inputFormat: 'rectangular' });
  assert.deepEqual(parseComplexInput('2-3i'), { r: 2, i: -3, inputFormat: 'rectangular' });
  assert.deepEqual(parseComplexInput('-j'), { r: 0, i: -1, inputFormat: 'rectangular' });
  const a = parseComplexInput('5∠30°'); near(a.r, 5*Math.cos(Math.PI/6)); near(a.i, 2.5);
  const b = parseComplexInput('2,5∠-90'); near(b.r, 0); near(b.i, -2.5);
});
test('operaciones con formatos mixtos', () => {
  for (const op of ['+', '-', '×', '÷']) {
    const { result } = solveComplex('3+4j', '5∠30°', op);
    const br = 5*Math.cos(Math.PI/6), bi = 2.5;
    const expected = ({'+': [3+br, 4+bi], '-': [3-br, 4-bi], '×': [3*br-4*bi, 3*bi+4*br], '÷': [(3*br+4*bi)/25, (4*br-3*bi)/25]})[op];
    near(result.r, expected[0]); near(result.i, expected[1]);
  }
});
test('polares multiplicación y división, también rectangulares puras', () => {
  let z = solveComplex('10∠45°', '4∠-20°', '×').result;
  near(toPolar(z).magnitude, 40); near(toPolar(z).degrees, 25);
  z = solveComplex('10∠45°', '4∠-20°', '÷').result;
  near(toPolar(z).magnitude, 2.5); near(toPolar(z).degrees, 65);
  z = solveComplex('1+j', '1-j', '×').result;
  near(z.r, 2); near(z.i, 0);
});
test('rechaza errores matemáticos y sintaxis no válidas', () => {
  assert.throws(() => solveComplex('3+j', '0', '÷'), /cero/i);
  assert.throws(() => parseComplexInput('-5∠30°'), /módulo/i);
  assert.throws(() => parseComplexInput('3 + hola'), /formato/i);
  assert.throws(() => solveComplex('', '1', '+'), /ingresa/i);
});
test('formateo legible', () => {
  assert.equal(formatRectangular({r:3, i:-4}), '3 − 4j');
  assert.equal(formatPolar({r:0, i:1}), '1 ∠ 90°');
});
