// Cálculos de las herramientas extra (sin interfaz)
import { C, add, mul, div, pol } from './calc.js';

// g: datos conocidos (exactamente 2 de P, Q, S, FP). tipo: 'ind' | 'cap' (signo de Q cuando se calcula)
export const potencias = (g, tipo) => {
  const has = (x) => g[x] !== undefined;
  let { P, Q, S, FP } = g;
  const sg = tipo === 'cap' ? -1 : 1;
  if (has('FP') && !(FP > 0 && FP <= 1)) return { error: 'El FP debe estar entre 0 y 1.' };
  if (has('P') && has('Q')) { S = Math.hypot(P, Q); FP = S ? Math.abs(P) / S : 1; }
  else if (has('P') && has('S')) {
    if (S < Math.abs(P)) return { error: 'S no puede ser menor que P.' };
    Q = sg * Math.sqrt(S * S - P * P); FP = S ? Math.abs(P) / S : 1;
  } else if (has('P') && has('FP')) { S = Math.abs(P) / FP; Q = sg * Math.abs(P) * Math.tan(Math.acos(FP)); }
  else if (has('Q') && has('S')) {
    if (S < Math.abs(Q)) return { error: 'S no puede ser menor que |Q|.' };
    P = Math.sqrt(S * S - Q * Q); FP = S ? P / S : 1;
  } else if (has('Q') && has('FP')) {
    if (FP === 1) return { error: 'Con FP = 1 la Q sería cero: usa otro dato.' };
    S = Math.abs(Q) / Math.sqrt(1 - FP * FP); P = S * FP;
  } else { P = S * FP; Q = sg * S * Math.sqrt(1 - FP * FP); }
  return { P, Q, S, FP };
};

// Potencias CA monofásicas con valores RMS y φ en grados.
// V e I ya deben estar convertidos a V y A; P/Q/S se entregan en kW/kvar/kVA.
export const potenciasDesdeVI = (V, I, phi) => {
  if (!(Number.isFinite(V) && V > 0 && Number.isFinite(I) && I > 0 && Number.isFinite(phi) && Math.abs(phi) <= 90)) {
    return { error: 'Ingresa V e I positivos y un ángulo entre −90° y 90°.' };
  }
  if (!Number.isFinite(V * I)) return { error: 'Los valores son demasiado grandes para calcular la potencia.' };
  const angulo = phi * Math.PI / 180;
  const S = V * I / 1000;
  return { P: S * Math.cos(angulo), Q: S * Math.sin(angulo), S, FP: Math.cos(angulo) };
};

// Fasores de las 3 fases a partir de una conocida. seq '+' = R-S-T, '-' = R-T-S
const OFF = { '+': { R: 0, S: -120, T: 120 }, '-': { R: 0, S: 120, T: -120 } };
export const fasesRST = (mag, ang, conocida, seq) =>
  ['R', 'S', 'T'].map((k) => {
    const a = ang + OFF[seq][k] - OFF[seq][conocida];
    return { k, z: pol(mag, a), ang: ((((a + 180) % 360) + 360) % 360) - 180 };
  });

// Divisor de tensión: elementos en serie
export const divisorV = (Vin, Zs) => { const I = div(Vin, add(...Zs)); return { I, V: Zs.map((z) => mul(I, z)) }; };
// Divisor de corriente: elementos en paralelo
export const divisorI = (Iin, Zs) => {
  const Zeq = div(C(1), add(...Zs.map((z) => div(C(1), z))));
  const V = mul(Iin, Zeq);
  return { Zeq, V, I: Zs.map((z) => div(V, z)) };
};
