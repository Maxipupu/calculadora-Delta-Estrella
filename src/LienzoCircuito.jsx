import React, { useRef, useState } from 'react';
import { Pencil, Eraser, MapPin, CircuitBoard, Undo2, Trash2, WandSparkles, CheckCircle2 } from 'lucide-react';
import { anotacionesACircuito } from './trazadoFoto.js';

const W = 360, H = 270;
const TIPOS = {R:['Resistencia','Ω'],V:['Fuente de tensión','V'],I:['Fuente de corriente','A'],C:['Condensador','F'],L:['Inductor','H']};
const COLOR = {R:'#fbbf24',V:'#fb7185',I:'#c4b5fd',C:'#67e8f9',L:'#6ee7b7'};
const initial = { strokes:[], nodes:[], components:[] };
const round = p => ({x:Math.round(p.x),y:Math.round(p.y)});
export default function LienzoCircuito({ onImport, onAnalyzeDrawing }) {
  const [drawing,setDrawing] = useState(initial);
  const [tool,setTool] = useState('pen');
  const [active,setActive] = useState(null);
  const [history,setHistory] = useState([]);
  const [ground,setGround] = useState(0);
  const [type,setType] = useState('R');
  const [value,setValue] = useState('1k');
  const [a,setA] = useState(0), [b,setB] = useState(1);
  const [message,setMessage] = useState('');
  const surface = useRef(null);
  const remember = () => setHistory(prev=>[...prev.slice(-29),drawing]);
  const point = e => {
    const r=surface.current.getBoundingClientRect();
    return round({x:Math.max(0,Math.min(W,(e.clientX-r.left)*W/r.width)),y:Math.max(0,Math.min(H,(e.clientY-r.top)*H/r.height))});
  };
  const start = e => {
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const p=point(e);
    if(tool==='pen') {remember();setActive([p]);return;}
    if(tool==='erase') {
      const close= drawing.strokes.map((s,i)=>({i,d:Math.min(...s.map(q=>Math.hypot(q.x-p.x,q.y-p.y)))})).sort((x,y)=>x.d-y.d)[0];
      if(close?.d<18){remember();setDrawing(d=>({...d,strokes:d.strokes.filter((_,i)=>i!==close.i)}));}
      else setMessage('Toca cerca de una línea para borrarla.');
      return;
    }
    if(tool==='node') {
      if(drawing.nodes.some(n=>Math.hypot(n.x-p.x,n.y-p.y)<16)) {setMessage('Ya hay un nodo muy cerca.');return;}
      remember();const id=drawing.nodes.reduce((v,n)=>Math.max(v,n.id+1),0);
      setDrawing(d=>({...d,nodes:[...d.nodes,{...p,id}]}));
      if(drawing.nodes.length===0){setGround(id);setA(id);}
      if(drawing.nodes.length===1)setB(id);
      setMessage('Nodo colocado. Coloca todos los nodos eléctricos antes de los componentes.');return;
    }
    if(tool==='component') {
      if(drawing.nodes.length<2 || !drawing.nodes.some(n=>n.id===Number(a)) || !drawing.nodes.some(n=>n.id===Number(b)) || Number(a)===Number(b) || !value.trim()) {setMessage('Marca dos nodos distintos y completa el valor del componente.');return;}
      remember();setDrawing(d=>({...d,components:[...d.components,{...p,id:d.components.length?Math.max(...d.components.map(c=>c.id))+1:0,t:type,v:value.trim(),a:Number(a),b:Number(b)}]}));
      setMessage('Componente colocado. Comprueba los nodos a y b antes de añadir el siguiente.');
    }
  };
  const move=e=> { if (tool!=='pen'||!active)return; e.preventDefault();setActive(prev=>prev?[...prev,point(e)]:null); };
  const end=e=> {if (tool!=='pen'||!active)return;e.preventDefault();const s=[...active]; if(s.length===1)s.push({x:s[0].x+.1,y:s[0].y+.1});setDrawing(d=>({...d,strokes:[...d.strokes,s]}));setActive(null);};
  const undo=()=>{if(active)setActive(null);if(!history.length)return;setDrawing(history.at(-1));setHistory(h=>h.slice(0,-1));};
  const clear=()=>{remember();setDrawing(initial);setGround(0);setA(0);setB(1);setMessage('Lienzo limpio.');};
  const ids=[ground,...drawing.nodes.map(n=>n.id).filter(n=>n!==ground).sort((x,y)=>x-y)];
  const label=id=>ids.indexOf(id);
  const path = stroke => stroke.map((p,i)=>`${i===0?'M':'L'}${p.x},${p.y}`).join(' ');
  const exportCircuit=()=>{
    const result=anotacionesACircuito(drawing.nodes,drawing.components,ground);
    if(result.error){setMessage(result.error);return;}
    onImport(result.elementos);setMessage('Circuito enviado al editor. Revisa los nodos y selecciona el componente que quieres analizar.');
  };
  const toImage=()=>{
    const canvas=document.createElement('canvas');canvas.width=W*2;canvas.height=H*2;
    const c=canvas.getContext('2d');if(!c){setMessage('No se pudo generar la imagen.');return;}
    c.scale(2,2);c.fillStyle='#fff';c.fillRect(0,0,W,H);c.lineWidth=2.6;c.lineCap='round';c.lineJoin='round';c.strokeStyle='#1f2937';
    for(const line of drawing.strokes){if(!line.length)continue;c.beginPath();c.moveTo(line[0].x,line[0].y);line.slice(1).forEach(p=>c.lineTo(p.x,p.y));c.stroke();}
    c.font='bold 12px sans-serif';
    drawing.nodes.forEach(n=>{c.fillStyle='#16a34a';c.beginPath();c.arc(n.x,n.y,6,0,2*Math.PI);c.fill();c.fillStyle='#111827';c.fillText(`N${label(n.id)}`,n.x+8,n.y-6);});
    drawing.components.forEach(e=>{c.fillStyle='#fff';c.fillRect(e.x-22,e.y-12,44,23);c.strokeStyle=COLOR[e.t];c.strokeRect(e.x-22,e.y-12,44,23);c.fillStyle='#111827';c.fillText(`${e.t}:${e.v}`,e.x-20,e.y+4);});
    onAnalyzeDrawing(canvas.toDataURL('image/png'));setMessage('Dibujo preparado para el modo IA.');
  };
  return <section className="ec-draw-panel">
    <div className="ec-draw-heading"><Pencil size={19}/><div><strong>Lienzo manual</strong><small>Dibuja con el dedo o el ratón. No se necesita foto ni internet.</small></div></div>
    <div className="ec-draw-toolbar" role="group" aria-label="Herramientas del lienzo">
      {[["pen",Pencil,"Lápiz"],["erase",Eraser,"Borrar línea"],["node",MapPin,"Nodo"],["component",CircuitBoard,"Elemento"]].map(([id,Icon,text])=><button type="button" key={id} className={tool===id?'selected':''} onClick={()=>setTool(id)} aria-pressed={tool===id}><Icon size={16}/>{text}</button>)}
    </div>
    <p className="ec-draw-help">{tool==='pen'?'Dibuja los cables y símbolos del circuito.':' '}{tool==='erase'?'Toca una línea que desees borrar.':''}{tool==='node'?'Toca cada nodo eléctrico. Los cables unidos sin elementos intermedios comparten un nodo.':''}{tool==='component'?'Elige tipo, valor, nodo A y nodo B; después toca dónde está el componente.':''}</p>
    <svg ref={surface} viewBox={`0 0 ${W} ${H}`} role="application" aria-label="Lienzo para dibujar un circuito eléctrico" className="ec-drawing-surface" onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerCancel={end}>
      <defs><pattern id="ec-draw-grid" width="18" height="18" patternUnits="userSpaceOnUse"><path d="M18 0 H0 V18" fill="none" stroke="#cbd5e1" strokeWidth=".65"/></pattern></defs>
      <rect width={W} height={H} fill="#fafcff"/><rect width={W} height={H} fill="url(#ec-draw-grid)"/>
      {drawing.strokes.map((s,i)=><path key={i} d={path(s)} fill="none" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>)}
      {active&&<path d={path(active)} fill="none" stroke="#2563eb" strokeWidth="2.7" strokeLinecap="round"/>}
      {drawing.components.map((e,i)=><g key={e.id} transform={`translate(${e.x} ${e.y})`} pointerEvents="none"><rect x="-21" y="-16" width="42" height="31" rx="6" fill="#ffffff" stroke={COLOR[e.t]} strokeWidth="2"/><text y="-2" textAnchor="middle" fontSize="12" fontWeight="800" fill="#1e293b">{e.t}{i+1}</text><text y="10" textAnchor="middle" fontSize="9" fill="#334155">{e.v}</text></g>)}
      {drawing.nodes.map(n=><g key={n.id} pointerEvents="none"><circle cx={n.x} cy={n.y} r="9" fill={n.id===ground?'#fbbf24':'#10b981'} stroke="#111827" strokeWidth="2"/><text x={n.x} y={n.y+4} textAnchor="middle" fontSize="11" fontWeight="800" fill="#111827">{label(n.id)}</text></g>)}
    </svg>
    <div className="ec-draw-edit">
      {tool==='node'&&drawing.nodes.length>0&&<label>Tierra · nodo 0<select value={ground} onChange={e=>setGround(Number(e.target.value))}>{drawing.nodes.map(n=><option key={n.id} value={n.id}>Punto {n.id+1}</option>)}</select></label>}
      {tool==='component'&&<><div className="ec-draw-fields"><label>Tipo<select value={type} onChange={e=>setType(e.target.value)}>{Object.entries(TIPOS).map(([t,[n]])=><option key={t} value={t}>{n}</option>)}</select></label><label>Valor ({TIPOS[type][1]})<input value={value} onChange={e=>setValue(e.target.value)} placeholder="Ej. 2k, 33u"/></label></div><div className="ec-draw-fields"><label>Nodo A / +<select value={a} onChange={e=>setA(Number(e.target.value))}>{drawing.nodes.map(n=><option key={n.id} value={n.id}>Nodo {label(n.id)}</option>)}</select></label><label>Nodo B / −<select value={b} onChange={e=>setB(Number(e.target.value))}>{drawing.nodes.map(n=><option key={n.id} value={n.id}>Nodo {label(n.id)}</option>)}</select></label></div></>}
      {drawing.components.length>0&&<div className="ec-draw-summary">{drawing.components.map((e,i)=><div key={e.id}><strong>{e.t}{i+1}</strong><input aria-label={`Valor ${e.t}${i+1}`} value={e.v} onChange={ev=>setDrawing(d=>({...d,components:d.components.map(c=>c.id===e.id?{...c,v:ev.target.value}:c)}))}/><span>{label(e.a)} → {label(e.b)}</span><button type="button" aria-label={`Eliminar elemento ${i+1}`} onClick={()=>{remember();setDrawing(d=>({...d,components:d.components.filter(c=>c.id!==e.id)}));}}><Trash2 size={14}/></button></div>)}</div>}
    </div>
    {message&&<p role="status" className="ec-draw-status">{message}</p>}
    <div className="ec-draw-bottom"><button type="button" onClick={undo} disabled={!history.length}><Undo2 size={15}/> Deshacer</button><button type="button" onClick={clear}><Trash2 size={15}/> Limpiar</button></div>
    <div className="ec-draw-bottom"><button type="button" className="ec-draw-primary" onClick={exportCircuit} disabled={drawing.nodes.length<2||!drawing.components.length}><CheckCircle2 size={16}/> Redibujar y analizar</button><button type="button" onClick={toImage} disabled={!drawing.strokes.length&&!drawing.components.length}><WandSparkles size={16}/> Interpretar con IA</button></div>
    <p className="ec-draw-footnote">Para obtener resultados eléctricos, además del dibujo debes confirmar qué nodos conecta cada elemento. El cálculo utiliza esos datos, no la forma de los trazos.</p>
  </section>;
}
