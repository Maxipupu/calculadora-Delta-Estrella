import React, { useState } from 'react';
import { Page, Card, Field, Seg, Res, Note } from './ui.jsx';
import { parseComplex as P, num, ok, rect, polar, f2 } from './calc.js';
import { potencias, fasesRST, divisorV, divisorI } from './calc2.js';

const vac = (t) => String(t).trim() === '';
const fin = (t) => vac(t) || Number.isFinite(num(t));
const Limpiar = ({ onClick }) => (
  <button onClick={onClick} className="mt-4 w-full py-3 rounded-xl bg-slate-800 active:bg-slate-700 text-sm">Limpiar datos</button>
);

/* ---------- Potencias ---------- */
const Triangulo = ({ P: p, Q: q }) => {
  if (!p && !q) return null;
  const sc = Math.min(200 / (Math.abs(p) || 1e-9), 110 / (Math.abs(q) || 1e-9));
  const x1 = 40 + p * sc, y1 = 130 - q * sc;
  return (
    <svg viewBox="0 0 300 260" className="w-full h-auto mt-2" role="img" aria-label="Triángulo de potencias">
      <polygon points={`40,130 ${x1},130 ${x1},${y1}`} fill="#f59e0b22" stroke="#f59e0b" strokeWidth="4" strokeLinejoin="round" />
      <g fontSize="18" fontWeight="700">
        <text x={(40 + x1) / 2} y={q >= 0 ? 152 : 112} fill="#34d399" textAnchor="middle">P</text>
        <text x={x1 + 8} y={(130 + y1) / 2 + 6} fill="#f87171">Q</text>
        <text x={(40 + x1) / 2 - 14} y={(130 + y1) / 2 + (q >= 0 ? -6 : 18)} fill="#fbbf24" textAnchor="end">S</text>
      </g>
    </svg>
  );
};

export function Potencias({ onBack }) {
  const VAC = { P: '', Q: '', S: '', FP: '', t: 'ind' };
  const [s, setS] = useState(VAC);
  const set = (k) => (v) => setS((p) => ({ ...p, [k]: v }));
  const g = {};
  ['P', 'Q', 'S', 'FP'].forEach((k) => { if (!vac(s[k])) g[k] = num(s[k]); });
  const n = Object.keys(g).length, bad = Object.values(g).some((x) => !Number.isFinite(x));
  const r = n === 2 && !bad ? potencias(g, s.t) : null;
  const tipo = r && !r.error ? (r.Q > 1e-9 ? 'inductivo' : r.Q < -1e-9 ? 'capacitivo' : 'resistivo') : '';
  return (
    <Page title="Potencias P, Q, S y FP" onBack={onBack}>
      <Card title="Datos (llena solo dos)">
        <Field label="P (kW)" value={s.P} onChange={set('P')} bad={!fin(s.P)} />
        <Field label="Q (kvar)" value={s.Q} onChange={set('Q')} placeholder="negativo = capacitivo" bad={!fin(s.Q)} />
        <Field label="S (kVA)" value={s.S} onChange={set('S')} bad={!fin(s.S)} />
        <Field label="FP" value={s.FP} onChange={set('FP')} placeholder="0 a 1" bad={!fin(s.FP)} />
        <Note>Si Q se calcula (no la ingresas), elige el tipo de carga:</Note>
        <div className="mt-2"><Seg value={s.t} onChange={set('t')} options={[['ind', 'Inductivo'], ['cap', 'Capacitivo']]} /></div>
      </Card>
      <Card title="Resultados">
        {n < 2 && <Note>Ingresa dos datos y calculo los otros dos.</Note>}
        {n > 2 && <Note warn>Hay más de dos campos llenos. Deja solo dos.</Note>}
        {n === 2 && bad && <Note warn>Revisa los campos en rojo.</Note>}
        {r && r.error && <Note warn>{r.error}</Note>}
        {r && !r.error && (
          <>
            <Res label="Potencia activa" value={`P = ${f2(r.P, 3)} kW`} />
            <Res label="Potencia reactiva" value={`Q = ${f2(r.Q, 3)} kvar`} sub={tipo} />
            <Res label="Potencia aparente" value={`S = ${f2(r.S, 3)} kVA`} sub={`S = ${f2(r.P, 2)} ${r.Q < 0 ? '-' : '+'} j${f2(Math.abs(r.Q), 2)} kVA`} color="text-amber-300" />
            <Res label="Factor de potencia" value={`FP = ${f2(r.FP, 4)}`} sub={`ángulo φ = ${f2((Math.acos(r.FP) * 180) / Math.PI * (r.Q < 0 ? -1 : 1), 2)}°`} color="text-amber-300" />
            <Triangulo P={r.P} Q={r.Q} />
          </>
        )}
      </Card>
      <Limpiar onClick={() => setS(VAC)} />
    </Page>
  );
}

