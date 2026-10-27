// Factores respecto de unidades base SI: V, A y Ω.
// Las impedancias complejas se escalan tanto en parte real como imaginaria.
export const UNIDADES = Object.freeze({
  tension: Object.freeze({ mV: 1e-3, V: 1, kV: 1e3 }),
  corriente: Object.freeze({ 'µA': 1e-6, mA: 1e-3, A: 1, kA: 1e3 }),
  impedancia: Object.freeze({ 'mΩ': 1e-3, 'Ω': 1, 'kΩ': 1e3, 'MΩ': 1e6 }),
});

export const escalar = (z, factor) => ({ r: z.r * factor, i: z.i * factor });
export const aBase = (z, tipo, unidad) => {
  const factor = UNIDADES[tipo]?.[unidad];
  if (factor === undefined) throw new Error(`Unidad no válida: ${unidad}`);
  return escalar(z, factor);
};
export const desdeBase = (z, tipo, unidad) => {
  const factor = UNIDADES[tipo]?.[unidad];
  if (factor === undefined) throw new Error(`Unidad no válida: ${unidad}`);
  return escalar(z, 1 / factor);
};
export const unidadAutomatica = (z, tipo) => {
  const magnitud = Math.hypot(z.r, z.i);
  if (tipo === 'corriente') {
    if (magnitud > 0 && magnitud < 1e-3) return 'µA';
    if (magnitud < 1) return 'mA';
    if (magnitud >= 1e3) return 'kA';
    return 'A';
  }
  if (tipo === 'tension') {
    if (magnitud > 0 && magnitud < 1) return 'mV';
    if (magnitud >= 1e3) return 'kV';
    return 'V';
  }
  if (tipo === 'impedancia') {
    if (magnitud > 0 && magnitud < 1) return 'mΩ';
    if (magnitud >= 1e6) return 'MΩ';
    if (magnitud >= 1e3) return 'kΩ';
    return 'Ω';
  }
  throw new Error(`Tipo no válido: ${tipo}`);
};
