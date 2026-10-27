/** Herramientas de redes lineales. Convención: corriente positiva de nodo a a nodo b. */
import { C, add, sub, mul, div, abs, ok } from './calc.js';

const zero = () => C(0);
const neg = (z) => C(-z.r, -z.i);
const scale = (z, k) => C(z.r * k, z.i * k);
const isZero = (z) => abs(z) < 1e-12;
const fmt = (x) => Number.isFinite(x) ? Number(x.toPrecision(6)).toString() : '—';

/** Solve an arbitrary small complex linear system with row pivoting. */
export function solveComplex(matrix, rhs) {
  const n = rhs.length;
  if (!n) return [];
  const A = matrix.map((r, i) => [...r.map((z) => C(z.r, z.i)), C(rhs[i].r, rhs[i].i)]);
  const eps = 1e-14; // matriz MNA con distintas dimensiones; no escalar umbral por el mayor resistor
  for (let c = 0; c < n; c++) {
    let pivot = c;
    for (let r = c + 1; r < n; r++) if (abs(A[r][c]) > abs(A[pivot][c])) pivot = r;
    if (abs(A[pivot][c]) <= eps) return null;
    [A[c], A[pivot]] = [A[pivot], A[c]];
    const denom = A[c][c];
    for (let k = c; k <= n; k++) A[c][k] = div(A[c][k], denom);
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const factor = A[r][c];
      for (let k = c; k <= n; k++) A[r][k] = sub(A[r][k], mul(factor, A[c][k]));
    }
  }
  const result = A.map((row) => row[n]);
  return result.every(ok) ? result : null;
}

/** Builds a fundamental cycle basis; in a planar drawing these can be used as mesh loops.
 * Supports any connected linear DC network of R, V, I and AC R, L, C, V, I.
 * Current source branch voltages are extra unknowns (supermesh equations).
 */
