import React, { useState } from 'react';
import { Page, Card, Field, Seg, Res, Note } from './ui.jsx';
import { parseComplex as P, num, cargaS, sInfo, lineaDesdeVc, lineaDesdeVs, ok, rect, polar, tiempo, f2, abs } from './calc.js';

const PRE = {
  'Guía 1 · Ej. 2': { modo: 'vc', V: '110∠0', Z1: '0.08+0.15j', Z2: '0.11+0.10j', P1: '15', F1: '0.95', T1: 'cap', P2: '40', F2: '0.80', T2: 'ind' },
  'Guía 1 · Ej. 4': { modo: 'vs', V: '220∠0', Z1: '0.1+0.12j', Z2: '0.05+0.08j', P1: '10', F1: '0.97', T1: 'cap', P2: '50', F2: '0.78', T2: 'ind' },
};
const kw = (v) => `${f2(v / 1000)}`;

export default function Linea({ onBack }) {
  const [s, setS] = useState({ ...PRE['Guía 1 · Ej. 2'], f: '50' });
  const set = (k) => (v) => setS((p) => ({ ...p, [k]: v }));

  const Vk = P(s.V), Z1 = P(s.Z1), Z2 = P(s.Z2);
  const [p1, f1, p2, f2_, f] = [s.P1, s.F1, s.P2, s.F2, s.f].map(num);
  const fpOk = (x) => x > 0 && x <= 1;
  const valid = ok(Vk) && ok(Z1) && ok(Z2) && [p1, p2, f].every(Number.isFinite) && fpOk(f1) && fpOk(f2_) && f > 0;

  let r = null;
  if (valid) {
    const S1 = cargaS(p1, f1, s.T1), S2 = cargaS(p2, f2_, s.T2);
    r = s.modo === 'vc' ? lineaDesdeVc(Vk, Z1, Z2, S1, S2) : lineaDesdeVs(Vk, Z1, Z2, S1, S2);
  }
  const si = r && sInfo(r.Ss);
  const carga = (n, P_, F_, T_) => (
    <Card title={n}>
      <Field label="P (kW)" value={s[P_]} onChange={set(P_)} bad={!Number.isFinite(num(s[P_]))} />
      <Field label="FP" value={s[F_]} onChange={set(F_)} bad={!fpOk(num(s[F_]))} />
      <Seg value={s[T_]} onChange={set(T_)} options={[['ind', 'Inductivo'], ['cap', 'Capacitivo']]} />
    </Card>
  );

  return (
    <Page title="Línea con 2 cargas" onBack={onBack}>
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
        {Object.entries(PRE).map(([l, v]) => (
          <button key={l} onClick={() => setS((p) => ({ ...p, ...v }))} className="shrink-0 text-sm px-4 py-2 rounded-full bg-slate-800 active:bg-slate-700">{l}</button>
        ))}
      </div>

      <Card title="Datos generales">
        <Seg value={s.modo} onChange={set('modo')} options={[['vc', 'Conozco Vc (carga final)'], ['vs', 'Conozco Vs (fuente)']]} />
        <Field label={s.modo === 'vc' ? 'Vc' : 'Vs'} value={s.V} onChange={set('V')} placeholder="220∠0" bad={!ok(Vk)} />
        <Field label="f (Hz)" value={s.f} onChange={set('f')} bad={!(f > 0)} />
        <Field label="Z línea 1" value={s.Z1} onChange={set('Z1')} bad={!ok(Z1)} />
        <Field label="Z línea 2" value={s.Z2} onChange={set('Z2')} bad={!ok(Z2)} />
        <Note>Orden del circuito: Fuente — Z línea 1 — Carga 1 — Z línea 2 — Carga 2 (aquí está Vc). Tensiones en valor eficaz (rms); escribe fasores como 110∠0 o 110&lt;0.</Note>
      </Card>
      {carga('Carga 1 (junto a la fuente)', 'P1', 'F1', 'T1')}
      {carga('Carga 2 (al final, tensión Vc)', 'P2', 'F2', 'T2')}

      <Card title="Resultados">
        {!valid && <Note warn>Revisa los campos en rojo.</Note>}
        {valid && !r && <Note warn>Sin solución real: con estas cargas (potencia constante) la fuente no alcanza para alimentarlas. Reduce las potencias, sube Vs o usa «Conozco Vc».</Note>}
        {r && (
          <>
            <Res label="Vs (fuente)" value={polar(r.Vs, ' V')} sub={`${rect(r.Vs, ' V')}  ·  v(t) = ${tiempo(r.Vs, f)}`} color="text-amber-300" />
            <Res label="Vc (carga 2)" value={polar(r.Vc, ' V')} sub={`${rect(r.Vc, ' V')}  ·  v(t) = ${tiempo(r.Vc, f)}`} color="text-amber-300" />
            <Res label="Corriente de la fuente" value={polar(r.Is, ' A')} sub={`Carga 2: ${polar(r.I2, ' A')}`} />
            <Res label="Potencia en la fuente" value={`P = ${kw(si.P)} kW   Q = ${kw(si.Q)} kvar`} sub={`S = ${kw(si.S)} kVA   FP = ${f2(si.fp, 3)} ${si.tipo}`} />
            <Res label="Pérdidas en las líneas" value={`${f2(r.perd.r, 1)} W  (${f2(r.perd.i, 1)} var)`} sub={`Tensión en carga 1: ${polar(r.V1, ' V')}`} color="text-red-300" />
          </>
        )}
      </Card>
      <Note>Cargas de potencia constante. Q positivo = inductivo, negativo = capacitivo.</Note>
    </Page>
  );
}
