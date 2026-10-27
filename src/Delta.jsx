import React, { useState } from 'react';
import { Page, Card, Field, Seg, Res, Note } from './ui.jsx';
import { C, parseComplex as P, add, mul, div, ok, rect, polar } from './calc.js';

const VAC = { modo: 'dy', a: '', b: '', c: '' };
const NOM = { dy: [['Zrs', 'Zst', 'Ztr'], ['Zr', 'Zs', 'Zt']], yd: [['Zr', 'Zs', 'Zt'], ['Zrs', 'Zst', 'Ztr']] };

export default function Delta({ onBack }) {
  const [s, setS] = useState(VAC);
  const set = (k) => (v) => setS((p) => ({ ...p, [k]: v }));
  const [ent, sal] = NOM[s.modo];
  const [a, b, c] = [s.a, s.b, s.c].map(P);
  const empty = [s.a, s.b, s.c].some((t) => t.trim() === '');
  const valid = !empty && [a, b, c].every(ok);

  let r = null;
  if (valid) {
    if (s.modo === 'dy') {
      const S = add(a, b, c); // a=Zrs, b=Zst, c=Ztr
      r = [div(mul(a, c), S), div(mul(a, b), S), div(mul(b, c), S)];
    } else {
      const Pp = add(mul(a, b), mul(b, c), mul(c, a)); // a=Zr, b=Zs, c=Zt
      r = [div(Pp, c), div(Pp, a), div(Pp, b)];
    }
    if (!r.every(ok)) r = null;
  }
  const bad = (t, z) => t.trim() !== '' && !ok(z);
  const delta = s.modo === 'dy' ? ent : sal, estrella = s.modo === 'dy' ? sal : ent;

  return (
    <Page title="Delta ↔ Estrella" onBack={onBack}>
      <Seg value={s.modo} onChange={(m) => setS({ ...VAC, modo: m })} options={[['dy', 'Δ → Y'], ['yd', 'Y → Δ']]} />

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3">
          <p className="text-center text-sm font-semibold text-amber-400">Delta (Δ)</p>
          <svg viewBox="0 0 300 270" className="w-full h-auto" role="img" aria-label="Triángulo Zrs, Zst, Ztr">
            <polygon points="150,45 250,215 50,215" fill="none" stroke="#f59e0b" strokeWidth="6" strokeLinejoin="round" />
            <g fontSize="22" fill="#fcd34d"><text x="228" y="118">Zrs</text><text x="150" y="250" textAnchor="middle">Zst</text><text x="72" y="118" textAnchor="end">Ztr</text></g>
            <g fontSize="24" fontWeight="700"><text x="150" y="26" textAnchor="middle" fill="#f87171">R</text><text x="272" y="232" fill="#fbbf24">S</text><text x="26" y="232" fill="#60a5fa">T</text></g>
          </svg>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3">
          <p className="text-center text-sm font-semibold text-emerald-400">Estrella (Y)</p>
          <svg viewBox="0 0 300 270" className="w-full h-auto" role="img" aria-label="Estrella Zr, Zs, Zt">
            <g stroke="#10b981" strokeWidth="6" strokeLinecap="round"><line x1="150" y1="135" x2="150" y2="45" /><line x1="150" y1="135" x2="250" y2="215" /><line x1="150" y1="135" x2="50" y2="215" /></g>
            <circle cx="150" cy="135" r="7" fill="#cbd5e1" />
            <g fontSize="22" fill="#6ee7b7"><text x="164" y="95">Zr</text><text x="212" y="168">Zs</text><text x="88" y="168" textAnchor="end">Zt</text></g>
            <g fontSize="24" fontWeight="700"><text x="150" y="26" textAnchor="middle" fill="#f87171">R</text><text x="272" y="232" fill="#fbbf24">S</text><text x="26" y="232" fill="#60a5fa">T</text></g>
          </svg>
        </div>
      </div>

      <Card title={`Impedancias de la ${s.modo === 'dy' ? 'delta' : 'estrella'}`}>
        <Field label={ent[0]} value={s.a} onChange={set('a')} placeholder="ej: 30+12j" bad={bad(s.a, a)} />
        <Field label={ent[1]} value={s.b} onChange={set('b')} placeholder="ej: 25+10j" bad={bad(s.b, b)} />
        <Field label={ent[2]} value={s.c} onChange={set('c')} placeholder="ej: 35+18j" bad={bad(s.c, c)} />
        <Note>Formato: R + Xj (30+12j), solo reactancia (-15j) o módulo ∠ ángulo (25∠30). Para corriente continua, solo el número.</Note>
      </Card>

      <Card title={`Equivalente en ${s.modo === 'dy' ? 'estrella' : 'delta'}`}>
        {empty && <Note>Ingresa las tres impedancias para ver el resultado.</Note>}
        {!empty && !valid && <Note warn>Revisa los campos en rojo.</Note>}
        {valid && !r && <Note warn>No se puede calcular: la suma o un denominador es cero.</Note>}
        {r && r.map((z, k) => <Res key={k} label={sal[k]} value={rect(z, ' Ω')} sub={polar(z, ' Ω')} />)}
      </Card>
      <button onClick={() => setS({ ...VAC, modo: s.modo })} className="mt-4 w-full py-3 rounded-xl bg-slate-800 active:bg-slate-700 text-sm">Limpiar datos</button>
    </Page>
  );
}