export function solveMeshes(elements, omega = 0) {
  if (!elements.length) return { error: 'Agrega elementos al circuito.' };
  if (elements.some((e) => !Number.isInteger(e.a) || !Number.isInteger(e.b) || e.a < 0 || e.b < 0 || e.a === e.b)) return { error: 'Revisa los nodos: deben ser enteros, distintos y no negativos.' };
  const edges = elements.map((e, idx) => ({ ...e, idx, Z: e.t === 'R' ? C(e.v.r) : e.t === 'L' ? C(0, omega * e.v.r) : e.t === 'C' ? (omega ? C(0, -1 / (omega * e.v.r)) : null) : C() }))
    .filter((e) => e.t !== 'C' || omega > 0);
  if (!edges.length) return { error: 'En continua los condensadores son circuitos abiertos: no quedan ramas para analizar.' };
  if (edges.length > 35) return { error: 'El análisis por mallas admite hasta 35 ramas.' };
  const nodes = [...new Set(edges.flatMap((e) => [e.a, e.b]))];
  if (!nodes.includes(0)) return { error: 'Debe existir el nodo de tierra 0.' };
  const adj = new Map(nodes.map((n) => [n, []]));
  edges.forEach((e, i) => { adj.get(e.a).push(i); adj.get(e.b).push(i); });
  const parent = new Map([[0, null]]), depth = new Map([[0, 0]]), tree = new Set(), queue = [0];
  for (let j = 0; j < queue.length; j++) {
    const from = queue[j];
    for (const idx of adj.get(from)) {
      const e = edges[idx], to = from === e.a ? e.b : e.a;
      if (parent.has(to)) continue;
      parent.set(to, { node: from, edge: idx });
      depth.set(to, depth.get(from) + 1);
      tree.add(idx); queue.push(to);
    }
  }
  if (parent.size !== nodes.length) return { error: 'Hay ramas desconectadas de tierra. Comprueba los números de nodo.' };
  const chords = edges.map((_, i) => i).filter((i) => !tree.has(i));
  const m = chords.length;
  if (!m) return { error: 'No hay lazos cerrados. Para utilizar mallas necesitas al menos un ciclo.' };
  if (m > 12) return { error: 'Demasiados lazos para mostrar un desarrollo legible (máximo 12).' };
  const basis = edges.map(() => Array(m).fill(0));
  const cycles = chords.map((idx, j) => {
    const chord = edges[idx];
    basis[idx][j] = 1; // chord a -> b
    let u = chord.b, v = chord.a;
    const branches = [{ idx, sign: 1 }];
    const walk = (child, sign) => {
      const p = parent.get(child), e = edges[p.edge];
      const signed = e.a === child && e.b === p.node ? sign : -sign;
      basis[p.edge][j] += signed;
      branches.push({ idx: p.edge, sign: signed });
      return p.node;
    };
    while (depth.get(u) > depth.get(v)) u = walk(u, 1);
    while (depth.get(v) > depth.get(u)) v = walk(v, -1);
    while (u !== v) { u = walk(u, 1); v = walk(v, -1); }
    return branches;
  });
  const currentSources = edges.map((e, i) => e.t === 'I' ? i : -1).filter((i) => i >= 0);
  const k = currentSources.length, n = m + k;
  const A = Array.from({ length: n }, () => Array.from({ length: n }, zero));
  const rhs = Array.from({ length: n }, zero);
  for (let p = 0; p < m; p++) {
    for (let q = 0; q < m; q++) {
      A[p][q] = edges.reduce((sum, edge, idx) => add(sum, scale(edge.Z, basis[idx][p] * basis[idx][q])), zero());
    }
    rhs[p] = neg(edges.reduce((sum, edge, idx) => edge.t === 'V' ? add(sum, scale(edge.v, basis[idx][p])) : sum, zero()));
    for (let j = 0; j < k; j++) A[p][m + j] = C(basis[currentSources[j]][p]);
  }
  for (let j = 0; j < k; j++) {
    for (let p = 0; p < m; p++) A[m + j][p] = C(basis[currentSources[j]][p]);
    rhs[m + j] = edges[currentSources[j]].v;
  }
  const x = solveComplex(A, rhs);
  if (!x) return { error: 'Sistema de mallas singular o incompatible: comprueba las fuentes y conexiones (por ejemplo fuentes ideales en conflicto).' };
  const branchCurrents = elements.map(() => zero());
  const branchVoltages = elements.map(() => null);
  edges.forEach((e, idx) => {
    const current = basis[idx].reduce((sum, b, j) => add(sum, scale(x[j], b)), zero());
    branchCurrents[e.idx] = current;
    const sourceI = currentSources.indexOf(idx);
    branchVoltages[e.idx] = e.t === 'V' ? e.v : e.t === 'I' ? x[m + sourceI] : mul(e.Z, current);
  });
  // In DC, open capacitors have 0 current; their voltage needs nodal solving.
  return { cycleCount: m, cycles, basis, edges, currents: x.slice(0, m), branchCurrents, branchVoltages,
    matrix: A, rhs, hasCurrentSources: !!k,
    equationInfo: cycles.map((loop, j) => ({ title: `Lazo ${j + 1}`, branches: loop.map(({ idx, sign }) => ({ idx: edges[idx].idx, t: edges[idx].t, sign })) })) };
}

/** Returns symbolic MNA equations for existing nodal solver. 
 * Voltage source and CC shorted inductors add an unknown branch current.
 */
