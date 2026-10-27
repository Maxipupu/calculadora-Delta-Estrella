import React, { useMemo, useState } from 'react';
import { ArrowLeft, Copy } from 'lucide-react';
import { Card, Note, Page, Res, Seg } from './ui.jsx';
import { si, eng, engC } from './calc3.js';
import { solveMeshes, transformSource, energyCalculation } from './analisisAvanzado.js';

const Input = ({ label, value, onChange, placeholder, unit }) => <label className="flex flex-col gap-1 text-sm text-slate-300"><span>{label}</span><div className="flex items-center gap-2"><input className="electric-advanced-input" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} inputMode="decimal" autoCapitalize="off" autoCorrect="off" spellCheck={false}/>{unit && <span className="text-xs text-slate-400 min-w-9">{unit}</span>}</div></label>;
const StepList = ({ steps }) => <ol className="electric-steps">{steps.map((s, i) => <li key={i}><span className="electric-step-num">{i + 1}</span><span>{s}</span></li>)}</ol>;
const Tabs = ({ current, onChange }) => <nav className="electric-analysis-tabs" aria-label="Opciones de análisis de circuitos">{[['editor','Editor / nodos'],['mallas','Mallas'],['fuentes','Fuentes'],['energia','C y L']].map(([id, name]) => <button key={id} type="button" className={id === current ? 'active' : ''} onClick={() => onChange(id)} aria-pressed={current === id}>{name}</button>)}</nav>;
export { Tabs };
const formatCoefficient = (z, u = 'Ω') => Number.isFinite(z?.r) ? (Math.abs(z.i) < 1e-11 ? eng(z.r, u) : `${Number(z.r.toPrecision(4))}${z.i < 0 ? ' − ' : ' + '}${Number(Math.abs(z.i).toPrecision(4))}j ${u}`) : '—';

function Mallas({ s, nom, items, listo }) {
  const ac = s.modo === 'ca';
  const freq = si(s.f);
  const omega = ac && freq > 0 ? 2 * Math.PI * freq : 0;
  const data = useMemo(() => listo && (!ac || freq > 0) ? solveMeshes(items, omega) : null, [listo, items, omega, ac, freq]);
  return <>
    <Card title="Análisis por mallas y supermallas">
      <p className="text-sm text-slate-300">Se generan lazos independientes a partir de las conexiones indicadas en el editor. Las fuentes de corriente se incorporan mediante ecuaciones adicionales (supermallas).</p>
      <Note>Las corrientes positivas de cada lazo siguen el sentido de sus ramas indicado por los nodos a → b. En un circuito plano, los lazos independientes pueden reorganizarse como mallas interiores. Para circuitos no planos, son ciclos fundamentales, no necesariamente mallas físicas.</Note>
      <p className="text-sm text-amber-200 mt-3">{s.els.length ? `${s.els.length} elementos del editor · ${ac ? 'CA fasorial' : 'CC'}` : 'Primero carga un ejemplo o ingresa un circuito en Editor / nodos.'}</p>
    </Card>
    {data?.error && <Card title="No es posible resolver las mallas"><Note warn>{data.error}</Note></Card>}
    {!listo && <Card title="Faltan datos"><Note warn>Introduce valores, nodos y una frecuencia positiva si utilizas CA. Luego regresa a Mallas.</Note></Card>}
    {data && !data.error && <>
      <Card title={`Lazos independientes (${data.cycleCount})`}>
        <StepList steps={data.equationInfo.map(({ branches, title }) => `${title}: ${branches.map(({ idx, sign }) => `${sign > 0 ? '+' : '−'}${nom[idx]}`).join(' ')}. Los signos indican el sentido del recorrido respecto de a → b.`)} />
        {data.hasCurrentSources && <Note>Para cada fuente de corriente se agrega una condición que fija su corriente de rama; las tensiones de esas fuentes se calculan como incógnitas auxiliares.</Note>}
      </Card>
      <Card title="Ecuaciones del sistema">
        <p className="text-xs text-slate-400 mb-3">Cada fila representa una ecuación KVL (y las filas finales, restricciones de las fuentes de corriente).</p>
        {data.matrix.map((row, idx) => <div key={idx} className="electric-equation">
          <span className="text-amber-300 font-semibold">{idx < data.cycleCount ? `KVL ${idx + 1}` : `Fuente I ${idx - data.cycleCount + 1}`}</span>
          <span>{row.map((coef, j) => `${j > 0 ? ' + ' : ''}(${formatCoefficient(coef, idx < data.cycleCount && j < data.cycleCount ? 'Ω' : '')}) ${j < data.cycleCount ? `i${j + 1}` : `uI${j - data.cycleCount + 1}`} `).join('')} = {engC(data.rhs[idx], idx < data.cycleCount ? 'V' : 'A', ac)}</span>
        </div>)}
        <Note>Los coeficientes KVL son impedancias (Ω); las variables uI son tensiones de fuente de corriente (V). En las filas de restricciones, los coeficientes son adimensionales y el segundo miembro está en A.</Note>
      </Card>
      <Card title="Resultados de mallas">
        {data.currents.map((current, idx) => <Res key={idx} label={`Corriente de lazo i${idx + 1}`} value={engC(current, 'A', ac)} />)}
        <div className="text-sm font-semibold mt-4 mb-1">Corriente real en cada elemento</div>
        {data.branchCurrents.map((i, idx) => <Res key={idx} label={`${nom[idx]} · dirección a → b`} value={engC(i, 'A', ac)} sub={data.branchVoltages[idx] ? `Tensión: ${engC(data.branchVoltages[idx], 'V', ac)}` : 'Condensador abierto en CC; su tensión se obtiene desde el análisis nodal.'}/>)}
        <Note>El editor también ofrece valores nodales para verificar resultados. Una tensión negativa implica polaridad opuesta a la elegida.</Note>
      </Card>
    </>}
  </>;
}

