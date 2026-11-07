// Motor independiente para operaciones entre números complejos en notación mixta.
const NUMBER = String.raw`(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?`;
const SIGNED = String.raw`[+-]?${NUMBER}`;
const fail = (message) => { throw new Error(message); };

export function parseComplexInput(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return fail('Ingresa un número complejo.');
  const s = raw.toLowerCase().replace(/\s+/g, '').replace(/,/g, '.').replace(/i/g, 'j').replace(/−/g, '-').replace(/º/g, '°');
  if (/[∠<]/.test(s)) {
    const m = s.match(new RegExp(`^(${SIGNED})[∠<](${SIGNED})°?$`));
    if (!m) return fail('Formato polar inválido. Usa, por ejemplo, 5∠30° o 5∠-45.');
    const magnitude = Number(m[1]);
    const degrees = Number(m[2]);
    if (!Number.isFinite(magnitude) || !Number.isFinite(degrees) || magnitude < 0) return fail('El módulo debe ser un número no negativo y el ángulo debe ser finito.');
    const radians = degrees * Math.PI / 180;
    return { r: magnitude * Math.cos(radians), i: magnitude * Math.sin(radians), inputFormat: 'polar' };
  }
  let m = s.match(new RegExp(`^(${SIGNED})([+-])(${NUMBER})j$`));
  if (m) return { r: Number(m[1]), i: (m[2] === '-' ? -1 : 1) * Number(m[3]), inputFormat: 'rectangular' };
  m = s.match(new RegExp(`^(${SIGNED})([+-])j$`));
  if (m) return { r: Number(m[1]), i: m[2] === '-' ? -1 : 1, inputFormat: 'rectangular' };
  m = s.match(new RegExp(`^(${SIGNED})j$`));
  if (m) return { r: 0, i: Number(m[1]), inputFormat: 'rectangular' };
  if (s === 'j' || s === '+j' || s === '-j') return { r: 0, i: s === '-j' ? -1 : 1, inputFormat: 'rectangular' };
  m = s.match(new RegExp(`^(${SIGNED})$`));
  if (m) return { r: Number(m[1]), i: 0, inputFormat: 'rectangular' };
  return fail('Formato inválido. Usa 3+4j, -2j, 5∠30° o 8.');
}

export function calculateComplex(a, b, operation) {
  const { r: ar, i: ai } = a;
  const { r: br, i: bi } = b;
  if (![ar, ai, br, bi].every(Number.isFinite)) return fail('Introduce valores finitos.');
  let r, i;
  switch (operation) {
    case '+': r = ar + br; i = ai + bi; break;
    case '-': r = ar - br; i = ai - bi; break;
    case '×': r = ar * br - ai * bi; i = ar * bi + ai * br; break;
    case '÷': {
      const scale = Math.max(Math.abs(br), Math.abs(bi));
      if (scale === 0) return fail('No se puede dividir entre cero.');
      // Escalado para reducir el riesgo de desbordamiento numérico.
      const cr = br / scale, ci = bi / scale;
      const den = cr * cr + ci * ci;
      r = ((ar * cr + ai * ci) / den) / scale;
      i = ((ai * cr - ar * ci) / den) / scale;
      break;
    }
    default: return fail('Operación no válida.');
  }
  if (!Number.isFinite(r) || !Number.isFinite(i)) return fail('El resultado está fuera del rango numérico.');
  return { r, i };
}

export function toPolar(z) {
  const magnitude = Math.hypot(z.r, z.i);
  const degrees = magnitude < 1e-14 ? 0 : Math.atan2(z.i, z.r) * 180 / Math.PI;
  return { magnitude, degrees };
}

const neat = (value, digits = 4) => {
  const threshold = 0.5 * 10 ** -digits;
  const v = Math.abs(value) < threshold ? 0 : value;
  return Number(v.toFixed(digits)).toLocaleString('es-CL', { maximumFractionDigits: digits, useGrouping: false });
};
export const formatRectangular = (z, digits = 4) => `${neat(z.r, digits)} ${z.i < 0 ? '−' : '+'} ${neat(Math.abs(z.i), digits)}j`;
export const formatPolar = (z, digits = 4) => {
  const { magnitude, degrees } = toPolar(z);
  return `${neat(magnitude, digits)} ∠ ${neat(degrees, digits)}°`;
};

export function solveComplex(left, right, operation) {
  const a = parseComplexInput(left);
  const b = parseComplexInput(right);
  const result = calculateComplex(a, b, operation);
  return { a, b, result, operation };
}