export function nodalSteps(elements, omega = 0, names = []) {
  if (!elements.length) return [];
  const max = Math.max(0, ...elements.flatMap((e) => [e.a, e.b]));
  const currentBranches = elements.map((e, i) => e.t === 'V' || (e.t === 'L' && omega === 0) ? i : -1).filter((i) => i >= 0);
  const equations = [];
  for (let n = 1; n <= max; n++) {
    const terms = [];
    elements.forEach((e, i) => {
      const sign = e.a === n ? 1 : e.b === n ? -1 : 0;
      if (!sign) return;
      const name = names[i] || `${e.t}${i + 1}`;
      const opposite = e.a === n ? e.b : e.a;
      const vv = `(V${n} − ${opposite === 0 ? '0' : `V${opposite}`})`;
      if (e.t === 'R') terms.push(`${vv}/${name}`);
      if (omega && e.t === 'L') terms.push(`${vv}/(jω${name})`);
      if (omega && e.t === 'C') terms.push(`jω${name}·${vv}`);
      if (e.t === 'I') terms.push(`${sign < 0 ? '−' : '+'} ${name}`);
      if (e.t === 'V' || (e.t === 'L' && !omega)) terms.push(`${sign < 0 ? '−' : '+'} I(${name})`);
    });
    equations.push({ title: `KCL — nodo ${n}`, text: (terms.join(' + ').replace(/\+ − /g, '− ') || '0') + ' = 0' });
  }
  currentBranches.forEach((idx) => {
    const e = elements[idx];
    const name = names[idx] || `${e.t}${idx + 1}`;
    const rhs = e.t === 'L' ? '0 V (cortocircuito en CC)' : `E(${name}) = ${fmt(e.v.r)}${e.v.i ? ` ${e.v.i < 0 ? '−' : '+'} ${fmt(Math.abs(e.v.i))}j` : ''} V`;
    equations.push({ title: `Restricción ${name}`, text: `V${e.a} − V${e.b} = ${rhs}` });
  });
  return equations;
}

export function transformSource({ type, voltage, current, resistance }) {
  const R = Number(resistance);
  const val = Number(type === 'V' ? voltage : current);
  if (!Number.isFinite(R) || R <= 0 || !Number.isFinite(val)) return { error: 'Introduce una resistencia mayor que cero y un valor de fuente válido.' };
  if (type === 'V') return { type: 'I', result: val / R, resistance: R,
    formula: 'I_N = V_Th / R', substitution: `I_N = ${fmt(val)} V / ${fmt(R)} Ω = ${fmt(val / R)} A`,
    steps: ['La fuente de tensión debe tener la resistencia EN SERIE.', 'Conserva la resistencia y colócala EN PARALELO con la nueva fuente de corriente.', 'Para mantener V(a) − V(b) positivo, la flecha de la fuente Norton apunta de b hacia a.', 'El equivalente se conserva visto desde los mismos dos terminales externos.'] };
  if (type === 'I') return { type: 'V', result: val * R, resistance: R,
    formula: 'V_Th = I_N · R', substitution: `V_Th = ${fmt(val)} A × ${fmt(R)} Ω = ${fmt(val * R)} V`,
    steps: ['La fuente de corriente debe tener la resistencia EN PARALELO.', 'Conserva la resistencia y colócala EN SERIE con la nueva fuente de tensión.', 'Con corriente de a hacia b, la polaridad de la fuente equivalente será (+) en b y (−) en a.', 'El equivalente es válido para el circuito externo conectado a los mismos terminales.'] };
  return { error: 'Tipo de fuente no reconocido.' };
}

