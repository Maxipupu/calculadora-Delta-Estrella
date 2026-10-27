import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ScanLine, MapPin, CircuitBoard, Trash2, CheckCircle2, Undo2, Image as ImageIcon } from 'lucide-react';
import { detectarTrazos, sugerirUniones, anotacionesACircuito } from './trazadoFoto.js';

const UNITS = { R: 'Ω', V: 'V', I: 'A', L: 'H', C: 'F' };
const NAMES = { R: 'Resistencia', V: 'Fuente de tensión', I: 'Fuente de corriente', L: 'Inductor', C: 'Condensador' };
const COLORS = { R: '#fbbf24', V: '#fb7185', I: '#c4b5fd', L: '#6ee7b7', C: '#67e8f9' };

const BasicSelect = ({label,value,onChange,children}) => <label className="photo-draw-label"><span>{label}</span><select value={value} onChange={e=>onChange(e.target.value)} className="photo-draw-input">{children}</select></label>;

export default function RedibujoFoto({ imageUrl, onImport }) {
  const imgRef = useRef(null);
  const [pixels, setPixels] = useState(null);
  const [threshold, setThreshold] = useState(145);
  const [viewTraces, setViewTraces] = useState(true);
  const [mode, setMode] = useState('nodos');
  const [nodes, setNodes] = useState([]);
  const [ground, setGround] = useState(0);
  const [components, setComponents] = useState([]);
  const [type, setType] = useState('R');
  const [value, setValue] = useState('1k');
  const [a, setA] = useState('0');
  const [b, setB] = useState('1');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    setPixels(null); setNodes([]); setComponents([]); setGround(0);
    setA('0'); setB('1'); setNotice(''); setMode('nodos');
  }, [imageUrl]);

  const onImageLoad = () => {
    const im = imgRef.current;
    if (!im || !im.naturalWidth) return;
    const scale = Math.min(1, 760 / Math.max(im.naturalWidth, im.naturalHeight));
    const w = Math.max(2, Math.round(im.naturalWidth * scale));
    const h = Math.max(2, Math.round(im.naturalHeight * scale));
    try {
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) throw new Error('Sin acceso al lienzo.');
      ctx.fillStyle = '#fff'; ctx.fillRect(0,0,w,h);
      ctx.drawImage(im,0,0,w,h);
      setPixels(ctx.getImageData(0,0,w,h));
      setNotice('Trazos rectos detectados localmente. Comprueba las conexiones antes de analizar.');
    } catch {
      setNotice('No se pudo leer la imagen para detectar líneas. Puedes colocar nodos manualmente.');
      setPixels({ width: 760, height: Math.round(760 * im.naturalHeight / im.naturalWidth), data: null });
    }
  };

  const width = pixels?.width || 760;
  const height = pixels?.height || 500;
  const lines = useMemo(() => pixels?.data ? detectarTrazos(pixels, {threshold,minLength:Math.max(21, Math.round(Math.min(width,height)*.045))}) : [], [pixels,threshold,width,height]);
  const numbered = useMemo(() => new Map([ground,...nodes.filter(n=>n.id!==ground).map(n=>n.id).sort((x,y)=>x-y)].map((id,index)=>[id,index])), [nodes,ground]);
  const takePoint = (event) => {
    const r = event.currentTarget.getBoundingClientRect();
    const x = Math.max(0,Math.min(width,(event.clientX - r.left) / r.width * width));
    const y = Math.max(0,Math.min(height,(event.clientY - r.top) / r.height * height));
    if (mode === 'nodos') {
      const near = nodes.find(n=>Math.hypot(n.x-x,n.y-y)<Math.min(width,height)*.037);
      if (near) { setNotice(`El punto ya pertenece al nodo ${numbered.get(near.id)}.`); return; }
      const id = nodes.reduce((n,p)=>Math.max(n,p.id+1),0);
      setNodes(prev=>[...prev,{id,x,y}]);
      if (nodes.length===0) setGround(id);
      if (nodes.length===1) setB(String(id));
      setNotice(`Nodo ${nodes.length} añadido. Elige como tierra (0) el nodo de referencia real.`);
      return;
    }
    const na = Number(a), nb = Number(b);
    if (nodes.length<2 || !nodes.some(n=>n.id===na) || !nodes.some(n=>n.id===nb) || na===nb || !value.trim()) {
      setNotice('Primero marca dos nodos diferentes y completa el tipo, valor y conexiones.'); return;
    }
    setComponents(prev=>[...prev,{id:Date.now()+Math.random(),t:type,v:value.trim(),a:na,b:nb,x,y}]);
    setNotice(`${type}${components.filter(c=>c.t===type).length+1} añadido. Puedes seguir colocando componentes.`);
  };
  const suggest = () => {
    if (!pixels?.data) { setNotice('Selecciona una fotografía válida antes de detectar uniones.'); return; }
    const candidates = sugerirUniones(lines, width, height);
    if (!candidates.length) { setNotice('No se detectaron uniones claras: marca los nodos tocando la foto.'); return; }
    if (nodes.length || components.length) { setNotice('Borra las anotaciones para aplicar sugerencias automáticas sin perder conexiones.'); return; }
    const ns = candidates.map((p,id)=>({...p,id}));
    setNodes(ns); setGround(0); setA('0'); setB(ns.length>1?'1':'0');
    setNotice(`${ns.length} posibles uniones encontradas. Corrígelas manualmente y define la tierra antes de analizar.`);
  };
  const reset = () => {setNodes([]);setComponents([]);setA('0');setB('1');setGround(0);setMode('nodos');setNotice('Anotaciones borradas; la foto se conserva.');};
  const lastNode = () => {
    const node = nodes[nodes.length-1]; if(!node)return;
    setNodes(prev=>prev.slice(0,-1)); setComponents(prev=>prev.filter(c=>c.a!==node.id&&c.b!==node.id));
    if(ground===node.id)setGround(nodes[0]?.id??0);
    if(String(node.id)===a)setA(String(nodes[0]?.id??0));
    if(String(node.id)===b)setB(String(nodes[0]?.id??0));
  };
  const exportToEditor = () => {
    const data = anotacionesACircuito(nodes,components,ground);
    if(data.error) {setNotice(data.error);return;}
    onImport(data.elementos);
    setNotice('Esquema enviado al editor. Comprueba el dibujo y toca un componente para analizarlo.');
  };

  return <section className="photo-redraw" aria-label="Digitalizar circuito desde una fotografía">
    <div className="photo-redraw-head"><ScanLine size={19}/><div><strong>Redibujar circuito</strong><span>Detección local de líneas + editor de nodos y componentes</span></div></div>
    <div className="photo-redraw-trace-controls">
      <label className="photo-draw-label"><span>Sensibilidad de los trazos ({threshold})</span><input type="range" min="60" max="220" step="5" value={threshold} onChange={e=>setThreshold(Number(e.target.value))}/></label>
      <label className="photo-redraw-toggle"><input type="checkbox" checked={viewTraces} onChange={e=>setViewTraces(e.target.checked)}/> Mostrar líneas detectadas ({lines.length})</label>
    </div>
    <div className="photo-redraw-switch" role="group" aria-label="Modo de anotación">
      <button type="button" className={mode==='nodos'?'active':''} onClick={()=>setMode('nodos')}><MapPin size={16}/> 1. Marcar nodos</button>
      <button type="button" className={mode==='componentes'?'active':''} onClick={()=>setMode('componentes')}><CircuitBoard size={16}/> 2. Colocar componentes</button>
    </div>
    <p className="photo-redraw-help">{mode==='nodos'?'Toca cada unión eléctrica de la fotografía para marcar un nodo. Si varios cables pertenecen al mismo nodo, usa su mismo número. Elige luego la tierra (0).':'Selecciona el tipo, valor y dos nodos conectados. Después toca en la fotografía la posición del componente.'}</p>
    <div className="photo-redraw-image" >
      <img ref={imgRef} src={imageUrl} alt="Fotografía original sobre la que puedes marcar un circuito" onLoad={onImageLoad}/>
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="photo-redraw-overlay" onClick={takePoint} role="button" tabIndex={0} aria-label={mode==='nodos'?'Toca para marcar una unión':'Toca para colocar un componente'} onKeyDown={e=>{if(e.key==='Enter')setNotice('Para colocar puntos sobre la foto usa el táctil o el ratón.');}}>
        {viewTraces && <g stroke="#0ea5e9" strokeWidth="2" opacity="0.66" fill="none" pointerEvents="none">{lines.map((l,i)=><line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}/>)}</g>}
        {components.map((c,i)=><g key={c.id} transform={`translate(${c.x} ${c.y})`} pointerEvents="none"><rect x="-18" y="-16" width="36" height="31" rx="7" fill="#0b1627" stroke={COLORS[c.t]} strokeWidth="2"/><text textAnchor="middle" y="4" fontSize="17" fill={COLORS[c.t]} fontWeight="800">{c.t}{components.slice(0,i+1).filter(z=>z.t===c.t).length}</text></g>)}
        {nodes.map(n=><g key={n.id} pointerEvents="none"><circle cx={n.x} cy={n.y} r="11" fill={n.id===ground?'#eab308':'#22c55e'} stroke="#07111f" strokeWidth="3"/><text x={n.x} y={n.y+4} fontSize="12" fontWeight="800" textAnchor="middle" fill="#07111f">{numbered.get(n.id)}</text></g>)}
      </svg>
    </div>
    <div className="photo-redraw-controls">
      {mode==='nodos' ? <>
        <button type="button" className="photo-redraw-subtle" onClick={suggest} disabled={!lines.length}>Sugerir uniones de trazos</button>
        <BasicSelect label="Nodo de referencia · tierra (0)" value={String(ground)} onChange={v=>setGround(Number(v))}>
          {nodes.map(n=><option key={n.id} value={n.id}>Punto {n.id+1} (nodo {numbered.get(n.id)})</option>)}
        </BasicSelect>
        <button type="button" className="photo-redraw-subtle" onClick={lastNode} disabled={!nodes.length}><Undo2 size={14}/> Deshacer último nodo</button>
      </> : <>
        <div className="photo-redraw-pair"><BasicSelect label="Elemento" value={type} onChange={setType}>{Object.entries(NAMES).map(([t,label])=><option key={t} value={t}>{label}</option>)}</BasicSelect>
          <label className="photo-draw-label"><span>Valor ({UNITS[type]})</span><input className="photo-draw-input" value={value} onChange={e=>setValue(e.target.value)} placeholder="Ej. 2k, 6m, 33u" inputMode="decimal"/></label>
        </div>
        <div className="photo-redraw-pair"><BasicSelect label="Nodo a / polo +" value={a} onChange={setA}>{nodes.map(n=><option key={n.id} value={n.id}>Nodo {numbered.get(n.id)}</option>)}</BasicSelect>
          <BasicSelect label="Nodo b / polo −" value={b} onChange={setB}>{nodes.map(n=><option key={n.id} value={n.id}>Nodo {numbered.get(n.id)}</option>)}</BasicSelect></div>
        <p className="photo-redraw-help">En fuentes de corriente, la flecha va de a → b. Puedes corregir cada componente en la lista inferior.</p>
      </>}
    </div>
    {components.length>0 && <div className="photo-redraw-components"><strong>Componentes anotados ({components.length})</strong>{components.map((c,i)=><div key={c.id} className="photo-redraw-component">
      <span style={{color:COLORS[c.t]}}>{c.t}{components.slice(0,i+1).filter(z=>z.t===c.t).length}</span>
      <input className="photo-draw-input" aria-label={`Valor de ${c.t}${i+1}`} value={c.v} onChange={e=>setComponents(prev=>prev.map(x=>x.id===c.id?{...x,v:e.target.value}:x))}/>
      <span className="photo-redraw-link">{numbered.get(c.a)} → {numbered.get(c.b)}</span>
      <button type="button" onClick={()=>setComponents(prev=>prev.filter(x=>x.id!==c.id))} aria-label={`Quitar ${c.t}${i+1}`}><Trash2 size={16}/></button>
    </div>)}</div>}
    {notice && <p role="status" className="photo-redraw-notice">{notice}</p>}
    <div className="photo-redraw-bottom">
      <button type="button" className="photo-redraw-subtle" onClick={reset}><Trash2 size={15}/> Borrar marcas</button>
      <button type="button" className="photo-redraw-primary" onClick={exportToEditor} disabled={!components.length || nodes.length<2}><CheckCircle2 size={17}/> Redibujar en el editor</button>
    </div>
    <p className="photo-redraw-footnote"><ImageIcon size={15}/> Las líneas se detectan automáticamente cuando son claras y rectas. Los símbolos, valores y conexiones deben confirmarse manualmente. Las imágenes permanecen en tu dispositivo.</p>
  </section>;
}
