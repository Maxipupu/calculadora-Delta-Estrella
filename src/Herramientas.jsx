import React, { useState } from 'react';
import { Page, Card, Field, Seg, Res, Note } from './ui.jsx';
import { parseComplex as P, num, ok, rect, f2 } from './calc.js';
import { UNIDADES, aBase, desdeBase, unidadAutomatica } from './unidades.js';
import { potencias, potenciasDesdeVI, fasesRST, divisorV, divisorI } from './calc2.js';

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

// Entrada numérica estricta: evita interpretar «2abc» como «2».
const numeroEstricto = (texto) => {
  const t = String(texto).trim().replace(',', '.');
  return /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(t) ? Number(t) : NaN;
};

// Resultado legible sin perder valores pequeños por redondeos fijos.
const cifraPrecisa = (v) => {
  if (!Number.isFinite(v)) return '—';
  if (v === 0) return '0';
  if (Math.abs(v) < 1e-5 || Math.abs(v) >= 1e9) return v.toExponential(5);
  return Number(v.toPrecision(8)).toString();
};
const potenciaLegible = (k, unidadK, unidadBase) => {
  if (k !== 0 && Math.abs(k) < 0.01) {
    return `${cifraPrecisa(k * 1000)} ${unidadBase} (${cifraPrecisa(k)} ${unidadK})`;
  }
  return `${cifraPrecisa(k)} ${unidadK}`;
};

const EntradaConUnidad = ({ label, value, onChange, unidad, onUnidad, unidades, placeholder, bad }) => (
  <div className="mb-3 last:mb-0">
    <label className="block text-sm font-semibold text-slate-300 mb-1" htmlFor={`dato-${label.replace(/[^a-z0-9]/gi, '')}`}>
      {label}
    </label>
    <div className="flex gap-2">
      <input
        id={`dato-${label.replace(/[^a-z0-9]/gi, '')}`}
        value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder} inputMode="text" autoCapitalize="off" autoCorrect="off" spellCheck={false}
        className={`min-w-0 flex-1 bg-slate-800 border-2 ${bad ? 'border-red-500' : 'border-slate-700 focus:border-amber-400'} rounded-xl px-3 py-2.5 text-base font-mono text-amber-300 focus:outline-none`}
      />
      <select
        aria-label={`Unidad de ${label}`} value={unidad} onChange={(e) => onUnidad(e.target.value)}
        className="w-[5.6rem] shrink-0 rounded-xl border border-slate-700 bg-slate-800 px-2 text-sm font-semibold text-slate-100 focus:border-amber-400 focus:outline-none"
      >
        {Object.keys(unidades).map((u) => <option key={u} value={u}>{u}</option>)}
      </select>
    </div>
  </div>
);

// Ejemplo para CA monofásica sinusoidal (tensiones y corrientes RMS).
const EJEMPLO_POTENCIAS = { V: 230, I: 10, grados: 30 };
const Paso = ({ titulo, formula, sustitucion, resultado }) => (
  <div className="border-b border-slate-800 py-3 last:border-0">
    <p className="text-sm font-semibold text-slate-100">{titulo}</p>
    <p className="mt-1 text-sm font-mono text-slate-400 break-words">{formula}</p>
    <p className="mt-1 text-sm font-mono text-slate-300 break-words">{sustitucion}</p>
    <p className="mt-1 text-base font-mono font-semibold text-emerald-300">{resultado}</p>
  </div>
);

