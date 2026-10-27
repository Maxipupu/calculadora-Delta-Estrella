import React, { useEffect, useRef, useState } from 'react';
import { X, Camera, Images, ScanLine, FlaskConical, ArrowDown, Trash2 } from 'lucide-react';
import { Page, Card, Seg, Res, Note } from './ui.jsx';
import { C, parseComplex as P, num, ok } from './calc.js';
import { si, eng, engC, resolver } from './calc3.js';
import Dibujo, { revisar } from './DibujoCircuito.jsx';
import RedesAvanzadas, { Tabs } from './RedesAvanzadas.jsx';
import RedibujoFoto from './RedibujoFoto.jsx';
import { nodalSteps } from './analisisAvanzado.js';

const TIPOS = { R: ['Resistencia', 'Ω'], V: ['Fuente de tensión', 'V'], I: ['Fuente de corriente', 'A'], L: ['Inductor', 'H'], C: ['Condensador', 'F'] };
const mk = (t, v, a, b) => ({ t, v, a, b });
const EJEMPLOS = [
  ['Divisor', [mk('V', '12', '1', '0'), mk('R', '1k', '1', '2'), mk('R', '2k', '2', '0')]],
  ['Con L y C', [mk('V', '18', '1', '0'), mk('R', '1k', '1', '2'), mk('L', '0.5', '2', '3'), mk('R', '2k', '3', '0'), mk('C', '10u', '2', '0')]],
  ['2 fuentes', [mk('V', '6', '1', '0'), mk('R', '3k', '1', '2'), mk('R', '6k', '2', '0'), mk('I', '2m', '0', '2')]],
  ['Guía · 6 V / 2 mA', [mk('V','6','1','0'), mk('R','3k','1','2'), mk('R','6k','2','0'), mk('R','2k','2','3'), mk('I','2m','2','3'), mk('R','4k','3','0')]],
  ['Guía · 12 V / 6 mA', [mk('V','12','1','0'), mk('R','6k','1','2'), mk('R','6k','2','0'), mk('R','6k','2','3'), mk('I','6m','3','0'), mk('R','6k','3','0')]],
  ['Guía · energía 18 V', [mk('V','18','1','0'), mk('R','1k','1','2'), mk('L','0.5','2','3'), mk('R','2k','3','0'), mk('C','?','2','0')]],
];
const nodo = (t) => (/^\d+$/.test(String(t).trim()) ? parseInt(t, 10) : NaN);

const Mini = ({ l, v, set, ph, bad }) => (
  <label className="block">
    <span className="text-xs text-slate-400">{l}</span>
    <input value={v} onChange={(e) => set(e.target.value)} placeholder={ph} autoCapitalize="off" autoCorrect="off" spellCheck={false}
      className={`mt-1 w-full min-w-0 bg-slate-800 border-2 ${bad ? 'border-red-500' : 'border-slate-700 focus:border-amber-400'} rounded-xl px-2 py-2 text-base font-mono text-amber-300 focus:outline-none`} />
  </label>
);

const valorDe = (e, ac) => {
  if (e.t === 'C' && !ac && String(e.v).trim() === '?') return { ...e, a: nodo(e.a), b: nodo(e.b), v: C(1), desconocido: true };
  let x = si(e.v);
  let z = Number.isFinite(x) ? C(x) : e.t === 'V' || e.t === 'I' ? P(e.v) : C(NaN, NaN);
  if (!ac) z = C(z.r);
  const pasivoOk = e.t === 'R' || e.t === 'L' || e.t === 'C' ? z.r > 0 && z.i === 0 : true;
  return ok(z) && pasivoOk ? { ...e, a: nodo(e.a), b: nodo(e.b), v: z } : null;
};


const KclNumeric = ({ els, sol, nom, ac }) => {
  const total = sol.Vn.length - 1;
  return <div className="mt-3">
    <h3 className="text-sm font-semibold mb-2">Sustitución numérica y verificación KCL</h3>
    {Array.from({ length: total }, (_, idx) => idx + 1).map(n => {
      const terms = els.flatMap((e, k) => {
        const dir = e.a === n ? 1 : e.b === n ? -1 : 0;
        return dir ? [{ dir, label: nom[k], current: sol.res[k].I, signed: C(sol.res[k].I.r * dir, sol.res[k].I.i * dir) }] : [];
      });
      const result = terms.reduce((a, { signed }) => C(a.r + signed.r, a.i + signed.i), C());
      return <div className="electric-equation" key={n}>
        <strong className="text-amber-300">Nodo {n}: V{n} = {engC(sol.Vn[n], 'V', ac)}</strong>
        {terms.map((t, j) => <span key={j}>{t.dir > 0 ? '+' : '−'} I({t.label}) = {engC(t.signed, 'A', ac)}</span>)}
        <span className="text-emerald-300">Σ I saliente = {engC(result, 'A', ac)} (idealmente 0 A)</span>
      </div>;
    })}
    <Note>En CA se suman los fasores complejos de corriente, no sus módulos por separado. Las pequeñas diferencias respecto de cero provienen de la precisión numérica.</Note>
  </div>;
};

