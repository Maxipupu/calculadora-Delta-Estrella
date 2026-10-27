import React from 'react';

const U = { R: 'Ω', V: 'V', I: 'A', L: 'H', C: 'F' };
const COL = { R: '#fbbf24', V: '#f87171', I: '#a78bfa', L: '#34d399', C: '#38bdf8' };
const nd = (t) => (/^\d+$/.test(String(t).trim()) ? parseInt(t, 10) : null);

// Detecta errores típicos al numerar los nodos
export const revisar = (els, nom) => {
  const av = [];
  const E = els.map((e, k) => ({ k, a: nd(e.a), b: nd(e.b) })).filter((e) => e.a !== null && e.b !== null);
  E.forEach((e) => { if (e.a === e.b) av.push(`${nom[e.k]} tiene el mismo nodo en a y en b (${e.a}): queda en cortocircuito y no hace nada.`); });
  const usados = new Set(E.flatMap((e) => [e.a, e.b]));
  if (E.length && !usados.has(0)) av.push('Ningún elemento toca el nodo 0 (la tierra). Conecta al menos uno al nodo 0.');
  const max = Math.max(0, ...usados);
  for (let n = 1; n < max; n++) if (!usados.has(n)) av.push(`No usaste el nodo ${n}, pero sí nodos mayores. ¿Se saltó un número?`);
  usados.forEach((n) => {
    if (n === 0) return;
    const c = E.filter((e) => (e.a === n || e.b === n) && e.a !== e.b);
    if (c.length === 1) av.push(`El nodo ${n} solo tiene un elemento (${nom[c[0].k]}): por ahí no circula corriente. ¿Falta conectar algo?`);
  });
  const comp = new Set([0]);
  for (let ch = true; ch; ) {
    ch = false;
    E.forEach((e) => { if (comp.has(e.a) !== comp.has(e.b)) { comp.add(e.a); comp.add(e.b); ch = true; } });
  }
  const sueltos = [...usados].filter((n) => !comp.has(n));
  if (sueltos.length) av.push(`Los nodos ${sueltos.join(', ')} no están conectados a la tierra (nodo 0) por ningún camino.`);
  if (els.length && !els.some((e) => e.t === 'V' || e.t === 'I')) av.push('El circuito no tiene ninguna fuente.');
  if (els.some((e) => nd(e.a) === null || nd(e.b) === null)) av.push('Hay elementos con nodos sin completar: no se dibujan.');
  return av;
};

const Sim = ({ t, ang, x, y }) => (
  <g transform={`translate(${x} ${y}) rotate(${ang})`} stroke={COL[t]} strokeWidth="2.5" fill="#0f172a" strokeLinecap="round" strokeLinejoin="round">
    {t === 'R' && <rect x="-18" y="-7" width="36" height="14" rx="2" />}
    {t === 'V' && <circle r="13" />}
    {t === 'I' && (<><circle r="13" /><path d="M-7 0H7M3 -4L7 0L3 4" fill="none" /></>)}
    {t === 'L' && (<><rect x="-13.5" y="-9" width="27" height="18" stroke="none" /><path d="M-13.5 0q4.5 -11 9 0q4.5 -11 9 0q4.5 -11 9 0" fill="none" /></>)}
    {t === 'C' && (<><rect x="-3.5" y="-12" width="7" height="24" stroke="none" /><line x1="-4" y1="-11" x2="-4" y2="11" /><line x1="4" y1="-11" x2="4" y2="11" /></>)}
  </g>
);

const Etiq = ({ e, nom, x, y, anchor }) => (
  <text x={x} y={y} textAnchor={anchor} fontSize="13" fill="#e2e8f0">
    <tspan x={x} fontWeight="700" fill={COL[e.t]}>{nom[e.k]}</tspan>
    <tspan x={x} dy="15">{(e.v || '?') + U[e.t]}</tspan>
  </text>
);

// + y − de las fuentes de tensión (a = +)
const Pol = ({ x, y, ang }) => {
  const r = (ang * Math.PI) / 180, d = [Math.cos(r), Math.sin(r)];
  const side = Math.abs(d[0]) < 0.5 ? [-14, 0] : [0, 18];
  const pos = (s) => [x + d[0] * s + side[0], y + d[1] * s + side[1] + 5];
  const [px, py] = pos(-25), [mx, my] = pos(25);
  return (
    <g fontSize="16" fontWeight="700" fill="#e2e8f0" textAnchor="middle">
      <text x={px} y={py}>+</text><text x={mx} y={my}>−</text>
    </g>
  );
};

