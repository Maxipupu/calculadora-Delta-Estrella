import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Page, Card, Seg, Res, Note } from './ui.jsx';
import { C, parseComplex as P, num, ok } from './calc.js';
import { si, eng, engC, resolver } from './calc3.js';

const TIPOS = { R: ['Resistencia', 'Ω'], V: ['Fuente de tensión', 'V'], I: ['Fuente de corriente', 'A'], L: ['Inductor', 'H'], C: ['Condensador', 'F'] };
const nodo = (t) => (/^\d+$/.test(String(t).trim()) ? parseInt(t, 10) : NaN);

const Mini = ({ l, v, set, ph, bad }) => (
  <label className="block">
    <span className="text-xs text-slate-400">{l}</span>
    <input value={v} onChange={(e) => set(e.target.value)} placeholder={ph} autoCapitalize="off" autoCorrect="off" spellCheck={false}
      className={`mt-1 w-full min-w-0 bg-slate-800 border-2 ${bad ? 'border-red-500' : 'border-slate-700 focus:border-amber-400'} rounded-xl px-2 py-2 text-base font-mono text-amber-300 focus:outline-none`} />
  </label>
);

const valorDe = (e, ac) => {
  let x = si(e.v);
  let z = Number.isFinite(x) ? C(x) : e.t === 'V' || e.t === 'I' ? P(e.v) : C(NaN, NaN);
  if (!ac) z = C(z.r);
  const pasivoOk = e.t === 'R' ? z.r !== 0 : e.t === 'L' || e.t === 'C' ? z.r > 0 : true;
  return ok(z) && pasivoOk ? { ...e, a: nodo(e.a), b: nodo(e.b), v: z } : null;
};

