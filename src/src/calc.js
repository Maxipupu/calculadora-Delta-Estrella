// Matemática compleja y solucionadores (sin interfaz)
export const C = (r = 0, i = 0) => ({ r, i });
export const add = (...v) => v.reduce((a, b) => C(a.r + b.r, a.i + b.i));
export const sub = (a, b) => C(a.r - b.r, a.i - b.i);
export const mul = (a, b) => C(a.r * b.r - a.i * b.i, a.r * b.i + a.i * b.r);
export const div = (a, b) => { const d = b.r * b.r + b.i * b.i; return C((a.r * b.r + a.i * b.i) / d, (a.i * b.r - a.r * b.i) / d); };
export const conj = (a) => C(a.r, -a.i);
export const abs = (a) => Math.hypot(a.r, a.i);
export const arg = (a) => (Math.atan2(a.i, a.r) * 180) / Math.PI;
export const pol = (m, d) => C(m * Math.cos((d * Math.PI) / 180), m * Math.sin((d * Math.PI) / 180));
export const num = (s) => parseFloat(String(s).replace(',', '.'));
export const ok = (z) => Number.isFinite(z.r) && Number.isFinite(z.i);

// Acepta 30+12j, -15j, 12, 25<30, 25∠30
export const parseComplex = (str) => {
  const bad = C(NaN, NaN);
  if (!str) return bad;
  const s = String(str).trim().toLowerCase().replace(/\s+/g, '').replace(/,/g, '.').replace(/i/g, 'j').replace('°', '');
  const p = s.split(/[<∠]/);
  if (p.length === 2) {
    const m = parseFloat(p[0]), d = parseFloat(p[1]);
    return isNaN(m) || isNaN(d) ? bad : pol(m, d);
  }
  const n = '(?:\\d+\\.?\\d*|\\.\\d+)';
  const u = (t) => (t === '' || t === '+' ? 1 : t === '-' ? -1 : parseFloat(t));
  let m = s.match(new RegExp(`^([+-]?${n})([+-]${n}?)j$`));
  if (m) return C(parseFloat(m[1]), u(m[2]));
  m = s.match(new RegExp(`^([+-]?${n}?)j$`));
  if (m) return C(0, u(m[1]));
  m = s.match(new RegExp(`^([+-]?${n})$`));
  if (m) return C(parseFloat(m[1]), 0);
  return bad;
};

// Formato
export const f2 = (v, d = 2) => { const t = Math.pow(10, -d) / 2; return (Math.abs(v) < t ? 0 : v).toFixed(d); };
export const rect = (z, u = '', d = 2) => Math.abs(z.i) < Math.pow(10, -d) / 2 ? `${f2(z.r, d)}${u}` : `${f2(z.r, d)} ${z.i < 0 ? '-' : '+'} ${f2(Math.abs(z.i), d)}j${u}`;
export const polar = (z, u = '', d = 2) => `${f2(abs(z), d)} ∠ ${f2(arg(z), d)}°${u}`;
export const tiempo = (z, f, d = 1) => `${f2(abs(z) * Math.SQRT2, d)} cos(${f2(2 * Math.PI * f, 1)}t ${arg(z) < 0 ? '−' : '+'} ${f2(Math.abs(arg(z)), d)}°) V`;

// Potencia compleja de una carga: P (kW), FP, tipo 'ind' | 'cap'
export const cargaS = (Pkw, fp, tipo) => { const P = Pkw * 1000; return C(P, P * Math.tan(Math.acos(fp)) * (tipo === 'cap' ? -1 : 1)); };
export const sInfo = (S) => ({ P: S.r, Q: S.i, S: abs(S), fp: abs(S) ? S.r / abs(S) : 0, tipo: S.i > 1e-9 ? 'inductivo' : S.i < -1e-9 ? 'capacitivo' : 'resistivo' });

/* ---------- Línea monofásica con 2 cargas ----------
   Fuente — Z1 — [carga 1] — Z2 — [carga 2] (Vc en la carga 2) */
