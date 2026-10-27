import React, { useState } from 'react';
import { Page, Card, Field, Seg, Res, Note } from './ui.jsx';
import { C, parseComplex as P, num, trifasico, ok, rect, polar, f2, abs, sInfo } from './calc.js';

const VAC = { V: '', ang: '', seq: '+', Zl: '', Zrs: '', Zst: '', Ztr: '', fp: '', f: '50' };
const vac = (t) => String(t).trim() === '';
const kw = (v) => f2(v / 1000);
const N = ['RS', 'ST', 'TR'], L = ['R', 'S', 'T'];

export default function Trifasica({ onBack }) {
  const [s, setS] = useState(VAC);
  const set = (k) => (v) => setS((p) => ({ ...p, [k]: v }));

  const V = num(s.V), ang = vac(s.ang) ? 0 : num(s.ang), f = num(s.f), fp = num(s.fp);
  const Zl = vac(s.Zl) ? C() : P(s.Zl);
  const [Zrs, Zst, Ztr] = [s.Zrs, s.Zst, s.Ztr].map(P);
  const empty = [s.V, s.Zrs, s.Zst, s.Ztr].some(vac);
  const conFp = !vac(s.fp) && fp > 0 && fp <= 1;
  const valid = !empty && V > 0 && Number.isFinite(ang) && f > 0 && [Zl, Zrs, Zst, Ztr].every(ok) && (vac(s.fp) || conFp);
  const r = valid ? trifasico({ Vlin: V, angTR: ang, seq: s.seq, Zl, Zrs, Zst, Ztr, fpObj: conFp ? fp : 1, f }) : null;
  const good = r && [r.Sc, r.Ss, ...r.I].every(ok) && abs(r.Sc) > 0;
  const sc = good && sInfo(r.Sc);
  const bad = (t, z) => !vac(t) && !ok(z);

  return (
    <Page title="Trifásico desbalanceado" onBack={onBack}>
      <Card title="Fuente y línea">
        <Field label="V línea" value={s.V} onChange={set('V')} placeholder="ej: 600" bad={!vac(s.V) && !(V > 0)} />
        <Field label="Ángulo" value={s.ang} onChange={set('ang')} placeholder="ángulo de V TR" bad={!vac(s.ang) && !Number.isFinite(ang)} />
        <Seg value={s.seq} onChange={set('seq')} options={[['+', 'Secuencia R-S-T'], ['-', 'Secuencia R-T-S']]} />
        <Field label="Z línea" value={s.Zl} onChange={set('Zl')} placeholder="vacío = 0" bad={!ok(Zl)} />
        <Field label="f (Hz)" value={s.f} onChange={set('f')} bad={!(f > 0)} />
        <Note>Fuente en delta balanceada: V línea es la tensión entre fases (rms) y el ángulo es el de V TR. Z línea es la impedancia de cada conductor.</Note>
      </Card>
      <Card title="Carga en delta">
        <Field label="Zrs" value={s.Zrs} onChange={set('Zrs')} placeholder="ej: 30+12j" bad={bad(s.Zrs, Zrs)} />
        <Field label="Zst" value={s.Zst} onChange={set('Zst')} placeholder="ej: 25+10j" bad={bad(s.Zst, Zst)} />
        <Field label="Ztr" value={s.Ztr} onChange={set('Ztr')} placeholder="ej: 35+18j" bad={bad(s.Ztr, Ztr)} />
        <Field label="FP meta" value={s.fp} onChange={set('fp')} placeholder="opcional (ej: 0.98)" bad={!vac(s.fp) && !conFp} />
      </Card>

      {empty && <Card><Note>Ingresa la tensión de línea y las tres impedancias para ver los resultados.</Note></Card>}
      {!empty && !valid && <Card><Note warn>Revisa los campos en rojo.</Note></Card>}
      {valid && !good && <Card><Note warn>No se puede calcular con estos valores (división por cero).</Note></Card>}
      {good && (
        <>
          <Card title="Potencia en la carga">
            <Res label="Potencia activa y reactiva" value={`P = ${kw(sc.P)} kW   Q = ${kw(sc.Q)} kvar`} />
            <Res label="Aparente y factor de potencia" value={`S = ${kw(sc.S)} kVA`} sub={`FP = ${f2(sc.fp, 3)} ${sc.tipo}`} />
            <Res label="Potencia en la fuente" value={`${kw(r.Ss.r)} kW   ${kw(r.Ss.i)} kvar`} sub={`FP = ${f2(sInfo(r.Ss).fp, 3)}`} color="text-amber-300" />
          </Card>

          <Card title="Pérdidas y caída de tensión">
            <Res label="Pérdida activa en las líneas" value={`${f2(r.perd, 1)} W`} color="text-red-300" />
            {r.I.map((i, k) => <Res key={k} label={`Línea ${L[k]}`} value={`I = ${polar(i, ' A')}`} sub={`Caída = ${f2(abs(r.caida[k]), 2)} V`} />)}
            {r.Vd.map((v, k) => <Res key={k} label={`Tensión en la carga V${N[k]}`} value={polar(v, ' V')} color="text-amber-300" />)}
          </Card>

          {conFp && (
            <Card title={`Compensación a FP ${f2(fp, 2)}`}>
              {r.comp.map((c, k) => (
                <Res key={k} label={`Fase ${N[k]} (FP actual ${f2(sInfo(r.Sd[k]).fp, 3)})`}
                  value={c.Qc > 0 ? `Qc = ${f2(c.Qc, 1)} var` : 'No necesita compensar'}
                  sub={c.Qc > 0 ? `C = ${f2(c.Cap * 1e6, 2)} µF` : ''} />
              ))}
              <Note>Se compensa cada rama de la delta con la tensión que realmente le llega (ya con la caída de línea). C = Qc / (ω·V²).</Note>
            </Card>
          )}

          <Card title="Estrella equivalente de la carga">
            {r.Zy.map((z, k) => <Res key={k} label={`Z${L[k].toLowerCase()}`} value={rect(z, ' Ω')} sub={polar(z, ' Ω')} />)}
          </Card>
        </>
      )}
      <button onClick={() => setS(VAC)} className="mt-4 w-full py-3 rounded-xl bg-slate-800 active:bg-slate-700 text-sm">Limpiar datos</button>
    </Page>
  );
}
