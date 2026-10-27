import React, { useState } from 'react';
import { Page, Card, Field, Seg, Note } from './ui.jsx';
import { num } from './calc.js';

const PRE = [['G', 'giga', 1e9], ['M', 'mega', 1e6], ['k', 'kilo', 1e3], ['', 'base', 1], ['m', 'mili', 1e-3], ['µ', 'micro', 1e-6], ['n', 'nano', 1e-9]];
const MAG = { P: ['Potencia', 'W'], V: ['Tensión', 'V'], I: ['Corriente', 'A'], R: ['Resistencia', 'Ω'] };
const fm = (x) => {
  const a = Math.abs(x);
  if (a === 0) return '0';
  return a >= 1e-4 && a < 1e12 ? x.toLocaleString('es', { useGrouping: false, maximumSignificantDigits: 10 }) : x.toExponential(4);
};

const Prefijos = ({ value, onChange, u }) => (
  <div className="grid grid-cols-4 gap-2 mb-3">
    {PRE.map(([sim, nom]) => (
      <button key={nom} onClick={() => onChange(nom)}
        className={`py-2 rounded-xl text-center leading-tight ${value === nom ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 active:bg-slate-700'}`}>
        <span className="block font-semibold">{sim}{u}</span>
        <span className="block text-[11px] opacity-80">{nom}</span>
      </button>
    ))}
  </div>
);

export default function Convertidor({ onBack }) {
  const [s, setS] = useState({ m: 'P', v: '', de: 'base', a: 'kilo' });
  const set = (k) => (v) => setS((p) => ({ ...p, [k]: v }));
  const u = MAG[s.m][1], x = num(s.v);
  const fac = (n) => PRE.find((p) => p[1] === n);
  const base = Number.isFinite(x) ? x * fac(s.de)[2] : null;
  const res = base !== null ? base / fac(s.a)[2] : null;
  return (
    <Page title="Conversor de unidades" onBack={onBack}>
      <Card>
        <Seg value={s.m} onChange={set('m')} options={Object.entries(MAG).map(([k, [n]]) => [k, n])} />
        <Field label="Valor" value={s.v} onChange={set('v')} placeholder="ej: 2.5" bad={s.v.trim() !== '' && !Number.isFinite(x)} />
        <p className="text-sm text-slate-300 mb-2">De:</p>
        <Prefijos value={s.de} onChange={set('de')} u={u} />
        <p className="text-sm text-slate-300 mb-2">A:</p>
        <Prefijos value={s.a} onChange={set('a')} u={u} />
      </Card>
      <Card title="Resultado">
        {res === null ? <Note>Ingresa un valor para convertir.</Note> : (
          <>
            <div className="text-2xl font-mono font-semibold text-emerald-300 break-words">{fm(res)} {fac(s.a)[0]}{u}</div>
            <div className="text-sm text-slate-400 mb-3">{fm(x)} {fac(s.de)[0]}{u} equivale a:</div>
            {PRE.map(([sim, nom, k]) => (
              <div key={nom} className="flex justify-between py-1.5 border-b border-slate-800 last:border-0 font-mono text-sm">
                <span className="text-slate-400">{nom}</span><span>{fm(base / k)} {sim}{u}</span>
              </div>
            ))}
          </>
        )}
      </Card>
    </Page>
  );
}
