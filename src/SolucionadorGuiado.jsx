import React, { useMemo, useState } from 'react';
import { BookOpen, Copy, RotateCcw } from 'lucide-react';
import { Card, Note, Res } from './ui.jsx';
import { abs, arg, rect, polar, tiempo } from './calc.js';
import { eng, engC } from './calc3.js';
import { solveUnknown, isMissing, eligibleSourceTransformations } from './solucionadorGuiado.js';

const Input = ({label,value,onChange,placeholder}) => <label className="ec-guide-field"><span>{label}</span><input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} autoCapitalize="off" spellCheck={false}/></label>;
const GuideSteps = ({steps}) => <ol className="ec-guide-steps">{steps.map((step,i)=><li key={i}><strong>{i+1}</strong><span>{step}</span></li>)}</ol>;
const EXAMPLES = [
  {name:'Guía 1 · corriente Io',type:'cc', f:'50',elements:[{t:'V',v:'6',a:1,b:0},{t:'R',v:'3k',a:1,b:2},{t:'R',v:'6k',a:2,b:0},{t:'R',v:'2k',a:2,b:3},{t:'I',v:'2m',a:2,b:3},{t:'R',v:'4k',a:3,b:0}],measurement:{kind:'I',index:5},value:''},
  {name:'Guía 3 · C desconocida',type:'cc', f:'50',elements:[{t:'V',v:'18',a:1,b:0},{t:'R',v:'1k',a:1,b:2},{t:'L',v:'0.5',a:2,b:3},{t:'R',v:'2k',a:3,b:0},{t:'C',v:'?',a:2,b:0}],measurement:{kind:'V',index:4},value:''},
  {name:'Fuente desconocida',type:'cc',f:'50',elements:[{t:'V',v:'?',a:1,b:0},{t:'R',v:'1k',a:1,b:2},{t:'R',v:'2k',a:2,b:0}],measurement:{kind:'node',node:2},value:'8'},
  {name:'Resistencia desconocida',type:'cc',f:'50',elements:[{t:'V',v:'12',a:1,b:0},{t:'R',v:'1k',a:1,b:2},{t:'R',v:'?',a:2,b:0}],measurement:{kind:'node',node:2},value:'8'},
];