/* ---------- Fases desfasadas 120° ---------- */
const COL = { R: '#f87171', S: '#fbbf24', T: '#60a5fa' };
const Diagrama = ({ fases, mag, conocida }) => {
  const cx = 150, cy = 150, R = 95, sc = R / mag;
  return (
    <svg viewBox="0 0 300 300" className="w-full h-auto" role="img" aria-label="Diagrama fasorial de las tres fases">
      <defs>
        {Object.entries(COL).map(([k, c]) => (
          <marker key={k} id={`ah${k}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill={c} /></marker>
        ))}
      </defs>
      <circle cx={cx} cy={cy} r={R} fill="none" stroke="#334155" strokeDasharray="4 4" />
      <line x1={cx - R - 12} y1={cy} x2={cx + R + 12} y2={cy} stroke="#334155" />
      <line x1={cx} y1={cy - R - 12} x2={cx} y2={cy + R + 12} stroke="#334155" />
      {fases.map(({ k, z, ang }) => {
        const ux = z.r / mag, uy = z.i / mag;
        return (
          <g key={k}>
            <line x1={cx} y1={cy} x2={cx + z.r * sc} y2={cy - z.i * sc} stroke={COL[k]} strokeWidth={k === conocida ? 5 : 3.5} markerEnd={`url(#ah${k})`} />
            <text x={cx + (R + 20) * ux} y={cy - (R + 20) * uy + 5} fill={COL[k]} fontSize="14" fontWeight="700" textAnchor="middle">{k} {f2(ang, 0)}°</text>
          </g>
        );
      })}
    </svg>
  );
};

export function Fases({ onBack }) {
  const VAC = { mag: '', ang: '', k: 'R', seq: '+' };
  const [s, setS] = useState(VAC);
  const set = (k) => (v) => setS((p) => ({ ...p, [k]: v }));
  const mag = num(s.mag), ang = vac(s.ang) ? 0 : num(s.ang);
  const valid = !vac(s.mag) && mag > 0 && Number.isFinite(ang);
  const fases = valid ? fasesRST(mag, ang, s.k, s.seq) : null;
  return (
    <Page title="Fases a 120°" onBack={onBack}>
      <Card title="¿Qué fase conoces?">
        <Seg value={s.k} onChange={set('k')} options={[['R', 'Fase R'], ['S', 'Fase S'], ['T', 'Fase T']]} />
        <Field label="Módulo" value={s.mag} onChange={set('mag')} placeholder="ej: 220" bad={!vac(s.mag) && !(mag > 0)} />
        <Field label="Ángulo (°)" value={s.ang} onChange={set('ang')} placeholder="vacío = 0°" bad={!vac(s.ang) && !Number.isFinite(ang)} />
        <Seg value={s.seq} onChange={set('seq')} options={[['+', 'Secuencia R-S-T'], ['-', 'Secuencia R-T-S']]} />
        <Note>En R-S-T (positiva) cada fase se atrasa 120° respecto de la anterior; en R-T-S (negativa) se adelanta.</Note>
      </Card>
      <Card title="Resultado">
        {!fases && <Note>Ingresa el módulo para ver las tres fases.</Note>}
        {fases && (
          <>
            <Diagrama fases={fases} mag={mag} conocida={s.k} />
            {fases.map(({ k, z, ang: a }) => (
              <Res key={k} label={`Fase ${k}${k === s.k ? ' (dato)' : ''}`} value={`${f2(mag)} ∠ ${f2(a, 2)}°`} sub={rect(z)} color={k === 'R' ? 'text-red-300' : k === 'S' ? 'text-amber-300' : 'text-blue-300'} />
            ))}
          </>
        )}
      </Card>
      <Limpiar onClick={() => setS(VAC)} />
    </Page>
  );
}

/* ---------- Divisores de tensión y de corriente ---------- */
export function Divisores({ onBack, tipo }) {
  const esV = tipo === 'v';
  const VAC = { x: '', z1: '', z2: '', z3: '' };
  const [s, setS] = useState(VAC);
  const set = (k) => (v) => setS((p) => ({ ...p, [k]: v }));
  const X = P(s.x);
  const Zs = [s.z1, s.z2, ...(vac(s.z3) ? [] : [s.z3])].map(P);
  const empty = vac(s.x) || vac(s.z1) || vac(s.z2);
  const valid = !empty && ok(X) && Zs.every(ok);
  let r = valid ? (esV ? divisorV(X, Zs) : divisorI(X, Zs)) : null;
  const vals = r && (esV ? r.V : r.I);
  if (r && !(vals.every(ok) && ok(esV ? r.I : r.V))) r = null;
  const bad = (t) => !vac(t) && !ok(P(t));
  return (
    <Page title={esV ? 'Divisor de tensión' : 'Divisor de corriente'} onBack={onBack}>
      <Card title="Datos">
        <Field label={esV ? 'V fuente' : 'I total'} value={s.x} onChange={set('x')} placeholder={esV ? 'ej: 12' : 'ej: 6'} bad={bad(s.x)} />
        <Field label="Z1" value={s.z1} onChange={set('z1')} placeholder="ej: 1000" bad={bad(s.z1)} />
        <Field label="Z2" value={s.z2} onChange={set('z2')} placeholder="ej: 2000" bad={bad(s.z2)} />
        <Field label="Z3" value={s.z3} onChange={set('z3')} placeholder="opcional" bad={bad(s.z3)} />
        <Note>{esV ? 'Elementos en serie.' : 'Elementos en paralelo.'} Acepta resistencias (1000) o impedancias (30+12j). Escribe todo en las mismas unidades (Ω, V, A).</Note>
      </Card>
      <Card title="Resultados">
        {empty && <Note>Ingresa el dato de entrada y al menos Z1 y Z2.</Note>}
        {!empty && !valid && <Note warn>Revisa los campos en rojo.</Note>}
        {valid && !r && <Note warn>No se puede calcular (división por cero).</Note>}
        {r && vals.map((z, k) => (
          <Res key={k} label={esV ? `Tensión en Z${k + 1}` : `Corriente por Z${k + 1}`} value={polar(z, esV ? ' V' : ' A', 4)} sub={rect(z, esV ? ' V' : ' A', 4)} color="text-amber-300" />
        ))}
        {r && (esV
          ? <Res label="Corriente del circuito" value={polar(r.I, ' A', 4)} sub={rect(r.I, ' A', 4)} />
          : <><Res label="Tensión común" value={polar(r.V, ' V', 4)} sub={rect(r.V, ' V', 4)} /><Res label="Impedancia equivalente" value={rect(r.Zeq, ' Ω', 4)} /></>)}
      </Card>
      <Limpiar onClick={() => setS(VAC)} />
    </Page>
  );
}

/* ---------- Energía en condensador e inductor ---------- */
const fe = (e) => `${e.toPrecision(4)} J`;
export function Energia({ onBack }) {
  const VAC = { C: '', V: '', L: '', I: '' };
  const [s, setS] = useState(VAC);
  const set = (k) => (v) => setS((p) => ({ ...p, [k]: v }));
  const [c, v, l, i] = [s.C, s.V, s.L, s.I].map(num);
  const ec = !vac(s.C) && !vac(s.V) && Number.isFinite(c) && Number.isFinite(v) ? 0.5 * c * 1e-6 * v * v : null;
  const el = !vac(s.L) && !vac(s.I) && Number.isFinite(l) && Number.isFinite(i) ? 0.5 * l * 1e-3 * i * i : null;
  const ceq = el !== null && !vac(s.V) && Number.isFinite(v) && v !== 0 ? ((2 * el) / (v * v)) * 1e6 : null;
  return (
    <Page title="Energía de C y L" onBack={onBack}>
      <Card title="Condensador (C)">
        <Field label="C (µF)" value={s.C} onChange={set('C')} bad={!fin(s.C)} />
        <Field label="V (V)" value={s.V} onChange={set('V')} placeholder="tensión en el condensador" bad={!fin(s.V)} />
      </Card>
      <Card title="Inductor (L)">
        <Field label="L (mH)" value={s.L} onChange={set('L')} bad={!fin(s.L)} />
        <Field label="I (A)" value={s.I} onChange={set('I')} placeholder="corriente por el inductor" bad={!fin(s.I)} />
      </Card>
      <Card title="Resultados">
        {ec === null && el === null && <Note>Ingresa C y V, o L e I, para calcular la energía.</Note>}
        {ec !== null && <Res label="Energía del condensador  E = ½·C·V²" value={fe(ec)} sub={`${(ec * 1e3).toPrecision(4)} mJ`} />}
        {el !== null && <Res label="Energía del inductor  E = ½·L·I²" value={fe(el)} sub={`${(el * 1e3).toPrecision(4)} mJ`} />}
        {ceq !== null && <Res label="C para igualar ambas energías (con la V ingresada)" value={`${f2(ceq, 3)} µF`} sub="C = L·I² / V²" color="text-amber-300" />}
        <Note>En continua (régimen permanente) usa la tensión sobre el condensador y la corriente por el inductor. En alterna, usa valores instantáneos.</Note>
      </Card>
      <Limpiar onClick={() => setS(VAC)} />
    </Page>
  );
}