const EjemplosPotencias = () => {
  const { V, I, grados } = EJEMPLO_POTENCIAS;
  const a = grados * Math.PI / 180;
  const aparente = V * I;
  return (
    <Card title="Ejemplos de P, Q, S y FP">
      <Note>Ejemplo monofásico con valores eficaces (RMS): V = {V} V, I = {I} A y φ = {grados}° (carga inductiva).</Note>
      <Paso titulo="Potencia activa P" formula="P = V × I × cos(φ)"
        sustitucion={`P = ${V} × ${I} × cos(${grados}°)`}
        resultado={`P = ${f2(aparente * Math.cos(a), 2)} W = ${f2(aparente * Math.cos(a) / 1000, 3)} kW`} />
      <Paso titulo="Potencia reactiva Q" formula="Q = V × I × sen(φ)"
        sustitucion={`Q = ${V} × ${I} × sen(${grados}°)`}
        resultado={`Q = ${f2(aparente * Math.sin(a), 2)} var = ${f2(aparente * Math.sin(a) / 1000, 3)} kvar`} />
      <Paso titulo="Potencia aparente S" formula="S = V × I"
        sustitucion={`S = ${V} × ${I}`}
        resultado={`S = ${f2(aparente, 2)} VA = ${f2(aparente / 1000, 3)} kVA`} />
      <Paso titulo="Factor de potencia FP" formula="FP = cos(φ) = P / S"
        sustitucion={`FP = cos(${grados}°) = ${f2(aparente * Math.cos(a), 2)} / ${f2(aparente, 2)}`}
        resultado={`FP = ${f2(Math.cos(a), 4)} (sin unidad)`} />
      <Note>Para cargas capacitivas el ángulo φ es negativo y Q también. Estas fórmulas son para CA monofásica sinusoidal; en trifásica equilibrada se usa S = √3 · Vlínea · Ilínea.</Note>
    </Card>
  );
};