/** Solve for any missing real variable among E,C,V,L,I, or equality C=L I²/V². */
export function energyCalculation({ mode, find, Cval, Lval, Vval, Ival, Eval }) {
  const vals = { C: Number(Cval), L: Number(Lval), V: Number(Vval), I: Number(Ival), E: Number(Eval) };
  const nonnegative = (x) => Number.isFinite(x) && x >= 0;
  const positive = (x) => Number.isFinite(x) && x > 0;
  const good = (keys) => keys.every((k) => k === 'V' || k === 'I' ? Number.isFinite(vals[k]) : nonnegative(vals[k]));
  let answer, formula, substitution, unit;
  const { C: cap, L: ind, V: voltage, I: current, E } = vals;
  if (mode === 'C') {
    const needed = find === 'E' ? ['C', 'V'] : find === 'C' ? ['E', 'V'] : ['E', 'C'];
    if (!good(needed)) return { error: 'Completa los datos del condensador (valores finitos y energía/capacitancia no negativas).' };
    if (find === 'E') { answer = 0.5 * cap * voltage ** 2; formula = 'E_C = ½ C V²'; substitution = `E_C = ½ × ${fmt(cap)} F × (${fmt(voltage)} V)²`; unit = 'J'; }
    if (find === 'C') { if (!positive(voltage ** 2)) return { error: 'La tensión debe ser distinta de cero para despejar C.' }; answer = 2 * E / voltage ** 2; formula = 'C = 2E_C / V²'; substitution = `C = 2 × ${fmt(E)} J / (${fmt(voltage)} V)²`; unit = 'F'; }
    if (find === 'V') { if (!positive(cap)) return { error: 'La capacitancia debe ser mayor que cero para despejar |V|.' }; answer = Math.sqrt(2 * E / cap); formula = '|V| = √(2E_C / C)'; substitution = `|V| = √(2 × ${fmt(E)} J / ${fmt(cap)} F)`; unit = 'V'; }
  } else if (mode === 'L') {
    const needed = find === 'E' ? ['L', 'I'] : find === 'L' ? ['E', 'I'] : ['E', 'L'];
    if (!good(needed)) return { error: 'Completa los datos del inductor (valores finitos y energía/inductancia no negativas).' };
    if (find === 'E') { answer = 0.5 * ind * current ** 2; formula = 'E_L = ½ L I²'; substitution = `E_L = ½ × ${fmt(ind)} H × (${fmt(current)} A)²`; unit = 'J'; }
    if (find === 'L') { if (!positive(current ** 2)) return { error: 'La corriente debe ser distinta de cero para despejar L.' }; answer = 2 * E / current ** 2; formula = 'L = 2E_L / I²'; substitution = `L = 2 × ${fmt(E)} J / (${fmt(current)} A)²`; unit = 'H'; }
    if (find === 'I') { if (!positive(ind)) return { error: 'La inductancia debe ser mayor que cero para despejar |I|.' }; answer = Math.sqrt(2 * E / ind); formula = '|I| = √(2E_L / L)'; substitution = `|I| = √(2 × ${fmt(E)} J / ${fmt(ind)} H)`; unit = 'A'; }
  } else if (mode === 'igual') {
    if (find === 'C') {
      if (!good(['L','I','V']) || !positive(voltage ** 2)) return { error: 'Introduce L, I y V, con V distinto de cero.' };
      answer = ind * current ** 2 / voltage ** 2; formula = 'C = L I² / V²'; substitution = `C = ${fmt(ind)} H × (${fmt(current)} A)² / (${fmt(voltage)} V)²`; unit = 'F';
    } else if (find === 'L') {
      if (!good(['C','V','I']) || !positive(current ** 2)) return { error: 'Introduce C, V e I, con I distinta de cero.' };
      answer = cap * voltage ** 2 / current ** 2; formula = 'L = C V² / I²'; substitution = `L = ${fmt(cap)} F × (${fmt(voltage)} V)² / (${fmt(current)} A)²`; unit = 'H';
    } else if (find === 'V') {
      if (!good(['C','L','I']) || !positive(cap)) return { error: 'Introduce C, L e I, con C mayor que cero.' };
      answer = Math.sqrt(ind / cap) * Math.abs(current); formula = '|V| = |I|√(L/C)'; substitution = `|V| = |${fmt(current)}| A × √(${fmt(ind)} H / ${fmt(cap)} F)`; unit = 'V';
    } else if (find === 'I') {
      if (!good(['C','L','V']) || !positive(ind)) return { error: 'Introduce C, L y V, con L mayor que cero.' };
      answer = Math.sqrt(cap / ind) * Math.abs(voltage); formula = '|I| = |V|√(C/L)'; substitution = `|I| = |${fmt(voltage)}| V × √(${fmt(cap)} F / ${fmt(ind)} H)`; unit = 'A';
    }
  }
  return Number.isFinite(answer) && answer >= 0 ? { answer, unit, formula, substitution } : { error: 'No se pudo obtener un resultado físico válido.' };
}