export default function Dibujo({ els, nom, selected = null, onSelect }) {
  const L = els.map((e, k) => ({ ...e, k, a: nd(e.a), b: nd(e.b) })).filter((e) => e.a !== null && e.b !== null && e.a !== e.b);
  if (!L.length) return null;
  const nodos = [...new Set(L.flatMap((e) => [e.a, e.b]).filter((n) => n !== 0))].sort((p, q) => p - q);
  const tierra = L.filter((e) => e.a === 0 || e.b === 0);
  const puentes = L.filter((e) => e.a !== 0 && e.b !== 0);
  const ramas = (n) => tierra.filter((e) => e.a === n || e.b === n);
  const X = {};
  let x = 50;
  nodos.forEach((n) => { X[n] = x; x += Math.max(1, ramas(n).length) * 90 + 30; });
  const W = Math.max(x + 10, 260), Ty = 60 + 52 * puentes.length, Gy = Ty + 150, H = Gy + 50;

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label="Circuito dibujado con los nodos y elementos ingresados">
        <g stroke="#94a3b8" strokeWidth="2.5" fill="none" strokeLinecap="round">
          <line x1="20" y1={Gy} x2={W - 20} y2={Gy} />
          <path d={`M30 ${Gy}v8M20 ${Gy + 8}h20M24 ${Gy + 14}h12M28 ${Gy + 20}h4`} />
        </g>
        <text x="50" y={Gy + 24} fontSize="12" fill="#94a3b8">0 (tierra)</text>

        {tierra.map((e) => {
          const n = e.a === 0 ? e.b : e.a, i = ramas(n).indexOf(e), bx = X[n] + i * 90, cy = (Ty + Gy) / 2;
          const ang = e.a === n ? 90 : -90;
          return (
            <g key={e.k} role={onSelect ? 'button' : undefined} tabIndex={onSelect ? 0 : undefined}
              aria-label={onSelect ? `Analizar ${nom[e.k]}` : undefined} className={onSelect ? 'circuit-selectable' : ''}
              onClick={() => onSelect?.(e.k)} onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); onSelect?.(e.k); } }}>
              <path d={`M${X[n]} ${Ty}H${bx}V${Gy}`} stroke="#94a3b8" strokeWidth="2.5" fill="none" />
              {onSelect && <circle cx={bx} cy={cy} r="25" fill={selected === e.k ? '#fbbf242c' : 'transparent'} stroke={selected === e.k ? '#fbbf24' : 'transparent'} strokeWidth="2" />}
              <Sim t={e.t} ang={ang} x={bx} y={cy} />
              {onSelect && <rect x={bx - 25} y={cy - 35} width="98" height="82" fill="transparent" />}
              {e.t === 'V' && <Pol x={bx} y={cy} ang={ang} />}
              <Etiq e={e} nom={nom} x={bx + 26} y={cy - 4} anchor="start" />
            </g>
          );
        })}

        {puentes.map((e, j) => {
          const ly = Ty - 52 * (j + 1), xa = X[e.a], xb = X[e.b], cx = (xa + xb) / 2, ang = xa < xb ? 0 : 180;
          return (
            <g key={e.k} role={onSelect ? 'button' : undefined} tabIndex={onSelect ? 0 : undefined}
              aria-label={onSelect ? `Analizar ${nom[e.k]}` : undefined} className={onSelect ? 'circuit-selectable' : ''}
              onClick={() => onSelect?.(e.k)} onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); onSelect?.(e.k); } }}>
              <path d={`M${xa} ${Ty}V${ly}H${xb}V${Ty}`} stroke="#94a3b8" strokeWidth="2.5" fill="none" />
              {onSelect && <circle cx={cx} cy={ly} r="25" fill={selected === e.k ? '#fbbf242c' : 'transparent'} stroke={selected === e.k ? '#fbbf24' : 'transparent'} strokeWidth="2" />}
              <Sim t={e.t} ang={ang} x={cx} y={ly} />
              {onSelect && <rect x={cx - 46} y={ly - 70} width="92" height="95" fill="transparent" />}
              {e.t === 'V' && <Pol x={cx} y={ly} ang={ang} />}
              <Etiq e={e} nom={nom} x={cx} y={ly - 30} anchor="middle" />
            </g>
          );
        })}

        {nodos.map((n) => (
          <g key={n}>
            <circle cx={X[n]} cy={Ty} r="6" fill="#f8fafc" />
            <text x={X[n] - 10} y={Ty + 20} textAnchor="end" fontSize="14" fontWeight="700" fill="#f8fafc">{n}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}