export default function Circuitos({ onBack }) {
  const [s, setS] = useState({ els: [], modo: 'cc', f: '50', obj: '0' });
  const set = (k) => (v) => setS((p) => ({ ...p, [k]: v }));
  const upd = (k, c, v) => setS((p) => ({ ...p, els: p.els.map((e, i) => (i === k ? { ...e, [c]: v } : e)) }));
  const add = (t) => setS((p) => ({ ...p, els: [...p.els, { t, a: '', b: '', v: '' }] }));
  const del = (k) => setS((p) => ({ ...p, els: p.els.filter((_, i) => i !== k), obj: '0' }));

  const ac = s.modo === 'ca', f = num(s.f), w = ac ? 2 * Math.PI * f : 0;
  const nom = s.els.map((e, k) => e.t + s.els.slice(0, k + 1).filter((x) => x.t === e.t).length);
  const items = s.els.map((e) => valorDe(e, ac));
  const listo = s.els.length > 0 && items.every((e) => e && Number.isFinite(e.a) && Number.isFinite(e.b)) && (!ac || f > 0);
  const sol = listo ? resolver(items, w) : null;
  const k0 = Math.min(parseInt(s.obj, 10) || 0, s.els.length - 1);
  const fuentes = listo ? items.map((e, k) => (e.t === 'V' || e.t === 'I' ? k : -1)).filter((k) => k >= 0) : [];
  const sup = sol && fuentes.length >= 2 ? fuentes.map((k) => ({ k, r: resolver(items, w, k).res[k0] })) : [];
  const uV = 'V', uI = 'A';

  return (
    <Page title="Circuitos" onBack={onBack}>
      <Card title="Tipo de análisis">
        <Seg value={s.modo} onChange={set('modo')} options={[['cc', 'Corriente continua'], ['ca', 'Alterna (fasores)']]} />
        {ac && <Mini l="Frecuencia (Hz)" v={s.f} set={set('f')} bad={!(f > 0)} />}
        <Note>En continua el inductor es un cortocircuito y el condensador un circuito abierto. Valores con prefijos: 2k, 6m, 33u, 4.7M (m = mili, M = mega).</Note>
      </Card>

      <Card title="Elementos">
        <div className="flex flex-wrap gap-2">
          {Object.entries(TIPOS).map(([t, [n]]) => (
            <button key={t} onClick={() => add(t)} className="px-3 py-2 rounded-full bg-slate-800 active:bg-slate-700 text-sm">+ {n}</button>
          ))}
        </div>
        <Note>Cada elemento va entre dos nodos numerados. El nodo 0 es la tierra (referencia). En las fuentes, «a» es el + y la corriente de una fuente de corriente va de a hacia b.</Note>
        {s.els.map((e, k) => {
          const x = valorDe(e, ac), fuente = e.t === 'V' || e.t === 'I';
          return (
            <div key={k} className="mt-3 rounded-xl border border-slate-800 p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-amber-300">{nom[k]} · {TIPOS[e.t][0]}</span>
                <button onClick={() => del(k)} aria-label={`Quitar ${nom[k]}`} className="p-1 rounded-full active:bg-slate-800"><X className="w-5 h-5" /></button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Mini l={`Valor (${TIPOS[e.t][1]})`} v={e.v} set={(v) => upd(k, 'v', v)} bad={e.v.trim() !== '' && !x} />
                <Mini l={fuente ? 'Nodo + (a)' : 'Nodo a'} v={e.a} set={(v) => upd(k, 'a', v)} ph="0" bad={e.a.trim() !== '' && !Number.isFinite(nodo(e.a))} />
                <Mini l={fuente ? 'Nodo − (b)' : 'Nodo b'} v={e.b} set={(v) => upd(k, 'b', v)} ph="0" bad={e.b.trim() !== '' && !Number.isFinite(nodo(e.b))} />
              </div>
            </div>
          );
        })}
        {s.els.length > 0 && (
          <button onClick={() => setS({ els: [], modo: s.modo, f: s.f, obj: '0' })} className="mt-4 w-full py-3 rounded-xl bg-slate-800 active:bg-slate-700 text-sm">Limpiar circuito</button>
        )}
      </Card>

      {s.els.length > 0 && (
        <Card title="Elemento a analizar">
          <select value={k0} onChange={(e) => set('obj')(e.target.value)} className="w-full bg-slate-800 border-2 border-slate-700 rounded-xl px-3 py-3 text-base">
            {nom.map((n, k) => <option key={k} value={k}>{n}</option>)}
          </select>
        </Card>
      )}

      <Card title="Resultados">
        {s.els.length === 0 && <Note>Agrega elementos con los botones de arriba para armar el circuito.</Note>}
        {s.els.length > 0 && !listo && <Note warn>Completa los campos: revisa los marcados en rojo y que todos tengan valor y nodos.</Note>}
        {listo && !sol && <Note warn>No se pudo resolver: revisa que todo esté conectado a la tierra (nodo 0) y que haya al menos una fuente.</Note>}
        {sol && (
          <>
            <Res label={`${nom[k0]}: tensión (a − b)`} value={engC(sol.res[k0].V, uV, ac)} color="text-amber-300" />
            <Res label={`${nom[k0]}: corriente (de a hacia b)`} value={engC(sol.res[k0].I, uI, ac)} color="text-amber-300" />
            {sup.length > 0 && (
              <div className="mt-2 rounded-xl bg-slate-800/50 p-3">
                <div className="text-sm font-semibold mb-1">Superposición en {nom[k0]} (corriente)</div>
                {sup.map(({ k, r }) => <div key={k} className="font-mono text-sm text-slate-300">Solo {nom[k]}: {engC(r.I, uI, ac)}</div>)}
                <div className="font-mono text-sm text-emerald-300 mt-1">Suma: {engC(sup.reduce((a, { r }) => ({ r: a.r + r.I.r, i: a.i + r.I.i }), C()), uI, ac)}</div>
              </div>
            )}
            <div className="mt-3 text-sm font-semibold">Tensión en cada nodo</div>
            {sol.Vn.map((v, n) => n > 0 && <div key={n} className="font-mono text-sm text-slate-300">Nodo {n}: {engC(v, uV, ac)}</div>)}
            <div className="mt-3 text-sm font-semibold">Todos los elementos</div>
            {sol.res.map((r, k) => (
              <div key={k} className="font-mono text-sm text-slate-300">{nom[k]}: {engC(r.V, uV, ac)} · {engC(r.I, uI, ac)}</div>
            ))}
            {!ac && items.some((e) => e.t === 'L' || e.t === 'C') && (
              <>
                <div className="mt-3 text-sm font-semibold">Energía almacenada</div>
                {items.map((e, k) => e.t === 'L' ? <div key={k} className="font-mono text-sm text-yellow-300">{nom[k]}: {eng(0.5 * e.v.r * sol.res[k].I.r ** 2, 'J')}</div>
                  : e.t === 'C' ? <div key={k} className="font-mono text-sm text-yellow-300">{nom[k]}: {eng(0.5 * e.v.r * sol.res[k].V.r ** 2, 'J')}</div> : null)}
              </>
            )}
          </>
        )}
      </Card>
    </Page>
  );
}