export default function Circuitos({ onBack }) {
  const [s, setS] = useState({ els: [], modo: 'cc', f: '50', obj: '0' });
  const [vista, setVista] = useState('editor');
  const [showNodalSteps, setShowNodalSteps] = useState(true);
  const [foto, setFoto] = useState(null);
  const [fotoError, setFotoError] = useState('');
  const cameraRef = useRef(null);
  const galleryRef = useRef(null);
  const fotoUrl = useRef(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const editorRef = useRef(null);
  const diagramRef = useRef(null);
  const importarRedibujo = (elementos) => {
    if (s.els.length > 0 && !window.confirm('¿Reemplazar el circuito actual con el redibujado desde la foto?')) return;
    setS(prev => ({ ...prev, els: elementos, obj: '0' }));
    window.requestAnimationFrame(() => (diagramRef.current || editorRef.current)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };
  useEffect(() => () => { if (fotoUrl.current) URL.revokeObjectURL(fotoUrl.current); }, []);
  const cargarFoto = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) { setFotoError('Selecciona una imagen de tu circuito.'); return; }
    if (file.size > 12 * 1024 * 1024) { setFotoError('La imagen supera los 12 MB.'); return; }
    if (fotoUrl.current) URL.revokeObjectURL(fotoUrl.current);
    const url = URL.createObjectURL(file);
    fotoUrl.current = url;
    setPreviewUrl(url);
    setFoto(file.name);
    setFotoError('');
  };
  const borrarFoto = () => {
    if (fotoUrl.current) URL.revokeObjectURL(fotoUrl.current);
    fotoUrl.current = null;
    setPreviewUrl('');
    setFoto(null);
  };
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
  const sup = sol && fuentes.length >= 2 ? fuentes.map((k) => ({ k, r: resolver(items, w, k)?.res[k0] })).filter(({ r }) => !!r) : [];
  const nodal = sol ? nodalSteps(items, w, nom) : [];
  const capsUnknown = sol && !ac ? items.map((e,k)=>e?.t === 'C' && e.desconocido ? k : -1).filter(k => k >= 0) : [];
  const inductores = sol && !ac ? items.map((e,k)=>e?.t === 'L' ? k : -1).filter(k => k >= 0) : [];
  const uV = 'V', uI = 'A';

  if (vista !== 'editor') return <RedesAvanzadas view={vista} onChangeView={setVista} onBack={onBack} s={s} items={items} nom={nom} listo={listo} />;

  return (
    <Page title="Circuitos" onBack={onBack}>
      <Tabs current={vista} onChange={setVista} />
      <section className="circuit-photo-card" aria-label="Circuito desde foto: redibujo asistido">
        <div className="circuit-photo-title"><span className="circuit-photo-icon"><ScanLine size={22}/></span><div><h2>Circuito desde foto</h2><span className="circuit-photo-badge"><FlaskConical size={12}/> BETA · REDIBUJO ASISTIDO</span></div></div>
        <p className="circuit-photo-copy">Toma una foto o súbela desde tu galería. ElectroCalc detecta líneas rectas y permite marcar las uniones y componentes sobre la imagen. Después reconstruye un circuito digital para calcular tensiones y corrientes.</p>
        <p className="circuit-photo-warning">Importante: la detección de líneas es automática, pero el reconocimiento de símbolos, valores y conexiones todavía requiere tu revisión. No se asume un circuito correcto solo a partir de la foto.</p>
        <input ref={cameraRef} className="sr-only" type="file" accept="image/*" capture="environment" onChange={cargarFoto} aria-label="Tomar una fotografía del circuito" />
        <input ref={galleryRef} className="sr-only" type="file" accept="image/*" onChange={cargarFoto} aria-label="Elegir una fotografía de la galería" />
        <div className="circuit-photo-actions">
          <button type="button" className="circuit-photo-primary" onClick={() => cameraRef.current?.click()}><Camera size={18}/> Tomar foto</button>
          <button type="button" className="circuit-photo-secondary" onClick={() => galleryRef.current?.click()}><Images size={18}/> Galería</button>
        </div>
        {fotoError && <p role="alert" className="circuit-photo-error">{fotoError}</p>}
        {previewUrl && <div className="circuit-photo-preview"><div className="circuit-photo-preview-top"><span>Fotografía seleccionada</span><button type="button" onClick={borrarFoto}><Trash2 size={15}/> Quitar</button></div><span className="circuit-photo-file">{foto}</span><RedibujoFoto imageUrl={previewUrl} onImport={importarRedibujo}/></div>}
        <div className="circuit-photo-steps"><span className={previewUrl ? 'is-done' : ''}>1. Foto</span><span className={s.els.length ? 'is-done' : ''}>2. Redibujar</span><span className={s.els.length && listo ? 'is-done' : ''}>3. Analizar</span></div>
        <button type="button" className="circuit-photo-go" onClick={() => editorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>Ir al editor de circuitos <ArrowDown size={15}/></button>
        <p className="circuit-photo-private">La foto permanece en tu dispositivo; esta función no la envía a un servidor.</p>
      </section>
      <Card title="Tipo de análisis">
        <Seg value={s.modo} onChange={set('modo')} options={[['cc', 'Corriente continua'], ['ca', 'Alterna (fasores)']]} />
        {ac && <Mini l="Frecuencia (Hz)" v={s.f} set={set('f')} bad={!(f > 0)} />}
        <Note>En continua el inductor es un cortocircuito y el condensador un circuito abierto. Valores con prefijos: 2k, 6m, 33u, 4.7M (m = mili, M = mega).</Note>
      </Card>

      <div ref={editorRef} className="circuit-editor-anchor">
      <Card title="Elementos">
        <p className="text-sm text-slate-300 mb-2">Cargar un ejemplo para ver cómo se ingresa:</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {EJEMPLOS.map(([n, els]) => (
            <button key={n} onClick={() => setS((p) => ({ ...p, els, modo: 'cc', obj: '0' }))} className="px-3 py-2 rounded-full border border-amber-500/40 text-amber-300 active:bg-slate-800 text-sm">{n}</button>
          ))}
        </div>
        <p className="text-sm text-slate-300 mb-2">O agregar elementos:</p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(TIPOS).map(([t, [n]]) => (
            <button key={t} onClick={() => add(t)} className="px-3 py-2 rounded-full bg-slate-800 active:bg-slate-700 text-sm">+ {n}</button>
          ))}
        </div>
        <Note>Cada elemento va entre dos nodos numerados. El nodo 0 es la tierra (referencia). En las fuentes, «a» es el + y la corriente de una fuente de corriente va de a hacia b. Para calcular un condensador DESCONOCIDO en CC, escribe ? como valor de C: se considera abierto durante el análisis y luego se puede despejar por igualdad de energías.</Note>
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
      </div>
      {s.els.length > 0 && (
        <div ref={diagramRef} className="circuit-editor-anchor"><Card title="Así quedó tu circuito">
          {revisar(s.els, nom).map((a, i) => <p key={i} className="mb-2 text-sm text-amber-400">⚠ {a}</p>)}
          {previewUrl && <div className="circuit-photo-reference"><span>Foto original</span><img src={previewUrl} alt="Foto original del circuito"/></div>}
          <p className="circuit-photo-diagram-label">Dibujo reconstruido desde los elementos ingresados</p>
          <Dibujo els={s.els} nom={nom} selected={k0} onSelect={(k) => set('obj')(String(k))} />
          <Note>Los puntos blancos son los nodos (con su número) y la línea de abajo es la tierra (nodo 0). Las fuentes de tensión llevan + en el nodo a y − en el nodo b. Compáralo con tu esquema: si algo no coincide, revisa los números de nodo.</Note>
        </Card></div>
      )}

      {s.els.length > 0 && (
        <Card title="Elemento a analizar">
          <p className="text-sm text-slate-400 mb-2">Elige un elemento aquí o tócalo en el dibujo para ver su tensión y corriente.</p>
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
              <div className="electric-superposition">
                <h3 className="text-sm font-semibold mb-1">Superposición paso a paso en {nom[k0]}</h3>
                <p className="text-xs text-slate-400 mb-2">Se activa una fuente independiente a la vez: las demás fuentes ideales de tensión se cortocircuitan y las de corriente se abren. Las fuentes dependientes, si existieran, deben permanecer activas (no admitidas en este editor).</p>
                {sup.map(({ k, r }, idx) => <div key={k} className="electric-super-row"><span className="font-semibold text-amber-300">{idx + 1}. Solo {nom[k]}</span><span>V({nom[k0]}) = {engC(r.V, uV, ac)}</span><span>I({nom[k0]}) = {engC(r.I, uI, ac)}</span></div>)}
                <div className="electric-equation text-emerald-300">V total = {engC(sup.reduce((a, { r }) => ({ r: a.r + r.V.r, i: a.i + r.V.i }), C()), uV, ac)}</div>
                <div className="electric-equation text-emerald-300">I total = {engC(sup.reduce((a, { r }) => ({ r: a.r + r.I.r, i: a.i + r.I.i }), C()), uI, ac)}</div>
                <p className="text-xs text-slate-400 mt-2">Estas sumas se pueden contrastar con el resultado obtenido por nodos, que usa todas las fuentes simultáneamente.</p>
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
                  : e.t === 'C' && !e.desconocido ? <div key={k} className="font-mono text-sm text-yellow-300">{nom[k]}: {eng(0.5 * e.v.r * sol.res[k].V.r ** 2, 'J')}</div> : null)}
              </>
            )}
            {capsUnknown.length > 0 && inductores.length > 0 && (
              <div className="electric-superposition">
                <h3 className="font-semibold text-amber-300">Igualar energías: calcular C desconocida</h3>
                <p className="text-xs text-slate-300 mt-1">En CC permanente, la rama C está abierta. Para cada C desconocida se muestra el despeje usando la energía del inductor del circuito.</p>
                {capsUnknown.map(capIndex => inductores.map(lIndex => {
                  const V = sol.res[capIndex].V.r, I = sol.res[lIndex].I.r, L = items[lIndex].v.r;
                  const capacitance = V !== 0 ? L * I * I / (V * V) : NaN;
                  return <div key={`${capIndex}-${lIndex}`} className="electric-equation">
                    <strong>{nom[capIndex]} igual a {nom[lIndex]}</strong>
                    <span>V{nom[capIndex]} = {eng(V,'V')}, I{nom[lIndex]} = {eng(I,'A')}, L = {eng(L,'H')}</span>
                    <span>C = L × I² / V² = {Number.isFinite(capacitance) ? eng(capacitance,'F') : 'indeterminado (V = 0)'}</span>
                  </div>;
                }))}
                <Note>Con varios inductores elige la pareja C–L correspondiente al enunciado. Una tensión nula no permite despejar una C única por esta igualdad.</Note>
              </div>
            )}
            <div className="mt-4 border-t border-slate-700 pt-4">
              <button type="button" className="electric-show-steps" onClick={() => setShowNodalSteps(v => !v)} aria-expanded={showNodalSteps}>{showNodalSteps ? 'Ocultar' : 'Mostrar'} desarrollo por nodos y ecuaciones</button>
              {showNodalSteps && <>
                <p className="text-sm text-slate-300 mt-3 mb-2">Se aplica la ley de corrientes de Kirchhoff (KCL). V0 = 0 V. Cuando hay una fuente ideal de tensión, se añade una incógnita de corriente y una ecuación que fija su voltaje (nodo ampliado/supernodo).</p>
                {nodal.map((eq, idx) => <div key={idx} className="electric-equation"><strong className="text-amber-300">{eq.title}</strong><span>{eq.text}</span></div>)}
                <KclNumeric els={items} sol={sol} nom={nom} ac={ac} />
                <p className="text-sm text-slate-300 mt-3">Después de reemplazar las impedancias y las fuentes por sus valores en unidades SI, el sistema lineal da las tensiones nodales indicadas arriba. Las corrientes se obtienen usando I = (V_a − V_b)/R, I = jωCV, I = V/(jωL) o la corriente de la fuente, según la rama.</p>
                <p className="text-xs text-slate-500 mt-2">Las ecuaciones se muestran simbólicamente y sus valores numéricos se obtienen del mismo circuito. Comprueba el signo de corriente de cada rama según la dirección a → b.</p>
              </>}
            </div>
          </>
        )}
      </Card>
    </Page>
  );
}