export default function SolucionadorGuiado({s,items,nom,onImport}){
  const [measurement,setMeasurement]=useState('node');
  const [node,setNode]=useState('1');
  const [index,setIndex]=useState('0');
  const [measured,setMeasured]=useState('8');
  const [knownType,setKnownType]=useState('phasor');
  const [show,setShow]=useState(false);
  const [last,setLast]=useState(null);
  const [status,setStatus]=useState('');
  const unknown=s.els.map((e,i)=>isMissing(e.v)?i:-1).filter(i=>i>=0);
  const nmax=Math.max(0,...s.els.flatMap(e=>[Number(e.a)||0,Number(e.b)||0]));
  const ready=s.els.length>0 && unknown.length===1;
  const target={kind:measurement,...(measurement==='node'?{node:Number(node)}:{index:Number(index)})};
  const onSolve=()=>{
    setLast(solveUnknown({elements:s.els, frequency:s.modo==='ca'?Number(s.f):0, measurement:target,targetText:measured,targetMode:knownType}));
    setShow(true);
  };
  const transforms=useMemo(()=>items?.every(Boolean)?eligibleSourceTransformations(items):[],[items]);
  const chooseExample=(v)=>{onImport(v.elements,v.type);setMeasurement(v.measurement.kind);if(v.measurement.kind==='node')setNode(String(v.measurement.node));else setIndex(String(v.measurement.index));setMeasured(v.value);setLast(null);setShow(false);setStatus('Ejemplo cargado. Puedes modificar valores y objetivos en el editor.');};
  const updateUnknown=(answer)=>{
    if(!ready)return;
    const copied=s.els.map((e,i)=>i===unknown[0]?{...e,v:String(answer)}:e);
    onImport(copied,s.modo);
    setStatus('Valor calculado incorporado al editor. Comprueba los resultados con el circuito actualizado.');
  };
  const copySteps=()=>{
    const text=(last?.steps||[]).join('\n');
    if(text && navigator?.clipboard?.writeText)navigator.clipboard.writeText(text).then(()=>setStatus('Procedimiento copiado.')).catch(()=>setStatus('No se pudo copiar automáticamente.'));
  };
  return <>
    <Card title="Resolver ejercicio completo · V14">
      <p className="text-sm text-slate-300">Usa el circuito del Editor: elige una variable desconocida y una medida conocida independiente. ElectroCalc intentará despejarla y comprobará el resultado sustituyéndolo en las ecuaciones nodales.</p>
      <Note>Admite una sola incógnita por cálculo. Escribe <strong>?</strong> en el campo de V, I, R, L o C que quieras despejar. Para C o L en corriente continua estacionaria usa la pestaña «C y L» y un dato de energía.</Note>
      <div className="flex flex-wrap gap-2 mt-4">{EXAMPLES.map(e=><button key={e.name} className="ec-guide-example" onClick={()=>chooseExample(e)}>{e.name}</button>)}</div>
    </Card>
    <Card title="1. Incógnita">
      <div className="ec-guide-status">{unknown.length===1?`Elemento desconocido: ${nom[unknown[0]]}`:unknown.length===0?'Escribe ? en el valor de un elemento del Editor.':'Hay varias incógnitas: elige una sola.'}</div>
      <button type="button" className="ec-guide-secondary" onClick={()=>onImport(s.els,s.modo,'editor')}>Editar elementos y nodos</button>
    </Card>
    <Card title="2. Dato que sí conoces">
      <label className="ec-guide-field"><span>Tipo de medida conocida</span><select value={measurement} onChange={e=>setMeasurement(e.target.value)}><option value="node">Voltaje de nodo respecto de tierra</option><option value="V">Voltaje entre terminales de un elemento</option><option value="I">Corriente de un elemento (a → b)</option></select></label>
      {measurement==='node'?<label className="ec-guide-field"><span>Nodo medido</span><select value={node} onChange={e=>setNode(e.target.value)}>{Array.from({length:nmax+1},(_,i)=><option value={i} key={i}>Nodo {i}</option>)}</select></label>:<label className="ec-guide-field"><span>Elemento medido</span><select value={index} onChange={e=>setIndex(e.target.value)}>{nom.map((name,i)=><option value={i} key={i}>{name} · {s.els[i].a} → {s.els[i].b}</option>)}</select></label>}
      <Input label={`Valor conocido (${measurement==='I'?'A':'V'})`} value={measured} onChange={setMeasured} placeholder="8 o 110∠30"/>
      {s.modo==='ca'&&<label className="ec-guide-field"><span>Interpretación del dato CA</span><select value={knownType} onChange={e=>setKnownType(e.target.value)}><option value="phasor">Fasor completo (ángulo conocido)</option><option value="magnitude">Solo magnitud RMS (puede haber varias soluciones)</option></select></label>}
      <Note>En CA, las fuentes pueden ser complejas; la medición es un fasor RMS. Para cargas de potencia constante usa «Línea con cargas», que resuelve las tensiones de manera iterativa.</Note>
      <button className="ec-guide-primary" type="button" onClick={onSolve}>Calcular incógnita y mostrar procedimiento</button>
    </Card>
    {show&&<Card title="3. Resultado y comprobación">
      {last?.error?<Note warn>{last.error}</Note>:last?.solutions?.length? <>
        {last.solutions.map((solution,k)=><div key={k} className="ec-guide-solution"><Res label={`${nom[last.index]} · ${last.solutions.length>1?`solución ${k+1}`:'resultado'}`} value={last.ac?`${rect(solution.value,' '+last.unit,5)}  =  ${polar(solution.value,' '+last.unit,4)}`:eng(solution.value.r,last.unit)} color="text-emerald-300"/>
          {solution.achieved&&<p className="text-xs text-slate-400">Comprobado: {engC(solution.achieved,measurement==='I'?'A':'V',last.ac)}</p>}
          <button type="button" className="ec-guide-secondary" onClick={()=>updateUnknown(last.ac&&Math.abs(solution.value.i)>1e-9?`${solution.value.r}${solution.value.i<0?'':'+'}${solution.value.i}j`:solution.value.r)}>Aplicar este valor al circuito</button>
        </div>)}
        <h3 className="mt-3 text-sm font-semibold text-amber-300">Desarrollo paso a paso</h3><GuideSteps steps={last.steps}/>
        <button className="ec-guide-secondary" onClick={copySteps}><Copy size={16}/> Copiar procedimiento</button>
      </>:<Note warn>No hay resultado disponible.</Note>}
    </Card>}
    <Card title="Transformación de fuentes en tu circuito">
      <p className="text-sm text-slate-300">Se buscan fuentes ideales de tensión con una resistencia en serie de verdad: su nodo intermedio solo puede conectar esos dos elementos.</p>
      {transforms.length?transforms.map((t,k)=><div key={k} className="ec-guide-solution"><strong className="text-amber-300">Fuente {nom[t.sourceIndex]} + {nom[t.resistorIndex]}</strong>
        <p className="text-sm text-slate-300 mt-2">Nodo interno: {t.internal}. Norton: fuente de {engC(t.current,'A',s.modo==='ca')} desde nodo {t.outR} hacia {t.outV}, con resistencia {eng(t.resistance.r,'Ω')} en paralelo.</p>
        <p className="text-xs text-slate-400">Los equivalentes conservan la respuesta externa entre los nodos {t.outV} y {t.outR}, pero no las variables internas de la rama transformada.</p>
        <button className="ec-guide-secondary" onClick={()=>{const remove=new Set([t.sourceIndex,t.resistorIndex]);const kept=s.els.filter((_,i)=>!remove.has(i));const used=new Set([0,...kept.flatMap(e=>[Number(e.a),Number(e.b)]),t.outV,t.outR]);const ids=[...used].filter(x=>x!==t.internal).sort((a,b)=>a-b);const map=new Map(ids.map((n,i)=>[n,n===0?0:i]));const as=(z)=>Math.abs(z.i)<1e-10?String(z.r):`${z.r}${z.i<0?'':'+'}${z.i}j`;const transformed=[...kept.map(e=>({...e,a:String(map.get(Number(e.a))),b:String(map.get(Number(e.b)))})),...t.replacement.map(e=>({t:e.t,a:String(map.get(e.a)),b:String(map.get(e.b)),v:as(e.v)}))];onImport(transformed,s.modo);setStatus('Equivalente Norton aplicado. Se renumeraron los nodos para quitar el nodo interno.');}}><RotateCcw size={16}/> Aplicar transformación al editor</button>
      </div>):<Note>Por ahora no se encontró ninguna pareja válida. La herramienta independiente «Fuentes» sigue disponible para transformaciones manuales. Nunca se transforma una fuente o resistencia arbitraria.</Note>}
    </Card>
    {status&&<p role="status" className="ec-guide-status mt-3">{status}</p>}
  </>;
}
