// Solucionador de circuitos por nodos (CC y CA fasorial) y utilidades SI
import { C, add, sub, mul, div, abs, arg } from './calc.js';

const PRE = { G: 1e9, M: 1e6, k: 1e3, m: 1e-3, u: 1e-6, 'µ': 1e-6, n: 1e-9, p: 1e-12 };
// "2k" -> 2000, "33u" -> 3.3e-5, "6m" -> 0.006 (m = mili, M = mega)
export const si = (t) => {
  const m = String(t).trim().replace(',', '.').match(/^(-?\d*\.?\d+(?:[eE][+-]?\d+)?)\s*([GMkmuµnp]?)$/);
  return m ? parseFloat(m[1]) * (m[2] ? PRE[m[2]] : 1) : NaN;
};
const T = [[1e9, 'G'], [1e6, 'M'], [1e3, 'k'], [1, ''], [1e-3, 'm'], [1e-6, 'µ'], [1e-9, 'n'], [1e-12, 'p']];
export const eng = (x, u) => {
  if (!Number.isFinite(x)) return '—';
  if (Math.abs(x) < 1e-15) return `0 ${u}`;
  const [s, p] = T.find(([s]) => Math.abs(x) >= s * 0.9995) || T[7];
  return `${+(x / s).toPrecision(4)} ${p}${u}`;
};
export const engC = (z, u, ac) => (ac ? `${eng(abs(z), u)} ∠ ${(+arg(z).toFixed(2))}°` : eng(z.r, u));

const gauss = (A, z) => {
  const n = z.length, M = A.map((r, i) => [...r, z[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (abs(M[r][c]) > abs(M[p][c])) p = r;
    if (abs(M[p][c]) < 1e-14) return null;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < n; r++) if (r !== c) {
      const f = div(M[r][c], M[c][c]);
      for (let k = c; k <= n; k++) M[r][k] = sub(M[r][k], mul(f, M[c][k]));
    }
  }
  return M.map((r, i) => div(r[n], r[i]));
};

/* els: [{t:'R'|'V'|'I'|'L'|'C', a, b, v:{r,i}}]  (nodo 0 = tierra)
   w = 0 → corriente continua (L = corto, C = abierto). activo = índice de la única fuente encendida (superposición) */
export const resolver = (els, w, activo = null) => {
  const nodos = Math.max(0, ...els.flatMap((e) => [e.a, e.b]));
  const ex = [];
  els.forEach((e, k) => { if (e.t === 'V' || (e.t === 'L' && w === 0)) ex.push(k); });
  const n = nodos + ex.length;
  const A = Array.from({ length: n }, () => Array.from({ length: n }, () => C()));
  const z = Array.from({ length: n }, () => C());
  const put = (r, c, v) => { if (r >= 0 && c >= 0) A[r][c] = add(A[r][c], v); };
  const on = (k) => activo === null || activo === k;
  els.forEach((e, k) => {
    const ra = e.a - 1, rb = e.b - 1;
    if (e.t === 'R' || (w > 0 && (e.t === 'L' || e.t === 'C'))) {
      const y = e.t === 'R' ? C(1 / e.v.r) : e.t === 'L' ? div(C(1), C(0, w * e.v.r)) : C(0, w * e.v.r);
      const m = C(-y.r, -y.i);
      put(ra, ra, y); put(rb, rb, y); put(ra, rb, m); put(rb, ra, m);
    } else if (e.t === 'I') {
      const val = on(k) ? e.v : C();
      if (ra >= 0) z[ra] = sub(z[ra], val);
      if (rb >= 0) z[rb] = add(z[rb], val);
    } else if (e.t === 'V' || e.t === 'L') {
      const col = nodos + ex.indexOf(k);
      put(ra, col, C(1)); put(rb, col, C(-1)); put(col, ra, C(1)); put(col, rb, C(-1));
      z[col] = e.t === 'V' && on(k) ? e.v : C();
    }
  });
  const x = n ? gauss(A, z) : [];
  if (!x) return null;
  const Vn = [C(), ...x.slice(0, nodos)];
  const res = els.map((e, k) => {
    const V = sub(Vn[e.a], Vn[e.b]);
    let I;
    if (e.t === 'R') I = div(V, C(e.v.r));
    else if (e.t === 'C') I = w > 0 ? mul(V, C(0, w * e.v.r)) : C();
    else if (e.t === 'L' && w > 0) I = div(V, C(0, w * e.v.r));
    else if (e.t === 'I') I = on(k) ? e.v : C();
    else I = x[nodos + ex.indexOf(k)];
    return { V, I };
  });
  return { Vn, res };
};