function Fuentes() {
  const [mode, setMode] = useState('V');
  const [v, setV] = useState('12');
  const [i, setI] = useState('2m');
  const [r, setR] = useState('6k');
  const [copied, setCopied] = useState(false);
  const source = mode === 'V' ? si(v) : si(i), resistance = si(r);
  const result = transformSource({ type: mode, voltage: mode === 'V' ? source : 0, current: mode === 'I' ? source : 0, resistance });
  const show = !result.error;
  const expr = show ? (mode === 'V' ? `${eng(source, 'V')} / ${eng(resistance, 'Ω')} = ${eng(result.result, 'A')}` : `${eng(source, 'A')} × ${eng(resistance, 'Ω')} = ${eng(result.result, 'V')}`) : '';
  return <>
    <Card title="Transformación de fuentes · Thévenin ↔ Norton">
      <Seg value={mode} onChange={setMode} options={ [['V','Tensión → corriente'], ['I','Corriente → tensión']] } />
      <div className="grid grid-cols-1 gap-3">
        {mode === 'V' ? <Input label="Tensión de fuente (V, mV, kV)" value={v} onChange={setV} placeholder="12" unit="V"/> : <Input label="Corriente de fuente (A, mA)" value={i} onChange={setI} placeholder="2m" unit="A"/>}
        <Input label="Resistencia equivalente (Ω, kΩ, MΩ)" value={r} onChange={setR} placeholder="6k" unit="Ω"/>
      </div>
      <Note>Admite prefijos: 6k = 6000; 2m = 0,002; 4.7M = 4 700 000. Las fuentes equivalentes preservan la respuesta del circuito EXTERNO, no el comportamiento interno de cada componente.</Note>
    </Card>
    <Card title="Resultado y procedimiento">
      {show ? <>
        <Res label={mode === 'V' ? 'Fuente Norton equivalente' : 'Fuente Thévenin equivalente'} value={eng(result.result, mode === 'V' ? 'A' : 'V')} color="text-emerald-300" />
        <Res label="Resistencia sin cambios" value={eng(resistance, 'Ω')} />
        <div className="electric-equation">{result.formula}</div>
        <div className="electric-equation text-amber-300">{expr}</div>
        <StepList steps={result.steps} />
        <button type="button" className="electric-advanced-copy" onClick={async () => { try { await navigator.clipboard.writeText(`${result.formula}\n${expr}\n${result.steps.join('\n')}`); setCopied(true); } catch { setCopied(false); } }}><Copy size={15}/> {copied ? 'Procedimiento copiado' : 'Copiar procedimiento'}</button>
      </> : <Note warn>{result.error}</Note>}
    </Card>
    <Card title="Cuándo sirve esta transformación">
      <p className="text-sm text-slate-300 leading-relaxed">Solo puedes transformar una fuente de tensión con su resistencia <strong>en serie</strong>, o una fuente de corriente con su resistencia <strong>en paralelo</strong>. Si la resistencia no cumple esa conexión respecto de los terminales externos, no apliques la fórmula directamente.</p>
      <Note>Ejemplo: fuente de 12 V y resistencia en serie de 6 kΩ ↔ fuente de 2 mA con 6 kΩ en paralelo.</Note>
    </Card>
  </>;
}

