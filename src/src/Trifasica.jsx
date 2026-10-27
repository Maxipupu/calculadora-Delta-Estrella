import React, { useState } from 'react';
import { Page, Card, Field, Seg, Res, Note } from './ui.jsx';
import { parseComplex as P, num, trifasico, ok, rect, polar, f2, abs, sInfo } from './calc.js';

const kw = (v) => f2(v / 1000);
const N = ['RS', 'ST', 'TR'], L = ['R', 'S', 'T'];

export default function Trifasica({ onBack }) {
  const [s, setS] = useState({ V: '600', ang: '160', seq: '+', Zl: '0.25', Zrs: '30+12j', Zst: '25+10j', Ztr: '35+18j', fp: '0.98', f: '50' });
  const set = (k) => (v) => setS((p) => ({ ...p, [k]: v }));
  const [V, ang, fp, f] = [s.V, s.ang, s.fp, s.f].map(num);
  const [Zl, Zrs, Zst, Ztr] = [s.Zl, s.Zrs, s.Zst, s.Ztr].map(P);
  const valid = [V, ang, f].every(Number.isFinite) && V > 0 && f > 0 && fp > 0 && fp <= 1 && [Zl, Zrs, Zst, Ztr].every(ok);
  const r = valid ? trifasico({ Vlin: V, angTR: ang, seq: s.seq, Zl, Zrs, Zst, Ztr, fpObj: fp, f }) : null;
  const good = r && [r.Sc, r.Ss, ...r.I].every(ok) && abs(r.Sc) > 0;
  const sc = good && sInfo(r.Sc);

  return (
    <Page title="Trifásico desbalanceado" onBack={onBack}>
      <Card title="Fuente y línea">
        <Field label="V TR" value={s.V} onChange={set('V')} placeholder="600" bad={!(V > 0)} />
        <Field label="Ángulo" value={s.ang} onChange={set('ang')} placeholder="160" bad={!Number.isFinite(ang)} />
        <Seg value={s.seq} onChange={set('seq')} options={[['+', 'Secuencia R-S-T'], ['-', 'Secuencia R-T-S']]} />
        <Field label="Z línea" value={s.Zl} onChange={set('Zl')} bad={!ok(Zl)} />
        <Field label="f (Hz)" value={s.f} onChange={set('f')} bad={!(f > 0)} />
        <Note>Fuente delta balanceada: V TR es la tensión de línea (rms) con su ángulo. Z línea es la impedancia de cada conductor.</Note>
      </Card>
      <Card title="Carga en delta">
        <Field label="Zrs" value={s.Zrs} onChange={set('Zrs')} bad={!ok(Zrs)} />
        <Field label="Zst" value={s.Zst} onChange={set('Zst')} bad={!ok(Zst)} />
        <Field label="Ztr" value={s.Ztr} onChange={set('Ztr')} bad={!ok(Ztr)} />
        <Field label="FP meta" value={s.fp} onChange={set('fp')} bad={!(fp > 0 && fp <= 1)} />
      </Card>

      {!valid && <Card><Note warn>Revisa los campos en rojo.</Note></Card>}
      {valid && !good && <Card><Note warn>No se puede calcular con estos valores (división por cero).</Note></Card>}
      {good && (
        <>
          <Card title="a) Potencia en la carga">
            <Res label="Potencia activa y reactiva" value={`P = ${kw(sc.P)} kW   Q = ${kw(sc.Q)} kvar`} />
            <Res label="Aparente y factor de potencia" value={`S = ${kw(sc.S)} kVA`} sub={`FP = ${f2(sc.fp, 3)} ${sc.tipo}`} />
            <Res label="Potencia en la fuente" value={`${kw(r.Ss.r)} kW   ${kw(r.Ss.i)} kvar`} sub={`FP = ${f2(sInfo(r.Ss).fp, 3)}`} color="text-amber-300" />
          </Card>

          <Card title="b) Pérdidas y caída de tensión">
            <Res label="Pérdida activa en las líneas" value={`${f2(r.perd, 1)} W`} color="text-red-300" />
            {r.I.map((i, k) => (
              <Res key={k} label={`Línea ${L[k]}`} value={`I = ${polar(i, ' A')}`} sub={`Caída = ${f2(abs(r.caida[k]), 2)} V`} />
            ))}
            {r.Vd.map((v, k) => <Res key={k} label={`Tensión en la carga V${N[k]}`} value={polar(v, ' V')} color="text-amber-300" />)}
          </Card>

          <Card title={`c) Compensación a FP ${f2(fp, 2)}`}>
            {r.comp.map((c, k) => (
              <Res key={k} label={`Fase ${N[k]} (FP actual ${f2(sInfo(r.Sd[k]).fp, 3)})`}
                value={c.Qc > 0 ? `Qc = ${f2(c.Qc, 1)} var` : 'No necesita compensar'}
                sub={c.Qc > 0 ? `C = ${f2(c.Cap * 1e6, 2)} µF` : ''} />
            ))}
            <Note>Se compensa cada rama de la delta con la tensión real que le llega (ya con la caída de línea). C = Qc / (ω·V²).</Note>
          </Card>

          <Card title="d) Estrella equivalente de la carga">
            {r.Zy.map((z, k) => <Res key={k} label={`Z${L[k].toLowerCase()}`} value={rect(z, ' Ω')} sub={polar(z, ' Ω')} />)}
          </Card>
        </>
      )}
    </Page>
  );
}