export const lineaDesdeVc = (Vc, Z1, Z2, S1, S2) => {
  const I2 = conj(div(S2, Vc));
  const V1 = add(Vc, mul(Z2, I2));
  const I1 = conj(div(S1, V1));
  const Is = add(I1, I2);
  const Vs = add(V1, mul(Z1, Is));
  const Ss = mul(Vs, conj(Is));
  return { Vc, V1, I1, I2, Is, Vs, Ss, perd: add(mul(C(abs(I2) ** 2), C(Z2.r, Z2.i)), mul(C(abs(Is) ** 2), C(Z1.r, Z1.i))) };
};

export const lineaDesdeVs = (Vs, Z1, Z2, S1, S2) => {
  let x = [Vs.r * 0.95, Vs.i * 0.95];
  const g = (v) => { const r = lineaDesdeVc(C(v[0], v[1]), Z1, Z2, S1, S2); return [r.Vs.r - Vs.r, r.Vs.i - Vs.i]; };
  for (let k = 0; k < 200; k++) {
    const g0 = g(x);
    if (!g0.every(Number.isFinite)) return null;
    if (Math.hypot(...g0) < 1e-9) return lineaDesdeVc(C(x[0], x[1]), Z1, Z2, S1, S2);
    const h = 1e-5 * Math.max(1, Math.hypot(...x));
    const ga = g([x[0] + h, x[1]]), gb = g([x[0], x[1] + h]);
    const a = (ga[0] - g0[0]) / h, b = (gb[0] - g0[0]) / h, c = (ga[1] - g0[1]) / h, d = (gb[1] - g0[1]) / h;
    const det = a * d - b * c;
    if (!det) return null;
    x = [x[0] - (d * g0[0] - b * g0[1]) / det, x[1] - (-c * g0[0] + a * g0[1]) / det];
  }
  return null;
};

/* ---------- Trifásico: fuente delta balanceada, línea Zl, carga delta desbalanceada ---------- */
export const trifasico = ({ Vlin, angTR, seq, Zl, Zrs, Zst, Ztr, fpObj, f }) => {
  const sg = seq === '+' ? 1 : -1;
  const VRS = pol(Vlin, angTR - 120 * sg);
  const Er = div(VRS, pol(Math.sqrt(3), 30 * sg));
  const E = [Er, mul(Er, pol(1, -120 * sg)), mul(Er, pol(1, 120 * sg))];
  const sum = add(Zrs, Zst, Ztr);
  const Zy = [div(mul(Zrs, Ztr), sum), div(mul(Zrs, Zst), sum), div(mul(Zst, Ztr), sum)]; // Zr, Zs, Zt
  const Zt = Zy.map((z) => add(z, Zl));
  const Y = Zt.map((z) => div(C(1), z));
  const Vn = div(add(...E.map((e, k) => mul(e, Y[k]))), add(...Y));
  const I = E.map((e, k) => div(sub(e, Vn), Zt[k])); // corrientes de línea R,S,T
  const Vt = E.map((e, k) => sub(e, mul(Zl, I[k]))); // tensiones de fase en bornes de carga
  const Vd = [sub(Vt[0], Vt[1]), sub(Vt[1], Vt[2]), sub(Vt[2], Vt[0])]; // RS, ST, TR en la carga
  const Zd = [Zrs, Zst, Ztr];
  const Id = Vd.map((v, k) => div(v, Zd[k]));
  const Sd = Vd.map((v, k) => mul(v, conj(Id[k])));
  const Sc = add(...Sd);
  const Ss = add(...E.map((e, k) => mul(e, conj(I[k]))));
  const caida = I.map((i) => mul(Zl, i));
  const perd = I.reduce((a, i) => a + abs(i) ** 2 * Zl.r, 0);
  const tg = Math.tan(Math.acos(fpObj));
  const comp = Sd.map((s, k) => { const Qc = s.i - s.r * tg; return { Qc, Cap: Qc / (2 * Math.PI * f * abs(Vd[k]) ** 2) }; });
  return { VRS, E, Zy, Vn, I, Vd, Id, Sd, Sc, Ss, caida, perd, comp };
};
