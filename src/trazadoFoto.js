/* Reconocimiento local de trazos rectos en fotos de circuitos.
 * No reconoce símbolos ni infiere la topología; esas decisiones se confirman en el editor.
 * Esta utilidad no envía píxeles a ningún servicio externo.
 */
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

function fusionar(runs, orientation, minLength) {
  const clusters = [];
  for (const run of runs) {
    let match = null;
    for (let j = clusters.length - 1; j >= 0; j--) {
      const c = clusters[j];
      if (run.line - c.lastLine > 2) break;
      if (run.line <= c.lastLine || Math.abs(run.start - c.start / c.count) > 6 || Math.abs(run.end - c.end / c.count) > 6) continue;
      match = c;
      break;
    }
    if (match) {
      match.lastLine = run.line;
      match.start += run.start;
      match.end += run.end;
      match.lineSum += run.line;
      match.count += 1;
    } else {
      clusters.push({ lastLine: run.line, start: run.start, end: run.end, lineSum: run.line, count: 1 });
    }
  }
  return clusters.filter(c => c.count <= 18).map(c => {
    const pos = c.lineSum / c.count;
    const start = c.start / c.count;
    const end = c.end / c.count;
    return orientation === 'h'
      ? { x1: start, y1: pos, x2: end, y2: pos }
      : { x1: pos, y1: start, x2: pos, y2: end };
  }).filter(l => Math.hypot(l.x2 - l.x1, l.y2 - l.y1) >= minLength);
}

/**
 * @param {{width:number,height:number,data:Uint8ClampedArray}} pixels ImageData del canvas
 * @param {{threshold?:number,minLength?:number}} options (distancias en px reducidos)
 */
export function detectarTrazos(pixels, { threshold = 145, minLength = 25 } = {}) {
  const { width, height, data } = pixels || {};
  if (!Number.isInteger(width) || !Number.isInteger(height) || !data || data.length < width * height * 4 || width < 2 || height < 2) return [];
  const limit = clamp(Number(threshold) || 145, 30, 240);
  const min = clamp(Math.round(minLength), 8, Math.max(width, height));
  const dark = new Uint8Array(width * height);
  for (let i = 0; i < dark.length; i++) {
    const p = i * 4;
    // Transparencia se interpreta como blanco.
    const brightness = (data[p] * 0.2126 + data[p + 1] * 0.7152 + data[p + 2] * 0.0722);
    dark[i] = data[p + 3] > 80 && brightness < limit ? 1 : 0;
  }
  const hRuns = [];
  for (let y = 0; y < height; y++) {
    let begin = -1;
    for (let x = 0; x <= width; x++) {
      const filled = x < width && dark[y * width + x];
      if (filled && begin < 0) begin = x;
      if (!filled && begin >= 0) {
        if (x - begin >= min) hRuns.push({ line: y, start: begin, end: x - 1 });
        begin = -1;
      }
    }
  }
  const vRuns = [];
  for (let x = 0; x < width; x++) {
    let begin = -1;
    for (let y = 0; y <= height; y++) {
      const filled = y < height && dark[y * width + x];
      if (filled && begin < 0) begin = y;
      if (!filled && begin >= 0) {
        if (y - begin >= min) vRuns.push({ line: x, start: begin, end: y - 1 });
        begin = -1;
      }
    }
  }
  // Ignora líneas pegadas al borde de la foto (marcos y sombras de escaneo).
  const marginX = width * .013, marginY = height * .013;
  return [...fusionar(hRuns, 'h', min), ...fusionar(vRuns, 'v', min)]
    .filter(l => !((Math.abs(l.x2-l.x1) < 1 && (l.x1 < marginX || l.x1 > width-marginX)) ||
                   (Math.abs(l.y2-l.y1) < 1 && (l.y1 < marginY || l.y1 > height-marginY))))
    .sort((a, b) => Math.hypot(b.x2 - b.x1, b.y2 - b.y1) - Math.hypot(a.x2 - a.x1, a.y2 - a.y1))
    .slice(0, 140);
}

/** Detecta candidatos a unión en cruces de trazos horizontales y verticales. */
export function sugerirUniones(lineas, width, height, max = 14) {
  const h = lineas.filter(l => Math.abs(l.y2 - l.y1) < 1.1);
  const v = lineas.filter(l => Math.abs(l.x2 - l.x1) < 1.1);
  const out = [];
  const near = Math.max(4, Math.min(width, height) * .014);
  for (const a of h) for (const b of v) {
    const x = b.x1, y = a.y1;
    if (x < Math.min(a.x1, a.x2) - near || x > Math.max(a.x1, a.x2) + near ||
        y < Math.min(b.y1, b.y2) - near || y > Math.max(b.y1, b.y2) + near) continue;
    if (!out.some(p => Math.hypot(p.x - x, p.y - y) < near * 2)) out.push({ x, y });
    if (out.length >= max) return out;
  }
  return out;
}

/** Convierte las anotaciones visuales en ramas eléctricas para el solucionador de nodos. */
export function anotacionesACircuito(nodos, componentes, tierraId) {
  if (!Array.isArray(nodos) || nodos.length < 2 || !nodos.some(n => n.id === tierraId)) return { error: 'Marca al menos dos nodos y selecciona el nodo de tierra.' };
  if (!Array.isArray(componentes) || !componentes.length) return { error: 'Agrega al menos un componente desde la foto.' };
  const ord = [tierraId, ...nodos.map(n => n.id).filter(id => id !== tierraId).sort((a,b)=>a-b)];
  const ids = new Map(ord.map((id,idx) => [id,String(idx)]));
  for (const e of componentes) {
    if (!['R','V','I','L','C'].includes(e.t) || !String(e.v ?? '').trim() || !ids.has(e.a) || !ids.has(e.b) || e.a === e.b) {
      return { error: 'Revisa los componentes: todos necesitan tipo, valor y dos nodos diferentes.' };
    }
  }
  return { elementos: componentes.map(e => ({t:e.t,v:String(e.v).trim(),a:ids.get(e.a),b:ids.get(e.b)})) };
}
