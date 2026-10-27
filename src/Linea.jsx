import React, { useState } from 'react';
import { Page, Card, Field, Seg, Res, Note } from './ui.jsx';
import { C, parseComplex as P, num, cargaS, sInfo, lineaDesdeVc, lineaDesdeVs, ok, rect, polar, tiempo, f2 } from './calc.js';

const VAC = { modo: 'vc', V: '', f: '50', Z1: '', Z2: '', P1: '', F1: '', T1: 'ind', P2: '', F2: '', T2: 'ind' };
const vac = (t) => String(t).trim() === '';
const kw = (v) => f2(v / 1000);

export default function Linea({ onBack }) {
  const [s, setS] = useState(VAC);
  const set = (k) => (v) => setS((p) => ({ ...p, [k]: v }));

  const Vk = P(s.V);
  const Z1 = vac(s.Z1) ? C() : P(s.Z1), Z2 = vac(s.Z2) ? C() : P(s.Z2);
  const p1 = vac(s.P1) ? 0 : num(s.P1), p2 = vac(s.P2) ? 0 : num(s.P2), f = num(s.f);
  const fpOk = (p, t) => p === 0 || (num(t) > 0 && num(t) <= 1);
  const empty = vac(s.V);
  const valid = ok(Vk) && ok(Z1) && ok(Z2) && Number.isFinite(p1) && Number.isFinite(p2) && fpOk(p1, s.F1) && fpOk(p2, s.F2) && f > 0;

  let r = null;
  if (valid) {
    const S1 = p1 === 0 ? C() : cargaS(p1, num(s.F1), s.T1);
    const S2 = p2 === 0 ? C() : cargaS(p2, num(s.F2), s.T2);
    r = s.modo === 'vc' ? lineaDesdeVc(Vk, Z1, Z2, S1, S2) : lineaDesdeVs(Vk, Z1, Z2, S1, S2);
  }
  const si = r && sInfo(r.Ss);

  const carga = (titulo, P_, F_, T_) => (
    <Card title={titulo}>
      <Field label="P (kW)" value={s[P_]} onChange={set(P_)} placeholder="vacío = sin carga" bad={!Number.isFinite(vac(s[P_]) ? 0 : num(s[P_]))} />
      <Field label="FP" value={s[F_]} onChange={set(F_)} placeholder="0.80" bad={!fpOk(vac(s[P_]) ? 0 : num(s[P_]), s[F_])} />
      <Seg value={s[T_]} onChange={set(T_)} options={[['ind', 'Inductivo'], ['cap', 'Capacitivo']]} />
    </Card>
  );

  return (
    <Page title="Línea con 2 cargas" onBack={onBack}>
      <Card title="Datos generales">
        <Seg value={s.modo} onChange={set('modo')} options={[['vc', 'Conozco Vc (carga final)'], ['vs', 'Conozco Vs (fuente)']]} />
        <Field label={s.modo === 'vc' ? 'Vc' : 'Vs'} value={s.V} onChange={set('V')} placeholder="ej: 220∠0" bad={!empty && !ok(Vk)} />
        <Field label="f (Hz)" value={s.f} onChange={set('f')} bad={!(f > 0)} />
        <Field label="Z línea 1" value={s.Z1} onChange={set('Z1')} placeholder="ej: 0.1+0.12j" bad={!ok(Z1)} />
        <Field label="Z línea 2" value={s.Z2} onChange={set('Z2')} placeholder="ej: 0.05+0.08j" bad={!ok(Z2)} />
        <Note>Orden: Fuente — Z línea 1 — Carga 1 — Z línea 2 — Carga 2 (donde está Vc). Tensiones rms; los fasores se escriben 110∠0 o 110&lt;0. Una línea o carga vacía cuenta como cero.</Note>
      </Card>
      {carga('Carga 1 (junto a la fuente)', 'P1', 'F1', 'T1')}
      {carga('Carga 2 (al final, tensión Vc)', 'P2', 'F2', 'T2')}

      <Card title="Resultados">
        {empty && <Note>Ingresa la tensión conocida para ver los resultados.</Note>}
        {!empty && !valid && <Note warn>Revisa los campos en rojo.</Note>}
        {valid && !r && <Note warn>Sin solución real: con estas cargas (potencia constante) la fuente no alcanza. Reduce las potencias, sube Vs o usa «Conozco Vc».</Note>}
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
      <button onClick={() => setS(VAC)} className="mt-4 w-full py-3 rounded-xl bg-slate-800 active:bg-slate-700 text-sm">Limpiar datos</button>
    </Page>
  );
}