const P = { E: 'Energía (J)', C: 'Capacitancia (F)', L: 'Inductancia (H)', V: 'Tensión (V)', I: 'Corriente (A)' };
function Energias() {
  const [mode, setMode] = useState('igual');
  const [find, setFind] = useState('C');
  const [values, setValues] = useState({ E: '0.02', C: '33u', L: '0.5', V: '12', I: '0.1' });
  const choices = mode === 'C' ? ['E','C','V'] : mode === 'L' ? ['E','L','I'] : ['C','L','V','I'];
  const selected = choices.includes(find) ? find : choices[0];
  const needed = mode === 'C' ? selected === 'E' ? ['C','V'] : selected === 'C' ? ['E','V'] : ['E','C'] : mode === 'L' ? selected === 'E' ? ['L','I'] : selected === 'L' ? ['E','I'] : ['E','L'] : ['C','L','V','I'].filter(x => x !== selected);
  const parsed = Object.fromEntries(Object.entries(values).map(([key, val]) => [key, si(val)]));
  const result = energyCalculation({ mode, find: selected, Cval: parsed.C, Lval: parsed.L, Vval: parsed.V, Ival: parsed.I, Eval: parsed.E });
  return <>
    <Card title="Condensadores e inductores · despejes">
      <Seg value={mode} onChange={(value) => { setMode(value); setFind(value === 'igual' ? 'C' : 'E'); }} options={[['C','Condensador'], ['L','Inductor'], ['igual','Igual energía']]}/>
      <label className="text-xs text-slate-400 font-medium">¿Qué necesitas calcular?</label>
      <select className="electric-advanced-input mt-1 mb-4" value={selected} onChange={e => setFind(e.target.value)}>{choices.map(key => <option key={key} value={key}>{P[key]}</option>)}</select>
      <div className="grid grid-cols-1 gap-3">{needed.map(key => <Input key={key} label={P[key]} value={values[key]} onChange={v => setValues(prev => ({ ...prev, [key]: v }))} placeholder="Escribe un valor" unit={key === 'E' ? 'J' : key === 'C' ? 'F' : key === 'L' ? 'H' : key}/>)}</div>
      <Note>Los campos admiten prefijos SI: 33u = 33 µF; 2m = 2 mH o mA según la variable; 1k = 1000. Las fórmulas usan unidades base.</Note>
    </Card>
    <Card title="Desarrollo paso a paso">
      {result.error ? <Note warn>{result.error}</Note> : <>
        <div className="electric-equation"><span className="text-amber-300 font-medium">1. Relación física</span><span>{mode === 'igual' ? 'E_C = E_L   ⇒   ½ C V² = ½ L I²' : mode === 'C' ? 'E_C = ½ C V²' : 'E_L = ½ L I²'}</span></div>
        <div className="electric-equation"><span className="text-amber-300 font-medium">2. Despeje</span><span>{result.formula}</span></div>
        <div className="electric-equation"><span className="text-amber-300 font-medium">3. Sustitución en SI</span><span>{result.substitution}</span></div>
        <Res label={`4. Resultado — ${P[selected]}`} value={eng(result.answer, result.unit)} color="text-emerald-300" />
        {(selected === 'V' || selected === 'I') && <Note>La energía permite calcular la magnitud, pero no el signo/polaridad de V o I.</Note>}
      </>}
    </Card>
    <Card title="Interpretación física">
      <p className="text-sm text-slate-300">En régimen permanente de CC, un condensador ideal se comporta como circuito abierto y un inductor ideal como cortocircuito. Calcula primero su tensión y corriente desde Editor / nodos; después puedes despejar cualquier variable de energía aquí.</p>
    </Card>
  </>;
}

export default function RedesAvanzadas({ view, onChangeView, onBack, s, nom, items, listo }) {
  return <Page title="Circuitos eléctricos" onBack={onBack}>
    <Tabs current={view} onChange={onChangeView} />
    {view === 'mallas' && <Mallas s={s} nom={nom} items={items} listo={listo} />}
    {view === 'fuentes' && <Fuentes />}
    {view === 'energia' && <Energias />}
    <div className="electric-advanced-back"><button onClick={() => onChangeView('editor')}><ArrowLeft size={16}/> Volver al editor de circuitos</button></div>
  </Page>;
}