export function Potencias({ onBack }) {
  const VAC = { P: '', Q: '', S: '', FP: '', t: 'ind' };
  const VAC_VI = { V: '', I: '', phi: '', VUnidad: 'V', IUnidad: 'A' };
  const [modo, setModo] = useState('pq');
  const [s, setS] = useState(VAC);
  const [vi, setVi] = useState(VAC_VI);
  const set = (k) => (v) => setS((p) => ({ ...p, [k]: v }));
  const setVI = (k) => (v) => setVi((p) => ({ ...p, [k]: v }));
  const g = {};
  ['P', 'Q', 'S', 'FP'].forEach((k) => { if (!vac(s[k])) g[k] = numeroEstricto(s[k]); });
  const n = Object.keys(g).length;
  const bad = Object.values(g).some((x) => !Number.isFinite(x));
  const v = numeroEstricto(vi.V), i = numeroEstricto(vi.I), phi = numeroEstricto(vi.phi);
  const viCompleto = !vac(vi.V) && !vac(vi.I) && !vac(vi.phi);
  const viValido = viCompleto && v > 0 && i > 0 && phi >= -90 && phi <= 90;
  const V = v * UNIDADES.tension[vi.VUnidad];
  const I = i * UNIDADES.corriente[vi.IUnidad];
  const rVI = viValido ? potenciasDesdeVI(V, I, phi) : null;
  const r = modo === 'pq' ? (n === 2 && !bad ? potencias(g, s.t) : null) : rVI;
  const tipo = r && !r.error ? (r.Q > 1e-9 ? 'inductivo' : r.Q < -1e-9 ? 'capacitivo' : 'resistivo') : '';
  const ang = r && !r.error ? Math.acos(Math.max(-1, Math.min(1, r.FP))) * 180 / Math.PI * (r.Q < 0 ? -1 : 1) : 0;
  const s2 = cifraPrecisa;

  return (
    <Page title="Potencias P, Q, S y FP" onBack={onBack}>
      <Card title="Forma de calcular">
        <Seg value={modo} onChange={setModo} options={[["pq", "P, Q, S o FP"], ["vi", "V, I y φ"]]} />
        <Note>En ambos modos obtendrás P en kW, Q en kvar, S en kVA y FP sin unidad.</Note>
      </Card>
      {modo === 'pq' ? (
        <Card title="Datos (llena solo dos)">
          <Field label="P (kW)" value={s.P} onChange={set('P')} bad={!vac(s.P) && !Number.isFinite(numeroEstricto(s.P))} />
          <Field label="Q (kvar)" value={s.Q} onChange={set('Q')} placeholder="negativo = capacitivo" bad={!vac(s.Q) && !Number.isFinite(numeroEstricto(s.Q))} />
          <Field label="S (kVA)" value={s.S} onChange={set('S')} bad={!vac(s.S) && !Number.isFinite(numeroEstricto(s.S))} />
          <Field label="FP" value={s.FP} onChange={set('FP')} placeholder="0 a 1" bad={!vac(s.FP) && !Number.isFinite(numeroEstricto(s.FP))} />
          <Note>Si Q se calcula (no la ingresas), elige el tipo de carga:</Note>
          <div className="mt-2"><Seg value={s.t} onChange={set('t')} options={[["ind", "Inductivo"], ["cap", "Capacitivo"]]} /></div>
        </Card>
      ) : (
        <Card title="Datos de CA monofásica (RMS)">
          <EntradaConUnidad label="Tensión" value={vi.V} onChange={setVI('V')}
            unidad={vi.VUnidad} onUnidad={setVI('VUnidad')} unidades={UNIDADES.tension} placeholder="ej: 230"
            bad={!vac(vi.V) && !(v > 0)} />
          <EntradaConUnidad label="Corriente" value={vi.I} onChange={setVI('I')}
            unidad={vi.IUnidad} onUnidad={setVI('IUnidad')} unidades={UNIDADES.corriente} placeholder="ej: 10"
            bad={!vac(vi.I) && !(i > 0)} />
          <Field label="φ (°)" value={vi.phi} onChange={setVI('phi')} placeholder="ej: 30 o -30"
            bad={!vac(vi.phi) && !(phi >= -90 && phi <= 90)} />
          <Note>φ positivo: inductivo. φ negativo: capacitivo. Introduce un ángulo entre −90° y 90°.</Note>
        </Card>
      )}
      <Card title="Resultados">
        {modo === 'pq' && n < 2 && <Note>Ingresa dos datos y calculo los otros dos.</Note>}
        {modo === 'pq' && n > 2 && <Note warn>Hay más de dos campos llenos. Deja solo dos.</Note>}
        {modo === 'pq' && n === 2 && bad && <Note warn>Revisa los campos en rojo.</Note>}
        {modo === 'vi' && !viCompleto && <Note>Ingresa tensión, corriente y ángulo φ para calcular las potencias.</Note>}
        {modo === 'vi' && viCompleto && !viValido && <Note warn>La tensión y corriente deben ser positivas, y φ debe estar entre −90° y 90°.</Note>}
        {r && r.error && <Note warn>{r.error}</Note>}
        {r && !r.error && (
          <>
            <Res label="Potencia activa" value={`P = ${potenciaLegible(r.P, 'kW', 'W')}`} />
            <Res label="Potencia reactiva" value={`Q = ${potenciaLegible(r.Q, 'kvar', 'var')}`} sub={tipo} />
            <Res label="Potencia aparente" value={`S = ${potenciaLegible(r.S, 'kVA', 'VA')}`} sub={`S⃗ = ${s2(r.P)} ${r.Q < 0 ? '-' : '+'} j${s2(Math.abs(r.Q))} kVA (potencia compleja)`} color="text-amber-300" />
            <Res label="Factor de potencia" value={`FP = ${f2(r.FP, 4)}`} sub={`ángulo φ = ${f2(ang, 2)}°`} color="text-amber-300" />
            <Triangulo P={r.P} Q={r.Q} />
          </>
        )}
      </Card>
      {r && !r.error && (
        <Card title="Cómo se obtiene el resultado">
          {modo === 'vi' ? (
            <>
              <Note>Primero se convierten tensión y corriente a V y A: V = {s2(V)} V, I = {s2(I)} A.</Note>
              <Paso titulo="P · potencia activa" formula="P = V × I × cos(φ)"
                sustitucion={`P = ${s2(V)} × ${s2(I)} × cos(${phi}°) / 1000`}
                resultado={`P = ${potenciaLegible(r.P, 'kW', 'W')}`} />
              <Paso titulo="Q · potencia reactiva" formula="Q = V × I × sen(φ)"
                sustitucion={`Q = ${s2(V)} × ${s2(I)} × sen(${phi}°) / 1000`}
                resultado={`Q = ${potenciaLegible(r.Q, 'kvar', 'var')}`} />
              <Paso titulo="S · potencia aparente" formula="S = V × I"
                sustitucion={`S = ${s2(V)} × ${s2(I)} / 1000`}
                resultado={`S = ${potenciaLegible(r.S, 'kVA', 'VA')}`} />
              <Paso titulo="FP · factor de potencia" formula="FP = cos(φ)"
                sustitucion={`FP = cos(${phi}°)`}
                resultado={`FP = ${f2(r.FP, 4)} (sin unidad)`} />
            </>
          ) : (
            <>
              <Note>Como ingresaste dos potencias/FP y no V e I, el procedimiento usa el triángulo de potencias.</Note>
              <Paso titulo="P · potencia activa" formula="P = S × FP (para P positiva)"
                sustitucion={`P = ${s2(r.S)} × ${f2(r.FP, 4)}`}
                resultado={`|P| = ${potenciaLegible(Math.abs(r.P), 'kW', 'W')}${r.P < 0 ? ' (P original negativa)' : ''}`} />
              <Paso titulo="Q · potencia reactiva" formula="|Q| = √(S² − P²)"
                sustitucion={`|Q| = √(${s2(r.S)}² − ${s2(r.P)}²)`}
                resultado={`Q = ${potenciaLegible(r.Q, 'kvar', 'var')} (${tipo})`} />
              <Paso titulo="S · potencia aparente" formula="S = √(P² + Q²)"
                sustitucion={`S = √(${s2(r.P)}² + ${s2(r.Q)}²)`}
                resultado={`S = ${potenciaLegible(r.S, 'kVA', 'VA')}`} />
              <Paso titulo="FP · factor de potencia" formula="FP = |P| / S = |cos(φ)|"
                sustitucion={r.S === 0 ? 'S = 0: FP = 1 por convención de la calculadora.' : `FP = ${s2(Math.abs(r.P))} / ${s2(r.S)}`}
                resultado={`FP = ${f2(r.FP, 4)} (sin unidad)`} />
            </>
          )}
        </Card>
      )}
      <EjemplosPotencias />
      <Limpiar onClick={() => { setS(VAC); setVi(VAC_VI); }} />
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
// No redondear a cero conversiones pequeñas, por ejemplo 0.5 µA = 5e-7 A.
const cifra = cifraPrecisa;
const rectangularUnidad = (z, u) => {
  const relativo = Math.hypot(z.r, z.i) * 1e-13;
  if (Math.abs(z.i) <= relativo) return `${cifra(z.r)} ${u}`;
  if (Math.abs(z.r) <= relativo) return `${cifra(z.i)}j ${u}`;
  return `${cifra(z.r)} ${z.i < 0 ? '-' : '+'} ${cifra(Math.abs(z.i))}j ${u}`;
};
const polarUnidad = (z, u) => {
  const angulo = Math.atan2(z.i, z.r) * 180 / Math.PI;
  return `${cifra(Math.hypot(z.r, z.i))} ∠ ${cifra(angulo)}° ${u}`;
};
const ResultadosConUnidad = ({ label, z, tipo, unidad, color }) => {
  const base = tipo === 'tension' ? 'V' : tipo === 'corriente' ? 'A' : 'Ω';
  const elegido = unidad || unidadAutomatica(z, tipo);
  const convertido = desdeBase(z, tipo, elegido);
  return <Res label={label} value={polarUnidad(convertido, elegido)}
    sub={`${rectangularUnidad(convertido, elegido)}${elegido === base ? '' : ` · ${rectangularUnidad(z, base)}`}`}
    color={color} />;
};

export function Divisores({ onBack, tipo }) {
  const esV = tipo === 'v';
  const VAC = { x: '', z1: '', z2: '', z3: '', xUnidad: esV ? 'V' : 'A', z1Unidad: 'Ω', z2Unidad: 'Ω', z3Unidad: 'Ω' };
  const [s, setS] = useState(VAC);
  const set = (k) => (v) => setS((p) => ({ ...p, [k]: v }));
  const fuenteTipo = esV ? 'tension' : 'corriente';
  const fuenteBase = esV ? 'V' : 'A';
  const XOriginal = P(s.x);
  const ZOriginales = [P(s.z1), P(s.z2), ...(vac(s.z3) ? [] : [P(s.z3)])];
  const X = aBase(XOriginal, fuenteTipo, s.xUnidad);
  const keysZ = vac(s.z3) ? ['z1', 'z2'] : ['z1', 'z2', 'z3'];
  const Zs = ZOriginales.map((z, k) => aBase(z, 'impedancia', s[`${keysZ[k]}Unidad`]));
  const empty = vac(s.x) || vac(s.z1) || vac(s.z2);
  const valid = !empty && ok(X) && Zs.every(ok);
  let r = valid ? (esV ? divisorV(X, Zs) : divisorI(X, Zs)) : null;
  const vals = r && (esV ? r.V : r.I);
  if (r && !(vals.every(ok) && ok(esV ? r.I : r.V))) r = null;
  const bad = (t) => !vac(t) && !ok(P(t));
  return (
    <Page title={esV ? 'Divisor de tensión' : 'Divisor de corriente'} onBack={onBack}>
      <Card title="Datos y unidades">
        <EntradaConUnidad label={esV ? 'V fuente' : 'I total'} value={s.x} onChange={set('x')}
          unidad={s.xUnidad} onUnidad={set('xUnidad')} unidades={UNIDADES[fuenteTipo]}
          placeholder={esV ? 'ej: 12' : 'ej: 6'} bad={bad(s.x)} />
        {['z1', 'z2', 'z3'].map((k, i) => (
          <EntradaConUnidad key={k} label={`Z${i + 1}${i === 2 ? ' (opcional)' : ''}`} value={s[k]} onChange={set(k)}
            unidad={s[`${k}Unidad`]} onUnidad={set(`${k}Unidad`)} unidades={UNIDADES.impedancia}
            placeholder={i === 0 ? 'ej: 2' : i === 1 ? 'ej: 500' : 'opcional'} bad={bad(s[k])} />
        ))}
        <Note>{esV ? 'Elementos en serie.' : 'Elementos en paralelo.'} Puedes mezclar unidades por campo; cada valor se convierte automáticamente a {fuenteBase} y Ω antes de calcular.</Note>
        <Note>Acepta valores reales (2, 500) o complejos (30+12j, 25∠30). En una impedancia compleja la unidad multiplica tanto la parte real como la imaginaria.</Note>
      </Card>
      {valid && (
        <Card title="Conversión automática utilizada">
          <Res label={`${esV ? 'V fuente' : 'I total'} · ${s.xUnidad} a ${fuenteBase}`}
            value={`${rectangularUnidad(XOriginal, s.xUnidad)} = ${rectangularUnidad(X, fuenteBase)}`} />
          {keysZ.map((k, i) => (
            <Res key={k} label={`Z${i + 1} · ${s[`${k}Unidad`]} a Ω`}
              value={`${rectangularUnidad(ZOriginales[i], s[`${k}Unidad`])} = ${rectangularUnidad(Zs[i], 'Ω')}`} />
          ))}
        </Card>
      )}
      <Card title="Resultados">
        {empty && <Note>Ingresa el dato de entrada y al menos Z1 y Z2, seleccionando la unidad de cada campo.</Note>}
        {!empty && !valid && <Note warn>Revisa los campos en rojo.</Note>}
        {valid && !r && <Note warn>No se puede calcular: impedancia equivalente nula o división por cero.</Note>}
        {r && vals.map((z, k) => (
          <ResultadosConUnidad key={k} label={esV ? `Tensión en Z${k + 1}` : `Corriente por Z${k + 1}`}
            z={z} tipo={fuenteTipo} unidad={s.xUnidad} color="text-amber-300" />
        ))}
        {r && (esV
          ? <ResultadosConUnidad label="Corriente del circuito" z={r.I} tipo="corriente" />
          : <><ResultadosConUnidad label="Tensión común" z={r.V} tipo="tension" />
              <ResultadosConUnidad label="Impedancia equivalente" z={r.Zeq} tipo="impedancia" /></>)}
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
